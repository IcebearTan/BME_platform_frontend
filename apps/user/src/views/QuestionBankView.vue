<template>
  <div class="question-bank-view" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <!-- 导航栏 -->
    <MenuComponent />
    
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">题库中心</h1>
          <p class="page-subtitle">海量题目资源，助力学习提升</p>
        </div>
      </div>
      
      <!-- 筛选和搜索区域 -->
      <div class="filter-section">
        <div class="filter-content">
          <!-- 分类筛选 -->
          <div class="category-filters">
            <el-button 
              :type="selectedCategory === 'all' ? 'primary' : ''"
              @click="handleCategoryChange('all')"
            >
              全部
            </el-button>
            <el-button 
              :type="selectedCategory === 'programming' ? 'primary' : ''"
              @click="handleCategoryChange('programming')"
            >
              编程实践
            </el-button>
            <el-button 
              :type="selectedCategory === 'theory' ? 'primary' : ''"
              @click="handleCategoryChange('theory')"
            >
              理论基础
            </el-button>
            <el-button 
              :type="selectedCategory === 'design' ? 'primary' : ''"
              @click="handleCategoryChange('design')"
            >
              设计应用
            </el-button>
            <el-button 
              :type="selectedCategory === 'analysis' ? 'primary' : ''"
              @click="handleCategoryChange('analysis')"
            >
              分析方法
            </el-button>
          </div>
          
          <!-- 搜索框 -->
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索题目关键词..."
              :prefix-icon="Search"
              clearable
              @input="handleSearch"
            />
          </div>
        </div>
      </div>
      
      <!-- 题目列表 -->
      <div class="question-list-section">
        <div class="list-content">
          <!-- 统计信息 -->
          <div class="stats-bar">
            <span class="stats-text">共找到 {{ filteredQuestions.length }} 道题目</span>
            <div class="sort-controls">
              <span class="sort-label">排序：</span>
              <el-select v-model="sortBy" placeholder="选择排序方式" @change="handleSort">
                <el-option label="最新发布" value="newest" />
                <el-option label="难度等级" value="difficulty" />
                <el-option label="完成人数" value="popularity" />
              </el-select>
            </div>
          </div>
          
          <!-- 题目网格 -->
          <div class="questions-grid">
            <div 
              v-for="question in paginatedQuestions" 
              :key="question.id"
              class="question-card"
              @click="handleQuestionClick(question)"
            >
              <div class="question-header">
                <div class="question-type">
                  <el-tag :type="getQuestionTypeColor(question.type)" size="small">
                    {{ getQuestionTypeName(question.type) }}
                  </el-tag>
                </div>
                <div class="difficulty-badge">
                  <el-tag 
                    :type="getDifficultyColor(question.difficulty)" 
                    size="small"
                  >
                    {{ getDifficultyName(question.difficulty) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="question-content">
                <h3 class="question-title">{{ question.title }}</h3>
                <p class="question-description">{{ question.description }}</p>
              </div>
              
              <div class="question-meta">
                <div class="meta-item">
                  <el-icon><Clock /></el-icon>
                  <span>{{ question.estimatedTime }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ question.completedCount }} 人完成</span>
                </div>
                <div class="meta-item" v-if="question.completed">
                  <el-icon class="completed-icon"><Select /></el-icon>
                  <span>已完成</span>
                </div>
              </div>
              
              <div class="question-actions">
                <el-button 
                  type="primary"
                  size="small"
                  @click.stop="handleStartQuestion(question)"
                >
                  开始答题
                </el-button>
                <el-button 
                  size="small"
                  @click.stop="handleViewAnalysis(question)"
                >
                  查看解析
                </el-button>
              </div>
            </div>
          </div>
          
          <!-- 分页 -->
          <div class="pagination-section" v-if="totalPages > 1">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="filteredQuestions.length"
              layout="prev, pager, next, jumper"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 页脚 -->
    <div class="page-footer">
      <PageFooterComponent />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { Search, Clock, User, Select } from '@element-plus/icons-vue'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'

// Store 和 Router
const store = useStore()
const router = useRouter()

// 响应式数据
const searchKeyword = ref('')
const selectedCategory = ref('all')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = ref(12)

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode)

