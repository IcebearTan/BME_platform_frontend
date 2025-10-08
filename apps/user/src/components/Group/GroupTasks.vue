<template>
  <div class="group-tasks" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部操作区 -->
    <div class="tasks-header">
      <div class="header-info">
        <h3 class="tasks-title">{{ isTeacher ? '任务单管理' : '我的任务单' }}</h3>
        <div class="tasks-count">共 {{ filteredTasks.length }} 个任务单</div>
      </div>
      
      <!-- 管理员操作 -->
      <div v-if="isTeacher" class="header-actions">
        <el-dropdown split-button type="primary" @click="handleCreateTask('custom')" @command="handleCreateTask">
          <el-icon><DocumentAdd /></el-icon>
          创建自定义任务单
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="exercise">创建题目任务单</el-dropdown-item>
              <el-dropdown-item command="custom">创建自定义任务单</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="default" size="default" @click="handleBatchManage">
          <el-icon><Setting /></el-icon>
          批量管理
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="tasks-filters">
      <div class="search-container">
        <el-icon class="search-icon">
          <Search />
        </el-icon>
        <input 
          v-model="searchQuery"
          type="text" 
          class="search-input"
          placeholder="搜索任务单标题或内容..."
        />
      </div>
      
      <div class="filter-section">
        <!-- 截止时间筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">按截止时间：</span>
          <div class="filter-tabs">
            <div 
              v-for="filter in taskFilters"
              :key="filter.key"
              class="filter-tab"
              :class="{ 'active': activeFilter === filter.key }"
              @click="activeFilter = filter.key"
            >
              <span class="filter-label">{{ filter.label }}</span>
              <span class="filter-count">({{ getFilterCount(filter.key) }})</span>
            </div>
          </div>
        </div>
        
        <!-- 类型筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">类型筛选：</span>
          <div class="filter-tabs">
            <div 
              v-for="typeFilter in taskTypeFilters"
              :key="typeFilter.key"
              class="filter-tab"
              :class="{ 'active': activeTypeFilter === typeFilter.key }"
              @click="activeTypeFilter = typeFilter.key"
            >
              <span class="filter-label">{{ typeFilter.label }}</span>
              <span class="filter-count">({{ getTypeFilterCount(typeFilter.key) }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-list" v-if="filteredTasks.length > 0">
      <div 
        v-for="(group, groupKey) in groupedTasks"
        :key="groupKey"
        class="date-group"
      >
        <!-- 日期分组标题 -->
        <div class="date-group-header">
          <h4 class="date-group-title">{{ group.label }}</h4>
          <div class="date-group-count">{{ group.tasks.length }} 个任务单</div>
        </div>
        
        <!-- 该日期组的任务 -->
        <div 
          v-for="task in group.tasks" 
          :key="task.id"
          class="task-card"
          :class="{ 
            'selected': selectedTasks.includes(task.id),
            'overdue': isOverdue(task)
          }"
        >
          <!-- 选择框（仅管理员批量模式可见） -->
          <div v-if="isTeacher && batchMode" class="task-checkbox">
            <el-checkbox 
              v-model="selectedTasks"
              :label="task.id"
            />
          </div>

          <!-- 任务状态指示器 -->
          <div class="task-status-indicator" :class="`status-${getTaskActualStatus(task)}`"></div>

          <!-- 任务内容 -->
          <div class="task-content" @click="handleTaskClick(task)">
            <div class="task-header">
              <div class="task-title-row">
                <h4 class="task-title">{{ task.title }}</h4>
                <span class="task-type-badge" :class="`type-${task.type}`">
                  {{ getTaskTypeText(task.type) }}
                </span>
              </div>
            </div>
            
            <div class="task-description" v-if="task.description">
              {{ getPreviewText(task.description) }}
            </div>
            
            <div class="task-footer">
              <div class="task-info">
                <div class="task-deadline">
                  <el-icon><Clock /></el-icon>
                  <span>
                    截止：{{ formatDueDate(task.dueDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作菜单（仅管理员可见） -->
          <div v-if="isTeacher" class="task-actions">
            <el-dropdown trigger="click" @command="handleTaskAction">
              <el-button type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', task }">编辑任务</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'duplicate', task }">复制任务</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'stats', task }">查看统计</el-dropdown-item>
                  <el-dropdown-item 
                    :command="{ action: 'delete', task }"
                    class="danger-item"
                  >
                    删除任务
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 学生操作区域 -->
          <div v-else class="student-actions">
            <div class="action-section">
              <!-- 状态显示 -->
              <div class="task-status">
                <span class="status-tag" :class="`status-${getTaskActualStatus(task)}`">
                  {{ getStatusText(getTaskActualStatus(task)) }}
                </span>
              </div>
              
              <!-- 操作按钮 -->
              <div class="action-buttons">
                <template v-if="task.type === 'exercise'">
                  <!-- 题目任务单：解题按钮 -->
                  <el-button 
                    v-if="getTaskActualStatus(task) !== 'completed'"
                    :type="getTaskActualStatus(task) === 'overdue' ? 'danger' : 'primary'"
                    @click.stop="handleSolveExercise(task)"
                  >
                    <el-icon><EditPen /></el-icon>
                    {{ getTaskActualStatus(task) === 'overdue' ? '补做题目' : '开始解题' }}
                  </el-button>
                </template>
                
                <template v-else>
                  <!-- 自定义任务单：提交按钮 -->
                  <el-button 
                    v-if="getTaskActualStatus(task) !== 'completed'"
                    :type="getTaskActualStatus(task) === 'overdue' ? 'danger' : 'primary'"
                    @click.stop="handleSubmitTask(task)"
                  >
                    <el-icon><Upload /></el-icon>
                    {{ getTaskActualStatus(task) === 'overdue' ? '补交任务' : '提交任务' }}
                  </el-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
      <div v-if="isTeacher" class="empty-actions">
        <el-button type="primary" @click="handleCreateTask('custom')">
          创建自定义任务单
        </el-button>
        <el-button type="success" @click="handleCreateTask('exercise')">
          创建题目任务单
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载任务中...</p>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="isTeacher && batchMode" class="batch-actions">
      <div class="batch-info">
        已选择 {{ selectedTasks.length }} 个任务单
      </div>
      <div class="batch-buttons">
        <el-button size="small" @click="handleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete" :disabled="selectedTasks.length === 0">
          批量删除
        </el-button>
        <el-button size="small" @click="cancelBatchMode">取消</el-button>
      </div>
    </div>

    <!-- 创建/编辑任务单对话框 -->
    <el-dialog 
      v-model="isTaskDialogVisible" 
      :title="editingTask ? '编辑任务单' : getCreateDialogTitle()"
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
            <el-radio label="exercise">题目任务单</el-radio>
            <el-radio label="custom">自定义任务单</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="任务标题" prop="title">
          <el-input 
            v-model="taskForm.title" 
            :placeholder="taskForm.type === 'exercise' ? '请输入题目标题' : '请输入任务标题'"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item 
          v-if="taskForm.type === 'exercise'"
          label="选择题目" 
          prop="exerciseId"
        >
          <el-select 
            v-model="taskForm.exerciseId"
            placeholder="从题库中选择题目"
            filterable
            style="width: 100%"
          >
            <el-option 
              v-for="exercise in exerciseBank"
              :key="exercise.id"
              :label="exercise.title"
              :value="exercise.id"
            >
              <span style="float: left">{{ exercise.title }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ exercise.difficulty }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item 
          v-if="taskForm.type === 'custom'"
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

        <el-form-item label="任务要求">
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

    <!-- 任务详情对话框 -->
    <el-dialog 
      v-model="isDetailDialogVisible" 
      title="任务详情"
      width="800px"
      class="task-detail-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <div v-if="selectedTaskDetail" class="task-detail">
        <div class="detail-header">
          <h3 class="detail-title">{{ selectedTaskDetail.title }}</h3>
          <div class="detail-badges">
            <span class="priority-badge" :class="`priority-${selectedTaskDetail.priority}`">
              {{ getPriorityText(selectedTaskDetail.priority) }}
            </span>
            <span class="status-badge" :class="`status-${selectedTaskDetail.status}`">
              {{ getStatusText(selectedTaskDetail.status) }}
            </span>
          </div>
        </div>
        
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">创建时间：</span>
            <span class="meta-value">{{ formatDateTime(selectedTaskDetail.createDate) }}</span>
          </div>
          <div class="meta-item" v-if="selectedTaskDetail.dueDate">
            <span class="meta-label">截止时间：</span>
            <span class="meta-value" :class="{ 'overdue-text': isOverdue(selectedTaskDetail) }">
              {{ formatDateTime(selectedTaskDetail.dueDate) }}
            </span>
          </div>
        </div>

        <div class="detail-content">
          <h4>任务描述</h4>
          <div class="content-text">{{ selectedTaskDetail.description }}</div>
          
          <h4 v-if="selectedTaskDetail.requirements">任务要求</h4>
          <div v-if="selectedTaskDetail.requirements" class="content-text">{{ selectedTaskDetail.requirements }}</div>
        </div>

        <!-- 学生操作区域 -->
        <div v-if="!isTeacher && getTaskActualStatus(selectedTaskDetail) !== 'completed'" class="student-action-area">
          <!-- 题目任务：前往解题按钮 -->
          <div v-if="selectedTaskDetail.type === 'exercise'" class="exercise-action">
            <el-button 
              type="primary" 
              size="large"
              @click="handleGoToExercise(selectedTaskDetail)"
              :type="getTaskActualStatus(selectedTaskDetail) === 'overdue' ? 'danger' : 'primary'"
            >
              <el-icon><EditPen /></el-icon>
              {{ getTaskActualStatus(selectedTaskDetail) === 'overdue' ? '补做题目' : '前往解题' }}
            </el-button>
          </div>
          
          <!-- 自定义任务：提交区域 -->
          <div v-else class="custom-task-submission">
            <h4>任务提交</h4>
            <el-form :model="submissionForm" ref="submissionFormRef" label-width="100px">
              <el-form-item label="文字内容" prop="content">
                <el-input 
                  v-model="submissionForm.content"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入任务完成的文字说明..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="文件上传">
                <el-upload
                  class="task-upload"
                  :file-list="submissionForm.files"
                  :on-change="handleFileChange"
                  :on-remove="handleFileRemove"
                  :before-upload="() => false"
                  multiple
                  drag
                >
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">点击或拖拽文件到此区域上传</div>
                  <template #tip>
                    <div class="upload-tip">支持文档、图片等格式，单个文件不超过10MB</div>
                  </template>
                </el-upload>
              </el-form-item>

            </el-form>
            
            <div class="submission-actions">
              <el-button 
                type="primary" 
                @click="handleSubmitTaskInDetail"
                :disabled="getTaskActualStatus(selectedTaskDetail) === 'overdue'"
                :loading="submitting"
              >
                提交任务
              </el-button>
            </div>
          </div>
        </div>

        <!-- 任务统计（教师视图） -->
        <div v-if="isTeacher" class="task-statistics">
          <h4>提交统计</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ selectedTaskDetail.completedCount || 0 }}</div>
              <div class="stat-label">已完成</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ selectedTaskDetail.pendingCount || 0 }}</div>
              <div class="stat-label">待完成</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ selectedTaskDetail.overdueCount || 0 }}</div>
              <div class="stat-label">已逾期</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ Math.round((selectedTaskDetail.completedCount / selectedTaskDetail.totalCount) * 100) || 0 }}%</div>
              <div class="stat-label">完成率</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>


  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  DocumentAdd, 
  Setting, 
  Search, 
  Clock,
  Document,
  ArrowDown,
  MoreFilled,
  EditPen,
  CircleCheck,
  CircleClose,
  VideoPlay,
  Upload
} from '@element-plus/icons-vue';

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
const searchQuery = ref('');
const activeFilter = ref('all');
const activeTypeFilter = ref('all');
const selectedTasks = ref([]);
const batchMode = ref(false);
const saving = ref(false);
const currentTaskType = ref('custom'); // 当前创建的任务类型

