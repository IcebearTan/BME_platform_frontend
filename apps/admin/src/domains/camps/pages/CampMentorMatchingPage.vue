<template>
  <div class="camp-ms-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <!-- ── 导生招募：待审导生报名（自由报名走审核）+ 导入即导生（超管）── -->
      <div class="page-header">
        <div class="page-title">导生招募与匹配</div>
        <div class="header-actions">
          <span class="hint">导生全生命周期一页：招募（报名+导入）→ 流程运营 → 匹配回填</span>
        </div>
      </div>

      <h4 class="ms-sec-title">导生招募</h4>
      <template v-if="mentorJoinRequests.length">
        <div style="margin-bottom: 12px;">
          <el-button type="primary" size="small" :disabled="!mentorJoinSel.length" :loading="batchApproving"
            @click="batchApproveJoin(mentorJoinSel)">通过选中（{{ mentorJoinSel.length }}）</el-button>
          <el-button size="small" :loading="batchApproving"
            @click="confirmApproveAll(mentorJoinRequests)">一键通过</el-button>
        </div>
        <el-table :data="mentorJoinRequests" border size="small"
          @selection-change="(rows) => (mentorJoinSel = rows)">
          <el-table-column type="selection" width="40" />
          <el-table-column label="报名导生" prop="username" width="110" />
          <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
          <el-table-column label="事由" prop="reason" min-width="120" show-overflow-tooltip />
          <el-table-column label="提交时间" width="110">
            <template #default="{ row }">{{ row.created_at ? row.created_at.slice(0, 10) : '' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button size="small" type="success" link @click="approveJoin(row)">批准</el-button>
              <el-button size="small" type="danger" link @click="rejectJoin(row)">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <el-alert v-else type="info" :closable="false"
        :title="gateOn('mentor_level_gate')
          ? '暂无待审的导生报名（LV≥2 学员可在报名窗口内自助报名）'
          : '暂无待审的导生报名（学员可在报名窗口内自助报名，本营未设等级门槛）'"
        style="margin-bottom: 10px;" />

      <template v-if="isSuperAdmin">
        <h4 class="ms-sec-title">导入导生（直接入营，不经报名审核）</h4>
        <el-select v-model="eligibility.pickedId" filterable remote clearable
          class="elig-search" size="small" placeholder="按姓名搜索添加（手头只有名字时用）"
          :remote-method="searchMentorCandidates" :loading="eligibility.searching"
          no-data-text="无匹配用户" @change="addPickedCandidate">
          <el-option v-for="u in eligibility.searchResults" :key="u.user_id"
            :value="u.user_id" :label="u.username" :disabled="u.already_member">
            <div class="elig-opt">
              <span class="elig-opt-name">{{ u.username }}</span>
              <span class="elig-opt-mail">{{ u.email }}</span>
              <span class="elig-opt-meta">
                LV{{ u.level || 1 }}<template v-if="u.institute"> · {{ u.institute }}</template><template v-if="u.major"> · {{ u.major }}</template>
              </span>
              <el-tag v-if="u.already_member" type="info" size="small">已在营</el-tag>
            </div>
          </el-option>
        </el-select>
        <el-input v-model="eligibility.raw" type="textarea" :rows="3"
          placeholder="粘贴导生邮箱，换行或逗号分隔均可，自动去重（上方搜人后自动回填）" />
        <div class="elig-toolbar">
          <el-button size="small" :loading="eligibility.previewing" @click="previewEligibility">预览</el-button>
          <el-button size="small" type="primary" :loading="eligibility.confirming" @click="confirmEligibility">确认导入</el-button>
          <el-divider direction="vertical" />
          <el-select v-model="eligibility.minLevel" size="small" class="elig-level-select">
            <el-option v-for="n in [2, 3, 4]" :key="n" :label="`LV${n} 及以上`" :value="n" />
          </el-select>
          <el-button size="small" :loading="eligibility.generating" @click="generateByLevel">按等级填充</el-button>
        </div>

        <template v-if="eligibility.preview">
          <h4 class="ms-sec-title">预览结果（{{ eligibility.emails.length }} 个邮箱）</h4>
          <el-alert v-if="eligibility.preview.unmatched_emails?.length" type="warning" :closable="false"
            :title="`未匹配账号：${eligibility.preview.unmatched_emails.join('、')}`" style="margin-bottom: 8px;" />
          <el-table :data="eligibility.preview.matched" border size="small">
            <el-table-column label="姓名" prop="username" min-width="110" />
            <el-table-column label="邮箱" prop="email" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.already_member" type="info" size="small">已在营</el-tag>
                <el-tag v-else type="success" size="small">将导入</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </template>

      <!-- 阶段状态 + 手动推进（复用 session_update 改 deadline = 提前截止） -->
      <el-alert v-if="session.mentor_selection_enabled"
        :type="msPhaseAlertType"
        :closable="false"
        :title="`当前阶段：${msPhaseLabel} · 志愿 ${msOverview?.deadlines?.preference_deadline || '—'} 截止`"
      />
      <el-alert v-if="msOverview?.config_error" type="error" :closable="false"
        title="配置不完整：启用但缺少时间点/方向课程，请在「营期设置」补齐" style="margin-top:8px" />
      <template v-if="session.mentor_selection_enabled">
        <div v-if="manageWritable" style="margin: 12px 0;">
          <el-button v-if="msOverview?.phase === 'collecting'" size="small" @click="advanceMs">立即截止志愿</el-button>
          <el-button v-if="isSuperAdmin" size="small" :loading="exporting" @click="exportMsCsv">导出志愿 CSV</el-button>
          <el-button v-if="isSuperAdmin" size="small" type="primary" plain @click="openBatchAssign">批量指派</el-button>
          <span class="hint">截止后导出志愿 CSV 线下协调，再用「批量指派」回填结果</span>
        </div>

        <!-- 导生概览 -->
        <h4 class="ms-sec-title">导生概览</h4>
        <el-table :data="msOverview?.mentors || []" border size="small">
          <el-table-column label="导生" prop="username" min-width="110" />
          <el-table-column label="方向" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.direction" size="small" effect="plain">{{ row.direction }}</el-tag>
              <span v-else style="color: var(--text-secondary);">—</span>
            </template>
          </el-table-column>
          <el-table-column label="名片" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.has_profile" type="success" size="small">已发布</el-tag>
              <el-tag v-else type="warning" size="small">无名片</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="容量" width="70" align="center">
            <template #default="{ row }">{{ row.capacity === null ? '不限' : row.capacity }}</template>
          </el-table-column>
          <el-table-column label="志愿数" prop="chose_r1" width="80" align="center" />
          <el-table-column label="已分配" prop="matched" width="80" align="center" />
          <el-table-column label="剩余" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.remaining === null">不限</span>
              <span v-else :style="row.remaining === 0 ? 'color: var(--warning-color);' : ''">{{ row.remaining }}</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 学员配对（含未匹配指派） -->
        <h4 class="ms-sec-title">学员配对（{{ msOverview?.stats?.matched ?? 0 }} / {{ msOverview?.stats?.students ?? 0 }}）</h4>
        <div class="ms-student-toolbar">
          <el-input v-model="msPage.keyword" clearable placeholder="搜索学员姓名" style="width: 200px;"
            @keyup.enter="applyMsStudentFilter" @clear="applyMsStudentFilter" />
          <el-button @click="applyMsStudentFilter">查询</el-button>
        </div>
        <el-table :data="msOverview?.students || []" border size="small" v-loading="msPage.loading">
          <el-table-column label="学员" prop="username" min-width="110" />
          <el-table-column label="归属导生" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.matched" type="success" size="small">{{ row.mentor_name }}</el-tag>
              <span v-else style="color: var(--warning-color);">未匹配</span>
            </template>
          </el-table-column>
          <el-table-column label="志愿" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.submitted_r1 ? 'info' : 'danger'" size="small" effect="plain">
                {{ row.submitted_r1 ? '已交' : '未交' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="手动指派" min-width="200">
            <template #default="{ row }">
              <el-select v-if="!row.matched" :model-value="null" size="small" placeholder="指派给导生"
                style="width:150px" @change="(v) => assignStudent(row, v)">
                <el-option v-for="m in msOverview?.mentors || []" :key="m.user_id"
                  :label="`${m.username}（余 ${m.remaining}）`" :value="m.user_id" />
              </el-select>
              <span v-else class="hint">改派请到「成员名单」</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="msPage.page" v-model:page-size="msPage.pageSize"
            :total="msPage.total" :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next" @current-change="fetchMsOverview"
            @size-change="changeMsStudentPageSize" />
        </div>
      </template>

      <!-- 批量指派导生（线下协调结果回填：导入 JSON/CSV 批量预填，或逐行手选） -->
      <el-dialog v-model="batchDlg.visible" title="批量指派导生" width="680px" v-loading="batchDlg.loading">
        <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
          title="导入线下协调结果批量填充（也可逐行手选）；已分配、冲突、失败的行会就地标注结果" />
        <el-input v-model="batchDlg.raw" type="textarea" :rows="3"
          placeholder="粘贴协调结果：CSV 每行「学员,导生」（可含表头行），或 JSON [{&quot;student&quot;:&quot;姓名&quot;,&quot;mentor&quot;:&quot;姓名&quot;}] / {&quot;学员&quot;:&quot;导生&quot;}；姓名与用户ID均可匹配" />
        <div class="batch-import-bar">
          <el-button size="small" @click="importBatchText">解析填充</el-button>
          <el-button size="small" @click="batchFileRef?.click()">上传文件（.json / .csv / .txt）</el-button>
          <input ref="batchFileRef" type="file" accept=".json,.csv,.txt" style="display:none" @change="onBatchFile" />
          <span v-if="batchDlg.importNote" class="batch-import-note">{{ batchDlg.importNote }}</span>
        </div>
        <div v-if="!batchDlg.rows.length" class="hint" style="padding: 10px 0;">本营暂无未分配学员</div>
        <el-table v-else :data="batchDlg.rows" border size="small" max-height="360">
          <el-table-column label="学员" prop="username" min-width="100" />
          <el-table-column label="指派导师" min-width="190">
            <template #default="{ row }">
              <el-select v-model="row._mentor" size="small" placeholder="选择导师"
                style="width: 100%;" :disabled="!!row._result">
                <el-option v-for="m in msOverview?.mentors || []" :key="m.user_id"
                  :label="`${m.username}（余 ${m.remaining}）`" :value="m.user_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="结果" min-width="200">
            <template #default="{ row }">
              <template v-if="row._result">
                <el-tag :type="batchStatusMeta(row._result.status).tag" size="small" effect="plain">
                  {{ batchStatusMeta(row._result.status).label }}
                </el-tag>
                <span class="batch-msg">{{ row._result.message }}</span>
              </template>
              <span v-else class="hint">—</span>
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="batchDlg.visible = false">关闭</el-button>
            <el-button type="primary" :loading="batchDlg.submitting" @click="submitBatchAssign">提交指派</el-button>
          </div>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createJoinApproval } from '../shared/joinRequests'
import { createGuardedAction } from '../shared/guardedAction'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, session, canManage, manageWritable, isSuperAdmin, gateOn, load } = ctx

