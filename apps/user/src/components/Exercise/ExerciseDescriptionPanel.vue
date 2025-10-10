<template>
  <div class="description-panel" :class="{ 'theme-dark': isDarkMode }">
    <!-- 标签页头部 -->
    <div class="panel-header">
      <el-tabs v-model="activeTab" class="panel-tabs">
        <el-tab-pane label="题目描述" name="description">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              题目描述
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="题解" name="solution">
          <template #label>
            <span class="tab-label">
              <el-icon><Key /></el-icon>
              题解
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
      <div class="panel-actions">
        <el-button 
          type="text" 
          size="small" 
          @click="toggleFullscreen"
          class="fullscreen-btn"
        >
          <el-icon><FullScreen /></el-icon>
        </el-button>
      </div>
    </div>
    
    <div class="panel-content">
      <!-- 题目描述内容 -->
      <div v-if="activeTab === 'description'" class="description-content">
        <!-- 题目标题和标签 -->
        <div class="content-header">
          <h1 class="content-title">{{ exerciseData.title || '二分查找' }}</h1>
          <div class="content-meta">
            <el-tag :type="getTypeTagType(exerciseData.type)" size="small">
              {{ getExerciseTypeText(exerciseData.type) }}
            </el-tag>
            <el-tag type="warning" size="small" v-if="exerciseData.score">
              {{ exerciseData.score }}分
            </el-tag>
            <el-tag :type="getDifficultyTagType(exerciseData.difficulty)" size="small">
              {{ getDifficultyText(exerciseData.difficulty) }}
            </el-tag>
          </div>
        </div>

        <!-- 题目内容 -->
        <div class="question-content">
        <div class="question-description">
          <h4>题目要求</h4>
          <div class="description-text" v-html="formatDescription(exerciseData.description)"></div>
        </div>
        
        <div class="question-examples" v-if="exerciseData.examples && exerciseData.examples.length > 0">
          <h4>示例</h4>
          <div 
            v-for="(example, index) in exerciseData.examples" 
            :key="index"
            class="example-item"
          >
            <div class="example-header">示例 {{ index + 1 }}</div>
            <div class="example-content">
              <div class="example-input">
                <strong>输入：</strong>
                <code>{{ example.input }}</code>
              </div>
              <div class="example-output">
                <strong>输出：</strong>
                <code>{{ example.output }}</code>
              </div>
              <div class="example-explanation" v-if="example.explanation">
                <strong>说明：</strong>
                <span>{{ example.explanation }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="question-constraints" v-if="exerciseData.constraints">
          <h4>约束条件</h4>
          <ul class="constraints-list">
            <li v-for="(constraint, index) in exerciseData.constraints" :key="index">
              {{ constraint }}
            </li>
          </ul>
        </div>
        
        <div class="question-hints" v-if="exerciseData.hints && showHints">
          <h4>提示</h4>
          <div class="hints-list">
            <div 
              v-for="(hint, index) in exerciseData.hints" 
              :key="index"
              class="hint-item"
            >
              <el-collapse>
                <el-collapse-item :title="`提示 ${index + 1}`" :name="`hint-${index}`">
                  <p>{{ hint }}</p>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- 题解内容 -->
      <div v-else-if="activeTab === 'solution'" class="solution-content">
        <!-- 题解标题和标签 -->
        <div class="content-header">
          <h1 class="content-title">二分查找 - 题解</h1>
          <div class="content-meta">
            <el-tag type="success" size="small">
              <el-icon><Key /></el-icon>
              官方题解
            </el-tag>
            <el-tag type="info" size="small">算法</el-tag>
            <el-tag type="warning" size="small">时间复杂度: O(log n)</el-tag>
          </div>
        </div>

        <div class="solution-sections">
          <div class="solution-section">
            <h3>解题思路</h3>
            <div class="solution-text">
              <p>这是一道经典的二分查找问题。二分查找是在有序数组中查找特定元素的高效算法。</p>
              <p><strong>核心思想：</strong></p>
            <ul>
              <li>每次比较中间元素与目标值</li>
              <li>如果中间元素等于目标值，直接返回索引</li>
              <li>如果中间元素大于目标值，在左半部分继续查找</li>
              <li>如果中间元素小于目标值，在右半部分继续查找</li>
              <li>重复上述过程直到找到目标或确定不存在</li>
            </ul>
          </div>
        </div>

        <div class="solution-section">
          <h3>算法步骤</h3>
          <ol class="solution-steps">
            <li>初始化左指针 left = 0，右指针 right = nums.length - 1</li>
            <li>当 left ≤ right 时，执行循环：
              <ul>
                <li>计算中间位置 mid = left + (right - left) / 2</li>
                <li>如果 nums[mid] == target，返回 mid</li>
                <li>如果 nums[mid] < target，left = mid + 1</li>
                <li>如果 nums[mid] > target，right = mid - 1</li>
              </ul>
            </li>
            <li>如果循环结束仍未找到，返回 -1</li>
          </ol>
        </div>

        <div class="solution-section">
          <h3>复杂度分析</h3>
          <div class="complexity-analysis">
            <div class="complexity-item">
              <strong>时间复杂度：</strong>O(log n)
              <p>每次查找都将搜索范围缩小一半</p>
            </div>
            <div class="complexity-item">
              <strong>空间复杂度：</strong>O(1)
              <p>只使用了常数个额外变量</p>
            </div>
          </div>
        </div>

        <div class="solution-section">
          <h3>参考代码</h3>
          <div class="solution-code">
            <el-tabs>
              <el-tab-pane label="Python" name="python">
                <pre><code>def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1</code></pre>
              </el-tab-pane>
              <el-tab-pane label="Java" name="java">
                <pre><code>public int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;
}</code></pre>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { FullScreen, Document, Key } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  exerciseData: {
    type: Object,
    required: true,
    default: () => ({})
  },
  showHints: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['toggle-fullscreen'])

