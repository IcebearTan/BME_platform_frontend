<template>
  <div class="code-panel" :class="{ 'theme-dark': isDarkMode }">
    <!-- 代码编辑器容器 -->
    <div class="code-editor-container">
      <div class="panel-header">
        <h3 class="panel-title">
          <el-icon><EditPen /></el-icon>
          代码编辑器
        </h3>
        <div class="panel-actions">
          <el-select 
            v-model="selectedLanguage" 
            size="small" 
            style="width: 120px;"
            @change="handleLanguageChange"
          >
            <el-option 
              v-for="lang in supportedLanguages" 
              :key="lang.value" 
              :label="lang.label" 
              :value="lang.value"
            />
          </el-select>
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
      <div class="editor-content">
        <textarea
          v-model="userCode"
          class="code-textarea"
          :placeholder="getCodePlaceholder()"
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <!-- 运行结果容器 -->
    <div class="result-container">
      <div class="panel-header">
        <h3 class="panel-title">
          <el-icon><Monitor /></el-icon>
          运行与测试
        </h3>
        <div class="panel-actions">
          <el-button 
            type="primary" 
            size="small" 
            @click="handleRunCode" 
            :loading="running"
            class="action-btn"
          >
            <el-icon><CaretRight /></el-icon>
            运行
          </el-button>
          <el-button 
            type="success" 
            size="small" 
            @click="handleSubmitSolution" 
            :loading="submitting"
            class="action-btn"
          >
            <el-icon><Check /></el-icon>
            提交
          </el-button>
          <el-button 
            type="default" 
            size="small" 
            @click="handleResetCode"
            class="action-btn"
          >
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
      <div class="result-content">
        <div class="result-tabs-header">
          <div class="tabs">
            <button
              :class="['tab-btn', { active: activeResultTab === 'output' }]"
              @click="activeResultTab = 'output'"
            >
              运行输出
            </button>
            <button
              :class="['tab-btn', { active: activeResultTab === 'test' }]"
              @click="activeResultTab = 'test'"
              :disabled="!submissionResult"
            >
              测试结果
            </button>
            <button
              :class="['tab-btn', { active: activeResultTab === 'history' }]"
              @click="activeResultTab = 'history'"
            >
              提交记录
            </button>
          </div>
        </div>

        <div class="result-tabs-body">
          <div v-show="activeResultTab === 'output'" class="output-container">
            <div v-if="!executionResult.output && !running" class="empty-state">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <p>点击"运行代码"查看输出结果</p>
            </div>
            <div v-else-if="running" class="loading-state">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <p>代码执行中...</p>
            </div>
            <div v-else class="output-content">
              <div v-if="executionResult.success" class="success-output">
                <div class="output-section">
                  <h5>执行输出：</h5>
                  <pre class="output-text">{{ executionResult.output }}</pre>
                </div>
                <div class="execution-info">
                  <el-tag size="small" type="success">执行成功</el-tag>
                  <el-tag size="small" v-if="executionResult.executionTime">
                    执行时间: {{ executionResult.executionTime }}ms
                  </el-tag>
                  <el-tag size="small" v-if="executionResult.memoryUsage">
                    内存使用: {{ executionResult.memoryUsage }}MB
                  </el-tag>
                </div>
              </div>
              <div v-else class="error-output">
                <div class="output-section">
                  <h5>执行错误：</h5>
                  <pre class="error-text">{{ executionResult.error }}</pre>
                </div>
                <el-tag size="small" type="danger">执行失败</el-tag>
              </div>
            </div>
          </div>

          <div v-show="activeResultTab === 'test'" class="test-container">
            <div v-if="!submissionResult && !submitting" class="empty-state">
              <el-icon class="empty-icon"><DocumentChecked /></el-icon>
              <p>点击"提交解答"查看测试结果</p>
            </div>
            <div v-else-if="submitting" class="loading-state">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <p>测试中...</p>
            </div>
            <div v-else class="test-content">
              <div class="test-summary">
                <div class="summary-header">
                  <el-tag
                    :type="submissionResult.passed ? 'success' : 'danger'"
                    size="large"
                  >
                    {{ submissionResult.passed ? '通过' : '未通过' }}
                  </el-tag>
                  <span class="test-stats">
                    {{ submissionResult.passedTests }}/{{ submissionResult.totalTests }} 测试用例通过
                  </span>
                </div>
                <div class="performance-stats" v-if="submissionResult.passed">
                  <el-tag size="small">
                    执行时间: {{ submissionResult.executionTime }}ms
                  </el-tag>
                  <el-tag size="small">
                    内存使用: {{ submissionResult.memoryUsage }}MB
                  </el-tag>
                  <el-tag size="small">
                    超过 {{ submissionResult.betterThan }}% 的提交
                  </el-tag>
                </div>
              </div>

              <div class="test-cases" v-if="submissionResult.testCases">
                <div
                  v-for="(testCase, index) in submissionResult.testCases"
                  :key="index"
                  class="test-case"
                  :class="{ 'passed': testCase.passed, 'failed': !testCase.passed }"
                >
                  <div class="test-case-header">
                    <span class="test-case-title">测试用例 {{ index + 1 }}</span>
                    <el-tag
                      :type="testCase.passed ? 'success' : 'danger'"
                      size="small"
                    >
                      {{ testCase.passed ? '通过' : '失败' }}
                    </el-tag>
                  </div>
                  <div class="test-case-content" v-if="!testCase.passed || testCase.showDetails">
                    <div class="test-input">
                      <strong>输入:</strong>
                      <code>{{ testCase.input }}</code>
                    </div>
                    <div class="expected-output">
                      <strong>期望输出:</strong>
                      <code>{{ testCase.expected }}</code>
                    </div>
                    <div class="actual-output" v-if="!testCase.passed">
                      <strong>实际输出:</strong>
                      <code>{{ testCase.actual }}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="activeResultTab === 'history'" class="history-container">
            <div v-if="submissionHistory.length === 0" class="empty-state">
              <el-icon class="empty-icon"><DocumentChecked /></el-icon>
              <p>暂无提交记录，提交后会在此处显示历史记录</p>
            </div>
            <div v-else class="history-list">
              <div
                v-for="(item, idx) in submissionHistory"
                :key="item.id || idx"
                :class="['submission-item', item.passed ? 'passed' : 'failed']"
              >
                <div class="submission-header">
                  <div class="submission-meta">
                    <span class="submission-time">{{ formatTime(item.time) }}</span>
                    <el-tag :type="item.passed ? 'success' : 'danger'" size="small">
                      {{ item.passed ? '通过' : '未通过' }}
                    </el-tag>
                    <span class="submission-stats">{{ item.passedTests }}/{{ item.totalTests }} 测试通过</span>
                  </div>
                  <div class="submission-actions">
                    <el-button type="text" size="small" @click="toggleHistoryItem(idx)">详情</el-button>
                  </div>
                </div>
                <div v-if="item.show" class="submission-body">
                  <div class="submission-code">
                    <strong>语言：</strong> {{ item.language }}
                  </div>
                  <div class="submission-details">
                    <div><strong>执行时间：</strong> {{ item.executionTime }}ms</div>
                    <div><strong>内存：</strong> {{ item.memoryUsage }}MB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { 
  EditPen, 
  FullScreen, 
  Monitor, 
  CaretRight, 
  Check, 
  Refresh, 
  Loading, 
  DocumentChecked 
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  exerciseData: {
    type: Object,
    required: true,
    default: () => ({})
  },
  initialCode: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['code-change', 'language-change', 'toggle-fullscreen', 'run-code', 'submit-solution', 'reset-code'])

