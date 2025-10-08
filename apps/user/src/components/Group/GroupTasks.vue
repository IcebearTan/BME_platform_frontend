<template>
  <div class="group-tasks" :class="{ 'theme-dark': isDarkMode }">
    <!-- 任务列表视图 -->
    <div v-if="!showSubmissionComponent">
      <!-- 头部操作区 -->
      <div class="tasks-header">
        <div class="header-info">
          <h3 class="tasks-title">{{ isTeacher ? '任务管理' : '我的任务单' }}</h3>
          <div class="tasks-count">共 {{ tasks.length }} 个任务</div>
        </div>
        
        <!-- 管理员操作 -->
        <div v-if="isTeacher" class="header-actions">
          <el-dropdown split-button type="primary" @click="handleCreateTask('custom')" @command="handleCreateTask">
            <el-icon><DocumentAdd /></el-icon>
            创建任务
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="exercise">创建题目</el-dropdown-item>
                <el-dropdown-item command="custom">创建自定义任务</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="default" size="default" @click="handleBatchManage">
            <el-icon><Setting /></el-icon>
            批量管理
          </el-button>
        </div>
      </div>

      <!-- 任务列表组件 -->
      <TaskList
        :tasks="tasks"
        :is-teacher="isTeacher"
        :loading="loading"
        :batch-mode="batchMode"
        :selected-tasks="selectedTasks"
        :is-dark-mode="isDarkMode"
        @task-click="handleTaskClick"
        @task-action="handleTaskAction"
        @solve-exercise="handleSolveExercise"
        @submit-task="handleSubmitTask"
        @task-submitted="handleTaskSubmitted"
        @create-task="handleCreateTask"
        @cancel-batch-mode="cancelBatchMode"
        @batch-delete="handleBatchDelete"
        @select-all="handleSelectAll"
        @update:selected-tasks="selectedTasks = $event"
      />
    </div>

    <!-- 创建/编辑任务单对话框 -->
    <el-dialog 
      v-model="isTaskDialogVisible" 
      :title="editingTask ? '编辑任务' : getCreateDialogTitle()"
      width="700px"
      class="task-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <el-form 
        ref="taskFormRef"
        :model="taskForm" 
        :rules="taskRules"
        label-width="100px"
      >
        <el-form-item label="任务类型" prop="type">
          <el-radio-group v-model="taskForm.type" @change="handleTaskTypeChange">
            <el-radio label="exercise">题目任务</el-radio>
            <el-radio label="custom">自定义任务</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item 
          v-if="taskForm.type !== 'exercise'"
          key="task-title"
          label="任务标题" 
          prop="title"
        >
          <el-input 
            v-model="taskForm.title" 
            placeholder="请输入任务标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <!-- 题目筛选条件 -->
        <div v-if="taskForm.type === 'exercise'" key="exercise-filters" class="exercise-filters">
          <el-row :gutter="12" align="middle">
            <el-col :span="6">
              <el-select
                v-model="exerciseFilters.difficulty"
                placeholder="难度筛选"
                clearable
                size="small"
                style="width: 100%"
                @change="onExerciseFilterChange"
              >
                <el-option label="全部难度" value="" />
                <el-option label="简单" value="简单" />
                <el-option label="中等" value="中等" />
                <el-option label="困难" value="困难" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="exerciseFilters.type"
                placeholder="类型筛选"
                clearable
                size="small"
                style="width: 100%"
                @change="onExerciseFilterChange"
              >
                <el-option label="全部类型" value="" />
                <el-option label="编程题" value="programming" />
                <el-option label="计算题" value="calculation" />
                <el-option label="逻辑题" value="logic" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="exerciseFilters.keyword"
                placeholder="搜索题目标题"
                size="small"
                clearable
                @input="onExerciseFilterChange"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :span="4">
              <el-button 
                size="small" 
                @click="clearExerciseFilters"
                :disabled="!hasActiveFilters"
              >
                清除筛选
              </el-button>
            </el-col>
          </el-row>
          <div v-if="filteredExerciseBank.length === 0 && hasActiveFilters" class="no-results-hint">
            <el-text type="info" size="small">
              <el-icon><Search /></el-icon>
              没有找到匹配的题目，请调整筛选条件
            </el-text>
          </div>
        </div>

        <el-form-item 
          v-if="taskForm.type === 'exercise'"
          key="exercise-select"
          label="选择题目" 
          prop="exerciseId"
        >
          <el-select 
            v-model="taskForm.exerciseId"
            placeholder="从题库中选择题目"
            filterable
            style="width: 100%"
            no-data-text="没有找到匹配的题目"
          >
            <el-option 
              v-for="exercise in filteredExerciseBank"
              :key="exercise.id"
              :label="exercise.title"
              :value="exercise.id"
            >
              <span style="float: left">{{ exercise.title }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ exercise.difficulty }} | {{ getExerciseTypeLabel(exercise.type) }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item 
          v-if="taskForm.type === 'custom'"
          key="task-description"
          label="任务描述" 
          prop="description"
        >
          <el-input 
            v-model="taskForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入任务描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="截止时间" prop="dueDate">
          <el-date-picker
            v-model="taskForm.dueDate"
            type="datetime"
            placeholder="选择截止时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item 
          v-if="taskForm.type !== 'exercise'"
          key="task-requirements"
          label="任务要求"
        >
          <el-input 
            v-model="taskForm.requirements"
            type="textarea"
            :rows="3"
            placeholder="请输入任务具体要求和评分标准"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="isTaskDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveTask" :loading="saving">
            {{ editingTask ? '保存' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 作业提交组件 -->
    <TaskSubmission
      v-if="showSubmissionComponent && selectedTask"
      :task="selectedTask"
      @back="handleBackToTasks"
      @task-submit="handleTaskSubmitted"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  DocumentAdd, 
  Setting, 
  Search, 
  Clock,
  ArrowDown,
  MoreFilled,
  CircleCheck,
  CircleClose,
  VideoPlay
} from '@element-plus/icons-vue';
import TaskList from './TaskList.vue';
import TaskSubmission from './TaskSubmission.vue';

// Props
const props = defineProps({
  groupData: {
    type: Object,
    required: true
  },
  courseType: {
    type: String,
    required: true,
    validator: (value) => ['my-courses', 'my-teachings'].includes(value)
  }
});

// Emits
const emit = defineEmits([
  'task-create',
  'task-edit',
  'task-delete',
  'task-submit'
]);

// Vuex store 和 Router
const store = useStore();
const router = useRouter();

// 响应式数据
const tasks = ref([]);
const loading = ref(true);
const selectedTasks = ref([]);
const batchMode = ref(false);
const saving = ref(false);
const currentTaskType = ref('custom'); // 当前创建的任务类型

// 题目筛选相关数据
const exerciseFilters = ref({
  difficulty: '',
  type: '',
  keyword: ''
});

// 对话框状态
const isTaskDialogVisible = ref(false);
const showSubmissionComponent = ref(false);
const editingTask = ref(null);
const selectedTask = ref(null);

// 表单引用和数据
const taskFormRef = ref();
const taskForm = ref({
  type: 'custom',
  title: '',
  description: '',
  exerciseId: '', // 选择的题目ID
  dueDate: ''
});

// 题库数据（模拟）
const exerciseBank = ref([
  { id: 1, title: 'Python基础语法练习', difficulty: '简单', type: 'programming' },
  { id: 2, title: '数据结构实现', difficulty: '中等', type: 'programming' },
  { id: 3, title: '算法设计与分析', difficulty: '困难', type: 'programming' },
  { id: 4, title: '线性代数计算题', difficulty: '简单', type: 'calculation' },
  { id: 5, title: '逻辑推理问题', difficulty: '中等', type: 'logic' },
  { id: 6, title: 'Java面向对象编程', difficulty: '中等', type: 'programming' },
  { id: 7, title: 'C++指针与内存管理', difficulty: '困难', type: 'programming' },
  { id: 8, title: '概率统计计算', difficulty: '中等', type: 'calculation' },
  { id: 9, title: '高等数学微积分', difficulty: '困难', type: 'calculation' },
  { id: 10, title: '布尔逻辑与集合论', difficulty: '简单', type: 'logic' },
  { id: 11, title: '数据库查询优化', difficulty: '困难', type: 'logic' },
  { id: 12, title: 'JavaScript异步编程', difficulty: '中等', type: 'programming' },
  { id: 13, title: '离散数学证明题', difficulty: '困难', type: 'logic' },
  { id: 14, title: 'HTML与CSS基础', difficulty: '简单', type: 'programming' },
  { id: 15, title: '物理计算与建模', difficulty: '中等', type: 'calculation' }
]);

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 是否为教师（管理员）
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 筛选后的题库
const filteredExerciseBank = computed(() => {
  try {
    if (!exerciseBank.value || !Array.isArray(exerciseBank.value)) {
      return [];
    }
    
    let filtered = exerciseBank.value;
    
    // 按难度筛选
    if (exerciseFilters.value?.difficulty) {
      filtered = filtered.filter(exercise => 
        exercise?.difficulty === exerciseFilters.value.difficulty
      );
    }
    
    // 按类型筛选
    if (exerciseFilters.value?.type) {
      filtered = filtered.filter(exercise => 
        exercise?.type === exerciseFilters.value.type
      );
    }
    
    // 按关键词搜索
    if (exerciseFilters.value?.keyword) {
      const keyword = exerciseFilters.value.keyword.toLowerCase();
      filtered = filtered.filter(exercise => 
        exercise?.title?.toLowerCase().includes(keyword)
      );
    }
    
    return filtered || [];
  } catch (error) {
    console.warn('筛选题库时出现问题:', error);
    return exerciseBank.value || [];
  }
});

// 检查是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  try {
    return !!(exerciseFilters.value?.difficulty || 
              exerciseFilters.value?.type || 
              exerciseFilters.value?.keyword);
  } catch (error) {
    console.warn('检查筛选条件时出现问题:', error);
    return false;
  }
});