// 对话框状态
const isTaskDialogVisible = ref(false);
const isDetailDialogVisible = ref(false);

const selectedTaskDetail = ref(null);
const editingTask = ref(null);
const submitting = ref(false);

// 表单引用和数据
const taskFormRef = ref();
const submissionFormRef = ref();
const taskForm = ref({
  type: 'custom',
  title: '',
  description: '',
  exerciseId: '', // 选择的题目ID
  dueDate: ''
});

// 自定义任务提交表单
const submissionForm = ref({
  content: '',
  files: []
});

// 题库数据（模拟）
const exerciseBank = ref([
  { id: 1, title: 'Python基础语法练习', difficulty: '简单', type: 'programming' },
  { id: 2, title: '数据结构实现', difficulty: '中等', type: 'programming' },
  { id: 3, title: '算法设计与分析', difficulty: '困难', type: 'programming' },
  { id: 4, title: '数学计算题', difficulty: '简单', type: 'calculation' },
  { id: 5, title: '逻辑推理问题', difficulty: '中等', type: 'logic' }
]);

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 是否为教师（管理员）
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 按截止时间筛选选项
const taskFilters = [
  { key: 'all', label: '全部任务' },
  { key: 'today', label: '今日截止' },
  { key: 'tomorrow', label: '明日截止' },
  { key: 'week', label: '本周截止' },
  { key: 'overdue', label: '已逾期' },
  { key: 'no_due', label: '无截止时间' }
];

