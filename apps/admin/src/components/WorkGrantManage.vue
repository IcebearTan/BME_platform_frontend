<template>
  <div class="selectable">
    <div class="page-header">
      <div>
        <div class="page-title">协作授权</div>
        <div class="page-subtitle-inline">内部工作台的授权与工作区治理（依据=在任任职或组归属，资格不等于权限）</div>
      </div>
      <div class="header-actions">
        <el-button @click="fetchAll" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      授权岗位仅三档：组员（本组工作人员）/ 协调员（本组分派与验收协调）/ 治理（全局授权管理，仅超管可授）。
      依据「任职」的授权随卸任或任期结束自动失效；依据「组归属」的授权随调组自动失效（绑定授权时组快照）——
      均为下一请求即时生效，无需重新登录。
    </p>

    <!-- 工作区管理 -->
    <DewCard class="section-card">
      <template #header>
        <div class="card-head">
          <span>组工作区</span>
          <span class="card-head-hint">一组最多一个；停用=入口关闸，数据与授权记录保留</span>
        </div>
      </template>
      <el-table :data="workspaces" v-loading="loading" style="width: 100%"
                max-height="calc(100vh - 320px)">
        <el-table-column label="组别" min-width="160">
          <template #default="{ row }">
            <span>{{ row.group_name }}</span>
            <span class="option-id">#{{ row.club_group_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="工作区状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="group_status" label="组状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.group_status === 'active' ? '' : 'info'" size="small">
              {{ row.group_status === 'active' ? '启用' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="active_grants" label="有效授权" width="90" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'active'" size="small" type="warning" plain
                       @click="toggleWorkspace(row, 'disabled')">停用</el-button>
            <el-button v-else size="small" type="success" plain
                       @click="toggleWorkspace(row, 'active')">启用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="open-ws-row">
        <el-cascader v-model="newWsGroup" :options="openableGroupOptions" :props="cascaderProps"
                     placeholder="选择要开通工作区的启用组" clearable style="width: 320px;" />
        <el-button type="primary" :disabled="!newWsGroup" :loading="wsSaving" @click="openWorkspace">开通工作区</el-button>
      </div>
    </DewCard>

    <!-- 开通授权 -->
    <DewCard class="section-card">
      <template #header>
        <div class="card-head"><span>开通授权</span></div>
      </template>
      <el-form label-width="90px" style="max-width: 640px;">
        <el-form-item label="成员" required>
          <el-select v-model="form.userId" filterable placeholder="搜索并选择社员" style="width: 100%;"
                     :loading="usersLoading" @change="onUserChange">
            <el-option v-for="u in users" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id">
              <span>{{ u.User_Name }}</span>
              <span class="option-id">#{{ u.User_Id }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="岗位" required>
          <el-radio-group v-model="form.role">
            <el-radio-button value="member">组员</el-radio-button>
            <el-radio-button value="coordinator">协调员</el-radio-button>
            <el-radio-button value="governance">治理</el-radio-button>
          </el-radio-group>
          <div v-if="form.role === 'governance'" class="form-hint">
            全局治理岗位，仅超级管理员可授（治理人员不能再授予治理岗位）
          </div>
        </el-form-item>
        <el-form-item v-if="form.role !== 'governance'" label="工作区" required>
          <el-select v-model="form.workspaceId" placeholder="选择组工作区" style="width: 100%;"
                     :disabled="!form.userId">
            <el-option v-for="w in workspaces" :key="w.id" :label="w.group_name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role !== 'governance'" label="授权依据" required>
          <div v-if="!form.userId" class="form-hint">先选择成员</div>
          <div v-else-if="!sourceOptions.length" class="form-hint form-hint--warn">
            该成员无在任任职或组归属，不能作为授权依据（先在「任职管理/成员归属」建档）
          </div>
          <el-radio-group v-else v-model="form.sourceKey">
            <el-radio v-for="s in sourceOptions" :key="s.key" :value="s.key">{{ s.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker v-model="form.validUntil" type="date" placeholder="可不填（跟随任职/归属）"
                          value-format="YYYY-MM-DD" style="width: 220px;" />
        </el-form-item>
        <el-form-item label="授权原因" required>
          <el-input v-model="form.grantReason" maxlength="200" show-word-limit
                    placeholder="如：运行保障组值班开通 / 培训组负责人" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" :disabled="!canSubmit" @click="submitGrant">开通授权</el-button>
        </el-form-item>
      </el-form>
    </DewCard>

    <!-- 授权列表 -->
    <DewCard class="section-card">
      <template #header>
        <div class="card-head">
          <span>授权记录</span>
          <div class="filter-row">
            <el-select v-model="query.status" style="width: 110px;" @change="fetchGrants">
              <el-option label="全部" value="all" />
              <el-option label="生效中" value="active" />
              <el-option label="已撤销" value="revoked" />
            </el-select>
            <el-select v-model="query.workspaceId" clearable placeholder="全部工作区" style="width: 160px;" @change="fetchGrants">
              <el-option v-for="w in workspaces" :key="w.id" :label="w.group_name" :value="w.id" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="grants" v-loading="grantsLoading" style="width: 100%"
                max-height="calc(100vh - 320px)">
        <el-table-column label="成员" min-width="120">
          <template #default="{ row }">{{ row.username }}<span class="option-id">#{{ row.user_id }}</span></template>
        </el-table-column>
        <el-table-column label="岗位" width="90">
          <template #default="{ row }">{{ ROLE_LABELS[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column label="工作区" min-width="110">
          <template #default="{ row }">{{ row.workspace_id ? row.workspace_group_name : '全局' }}</template>
        </el-table-column>
        <el-table-column label="依据" min-width="120">
          <template #default="{ row }">{{ SOURCE_LABELS[row.source_type] || row.source_type }}</template>
        </el-table-column>
        <el-table-column label="有效期" width="100">
          <template #default="{ row }">{{ row.valid_until || '不限' }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="130">
          <template #default="{ row }">
            <el-tooltip v-if="row.status === 'active' && !row.effective" :content="row.ineffective_reason"
                        placement="top">
              <el-tag type="warning" size="small">已失效：{{ row.ineffective_reason }}</el-tag>
            </el-tooltip>
            <el-tag v-else-if="row.status === 'active'" type="success" size="small">生效中</el-tag>
            <el-tag v-else type="danger" size="small">已撤销</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="grant_reason" label="原因" min-width="140" show-overflow-tooltip />
        <el-table-column prop="created_at" label="授予时间" width="110" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'active'" size="small" type="danger" plain @click="openRevoke(row)">
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager-row">
        <el-pagination background layout="total, prev, pager, next" :total="total"
                       :page-size="query.pageSize" :current-page="query.page"
                       @current-change="(p) => { query.page = p; fetchGrants() }" />
      </div>
    </DewCard>

    <!-- 需接管事项（D01） -->
    <DewCard class="section-card">
      <template #header>
        <div class="card-head">
          <span>需接管事项</span>
          <span class="card-head-hint">活跃任务的负责人已失去协作资格；接手由协调员改派或转交完成</span>
        </div>
      </template>
      <el-table :data="takeoverRows" v-loading="takeoverLoading" style="width: 100%"
                max-height="calc(100vh - 320px)">
        <el-table-column prop="item_id" label="事项" width="80" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="原负责人" width="120">
          <template #default="{ row }">{{ row.assignee_name }}<span class="option-id">#{{ row.assignee_user_id }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
      <p v-if="!takeoverRows.length && !takeoverLoading" class="section-empty">当前没有需接管的事项</p>
    </DewCard>

    <!-- 治理工具：交接清单 + 紧急介入 -->
    <DewCard class="section-card">
      <template #header>
        <div class="card-head"><span>治理工具</span></div>
      </template>
      <div class="gov-tools">
        <div class="gov-tool">
          <div class="gov-tool-label">交接清单（调组/卸任前生成）</div>
          <div class="gov-tool-row">
            <el-select v-model="handoverUserId" filterable placeholder="选择成员"
                       style="width: 200px;" :loading="usersLoading">
              <el-option v-for="u in users" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id" />
            </el-select>
            <el-button :disabled="!handoverUserId" @click="openHandover">生成清单</el-button>
          </div>
        </div>
        <div class="gov-tool">
          <div class="gov-tool-label">紧急介入读取受限事项（理由必填并留痕）</div>
          <div class="gov-tool-row">
            <el-input-number v-model="emergencyForm.itemId" :min="1" controls-position="right"
                             placeholder="事项 ID" style="width: 130px;" />
            <el-input v-model="emergencyForm.reason" maxlength="200" placeholder="介入理由"
                      style="width: 260px;" />
            <el-button type="warning" plain :loading="emergencyLoading"
                       :disabled="!emergencyForm.itemId || !emergencyForm.reason.trim()"
                       @click="submitEmergency">介入</el-button>
          </div>
        </div>
      </div>
    </DewCard>

    <!-- 交接清单弹窗 -->
    <el-dialog v-model="handoverVisible" :title="`交接清单 - ${handoverData?.user?.username || ''}`" width="560px">
      <div v-loading="handoverLoading">
        <template v-if="handoverData">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="未完成任务">{{ handoverData.counts.unfinished }}</el-descriptions-item>
            <el-descriptions-item label="待其验收">{{ handoverData.counts.to_review }}</el-descriptions-item>
            <el-descriptions-item label="待其回复">{{ handoverData.counts.pending_responses }}</el-descriptions-item>
            <el-descriptions-item label="待确认转交">{{ handoverData.counts.pending_transfers }}</el-descriptions-item>
          </el-descriptions>
          <el-table :data="handoverData.grants" size="small" style="width: 100%; margin-top: 12px;">
            <el-table-column prop="id" label="授权" width="70" />
            <el-table-column prop="role" label="岗位" width="100" />
            <el-table-column label="状态">
              <template #default="{ row }">
                <el-tag size="small" :type="row.effective ? 'success' : 'warning'">
                  {{ row.effective ? '有效' : (row.reason || '已失效') }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <p class="dialog-text">清单为只读汇总；接手操作在对应事项页完成（改派/转交需对方确认）。</p>
        </template>
      </div>
      <template #footer>
        <el-button @click="handoverVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 撤销弹窗 -->
    <el-dialog v-model="revokeVisible" title="撤销授权" width="420px">
      <p class="dialog-text">撤销即时生效（该成员下一请求即失去权限）。请填写撤销原因（必填）：</p>
      <el-input v-model="revokeReason" type="textarea" :rows="3" maxlength="200" show-word-limit />
      <template #footer>
        <el-button @click="revokeVisible = false">取消</el-button>
        <el-button type="danger" :loading="revoking" :disabled="!revokeReason.trim()" @click="confirmRevoke">
          确认撤销
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'
import { buildGroupCascaderOptions } from '../utils/club'

const ROLE_LABELS = { member: '组员', coordinator: '协调员', governance: '治理' }
const SOURCE_LABELS = { officer: '在任任职', membership: '组归属', direct: '直接授予' }

// ── 基础数据 ──
const loading = ref(false)
const users = ref([])
const usersLoading = ref(false)
const groupOptions = ref([])
const workspaces = ref([])
const cascaderProps = { checkStrictly: true, emitPath: false }

const fetchUsers = async () => {
  usersLoading.value = true
  try {
    const res = await api({ url: '/user/user_list', method: 'get' })
    users.value = res.data || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取用户名单失败')
  } finally {
    usersLoading.value = false
  }
}

const fetchGroups = async () => {
  try {
    const res = await api({ url: '/admin/club/groups', method: 'get' })
    groupOptions.value = buildGroupCascaderOptions(res.data?.data?.groups || [])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组树失败')
  }
}

const fetchWorkspaces = async () => {
  try {
    const res = await api({ url: '/work/governance/workspaces', method: 'get' })
    workspaces.value = res.data?.data?.workspaces || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取工作区列表失败')
  }
}

// 已开通工作区的组不再出现在开通选择里
const openableGroupOptions = computed(() => {
  const opened = new Set(workspaces.value.map(w => w.club_group_id))
  const walk = (nodes) => nodes
    .filter(n => !opened.has(n.value))
    .map(n => ({ ...n, children: n.children ? walk(n.children) : undefined }))
    .map(n => ({ ...n, children: n.children?.length ? n.children : undefined }))
  return walk(groupOptions.value)
})

// ── 工作区启停 ──
const newWsGroup = ref(null)
const wsSaving = ref(false)

const openWorkspace = async () => {
  if (!newWsGroup.value) return
  wsSaving.value = true
  try {
    const res = await api({ url: '/work/governance/workspaces', method: 'post',
                            data: { club_group_id: newWsGroup.value } })
    ElMessage.success(res.data?.message || '工作区已开通')
    newWsGroup.value = null
    await fetchWorkspaces()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '开通失败')
  } finally {
    wsSaving.value = false
  }
}

const toggleWorkspace = async (row, status) => {
  const action = status === 'disabled' ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(
      status === 'disabled'
        ? `停用「${row.group_name}」工作区后，成员将无法进入（数据与授权记录保留）。确认停用？`
        : `重新启用「${row.group_name}」工作区？`,
      `${action}工作区`, { confirmButtonText: action, cancelButtonText: '取消' })
  } catch { return }
  try {
    const res = await api({ url: `/work/governance/workspaces/${row.id}/status`, method: 'post',
                            data: { status } })
    ElMessage.success(res.data?.message || `已${action}`)
    await fetchWorkspaces()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || `${action}失败`)
  }
}

// ── 开通授权 ──
const form = reactive({
  userId: null, role: 'member', workspaceId: null,
  sourceKey: '', validUntil: null, grantReason: '',
})
const officerRows = ref([])          // 全部在任任职（小数据集，一次取齐）
const userMembership = ref({ primary: null, secondary: null })
const saving = ref(false)

// 授权依据选项：在任任职行 + 归属行（membership_id 为来源行 id）
const sourceOptions = computed(() => {
  if (!form.userId) return []
  const opts = []
  for (const o of officerRows.value) {
    if (o.user_id === form.userId) {
      opts.push({ key: `officer:${o.id}`, source_type: 'officer', source_id: o.id,
                  label: `任职：${o.title}${o.department ? ' · ' + o.department : ''}` })
    }
  }
  for (const slot of ['primary', 'secondary']) {
    const m = userMembership.value[slot]
    if (m?.membership_id) {
      opts.push({ key: `membership:${m.membership_id}`, source_type: 'membership',
                  source_id: m.membership_id, label: `组归属：${m.name}（${slot === 'primary' ? '主要' : '次要'}）` })
    }
  }
  return opts
})

const fetchOfficers = async () => {
  try {
    const res = await api({ url: '/admin/officers', method: 'get',
                            params: { status: 'active', per_page: 100 } })
    officerRows.value = res.data?.data?.officers || []
  } catch { officerRows.value = [] }     // 依据选项留空，表单会提示不可授
}

const onUserChange = async (uid) => {
  form.sourceKey = ''
  userMembership.value = { primary: null, secondary: null }
  if (!uid) return
  try {
    const res = await api({ url: `/admin/club/membership/${uid}`, method: 'get' })
    userMembership.value = res.data?.data || { primary: null, secondary: null }
  } catch { /* 依据选项留空 */ }
}

const selectedSource = computed(() => sourceOptions.value.find(s => s.key === form.sourceKey))
const canSubmit = computed(() => {
  if (!form.userId || !form.grantReason.trim()) return false
  if (form.role === 'governance') return true
  return Boolean(form.workspaceId) && Boolean(selectedSource.value)
})

const submitGrant = async () => {
  saving.value = true
  try {
    const payload = {
      user_id: form.userId, role: form.role, grant_reason: form.grantReason.trim(),
      valid_until: form.validUntil || null,
    }
    if (form.role === 'governance') {
      payload.source_type = 'direct'
    } else {
      payload.workspace_id = form.workspaceId
      payload.source_type = selectedSource.value.source_type
      payload.source_id = selectedSource.value.source_id
    }
    const res = await api({ url: '/work/governance/grants', method: 'post', data: payload })
    ElMessage.success(res.data?.message || '授权已开通')
    form.grantReason = ''
    await Promise.allSettled([fetchGrants(), fetchWorkspaces()])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '开通失败')
  } finally {
    saving.value = false
  }
}

// ── 授权列表与撤销 ──
const grants = ref([])
const grantsLoading = ref(false)
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, status: 'all', workspaceId: null })

