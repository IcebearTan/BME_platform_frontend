<template>
  <div class="camp-members-page">
    <TrainingGroups v-if="!isProject" :sid="campId" :session="session" />
    <div class="page-header">
      <div class="page-title">成员名单</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="搜索">
            <el-input v-model="memberPage.keyword" clearable placeholder="搜索成员姓名"
              style="width: 200px;" @keyup.enter="applyMemberFilters" @clear="applyMemberFilters" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="memberPage.role" clearable placeholder="全部身份"
              style="width: 130px;" @change="applyMemberFilters">
              <el-option label="学员" value="student" />
              <el-option label="导生" value="mentor" />
              <el-option label="成员" value="member" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="memberPage.includeEnded" @change="applyMemberFilters">含已移除/退出</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button @click="applyMemberFilters">查询</el-button>
          </el-form-item>
        </el-form>
        <el-button v-if="manageWritable" type="primary" size="small" @click="openAddMember">加成员</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="members" border size="small" v-loading="memberPage.loading">
        <el-table-column label="用户" prop="username" min-width="120" />
        <el-table-column label="角色" width="80">
          <template #default="{ row }">{{ (row.roles || [row.role]).map(r => ({ mentor: '导生', member: '成员', student: '学员' }[r] || r)).join('、') }}</template>
        </el-table-column>
        <el-table-column label="归属导生" min-width="140">
          <template #default="{ row }">
            <el-select v-if="(row.roles || [row.role]).includes('student') && manageWritable" :model-value="row.team_mentor_id"
              size="small" placeholder="未分配" clearable @change="(v) => updateMentor(row, v)">
              <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
            </el-select>
            <span v-else-if="(row.roles || [row.role]).includes('student')">{{ mentorName(row.team_mentor_id) }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isProject" label="方向" min-width="130">
          <template #default="{ row }">
            <el-select v-if="(row.roles || [row.role]).includes('mentor') && manageWritable" :model-value="row.direction"
              size="small" placeholder="未设置" clearable @change="(v) => setDirection(row, v)">
              <el-option v-for="d in sessionDirections" :key="d.name" :label="d.name" :value="d.name" />
            </el-select>
            <span v-else-if="(row.roles || [row.role]).includes('mentor')">{{ row.direction || '未设置' }}</span>
            <span v-else-if="(row.roles || [row.role]).includes('student')">{{ mentorDirectionName(row.team_mentor_id) }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="加入时间" width="120">
          <template #default="{ row }">{{ row.joined_at ? row.joined_at.slice(0, 10) : '' }}</template>
        </el-table-column>
        <el-table-column v-if="memberPage.includeEnded" label="状态" width="150">
          <template #default="{ row }">
            <template v-if="row.status === 'active'">在营</template>
            <template v-else>
              <el-tag type="info" size="small">{{ { removed: '已移除', exited: '已退出' }[row.status] || row.status }}</el-tag>
              <div v-if="row.ended_at" style="font-size: 11px; color: var(--text-secondary);">
                {{ row.ended_at.slice(0, 10) }}<template v-if="row.end_reason"> · {{ row.end_reason }}</template>
              </div>
            </template>
          </template>
        </el-table-column>
        <el-table-column v-if="manageWritable" label="操作" :width="!isProject ? 140 : 90">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'active'" size="small" type="success" link
              @click="reactivateMember(row)">重新加入</el-button>
            <template v-else>
              <el-button v-if="!isProject && (row.roles || [row.role]).includes('student')" size="small" type="primary" link
                @click="openCourseDlg(row)">课程</el-button>
              <el-button size="small" type="danger" link @click="removeMember(row)">移除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="memberPage.page" v-model:page-size="memberPage.pageSize"
          :total="memberPage.total" :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next" @current-change="fetchMembers" @size-change="changeMemberPageSize" />
      </div>
    </DewCard>

    <!-- 加成员（多选批量；口径对齐后端=仅拒超管，营内角色显式指定，事务批量端点逐项回报） -->
    <el-dialog v-model="memberDlg.visible" title="加成员" width="520px">
      <el-form :model="memberDlg.form" label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="memberDlg.form.user_ids" multiple collapse-tags collapse-tags-tooltip
            filterable remote reserve-keyword :remote-method="searchMemberCandidates"
            :loading="memberCandidateLoading" placeholder="输入姓名或邮箱搜索（可多选）"
            style="width: 100%;" @change="rememberMemberCandidates">
            <el-option v-for="u in memberCandidateOptions" :key="u.User_Id"
              :label="`${u.User_Name}（${u.User_Email}）`" :value="u.User_Id" />
          </el-select>
          <div class="dlg-hint">每次最多返回 20 个候选，已在本营和管理员账号不会出现在结果中</div>
        </el-form-item>
        <el-form-item label="营内角色" required>
          <el-select v-model="memberDlg.form.role" style="width: 100%;">
            <template v-if="isProject">
              <el-option label="成员（项目营通用身份）" value="member" />
            </template>
            <template v-else>
              <el-option label="学员" value="student" />
              <el-option label="导生" value="mentor" />
            </template>
          </el-select>
          <div class="dlg-hint">身份解耦后全局角色不再决定营内身份，加入时须显式指定</div>
        </el-form-item>
        <el-form-item v-if="!isProject && memberDlg.form.role === 'student'" label="归属导生">
          <el-select v-model="memberDlg.form.team_mentor_id" clearable placeholder="统一指定（可选）" style="width: 100%;">
            <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
          <div class="dlg-hint">将应用到本次全部学员；加入后可在成员列表改派</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="memberDlg.submitting" @click="submitAddMember">
          加入{{ memberDlg.form.user_ids.length ? `（${memberDlg.form.user_ids.length}）` : '' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 调整课程（方向解耦补位）：现修课程即时增删；来源=方向继承/手动 -->
    <el-dialog v-model="courseDlg.visible" :title="`调整课程 — ${courseDlg.username}`" width="520px">
      <div v-loading="courseDlg.loading">
        <div class="course-dlg-label">现修课程（{{ courseDlg.items.length }}）</div>
        <div v-if="!courseDlg.items.length && !courseDlg.loading" class="dlg-hint">
          尚未在本营修读任何课程（未归属导生或导生方向未设置时不会自动入课）
        </div>
        <div class="course-dlg-list">
          <div v-for="it in courseDlg.items" :key="it.course_id" class="course-dlg-row">
            <span class="course-dlg-title">{{ it.title }}</span>
            <el-tag size="small" type="info">{{ it.source_type === 'manual' ? '手动' : '方向' }}</el-tag>
            <el-button size="small" type="danger" link :loading="courseDlg.busy === `rm-${it.course_id}`"
              @click="removeCourse(it)">移除</el-button>
          </div>
        </div>
        <div class="course-dlg-label" style="margin-top:14px;">从营目录添加</div>
        <el-select v-model="courseDlg.addId" filterable placeholder="选择课程（营目录 = 方向绑定课程并集）"
          style="width: 100%;" no-data-text="营目录为空——请先在设置中配置方向并绑定课程">
          <el-option v-for="c in catalogCandidates" :key="c.course_id"
            :label="c.title" :value="c.course_id" />
        </el-select>
        <div class="dlg-hint">移除仅结束本营修读：学习历史保留；若无其他营在修则课程转为「已退课」状态</div>
      </div>
      <template #footer>
        <el-button @click="courseDlg.visible = false">关闭</el-button>
        <el-button type="primary" :disabled="!courseDlg.addId" :loading="courseDlg.busy === 'add'"
          @click="addCourse">添加课程</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import TrainingGroups from '../../../components/TrainingGroups.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'

const ctx = useCampContext()
const { campId, isProject, manageWritable, session } = ctx

const members = ref([])
const mentorMembers = ref([])
const memberPage = reactive({
  page: 1, pageSize: 20, total: 0, keyword: '', role: '', loading: false,
  counts: { student: 0, mentor: 0, member: 0 },
  includeEnded: false,   // 历史视图：软删除后的移除留痕（migrate_45）
})

async function fetchMembers() {
  memberPage.loading = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/members`, { params: {
      page: memberPage.page, page_size: memberPage.pageSize,
      keyword: memberPage.keyword.trim() || undefined,
      role: memberPage.role || undefined,
      include_ended: memberPage.includeEnded ? 1 : undefined,
    } })
    const data = res.data || {}
    members.value = data.members || []
    memberPage.total = data.total ?? members.value.length
    memberPage.counts = { ...memberPage.counts, ...(data.counts || {}) }
    const lastPage = Math.max(1, Math.ceil(memberPage.total / memberPage.pageSize))
    if (memberPage.page > lastPage) {
      memberPage.page = lastPage
      return fetchMembers()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载成员名单失败')
  } finally {
    memberPage.loading = false
  }
}

async function fetchMentors() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/members`, {
      params: { page: 1, page_size: 100, role: 'mentor' },
    })
    mentorMembers.value = (res.data?.members || []).filter((m) => m.role === 'mentor')
  } catch { mentorMembers.value = [] }
}

function applyMemberFilters() {
  memberPage.page = 1
  fetchMembers()
}

function changeMemberPageSize() {
  memberPage.page = 1
  fetchMembers()
}

const mentorName = (id) => (id ? mentorMembers.value.find((m) => m.user_id === id)?.username || '—' : '—')

// ── 方向解耦（09-28）：导生方向代设 + 学员方向随导师展示 ──
const sessionDirections = computed(() => session.value?.ms_directions || [])
const mentorDirectionName = (id) => (id
  ? mentorMembers.value.find((m) => m.user_id === id)?.direction || '—' : '—')

async function setDirection(row, direction) {
  if (!direction) return   // 清空暂不支持（方向语义必选）；关闭即恢复原值
  try {
    const res = await api.put(`/camp/sessions/${campId.value}/mentor-direction`, {
      user_id: row.user_id, direction,
    })
    row.direction = direction
    ElMessage.success(res.data?.propagated
      ? `方向已设置，已为 ${res.data.propagated} 名学员加入新方向课程` : '方向已设置')
    fetchMentors()   // 学员行方向随导师映射展示，刷新导生缓存
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '设置方向失败')
  }
}

// ── 调整课程（手动入课/移除） ──
const courseDlg = reactive({
  visible: false, loading: false, busy: '',
  userId: null, username: '', items: [], catalog: [], addId: null,
})
const catalogCandidates = computed(() => {
  const taken = new Set(courseDlg.items.map((i) => i.course_id))
  return courseDlg.catalog.filter((c) => !taken.has(c.course_id))
})

async function openCourseDlg(row) {
  courseDlg.userId = row.user_id
  courseDlg.username = row.username
  courseDlg.items = []
  courseDlg.catalog = []
  courseDlg.addId = null
  courseDlg.visible = true
  courseDlg.loading = true
  try {
    const [assigned, catalog] = await Promise.all([
      api.get(`/camp/sessions/${campId.value}/course-assign`, { params: { user_id: row.user_id } }),
      api.get(`/camp/sessions/${campId.value}/courses`),
    ])
    courseDlg.items = assigned.data?.items || []
    courseDlg.catalog = catalog.data?.courses || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载课程数据失败')
  } finally {
    courseDlg.loading = false
  }
}

async function addCourse() {
  if (!courseDlg.addId) return
  courseDlg.busy = 'add'
  try {
    await api.post(`/camp/sessions/${campId.value}/course-assign`, {
      user_id: courseDlg.userId, course_id: courseDlg.addId,
    })
    const c = courseDlg.catalog.find((x) => x.course_id === courseDlg.addId)
    courseDlg.items.push({ course_id: courseDlg.addId, title: c?.title || `#${courseDlg.addId}`, source_type: 'manual' })
    courseDlg.addId = null
    ElMessage.success('已入课')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '入课失败')
  } finally {
    courseDlg.busy = ''
  }
}

