<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { Timer, List, InfoFilled } from '@element-plus/icons-vue';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

const props = defineProps({
  queueLength: {
    type: Number,
    default: 0
  },
  estimatedWaitTime: {
    type: String,
    default: '24h'
  }
});

// Mock status data
const activePrinters = ref(3);
const totalPrinters = ref(5);

const printerStatusPercentage = computed(() => {
  return (activePrinters.value / totalPrinters.value) * 100;
});
</script>

<template>
  <el-card :class="['queue-status-card', { 'theme-dark': isDarkMode }]" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="header-title">
          <el-icon><List /></el-icon> 打印队列状态
        </span>
        <el-tag type="success" effect="dark" round size="small">运行中</el-tag>
      </div>
    </template>
    
    <div class="status-content">
      <div class="status-item main-stat">
        <div class="stat-value highlight">{{ queueLength }}</div>
        <div class="stat-label">前方排队订单</div>
      </div>
      
      <el-divider direction="vertical" class="stat-divider" />
      
      <div class="status-item">
        <div class="stat-value">{{ estimatedWaitTime }}</div>
        <div class="stat-label">预计等待时间</div>
      </div>
    </div>

    <div class="printer-status">
      <div class="status-row">
        <span class="label">打印机负载</span>
        <span class="value">{{ activePrinters }} / {{ totalPrinters }} 运行中</span>
      </div>
      <el-progress 
        :percentage="printerStatusPercentage" 
        :status="printerStatusPercentage >= 80 ? 'warning' : 'success'"
        :stroke-width="8"
        striped
        striped-flow
      />
    </div>

    <div class="notice-box">
      <el-icon><InfoFilled /></el-icon>
      <span class="notice-text">请确保模型文件符合规范，否则可能会被驳回。</span>
    </div>
  </el-card>
</template>

<style scoped>
.queue-status-card {
  border-radius: 12px;
  margin-bottom: 20px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.status-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
}

.status-item {
  text-align: center;
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.stat-value.highlight {
  color: var(--el-color-primary);
  font-size: 36px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-divider {
  height: 50px;
}

.printer-status {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.status-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.notice-box {
  margin-top: 20px;
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  padding: 10px;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}

/* Dark Mode Styles */
.theme-dark.queue-status-card {
  background-color: #1E1E1E;
  border-color: #363637;
}

.theme-dark .stat-value {
  color: #E5EAF3;
}

.theme-dark .stat-value.highlight {
  color: #409EFF;
}

.theme-dark .stat-label {
  color: #A3A6AD;
}

.theme-dark .status-row {
  color: #A3A6AD;
}

.theme-dark .printer-status {
  border-top-color: #4c4c4c;
}

.theme-dark .notice-box {
  background-color: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}
</style>