const fetchGrants = async () => {
  grantsLoading.value = true
  try {
    const params = { page: query.page, page_size: query.pageSize, status: query.status }
    if (query.workspaceId) params.workspace_id = query.workspaceId
    const res = await api({ url: '/work/governance/grants', method: 'get', params })
    grants.value = res.data?.data?.grants || []
    total.value = res.data?.data?.total || 0
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取授权记录失败')
  } finally {
    grantsLoading.value = false
  }
}

const revokeVisible = ref(false)
const revokeReason = ref('')
const revoking = ref(false)
const revokeTarget = ref(null)

const openRevoke = (row) => {
  revokeTarget.value = row
  revokeReason.value = ''
  revokeVisible.value = true
}

const confirmRevoke = async () => {
  revoking.value = true
  try {
    const res = await api({ url: `/work/governance/grants/${revokeTarget.value.id}/revoke`,
                            method: 'post', data: { reason: revokeReason.trim() } })
    ElMessage.success(res.data?.message || '已撤销')
    revokeVisible.value = false
    await Promise.allSettled([fetchGrants(), fetchWorkspaces()])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '撤销失败')
  } finally {
    revoking.value = false
  }
}

// ── 需接管队列（D01：活跃任务负责人已失资格） ──
const takeoverRows = ref([])
const takeoverLoading = ref(false)