// 任务状态选项（简化为三种状态）
const taskStatusOptions = [
  { value: 'pending', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已逾期' }
];

// 任务类型筛选选项
const taskTypeFilters = [
  { key: 'all', label: '全部类型' },
  { key: 'exercise', label: '题目任务单' },
  { key: 'custom', label: '自定义任务单' }
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
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
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
const filteredTasks = computed(() => {
  let filtered = tasks.value;

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(task => 
      task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 按截止时间筛选
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(task => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + (7 - today.getDay())); // 本周日
      
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      
      switch (activeFilter.value) {
        case 'today':
          return dueDate && dueDate >= today && dueDate < tomorrow;
        case 'tomorrow':
          const dayAfterTomorrow = new Date(tomorrow);
          dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
          return dueDate && dueDate >= tomorrow && dueDate < dayAfterTomorrow;
        case 'week':
          return dueDate && dueDate > tomorrow && dueDate <= weekEnd;
        case 'overdue':
          return dueDate && dueDate < today && task.status !== 'completed';
        case 'no_due':
          return !dueDate;
        default:
          return true;
      }
    });
  }

  // 类型过滤
  if (activeTypeFilter.value !== 'all') {
    filtered = filtered.filter(task => {
      return task.type === activeTypeFilter.value;
    });
  }

  // 按优先级和创建时间排序
  return filtered.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.createDate) - new Date(a.createDate);
  });
});

