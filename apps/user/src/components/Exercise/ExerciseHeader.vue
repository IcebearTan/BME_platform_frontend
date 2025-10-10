<template>
  <div class="exercise-header" :class="{ 'theme-dark': isDarkMode }">
    <el-button 
      type="text" 
      class="back-button"
      @click="handleBackToPrevious"
    >
      <el-icon><ArrowLeft /></el-icon>
      <span>返回</span>
    </el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

// Store 和 Router
const store = useStore()
const router = useRouter()

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode)

// 方法
const handleBackToPrevious = () => {
  router.go(-1)
}
</script>

<style scoped>
.exercise-header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.theme-dark .exercise-header {
  background: #2a2a2a;
  border-bottom-color: #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  color: #666666;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.theme-dark .back-button {
  color: #b0b0b0;
}

.theme-dark .back-button:hover {
  background: #3a3a3a;
  color: #1890ff;
}
</style>