async function removeCourse(it) {
  courseDlg.busy = `rm-${it.course_id}`
  try {
    await api.delete(`/camp/sessions/${campId.value}/course-assign`, {
      data: { user_id: courseDlg.userId, course_id: it.course_id },
    })
    courseDlg.items = courseDlg.items.filter((x) => x.course_id !== it.course_id)
    ElMessage.success('已移除（学习历史保留）')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '移除失败')
  } finally {
    courseDlg.busy = ''
  }
}

// ── 加成员（多选批量） ──
const memberDlg = reactive({ visible: false, form: { user_ids: [], role: 'student', team_mentor_id: null }, submitting: false })
const memberCandidates = ref([])
const selectedMemberCandidates = ref([])
const memberCandidateLoading = ref(false)

const memberCandidateOptions = computed(() => {
  const byId = new Map()
  for (const user of [...selectedMemberCandidates.value, ...memberCandidates.value]) {
    byId.set(user.User_Id, user)
  }
  return [...byId.values()]
})

function openAddMember() {
  memberDlg.form = { user_ids: [], role: isProject.value ? 'member' : 'student', team_mentor_id: null }
  memberCandidates.value = []
  selectedMemberCandidates.value = []
  memberDlg.visible = true
  loadMemberCandidates('')
}

let memberCandidateTimer = null
let memberCandidateSeq = 0
function searchMemberCandidates(keyword) {
  clearTimeout(memberCandidateTimer)
  memberCandidateTimer = setTimeout(() => loadMemberCandidates(keyword), 250)
}
async function loadMemberCandidates(keyword) {
  const seq = ++memberCandidateSeq
  memberCandidateLoading.value = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/member-candidates`, {
      params: { keyword: (keyword || '').trim() || undefined, page: 1, page_size: 20 },
    })
    if (seq === memberCandidateSeq) memberCandidates.value = res.data?.users || []
  } catch (e) {
    if (seq === memberCandidateSeq) memberCandidates.value = []
    ElMessage.error(e.response?.data?.message || '搜索候选用户失败')
  } finally {
    if (seq === memberCandidateSeq) memberCandidateLoading.value = false
  }
}
function rememberMemberCandidates(ids) {
  const selected = new Map(selectedMemberCandidates.value.map((u) => [u.User_Id, u]))
  for (const user of memberCandidates.value) {
    if (ids.includes(user.User_Id)) selected.set(user.User_Id, user)
  }
  selectedMemberCandidates.value = ids.map((id) => selected.get(id)).filter(Boolean)
}

// 事务批量端点（v1.3）：单请求逐项回报，部分成功不吞
async function submitAddMember() {
  const ids = memberDlg.form.user_ids || []
  if (!ids.length) { ElMessage.warning('请选择用户'); return }
  memberDlg.submitting = true
  try {
    const res = await api.post(`/camp/sessions/${campId.value}/members/batch`, {
      items: ids.map((id) => ({
        user_id: id, role: memberDlg.form.role,
        team_mentor_id: (!isProject.value && memberDlg.form.role === 'student')
          ? memberDlg.form.team_mentor_id : null,
      })),
    })
    const { added, results } = res.data || {}
    const nameOf = (uid) => memberCandidateOptions.value.find((u) => u.User_Id === uid)?.User_Name || `#${uid}`
    const fails = (results || []).filter((r) => r.status === 'failed')
    if (added) {
      ElMessage.success(`已加入 ${added} 人`)
      memberDlg.visible = false
      fetchMembers()
      fetchMentors()
    }
    if (fails.length) {
      ElMessage.error(`加入失败 ${fails.length} 人 —— ${fails.map((f) => `${nameOf(f.user_id)}：${f.message}`).join('；')}`)
    } else if (!added) {
      ElMessage.warning('无人加入（见失败原因）')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量加入失败')
  } finally {
    memberDlg.submitting = false
  }
}