// 任务状态选项（简化为三种状态）
const taskStatusOptions = [
  { value: 'pending', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已逾期' }
];

// 优先级选项
const priorityOptions = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' }
];

// 表单验证规则
const taskRules = {
  type: [
    { required: true, message: '请选择任务类型', trigger: 'change' }
  ],
  title: [
    { 
      required: true, 
      message: '请输入任务标题', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (taskForm.value.type === 'custom') {
          if (!value || value.trim().length === 0) {
            callback(new Error('请输入任务标题'));
          } else if (value.length < 2 || value.length > 100) {
            callback(new Error('标题长度在 2 到 100 个字符'));
          } else {
            callback();
          }
        } else {
          // 题目任务不需要验证标题
          callback();
        }
      }
    }
  ],
  exerciseId: [
    { 
      required: true, 
      message: '请选择题目', 
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (taskForm.value.type === 'exercise' && !value) {
          callback(new Error('请选择题目'));
        } else {
          callback();
        }
      }
    }
  ],
  description: [
    { 
      required: true, 
      message: '请输入任务描述', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (taskForm.value.type === 'custom' && (!value || value.length < 5)) {
          callback(new Error('任务描述长度至少 5 个字符'));
        } else {
          callback();
        }
      }
    }
  ],
  dueDate: [
    { required: true, message: '请选择截止时间', trigger: 'change' }
  ]
};