// 按日期分组的任务
const groupedTasks = computed(() => {
  const groups = {};
  
  filteredTasks.value.forEach(task => {
    const dateKey = getDateGroup(task.createDate || task.assignedDate);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: getDateGroupLabel(task.createDate || task.assignedDate),
        tasks: [],
        date: task.createDate || task.assignedDate
      };
    }
    groups[dateKey].tasks.push(task);
  });
  
  // 按日期排序分组，最新的在前
  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => new Date(groups[b].date) - new Date(groups[a].date))
    .forEach(key => {
      sortedGroups[key] = groups[key];
      // 每个分组内的任务按优先级排序
      sortedGroups[key].tasks.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.createDate || b.assignedDate) - new Date(a.createDate || a.assignedDate);
      });
    });
  
  return sortedGroups;
});

// 是否全选
const isAllSelected = computed(() => {
  return filteredTasks.value.length > 0 && 
         selectedTasks.value.length === filteredTasks.value.length;
});

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

const getFilterCount = (filterKey) => {
  if (filterKey === 'all') return tasks.value.length;
  
  return tasks.value.filter(task => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (7 - today.getDay()));
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    switch (filterKey) {
      case 'today':
        return dueDate && dueDate >= today && dueDate < tomorrow;
      case 'tomorrow':
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
        return dueDate && dueDate >= tomorrow && dueDate < dayAfterTomorrow;
      case 'week':
        return dueDate && dueDate > tomorrow && dueDate <= weekEnd;
      case 'overdue':
        return dueDate && dueDate < today && task.status !== 'completed';
      case 'no_due':
        return !dueDate;
      default:
        return true;
    }
  }).length;
};

