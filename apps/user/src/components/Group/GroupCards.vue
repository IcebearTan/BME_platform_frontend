<template>
  <div class="course-cards-manager" :class="{ 'theme-dark': isDarkMode }">
    <!-- 课程卡片网格 -->
    <div class="course-grid" v-if="filteredCourses.length > 0">
      <div 
        v-for="course in filteredCourses" 
        :key="course.id"
        class="course-card"
        @click="handleCourseClick(course)"
      >
        <div class="course-card-header">
          <div class="course-status" :class="getStatusClass(course.status)">
            {{ getStatusText(course.status) }}
          </div>
          <div class="academic-year">
            {{ formatAcademicYear(course.academicYear, course.semester) }}
          </div>
        </div>
        
        <div class="course-card-content">
          <h3 class="course-title">{{ course.title }}</h3>
          <p class="course-description">{{ course.description }}</p>
          
          <div class="course-meta">
            <div class="meta-item">
              <span class="meta-text">导生：{{ course.tutorName || '未指定' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-text">学员：{{ course.studentCount || 0 }}人</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else-if="!loading">
      <p class="empty-message">{{ emptyStateMessage }}</p>
    </div>

    <!-- 加载状态 -->
    <div class="loading-state" v-else>
      <div class="loading-spinner"></div>
      <p class="loading-text">加载课程中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';

// Props
const props = defineProps({
  courseType: {
    type: String,
    required: true,
    validator: (value) => ['my-courses', 'my-teachings'].includes(value)
  },
  searchQuery: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits([
  'course-click',
  'edit-course'
]);

// Vuex store
const store = useStore();

// 响应式数据
const courses = ref([]);
const loading = ref(true);

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 模拟课程数据
const mockCourses = {
  'my-courses': [
    {
      id: 1,
      title: 'Vue.js 高级开发小组',
      description: '深入学习Vue.js框架的高级特性和最佳实践，包括Composition API、状态管理等内容。',
      status: 'active',
      studentCount: 156,
      tutorName: '张教授',
      academicYear: '2024',
      semester: 'autumn',
      lastUpdated: new Date('2024-10-01'),
      createdAt: new Date('2024-09-15')
    },
    {
      id: 2,
      title: 'JavaScript 核心原理学习小组',
      description: '从零开始深入理解JavaScript的核心概念，包括原型链、闭包、异步编程等。',
      status: 'completed',
      studentCount: 89,
      tutorName: '李老师',
      academicYear: '2024',
      semester: 'summer',
      lastUpdated: new Date('2024-09-20'),
      createdAt: new Date('2024-08-01')
    },
    {
      id: 3,
      title: 'React Hooks 深度解析小组',
      description: '全面掌握React Hooks的使用方法和原理，提升React开发效率。',
      status: 'completed',
      studentCount: 234,
      tutorName: '王博士',
      academicYear: '2024',
      semester: 'spring',
      lastUpdated: new Date('2024-09-25'),
      createdAt: new Date('2024-09-01')
    }
  ],
  'my-teachings': [
    {
      id: 4,
      title: '前端工程化实践小组',
      description: '教授现代前端开发的工程化方法，包括构建工具、代码规范、自动化部署等。',
      status: 'active',
      studentCount: 45,
      tutorName: '陈老师',
      academicYear: '2024',
      semester: 'autumn',
      lastUpdated: new Date('2024-10-05'),
      createdAt: new Date('2024-09-10')
    },
    {
      id: 5,
      title: 'TypeScript 学习小组',
      description: '系统性学习TypeScript语言特性，提升代码质量和开发效率。',
      status: 'active',
      studentCount: 12,
      tutorName: '刘教授',
      academicYear: '2025',
      semester: 'winter',
      lastUpdated: new Date('2024-10-02'),
      createdAt: new Date('2024-09-28')
    }
  ]
};

// 计算属性
const filteredCourses = computed(() => {
  if (!props.searchQuery) {
    return courses.value;
  }
  
  return courses.value.filter(course => 
    course.title.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(props.searchQuery.toLowerCase())
  );
});

// 空状态消息
const emptyStateMessage = computed(() => {
  return props.courseType === 'my-courses' ? '还没有加入小组' : '还没有管理的小组';
});

// 方法
const loadCourses = async () => {
  loading.value = true;
  
  // 清空当前数据，立即显示加载状态
  courses.value = [];
  
  // 模拟API调用，减少延迟
  setTimeout(() => {
    courses.value = mockCourses[props.courseType] || [];
    loading.value = false;
  }, 400);
};

const getStatusText = (status) => {
  const statusMap = {
    'active': '进行中',
    'completed': '已结束', 
    'paused': '已结束',
    'draft': '进行中'
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  // 统一状态类名，修复颜色不一致问题
  const statusClassMap = {
    'active': 'status-active',
    'completed': 'status-completed', 
    'paused': 'status-completed', // 统一为已结束样式
    'draft': 'status-active' // 草稿状态显示为进行中
  };
  return statusClassMap[status] || 'status-active';
};

const formatAcademicYear = (year, semester) => {
  const semesterMap = {
    'spring': '春',
    'summer': '夏',
    'autumn': '秋',
    'winter': '冬'
  };
  
  if (year && semester) {
    return `${year}年${semesterMap[semester] || semester}季`;
  }
  return year ? `${year}年` : '';
};

const formatDuration = (seconds) => {
  if (!seconds) return '0分钟';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
};

const formatDate = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
};

const handleCourseClick = (course) => {
  emit('course-click', course);
};

const handleEditCourse = (course) => {
  emit('edit-course', course);
};

const handleCreateCourse = () => {
  emit('create-course');
};

// 监听courseType变化，重新加载数据
watch(() => props.courseType, () => {
  loadCourses();
}, { immediate: true });

onMounted(() => {
  loadCourses();
});
</script>

<style scoped>
.course-cards-manager {
  width: 100%;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 0;
}

.course-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.course-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  transform: translateY(-4px);
  border-color: rgba(64, 158, 255, 0.2);
}

.course-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 0 20px;
}

.academic-year {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 8px;
  background-color: rgba(107, 114, 128, 0.1);
}

.course-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 统一状态样式 */
.status-active {
  background: linear-gradient(135deg, #34d399, #10b981);
  color: white;
}

.status-completed {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: white;
}



.course-card-content {
  padding: 16px 20px 20px 20px;
}

.course-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.course-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 16px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.course-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.meta-icon {
  font-size: 14px;
}

.meta-text {
  font-weight: 500;
}



/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-message {
  font-size: 18px;
  color: #8a8a8a;
  font-weight: 500;
  margin: 0;
}

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-left-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  color: #8a8a8a;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .course-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .course-card-header,
  .course-card-content,
  .course-card-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .course-title {
    font-size: 16px;
  }
  
  .course-description {
    font-size: 13px;
  }
  
  .course-meta {
    flex-direction: column;
    gap: 6px;
  }
  
  .empty-state {
    padding: 60px 16px;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-title {
    font-size: 20px;
  }
  
  .empty-description {
    font-size: 14px;
  }
}

/* 暗黑主题适配 */
.theme-dark .course-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .course-card:hover {
  border-color: rgba(102, 126, 234, 0.4);
}

.theme-dark .course-title {
  color: #ffffff;
}

.theme-dark .course-description,
.theme-dark .meta-text {
  color: #a1a1aa;
}

.theme-dark .empty-title {
  color: #e5e5e5;
}

.theme-dark .empty-description,
.theme-dark .loading-text {
  color: #a1a1aa;
}

/* 暗黑主题适配 */
.theme-dark .course-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .course-card:hover {
  border-color: rgba(102, 126, 234, 0.4);
}

.theme-dark .course-title {
  color: #ffffff;
}

.theme-dark .course-description,
.theme-dark .meta-text {
  color: #a1a1aa;
}

.theme-dark .empty-message {
  color: #a1a1aa;
}

.theme-dark .loading-text {
  color: #a1a1aa;
}

.theme-dark .academic-year {
  color: #a1a1aa;
  background-color: rgba(161, 161, 170, 0.15);
}
</style>