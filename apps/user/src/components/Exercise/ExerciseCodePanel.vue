<template>
  <div class="code-panel" :class="{ 'theme-dark': isDarkMode }">
    <!-- 代码编辑器区域 -->
    <div class="code-editor-section">
      <div class="panel-header">
        <h3 class="panel-title">
          <el-icon><EditPen /></el-icon>
          代码编辑器
        </h3>
        <div class="panel-actions">
          <el-select 
            v-model="selectedLanguage" 
            size="small" 
            style="width: 120px; margin-right: 12px;"
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
      <div class="editor-container">
        <textarea
          v-model="userCode"
          class="code-textarea"
          :placeholder="getCodePlaceholder()"
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <!-- 运行结果区域 -->
    <div class="result-section">
      <div class="panel-header">
        <h3 class="panel-title">
          <el-icon><Monitor /></el-icon>
          运行结果
        </h3>
        <div class="panel-actions">
          <el-button 
            type="primary" 
            size="small" 
            @click="handleRunCode" 
            :loading="running"
          >
            <el-icon><CaretRight /></el-icon>
            运行代码
          </el-button>
          <el-button 
            type="success" 
            size="small" 
            @click="handleSubmitSolution" 
            :loading="submitting"
          >
            <el-icon><Check /></el-icon>
            提交解答
          </el-button>
          <el-button 
            type="default" 
            size="small" 
            @click="handleResetCode"
          >
            <el-icon><Refresh /></el-icon>
            重置代码
          </el-button>
        </div>
      </div>
      <div class="result-content">
        <el-tabs v-model="activeResultTab" class="result-tabs">
          <el-tab-pane label="运行输出" name="output">
            <div class="output-container">
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
          </el-tab-pane>
          
          <el-tab-pane label="测试结果" name="test" :disabled="!submissionResult">
            <div class="test-container">
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
          </el-tab-pane>
        </el-tabs>
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
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.theme-dark .code-panel {
  background: #2a2a2a;
  border-color: #404040;
}

/* --- 代码编辑器区域 --- */
.code-editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
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
}

.fullscreen-btn {
  color: #666666;
  font-size: 16px;
  padding: 8px;
}

.theme-dark .fullscreen-btn {
  color: #b0b0b0;
}

.editor-container {
  flex: 1;
  min-height: 0;
  position: relative;
  padding: 0;
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
  background: #fafafa;
  color: #333333;
  resize: none;
  white-space: pre;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.theme-dark .code-textarea {
  background: #1e1e1e;
  color: #e0e0e0;
}

/* --- 运行结果区域 --- */
.result-section {
  height: 300px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #f0f0f0;
}

.theme-dark .result-section {
  border-top-color: #404040;
}

.result-content {
  flex: 1;
  min-height: 0;
}

.result-tabs {
  height: 100%;
}

.result-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  padding: 0;
}

.result-tabs :deep(.el-tab-pane) {
  height: 100%;
}

/* --- 输出容器样式 --- */
.output-container,
.test-container {
  height: 100%;
  padding: 16px;
  overflow-y: auto;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999999;
}

.empty-icon,
.loading-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
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
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-x: auto;
}

.error-text {
  background: #fdf2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.theme-dark .output-text {
  background: #333333;
  border-color: #404040;
  color: #e0e0e0;
}

.theme-dark .error-text {
  background: #3a2a2a;
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
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.theme-dark .test-summary {
  background: #333333;
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



.test-case {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.test-case.passed {
  border-color: #10b981;
}

.test-case.failed {
  border-color: #ef4444;
}

.theme-dark .test-case {
  border-color: #404040;
}

.theme-dark .test-case.passed {
  border-color: #059669;
}

.theme-dark .test-case.failed {
  border-color: #dc2626;
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
</style>