// 模拟任务数据
const mockTasks = [
  {
    id: 1,
    type: 'exercise',
    title: '生物信号滤波练习',
    description: '请计算给定生物信号的功率谱密度，并设计合适的滤波器去除噪声。',
    exerciseId: 2,
    createDate: new Date('2024-10-07'),
    dueDate: new Date('2024-10-15'),
    status: 'pending',
    assignedDate: new Date('2024-10-07')
  },
  {
    id: 2,
    type: 'custom',
    title: '实验报告：心电信号分析',
    description: '基于实验数据，分析心电信号的特征，撰写实验报告。',
    createDate: new Date('2024-10-06'),
    dueDate: new Date('2024-10-07'), // 昨天截止，应该显示为逾期
    status: 'pending', // 改为pending，会根据截止时间自动计算为overdue
    assignedDate: new Date('2024-10-06')
  },
  {
    id: 3,
    type: 'exercise',
    title: '医学图像处理基础测试',
    description: '关于医学图像滤波方法的选择题测试。',
    exerciseId: 4,
    createDate: new Date('2024-10-05'),
    dueDate: new Date('2024-10-10'),
    status: 'completed',
    assignedDate: new Date('2024-10-05')
  },
  {
    id: 4,
    type: 'custom',
    title: 'Python编程作业',
    description: '使用Python实现简单的数字滤波器设计。',
    createDate: new Date('2024-10-04'),
    dueDate: new Date('2024-10-11'),
    status: 'pending',
    assignedDate: new Date('2024-10-04')
  },
  {
    id: 5,
    type: 'exercise',
    title: '信号处理基础练习',
    description: '完成关于傅里叶变换和频域分析的练习题。',
    exerciseId: 101,
    createDate: new Date('2024-10-08'),
    dueDate: new Date('2024-10-15'),
    status: 'pending',
    assignedDate: new Date('2024-10-08')
  },
  {
    id: 6,
    type: 'exercise', 
    title: '数据结构算法测试',
    description: '测试二叉树遍历和图论基础算法的理解。',
    exerciseId: 102,
    createDate: new Date('2024-10-07'),
    dueDate: new Date('2024-10-14'),
    status: 'pending',
    assignedDate: new Date('2024-10-07')
  }
];