// ── 导生报名（join-requests 里 apply_role=mentor 的子集；本叶自取一份读态） ──
const joinRequests = ref([])
const mentorJoinSel = ref([])
const mentorJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role === 'mentor'))

async function fetchJoinRequests() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/join-requests`)
    joinRequests.value = (res.data.requests || []).map((r) => ({ ...r, _mentor: null }))
  } catch { /* 非管理角色或无权限，忽略 */ }
}

const { guarded } = createGuardedAction()
const { batchApproving, batchApproveJoin, confirmApproveAll } =
  createJoinApproval(campId, { onDone: fetchJoinRequests })

function approveJoin(row) {
  guarded(async () => {
    try {
      const r = await api.post(`/camp/join-requests/${row.id}/approve`, { team_mentor_id: row._mentor })
      // 负责人资格申请（09-13）：后端返回「资格生效可申报」语义，与入营批准区分
      ElMessage.success(r.data?.message || '已批准并加入营期')
      fetchJoinRequests()
      fetchMsOverview()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '审批失败')
    }
  })
}

function rejectJoin(row) {
  guarded(async () => {
    let reason = ''
    try {
      const { value } = await ElMessageBox.prompt(
        `可填写拒绝原因（将通知「${row.username}」）`, '拒绝加入申请',
        { confirmButtonText: '拒绝', cancelButtonText: '取消', inputPlaceholder: '原因（可选）' })
      reason = value || ''
    } catch (e) {
      if (e === 'cancel' || e === 'close') return
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

// ── 导入导生（2026-09-12 资格名单退役：导入即直接成为本营导生，绕过报名审核） ──
const eligibility = reactive({
  raw: '', emails: [],
  preview: null, previewing: false, confirming: false,
  minLevel: 2, generating: false,
  pickedId: null, searchResults: [], searching: false,
})

// 按姓名搜人（只读选人器）：300ms 防抖远程搜索，选中即把邮箱回填导入框
let mentorSearchTimer = null
function searchMentorCandidates(keyword) {
  clearTimeout(mentorSearchTimer)
  const kw = (keyword || '').trim()
  if (!kw) { eligibility.searchResults = []; return }
  mentorSearchTimer = setTimeout(async () => {
    eligibility.searching = true
    try {
      const res = await api.get(`/camp/sessions/${campId.value}/mentor-import/search`, { params: { keyword: kw } })
      eligibility.searchResults = res.data.data?.users || []
    } catch {
      eligibility.searchResults = []
    } finally {
      eligibility.searching = false
    }
  }, 300)
}

function addPickedCandidate(uid) {
  const u = eligibility.searchResults.find((r) => r.user_id === uid)
  eligibility.pickedId = null          // 选完即清空：作为「搜一个加一个」的追加器
  if (!u) return
  const emails = parseEmails()
  if (emails.includes((u.email || '').toLowerCase())) { ElMessage.info('该导生已在导入框中'); return }
  eligibility.raw = eligibility.raw.trim() ? `${eligibility.raw.trim()}\n${u.email}` : u.email
  eligibility.preview = null           // 名单变了，旧预览作废
  ElMessage.success(`已添加 ${u.username}`)
}

// 粘贴文本 → 去重邮箱数组（换行/中英文逗号/分号/空白均可分隔）
function parseEmails() {
  const seen = new Set()
  const emails = []
  for (const part of eligibility.raw.split(/[\s,，;；]+/)) {
    const e = part.trim().toLowerCase()
    if (e && !seen.has(e)) { seen.add(e); emails.push(e) }
  }
  return emails
}

async function previewEligibility() {
  const emails = parseEmails()
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return }
  eligibility.emails = emails
  eligibility.previewing = true
  try {
    const res = await api.post(`/camp/sessions/${campId.value}/mentor-import/preview`, { emails })
    eligibility.preview = res.data.data || { matched: [], unmatched_emails: [] }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '预览失败')
  } finally {
    eligibility.previewing = false
  }
}

async function confirmEligibility() {
  // 先预览匹配拿 user_id（幂等口径同后端 dry-run），再走 members/batch 以导生身份直接入营
  const emails = parseEmails()
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return }
  eligibility.confirming = true
  try {
    const pre = await api.post(`/camp/sessions/${campId.value}/mentor-import/preview`, { emails })
    const matched = pre.data.data?.matched || []
    const nameOf = Object.fromEntries(matched.map((u) => [u.user_id, u.username]))
    const items = matched.filter((u) => !u.already_member)
      .map((u) => ({ user_id: u.user_id, role: 'mentor' }))
    if (!items.length) { ElMessage.info('匹配到的账号均已在营，无需导入'); return }
    const res = await api.post(`/camp/sessions/${campId.value}/members/batch`, { items })
    const { added, results } = res.data
    const failed = (results || []).filter((r) => r.status === 'failed')
    if (failed.length) ElMessage.error(failed.map((r) => `${nameOf[r.user_id] || r.user_id}：${r.message}`).join('；'))
    if (added) {
      ElMessage.success(res.data.message || `已导入 ${added} 名导生`)
      eligibility.preview = null
      eligibility.raw = ''
      eligibility.emails = []
      fetchMsOverview()
      load()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败')
  } finally {
    eligibility.confirming = false
  }
}

// 按等级填充（只读选人器）：LV≥min_level、排除管理员与在营成员的候选邮箱回填导入框
async function generateByLevel() {
  eligibility.generating = true
  try {
    const res = await api.post(
      `/camp/sessions/${campId.value}/mentor-import/candidates-by-level`,
      { min_level: eligibility.minLevel },
    )
    const emails = res.data.data?.emails || []
    eligibility.raw = emails.join('\n')
    eligibility.preview = null
    ElMessage.success(emails.length
      ? `已填充 ${emails.length} 个候选邮箱（LV≥${eligibility.minLevel}，不含在营成员）`
      : '该等级区间没有可导入的候选')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '填充失败')
  } finally {
    eligibility.generating = false
  }
}

// ── 选导生（overview / 提前截止 / 志愿导出 / 指派） ──
const msOverview = ref(null)
const msPage = reactive({ page: 1, pageSize: 20, total: 0, keyword: '', loading: false })
const MS_PHASE_LABELS = {
  disabled: '未启用', upcoming: '即将开始', collecting: '志愿收集中', done: '志愿已截止',
}
const msPhaseLabel = computed(() => MS_PHASE_LABELS[msOverview.value?.phase] || '—')
const msPhaseAlertType = computed(() => ({
  collecting: 'info', upcoming: 'info', done: 'success',
}[msOverview.value?.phase] || 'info'))

async function fetchMsOverview() {
  msPage.loading = true
  try {
    const res = await api.get(`/camp/ms/${campId.value}/overview`, { params: {
      student_page: msPage.page,
      student_page_size: msPage.pageSize,
      student_keyword: msPage.keyword.trim() || undefined,
    } })
    msOverview.value = res.data
    msPage.total = res.data.student_total ?? res.data.students?.length ?? 0
    const lastPage = Math.max(1, Math.ceil(msPage.total / msPage.pageSize))
    if (msPage.page > lastPage) {
      msPage.page = lastPage
      return fetchMsOverview()
    }
  } catch { /* 非管理角色或未启用，忽略 */ }
  finally { msPage.loading = false }
}

function applyMsStudentFilter() {
  msPage.page = 1
  fetchMsOverview()
}

function changeMsStudentPageSize() {
  msPage.page = 1
  fetchMsOverview()
}

function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function advanceMs() {
  try {
    await ElMessageBox.confirm('立即截止志愿？截止时间将改为当前时刻，之后进入线下协调阶段。', '提前截止', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
  } catch { return }
  try {
    await api.put(`/camp/sessions/${campId.value}`, { ms_preference_deadline: nowStr() })
    ElMessage.success('已截止志愿')
    load()
    fetchMsOverview()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

// 导出学员志愿 CSV（blob 下载；文件名沿用后端 Content-Disposition 约定）
const exporting = ref(false)
async function exportMsCsv() {
  exporting.value = true
  try {
    const res = await api.get(`/camp/ms/${campId.value}/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `camp_${campId.value}_preferences.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    // 失败响应也是 blob：尽量解析出后端 message，解析不出给通用文案
    let msg = '导出失败，请稍后重试'
    try {
      const text = await e.response?.data?.text()
      if (text) msg = JSON.parse(text).message || msg
    } catch { /* 非 JSON 响应体，保持通用文案 */ }
    ElMessage.error(msg)
  } finally {
    exporting.value = false
  }
}

// ── 批量指派（线下协调结果回填，逐行独立结果；支持 JSON/CSV 导入预填） ──
const batchDlg = reactive({ visible: false, loading: false, submitting: false, rows: [], raw: '', importNote: null })
const BATCH_STATUS = {
  assigned: { label: '已指派', tag: 'success' },
  skipped: { label: '跳过', tag: 'info' },
  conflict: { label: '冲突', tag: 'warning' },
  error: { label: '失败', tag: 'danger' },
}
const batchStatusMeta = (status) => BATCH_STATUS[status] || { label: status, tag: 'info' }
const batchFileRef = ref(null)

async function fetchAllMsStudents() {
  const students = []
  let page = 1
  while (true) {
    const res = await api.get(`/camp/ms/${campId.value}/overview`, {
      params: { student_page: page, student_page_size: 100 },
    })
    const batch = res.data?.students || []
    students.push(...batch)
    const total = res.data?.student_total ?? students.length
    if (!batch.length || students.length >= total) return students
    page += 1
  }
}

async function openBatchAssign() {
  batchDlg.visible = true
  batchDlg.loading = true
  let students
  try {
    students = await fetchAllMsStudents()
  } catch (e) {
    batchDlg.rows = []
    ElMessage.error(e.response?.data?.message || '加载待指派学员失败')
    batchDlg.loading = false
    return
  }
  batchDlg.rows = students
    .filter((s) => !s.matched)
    .map((s) => ({ ...s, _mentor: null, _result: null }))
  batchDlg.raw = ''
  batchDlg.importNote = null
  batchDlg.loading = false
}

// 导入文本 → [{student, mentor}]（字符串姓名或用户ID；JSON 数组/对象、CSV 均可）
function parseBatchText(text) {
  const pairs = []
  const t = String(text || '').replace(/^﻿/, '').trim()
  if (!t) return pairs
  if (t.startsWith('{') || t.startsWith('[')) {
    const data = JSON.parse(t)   // 格式错抛给调用方提示
    if (Array.isArray(data)) {
      for (const it of data) {
        if (Array.isArray(it) && it.length >= 2) {
          pairs.push({ student: String(it[0]).trim(), mentor: String(it[1]).trim() })
        } else if (it && typeof it === 'object') {
          const s = it.student ?? it.学员
          const m = it.mentor ?? it.导师 ?? it.导生
          if (s != null && m != null) pairs.push({ student: String(s).trim(), mentor: String(m).trim() })
        }
      }
    } else if (typeof data === 'object') {
      for (const [s, m] of Object.entries(data)) {
        pairs.push({ student: String(s).trim(), mentor: String(m).trim() })
      }
    }
  } else {
    for (const line of t.split(/\r?\n/)) {
      const cells = line.split(/[,，;；\t]/).map((c) => c.trim()).filter(Boolean)
      if (cells.length < 2) continue
      if (!pairs.length && /^(学员|学生|student|姓名)$/i.test(cells[0]) && /^(导生|导师|mentor)$/i.test(cells[1])) continue
      pairs.push({ student: cells[0], mentor: cells[1] })
    }
  }
  return pairs
}

// 匹配并预填各行下拉；未匹配名单就地提示（不在营/已分配的学员、不存在的导生）
function applyBatchImport(text) {
  let pairs
  try {
    pairs = parseBatchText(text)
  } catch {
    ElMessage.error('JSON 解析失败，请检查格式')
    return
  }
  if (!pairs.length) { ElMessage.warning('没有解析到「学员,导生」数据对'); return }
  const mentors = msOverview.value?.mentors || []
  const mByName = new Map(mentors.map((m) => [m.username, m]))
  const mById = new Map(mentors.map((m) => [String(m.user_id), m]))
  const sByName = new Map(batchDlg.rows.map((r) => [r.username, r]))
  const sById = new Map(batchDlg.rows.map((r) => [String(r.user_id), r]))
  let filled = 0
  const missStudent = [], missMentor = []
  for (const { student, mentor } of pairs) {
    const row = sByName.get(student) || sById.get(student)
    const m = mByName.get(mentor) || mById.get(mentor)
    if (!row) { missStudent.push(student); continue }
    if (!m) { missMentor.push(mentor); continue }
    if (!row._result) { row._mentor = m.user_id; filled += 1 }
  }
  const notes = []
  if (missStudent.length) notes.push(`未匹配学员：${missStudent.join('、')}（不在本营或已分配）`)
  if (missMentor.length) notes.push(`未匹配导生：${missMentor.join('、')}`)
  batchDlg.importNote = notes.join('；') || null
  ElMessage.success(`已填充 ${filled} 行`)
}

function importBatchText() { applyBatchImport(batchDlg.raw) }

function onBatchFile(ev) {
  const f = ev.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    batchDlg.raw = String(reader.result || '')
    applyBatchImport(batchDlg.raw)
  }
  reader.readAsText(f)
  ev.target.value = ''   // 允许重复选择同一文件
}

async function submitBatchAssign() {
  const pairs = batchDlg.rows
    .filter((r) => r._mentor && !r._result)
    .map((r) => ({ student_user_id: r.user_id, mentor_user_id: r._mentor }))
  if (!pairs.length) { ElMessage.warning('请至少为一个学员选择导师'); return }
  batchDlg.submitting = true
  try {
    const res = await api.post(`/camp/ms/${campId.value}/assign/batch`, { pairs })
    const results = res.data.results || []
    const byId = new Map(results.map((r) => [r.student_user_id, r]))
    for (const row of batchDlg.rows) {
      if (byId.has(row.user_id)) row._result = byId.get(row.user_id)
    }
    const count = (s) => results.filter((r) => r.status === s).length
    ElMessage.success(`已提交：指派 ${count('assigned')} · 跳过 ${count('skipped')} · 冲突 ${count('conflict')} · 失败 ${count('error')}`)
    fetchMsOverview()
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量指派失败')
  } finally {
    batchDlg.submitting = false
  }
}

async function assignStudent(row, mentorId) {
  if (!mentorId) return
  const doAssign = async (allowOver) => {
    try {
      await api.post(`/camp/ms/${campId.value}/assign`, {
        student_id: row.user_id, mentor_id: mentorId, allow_over: allowOver,
      })
      const mn = (msOverview.value?.mentors || []).find((m) => m.user_id === mentorId)
      ElMessage.success(`已指派给 ${mn?.username || '导生'}`)
      fetchMsOverview()
      load()
    } catch (e) {
      const msg = e.response?.data?.message || '指派失败'
      // 满员：询问是否越过容量
      if (e.response?.status === 409 && msg.includes('allow_over')) {
        try {
          await ElMessageBox.confirm(`${msg}。仍要指派吗？`, '名额已满', {
            confirmButtonText: '仍要指派', cancelButtonText: '取消', type: 'warning',
          })
          doAssign(true)
        } catch { /* 取消 */ }
        return
      }
      ElMessage.error(msg)
    }
  }
  doAssign(false)
}

onMounted(() => {
  fetchJoinRequests()
  fetchMsOverview()
})
</script>

<style scoped>
.camp-ms-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ms-student-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hint { margin-left: 12px; color: var(--text-secondary); font-size: 12px; }
.ms-sec-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
.batch-msg { margin-left: 6px; font-size: 12px; color: var(--text-secondary); }
/* 批量指派导入条 */
.batch-import-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.batch-import-bar :deep(.el-button + .el-button) { margin-left: 0; }
.batch-import-note { font-size: 12px; color: var(--warning-color, #e6a23c); line-height: 1.5; }
/* 候选池工具栏 */
.elig-search { width: 100%; max-width: 420px; display: block; margin-bottom: 8px; }
.elig-opt { display: flex; align-items: center; gap: 8px; min-width: 0; }
.elig-opt-name { font-weight: 600; flex: none; }
.elig-opt-mail { color: var(--text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.elig-opt-meta { margin-left: auto; color: var(--text-secondary); font-size: 12px; flex: none; }
.elig-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.elig-toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.elig-toolbar :deep(.el-divider--vertical) { margin: 0; }
.elig-toolbar .hint { margin-left: 4px; }
.elig-level-select { width: 88px; }
</style>
