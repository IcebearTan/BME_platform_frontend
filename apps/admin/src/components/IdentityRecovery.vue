<script setup>
// 恢复申诉队列（D3c，规格 7.4）：决策（24/72h 冷静期 + 特权双人复核）/ 届满标记完成。
// 执行动作（凭据重置/撤会话）走既有运维通道（find_password/人工重置+bump），本页管状态机与留痕。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])
const statusFilter = ref('submitted')

const KIND_TEXT = { account_lost: '账号丢失', factor_lost: '动态口令丢失' }
const STATE_TEXT = {
  draft: '待邮箱验证', submitted: '待审核', cooldown: '冷静期中',
  done: '已完成', rejected: '已驳回',
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const res = await api({
      url: '/admin/identity/recovery-cases', method: 'get',
      params: { status: statusFilter.value },
    })
    if (res.data.code === 200) rows.value = res.data.cases || []
  } catch {
    ElMessage.error('队列加载失败')
  } finally {
    loading.value = false
  }
}

const detail = ref({ visible: false, row: null, note: '', busy: false })

const openDetail = (row) => {
  detail.value = { visible: true, row, note: '', busy: false }
}

const errMsg = (error) => {
  const m = error?.response?.data?.message
  return (typeof m === 'string' && m) || '操作失败，请稍后重试'
}

const decide = async (decision) => {
  const d = detail.value
  if (decision === 'rejected' && !d.note.trim()) {
    ElMessage.warning('驳回必须填写原因')
    return
  }
  if (decision === 'approved' && d.row.kind === 'factor_lost' && !d.note.trim()) {
    ElMessage.warning('批准恢复请注明核对依据（名册/既有关系），便于复核')
  }
  d.busy = true
  try {
    const res = await api({
      url: `/admin/identity/recovery-cases/${d.row.id}/decision`, method: 'post',
      data: { decision, note: d.note },
    })
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || '已决策')
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

const complete = async (row) => {
  try {
    const res = await api({
      url: `/admin/identity/recovery-cases/${row.id}/complete`, method: 'post' })
    if (res.data.code === 200) {
      ElMessage.success('已标记完成（请在执行通道完成凭据重置与撤会话）')
      fetchQueue()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error(errMsg(error))
  }
}

onMounted(fetchQueue)
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">恢复申诉</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="statusFilter" style="width: 150px" @change="fetchQueue">
              <el-option label="待审核" value="submitted" />
              <el-option label="冷静期中" value="cooldown" />
              <el-option label="待邮箱验证" value="draft" />
              <el-option label="已完成" value="done" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="全部" value="all" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%"
                height="calc(100vh - 320px)" :row-style="{ height: '50px' }">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ KIND_TEXT[row.kind] || row.kind }}</template>
        </el-table-column>
        <el-table-column prop="target_email" label="丢失账号邮箱" min-width="170" show-overflow-tooltip />
        <el-table-column prop="contact_email" label="联系邮箱" min-width="170" show-overflow-tooltip />
        <el-table-column label="邮箱已验" width="90">
          <template #default="{ row }">
            <el-tag :type="row.contact_verified ? 'success' : 'info'" effect="plain" size="small">
              {{ row.contact_verified ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'submitted' ? 'warning' : 'info'" effect="plain" size="small">
              {{ STATE_TEXT[row.status] || row.status }}
            </el-tag>
            <el-tag v-if="row.require_two" type="danger" effect="plain" size="small">双人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cooldown_until" label="冷静期至" width="140" />
        <el-table-column prop="created_at" label="提交时间" width="140" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'cooldown'" link type="success"
                       @click="complete(row)">标记完成</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <el-dialog v-model="detail.visible" title="恢复申诉详情" width="560px" append-to-body>
      <template v-if="detail.row">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="类型">{{ KIND_TEXT[detail.row.kind] }}</el-descriptions-item>
          <el-descriptions-item label="丢失账号">{{ detail.row.target_email }}</el-descriptions-item>
          <el-descriptions-item label="联系邮箱">{{ detail.row.contact_email }}
            （{{ detail.row.contact_verified ? '已验证' : '未验证' }}）</el-descriptions-item>
          <el-descriptions-item label="陈述">{{ detail.row.statement }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.row.decision_note" label="决策记录">
            {{ detail.row.decision_note }}
          </el-descriptions-item>
        </el-descriptions>
        <p class="review-note">
          核对要点：按已确认名册、既有营期/组织关系与可核对记录验证；安全问题和公开资料
          不可作为唯一证据；不要求证件照片。特权案例（双人标记）需两名不同审核人批准，
          冷静期 72 小时；普通案例 24 小时。执行=在既有通道重置凭据并撤旧会话。
        </p>
        <el-input v-model="detail.note" placeholder="核对依据/备注（驳回必填）" />
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detail.visible = false">关闭</el-button>
          <el-button :loading="detail.busy" @click="decide('rejected')">驳回</el-button>
          <el-button type="primary" :loading="detail.busy"
                     :disabled="detail.row?.status !== 'submitted'" @click="decide('approved')">
            批准（进入冷静期）
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.review-note { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.7; margin: 10px 0; }
</style>
