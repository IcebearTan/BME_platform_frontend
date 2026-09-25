<template>
  <div class="camp-staff-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">负责人与老师</div>
      </div>

      <DewCard no-hover class="table-card">
        <template #header>
          <div class="card-head">
            <span>主负责人是营期第一责任人（通知优先接收人）；协同老师可审批报名、管理成员与处理请假</span>
            <div style="display: flex; gap: 8px;">
              <el-button type="primary" size="small" @click="openStaffAssign('teacher')">委任协同老师</el-button>
              <el-button size="small" @click="openStaffAssign('owner')">委任主负责人</el-button>
            </div>
          </div>
        </template>

        <el-alert v-if="!activeOwner" type="warning" :closable="false" class="staff-alert"
          title="本营尚未指定主负责人：报名、请假等通知目前兜底发给全部管理员，请尽快委任" />
        <el-table :data="staffRows" border size="small" v-loading="staffLoading">
          <el-table-column label="用户" prop="username" min-width="110" />
          <el-table-column label="职责" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'owner' ? 'primary' : 'info'" size="small">
                {{ row.role === 'owner' ? '主负责人' : '协同老师' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '生效中' : '已结束' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="委任" min-width="150">
            <template #default="{ row }">
              {{ row.assigned_by_name || '—' }} · {{ row.assigned_at ? row.assigned_at.slice(0, 16).replace('T', ' ') : '' }}
            </template>
          </el-table-column>
          <el-table-column label="结束" min-width="150">
            <template #default="{ row }">
              <template v-if="row.status === 'ended'">
                {{ row.ended_by_name || '—' }} · {{ row.ended_at ? row.ended_at.slice(0, 16).replace('T', ' ') : '' }}
                <span v-if="row.end_reason">（{{ row.end_reason }}）</span>
              </template>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <template v-if="row.status === 'active'">
                <el-button v-if="row.role === 'teacher'" size="small" type="danger" link
                  @click="endStaff(row)">解除</el-button>
                <el-button v-if="row.role === 'teacher'" size="small" type="primary" link
                  @click="transferOwner(row)">转交为主负责人</el-button>
                <el-button v-if="row.role === 'owner'" size="small" type="warning" link
                  @click="endStaff(row)">解除（回到管理员兜底）</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
        <h4 class="staff-sec-title">职责变更记录</h4>
        <el-table :data="staffEvents" border size="small">
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ (row.occurred_at || '').slice(0, 16).replace('T', ' ') }}</template>
          </el-table-column>
          <el-table-column label="用户" prop="username" width="110" />
          <el-table-column label="动作" width="110">
            <template #default="{ row }">
              {{ { assign: '委任', promote: '升级', demote: '降级', transfer: '转交', end: '结束' }[row.action] || row.action }}
              <span v-if="row.before_role || row.after_role">
                （{{ { owner: '主负责人', teacher: '老师' }[row.before_role] || '—' }} → {{ { owner: '主负责人', teacher: '老师' }[row.after_role] || '—' }}）
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作人" prop="operator_name" width="110" />
          <el-table-column label="原因" prop="reason" min-width="140" show-overflow-tooltip />
        </el-table>
      </DewCard>

      <!-- 委任营期负责人（阶段 1，CampStaff） -->
      <el-dialog v-model="staffDlg.visible" :title="staffDlg.role === 'owner' ? '委任主负责人' : '委任协同老师'" width="480px">
        <el-form label-width="80px">
          <el-form-item label="用户" required>
            <el-select v-model="staffDlg.userId" filterable remote reserve-keyword
              :remote-method="searchStaffCandidates" :loading="staffDlg.searching"
              placeholder="输入姓名搜索普通用户" style="width: 100%;">
              <el-option v-for="u in staffDlg.options" :key="u.id"
                :label="`${u.username}（LV${u.level || 1}${u.institute ? ' · ' + u.institute : ''}）`"
                :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="staffDlg.role === 'owner'" label="说明">
            <div class="dlg-hint">
              主负责人是营期第一责任人（每营一个）；本营已有主负责人时将自动转交给新负责人并通知双方
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="staffDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="staffDlg.submitting" @click="submitStaffAssign">委任</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createGuardedAction } from '../shared/guardedAction'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, canManage } = ctx