const getTypeFilterCount = (typeKey) => {
  if (typeKey === 'all') return tasks.value.length;
  
  return tasks.value.filter(task => {
    return task.type === typeKey;
  }).length;
};

const getTaskTypeText = (type) => {
  const typeMap = {
    'exercise': '题目',
    'custom': '自定义'
  };
  return typeMap[type] || type;
};

const getPriorityText = (priority) => {
  const priorityMap = {
    'high': '高优先级',
    'medium': '中优先级',
    'low': '低优先级'
  };
  return priorityMap[priority] || priority;
};

// 获取任务的实际状态（简化为三种状态）
const getTaskActualStatus = (task) => {
  // 如果已完成，返回已完成状态
  if (task.status === 'completed') {
    return 'completed';
  }
  
  // 如果未完成但超过截止时间，返回逾期状态
  if (task.dueDate && new Date() > new Date(task.dueDate)) {
    return 'overdue';
  }
  
  // 其他情况都是未完成状态
  return 'pending';
};

const getStatusText = (status) => {
  const statusMap = {
    'pending': '未完成',
    'completed': '已完成', 
    'overdue': '已逾期'
  };
  return statusMap[status] || status;
};

// 日期分组函数 - 精确到具体日期
const getDateGroup = (date) => {
  const taskDate = new Date(date);
  // 返回 YYYY-MM-DD 格式的日期字符串
  return taskDate.getFullYear() + '-' + 
         String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + 
         String(taskDate.getDate()).padStart(2, '0');
};

const getDateGroupLabel = (date) => {
  const taskDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  // 判断是否为今天
  if (taskDate.getFullYear() === today.getFullYear() && 
      taskDate.getMonth() === today.getMonth() && 
      taskDate.getDate() === today.getDate()) {
    return '今天 (' + formatDateShort(taskDate) + ')';
  }
  
  // 判断是否为昨天
  if (taskDate.getFullYear() === yesterday.getFullYear() && 
      taskDate.getMonth() === yesterday.getMonth() && 
      taskDate.getDate() === yesterday.getDate()) {
    return '昨天 (' + formatDateShort(taskDate) + ')';
  }
  
  // 判断是否为明天
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (taskDate.getFullYear() === tomorrow.getFullYear() && 
      taskDate.getMonth() === tomorrow.getMonth() && 
      taskDate.getDate() === tomorrow.getDate()) {
    return '明天 (' + formatDateShort(taskDate) + ')';
  }
  
  // 其他日期显示具体日期和星期
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDay = weekDays[taskDate.getDay()];
  
  // 如果是本年，不显示年份
  if (taskDate.getFullYear() === now.getFullYear()) {
    return `${taskDate.getMonth() + 1}月${taskDate.getDate()}日 ${weekDay}`;
  } else {
    return `${taskDate.getFullYear()}年${taskDate.getMonth() + 1}月${taskDate.getDate()}日 ${weekDay}`;
  }
};