// 计算属性

// 方法
const loadTasks = async () => {
  loading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    // 直接使用模拟数据，状态计算交给 getTaskActualStatus 函数
    tasks.value = [...mockTasks];
    loading.value = false;
  }, 500);
};

const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

const formatAssignedDate = (date) => {
  if (!date) return '';
  
  const assignedDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (assignedDate >= today) {
    return '今天';
  } else if (assignedDate >= yesterday) {
    return '昨天';
  } else {
    const diffTime = now - assignedDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return `${diffDays}天前`;
    } else {
      return assignedDate.toLocaleDateString('zh-CN');
    }
  }
};

// 事件处理
const handleCreateTask = (taskType = 'custom') => {
  editingTask.value = null;
  currentTaskType.value = taskType;
  taskForm.value = {
    type: taskType,
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    requirements: '',
    // 题目任务单专用字段
    exerciseType: '',
    referenceAnswer: '',
    score: 10
  };
  
  // 重置题目筛选条件
  exerciseFilters.value = {
    difficulty: '',
    type: '',
    keyword: ''
  };
  
  isTaskDialogVisible.value = true;
};

const getCreateDialogTitle = () => {
  return currentTaskType.value === 'exercise' ? '创建题目' : '创建自定义任务';
};

const handleTaskTypeChange = async () => {
  try {
    // 同步更新当前任务类型，确保标题正确显示
    currentTaskType.value = taskForm.value.type;
    
    // 使用 nextTick 确保 DOM 更新完成
    await nextTick();
    
    // 当任务类型改变时，重置相关字段
    if (taskForm.value.type === 'exercise') {
      taskForm.value.exerciseType = '';
      taskForm.value.referenceAnswer = '';
      taskForm.value.score = 10;
      // 清空自定义任务的字段
      taskForm.value.title = '';
      taskForm.value.description = '';
      taskForm.value.requirements = '';
      // 重置题目筛选条件
      exerciseFilters.value = {
        difficulty: '',
        type: '',
        keyword: ''
      };
    } else {
      // 切换到自定义任务时，清空题目相关字段
      taskForm.value.exerciseId = '';
    }
  } catch (error) {
    console.warn('任务类型切换出现问题:', error);
  }
};

// 题目筛选变化处理
const onExerciseFilterChange = () => {
  try {
    // 当筛选条件变化时，如果当前选中的题目不在筛选结果中，则清空选择
    if (taskForm.value?.exerciseId && filteredExerciseBank.value) {
      const selectedExercise = filteredExerciseBank.value.find(
        exercise => exercise.id === taskForm.value.exerciseId
      );
      if (!selectedExercise) {
        taskForm.value.exerciseId = '';
      }
    }
  } catch (error) {
    console.warn('筛选处理出现问题:', error);
  }
};

