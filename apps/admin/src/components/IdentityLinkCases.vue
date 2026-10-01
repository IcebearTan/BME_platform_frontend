<script setup>
// 关联案例审核（D4）：队列 / 空壳扫描结果 / 批准 / 驳回（阻断项双人批准，规格 12.2）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])
const stateFilter = ref('awaiting_review')

const STATE_TEXT = {
  collecting: '证明收集中', proof_ready: '证明齐备', preview_ready: '待用户确认',
  awaiting_review: '待审核', approved_waiting_confirmation: '批准待确认',
  applied: '已完成', cancelled: '已取消', expired: '已过期', failed: '已失败',
}

const BLOCKER_TEXT = {
  target_privileged: '目标账号含特权', target_banned: '目标账号被封禁',
  target_lifecycle: '目标账号生命周期异常', target_person_missing: '目标缺人员档案',
  target_disputed: '目标身份争议中', target_has_business_data: '目标有业务数据',
}

const blockerLabel = (b) => {
  if (b.startsWith('scan_error:')) return `扫描异常：${b.slice(12)}`
  return BLOCKER_TEXT[b] || b
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const res = await api({
      url: '/admin/identity/link-cases', method: 'get',
      params: { state: stateFilter.value },
    })
    if (res.data.code === 200) rows.value = res.data.cases || []
  } catch {
    ElMessage.error('队列加载失败')
  } finally {
    loading.value = false
  }
}

const detail = ref({ visible: false, row: null, reason: '', busy: false })

const openDetail = (row) => {
  detail.value = { visible: true, row, reason: '', busy: false }
}

const errMsg = (error) => {
  const m = error?.response?.data?.message
  return (typeof m === 'string' && m) || '操作失败，请稍后重试'
}

const decide = async (decision) => {
  const d = detail.value
  if (decision === 'rejected' && !d.reason.trim()) {
    ElMessage.warning('驳回必须填写原因')
    return
  }
  d.busy = true
  try {
    const res = await api({
      url: `/admin/identity/link-cases/${d.row.id}/decision`,
      method: 'post',
      data: { decision, reason: d.reason },
    })
    if (res.data.code === 200) {
      const state = res.data.state
      if (decision === 'approved' && state === 'awaiting_review') {
        ElMessage.success('已记录一份批准；存在阻断项的案例需第二名审核人批准')
      } else {
        ElMessage.success(decision === 'approved' ? '已批准，等待用户确认执行' : '已驳回')
      }
      d.visible = false
      fetchQueue()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error(errMsg(error))
  } finally {
    d.busy = false
  }
}

onMounted(fetchQueue)
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">关联案例审核</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="stateFilter" style="width: 170px" @change="fetchQueue">
              <el-option label="待审核" value="awaiting_review" />
              <el-option label="批准待确认" value="approved_waiting_confirmation" />
              <el-option label="已完成" value="applied" />
              <el-option label="全部" value="all" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%"
                height="calc(100vh - 320px)" :row-style="{ height: '50px' }">
        <el-table-column prop="id" label="案例" width="110" show-overflow-tooltip />
        <el-table-column prop="account_a" label="发起账号" width="90" />
        <el-table-column prop="account_b" label="目标账号" width="90" />
        <el-table-column label="空壳扫描" min-width="200">
          <template #default="{ row }">
            <el-tag v-if="row.scan?.is_shell" type="success" effect="plain" size="small">
              空壳（可自助）
            </el-tag>
            <template v-else>
              <el-tag type="danger" effect="plain" size="small">有阻断项</el-tag>
              <span class="muted">{{ (row.scan?.blockers || []).map(blockerLabel).join('、') }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag :type="row.state === 'awaiting_review' ? 'warning' : 'info'"
                    effect="plain" size="small">
              {{ STATE_TEXT[row.state] || row.state }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="140" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <el-dialog v-model="detail.visible" title="关联案例审核" width="520px" append-to-body>
      <template v-if="detail.row">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="案例">{{ detail.row.id }}</el-descriptions-item>
          <el-descriptions-item label="发起 / 目标">
            user#{{ detail.row.account_a }} → user#{{ detail.row.account_b }}
          </el-descriptions-item>
          <el-descriptions-item label="空壳扫描">
            <span v-if="detail.row.scan?.is_shell">空壳：双方证明齐备即可自助归并</span>
            <span v-else class="danger">
              阻断项：{{ (detail.row.scan?.blockers || []).map(blockerLabel).join('、') }}
              ——需两名不同审核人批准
            </span>
          </el-descriptions-item>
        </el-descriptions>
        <p class="review-note">
          审核要点：核对双方声明与名册一致性；「目标有业务数据」的案例归并前需先
          编排业务交接（当前批次一律可驳回并注明待交接）。
        </p>
        <el-input v-model="detail.reason" placeholder="驳回原因（驳回必填）" />
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detail.visible = false">关闭</el-button>
          <el-button :loading="detail.busy" @click="decide('rejected')">驳回</el-button>
          <el-button type="primary" :loading="detail.busy"
                     :disabled="detail.row?.state !== 'awaiting_review'" @click="decide('approved')">
            批准
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
.danger { color: var(--el-color-danger); }
.review-note { color: var(--el-text-color-secondary); font-size: 12px; margin: 10px 0; }
</style>