// 格式化日期为简短形式
const formatDateShort = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getPreviewText = (text) => {
  return text.length > 60 ? text.substring(0, 60) + '...' : text;
};

const formatDueDate = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const dueDate = new Date(date);
  const diffTime = dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    // 逾期的情况直接显示日期，不显示"已逾期"文字
    return dueDate.toLocaleDateString('zh-CN');
  }
  if (diffDays === 0) return '今天截止';
  if (diffDays === 1) return '明天截止';
  if (diffDays <= 7) return `${diffDays}天后截止`;
  
  return dueDate.toLocaleDateString('zh-CN');
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

const isOverdue = (task) => {
  return getTaskActualStatus(task) === 'overdue';
};

const getProgressText = (task) => {
  const actualStatus = getTaskActualStatus(task);
  if (actualStatus === 'completed') return '已完成';
  if (actualStatus === 'overdue') return '已逾期';
  return '未完成';
};

const getProgressPercentage = (task) => {
  const actualStatus = getTaskActualStatus(task);
  if (actualStatus === 'completed') return 100;
  if (task.status === 'in_progress') return 50;
  return 0;
};

const getEmptyMessage = () => {
  if (searchQuery.value) {
    return '没有找到匹配的任务单';
  }
  if (activeFilter.value !== 'all') {
    return '该状态下暂无任务单';
  }
  if (activeTypeFilter.value !== 'all') {
    const typeText = activeTypeFilter.value === 'exercise' ? '题目任务单' : '自定义任务单';
    return `暂无${typeText}`;
  }
  return '还没有布置任务单';
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
  isTaskDialogVisible.value = true;
};

const getCreateDialogTitle = () => {
  return currentTaskType.value === 'exercise' ? '创建题目任务单' : '创建自定义任务单';
};

const handleTaskTypeChange = () => {
  // 当任务类型改变时，重置相关字段
  if (taskForm.value.type === 'exercise') {
    taskForm.value.exerciseType = '';
    taskForm.value.referenceAnswer = '';
    taskForm.value.score = 10;
  }
};

const handleBatchManage = () => {
  batchMode.value = !batchMode.value;
  selectedTasks.value = [];
};

const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedTasks.value = [];
  } else {
    selectedTasks.value = filteredTasks.value.map(task => task.id);
  }
};

