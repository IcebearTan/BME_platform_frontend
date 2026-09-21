<template>
  <div class="camp-leaves-page">
    <div class="page-header">
      <div class="page-title">请假</div>
      <div class="header-actions">
        <el-radio-group :model-value="statusFilter" size="small" @change="onFilterChange">
          <el-radio-button value="pending">待审批</el-radio-button>
          <el-radio-button value="approved">已批准</el-radio-button>
          <el-radio-button value="rejected">已拒绝</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table ref="tableRef" :data="filteredLeaves" border size="small" row-key="id"
        highlight-current-row v-loading="loading">
        <el-table-column label="学员" prop="username" width="100" />
        <el-table-column label="日期段" min-width="170">
          <template #default="{ row }">{{ row.start_date }} ~ {{ row.end_date }}</template>
        </el-table-column>
        <el-table-column label="事由" prop="reason" min-width="140" show-overflow-tooltip />
        <el-table-column label="审批意见" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.decision_note">{{ row.decision_note }}</span>
            <span v-else style="color: var(--el-text-color-placeholder);">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="leaveStatusType(row.status)" size="small">{{ leaveStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="manageWritable" label="操作" width="200">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" link @click="approveLeave(row, true)">批准</el-button>
              <el-button size="small" type="danger" link @click="approveLeave(row, false)">拒绝</el-button>
            </template>
            <el-button v-if="row.status === 'approved'" size="small" type="warning" link
              @click="revokeLeave(row)">撤回批准</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createGuardedAction } from '../shared/guardedAction'
import { leaveStatusLabel, leaveStatusType } from '../shared/statusText'
import { useFocusRow, bindFocusToTable } from '../shared/useFocusRow'

const route = useRoute()
const router = useRouter()
const ctx = useCampContext()
const { campId, manageWritable } = ctx

const leaves = ref([])
const loading = ref(false)
const tableRef = ref(null)

// 分状态过滤（?status= 深链预置，工作台待办跳转默认落待审批）
const statusFilter = ref(['pending', 'approved', 'rejected'].includes(route.query.status)
  ? route.query.status : 'pending')

const filteredLeaves = computed(() => {
  if (statusFilter.value === 'all') return leaves.value
  return leaves.value.filter((l) => l.status === statusFilter.value)
})

function onFilterChange(v) {
  statusFilter.value = v
  router.replace({ query: { ...route.query, status: v === 'all' ? undefined : v } })
}

async function fetchLeaves() {
  loading.value = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/leave`)
    leaves.value = res.data?.leaves || []
  } catch (e) {
    // 能力未启用等场景：渲染空态而不是错误风暴（门禁通常已先行重定向）
    leaves.value = []
  } finally {
    loading.value = false
  }
}

const { guarded } = createGuardedAction()

function approveLeave(row, approve) {
  guarded(async () => {
    let note = ''
    if (!approve) {
      // 拒绝影响较大，先确认并收集原因（随审批入库 decision_note，进入学员通知）
      try {
        const { value } = await ElMessageBox.prompt(
          `可填写拒绝原因（将通知「${row.username}」）`, `拒绝 ${row.username} ${row.start_date}~${row.end_date} 的请假`,
          { confirmButtonText: '拒绝', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' })
        note = value || ''
      } catch { return }
    }
    try {
      await api.post(`/camp/leave/${row.id}/approve`, { approve, note })
      ElMessage.success(approve ? '已批准' : '已拒绝')
      fetchLeaves()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '审批失败')
    }
  })
}

function revokeLeave(row) {
  guarded(async () => {
    try {
      await ElMessageBox.confirm(
        `确定撤回「${row.username}」${row.start_date}~${row.end_date} 已批准的请假吗？撤回后重新进入待审批，其考勤按缺勤回算。`,
        '撤回批准', { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' })
    } catch { return }
    try {
      await api.post(`/camp/leave/${row.id}/revoke`)
      ElMessage.success('已撤回，该请假重新进入待审批')
      fetchLeaves()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '撤回失败')
    }
  })
}

// ?focus=<leaveId> 深链
const { focusId } = useFocusRow()
bindFocusToTable(tableRef, filteredLeaves, focusId)

onMounted(fetchLeaves)
</script>

<style scoped>
.camp-leaves-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}
</style>
