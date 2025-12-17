<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { List, Search } from '@element-plus/icons-vue';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

const orders = ref([
  {
    id: 'ORD-20231215-001',
    modelName: 'Gear_Box_v3.stl',
    printer: 'Bambu Lab X1C - 01',
    material: 'PLA 黄色',
    status: 'completed',
    submitTime: '2023-12-15 14:30',
    finishTime: '2023-12-15 18:45'
  },
  {
    id: 'ORD-20231216-003',
    modelName: 'Phone_Stand.obj',
    printer: 'Prusa MK4 - 01',
    material: 'PETG 透明',
    status: 'printing',
    submitTime: '2023-12-16 09:15',
    finishTime: '-'
  },
  {
    id: 'ORD-20231217-002',
    modelName: 'Dragon_Statue.stl',
    printer: 'Bambu Lab X1C - 02',
    material: 'PLA Lite 白色',
    status: 'pending',
    submitTime: '2023-12-17 10:20',
    finishTime: '-'
  },
  {
    id: 'ORD-20231214-005',
    modelName: 'Test_Cube.3mf',
    printer: 'Voron 2.4 - 01',
    material: 'ABS 红色',
    status: 'rejected',
    submitTime: '2023-12-14 16:00',
    finishTime: '-'
  }
]);

const getStatusType = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'printing': return 'warning'; // Orange for active
    case 'pending': return 'primary';
    case 'rejected': return 'danger';
    default: return 'info';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'printing': return '打印中';
    case 'pending': return '排队中';
    case 'rejected': return '已驳回';
    default: return '未知';
  }
};
</script>

<template>
  <div :class="['order-history-container', { 'theme-dark': isDarkMode }]">
    <div class="section-header">
      <h3><el-icon><List /></el-icon> 我的打印记录</h3>
      <div class="search-box">
        <el-input
          placeholder="搜索订单号或模型名称"
          :prefix-icon="Search"
          size="small"
          style="width: 200px"
        />
      </div>
    </div>

    <el-table 
      :data="orders" 
      style="width: 100%" 
      :header-cell-style="{ background: isDarkMode ? '#1E1E1E' : '#f5f7fa', color: isDarkMode ? '#E5EAF3' : '#606266' }"
      :row-class-name="isDarkMode ? 'dark-row' : ''"
      class="order-table"
    >
      <el-table-column prop="id" label="订单号" width="160" />
      <el-table-column prop="modelName" label="模型名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="printer" label="使用设备" width="180" show-overflow-tooltip />
      <el-table-column prop="material" label="耗材" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)" size="small" effect="light">
            {{ getStatusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitTime" label="提交时间" width="160" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" size="small">详情</el-button>
          <el-button v-if="scope.row.status === 'pending'" link type="danger" size="small">取消</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.order-history-container {
  background-color: var(--el-bg-color);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--el-border-color-light);
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

/* Dark Mode Overrides */
.theme-dark.order-history-container {
  background-color: #1E1E1E;
  border-color: #363637;
}

.theme-dark .section-header h3 {
  color: #E5EAF3;
}

/* Table Dark Mode */
:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-row-hover-bg-color: var(--el-fill-color-light);
  --el-table-border-color: var(--el-border-color-lighter);
}

.theme-dark :deep(.el-table) {
  --el-table-text-color: #E5EAF3;
  --el-table-header-text-color: #E5EAF3;
  --el-table-row-hover-bg-color: #2b2b2b;
  --el-table-border-color: #363637;
  background-color: transparent;
}

.theme-dark :deep(.el-table__inner-wrapper::before) {
  background-color: #363637;
}

.theme-dark :deep(.el-table__row) {
  background-color: #1E1E1E;
}

.theme-dark :deep(.el-table__row:hover) {
  background-color: #2b2b2b !important;
}
</style>