// 获取题目类型标签
const getExerciseTypeLabel = (type) => {
  const typeMap = {
    programming: '编程题',
    calculation: '计算题',
    logic: '逻辑题'
  };
  return typeMap[type] || type;
};

// 获取优先级文本
const getPriorityText = (priority) => {
  const priorityMap = {
    low: '低优先级',
    medium: '中优先级',
    high: '高优先级',
    urgent: '紧急'
  };
  return priorityMap[priority] || '普通';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '未完成',
    in_progress: '进行中',
    completed: '已完成',
    overdue: '已逾期'
  };
  return statusMap[status] || '未知状态';
};

// 判断任务是否逾期
const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date();
};

// 获取任务实际状态
const getTaskActualStatus = (task) => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue(task)) return 'overdue';
  return 'pending';
};

// 清除所有筛选条件
const clearExerciseFilters = () => {
  try {
    exerciseFilters.value = {
      difficulty: '',
      type: '',
      keyword: ''
    };
  } catch (error) {
    console.warn('清除筛选条件出现问题:', error);
  }
};

const handleBatchManage = () => {
  batchMode.value = !batchMode.value;
  selectedTasks.value = [];
};

const cancelBatchMode = () => {
  batchMode.value = false;
  selectedTasks.value = [];
};

const handleSelectAll = () => {
  // 这个方法现在由 TaskList 组件处理
  // 这里可以添加一些额外的逻辑，比如通知后端等
};

const handleTaskClick = (task) => {
  // 点击任务卡片时显示提交组件
  selectedTask.value = task;
  showSubmissionComponent.value = true;
};

const handleTaskAction = ({ action, task }) => {
  console.log('Task action:', action, task);
  
  switch (action) {
    case 'edit':
      editingTask.value = task;
      taskForm.value = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        requirements: task.requirements || ''
      };
      isTaskDialogVisible.value = true;
      break;
    case 'duplicate':
      handleDuplicateTask(task);
      break;
    case 'delete':
      handleDeleteTask(task);
      break;
    case 'stats':
      // TODO: 显示统计信息
      break;
  }
};

const handleDuplicateTask = (task) => {
  const newTask = {
    ...task,
    id: Date.now(),
    title: `${task.title} (副本)`,
    createDate: new Date(),
    status: 'pending',
    completedCount: 0,
    pendingCount: task.totalCount
  };
  tasks.value.unshift(newTask);
  ElMessage.success('任务已复制');
};

const handleDeleteTask = (task) => {
  ElMessageBox.confirm(
    '确定要删除这个任务吗？删除后无法恢复。',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    const index = tasks.value.findIndex(item => item.id === task.id);
    if (index > -1) {
      tasks.value.splice(index, 1);
      ElMessage.success('任务已删除');
      emit('task-delete', task);
    }
  }).catch(() => {
    // 取消删除
  });
};