// Store
const store = useStore()

// 响应式数据
const activeTab = ref('description')

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode)

// 方法
const toggleFullscreen = () => {
  emit('toggle-fullscreen', 'question')
}

const formatDescription = (description) => {
  if (!description) return ''
  return description.replace(/\n/g, '<br>')
}

const getExerciseTypeText = (type) => {
  const typeMap = {
    'algorithm': '算法题',
    'programming': '编程题',
    'data-structure': '数据结构',
    'system-design': '系统设计',
    'database': '数据库',
    'web': 'Web开发',
    'mobile': '移动开发'
  }
  return typeMap[type] || '编程题'
}

const getTypeTagType = (type) => {
  const typeColorMap = {
    'algorithm': 'primary',
    'programming': 'success',
    'data-structure': 'info',
    'system-design': 'warning',
    'database': 'danger',
    'web': 'primary',
    'mobile': 'success'
  }
  return typeColorMap[type] || 'primary'
}

const getDifficultyText = (difficulty) => {
  const difficultyMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return difficultyMap[difficulty] || '中等'
}

const getDifficultyTagType = (difficulty) => {
  const difficultyColorMap = {
    'easy': 'success',
    'medium': 'warning', 
    'hard': 'danger'
  }
  return difficultyColorMap[difficulty] || 'warning'
}
</script>

<style scoped>
.description-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.theme-dark .description-panel {
  background: #2a2a2a;
  border-color: #404040;
}

/* --- 面板头部 --- */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  min-height: 64px;
}

.theme-dark .panel-header {
  background: #333333;
  border-bottom-color: #404040;
}

.panel-tabs {
  flex: 1;
}

.panel-tabs .el-tabs__header {
  margin-bottom: 0;
}

.panel-tabs .el-tabs__nav-wrap {
  padding: 0;
}

.panel-actions {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.fullscreen-btn {
  color: #666666;
  font-size: 16px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.fullscreen-btn:hover {
  background-color: #f5f5f5;
  color: #409EFF;
}

.theme-dark .fullscreen-btn {
  color: #b0b0b0;
}

.theme-dark .fullscreen-btn:hover {
  background-color: #404040;
  color: #409EFF;
}

/* --- 面板内容 --- */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* --- 内容头部样式 --- */
.content-header {
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid #f5f5f5;
  margin-bottom: 20px;
}

.theme-dark .content-header {
  border-bottom-color: #404040;
}

.content-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
  line-height: 1.4;
}

.theme-dark .content-title {
  color: #ffffff;
}

.content-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.content-meta .el-tag {
  font-weight: 500;
  border-radius: 6px;
}

.content-meta .el-icon {
  font-size: 12px;
  margin-right: 4px;
}

/* --- 题目内容区域 --- */
.description-content .question-content {
  padding: 0 24px 24px 24px;
}

.question-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.theme-dark .question-content h4 {
  color: #ffffff;
  border-bottom-color: #404040;
}

.description-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
  margin-bottom: 24px;
}

