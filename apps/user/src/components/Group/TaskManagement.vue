<template>
  <div class="task-management" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部信息 -->
    <div class="task-header">
      <div class="header-left">
        <div class="task-info">
          <h2 class="task-title">{{ task.title }}</h2>
          <div class="task-meta">
            <div class="meta-item">
              <el-icon><Calendar /></el-icon>
              <span>截止时间：{{ formatDate(task.deadline) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>发布时间：{{ formatDate(task.publishDate) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><User /></el-icon>
              <span>任务类型：{{ getTaskTypeText(task.type) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- 头部操作按钮区域 -->
      </div>
    </div>

    <!-- 统计面板 -->
    <div class="stats-panel">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalStudents }}</div>
            <div class="stat-label">总人数</div>
          </div>
        </div>
        
        <div class="stat-card submitted">
          <div class="stat-icon">
            <el-icon><Select /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.submittedCount }}</div>
            <div class="stat-label">已提交</div>
            <div class="stat-percentage">{{ submissionRate }}%</div>
          </div>
        </div>
        
        <div v-if="!isExerciseTask" class="stat-card graded">
          <div class="stat-icon">
            <el-icon><EditPen /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.gradedCount }}</div>
            <div class="stat-label">已批改</div>
            <div class="stat-percentage">{{ gradingRate }}%</div>
          </div>
        </div>
        
        <div class="stat-card avg-score">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.averageScore || '--' }}</div>
            <div class="stat-label">平均分</div>
          </div>
        </div>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-section">
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-title">提交进度</span>
            <span class="progress-value">{{ stats.submittedCount }}/{{ stats.totalStudents }}</span>
          </div>
          <el-progress 
            :percentage="submissionRate" 
            :color="getProgressColor('submission')"
            :stroke-width="8"
          />
        </div>
        
        <div v-if="!isExerciseTask" class="progress-item">
          <div class="progress-header">
            <span class="progress-title">批改进度</span>
            <span class="progress-value">{{ stats.gradedCount }}/{{ stats.submittedCount }}</span>
          </div>
          <el-progress 
            :percentage="gradingRate" 
            :color="getProgressColor('grading')"
            :stroke-width="8"
          />
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="filter-left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索学生姓名或学号..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>
      
      <div class="filter-right">
        <div class="filter-tabs">
          <div 
            v-for="filter in statusFilters"
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
    </div>

    <!-- 学生提交列表 -->
    <div class="submissions-list" :class="{ 'exercise-task': isExerciseTask }">
      <div class="list-header">
        <div class="header-item name">学生信息</div>
        <div class="header-item submit-time">提交时间</div>
        <div class="header-item score">{{ isExerciseTask ? '分数' : '成绩' }}</div>
        <div v-if="isExerciseTask" class="header-item attempts">提交次数</div>
        <div class="header-item status">状态</div>
        <div class="header-item actions">操作</div>
      </div>
      
      <div class="list-body">
        <div 
          v-for="submission in filteredSubmissions" 
          :key="submission.studentId"
          class="submission-item"
          :class="{ 'late': isLateSubmission(submission.submitTime) }"
        >
          <div class="item-content name">
            <div class="student-avatar">
              <img v-if="submission.student.avatar" :src="submission.student.avatar" :alt="submission.student.name" />
              <div v-else class="avatar-placeholder">
                {{ submission.student.name.charAt(0) }}
              </div>
            </div>
            <div class="student-info">
              <div class="student-name">{{ submission.student.name }}</div>
              <div class="student-id">{{ submission.student.studentId }}</div>
            </div>
          </div>
          
          <div class="item-content submit-time">
            <div v-if="submission.submitTime" class="time-info">
              <div class="submit-date">{{ formatDate(submission.submitTime) }}</div>
              <div class="submit-relative">{{ formatRelativeTime(submission.submitTime) }}</div>
            </div>
            <div v-else class="not-submitted">未提交</div>
          </div>
          
          <div class="item-content score">
            <div v-if="submission.score !== null" class="score-display">
              <span class="score-number" :class="getScoreClass(submission.score)">
                {{ submission.score }}
              </span>
              <span class="score-total">/{{ task.totalScore || 100 }}</span>
            </div>
            <div v-else-if="submission.submitTime && !isExerciseTask" class="not-graded">未批改</div>
            <div v-else class="not-available">--</div>
          </div>
          
          <div v-if="isExerciseTask" class="item-content attempts">
            <div class="attempts-count">
              {{ submission.attemptCount || (submission.submitTime ? 1 : 0) }}
            </div>
          </div>
          
          <div class="item-content status">
            <el-tag :type="getStatusType(submission)" size="small">
              {{ getStatusText(submission) }}
            </el-tag>
          </div>
          
          <div class="item-content actions">
            <div class="action-buttons">
              <!-- 题目类型只显示基本操作 -->
              <template v-if="isExerciseTask">
                <!-- 题目类型无额外操作 -->
              </template>

              <!-- 自定义任务显示完整功能 -->
              <template v-else>
                <el-tooltip content="批改作业" v-if="submission.submitTime && !submission.isGraded">
                  <el-button type="text" @click="handleGradeSubmission(submission)" size="small">
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip content="修改成绩" v-if="submission.isGraded">
                  <el-button type="text" @click="handleEditGrade(submission)" size="small">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip content="下载附件" v-if="submission.files && submission.files.length > 0">
                  <el-button type="text" @click="handleDownloadSubmission(submission)" size="small">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </el-tooltip>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 批改对话框 - 只有自定义任务才显示 -->
    <el-dialog
      v-if="!isExerciseTask"
      v-model="gradingDialogVisible"
      title="批改作业"
      width="800px"
      class="grading-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <div v-if="currentSubmission" class="grading-content">
        <!-- 学生信息 -->
        <div class="student-section">
          <h4>学生信息</h4>
          <div class="student-details">
            <span>姓名：{{ currentSubmission.student.name }}</span>
            <span>学号：{{ currentSubmission.student.studentId }}</span>
            <span>提交时间：{{ formatDateTime(currentSubmission.submitTime) }}</span>
          </div>
        </div>
        
        <!-- 提交内容 -->
        <div class="submission-section">
          <h4>提交内容</h4>
          <div class="submission-content">
            <div v-if="currentSubmission.content" class="text-content">
              <p>{{ currentSubmission.content }}</p>
            </div>
            <div v-if="currentSubmission.files && currentSubmission.files.length > 0" class="file-list">
              <h5>附件文件：</h5>
              <div class="file-items">
                <div v-for="file in currentSubmission.files" :key="file.id" class="file-item">
                  <el-icon><Document /></el-icon>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">({{ formatFileSize(file.size) }})</span>
                  <el-button type="text" @click="handlePreviewFile(file)" size="small">预览</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 评分区域 -->
        <div class="grading-section">
          <el-form :model="gradingForm" :rules="gradingRules" ref="gradingFormRef" label-width="80px">
            <el-form-item label="成绩" prop="score">
              <el-input-number
                v-model="gradingForm.score"
                :min="0"
                :max="task.totalScore || 100"
                :precision="1"
                controls-position="right"
              />
              <span class="score-suffix">/{{ task.totalScore || 100 }}</span>
            </el-form-item>
            
            <el-form-item label="评语" prop="comment">
              <el-input
                v-model="gradingForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入评语..."
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="gradingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveGrading" :loading="saving">
            保存批改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';