// Store
const store = useStore()

// 响应式数据
const userCode = ref('')
const selectedLanguage = ref('python')
const activeResultTab = ref('output')
const running = ref(false)
const submitting = ref(false)
const executionResult = ref({})
const submissionResult = ref(null)
const submissionHistory = ref([
  {
    id: 's_sample_1',
    time: Date.now() - 1000 * 60 * 60,
    passed: true,
    passedTests: 10,
    totalTests: 10,
    executionTime: 75,
    memoryUsage: 10.5,
    language: 'python',
    show: false
  },
  {
    id: 's_sample_2',
    time: Date.now() - 1000 * 60 * 60 * 24,
    passed: false,
    passedTests: 3,
    totalTests: 10,
    executionTime: 120,
    memoryUsage: 15.2,
    language: 'java',
    show: false
  }
])

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode)

// 支持的编程语言
const supportedLanguages = [
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C', value: 'c' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' }
]

// 语言模板代码
const languageTemplates = {
  python: `def solution():
    # 在这里编写你的代码
    pass

# 测试代码
if __name__ == "__main__":
    result = solution()
    print(result)`,
  javascript: `function solution() {
    // 在这里编写你的代码
}

// 测试代码
console.log(solution());`,
  java: `public class Solution {
    public static void main(String[] args) {
        Solution solution = new Solution();
        // 测试代码
    }
    
    public void solution() {
        // 在这里编写你的代码
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // 在这里编写你的代码
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // 在这里编写你的代码
    return 0;
}`,
  go: `package main

import "fmt"

func main() {
    // 在这里编写你的代码
}`,
  rust: `fn main() {
    // 在这里编写你的代码
}`
}