const staffRows = ref([])
const staffEvents = ref([])
const staffLoading = ref(false)
const staffDlg = reactive({
  visible: false, role: 'teacher', userId: null, options: [],
  searching: false, submitting: false,
})
const activeOwner = computed(() =>
  staffRows.value.find((r) => r.role === 'owner' && r.status === 'active'))

async function fetchStaff() {
  staffLoading.value = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/staff`)
    staffRows.value = res.data?.staff || []
    staffEvents.value = res.data?.events || []
  } catch { /* 静默：负责人页数据失败不拖挂工作区 */ }
  finally { staffLoading.value = false }
}

let staffSearchTimer = null
function searchStaffCandidates(keyword) {
  clearTimeout(staffSearchTimer)
  staffSearchTimer = setTimeout(async () => {
    const q = (keyword || '').trim()
    if (!q) { staffDlg.options = []; return }
    staffDlg.searching = true
    try {
      const res = await api.get('/user/search', { params: { keyword: q, page_size: 20 } })
      staffDlg.options = res.data?.users || []
    } catch { staffDlg.options = [] }
    finally { staffDlg.searching = false }
  }, 250)
}

function openStaffAssign(role) {
  staffDlg.role = role
  staffDlg.userId = null
  staffDlg.options = []
  staffDlg.visible = true
}

async function submitStaffAssign() {
  if (!staffDlg.userId) { ElMessage.warning('请先搜索并选择用户'); return }
  staffDlg.submitting = true
  try {
    if (staffDlg.role === 'owner') {
      // 已有主负责人 → 转交口径（结束旧 owner + 落新 owner，事务内完成并通知双方）
      if (activeOwner.value) {
        const name = staffDlg.options.find((o) => o.id === staffDlg.userId)?.username || '新负责人'
        try {
          await ElMessageBox.confirm(
            `本营主负责人为「${activeOwner.value.username}」，将转交给「${name}」并通知双方`, '转交主负责人',
            { confirmButtonText: '转交', cancelButtonText: '取消', type: 'warning' })
        } catch { staffDlg.submitting = false; return }
        await api.post(`/camp/sessions/${campId.value}/staff/transfer-owner`, { user_id: staffDlg.userId })
        ElMessage.success('主负责人已转交')
      } else {
        await api.post(`/camp/sessions/${campId.value}/staff`, { user_id: staffDlg.userId, role: 'owner' })
        ElMessage.success('已委任主负责人')
      }
    } else {
      await api.post(`/camp/sessions/${campId.value}/staff`, { user_id: staffDlg.userId, role: 'teacher' })
      ElMessage.success('已委任协同老师')
    }
    staffDlg.visible = false
    fetchStaff()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '委任失败')
  } finally {
    staffDlg.submitting = false
  }
}

const { guarded } = createGuardedAction()

function endStaff(row) {
  guarded(async () => {
    let reason = ''
    try {
      const { value } = await ElMessageBox.prompt(
        `可填写解除原因（将通知「${row.username}」）`,
        row.role === 'owner' ? '解除主负责人（本营回到管理员兜底）' : '解除协同老师',
        { confirmButtonText: '解除', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' })
      reason = value || ''
    } catch { return }
    try {
      await api.post(`/camp/sessions/${campId.value}/staff/${row.user_id}/end`, { reason })
      ElMessage.success('已解除')
      fetchStaff()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败')
    }
  })
}

function transferOwner(row) {
  guarded(async () => {
    let reason = ''
    try {
      const { value } = await ElMessageBox.prompt(
        `将把主负责人从「${activeOwner.value?.username || '—'}」转交给「${row.username}」，双方都会收到通知`,
        '转交主负责人', { confirmButtonText: '转交', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' })
      reason = value || ''
    } catch { return }
    try {
      await api.post(`/camp/sessions/${campId.value}/staff/transfer-owner`, { user_id: row.user_id, reason })
      ElMessage.success('主负责人已转交')
      fetchStaff()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败')
    }
  })
}

onMounted(fetchStaff)
</script>

<style scoped>
.camp-staff-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.table-card :deep(.dew-card__header) {
  padding: 14px 18px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  width: 100%;
}

.staff-alert {
  margin: 12px;
}

.staff-sec-title {
  margin: 16px 12px 8px;
  font-size: 14px;
  font-weight: 600;
}

.dlg-hint {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