import {
  Calendar,
  Clock,
  User,
  Download,
  Document,
  Close,
  UserFilled,
  Select,
  EditPen,
  TrendCharts,
  Search,
  View,
  Edit
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  isTeacher: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits([
  'close',
  'grade-updated',
  'download-all',
  'export-stats'
]);

// Vuex store
const store = useStore();

// 响应式数据
const searchQuery = ref('');
const activeFilter = ref('all');
const saving = ref(false);

// 对话框状态
const gradingDialogVisible = ref(false);
const currentSubmission = ref(null);

// 表单数据
const gradingForm = ref({
  score: 0,
  comment: ''
});

const gradingFormRef = ref();

// 统计数据
const stats = ref({
  totalStudents: 25,
  submittedCount: 4,   // 实际提交的学生数量
  gradedCount: 2,      // 已批改的作业数量
  averageScore: 90.0,  // 平均分
  totalAttempts: 12    // 总提交次数（练习题用）
});

// 筛选选项 - 根据任务类型动态生成
const statusFilters = computed(() => {
  const baseFilters = [
    { key: 'all', label: '全部学生' },
    { key: 'submitted', label: '已提交' },
    { key: 'not-submitted', label: '未提交' },
    { key: 'late', label: '逾期提交' }
  ];
  
  // 只有自定义任务才有批改相关筛选
  if (!isExerciseTask.value) {
    baseFilters.splice(3, 0, 
      { key: 'graded', label: '已批改' },
      { key: 'not-graded', label: '待批改' }
    );
  }
  
  return baseFilters;
});

// 表单验证规则
const gradingRules = {
  score: [
    { required: true, message: '请输入成绩', trigger: 'blur' },
    { type: 'number', min: 0, message: '成绩不能小于0', trigger: 'blur' }
  ]
};

// 模拟提交数据
const submissions = ref([
  {
    studentId: 'S001',
    student: {
      name: '张三',
      studentId: 'S001',
      avatar: null
    },
    submitTime: new Date('2024-10-07T14:30:00'),
    content: '我已经完成了生物医学工程导论第三章的学习，并完成了相关的实验报告...',
    files: [
      { id: 1, name: '第三章实验报告.pdf', size: 2048576 },
      { id: 2, name: '实验数据.xlsx', size: 512000 }
    ],
    score: 88,
    comment: '作业完成质量较好，实验数据分析到位。',
    isGraded: true,
    gradedTime: new Date('2024-10-07T16:45:00'),
    attemptCount: 2  // 提交次数
  },
  {
    studentId: 'S002',
    student: {
      name: '李四',
      studentId: 'S002',
      avatar: null
    },
    submitTime: new Date('2024-10-07T23:45:00'),
    content: '提交作业内容...',
    files: [
      { id: 3, name: '作业报告.docx', size: 1024000 }
    ],
    score: 75,
    comment: null,
    isGraded: false,
    gradedTime: null,
    attemptCount: 1  // 提交次数
  },
  {
    studentId: 'S003',
    student: {
      name: '王五',
      studentId: 'S003',
      avatar: null
    },
    submitTime: null,
    content: null,
    files: [],
    score: null,
    comment: null,
    isGraded: false,
    gradedTime: null
  },
  {
    studentId: 'S004',
    student: {
      name: '赵六',
      studentId: 'S004',
      avatar: null
    },
    submitTime: new Date('2024-10-06T10:15:00'),
    content: '完成了实验报告，包含详细的数据分析和结论总结。',
    files: [
      { id: 4, name: '生物医学工程实验.pdf', size: 3145728 }
    ],
    score: 92,
    comment: '实验报告质量优秀，分析深入，格式规范。',
    isGraded: true,
    gradedTime: new Date('2024-10-06T15:30:00'),
    attemptCount: 3  // 提交次数
  },
  {
    studentId: 'S005',
    student: {
      name: '钱七',
      studentId: 'S005',
      avatar: null
    },
    submitTime: new Date('2024-10-08T09:20:00'),
    content: '作业已完成，请老师查看。',
    files: [
      { id: 5, name: '课程作业.docx', size: 1536000 },
      { id: 6, name: '附录数据.xlsx', size: 819200 }
    ],
    score: 82,
    comment: null,
    isGraded: false,
    gradedTime: null,
    attemptCount: 4  // 提交次数
  }
]);

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode);

