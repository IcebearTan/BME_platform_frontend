<template>
  <div class="org-overview">
    <!-- 统计卡 -->
    <div class="org-stats">
      <DewCard v-for="s in statCards" :key="s.label" no-hover class="stat-card">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </DewCard>
    </div>

    <!-- 管理层任职 -->
    <DewCard no-hover class="table-card">
      <template #header>
        <div class="card-title">管理层任职</div>
      </template>
      <el-table :data="managementRows" v-loading="loading" max-height="calc(100vh - 560px)">
        <el-table-column prop="username" label="姓名" min-width="120" />
        <el-table-column prop="title" label="职位" min-width="120" />
        <el-table-column prop="group" label="分管组" min-width="140">
          <template #default="{ row }">{{ row.group || '统筹全局' }}</template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 组树统计 -->
    <DewCard no-hover class="table-card">
      <template #header>
        <div class="card-title">组树概览</div>
      </template>
      <el-table :data="treeRows" v-loading="loading" row-key="id" default-expand-all
        :tree-props="{ children: 'children' }" max-height="calc(100vh - 460px)">
        <el-table-column prop="name" label="组名" min-width="220" />
        <el-table-column label="主归属" width="90" align="center">
          <template #default="{ row }">{{ row.counts?.primary ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="次归属" width="90" align="center">
          <template #default="{ row }">{{ row.counts?.secondary ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="组长" min-width="120">
          <template #default="{ row }">
            <span v-if="row.leader">{{ row.leader.username }}</span>
            <el-tag v-else type="info" size="small">组长空缺</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分管干事" min-width="120">
          <template #default="{ row }">
            <span v-if="row.oversee_by">{{ row.oversee_by.username }}（{{ row.oversee_by.title }}）</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'

const loading = ref(false)
const president = ref(null)
const management = ref([])
const tree = ref([])

const managementRows = computed(() => {
  const rows = []
  if (president.value) rows.push(president.value)
  rows.push(...management.value)
  return rows
})

// 无组长组数：递归全树统计叶子与管理组
function countNoLeader(nodes) {
  let n = 0
  for (const node of nodes || []) {
    if (!node.leader && !node.oversee_by) n += 1
    n += countNoLeader(node.children)
  }
  return n
}

function countGroups(nodes) {
  let n = 0
  for (const node of nodes || []) {
    n += 1
    n += countGroups(node.children)
  }
  return n
}

const statCards = computed(() => [
  { label: '在册组数', value: countGroups(tree.value) },
  { label: '管理层任职', value: managementRows.value.length },
  { label: '组长空缺组', value: countNoLeader(tree.value) },
])

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/organization')
    if (res.data.code === 200) {
      president.value = res.data.data?.president || null
      management.value = res.data.data?.management || []
      tree.value = res.data.data?.tree || []
    }
  } catch {
    // 组织架构为聚合展示页：失败时保留空态，不弹全局错误
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.org-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.org-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card :deep(.dew-card__body) {
  padding: 14px 18px;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.table-card :deep(.dew-card__header) {
  padding: 14px 18px 0;
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-secondary);
}
</style>