const handleTaskClick = (task) => {
  selectedTaskDetail.value = task;
  
  // 重置提交表单
  submissionForm.value = {
    content: '',
    files: []
  };
  
  isDetailDialogVisible.value = true;
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

const cancelBatchMode = () => {
  batchMode.value = false;
  selectedTasks.value = [];
};

const handleStartTask = (task) => {
  task.status = 'in_progress';
  ElMessage.success('任务已开始');
};

const handleSubmitTask = (task) => {
  // 直接打开任务详情弹窗，在其中进行提交
  selectedTaskDetail.value = task;
  
  // 重置提交表单
  submissionForm.value = {
    content: '',
    files: []
  };
  
  isDetailDialogVisible.value = true;
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
      if (editingTask.value) {
        // 编辑现有任务
        Object.assign(editingTask.value, {
          ...taskForm.value,
          createDate: new Date()
        });
        ElMessage.success('任务已更新');
        emit('task-edit', editingTask.value);
      } else {
        // 创建新任务
        const newTask = {
          id: Date.now(),
          ...taskForm.value,
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

// 文件上传处理
const handleFileChange = (file, fileList) => {
  submissionForm.value.files = fileList;
};

const handleFileRemove = (file, fileList) => {
  submissionForm.value.files = fileList;
};

// 前往解题（题目任务）
const handleGoToExercise = (task) => {
  // 关闭详情弹窗
  isDetailDialogVisible.value = false;
  
  // 跳转到解题页面
  router.push({
    name: 'exercise-solve',
    params: { 
      id: task.exerciseId || task.id 
    },
    query: { 
      taskId: task.id,
      title: task.title,
      from: 'group-task'
    }
  });
  
  ElMessage.success(`正在跳转到解题页面：${task.title}`);
};

// 在详情弹窗中提交任务（自定义任务）
const handleSubmitTaskInDetail = async () => {
  if (!submissionForm.value.content && submissionForm.value.files.length === 0) {
    ElMessage.warning('请至少输入文字内容或上传文件');
    return;
  }

  submitting.value = true;
  
  // 模拟提交过程
  setTimeout(() => {
    if (selectedTaskDetail.value) {
      selectedTaskDetail.value.status = 'completed';
      ElMessage.success('任务已提交');
      emit('task-submit', {
        task: selectedTaskDetail.value,
        submission: {
          content: submissionForm.value.content,
          files: submissionForm.value.files,
          submitTime: new Date()
        }
      });
      
      // 重置表单
      submissionForm.value = {
        content: '',
        files: []
      };
      
      // 关闭详情弹窗
      isDetailDialogVisible.value = false;
    }
    
    submitting.value = false;
  }, 1000);
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

/* 任务详情对话框 */
.task-detail {
  padding: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .detail-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.4;
  flex: 1;
  margin-right: 16px;
}

.theme-dark .detail-title {
  color: #ffffff;
}

.detail-badges {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.priority-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.theme-dark .detail-meta {
  background: rgba(255, 255, 255, 0.03);
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.meta-label {
  font-weight: 500;
  color: #6b7280;
  margin-right: 8px;
}

.theme-dark .meta-label {
  color: #9ca3af;
}

.meta-value {
  color: #1a1a1a;
}

.theme-dark .meta-value {
  color: #ffffff;
}

.detail-content {
  margin-bottom: 20px;
}

.detail-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.theme-dark .detail-content h4 {
  color: #ffffff;
}

.content-text {
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
  margin-bottom: 16px;
}

.theme-dark .content-text {
  color: #e5e7eb;
}

/* 学生操作区域 */
.student-action-area {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .student-action-area {
  border-top-color: rgba(255, 255, 255, 0.1);
}

/* 题目任务解题按钮 */
.exercise-action {
  text-align: center;
  padding: 20px 0;
}

.exercise-action .el-button {
  font-size: 16px;
  padding: 12px 32px;
  height: auto;
}

/* 自定义任务提交区域 */
.custom-task-submission h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.theme-dark .custom-task-submission h4 {
  color: #ffffff;
}

.task-upload {
  width: 100%;
}

.upload-icon {
  font-size: 32px;
  color: #8c9097;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: #8c9097;
  margin-bottom: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #a8a8a8;
}

/* 原有样式兼容 */
.submission-area {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 20px;
  margin-bottom: 20px;
}

.theme-dark .submission-area {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.submission-area h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.theme-dark .submission-area h4 {
  color: #ffffff;
}

.submission-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.task-statistics {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 20px;
}

.theme-dark .task-statistics {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.task-statistics h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.theme-dark .task-statistics h4 {
  color: #ffffff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  text-align: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.theme-dark .stat-card {
  background: rgba(255, 255, 255, 0.03);
}

.stat-card .stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  display: block;
  margin-bottom: 4px;
}

.stat-card .stat-label {
  font-size: 12px;
  color: #9ca3af;
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

.submission-dialog .el-dialog__body {
  padding: 20px;
}

.upload-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
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

/* 文件上传样式 */
.task-upload .el-upload__tip {
  margin-top: 8px;
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