// 判断是否为题目类型任务
const isExerciseTask = computed(() => props.task?.type === 'exercise');

const submissionRate = computed(() => {
  if (stats.value.totalStudents === 0) return 0;
  return Math.round((stats.value.submittedCount / stats.value.totalStudents) * 100);
});

const gradingRate = computed(() => {
  if (stats.value.submittedCount === 0) return 0;
  return Math.round((stats.value.gradedCount / stats.value.submittedCount) * 100);
});

const filteredSubmissions = computed(() => {
  let filtered = submissions.value;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(submission => 
      submission.student.name.toLowerCase().includes(query) ||
      submission.student.studentId.toLowerCase().includes(query)
    );
  }

  // 状态过滤
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(submission => {
      switch (activeFilter.value) {
        case 'submitted':
          return submission.submitTime !== null;
        case 'not-submitted':
          return submission.submitTime === null;
        case 'graded':
          return submission.isGraded;
        case 'not-graded':
          return submission.submitTime !== null && !submission.isGraded;
        case 'late':
          return submission.submitTime && isLateSubmission(submission.submitTime);
        default:
          return true;
      }
    });
  }

  return filtered;
});

// 方法
const getTaskTypeText = (type) => {
  const typeMap = {
    'exercise': '练习题',
    'custom': '自定义',
    'assignment': '作业',
    'project': '项目',
    'report': '报告'
  };
  return typeMap[type] || type;
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffTime = Math.abs(now - new Date(date));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return `${diffDays}天前`;
  
  return formatDate(date);
};

