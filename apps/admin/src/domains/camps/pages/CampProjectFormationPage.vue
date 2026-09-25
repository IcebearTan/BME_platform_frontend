<template>
  <div class="camp-pform-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">项目组队</div>
      </div>

      <div style="margin: 0 0 12px;">
        <el-button size="small" :loading="pExporting" @click="exportProjectCsv">导出项目志愿 CSV</el-button>
        <el-button size="small" type="primary" plain :disabled="status !== 'selecting'" @click="openProjectBatch">
          批量回填
        </el-button>
        <span class="hint">
          {{ status === 'selecting'
            ? '选择阶段：导出志愿线下协调后批量回填；负责人也可在工作台自行勾选'
            : '批量回填仅选择阶段可用；开营后成员变更走下方管理员操作（原因必填留痕）' }}
        </span>
      </div>

      <DewCard no-hover class="table-card">
        <el-table :data="pOverview.projects || []" border size="small" v-loading="pOverviewLoading">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="papp-expand">
                <p v-for="m in row.members" :key="m.user_id">
                  <el-tag :type="m.role === 'leader' ? 'warning' : 'info'" size="small" effect="plain" style="margin-right:8px">
                    {{ m.role === 'leader' ? '负责人' : '成员' }}
                  </el-tag>
                  {{ m.username }}
                  <span v-if="m.status === 'ended'" class="hint">（已退出）</span>
                  <el-button v-else-if="m.role !== 'leader' && manageWritable" size="small" type="danger" text
                    style="margin-left: 8px;" @click="endProjectMember(row, m)">移除</el-button>
                </p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="项目" prop="name" min-width="150" />
          <el-table-column label="负责人" prop="leader_name" width="110" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="{ active: 'success', paused: 'warning', terminated: 'danger' }[row.status]" size="small" effect="plain">
                {{ { active: '进行中', paused: '已暂停', terminated: '已终止' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="成员数" width="70" align="center">
            <template #default="{ row }">{{ row.members?.filter((m) => m.status === 'active').length ?? 0 }}</template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="管理员操作" width="230" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="changeProjectLeader(row)">换负责人</el-button>
              <el-button v-if="row.status === 'active'" size="small" type="warning" plain @click="setProjectStatus(row, 'paused')">暂停</el-button>
              <el-button v-else-if="row.status === 'paused'" size="small" type="success" plain @click="setProjectStatus(row, 'active')">恢复</el-button>
              <el-button v-if="row.status !== 'terminated'" size="small" type="danger" plain @click="setProjectStatus(row, 'terminated')">终止</el-button>
            </template>
          </el-table-column>
        </el-table>
      </DewCard>

      <el-collapse style="margin-top: 4px;">
        <el-collapse-item :title="`变更事件流（最近 ${pOverview.events?.length ?? 0} 条）`">
          <el-table :data="pOverview.events || []" border size="small">
            <el-table-column label="时间" prop="occurred_at" width="160" />
            <el-table-column label="项目" min-width="120">
              <template #default="{ row }">{{ pUnitName(row.unit_id) }}</template>
            </el-table-column>
            <el-table-column label="对象" prop="username" width="100" />
            <el-table-column label="动作" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ pActionLabel(row.action) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100" align="center">
              <template #default="{ row }">
                {{ { leader_pick: '负责人勾选', admin_adjust: '管理员', apply: '申报', approve: '过审' }[row.source] || row.source }}
              </template>
            </el-table-column>
            <el-table-column label="原因" prop="reason" min-width="140" show-overflow-tooltip />
          </el-table>
        </el-collapse-item>
      </el-collapse>

      <!-- 批量回填项目成员（线下协调结果；逐项回报） -->
      <el-dialog v-model="pBatchDlg.visible" title="批量回填项目成员" width="720px" v-loading="pBatchDlg.loading">
        <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
          title="为成员逐行选择项目后提交；已在项目内、达 3 上限、失败的行会就地标注结果" />
        <div v-if="!pBatchDlg.rows.length" class="hint" style="padding: 10px 0;">本营暂无可回填成员</div>
        <el-table v-else :data="pBatchDlg.rows" border size="small" max-height="420">
          <el-table-column label="成员" prop="username" min-width="100" />
          <el-table-column label="已参与" width="80" align="center">
            <template #default="{ row }">{{ row._count }}</template>
          </el-table-column>
          <el-table-column label="加入项目" min-width="200">
            <template #default="{ row }">
              <el-select v-model="row._unit" size="small" placeholder="选择项目" style="width: 100%;" :disabled="!!row._result">
                <el-option v-for="p in pActiveProjects" :key="p.unit_id" :label="`${p.name}（${p.leader_name}）`" :value="p.unit_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="结果" min-width="200">
            <template #default="{ row }">
              <template v-if="row._result">
                <el-tag :type="pBatchStatusMeta(row._result.status).tag" size="small" effect="plain">
                  {{ pBatchStatusMeta(row._result.status).label }}
                </el-tag>
                <span class="batch-msg">{{ row._result.message }}</span>
              </template>
              <span v-else class="hint">—</span>
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="pBatchDlg.visible = false">关闭</el-button>
            <el-button type="primary" :loading="pBatchDlg.submitting" @click="submitProjectBatch">提交回填</el-button>
          </div>
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
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, status, canManage, manageWritable } = ctx

const pOverview = reactive({ projects: [], events: [] })
const pOverviewLoading = ref(false)
const pExporting = ref(false)
const pBatchDlg = reactive({ visible: false, rows: [], loading: false, submitting: false })

const pActiveProjects = computed(() => (pOverview.projects || []).filter((p) => p.status === 'active'))
const pUnitName = (unitId) => pOverview.projects?.find((p) => p.unit_id === unitId)?.name || `#${unitId}`
const pActionLabel = (a) => ({
  select: '加入', deselect: '移出', exit: '退出', remove: '移除',
  adjust: '调剂', leader_change: '换负责人', unit_status: '状态变更',
}[a] || a)
const pBatchStatusMeta = (s) => ({
  assigned: { tag: 'success', label: '已加入' }, skipped: { tag: 'info', label: '跳过' },
  conflict: { tag: 'warning', label: '达上限' }, error: { tag: 'danger', label: '失败' },
}[s] || { tag: 'info', label: s })

async function fetchProjectOverview() {
  pOverviewLoading.value = true
  try {
    const res = await api.get(`/camp/projects/${campId.value}/overview`)
    pOverview.projects = res.data.projects || []
    pOverview.events = res.data.events || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载组队总览失败')
  } finally { pOverviewLoading.value = false }
}

async function exportProjectCsv() {
  pExporting.value = true
  try {
    const res = await api.get(`/camp/projects/${campId.value}/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `camp_${campId.value}_project_preferences.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('导出失败，请稍后重试')
  } finally { pExporting.value = false }
}

async function fetchAllMemberRows(roles) {
  const rows = []
  let page = 1
  while (true) {
    const res = await api.get(`/camp/sessions/${campId.value}/members`, {
      params: { page, page_size: 100, role: roles },
    })
    const batch = res.data?.members || []
    rows.push(...batch)
    const total = res.data?.total ?? rows.length
    if (!batch.length || rows.length >= total) return rows
    page += 1
  }
}

async function openProjectBatch() {
  // 行=营期池内成员（member/student），显示已参与项目数
  const countOf = (uid) => (pOverview.projects || []).filter(
    (p) => p.members?.some((m) => m.user_id === uid && m.status === 'active')).length
  pBatchDlg.visible = true
  pBatchDlg.loading = true
  try {
    const rows = await fetchAllMemberRows('member,student')
    pBatchDlg.rows = rows.map((m) => ({
      user_id: m.user_id, username: m.username,
      _unit: null, _result: null, _count: countOf(m.user_id),
    }))
  } catch (e) {
    pBatchDlg.rows = []
    ElMessage.error(e.response?.data?.message || '加载可回填成员失败')
  } finally {
    pBatchDlg.loading = false
  }
}

async function submitProjectBatch() {
  const rows = pBatchDlg.rows.filter((r) => r._unit && !r._result)
  if (!rows.length) { ElMessage.warning('请先为至少一行选择项目'); return }
  pBatchDlg.submitting = true
  try {
    const res = await api.post(`/camp/projects/${campId.value}/assign/batch`, {
      items: rows.map((r) => ({ unit_id: r._unit, user_id: r.user_id })),
    })
    const results = res.data.results || []
    const byKey = new Map(results.map((r) => [`${r.unit_id}:${r.user_id}`, r]))
    for (const r of rows) r._result = byKey.get(`${r._unit}:${r.user_id}`) || null
    const ok = results.filter((r) => r.status === 'assigned').length
    if (ok) ElMessage.success(`已加入 ${ok} 人`)
    const bad = results.filter((r) => r.status !== 'assigned')
    if (bad.length) ElMessage.warning(`${bad.length} 项未成功，结果已就地标注`)
    fetchProjectOverview()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量回填失败')
  } finally {
    pBatchDlg.submitting = false
  }
}

// 变更管理员通道（H-005：开营前后通用，原因必填+事件留痕）
async function endProjectMember(unit, m) {
  try {
    const { value } = await ElMessageBox.prompt(
      `移除「${m.username}」出「${unit.name}」？（历史贡献保留、参与名额即时释放）\n填写原因：`,
      '移除项目成员', {
        confirmButtonText: '移除', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      })
    await api.post(`/camp/units/${unit.unit_id}/members/${m.user_id}/end`,
      { reason: value.trim(), kind: 'remove' })
    ElMessage.success('已移除')
    fetchProjectOverview()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '移除失败')
  }
}

async function changeProjectLeader(unit) {
  try {
    const { value } = await ElMessageBox.prompt(
      `变更「${unit.name}」负责人（当前：${unit.leader_name}）。\n输入新负责人的用户 ID（可从成员列表查）：`,
      '变更负责人', {
        confirmButtonText: '变更', cancelButtonText: '取消',
        inputPattern: /^\d+$/, inputErrorMessage: '请输入用户 ID（数字）',
      })
    const uid = Number(value)
    // 名字就地从本项目成员里查（不再为装饰 toast 拉整张成员表）
    const inUnit = unit.members?.find((m) => m.user_id === uid)
    const { value: reason } = await ElMessageBox.prompt('变更原因：', '变更负责人', {
      confirmButtonText: '确定', cancelButtonText: '取消',
      inputValidator: (v) => !!(v && v.trim()) || '原因必填',
    })
    await api.post(`/camp/units/${unit.unit_id}/leader`,
      { new_leader_id: uid, reason: reason.trim() })
    ElMessage.success(`负责人已变更${inUnit ? `（${inUnit.username}）` : ''}`)
    fetchProjectOverview()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '变更失败')
  }
}

const P_STATUS_TEXT = { paused: '暂停', terminated: '终止', active: '恢复' }
async function setProjectStatus(unit, status) {
  try {
    const { value } = await ElMessageBox.prompt(
      status === 'terminated'
        ? `终止「${unit.name}」？全员退出（历史保留）、不可恢复。填写原因：`
        : `${P_STATUS_TEXT[status]}「${unit.name}」。填写原因：`,
      `${P_STATUS_TEXT[status]}项目`, {
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      })
    await api.post(`/camp/units/${unit.unit_id}/status`, { status, reason: value.trim() })
    ElMessage.success('已处理')
    fetchProjectOverview()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

onMounted(fetchProjectOverview)
</script>

<style scoped>
.camp-pform-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.papp-expand { padding: 4px 12px; }
.papp-expand p { margin: 4px 0; font-size: 12.5px; line-height: 1.7; color: var(--text-regular, #606266); }
.hint { margin-left: 12px; color: var(--text-secondary); font-size: 12px; }
.batch-msg { margin-left: 6px; font-size: 12px; color: var(--text-secondary); }
</style>
