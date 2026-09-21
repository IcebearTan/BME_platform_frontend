<template>
  <div class="camp-applications-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">加入申请</div>
        <div class="header-actions">
          <span class="hint">学员/成员入营申请（导生报名在「导生招募与匹配」）</span>
        </div>
      </div>

      <DewCard no-hover class="table-card">
        <el-alert v-if="!studentJoinRequests.length" type="info" :closable="false" title="暂无待审批的学员申请" />
        <template v-else>
          <div style="margin-bottom: 12px; margin-top: 12px;">
            <el-button type="primary" size="small" :disabled="!stuJoinSel.length" :loading="batchApproving"
              @click="batchApproveJoin(stuJoinSel)">通过选中（{{ stuJoinSel.length }}）</el-button>
            <el-button size="small" :loading="batchApproving"
              @click="confirmApproveAll(studentJoinRequests)">一键通过</el-button>
          </div>
          <el-table ref="tableRef" :data="studentJoinRequests" border size="small" row-key="id"
            highlight-current-row @selection-change="(rows) => (stuJoinSel = rows)">
            <el-table-column type="selection" width="40" />
            <el-table-column label="申请人" prop="username" width="110" />
            <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
            <!-- 09-12 砍学员报名意向大组：组别随归属导生继承（导生组=名片 tags），申请列表不再展示 -->
            <el-table-column label="事由" prop="reason" min-width="140" show-overflow-tooltip />
            <el-table-column label="提交时间" width="110">
              <template #default="{ row }">{{ row.created_at ? row.created_at.slice(0, 10) : '' }}</template>
            </el-table-column>
            <el-table-column label="归属导生" width="140">
              <template #default="{ row }">
                <el-select v-if="row.role === 'student'" v-model="row._mentor" size="small" placeholder="选导生(可选)" style="width:100%">
                  <el-option v-for="m in joinMentors" :key="m.user_id" :label="m.username" :value="m.user_id" />
                </el-select>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button size="small" type="success" link @click="approveJoin(row)">批准</el-button>
                <el-button size="small" type="danger" link @click="rejectJoin(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createGuardedAction } from '../shared/guardedAction'
import { createJoinApproval } from '../shared/joinRequests'
import { useFocusRow, bindFocusToTable } from '../shared/useFocusRow'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, canManage } = ctx

const joinRequests = ref([])
const joinMentors = ref([])
const stuJoinSel = ref([])
const tableRef = ref(null)

// 09-12 重组：学员申请页纯学员/成员（导生报名挪「导生招募与匹配」招募区）
const studentJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role !== 'mentor'))

async function fetchJoinRequests() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/join-requests`)
    joinRequests.value = (res.data.requests || []).map((r) => ({ ...r, _mentor: null }))
    joinMentors.value = res.data.mentors || []
  } catch { /* 非管理角色或无权限，忽略 */ }
}

const { guarded } = createGuardedAction()
const { batchApproving, batchApproveJoin, confirmApproveAll } =
  createJoinApproval(campId, { onDone: fetchJoinRequests })

function approveJoin(row) {
  // 归属导生可选：不指定则学员以 team_mentor_id=null 入营，事后可在「成员名单」改派
  guarded(async () => {
    try {
      const r = await api.post(`/camp/join-requests/${row.id}/approve`, { team_mentor_id: row._mentor })
      ElMessage.success(r.data?.message || '已批准并加入营期')
      fetchJoinRequests()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '审批失败')
    }
  })
}

function rejectJoin(row) {
  guarded(async () => {
    // 拒绝原因可选，会拼进申请人的通知里
    let reason = ''
    try {
      const { value } = await ElMessageBox.prompt(
        `可填写拒绝原因（将通知「${row.username}」）`, '拒绝加入申请',
        { confirmButtonText: '拒绝', cancelButtonText: '取消', inputPlaceholder: '原因（可选）' })
      reason = value || ''
    } catch (e) {
      if (e === 'cancel' || e === 'close') return   // 用户取消，不执行拒绝
      ElMessage.error('操作失败')
      return
    }
    try {
      await api.post(`/camp/join-requests/${row.id}/reject`, { reason })
      ElMessage.success('已拒绝')
      fetchJoinRequests()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败')
    }
  })
}

// ?focus=<requestId> 深链：定位并高亮对应申请行
const { focusId } = useFocusRow()
bindFocusToTable(tableRef, studentJoinRequests, focusId)

onMounted(fetchJoinRequests)
</script>

<style scoped>
.camp-applications-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
