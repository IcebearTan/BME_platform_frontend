<template>
  <div class="exercise-solve-view" :class="{ 'theme-dark': isDarkMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button 
        type="text" 
        class="back-button"
        @click="handleBackToPrevious"
      >
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </el-button>
      
      <div class="header-info">
        <h1 class="exercise-title">{{ exerciseData.title }}</h1>
        <div class="exercise-meta">
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
      
      <div class="header-actions">
        <el-button type="primary" @click="handleSubmitSolution" :loading="submitting">
          <el-icon><Check /></el-icon>
          提交解答
        </el-button>
        <el-button type="default" @click="handleResetCode">
          <el-icon><Refresh /></el-icon>
          重置代码
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 - 四象限布局 -->
    <div class="main-content">
      <!-- 左上：题目内容 -->
      <div class="quadrant question-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <el-icon><Document /></el-icon>
            题目描述
          </h3>
          <div class="panel-actions">
            <el-button 
              type="text" 
              size="small" 
              @click="toggleFullscreen('question')"
              class="fullscreen-btn"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="panel-content">
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
            
            <div class="question-hints" v-if="exerciseData.hints && exerciseData.hints.length > 0">
              <h4>提示</h4>
              <div class="hints-content">
                <el-collapse v-model="activeHints">
                  <el-collapse-item
                    v-for="(hint, index) in exerciseData.hints"
                    :key="index"
                    :title="`提示 ${index + 1}`"
                    :name="index"
                  >
                    <div class="hint-text">{{ hint }}</div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 左下：目标输出 -->
      <div class="quadrant target-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <el-icon><Aim /></el-icon>
            预期输出
          </h3>
          <div class="panel-actions">
            <el-button 
              type="text" 
              size="small" 
              @click="toggleFullscreen('target')"
              class="fullscreen-btn"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="panel-content">
          <div class="target-output-container">
            <div class="test-cases">
              <div 
                v-for="(testCase, index) in exerciseData.testCases" 
                :key="index"
                class="test-case-item"
                :class="{ 'active': activeTestCase === index }"
                @click="activeTestCase = index"
              >
                <div class="test-case-header">
                  <span class="test-case-title">测试用例 {{ index + 1 }}</span>
                  <el-icon v-if="testResults[index]" :class="getTestResultClass(testResults[index])">
                    <component :is="getTestResultIcon(testResults[index])" />
                  </el-icon>
                </div>
                <div class="test-case-content" v-if="activeTestCase === index">
                  <div class="test-input">
                    <label>输入：</label>
                    <pre class="input-text">{{ testCase.input }}</pre>
                  </div>
                  <div class="test-expected">
                    <label>预期输出：</label>
                    <pre class="output-text expected">{{ testCase.expectedOutput }}</pre>
                  </div>
                  <div class="test-actual" v-if="testResults[index]">
                    <label>实际输出：</label>
                    <pre class="output-text actual" :class="{ 'correct': testResults[index].passed }">{{ testResults[index].actualOutput }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右上：代码编辑器 -->
      <div class="quadrant code-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <el-icon><EditPen /></el-icon>
            代码编辑器
          </h3>
          <div class="panel-actions">
            <el-select 
              v-model="selectedLanguage" 
              size="small" 
              style="width: 120px; margin-right: 8px;"
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
              type="primary" 
              size="small" 
              @click="handleRunCode"
              :loading="running"
            >
              <el-icon><CaretRight /></el-icon>
              运行
            </el-button>
            <el-button 
              type="text" 
              size="small" 
              @click="toggleFullscreen('code')"
              class="fullscreen-btn"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="panel-content">
          <div class="code-editor-container">
            <!-- 这里未来会集成Monaco Editor或其他在线代码编辑器 -->
            <textarea
              v-model="userCode"
              class="code-textarea"
              :placeholder="getCodePlaceholder()"
              spellcheck="false"
            ></textarea>
            
            <!-- 代码编辑器工具栏 -->
            <div class="editor-toolbar">
              <div class="toolbar-left">
                <span class="code-stats">
                  行数: {{ getLineCount() }} | 字符: {{ userCode.length }}
                </span>
              </div>
              <div class="toolbar-right">
                <el-button type="text" size="small" @click="formatCode">
                  <el-icon><MagicStick /></el-icon>
                  格式化
                </el-button>
                <el-button type="text" size="small" @click="toggleWordWrap">
                  <el-icon><Switch /></el-icon>
                  {{ wordWrap ? '取消换行' : '自动换行' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下：运行输出 -->
      <div class="quadrant output-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <el-icon><Monitor /></el-icon>
            运行输出
          </h3>
          <div class="panel-actions">
            <el-button 
              type="text" 
              size="small" 
              @click="clearOutput"
            >
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
            <el-button 
              type="text" 
              size="small" 
              @click="toggleFullscreen('output')"
              class="fullscreen-btn"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="panel-content">
          <div class="output-container">
            <div class="output-tabs">
              <div 
                class="output-tab"
                :class="{ 'active': activeOutputTab === 'console' }"
                @click="activeOutputTab = 'console'"
              >
                <el-icon><Connection /></el-icon>
                控制台输出
              </div>
              <div 
                class="output-tab"
                :class="{ 'active': activeOutputTab === 'test' }"
                @click="activeOutputTab = 'test'"
              >
                <el-icon><CircleCheck /></el-icon>
                测试结果
              </div>
            </div>
            
            <div class="output-content">
              <!-- 控制台输出 -->
              <div v-if="activeOutputTab === 'console'" class="console-output">
                <div v-if="!consoleOutput && !running" class="empty-output">
                  <el-icon><Document /></el-icon>
                  <span>点击"运行"按钮执行代码</span>
                </div>
                <div v-else-if="running" class="running-output">
                  <el-icon class="loading"><Loading /></el-icon>
                  <span>代码运行中...</span>
                </div>
                <pre v-else class="output-text">{{ consoleOutput }}</pre>
              </div>
              
              <!-- 测试结果 -->
              <div v-if="activeOutputTab === 'test'" class="test-output">
                <div v-if="!hasTestResults && !running" class="empty-output">
                  <el-icon><CircleCheck /></el-icon>
                  <span>运行代码查看测试结果</span>
                </div>
                <div v-else-if="running" class="running-output">
                  <el-icon class="loading"><Loading /></el-icon>
                  <span>测试运行中...</span>
                </div>
                <div v-else class="test-results">
                  <div class="test-summary">
                    <div class="summary-item">
                      <span class="summary-label">通过：</span>
                      <span class="summary-value passed">{{ getPassedCount() }}/{{ exerciseData.testCases.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">执行时间：</span>
                      <span class="summary-value">{{ executionTime }}ms</span>
                    </div>
                  </div>
                  
                  <div class="test-details">
                    <div 
                      v-for="(result, index) in testResults"
                      :key="index"
                      class="test-result-item"
                      :class="{ 'passed': result.passed, 'failed': !result.passed }"
                    >
                      <div class="result-header">
                        <el-icon>
                          <component :is="result.passed ? 'CircleCheck' : 'CircleClose'" />
                        </el-icon>
                        <span>测试用例 {{ index + 1 }}</span>
                        <span class="result-status">{{ result.passed ? '通过' : '失败' }}</span>
                      </div>
                      <div v-if="!result.passed" class="result-details">
                        <div class="result-diff">
                          <div class="expected">
                            <label>预期：</label>
                            <code>{{ exerciseData.testCases[index].expectedOutput }}</code>
                          </div>
                          <div class="actual">
                            <label>实际：</label>
                            <code>{{ result.actualOutput }}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏模态框 -->
    <el-dialog 
      v-model="fullscreenVisible" 
      :title="fullscreenTitle"
      width="95%"
      top="2vh"
      class="fullscreen-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <div class="fullscreen-content" v-html="fullscreenContent"></div>
    </el-dialog>

    <!-- 提交结果对话框 -->
    <el-dialog
      v-model="submitDialogVisible"
      title="提交结果"
      width="500px"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <div class="submit-result">
        <div class="result-icon">
          <el-icon v-if="submitResult.success" class="success-icon">
            <CircleCheck />
          </el-icon>
          <el-icon v-else class="error-icon">
            <CircleClose />
          </el-icon>
        </div>
        <div class="result-content">
          <h3>{{ submitResult.success ? '提交成功！' : '提交失败' }}</h3>
          <p>{{ submitResult.message }}</p>
          <div v-if="submitResult.success" class="result-stats">
            <div class="stat-item">
              <span>通过率：</span>
              <span class="stat-value">{{ submitResult.passRate }}%</span>
            </div>
            <div class="stat-item">
              <span>执行时间：</span>
              <span class="stat-value">{{ submitResult.executionTime }}ms</span>
            </div>
            <div class="stat-item">
              <span>内存占用：</span>
              <span class="stat-value">{{ submitResult.memoryUsage }}MB</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="submitDialogVisible = false">关闭</el-button>
        <el-button v-if="submitResult.success" type="primary" @click="handleContinueNext">
          继续下一题
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  ArrowLeft, 
  Check, 
  Refresh, 
  Document, 
  FullScreen,
  Aim,
  EditPen,
  CaretRight,
  Monitor,
  Delete,
  Connection,
  CircleCheck,
  CircleClose,
  Loading,
  MagicStick,
  Switch
} from '@element-plus/icons-vue';

// Vue Router
const router = useRouter();
const route = useRoute();

// Vuex Store
const store = useStore();

// 响应式数据
const exerciseData = ref({});
const loading = ref(true);
const userCode = ref('');
const selectedLanguage = ref('python');
const consoleOutput = ref('');
const testResults = ref([]);
const running = ref(false);
const submitting = ref(false);
const executionTime = ref(0);
const activeTestCase = ref(0);
const activeOutputTab = ref('console');
const activeHints = ref([]);
const wordWrap = ref(true);
const fullscreenVisible = ref(false);
const fullscreenTitle = ref('');
const fullscreenContent = ref('');
const submitDialogVisible = ref(false);
const submitResult = ref({});

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode);

const hasTestResults = computed(() => {
  return testResults.value && testResults.value.length > 0;
});

// 支持的编程语言
const supportedLanguages = [
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C', value: 'c' }
];

// 模拟题目数据
const mockExerciseData = {
  id: 1,
  title: '两数之和',
  type: 'programming',
  difficulty: 'easy',
  score: 20,
  description: `
    <p>给定一个整数数组 <code>nums</code> 和一个整数目标值 <code>target</code>，请你在该数组中找出 <strong>和为目标值</strong> <code>target</code> 的那 <strong>两个</strong> 整数，并返回它们的数组下标。</p>
    <p>你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。</p>
    <p>你可以按任意顺序返回答案。</p>
  `,
  examples: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: '因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。'
    },
    {
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
      explanation: '因为 nums[1] + nums[2] == 6 ，返回 [1, 2] 。'
    }
  ],
  constraints: [
    '2 ≤ nums.length ≤ 10^4',
    '-10^9 ≤ nums[i] ≤ 10^9',
    '-10^9 ≤ target ≤ 10^9',
    '只会存在一个有效答案'
  ],
  hints: [
    '尝试使用暴力法解决：对于每个元素，检查数组中是否存在另一个元素使得两者之和等于目标值。',
    '考虑使用哈希表来提高查找效率，可以在一次遍历中完成。'
  ],
  testCases: [
    {
      input: '[2,7,11,15]\n9',
      expectedOutput: '[0,1]'
    },
    {
      input: '[3,2,4]\n6',
      expectedOutput: '[1,2]'
    },
    {
      input: '[3,3]\n6',
      expectedOutput: '[0,1]'
    }
  ],
  initialCode: {
    python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # 在此处编写你的代码
    pass

# 测试代码
if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    result = twoSum(nums, target)
    print(result)`,
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // 在此处编写你的代码
    
};

// 测试代码
const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);
console.log(result);`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // 在此处编写你的代码
        return new int[]{};
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] result = solution.twoSum(nums, target);
        System.out.println(Arrays.toString(result));
    }
}`
  }
};

// 方法
const loadExerciseData = async () => {
  loading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    exerciseData.value = mockExerciseData;
    userCode.value = exerciseData.value.initialCode[selectedLanguage.value] || '';
    loading.value = false;
  }, 500);
};

const handleBackToPrevious = () => {
  router.go(-1);
};

const handleLanguageChange = () => {
  const newCode = exerciseData.value.initialCode[selectedLanguage.value] || '';
  
  if (userCode.value !== exerciseData.value.initialCode[selectedLanguage.value]) {
    ElMessageBox.confirm(
      '切换语言会重置当前代码，是否继续？',
      '确认切换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      userCode.value = newCode;
      consoleOutput.value = '';
      testResults.value = [];
    }).catch(() => {
      // 恢复之前的语言选择
      selectedLanguage.value = selectedLanguage.value;
    });
  } else {
    userCode.value = newCode;
  }
};

const handleRunCode = async () => {
  if (!userCode.value.trim()) {
    ElMessage.warning('请先编写代码');
    return;
  }
  
  running.value = true;
  consoleOutput.value = '';
  testResults.value = [];
  
  // 模拟代码执行
  setTimeout(() => {
    // 模拟控制台输出
    consoleOutput.value = `>>> 运行 ${selectedLanguage.value} 代码\n[0, 1]\n>>> 执行完成`;
    
    // 模拟测试结果
    const mockResults = [
      { passed: true, actualOutput: '[0,1]' },
      { passed: true, actualOutput: '[1,2]' },
      { passed: false, actualOutput: '[0,2]' }
    ];
    
    testResults.value = mockResults;
    executionTime.value = Math.floor(Math.random() * 100) + 50;
    running.value = false;
    
    // 自动切换到测试结果标签
    activeOutputTab.value = 'test';
    
    ElMessage.success('代码运行完成');
  }, 2000);
};

const handleSubmitSolution = async () => {
  if (!userCode.value.trim()) {
    ElMessage.warning('请先编写代码');
    return;
  }
  
  if (!hasTestResults.value) {
    ElMessage.warning('请先运行代码进行测试');
    return;
  }
  
  submitting.value = true;
  
  // 模拟提交
  setTimeout(() => {
    const passedCount = getPassedCount();
    const totalCount = exerciseData.value.testCases.length;
    const success = passedCount === totalCount;
    
    submitResult.value = {
      success,
      message: success 
        ? '恭喜！您的解答通过了所有测试用例。' 
        : `您的解答通过了 ${passedCount}/${totalCount} 个测试用例，请检查代码逻辑。`,
      passRate: Math.round((passedCount / totalCount) * 100),
      executionTime: executionTime.value,
      memoryUsage: (Math.random() * 10 + 5).toFixed(1)
    };
    
    submitting.value = false;
    submitDialogVisible.value = true;
  }, 1500);
};

const handleResetCode = () => {
  ElMessageBox.confirm(
    '确定要重置代码吗？当前编写的代码将会丢失。',
    '重置确认',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    userCode.value = exerciseData.value.initialCode[selectedLanguage.value] || '';
    consoleOutput.value = '';
    testResults.value = [];
    ElMessage.success('代码已重置');
  });
};

const clearOutput = () => {
  consoleOutput.value = '';
  testResults.value = [];
  ElMessage.success('输出已清空');
};

const formatCode = () => {
  // 简单的代码格式化（实际项目中应使用专业的格式化工具）
  ElMessage.info('代码格式化功能开发中...');
};

const toggleWordWrap = () => {
  wordWrap.value = !wordWrap.value;
  ElMessage.success(`已${wordWrap.value ? '开启' : '关闭'}自动换行`);
};

const toggleFullscreen = (panelType) => {
  const titles = {
    question: '题目描述',
    target: '预期输出',
    code: '代码编辑器',
    output: '运行输出'
  };
  
  fullscreenTitle.value = titles[panelType];
  
  switch (panelType) {
    case 'question':
      fullscreenContent.value = formatDescription(exerciseData.value.description);
      break;
    case 'target':
      fullscreenContent.value = '<pre>' + JSON.stringify(exerciseData.value.testCases, null, 2) + '</pre>';
      break;
    case 'code':
      fullscreenContent.value = '<pre>' + userCode.value + '</pre>';
      break;
    case 'output':
      fullscreenContent.value = '<pre>' + consoleOutput.value + '</pre>';
      break;
  }
  
  fullscreenVisible.value = true;
};

const handleContinueNext = () => {
  submitDialogVisible.value = false;
  // 这里可以跳转到下一题
  ElMessage.success('功能开发中：跳转下一题');
};

// 工具方法
const getExerciseTypeText = (type) => {
  const typeMap = {
    'choice': '选择题',
    'fill': '填空题',
    'programming': '编程题',
    'short_answer': '简答题',
    'calculation': '计算题'
  };
  return typeMap[type] || type;
};

const getTypeTagType = (type) => {
  const tagTypeMap = {
    'choice': 'success',
    'fill': 'warning',
    'programming': 'danger',
    'short_answer': 'info',
    'calculation': 'primary'
  };
  return tagTypeMap[type] || 'default';
};

const getDifficultyText = (difficulty) => {
  const difficultyMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  };
  return difficultyMap[difficulty] || difficulty;
};

const getDifficultyTagType = (difficulty) => {
  const tagTypeMap = {
    'easy': 'success',
    'medium': 'warning',
    'hard': 'danger'
  };
  return tagTypeMap[difficulty] || 'default';
};

const formatDescription = (description) => {
  return description;
};

const getCodePlaceholder = () => {
  const placeholders = {
    python: '# 在此处编写Python代码...',
    javascript: '// 在此处编写JavaScript代码...',
    java: '// 在此处编写Java代码...',
    cpp: '// 在此处编写C++代码...',
    c: '// 在此处编写C代码...'
  };
  return placeholders[selectedLanguage.value] || '// 在此处编写代码...';
};

const getLineCount = () => {
  return userCode.value.split('\n').length;
};

const getPassedCount = () => {
  return testResults.value.filter(result => result.passed).length;
};

const getTestResultClass = (result) => {
  return result.passed ? 'test-passed' : 'test-failed';
};

const getTestResultIcon = (result) => {
  return result.passed ? 'CircleCheck' : 'CircleClose';
};

// 生命周期
onMounted(() => {
  loadExerciseData();
  
  // 添加键盘快捷键
  const handleKeydown = (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handleRunCode();
          break;
        case 's':
          event.preventDefault();
          handleSubmitSolution();
          break;
      }
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.exercise-solve-view {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.theme-dark .exercise-solve-view {
  background-color: #1a1a1a;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.theme-dark .page-header {
  background: #2d2d2d;
  border-bottom-color: #404040;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #6b7280;
  padding: 8px 12px;
  margin-right: 24px;
}

.back-button:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.theme-dark .back-button {
  color: #9ca3af;
}

.theme-dark .back-button:hover {
  color: #e5e7eb;
  background-color: #374151;
}

.header-info {
  flex: 1;
}

.exercise-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #111827;
}

.theme-dark .exercise-title {
  color: #f9fafb;
}

.exercise-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background-color: #e5e7eb;
  min-height: calc(100vh - 120px);
}

.theme-dark .main-content {
  background-color: #374151;
}

/* 象限面板 */
.quadrant {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.theme-dark .quadrant {
  background: #2d2d2d;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.theme-dark .panel-header {
  background: #374151;
  border-bottom-color: #4b5563;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}

.theme-dark .panel-title {
  color: #e5e7eb;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fullscreen-btn {
  padding: 6px;
  color: #6b7280;
}

.fullscreen-btn:hover {
  color: #374151;
}

.theme-dark .fullscreen-btn {
  color: #9ca3af;
}

.theme-dark .fullscreen-btn:hover {
  color: #e5e7eb;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

/* 题目面板样式 */
.question-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #374151;
}

.theme-dark .question-content h4 {
  color: #e5e7eb;
}

.description-text {
  line-height: 1.6;
  color: #4b5563;
  margin-bottom: 24px;
}

.theme-dark .description-text {
  color: #d1d5db;
}

.description-text :deep(code) {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.9em;
}

.theme-dark .description-text :deep(code) {
  background: #374151;
}

.example-item {
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.theme-dark .example-item {
  border-color: #4b5563;
}

.example-header {
  background: #f9fafb;
  padding: 8px 16px;
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.theme-dark .example-header {
  background: #374151;
  color: #e5e7eb;
}

.example-content {
  padding: 16px;
}

.example-input,
.example-output,
.example-explanation {
  margin-bottom: 8px;
}

.example-content code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.theme-dark .example-content code {
  background: #1f2937;
}

.constraints-list {
  margin: 0;
  padding-left: 20px;
}

.constraints-list li {
  margin-bottom: 4px;
  color: #6b7280;
}

.theme-dark .constraints-list li {
  color: #9ca3af;
}

.hint-text {
  color: #6b7280;
  line-height: 1.5;
}

.theme-dark .hint-text {
  color: #9ca3af;
}

/* 目标输出面板样式 */
.test-case-item {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-dark .test-case-item {
  border-color: #4b5563;
}

.test-case-item:hover {
  border-color: #d1d5db;
}

.test-case-item.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.test-case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
}

.theme-dark .test-case-header {
  background: #374151;
}

.test-case-title {
  font-weight: 500;
  color: #374151;
}

.theme-dark .test-case-title {
  color: #e5e7eb;
}

.test-passed {
  color: #10b981;
}

.test-failed {
  color: #ef4444;
}

.test-case-content {
  padding: 16px;
  background: #ffffff;
}

.theme-dark .test-case-content {
  background: #2d2d2d;
}

.test-input,
.test-expected,
.test-actual {
  margin-bottom: 12px;
}

.test-input label,
.test-expected label,
.test-actual label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  color: #374151;
}

.theme-dark .test-input label,
.theme-dark .test-expected label,
.theme-dark .test-actual label {
  color: #e5e7eb;
}

.input-text,
.output-text {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.theme-dark .input-text,
.theme-dark .output-text {
  background: #1f2937;
  border-color: #4b5563;
  color: #e5e7eb;
}

.output-text.expected {
  border-left: 3px solid #10b981;
}

.output-text.actual.correct {
  border-left: 3px solid #10b981;
}

.output-text.actual:not(.correct) {
  border-left: 3px solid #ef4444;
}

/* 代码编辑器样式 */
.code-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  font-family: 'Courier New', Monaco, monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  background: #ffffff;
  color: #374151;
  min-height: 300px;
}

.theme-dark .code-textarea {
  background: #1f2937;
  border-color: #4b5563;
  color: #e5e7eb;
}

.code-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.theme-dark .editor-toolbar {
  background: #374151;
  border-color: #4b5563;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-stats {
  font-size: 12px;
  color: #6b7280;
}

.theme-dark .code-stats {
  color: #9ca3af;
}

/* 输出面板样式 */
.output-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.output-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.theme-dark .output-tabs {
  border-bottom-color: #4b5563;
}

.output-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  color: #6b7280;
  transition: all 0.3s ease;
}

.theme-dark .output-tab {
  color: #9ca3af;
}

.output-tab:hover {
  color: #374151;
}

.theme-dark .output-tab:hover {
  color: #e5e7eb;
}

.output-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.output-content {
  flex: 1;
  overflow: auto;
}

.empty-output,
.running-output {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 40px 20px;
  color: #9ca3af;
  text-align: center;
}

.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.output-text {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.theme-dark .output-text {
  background: #1f2937;
  border-color: #4b5563;
  color: #e5e7eb;
}

.test-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.theme-dark .test-summary {
  background: #374151;
  border-color: #4b5563;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  color: #6b7280;
  font-size: 14px;
}

.theme-dark .summary-label {
  color: #9ca3af;
}

.summary-value {
  font-weight: 600;
  color: #374151;
}

.theme-dark .summary-value {
  color: #e5e7eb;
}

.summary-value.passed {
  color: #10b981;
}

.test-result-item {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.theme-dark .test-result-item {
  border-color: #4b5563;
}

.test-result-item.passed {
  border-left: 4px solid #10b981;
}

.test-result-item.failed {
  border-left: 4px solid #ef4444;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
}

.theme-dark .result-header {
  background: #374151;
}

.result-status {
  margin-left: auto;
  font-size: 14px;
  font-weight: 500;
}

.test-result-item.passed .result-status {
  color: #10b981;
}

.test-result-item.failed .result-status {
  color: #ef4444;
}

.result-details {
  padding: 16px;
}

.result-diff {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expected,
.actual {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.expected label,
.actual label {
  min-width: 60px;
  font-weight: 500;
  color: #6b7280;
}

.theme-dark .expected label,
.theme-dark .actual label {
  color: #9ca3af;
}

.expected code {
  background: #dcfce7;
  color: #166534;
}

.actual code {
  background: #fef2f2;
  color: #dc2626;
}

.theme-dark .expected code {
  background: #14532d;
  color: #4ade80;
}

.theme-dark .actual code {
  background: #7f1d1d;
  color: #f87171;
}

/* 全屏对话框样式 */
.fullscreen-dialog :deep(.el-dialog) {
  margin: 2vh auto;
  height: 96vh;
}

.fullscreen-dialog :deep(.el-dialog__body) {
  height: calc(96vh - 120px);
  overflow: auto;
}

.fullscreen-content {
  height: 100%;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 提交结果对话框样式 */
.submit-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-icon {
  color: #10b981;
}

.error-icon {
  color: #ef4444;
}

.result-content h3 {
  font-size: 20px;
  margin: 0 0 8px 0;
  color: #374151;
}

.theme-dark .result-content h3 {
  color: #e5e7eb;
}

.result-content p {
  color: #6b7280;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.theme-dark .result-content p {
  color: #9ca3af;
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f9fafb;
  border-radius: 6px;
  min-width: 200px;
}

.theme-dark .stat-item {
  background: #374151;
}

.stat-value {
  font-weight: 600;
  color: #3b82f6;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }
  
  .quadrant {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .panel-content {
    padding: 16px;
  }
  
  .test-summary {
    flex-direction: column;
    gap: 12px;
  }
  
  .result-diff {
    gap: 12px;
  }
  
  .expected,
  .actual {
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .exercise-meta {
    flex-wrap: wrap;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .output-tabs {
    flex-direction: column;
  }
  
  .output-tab {
    border-bottom: none;
    border-left: 3px solid transparent;
  }
  
  .output-tab.active {
    border-left-color: #3b82f6;
    border-bottom-color: transparent;
  }
}
</style>