// 模拟题目数据
const questions = ref([
  {
    id: 1,
    title: 'Python基础语法练习',
    description: '涵盖Python基本语法、数据类型、控制结构等基础知识点',
    type: 'multiple_choice',
    category: 'programming',
    difficulty: 'easy',
    estimatedTime: '15分钟',
    completedCount: 1245,
    completed: true
  },
  {
    id: 2,
    title: '数据结构算法分析',
    description: '深入理解常见数据结构的时间复杂度和空间复杂度分析',
    type: 'coding',
    category: 'theory',
    difficulty: 'hard',
    estimatedTime: '45分钟',
    completedCount: 567,
    completed: false
  },
  {
    id: 3,
    title: '机器学习模型评估',
    description: '学习如何评估和比较不同机器学习模型的性能',
    type: 'essay',
    category: 'analysis',
    difficulty: 'medium',
    estimatedTime: '30分钟',
    completedCount: 892,
    completed: false
  },
  {
    id: 4,
    title: '系统架构设计题',
    description: '设计一个高可用、高并发的分布式系统架构',
    type: 'design',
    category: 'design',
    difficulty: 'hard',
    estimatedTime: '60分钟',
    completedCount: 234,
    completed: false
  },
  {
    id: 5,
    title: 'SQL查询优化',
    description: '学习如何编写高效的SQL查询语句和索引优化',
    type: 'coding',
    category: 'programming',
    difficulty: 'medium',
    estimatedTime: '25分钟',
    completedCount: 756,
    completed: true
  },
  {
    id: 6,
    title: '计算机网络原理',
    description: '深入理解TCP/IP协议栈和网络通信原理',
    type: 'multiple_choice',
    category: 'theory',
    difficulty: 'medium',
    estimatedTime: '20分钟',
    completedCount: 1134,
    completed: false
  },
  {
    id: 7,
    title: '二分查找算法实现',
    description: '使用递归和迭代两种方式实现二分查找算法，要求时间复杂度O(log n)',
    type: 'coding',
    category: 'programming',
    difficulty: 'easy',
    estimatedTime: '20分钟',
    completedCount: 892,
    completed: false
  },
  {
    id: 8,
    title: '链表反转问题',
    description: '给定一个单链表，请实现链表的反转功能，要求空间复杂度O(1)',
    type: 'coding',
    category: 'programming',
    difficulty: 'medium',
    estimatedTime: '30分钟',
    completedCount: 567,
    completed: true
  },
  {
    id: 9,
    title: '动态规划-最长公共子序列',
    description: '使用动态规划求解两个字符串的最长公共子序列长度',
    type: 'coding',
    category: 'programming',
    difficulty: 'hard',
    estimatedTime: '45分钟',
    completedCount: 234,
    completed: false
  }
])

// 筛选后的题目
const filteredQuestions = computed(() => {
  let filtered = questions.value

  // 分类筛选
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(q => q.category === selectedCategory.value)
  }

  // 搜索筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(q => 
      q.title.toLowerCase().includes(keyword) ||
      q.description.toLowerCase().includes(keyword)
    )
  }

  // 排序
  if (sortBy.value === 'difficulty') {
    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 }
    filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
  } else if (sortBy.value === 'popularity') {
    filtered.sort((a, b) => b.completedCount - a.completedCount)
  } else {
    filtered.sort((a, b) => b.id - a.id) // 最新发布
  }

  return filtered
})

// 分页后的题目
const paginatedQuestions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredQuestions.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredQuestions.value.length / pageSize.value)
})

// 方法
const handleCategoryChange = (category) => {
  selectedCategory.value = category
  currentPage.value = 1
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleSort = () => {
  currentPage.value = 1
}

const handlePageChange = (page) => {
  currentPage.value = page
}

const handleQuestionClick = (question) => {
  // 根据题目类型跳转到不同页面
  if (question.type === 'coding') {
    // 编程题跳转到ExerciseSolve页面
    router.push(`/exercise/${question.id}`)
  } else {
    // 其他题型跳转到通用题目详情页
    router.push(`/question/${question.id}`)
  }
}

const handleStartQuestion = (question) => {
  // 开始答题按钮处理
  if (question.type === 'coding') {
    // 编程题跳转到ExerciseSolve页面
    router.push(`/exercise/${question.id}`)
  } else {
    // 其他题型跳转到对应答题页面
    router.push(`/question/${question.id}/solve`)
  }
}

const handleViewAnalysis = (question) => {
  // 查看解析按钮处理
  router.push(`/question/${question.id}/analysis`)
}

// 工具方法
const getQuestionTypeName = (type) => {
  const typeMap = {
    'multiple_choice': '选择题',
    'coding': '编程题',
    'essay': '问答题',
    'design': '设计题'
  }
  return typeMap[type] || type
}

const getQuestionTypeColor = (type) => {
  const colorMap = {
    'multiple_choice': 'success',
    'coding': 'primary',
    'essay': 'warning',
    'design': 'info'
  }
  return colorMap[type] || ''
}

const getDifficultyName = (difficulty) => {
  const nameMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return nameMap[difficulty] || difficulty
}

const getDifficultyColor = (difficulty) => {
  const colorMap = {
    'easy': 'success',
    'medium': 'warning',
    'hard': 'danger'
  }
  return colorMap[difficulty] || ''
}

// 生命周期
onMounted(() => {
  // 页面初始化逻辑
})
</script>

<style scoped>
/* --- 整体布局 --- */
.question-bank-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  color: #333333;
}