const formatFileSize = (size) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

const isLateSubmission = (submitTime) => {
  if (!submitTime || !props.task.deadline) return false;
  return new Date(submitTime) > new Date(props.task.deadline);
};

const getProgressColor = (type) => {
  switch (type) {
    case 'submission':
      return submissionRate.value >= 80 ? '#67c23a' : submissionRate.value >= 60 ? '#e6a23c' : '#f56c6c';
    case 'grading':
      return gradingRate.value >= 80 ? '#67c23a' : gradingRate.value >= 60 ? '#e6a23c' : '#f56c6c';
    default:
      return '#409eff';
  }
};

const getFilterCount = (filterKey) => {
  switch (filterKey) {
    case 'all':
      return stats.value.totalStudents;
    case 'submitted':
      return stats.value.submittedCount;
    case 'not-submitted':
      return stats.value.totalStudents - stats.value.submittedCount;
    case 'graded':
      return isExerciseTask.value ? 0 : stats.value.gradedCount;
    case 'not-graded':
      return isExerciseTask.value ? 0 : stats.value.submittedCount - stats.value.gradedCount;
    case 'late':
      return submissions.value.filter(s => s.submitTime && isLateSubmission(s.submitTime)).length;
    default:
      return 0;
  }
};

const getScoreClass = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'pass';
  return 'fail';
};

const getStatusType = (submission) => {
  if (!submission.submitTime) return 'info';
  if (isExerciseTask.value) {
    // 练习题只显示提交状态
    if (isLateSubmission(submission.submitTime)) return 'warning';
    return 'success';
  } else {
    // 自定义任务显示批改状态
    if (submission.isGraded) return 'success';
    if (isLateSubmission(submission.submitTime)) return 'warning';
    return 'primary';
  }
};

const getStatusText = (submission) => {
  if (!submission.submitTime) return '未提交';
  if (isExerciseTask.value) {
    // 练习题只显示提交状态
    if (isLateSubmission(submission.submitTime)) return '逾期提交';
    return '已提交';
  } else {
    // 自定义任务显示批改状态
    if (submission.isGraded) return '已批改';
    if (isLateSubmission(submission.submitTime)) return '逾期提交';
    return '待批改';
  }
};

// 事件处理
const handleViewSubmission = (submission) => {
  console.log('查看提交:', submission);
  // TODO: 实现查看提交详情
};

const handleGradeSubmission = (submission) => {
  currentSubmission.value = submission;
  gradingForm.value = {
    score: submission.score || 0,
    comment: submission.comment || ''
  };
  gradingDialogVisible.value = true;
};

const handleEditGrade = (submission) => {
  handleGradeSubmission(submission);
};

const handleSaveGrading = async () => {
  if (!gradingFormRef.value) return;

  try {
    await gradingFormRef.value.validate();

    saving.value = true;

    // 调用后端 API 保存批改
    const res = await api({
      url: `/tasks/${props.task.id}/submissions/${currentSubmission.value.id}/grade`,
      method: 'post',
      data: {
        score: gradingForm.value.score,
        feedback: gradingForm.value.comment
      }
    });

    if (res.data && (res.data.code === 200 || res.data.code === 201)) {
      // 更新本地数据
      const submission = currentSubmission.value;
      submission.score = gradingForm.value.score;
      submission.comment = gradingForm.value.comment;
      submission.isGraded = true;
      submission.gradedTime = new Date();

      // 更新统计
      if (!submission.wasGraded) {
        stats.value.gradedCount++;
        submission.wasGraded = true;
      }

      // 重新计算平均分
      const gradedSubmissions = submissions.value.filter(s => s.isGraded);
      if (gradedSubmissions.length > 0) {
        stats.value.averageScore = gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length;
        stats.value.averageScore = Math.round(stats.value.averageScore * 10) / 10;
      }

      ElMessage.success('批改完成');
      emit('grade-updated', submission);
    } else {
      ElMessage.error(res.data?.message || '批改失败');
    }
  } catch (error) {
    console.error('批改失败:', error);
    ElMessage.error('批改失败，请重试');
  } finally {
    saving.value = false;
    gradingDialogVisible.value = false;
  }
};

