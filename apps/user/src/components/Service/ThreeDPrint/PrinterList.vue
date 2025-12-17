<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { Printer, VideoPlay, CircleCheck, Warning, CircleClose } from '@element-plus/icons-vue';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

const emit = defineEmits(['select-printer']);

const printers = ref([
  {
    id: 1,
    name: 'Bambu Lab X1C - 01',
    status: 'idle', // idle, printing, maintenance, offline
    type: 'FDM',
    currentJob: null,
    progress: 0,
    location: 'A区-01'
  },
  {
    id: 2,
    name: 'Bambu Lab X1C - 02',
    status: 'printing',
    type: 'FDM',
    currentJob: 'Robot_Arm_v2.stl',
    progress: 45,
    timeLeft: '2h 15m',
    location: 'A区-02'
  },
  {
    id: 3,
    name: 'Prusa MK4 - 01',
    status: 'idle',
    type: 'FDM',
    currentJob: null,
    progress: 0,
    location: 'B区-01'
  },
  {
    id: 4,
    name: 'Formlabs 3+ - 01',
    status: 'maintenance',
    type: 'SLA',
    currentJob: null,
    progress: 0,
    location: 'C区-01'
  },
  {
    id: 5,
    name: 'Bambu Lab P1P - 01',
    status: 'printing',
    type: 'FDM',
    currentJob: 'Phone_Case.3mf',
    progress: 88,
    timeLeft: '15m',
    location: 'A区-03'
  },
  {
    id: 6,
    name: 'Voron 2.4 - 01',
    status: 'offline',
    type: 'FDM',
    currentJob: null,
    progress: 0,
    location: 'D区-01'
  }
]);

const getStatusType = (status) => {
  switch (status) {
    case 'idle': return 'success';
    case 'printing': return 'primary';
    case 'maintenance': return 'warning';
    case 'offline': return 'info';
    default: return 'info';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'idle': return '空闲中';
    case 'printing': return '打印中';
    case 'maintenance': return '维护中';
    case 'offline': return '离线';
    default: return '未知';
  }
};

const handleSelect = (printer) => {
  if (printer.status === 'idle') {
    emit('select-printer', printer);
  }
};
</script>

<template>
  <div class="printer-list-container">
    <div class="section-header">
      <h3><el-icon><Printer /></el-icon> 打印机状态概览</h3>
      <div class="status-legend">
        <span class="legend-item"><span class="dot success"></span>空闲</span>
        <span class="legend-item"><span class="dot primary"></span>工作中</span>
        <span class="legend-item"><span class="dot warning"></span>维护中</span>
      </div>
    </div>

    <div class="printer-grid">
      <div 
        v-for="printer in printers" 
        :key="printer.id"
        :class="['printer-card', printer.status, { 'theme-dark': isDarkMode }]"
        @click="handleSelect(printer)"
      >
        <div class="card-top">
          <div class="printer-icon">
            <el-icon v-if="printer.status === 'idle'"><CircleCheck /></el-icon>
            <el-icon v-else-if="printer.status === 'printing'"><VideoPlay /></el-icon>
            <el-icon v-else-if="printer.status === 'maintenance'"><Warning /></el-icon>
            <el-icon v-else><CircleClose /></el-icon>
          </div>
          <div class="printer-info">
            <div class="printer-name">{{ printer.name }}</div>
            <div class="printer-location">{{ printer.location }} | {{ printer.type }}</div>
          </div>
          <el-tag :type="getStatusType(printer.status)" size="small" effect="dark" round>
            {{ getStatusLabel(printer.status) }}
          </el-tag>
        </div>

        <div class="card-body">
          <div v-if="printer.status === 'printing'" class="printing-info">
            <div class="job-name">{{ printer.currentJob }}</div>
            <el-progress :percentage="printer.progress" :stroke-width="6" :color="isDarkMode ? '#409EFF' : ''" />
            <div class="time-left">剩余: {{ printer.timeLeft }}</div>
          </div>
          <div v-else-if="printer.status === 'idle'" class="idle-info">
            <span class="action-text">点击预约此设备</span>
          </div>
          <div v-else class="status-info">
            <span>暂不可用</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.printer-list-container {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.status-legend {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.success { background-color: var(--el-color-success); }
.dot.primary { background-color: var(--el-color-primary); }
.dot.warning { background-color: var(--el-color-warning); }

.printer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.printer-card {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.printer-card.idle {
  cursor: pointer;
  border-color: var(--el-color-success-light-5);
}

.printer-card.idle:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(103, 194, 58, 0.15);
  border-color: var(--el-color-success);
}

.printer-card.printing {
  border-color: var(--el-color-primary-light-5);
}

.printer-card.maintenance {
  opacity: 0.8;
  background-color: var(--el-fill-color-lighter);
}

.printer-card.offline {
  opacity: 0.6;
  filter: grayscale(100%);
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.printer-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--el-text-color-secondary);
}

.idle .printer-icon {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.printing .printer-icon {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.printer-info {
  flex: 1;
}

.printer-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
}

.printer-location {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-body {
  min-height: 40px;
  display: flex;
  align-items: center;
}

.printing-info {
  width: 100%;
}

.job-name {
  font-size: 12px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
}

.time-left {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  text-align: right;
}

.idle-info {
  width: 100%;
  text-align: center;
}

.action-text {
  font-size: 13px;
  color: var(--el-color-success);
  font-weight: 500;
}

.status-info {
  width: 100%;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* Dark Mode */
.theme-dark.printer-card {
  background-color: #1E1E1E;
  border-color: #363637;
}

.theme-dark .section-header h3 {
  color: #E5EAF3;
}

.theme-dark .printer-name {
  color: #E5EAF3;
}

.theme-dark .printer-location,
.theme-dark .job-name,
.theme-dark .time-left,
.theme-dark .status-info {
  color: #A3A6AD;
}

.theme-dark.printer-card.idle {
  border-color: rgba(103, 194, 58, 0.3);
}

.theme-dark.printer-card.idle:hover {
  border-color: #67C23A;
  background-color: #252525;
}

.theme-dark.printer-card.printing {
  border-color: rgba(64, 158, 255, 0.3);
}

.theme-dark .printer-icon {
  background-color: #2b2b2b;
}

.theme-dark.idle .printer-icon {
  background-color: rgba(103, 194, 58, 0.1);
}

.theme-dark.printing .printer-icon {
  background-color: rgba(64, 158, 255, 0.1);
}
</style>