.theme-dark .question-bank-view {
  background: #1f1f1f;
  color: #e5e5e5;
}

.main-content {
  flex: 1;
  padding-top: 80px; /* 为导航栏留出空间 */
}

/* --- 页面头部 --- */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 0;
  margin-top: -80px;
  padding-top: 120px;
}

.theme-dark .page-header {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
}

.page-title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  margin: 0 0 16px 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: clamp(16px, 3vw, 18px);
  margin: 0;
  opacity: 0.9;
  line-height: 1.5;
}

/* --- 筛选区域 --- */
.filter-section {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 32px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.theme-dark .filter-section {
  background: #2a2a2a;
  border-bottom: 1px solid #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.filter-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
}

.category-filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.category-filters .el-button {
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 2px solid #e0e0e0;
}

.category-filters .el-button:not(.el-button--primary):hover {
  border-color: #1890ff;
  color: #1890ff;
  background: #f0f8ff;
}

.theme-dark .category-filters .el-button {
  border-color: #404040;
  background: #3a3a3a;
  color: #e5e5e5;
}

.theme-dark .category-filters .el-button:not(.el-button--primary):hover {
  border-color: #1890ff;
  color: #1890ff;
  background: #1a2332;
}

.search-box {
  min-width: 320px;
}

.search-box .el-input {
  border-radius: 20px;
}

.search-box .el-input__wrapper {
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.search-box .el-input__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-dark .search-box .el-input__wrapper {
  background: #3a3a3a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.theme-dark .search-box .el-input__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* --- 题目列表区域 --- */
.question-list-section {
  padding: 32px 0;
  flex: 1;
}

.list-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* --- 统计栏 --- */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.theme-dark .stats-bar {
  border-bottom: 1px solid #3a3a3a;
}

.stats-text {
  font-size: 14px;
  color: #666666;
}

.theme-dark .stats-text {
  color: #b0b0b0;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 14px;
  color: #666666;
}

.theme-dark .sort-label {
  color: #b0b0b0;
}

/* --- 题目网格 --- */
.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.question-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.question-card:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  transform: translateY(-2px);
}

.theme-dark .question-card {
  background: #2a2a2a;
  border: 1px solid #404040;
}

.theme-dark .question-card:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25);
}

/* --- 题目卡片内容 --- */
.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-content {
  margin-bottom: 16px;
}

.question-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1a1a1a;
  line-height: 1.4;
}

.theme-dark .question-title {
  color: #ffffff;
}

.question-description {
  font-size: 14px;
  color: #666666;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-dark .question-description {
  color: #b0b0b0;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666666;
}

.theme-dark .meta-item {
  color: #b0b0b0;
}

.completed-icon {
  color: #52c41a !important;
}

.question-actions {
  display: flex;
  gap: 8px;
}

/* --- 分页 --- */
.pagination-section {
  display: flex;
  justify-content: center;
  padding-top: 32px;
}

/* --- 响应式设计 --- */
@media (max-width: 768px) {
  .filter-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    padding: 0 20px;
  }
  
  .search-box {
    min-width: unset;
    width: 100%;
  }
  
  .category-filters {
    justify-content: center;
    gap: 12px;
  }
  
  .category-filters .el-button {
    min-width: 80px;
    padding: 6px 16px;
  }
  
  .questions-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stats-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .question-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .question-actions {
    width: 100%;
  }
  
  .question-actions .el-button {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding-top: 70px;
  }
  
  .page-header {
    padding: 40px 0;
  }
  
  .header-content,
  .filter-content,
  .list-content {
    padding: 0 16px;
  }
  
  .question-card {
    padding: 16px;
  }
  
  .category-filters {
    gap: 8px;
  }
  
  .category-filters .el-button {
    flex: 1;
    font-size: 12px;
  }
}

/* --- 页脚样式 --- */
.page-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  min-height: 400px;
  margin: 0;
  box-sizing: border-box;
  color: #ffffff;
  transition: all 0.3s ease;
  background-color: #252525;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
}
</style>