.theme-dark .description-text {
  color: #e0e0e0;
}

/* --- 示例样式 --- */
.question-examples {
  margin-bottom: 24px;
}

.example-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.theme-dark .example-item {
  background: #333333;
  border-color: #404040;
}

.example-header {
  background: #e9ecef;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 13px;
  color: #495057;
}

.theme-dark .example-header {
  background: #404040;
  color: #e0e0e0;
}

.example-content {
  padding: 16px;
}

.example-input,
.example-output,
.example-explanation {
  margin-bottom: 8px;
  font-size: 13px;
}

.example-input code,
.example-output code {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

.theme-dark .example-input code,
.theme-dark .example-output code {
  background: #2a2a2a;
  color: #e0e0e0;
}

/* --- 约束条件样式 --- */
.question-constraints {
  margin-bottom: 24px;
}

.constraints-list {
  margin: 0;
  padding-left: 20px;
}

.constraints-list li {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 4px;
  color: #333333;
}

.theme-dark .constraints-list li {
  color: #e0e0e0;
}

/* --- 提示样式 --- */
.question-hints {
  margin-bottom: 24px;
}

.hints-list {
  margin-top: 12px;
}

.hint-item {
  margin-bottom: 8px;
}

/* --- 滚动条样式 --- */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.theme-dark .panel-content::-webkit-scrollbar-track {
  background: #3a3a3a;
}

.theme-dark .panel-content::-webkit-scrollbar-thumb {
  background: #5a5a5a;
}

.theme-dark .panel-content::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}

/* --- 题解内容样式 --- */
.solution-content {
  padding: 0;
}

.solution-sections {
  padding: 0 24px 24px 24px;
}

.solution-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f5f5f5;
}

.solution-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.theme-dark .solution-section {
  border-bottom-color: #404040;
}

.solution-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-dark .solution-section h3 {
  color: #ffffff;
}

.solution-text p {
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
  margin-bottom: 12px;
}

.theme-dark .solution-text p {
  color: #e0e0e0;
}

.solution-text ul,
.solution-steps {
  margin: 12px 0;
  padding-left: 20px;
}

.solution-text li,
.solution-steps li {
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
  margin-bottom: 8px;
}

.theme-dark .solution-text li,
.theme-dark .solution-steps li {
  color: #e0e0e0;
}

.solution-steps li ul {
  margin: 8px 0;
}

.complexity-analysis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 20px 0;
}

@media (max-width: 768px) {
  .complexity-analysis {
    grid-template-columns: 1fr;
  }
}

.complexity-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  border-left: 3px solid #409EFF;
}

.theme-dark .complexity-item {
  background: #333333;
  border-color: #404040;
  border-left-color: #409EFF;
}

.complexity-item strong {
  color: #495057;
  font-weight: 600;
}

.theme-dark .complexity-item strong {
  color: #ffffff;
}

.complexity-item p {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #666666;
}

.theme-dark .complexity-item p {
  color: #b0b0b0;
}

.solution-code {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.theme-dark .solution-code {
  background: #2a2a2a;
  border-color: #404040;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.solution-code pre {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  background: transparent;
  color: #333333;
}

.theme-dark .solution-code pre {
  color: #e0e0e0;
}

.solution-code code {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  padding: 0;
}

/* --- 标签页样式 --- */
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.tab-label .el-icon {
  font-size: 14px;
}

.panel-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.panel-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.panel-tabs :deep(.el-tabs__nav) {
  border: none;
}

.panel-tabs :deep(.el-tabs__item) {
  padding: 0 16px;
  height: 32px;
  line-height: 32px;
  border: none;
  color: #666666;
  font-weight: 500;
}

.panel-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 6px;
}

.theme-dark .panel-tabs :deep(.el-tabs__item) {
  color: #b0b0b0;
}

.theme-dark .panel-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.15);
}
</style>