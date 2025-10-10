<template>
  <div class="exercise-solve-view" :class="{ 'theme-dark': isDarkMode }">
    <!-- 简化的页面头部 -->
    <ExerciseHeader />
    
    <!-- 主要内容区域 - 左右布局 -->
    <div class="main-content">
      <!-- 左侧：题目描述 -->
      <div class="left-panel">
        <ExerciseDescriptionPanel 
          :exercise-data="exerciseData"
          :show-hints="false"
          @toggle-fullscreen="handleToggleFullscreen"
        />
      </div>

      <!-- 右侧：代码编辑器 -->
      <div class="right-panel">
        <ExerciseCodePanel 
          :exercise-data="exerciseData"
          :initial-code="currentCode"
          @code-change="handleCodeChange"
          @language-change="handleLanguageChange"
          @toggle-fullscreen="handleToggleFullscreen"
          @run-code="handleRunCode"
          @submit-solution="handleSubmitSolution"
          @reset-code="handleResetCode"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'

// 导入组件
import ExerciseHeader from '../components/Exercise/ExerciseHeader.vue'
import ExerciseDescriptionPanel from '../components/Exercise/ExerciseDescriptionPanel.vue'
import ExerciseCodePanel from '../components/Exercise/ExerciseCodePanel.vue'

// Vue Router
const router = useRouter()
const route = useRoute()

// Vuex Store
const store = useStore()

// 响应式数据
const exerciseData = ref({})
const currentCode = ref('')
const selectedLanguage = ref('python')
const fullscreenMode = ref(null) // 'question', 'editor', null

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode)

// 方法
const loadExerciseData = async () => {
  const exerciseId = route.params.id
  const taskId = route.query.taskId
  const from = route.query.from

  try {
    // 模拟加载题目数据
    exerciseData.value = {
      id: exerciseId,
      title: "二分查找算法实现",
      type: "algorithm",
      difficulty: "medium",
      score: 100,
      description: "给定一个有序数组 nums 和一个目标值 target，请使用二分查找算法在数组中查找 target。如果目标值存在返回下标，否则返回 -1。\n\n要求：时间复杂度必须是 O(log n)。",
      examples: [
        {
          input: "nums = [1,3,5,6,7,8,10], target = 6",
          output: "3",
          explanation: "目标值 6 在数组中的下标是 3"
        },
        {
          input: "nums = [1,3,5,6,7,8,10], target = 4", 
          output: "-1",
          explanation: "目标值 4 不存在于数组中，返回 -1"
        }
      ],
      constraints: [
        "1 <= nums.length <= 10^4",
        "-10^4 < nums[i], target < 10^4", 
        "nums 为非递减序列"
      ],
      hints: [
        "考虑使用左右双指针的方法",
        "每次比较中间元素与目标值的大小关系",
        "根据比较结果调整查找范围"
      ]
    }

    // 设置初始代码
    currentCode.value = getInitialCode(selectedLanguage.value)

  } catch (error) {
    console.error('加载题目数据失败:', error)
    ElMessage.error('加载题目数据失败')
  }
}

const getInitialCode = (language) => {
  const templates = {
    python: `def binary_search(nums, target):
    """
    二分查找实现
    :param nums: 有序数组
    :param target: 目标值
    :return: 目标值的下标，不存在则返回-1
    """
    # 在这里实现你的代码
    pass

# 测试代码
if __name__ == "__main__":
    nums = [1, 3, 5, 6, 7, 8, 10]
    target = 6
    result = binary_search(nums, target)
    print(result)`,
    javascript: `function binarySearch(nums, target) {
    /**
     * 二分查找实现
     * @param {number[]} nums - 有序数组
     * @param {number} target - 目标值
     * @return {number} 目标值的下标，不存在则返回-1
     */
    // 在这里实现你的代码
}

// 测试代码
const nums = [1, 3, 5, 6, 7, 8, 10];
const target = 6;
console.log(binarySearch(nums, target));`,
    java: `public class Solution {
    public int binarySearch(int[] nums, int target) {
        // 在这里实现你的代码
        return -1;
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        int[] nums = {1, 3, 5, 6, 7, 8, 10};
        int target = 6;
        System.out.println(solution.binarySearch(nums, target));
    }
}`
  }
  return templates[language] || templates.python
}

const handleCodeChange = (code) => {
  currentCode.value = code
}

const handleLanguageChange = (language) => {
  selectedLanguage.value = language
  // 可以选择是否重置代码为新语言的模板
  // currentCode.value = getInitialCode(language)
}

const handleToggleFullscreen = (panelType) => {
  fullscreenMode.value = fullscreenMode.value === panelType ? null : panelType
  // 这里可以添加全屏逻辑
  console.log('Toggle fullscreen for:', panelType)
}

const handleRunCode = (payload) => {
  console.log('Running code:', payload)
  ElMessage.success('代码运行中...')
}

const handleSubmitSolution = (payload) => {
  console.log('Submitting solution:', payload)
  ElMessage.success('提交解答中...')
}

const handleResetCode = () => {
  currentCode.value = getInitialCode(selectedLanguage.value)
  ElMessage.info('代码已重置')
}

// 生命周期
onMounted(() => {
  loadExerciseData()
})
</script>

<style scoped>
.exercise-solve-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.theme-dark .exercise-solve-view {
  background: #1f1f1f;
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0;
  gap: 16px;
  padding: 16px;
}

.left-panel {
  flex: 1;
  min-width: 400px;
  max-width: 50%;
}

.right-panel {
  flex: 1;
  min-width: 400px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .left-panel,
  .right-panel {
    flex: none;
    min-width: unset;
    max-width: unset;
    height: 50vh;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 8px;
    gap: 8px;
  }
  
  .left-panel,
  .right-panel {
    height: 45vh;
  }
}
</style>