// 方法
const initializeCode = () => {
  // 初始化代码
  userCode.value = props.initialCode || languageTemplates[selectedLanguage.value] || ''
}

const getCodePlaceholder = () => {
  return `请在此处编写 ${getLanguageName(selectedLanguage.value)} 代码...`
}

const getLanguageName = (lang) => {
  const langMap = {
    python: 'Python',
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust'
  }
  return langMap[lang] || 'Python'
}

const handleLanguageChange = (language) => {
  selectedLanguage.value = language
  
  // 如果当前代码为空或为默认模板，则更新为新语言的模板
  const currentCode = userCode.value.trim()
  if (!currentCode || Object.values(languageTemplates).some(template => 
    template.trim() === currentCode
  )) {
    userCode.value = languageTemplates[language] || ''
  }
  
  emit('language-change', language)
}

// 监听代码变化
watch(userCode, (newCode) => {
  emit('code-change', newCode)
})

const toggleFullscreen = () => {
  emit('toggle-fullscreen', 'editor')
}

const handleRunCode = () => {
  const code = userCode.value || ''
  running.value = true
  activeResultTab.value = 'output'
  
  // 模拟代码执行
  setTimeout(() => {
    executionResult.value = {
      success: true,
      output: "Hello, World!\n执行完成",
      executionTime: 125,
      memoryUsage: 8.5
    }
    running.value = false
  }, 1500)
  
  emit('run-code', { code, language: selectedLanguage.value })
}

const handleSubmitSolution = () => {
  const code = userCode.value || ''
  submitting.value = true
  activeResultTab.value = 'test'
  
  // 模拟提交测试
  setTimeout(() => {
    submissionResult.value = {
      passed: true,
      passedTests: 15,
      totalTests: 15,
      executionTime: 89,
      memoryUsage: 12.3,
      betterThan: 85,
      testCases: [
        {
          passed: true,
          input: "[1,2,3,4,5]",
          expected: "15",
          actual: "15"
        },
        {
          passed: true,
          input: "[0,-1,2,3]", 
          expected: "4",
          actual: "4"
        }
      ]
    }
    submitting.value = false
    // push to history
    submissionHistory.value.unshift({
      time: Date.now(),
      passed: submissionResult.value.passed,
      passedTests: submissionResult.value.passedTests,
      totalTests: submissionResult.value.totalTests,
      executionTime: submissionResult.value.executionTime,
      memoryUsage: submissionResult.value.memoryUsage,
      language: selectedLanguage.value,
      id: `s_${Date.now()}`
    })
  }, 2000)
  
  emit('submit-solution', { code, language: selectedLanguage.value })
}

const handleResetCode = () => {
  userCode.value = languageTemplates[selectedLanguage.value] || ''
  executionResult.value = {}
  submissionResult.value = null
  activeResultTab.value = 'output'
  
  emit('reset-code')
}

// 生命周期
onMounted(() => {
  initializeCode()
})

const formatTime = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

const toggleHistoryItem = (idx) => {
  if (submissionHistory.value[idx]) {
    submissionHistory.value[idx].show = !submissionHistory.value[idx].show
    // force reactivity for nested property
    submissionHistory.value = submissionHistory.value.slice()
  }
}

