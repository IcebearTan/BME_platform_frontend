<script setup>
// 身份核验审核（D4）：待审队列 / 详情 / 批准 / 驳回（核验负责人制，规格 12.2）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])
const schools = ref([])
const filter = ref({ school_id: '', status: 'submitted' })

const STATUS_TEXT = {
  draft: '草稿', submitted: '待审核', reviewing: '审核中',
  approved: '已通过', rejected: '已驳回', withdrawn: '已撤回',
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const params = {}
    if (filter.value.status) params.status = filter.value.status
    if (filter.value.school_id) params.school_id = filter.value.school_id
    const res = await api({ url: '/admin/identity/queue', method: 'get', params })
    if (res.data.code === 200) rows.value = res.data.applications || []
  } catch {
    ElMessage.error('队列加载失败')
  } finally {
    loading.value = false
  }
}

const fetchSchools = async () => {
  try {
    const res = await api({ url: '/admin/identity/schools', method: 'get' })
    if (res.data.code === 200) schools.value = res.data.schools || []
  } catch { /* 学校清单失败不阻塞队列 */ }
}

const detail = ref({ visible: false, row: null, note: '', reason: '', busy: false })

const openDetail = (row) => {
  detail.value = { visible: true, row, note: '', reason: '', busy: false }
}

const errMsg = (error) => {
  const m = error?.response?.data?.message
  return (typeof m === 'string' && m) || '操作失败，请稍后重试'
}

const decide = async (decision) => {
  const d = detail.value
  if (decision === 'rejected' && !d.reason.trim()) {
    ElMessage.warning('驳回必须填写原因（申请人可见）')
    return
  }
  d.busy = true
  try {
    const res = await api({
      url: `/admin/identity/applications/${d.row.id}/${decision}`,
      method: 'post',
      data: decision === 'approved' ? { note: d.note } : { reason: d.reason },
    })
    if (res.data.code === 200) {
      ElMessage.success(decision === 'approved' ? '已核验通过' : '已驳回')
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

onMounted(() => { fetchQueue(); fetchSchools() })
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">身份核验审核</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="学校">
            <el-select v-model="filter.school_id" clearable placeholder="全部学校" style="width: 160px"
                       @change="fetchQueue">
              <el-option v-for="s in schools" :key="s.school_id" :label="s.name" :value="s.school_id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filter.status" style="width: 140px" @change="fetchQueue">
              <el-option label="待审核" value="submitted" />
              <el-option label="草稿" value="draft" />
              <el-option label="已通过" value="approved" />
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
        <el-table-column label="申请人" min-width="150">
          <template #default="{ row }">
            {{ row.applicant?.username || '-' }}
            <span class="muted">（{{ row.applicant?.email }}）</span>
          </template>
        </el-table-column>
        <el-table-column prop="school_id" label="学校" width="90" />
        <el-table-column prop="claimed_name" label="声明姓名" width="110" />
        <el-table-column prop="claimed_identifier" label="NetID" width="130" />
        <el-table-column prop="contact_email" label="验证邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="邮箱证明" width="100">
          <template #default="{ row }">
            <el-tag :type="row.challenge_verified ? 'success' : 'info'" effect="plain" size="small">
              {{ row.challenge_verified ? '已验证' : '未验证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'submitted' ? 'warning' : 'info'" effect="plain" size="small">
              {{ STATUS_TEXT[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="140" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 审核详情 -->
    <el-dialog v-model="detail.visible" title="核验审核" width="520px" append-to-body>
      <template v-if="detail.row">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="声明姓名">{{ detail.row.claimed_name }}</el-descriptions-item>
          <el-descriptions-item label="NetID">{{ detail.row.claimed_identifier }}</el-descriptions-item>
          <el-descriptions-item label="验证邮箱">{{ detail.row.contact_email }}</el-descriptions-item>
          <el-descriptions-item label="邮箱证明">
            {{ detail.row.challenge_verified ? `已验证（${detail.row.challenge_verified_at}）` : '未验证' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ detail.row.applicant?.username }}（{{ detail.row.applicant?.email }}，
            kind={{ detail.row.applicant?.account_kind }}）
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.row.identifier_registered_to" label="冲突提示">
            <span class="danger">该 NetID 已登记在 person#{{ detail.row.identifier_registered_to }} 名下</span>
          </el-descriptions-item>
        </el-descriptions>
        <p class="review-note">
          批准前请按名册核对姓名与成员身份；邮箱证明只证明邮箱控制权，不等于名册核对。
        </p>
        <el-input v-model="detail.note" placeholder="批准备注（可选，如名册核对依据）" />
        <el-input v-model="detail.reason" placeholder="驳回原因（必填，申请人可见，支持修正后重新申请）"
                  class="reason-input" />
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detail.visible = false">关闭</el-button>
          <el-button :loading="detail.busy" @click="decide('rejected')">驳回</el-button>
          <el-button type="primary" :loading="detail.busy"
                     :disabled="detail.row?.status !== 'submitted'" @click="decide('approved')">
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
.reason-input { margin-top: 10px; }
</style>
