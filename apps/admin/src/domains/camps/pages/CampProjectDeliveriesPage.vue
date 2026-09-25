<template>
  <div class="camp-pdeli-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">交付审核</div>
      </div>

      <h4 class="sec-title">待审核材料（{{ pending.length }}）</h4>
      <div v-if="!pending.length" class="hint" style="padding: 8px 0 4px;">没有待你审核的材料</div>
      <DewCard v-else no-hover class="table-card">
        <el-table :data="pending" border size="small">
          <el-table-column label="项目" prop="unit_name" min-width="120" />
          <el-table-column label="节点" prop="milestone_title" min-width="110" />
          <el-table-column label="提交人" prop="submitted_by_name" width="100" />
          <el-table-column label="版本" prop="version" width="60" align="center" />
          <el-table-column label="内容" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.content || '（仅附件）' }}</template>
          </el-table-column>
          <el-table-column label="附件" width="90" align="center">
            <template #default="{ row }">
              <span v-if="!row.attachments?.length" class="hint">—</span>
              <a v-for="a in row.attachments" :key="a.id" :href="`/api/camp/submissions/attachments/${a.id}`"
                 target="_blank" style="font-size: 12px; margin-right: 6px;">{{ a.filename }}</a>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center">
            <template #default="{ row }">
              <el-button size="small" type="success" plain @click="reviewDelivery(row, 'approve')">通过</el-button>
              <el-button size="small" type="danger" plain @click="reviewDelivery(row, 'return')">退回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </DewCard>

      <h4 class="sec-title" style="margin-top: 16px;">成果核验（{{ outcomes.length }}）</h4>
      <div v-if="!outcomes.length" class="hint" style="padding: 8px 0 4px;">尚无成果登记（负责人在项目工作台登记）</div>
      <DewCard v-else no-hover class="table-card">
        <el-table :data="outcomes" border size="small">
          <el-table-column label="项目" prop="unit_name" min-width="120" />
          <el-table-column label="成果" prop="title" min-width="150" />
          <el-table-column label="说明" prop="description" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="{ verified: 'success', rejected: 'danger', submitted: 'warning' }[row.status]" size="small" effect="plain">
                {{ { verified: '已核验', rejected: '已驳回', submitted: '待核验' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="操作" width="130" align="center">
            <template #default="{ row }">
              <template v-if="row.status !== 'verified'">
                <el-button size="small" type="success" plain @click="verifyOutcome(row, 'verify')">核验</el-button>
                <el-button size="small" type="danger" plain @click="verifyOutcome(row, 'reject')">驳回</el-button>
              </template>
              <span v-else class="hint">已入档</span>
            </template>
          </el-table-column>
        </el-table>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, canManage, manageWritable } = ctx

const pending = ref([])
const outcomes = ref([])

async function fetchDeliveryAdmin() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/delivery-admin`)
    pending.value = res.data.pending_reviews || []
    outcomes.value = res.data.outcomes || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载交付审核数据失败')
  }
}

async function reviewDelivery(row, action) {
  try {
    let body = { action }
    if (action === 'return') {
      const { value } = await ElMessageBox.prompt('退回说明（提交人重提时可见）：', '退回材料', {
        confirmButtonText: '退回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '说明必填',
      })
      body.note = value.trim()
    }
    await api.post(`/camp/submissions/${row.submission_id}/review`, body)
    ElMessage.success(action === 'approve' ? '已验收' : '已退回')
    fetchDeliveryAdmin()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

async function verifyOutcome(row, action) {
  try {
    let body = { action }
    if (action === 'reject') {
      const { value } = await ElMessageBox.prompt('驳回原因：', '驳回成果', {
        confirmButtonText: '驳回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      })
      body.reason = value.trim()
    }
    await api.post(`/camp/outcomes/${row.id}/verify`, body)
    ElMessage.success(action === 'verify' ? '已核验' : '已驳回')
    fetchDeliveryAdmin()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

onMounted(fetchDeliveryAdmin)
</script>

<style scoped>
.camp-pdeli-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sec-title { margin: 8px 0; font-size: 14px; font-weight: 600; }
.hint { color: var(--text-secondary); font-size: 12px; }
.table-card :deep(.dew-card__body) { padding: 0; }
</style>