const fetchTakeover = async () => {
  takeoverLoading.value = true
  try {
    const res = await api({ url: '/work/governance/takeover-queue', method: 'get' })
    takeoverRows.value = res.data?.data?.items || []
  } catch { takeoverRows.value = [] }
  finally { takeoverLoading.value = false }
}

// ── 交接清单（§5.4：按成员汇总） ──
const handoverVisible = ref(false)
const handoverUserId = ref(null)
const handoverLoading = ref(false)
const handoverData = ref(null)

const openHandover = async () => {
  handoverVisible.value = true
  handoverData.value = null
  if (handoverUserId.value) await loadHandover()
}

const loadHandover = async () => {
  if (!handoverUserId.value) return
  handoverLoading.value = true
  try {
    const res = await api({ url: '/work/governance/handover', method: 'get',
                            params: { user_id: handoverUserId.value } })
    handoverData.value = res.data?.data || null
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '交接清单加载失败')
  } finally {
    handoverLoading.value = false
  }
}

// ── 紧急介入（§5.4：理由必填 + 留痕） ──
const emergencyForm = reactive({ itemId: null, reason: '' })
const emergencyLoading = ref(false)

const submitEmergency = async () => {
  if (!emergencyForm.itemId || !emergencyForm.reason.trim() || emergencyLoading.value) return
  emergencyLoading.value = true
  try {
    const res = await api({ url: '/work/governance/emergency-access', method: 'post',
                            data: { item_id: emergencyForm.itemId,
                                    reason: emergencyForm.reason.trim() } })
    ElMessage.success(res.data?.message || '已介入并留痕')
    emergencyForm.itemId = null
    emergencyForm.reason = ''
    await fetchTakeover()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '介入失败（检查事项 ID 与理由）')
  } finally {
    emergencyLoading.value = false
  }
}