const handleDownloadSubmission = async (submission) => {
  console.log('下载提交文件:', submission);

  if (!submission.files || submission.files.length === 0) {
    ElMessage.warning('没有附件可下载');
    return;
  }

  try {
    // 逐个下载文件
    for (const file of submission.files) {
      if (file.id) {
        // 使用 API 下载
        const res = await api({
          url: `/tasks/${props.task.id}/submissions/${submission.id}/attachments/${file.id}`,
          method: 'get',
          responseType: 'blob'
        });

        // 创建下载链接
        const blob = new Blob([res.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || '附件';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (file.url) {
        // 如果有直接 URL
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name || '附件';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    ElMessage.success('下载完成');
  } catch (error) {
    console.error('下载失败:', error);
    ElMessage.error('文件下载失败');
  }
};

const handlePreviewFile = (file) => {
  console.log('预览文件:', file);
  // TODO: 实现文件预览功能
  ElMessage.info('文件预览功能待实现');
};

// 获取提交列表
const fetchSubmissions = async () => {
  try {
    const res = await api({
      url: `/tasks/${props.task.id}/submissions`,
      method: 'get'
    });

    if (res.data && res.data.code === 200) {
      const data = res.data.data || [];

      // 转换后端数据格式
      submissions.value = data.map(item => ({
        id: item.id,
        studentId: item.student_id,
        student: {
          name: item.student_name || '未知学生',
          studentId: item.student_id || '',
          avatar: null
        },
        submitTime: item.submitted_at ? new Date(item.submitted_at) : null,
        content: item.content_text || '',
        files: item.attachments || [],
        score: item.score,
        comment: item.feedback,
        isGraded: item.score !== null,
        gradedTime: item.graded_at ? new Date(item.graded_at) : null,
        attemptCount: item.attempt_no || 1
      }));

      // 计算统计数据
      const actualSubmittedCount = submissions.value.filter(s => s.submitTime).length;
      const actualGradedCount = submissions.value.filter(s => s.isGraded).length;

      let actualAverageScore = 0;
      const scoredSubmissions = submissions.value.filter(s => s.score !== null);
      if (scoredSubmissions.length > 0) {
        actualAverageScore = scoredSubmissions.reduce((sum, s) => sum + s.score, 0) / scoredSubmissions.length;
      }

      const actualTotalAttempts = submissions.value.reduce((sum, s) => {
        return sum + (s.attemptCount || (s.submitTime ? 1 : 0));
      }, 0);

      // 获取学生总数
      const studentsRes = await api({
        url: `/course-groups/${props.task.group_id}/members`,
        method: 'get'
      });

      const totalStudents = (studentsRes.data?.data?.length) || data.length || 25;

      stats.value = {
        totalStudents: totalStudents,
        submittedCount: actualSubmittedCount,
        gradedCount: actualGradedCount,
        averageScore: Math.round(actualAverageScore * 10) / 10,
        totalAttempts: actualTotalAttempts
      };
    }
  } catch (error) {
    console.error('获取提交列表失败:', error);
    // 使用默认模拟数据
    useDefaultData();
  }
};

// 使用默认数据（API 失败时的后备）
const useDefaultData = () => {
  if (!props.task.totalScore) {
    props.task.totalScore = 100;
  }
  if (!props.task.deadline) {
    props.task.deadline = new Date('2024-10-15T23:59:59');
  }
  if (!props.task.publishDate) {
    props.task.publishDate = new Date('2024-10-01T08:00:00');
  }

  const actualSubmittedCount = submissions.value.filter(s => s.submitTime).length;
  const actualGradedCount = submissions.value.filter(s => s.isGraded).length;

  let actualAverageScore = 0;
  if (isExerciseTask.value) {
    const scoredSubmissions = submissions.value.filter(s => s.score !== null);
    actualAverageScore = scoredSubmissions.length > 0
      ? scoredSubmissions.reduce((sum, s) => sum + s.score, 0) / scoredSubmissions.length
      : 0;
  } else {
    const gradedSubmissions = submissions.value.filter(s => s.isGraded);
    actualAverageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length
      : 0;
  }

  const actualTotalAttempts = submissions.value.reduce((sum, s) => {
    return sum + (s.attemptCount || (s.submitTime ? 1 : 0));
  }, 0);

  stats.value = {
    totalStudents: 25,
    submittedCount: actualSubmittedCount,
    gradedCount: actualGradedCount,
    averageScore: Math.round(actualAverageScore * 10) / 10,
    totalAttempts: actualTotalAttempts
  };
};

onMounted(async () => {
  // 初始化数据
  console.log('任务管理组件已挂载，任务信息:', props.task);

  // 为演示添加默认任务信息
  if (!props.task.totalScore) {
    props.task.totalScore = 100;
  }
  if (!props.task.deadline) {
    props.task.deadline = new Date('2024-10-15T23:59:59');
  }
  if (!props.task.publishDate) {
    props.task.publishDate = new Date('2024-10-01T08:00:00');
  }

  // 调用真实 API 获取数据
  await fetchSubmissions();
});
</script>

<style scoped>
.task-management {
  width: 100%;
  padding: 0;
}

/* 头部样式 */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .task-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-left {
  flex: 1;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .task-title {
  color: #ffffff;
}

.task-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .meta-item {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 统计面板样式 */
.stats-panel {
  margin-bottom: 24px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.theme-dark .stats-panel {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.theme-dark .stat-card {
  background: rgba(255, 255, 255, 0.03);
}

.stat-card:hover {
  background: rgba(102, 126, 234, 0.05);
}

.theme-dark .stat-card:hover {
  background: rgba(102, 126, 234, 0.1);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
  color: white;
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.submitted .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.graded .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-card.avg-score .stat-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.theme-dark .stat-number {
  color: #ffffff;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 2px;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

.stat-percentage {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}

/* 进度条样式 */
.progress-section {
  display: flex;
  gap: 32px;
}

.progress-item {
  flex: 1;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.theme-dark .progress-title {
  color: #e5e7eb;
}

.progress-value {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

/* 筛选区域样式 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-input {
  width: 300px;
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
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  font-size: 13px;
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
  font-size: 11px;
  opacity: 0.8;
}

/* 提交列表样式 */
.submissions-list {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.theme-dark .submissions-list {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1.5fr;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* 练习题类型的布局（包含提交次数列） */
.submissions-list.exercise-task .list-header {
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1.5fr;
}



.theme-dark .list-header {
  background: rgba(255, 255, 255, 0.03);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-item {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.theme-dark .header-item {
  color: #e5e7eb;
}

.list-body {
  max-height: 600px;
  overflow-y: auto;
}

.submission-item {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1.5fr;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

/* 练习题类型的布局（包含提交次数列） */
.submissions-list.exercise-task .submission-item {
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 1.5fr;
}



.submission-item:hover {
  background: rgba(102, 126, 234, 0.02);
}

.submission-item.late {
  background: rgba(245, 158, 11, 0.05);
}

.theme-dark .submission-item {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .submission-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.theme-dark .submission-item.late {
  background: rgba(245, 158, 11, 0.1);
}

.item-content {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.item-content.name {
  gap: 12px;
}

.student-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.student-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-name {
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .student-name {
  color: #ffffff;
}

.student-id {
  font-size: 12px;
  color: #9ca3af;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.submit-date {
  color: #374151;
}

.theme-dark .submit-date {
  color: #e5e7eb;
}

.submit-relative {
  font-size: 12px;
  color: #9ca3af;
}

.not-submitted,
.not-graded,
.not-available {
  color: #9ca3af;
  font-style: italic;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score-number {
  font-size: 18px;
  font-weight: 700;
}

.score-number.excellent {
  color: #16a34a;
}

.score-number.good {
  color: #2563eb;
}

.score-number.fair {
  color: #d97706;
}

.score-number.pass {
  color: #dc2626;
}

.score-number.fail {
  color: #dc2626;
}

.score-total {
  font-size: 14px;
  color: #9ca3af;
}

.attempts-count {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.theme-dark .attempts-count {
  color: #e5e7eb;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* 批改对话框样式 */
.grading-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.grading-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.student-section h4,
.submission-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.theme-dark .student-section h4,
.theme-dark .submission-section h4 {
  color: #e5e7eb;
}

.student-details {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .student-details {
  color: #9ca3af;
}

.submission-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-content p {
  margin: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.theme-dark .text-content p {
  background: rgba(255, 255, 255, 0.03);
}

.file-list h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.theme-dark .file-list h5 {
  color: #e5e7eb;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  font-size: 14px;
}

.theme-dark .file-item {
  background: rgba(255, 255, 255, 0.03);
}

.file-name {
  flex: 1;
  color: #374151;
}

.theme-dark .file-name {
  color: #e5e7eb;
}

.file-size {
  color: #9ca3af;
  font-size: 12px;
}

.score-suffix {
  margin-left: 8px;
  color: #9ca3af;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .task-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .progress-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .list-header,
  .submission-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .header-item {
    display: none;
  }
  
  .item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .item-content.name {
    flex-direction: row;
    align-items: center;
  }
}
</style>