// 暴露方法给父组件
defineExpose({
  getCode: () => userCode.value || '',
  setCode: (code) => userCode.value = code || '',
  getLanguage: () => selectedLanguage.value,
  setLanguage: (language) => handleLanguageChange(language)
})
</script>

<style scoped>
.code-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

/* --- 代码编辑器容器 --- */
.code-editor-container {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  min-height: 0;
}

.theme-dark .code-editor-container {
  background: #2a2a2a;
  border-color: #404040;
}

/* --- 运行结果容器 --- */
.result-container {
  flex: 1 1 0%; /* 与 code-editor-container 一样分配剩余高度，使两者等高 */
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  min-height: 0; /* 允许子元素收缩以适应 flex 布局 */
}

.theme-dark .result-container {
  background: #2a2a2a;
  border-color: #404040;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  min-height: 48px;
}

.theme-dark .panel-header {
  background: #333333;
  border-bottom-color: #404040;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .panel-title {
  color: #ffffff;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-actions .el-button {
  font-size: 13px;
  font-weight: 500;
  height: 28px;
  padding: 0 10px;
}

.panel-actions .el-select {
  width: 110px;
}

.panel-actions .el-select :deep(.el-input__wrapper) {
  height: 28px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn .el-icon {
  font-size: 14px;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-dark .action-btn:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fullscreen-btn {
  color: #666666;
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
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

.editor-content {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
}

.code-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 16px;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #ffffff;
  color: #333333;
  resize: none;
  white-space: pre;
  word-wrap: break-word;
  overflow-wrap: break-word;
  tab-size: 2;
}

.code-textarea::placeholder {
  color: #999999;
  font-style: italic;
}

.theme-dark .code-textarea {
  background: #1e1e1e;
  color: #e0e0e0;
}

.theme-dark .code-textarea::placeholder {
  color: #666666;
}

.result-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.result-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 16px 20px 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  min-height: 56px;
  flex-shrink: 0;
}

.result-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
  margin-bottom: 0;
}

.result-tabs :deep(.el-tabs__nav) {
  border: none;
  display: flex;
  gap: 4px;
}

.result-tabs :deep(.el-tabs__item) {
  color: #666666;
  font-weight: 500;
  font-size: 13px;
  height: 32px;
  line-height: 32px;
  padding: 0 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-right: 0;
  background: #ffffff;
}

.result-tabs :deep(.el-tabs__item:hover) {
  color: #409EFF;
  border-color: #409EFF;
  background: #ffffff;
}

.result-tabs :deep(.el-tabs__item.is-active) {
  color: #ffffff;
  background: #409EFF;
  border-color: #409EFF;
}

.result-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.result-tabs :deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  min-height: 0;
}

.result-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.theme-dark .result-tabs :deep(.el-tabs__header) {
  background: #333333;
  border-bottom-color: #404040;
}

.theme-dark .result-tabs :deep(.el-tabs__item) {
  color: #b0b0b0;
  border-color: #404040;
  background: #2a2a2a;
}

.theme-dark .result-tabs :deep(.el-tabs__item:hover) {
  color: #409EFF;
  border-color: #409EFF;
  background: #2a2a2a;
}

.theme-dark .result-tabs :deep(.el-tabs__item.is-active) {
  color: #ffffff;
  background: #409EFF;
  border-color: #409EFF;
}

/* --- 输出容器样式 --- */
.output-container,
.test-container {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: #ffffff;
}

.theme-dark .output-container,
.theme-dark .test-container {
  background: #2a2a2a;
}

/* --- 自定义切换栏样式 --- */
.result-tabs-header {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: transparent;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  transform: translateY(-1px);
  border-color: #cbdffd;
}

.tab-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.tab-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.result-tabs-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-tabs-body > .output-container,
.result-tabs-body > .test-container {
  flex: 1;
  min-height: 0;
}

.theme-dark .result-tabs-header {
  border-bottom-color: #404040;
}


.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100% - 40px);
  color: #999999;
  background: #ffffff;
  border-radius: 8px;
  margin: 0;
}

.theme-dark .empty-state,
.theme-dark .loading-state {
  background: #1e1e1e;
  color: #666666;
}

.empty-icon,
.loading-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p,
.loading-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* --- 输出内容样式 --- */
.output-content {
  height: 100%;
}