const fetchAll = async () => {
  loading.value = true
  await Promise.allSettled([fetchWorkspaces(), fetchGrants(), fetchTakeover()])
  loading.value = false
}

onMounted(() => {
  fetchUsers()
  fetchGroups()
  fetchOfficers()
  fetchAll()
})
</script>

<style scoped>
.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.page-subtitle-inline { margin-top: 4px; font-size: var(--text-sm); color: var(--el-text-color-secondary); }

.section-card { margin-bottom: 16px; }
.section-card :deep(.dew-card__body) { padding: 16px; }

.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.card-head-hint { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 400; }

.filter-row { display: flex; gap: 8px; }

.open-ws-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }

.pager-row { display: flex; justify-content: flex-end; margin-top: 12px; }

.option-id { margin-left: 6px; color: var(--el-text-color-secondary); font-size: 12px; }

.form-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; }
.form-hint--warn { color: var(--el-color-warning); }

.dialog-text { margin: 0 0 10px; font-size: 13px; color: var(--el-text-color-regular); line-height: 1.6; }

.gov-tools { display: flex; flex-direction: column; gap: 14px; }
.gov-tool-label { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.gov-tool-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.section-empty { margin: 8px 0 0; font-size: 12.5px; color: var(--el-text-color-secondary); }
</style>