const handleBatchDelete = () => {
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedTasks.value.length} 个任务吗？`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    tasks.value = tasks.value.filter(
      task => !selectedTasks.value.includes(task.id)
    );
    ElMessage.success(`已删除 ${selectedTasks.value.length} 个任务`);
    selectedTasks.value = [];
  });
};

const handleStartTask = (task) => {
  task.status = 'in_progress';
  ElMessage.success('任务已开始');
};

const handleSubmitTask = (task) => {
  selectedTask.value = task;
  showSubmissionComponent.value = true;
};

const handleBackToTasks = () => {
  showSubmissionComponent.value = false;
  selectedTask.value = null;
};

const handleTaskSubmitted = (data) => {
  console.log('任务提交成功:', data);
  
  // 更新任务状态为已完成
  if (selectedTask.value) {
    selectedTask.value.status = 'completed';
  }
  
  // 这里可以添加提交成功后的处理逻辑
  // 比如刷新任务列表、显示成功消息等
  ElMessage.success('任务提交成功！');
  
  // 返回任务列表
  handleBackToTasks();
  
  // 如果需要刷新任务列表
  loadTasks();
  
  // 触发任务提交事件给父组件
  emit('task-submit', data);
};



const handleSolveExercise = (task) => {
  // 跳转到解题页面
  router.push({
    name: 'exercise-solve',
    params: { 
      id: task.exerciseId || task.id 
    },
    query: { 
      taskId: task.id,
      title: task.title,
      type: task.type,
      from: 'group-card'
    }
  });
  
  ElMessage.success(`正在跳转到解题页面：${task.title}`);
};



const handleSaveTask = async () => {
  if (!taskFormRef.value) return;
  
  try {
    await taskFormRef.value.validate();
    
    saving.value = true;
    
    // 模拟API调用
    setTimeout(() => {
      // 如果是题目任务，自动设置标题为选中题目的标题
      const taskData = { ...taskForm.value };
      if (taskData.type === 'exercise' && taskData.exerciseId) {
        const selectedExercise = exerciseBank.value.find(ex => ex.id === taskData.exerciseId);
        if (selectedExercise) {
          taskData.title = selectedExercise.title;
        }
      }
      
      if (editingTask.value) {
        // 编辑现有任务
        Object.assign(editingTask.value, {
          ...taskData,
          createDate: new Date()
        });
        ElMessage.success('任务已更新');
        emit('task-edit', editingTask.value);
      } else {
        // 创建新任务
        const newTask = {
          id: Date.now(),
          ...taskData,
          assignBy: '当前用户',
          createDate: new Date(),
          status: 'pending',
          completedCount: 0,
          totalCount: 25, // 假设小组有25个学生
          pendingCount: 25,
          overdueCount: 0
        };
        tasks.value.unshift(newTask);
        ElMessage.success('任务创建成功');
        emit('task-create', newTask);
      }
      
      saving.value = false;
      isTaskDialogVisible.value = false;
    }, 1000);
  } catch (error) {
    console.error('Form validation failed:', error);
  }
};

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
/* 继承公告组件的基础样式，这里只定义任务特有的样式 */
.group-tasks {
  width: 100%;
  padding: 20px 0;
}

/* 头部样式 */
.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .tasks-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tasks-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .tasks-title {
  color: #ffffff;
}

.tasks-count {
  font-size: 14px;
  color: #6b7280;
  background-color: rgba(107, 114, 128, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.theme-dark .tasks-count {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选区域样式 */
.tasks-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
}

.theme-dark .filter-group-label {
  color: #9ca3af;
}

.search-container {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #8B8B8B;
  font-size: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  font-size: 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background-color: #ffffff;
  transition: all 0.3s ease;
  outline: none;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.theme-dark .search-input {
  background-color: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.theme-dark .search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  font-size: 14px;
}

.filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.08);
  color: #667eea;
}

.filter-tab.active {
  background-color: #667eea;
  color: white;
}

.theme-dark .filter-tab {
  background-color: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
}

.theme-dark .filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.15);
  color: #8fa4f3;
}

.filter-count {
  font-size: 12px;
  opacity: 0.8;
}

/* 任务列表样式 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .date-group-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.date-group-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #6b7280;
}

.theme-dark .date-group-title {
  color: #9ca3af;
}

.date-group-count {
  font-size: 12px;
  color: #9ca3af;
}

.task-card {
  display: flex;
  align-items: flex-start;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.task-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.task-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.02);
}

.theme-dark .task-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .task-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .task-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.task-checkbox {
  padding: 20px 0 20px 20px;
  display: flex;
  align-items: flex-start;
}

.task-status-indicator {
  width: 4px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.status-pending {
  background-color: #f59e0b;
}

.status-in_progress {
  background-color: #3b82f6;
}

.status-completed {
  background-color: #10b981;
}

.status-overdue {
  background-color: #ef4444;
}

.task-content {
  flex: 1;
  padding: 20px;
  cursor: pointer;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.task-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.2;
}

.task-type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
}

.type-exercise {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.type-custom {
  background-color: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.theme-dark .task-title {
  color: #ffffff;
}

.task-priority {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.priority-high {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.priority-medium {
  background-color: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.priority-low {
  background-color: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.task-description {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.theme-dark .task-description {
  color: #e5e7eb;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-top: 12px;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-assigned-time {
  font-size: 11px;
  color: #9ca3af;
}

.task-deadline {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.task-deadline .el-icon {
  font-size: 14px;
}

.overdue-text {
  color: #ef4444 !important;
}

.theme-dark .task-assigned-time {
  color: #6b7280;
}

.theme-dark .task-deadline {
  color: #9ca3af;
}

.status-tag {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.status-pending {
  background-color: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-in_progress {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.status-completed {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-overdue {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.meta-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.theme-dark .meta-item {
  color: #9ca3af;
}

.overdue-text {
  color: #ef4444 !important;
  font-weight: 500;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  text-align: right;
}

.theme-dark .progress-text {
  color: #9ca3af;
}

.progress-bar {
  width: 80px;
  height: 4px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.theme-dark .progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.6s ease;
}

.task-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-number {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .stat-number {
  color: #ffffff;
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
}

.task-actions {
  padding: 20px 20px 20px 0;
  display: flex;
  align-items: flex-start;
}

.student-actions {
  padding: 20px 20px 20px 0;
  display: flex;
  align-items: flex-start;
}

.action-btn {
  padding: 8px;
  color: #6b7280;
}

.action-btn:hover {
  color: #667eea;
}

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-message {
  font-size: 16px;
  color: #8a8a8a;
  margin: 0 0 16px 0;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-left-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #8a8a8a;
  margin: 0;
}

/* 批量操作栏 */
.batch-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
}

.theme-dark .batch-actions {
  background: rgba(40, 40, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.batch-info {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.theme-dark .batch-info {
  color: #e5e7eb;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

/* 对话框样式 */
.task-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.dialog-footer {
  text-align: right;
}

.submission-buttons {
  display: flex;
  gap: 8px;
}



/* 题目筛选区域样式 */
.exercise-filters {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.theme-dark .exercise-filters {
  background-color: #2a2a2a;
  border-color: #404040;
}

.no-results-hint {
  margin-top: 12px;
  text-align: center;
  padding: 8px;
}

.no-results-hint .el-icon {
  margin-right: 4px;
}

/* Element Plus 样式覆盖 */
:deep(.el-dropdown-menu__item.danger-item) {
  color: #dc2626;
}

:deep(.el-dropdown-menu__item.danger-item:hover) {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tasks-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .header-info {
    justify-content: space-between;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .tasks-filters {
    gap: 12px;
  }
  
  .search-container {
    max-width: none;
  }
  
  .task-card {
    flex-direction: column;
  }
  
  .task-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .task-meta {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .meta-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .batch-actions {
    left: 16px;
    right: 16px;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .batch-buttons {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .task-content {
    padding: 16px;
  }
  
  .task-actions,
  .student-actions {
    padding: 16px 16px 16px 0;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 对话框样式 */
.task-dialog .el-dialog__body {
  padding: 20px;
}





/* 动画效果 */
.task-card {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.date-group {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}



/* 学生操作区域样式 */
.student-actions {
  padding: 20px 24px 20px 0;
  display: flex;
  align-items: center;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.task-status {
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.student-actions .el-button {
  min-width: 100px;
  height: 36px;
  font-size: 14px;
}

/* 任务类型标识优化 */
.task-type-badge {
  white-space: nowrap;
  margin-top: 2px;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .task-card {
    flex-direction: column;
  }
  
  .task-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .task-info {
    width: 100%;
  }
  
  .task-assigned-time,
  .task-deadline {
    width: 100%;
    justify-content: flex-start;
  }
  
  .student-actions {
    padding: 16px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .action-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 16px;
  }
  
  .student-actions .el-button {
    min-width: 80px;
    height: 32px;
    font-size: 13px;
  }
  
  .status-tag {
    padding: 4px 10px;
    font-size: 12px;
  }
  
  .theme-dark .student-actions {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>