.output-section h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #666666;
}

.theme-dark .output-section h5 {
  color: #b0b0b0;
}

.output-text,
.error-text {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.error-text {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.theme-dark .output-text {
  background: #1e1e1e;
  border-color: #404040;
  color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.theme-dark .error-text {
  background: #2a1e1e;
  border-color: #5a3a3a;
  color: #f87171;
}

.execution-info {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- 测试结果样式 --- */
.test-summary {
  margin-bottom: 20px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.theme-dark .test-summary {
  background: #1e1e1e;
  border-color: #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.test-stats {
  font-size: 14px;
  color: #666666;
}

.theme-dark .test-stats {
  color: #b0b0b0;
}

.performance-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- 测试用例样式 --- */
.test-cases {
  margin-top: 20px;
}

.test-case {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.test-case:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-case.passed {
  border-color: #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.test-case.failed {
  border-color: #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.theme-dark .test-case {
  border-color: #404040;
  background: #1e1e1e;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.theme-dark .test-case:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.theme-dark .test-case.passed {
  border-color: #059669;
  background: linear-gradient(135deg, #1e1e1e 0%, #1a2e1a 100%);
}

.theme-dark .test-case.failed {
  border-color: #dc2626;
  background: linear-gradient(135deg, #1e1e1e 0%, #2e1a1a 100%);
}

.test-case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
}

.theme-dark .test-case-header {
  background: #3a3a3a;
}

.test-case-title {
  font-weight: 600;
  font-size: 13px;
}

.test-case-content {
  padding: 16px;
}

.test-input,
.expected-output,
.actual-output {
  margin-bottom: 8px;
  font-size: 13px;
}

.test-input code,
.expected-output code,
.actual-output code {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

.theme-dark .test-input code,
.theme-dark .expected-output code,
.theme-dark .actual-output code {
  background: #2a2a2a;
  color: #e0e0e0;
}

/* --- 滚动条样式 --- */
.output-container::-webkit-scrollbar,
.test-container::-webkit-scrollbar {
  width: 6px;
}

.output-container::-webkit-scrollbar-track,
.test-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.output-container::-webkit-scrollbar-thumb,
.test-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.theme-dark .output-container::-webkit-scrollbar-track,
.theme-dark .test-container::-webkit-scrollbar-track {
  background: #3a3a3a;
}

.theme-dark .output-container::-webkit-scrollbar-thumb,
.theme-dark .test-container::-webkit-scrollbar-thumb {
  background: #5a5a5a;
}

/* --- 提交记录样式 --- */
.history-container {
  padding: 12px;
  overflow-y: auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-item {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
.submission-item {
  position: relative;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(16,24,40,0.03);
  transition: box-shadow 0.15s ease, transform 0.12s ease;
  overflow: hidden;
}

.submission-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(16,24,40,0.06);
}

/* left color stripe to indicate pass/fail */
.submission-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: transparent;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.submission-item.passed::before {
  background: #10b981; /* green */
}

.submission-item.failed::before {
  background: #ef4444; /* red */
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submission-time {
  color: #7a7a7a;
  font-size: 12px;
  font-weight: 500;
  min-width: 140px;
}

.submission-stats {
  font-size: 13px;
  color: #2b2b2b;
  font-weight: 600;
}

.submission-meta .el-tag {
  font-size: 12px;
  padding: 2px 6px;
}

.submission-code {
  margin-bottom: 8px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  background: #f3f4f6;
  padding: 6px 8px;
  border-radius: 6px;
  color: #111827;
  display: inline-block;
}

.submission-details {
  margin-top: 8px;
  font-size: 13px;
  color: #555555;
}

.theme-dark .submission-item {
  background: #0f1113;
  border-color: rgba(255,255,255,0.04);
  box-shadow: none;
}

.theme-dark .submission-code {
  background: rgba(255,255,255,0.03);
  color: #e6eef8;
}

.theme-dark .submission-body {
  border-top-color: rgba(255,255,255,0.04);
  color: #dcdcdc;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.submission-time {
  color: #666;
  font-size: 13px;
}

.submission-details {
  margin-top: 8px;
  font-size: 13px;
}

.theme-dark .submission-item {
  background: #1e1e1e;
  border-color: #404040;
}
</style>