function removeMember(row) {
  // 软删除（migrate_45）：移除可填原因，留痕可追溯；承诺出勤日保留（复职后继续可用）
  ElMessageBox.prompt(`移除后「${row.username}」不再出现在营内名单，记录保留可追溯。`, '移除成员', {
    confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning',
    inputPlaceholder: '移除原因（可选，将通知本人）',
  }).then(async ({ value }) => {
    await api.delete(`/camp/sessions/${campId.value}/members/${row.user_id}`, { data: { reason: value || '' } })
    ElMessage.success('已移除（记录保留）')
    fetchMembers()
  }).catch((e) => {
    // 用户取消是 'cancel'/'close' 字符串；其余才是请求失败
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '移除失败')
  })
}

// 复职（历史视图）：走 member_assign，后端对 ended 行自动 reactivate 并记事件
function reactivateMember(row) {
  api.post(`/camp/sessions/${campId.value}/members`, {
    user_id: row.user_id, role: (row.roles || [row.role]).includes('mentor') ? 'mentor'
      : (isProject.value ? 'member' : 'student'),
  }).then(() => {
    ElMessage.success('已重新加入')
    fetchMembers()
  }).catch((e) => {
    ElMessage.error(e.response?.data?.message || '操作失败')
  })
}

async function updateMentor(row, mentorId) {
  try {
    await api.put(`/camp/sessions/${campId.value}/members/${row.user_id}`, { team_mentor_id: mentorId })
    row.team_mentor_id = mentorId
    ElMessage.success('归属导生已更新')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '更新失败')
  }
}

onMounted(() => {
  fetchMembers()
  fetchMentors()
})
</script>

<style scoped>
.camp-members-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.dlg-hint {
  width: 100%;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

/* 调整课程对话框（09-28 方向解耦） */
.course-dlg-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}
.course-dlg-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}
.course-dlg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--el-fill-color-light, #f5f7fa);
}
.course-dlg-title {
  flex: 1;
  font-size: 13px;
}
</style>
