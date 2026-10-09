<template>
  <div class="group-detail">
    <!-- 未选中空态 -->
    <DewCard v-if="!groupId" no-hover class="empty-card">
      <div class="empty-hint">在左侧选择小组后，可查看组内名单、添加或移出成员、直接任命与更换组长</div>
    </DewCard>

    <template v-else>
      <!-- 组头：名称 + 操作 -->
      <DewCard no-hover class="head-card">
        <div class="head-main">
          <div class="head-title">
            <span class="group-name">{{ detail?.group?.name || '…' }}</span>
            <el-tag v-if="detail?.group?.status !== 'active'" size="small" type="info" effect="plain">已归档</el-tag>
          </div>
          <div class="head-actions">
            <el-button size="small" @click="emit('create-child', { id: groupId, name: detail?.group?.name })">加子组</el-button>
            <el-button size="small" @click="openEditGroup">编辑组</el-button>
            <el-button v-if="detail?.group?.status === 'active'" size="small" type="warning" plain
              :disabled="(detail?.group?.refs?.children || 0) > 0 || (detail?.group?.refs?.members || 0) > 0"
              @click="confirmArchive">归档</el-button>
            <el-button size="small" type="danger" plain
              :disabled="hasRefs" @click="confirmDelete">删除</el-button>
          </div>
        </div>
        <div v-if="detail?.group?.description" class="head-desc">{{ detail.group.description }}</div>
      </DewCard>

      <div v-loading="loading" class="detail-body">
        <!-- 组长位 -->
        <DewCard no-hover class="slot-card">
          <template #header>
            <div class="card-title">组长位<span class="card-sub">任命即自动获得本组工作区协调权（若已开通）</span></div>
          </template>
          <div class="slot-row">
            <div v-for="s in visibleSlots" :key="s.position.id" class="slot-item"
              :class="{ vacant: s.vacant }">
              <div class="slot-pos">{{ s.position.name }}</div>
              <template v-if="!s.vacant">
                <div v-for="o in s.officers" :key="o.id" class="slot-holder">
                  <el-avatar :size="34" :src="assetUrl(o.avatar)">{{ (o.username || '?').charAt(0) }}</el-avatar>
                  <div class="holder-info">
                    <div class="holder-name">{{ o.username }}</div>
                    <div class="holder-term">任期起 {{ o.term_start || '—' }}</div>
                  </div>
                </div>
                <div class="slot-ops">
                  <el-button size="small" link type="primary" @click="openLeader(null, s.position.id)">更换</el-button>
                  <el-button size="small" link type="danger" @click="endHolder(s)">卸任</el-button>
                </div>
              </template>
              <template v-else>
                <div class="slot-empty">空缺</div>
                <div class="slot-ops">
                  <el-button size="small" link type="primary" @click="openLeader(null, s.position.id)">任命组长</el-button>
                </div>
              </template>
            </div>
          </div>
          <div v-if="extraVacantCount > 0" class="slot-extra">
            另有 {{ extraVacantCount }} 个空缺组内职位（在「职位定义」创建后可任命）
          </div>
        </DewCard>

        <!-- 分管干事 -->
        <DewCard v-if="detail?.overseers?.length" no-hover class="slot-card">
          <template #header>
            <div class="card-title">分管干事<span class="card-sub">社团职务挂本组即为分管</span></div>
          </template>
          <div class="overseer-row">
            <div v-for="o in detail.overseers" :key="o.id" class="overseer-chip">
              <el-avatar :size="26" :src="assetUrl(o.avatar)">{{ (o.username || '?').charAt(0) }}</el-avatar>
              <span>{{ o.username }}</span>
              <el-tag size="small" effect="plain" type="warning">{{ o.title }}</el-tag>
            </div>
            <el-button size="small" link type="primary" class="overseer-link"
              @click="router.push({ name: 'org.officers', query: { q: detail.overseers[0].title } })">
              在社团职务页调整
            </el-button>
          </div>
        </DewCard>

        <!-- 成员表 -->
        <DewCard no-hover class="table-card">
          <template #header>
            <div class="card-title members-title">
              <span>组内成员</span>
              <span class="card-sub">主要 {{ detail?.counts?.primary ?? 0 }} · 次要 {{ detail?.counts?.secondary ?? 0 }}</span>
              <el-button v-if="detail?.group?.status === 'active'" size="small" type="primary" plain
                class="add-btn" @click="openAddMember">添加成员</el-button>
              <el-button v-if="detail?.group?.status === 'active'" size="small" plain
                class="add-btn" @click="openBatchMember">批量导入</el-button>
            </div>
          </template>
          <el-table :data="detail?.members || []" max-height="calc(100vh - 430px)">
            <el-table-column label="成员" min-width="170">
              <template #default="{ row }">
                <div class="member-cell">
                  <el-avatar :size="30" :src="assetUrl(row.avatar)">{{ (row.username || '?').charAt(0) }}</el-avatar>
                  <span>{{ row.username }}</span>
                  <el-tag v-if="row.is_leader" size="small" effect="plain" type="success">组长</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="槽位" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.slot === 'primary' ? 'primary' : 'info'" size="small" effect="plain">
                  {{ row.slot === 'primary' ? '主要' : '次要' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="现任职务" min-width="120">
              <template #default="{ row }">{{ row.title || '—' }}</template>
            </el-table-column>
            <el-table-column label="加入日" width="120" align="center">
              <template #default="{ row }">{{ row.joined_at || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center">
              <template #default="{ row }">
                <template v-if="detail?.group?.status === 'active'">
                  <el-button v-if="!row.is_leader" size="small" link type="primary"
                    @click="openLeader(row.user_id)">设为组长</el-button>
                  <el-button v-if="row.slot === 'secondary'" size="small" link
                    @click="promotePrimary(row)">转为主要</el-button>
                  <el-button v-if="!row.is_leader || row.joined_at" size="small" link type="danger"
                    @click="removeMember(row)">移出本组</el-button>
                </template>
                <span v-else class="text-muted">已归档</span>
              </template>
            </el-table-column>
            <template #empty>
              <div class="table-empty">本组暂无成员，点「添加成员」把社员加进{{ detail?.group?.name || '本组' }}</div>
            </template>
          </el-table>
        </DewCard>
      </div>

      <!-- 任命 / 更换组长 -->
      <LeaderChangeDialog v-model="leaderDlg.visible" :group-id="groupId"
        :group-name="detail?.group?.name || ''" :slots="detail?.leader_slots || []"
        :preset-user-id="leaderDlg.presetUserId" :preset-position-id="leaderDlg.presetPositionId"
        @success="refreshAll" />

      <!-- 添加成员 -->
      <el-dialog v-model="addDlg.visible" title="添加成员" width="540px">
        <el-form label-width="90px">
          <el-form-item label="成员" required>
            <el-select v-model="addDlg.userIds" multiple filterable placeholder="搜索并多选社员"
              style="width: 100%;" :loading="usersLoading">
              <el-option v-for="u in addableUsers" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id">
                <span>{{ u.User_Name }}</span>
                <span class="option-id">#{{ u.User_Id }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="槽位" required>
            <el-radio-group v-model="addDlg.slot">
              <el-radio-button value="primary">主要</el-radio-button>
              <el-radio-button value="secondary">次要</el-radio-button>
            </el-radio-group>
            <span class="form-hint">设为主要组会同时移出其原主要组</span>
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="addDlg.visible = false">取消</el-button>
            <el-button type="primary" :loading="addDlg.submitting" :disabled="!addDlg.userIds.length"
              @click="submitAddMembers">确认添加</el-button>
          </div>
        </template>
      </el-dialog>

      <!-- 批量导入成员（实名名单：后端按核验姓名匹配 → 重名消歧 → 就绪行整表提交；A1 2026-10-04） -->
      <el-dialog v-model="batchDlg.visible" title="批量导入成员（实名名单）" width="820px"
        :close-on-click-modal="false">
        <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
          :title="`粘贴一列实名姓名即可把人加入「${detail?.group?.name || '本组'}」，无需事先查账号 ID；重名行人工确认后按账号 ID 提交`" />
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="槽位">
            <el-radio-group v-model="batchDlg.slot">
              <el-radio-button value="primary">主要</el-radio-button>
              <el-radio-button value="secondary">次要</el-radio-button>
            </el-radio-group>
            <span class="form-hint" style="margin-left: 8px;">设为主要组会同时移出其原主要组</span>
          </el-form-item>
        </el-form>
        <el-input v-model="batchDlg.raw" type="textarea" :rows="3"
          placeholder="每行一个实名姓名（可含表头；也支持粘贴含姓名列的表格文本，取每行第一列；账号 ID 列可直接粘贴，纯数字按 ID 解析）" />
        <div class="batch-import-bar">
          <el-button size="small" type="primary" plain :loading="batchDlg.loading" @click="runBatchPreview">
            匹配预览
          </el-button>
          <el-button size="small" @click="batchFileRef?.click()">上传名单（.csv / .txt）</el-button>
          <input ref="batchFileRef" type="file" accept=".csv,.txt" style="display:none" @change="onBatchFile" />
        </div>
        <el-table v-if="batchDlg.rows.length" :data="batchDlg.rows" border size="small" max-height="360">
          <el-table-column label="#" width="46" align="center">
            <template #default="{ row }">{{ row.index + 1 }}</template>
          </el-table-column>
          <el-table-column label="录入姓名" width="110">
            <template #default="{ row }">{{ row.input }}</template>
          </el-table-column>
          <el-table-column label="匹配结果" min-width="250">
            <template #default="{ row }">
              <span v-if="resolvedUid(row)">{{ resolvedLabel(row) }}</span>
              <el-select v-else-if="candidateOptions(row).length" v-model="row.chosen" size="small"
                placeholder="同名多人，请选择" style="width: 100%;" @change="rePreviewRow(row)">
                <el-option v-for="opt in candidateOptions(row)" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <span v-else class="form-hint">无可选候选</span>
            </template>
          </el-table-column>
          <el-table-column label="预检" min-width="180">
            <template #default="{ row }">
              <span v-if="row.reason" class="batch-warn">{{ row.reason }}</span>
              <el-tag v-else-if="resolvedUid(row) && !row.result" type="success" size="small" effect="plain">就绪</el-tag>
              <span v-else class="form-hint">—</span>
            </template>
          </el-table-column>
          <el-table-column label="提交结果" min-width="160">
            <template #default="{ row }">
              <template v-if="row.result">
                <el-tag :type="row.result.ok ? 'success' : 'danger'" size="small" effect="plain">
                  {{ row.result.ok ? '已设置' : '拒绝' }}
                </el-tag>
                <span v-if="!row.result.ok" class="batch-warn">{{ row.result.reason }}</span>
              </template>
              <span v-else class="form-hint">—</span>
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="batchDlg.visible = false">关闭（未就绪行保留，重开可继续）</el-button>
            <el-button type="primary" :loading="batchDlg.submitting" :disabled="!readyBatchRows.length"
              @click="submitBatchMembers">提交已就绪 {{ readyBatchRows.length }} 行</el-button>
          </div>
        </template>
      </el-dialog>

      <!-- 编辑组（自旧组树页迁入：改名/挪父/调序/介绍） -->
      <el-dialog v-model="editDlg.visible" :title="`编辑组「${detail?.group?.name || ''}」`" width="520px">
        <el-form :model="editDlg.form" label-width="90px">
          <el-form-item label="组名" required>
            <el-input v-model="editDlg.form.name" maxlength="50" show-word-limit placeholder="全树唯一" />
          </el-form-item>
          <el-form-item label="父组">
            <el-cascader v-model="editDlg.form.parent_id" :options="parentOptions" :props="cascaderProps"
              placeholder="不选 / 清空 = 一级组" clearable style="width: 100%;" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="editDlg.form.sort_order" :min="0" :max="999" />
            <span class="form-hint">同父内小者在前</span>
          </el-form-item>
          <el-form-item label="小组介绍">
            <el-input v-model="editDlg.form.description" type="textarea" :rows="4"
              maxlength="500" show-word-limit
              placeholder="组织页组态展示：小组方向、日常与成果（留空显示待填写占位）" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDlg.visible = false">取消</el-button>
            <el-button type="primary" :loading="editDlg.submitting" @click="submitEditGroup">确认</el-button>
          </div>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api, { assetUrl } from '../api'
import { buildGroupCascaderOptions } from '../utils/club'
import LeaderChangeDialog from './LeaderChangeDialog.vue'

const props = defineProps({
  groupId: { type: Number, default: null },
  // 组树平铺行（外壳传入，编辑组挪父级联用；archived 组也在内，作父级时由后端拦）
  groupRows: { type: Array, default: () => [] },
})
const emit = defineEmits(['refresh', 'create-child'])

const router = useRouter()
const loading = ref(false)
const detail = ref(null)

async function fetchDetail() {
  if (!props.groupId) return
  loading.value = true
  detail.value = null
  try {
    const res = await api({ url: `/admin/club/groups/${props.groupId}/detail`, method: 'get' })
    detail.value = res.data?.data || null
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组详情失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.groupId, fetchDetail, { immediate: true })

function refreshAll() {
  fetchDetail()
  emit('refresh')        // 组树侧引用计数刷新
}

// ── 组长槽展示：在任全显 + 空缺只显缺省职位（职位表里的长尾空缺折叠计数）──
const visibleSlots = computed(() => {
  const slots = detail.value?.leader_slots || []
  const occupied = slots.filter(s => !s.vacant)
  const vacantDefault = slots.filter(s => s.vacant && s.position.id === detail.value?.default_position_id)
  return [...occupied, ...vacantDefault]
})
const extraVacantCount = computed(() => {
  const slots = detail.value?.leader_slots || []
  return slots.filter(s => s.vacant && s.position.id !== detail.value?.default_position_id).length
})

// ── 任命 / 更换组长 ──
const leaderDlg = reactive({ visible: false, presetUserId: null, presetPositionId: null })
function openLeader(userId = null, positionId = null) {
  leaderDlg.presetUserId = userId
  leaderDlg.presetPositionId = positionId
  leaderDlg.visible = true
}

async function endHolder(slot) {
  const o = slot.officers[0]
  try {
    await ElMessageBox.confirm(
      `卸任 ${o.username} 的 ${slot.position.name}（记录保留）。`,
      `卸任「${o.username}」`, { type: 'warning', confirmButtonText: '卸任' })
  } catch { return }
  try {
    await api({ url: `/admin/officers/${o.id}/end`, method: 'post', data: { end_reason: '组工作台卸任' } })
    ElMessage.success('已卸任（记录保留）')
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '卸任失败')
  }
}

// ── 添加成员（循环单人 PUT，逐项回报）──
const addDlg = reactive({ visible: false, userIds: [], slot: 'primary', submitting: false })
const users = ref([])
const usersLoading = ref(false)

async function fetchUsers() {
  if (users.value.length) return
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

const addableUsers = computed(() => {
  const inGroup = new Set((detail.value?.members || []).map(m => m.user_id))
  return users.value.filter(u => !inGroup.has(u.User_Id))
})

function openAddMember() {
  addDlg.userIds = []
  addDlg.slot = 'primary'
  addDlg.visible = true
  fetchUsers()
}

async function submitAddMembers() {
  addDlg.submitting = true
  const results = []
  for (const uid of addDlg.userIds) {
    try {
      await api({
        url: `/admin/club/membership/${uid}`, method: 'put',
        data: { [addDlg.slot]: props.groupId },
      })
      results.push({ ok: true, uid })
    } catch (e) {
      results.push({ ok: false, uid, reason: e.response?.data?.message || '失败' })
    }
  }
  addDlg.submitting = false
  const ok = results.filter(r => r.ok).length
  const bad = results.filter(r => !r.ok)
  const nameOf = (uid) => users.value.find(u => u.User_Id === uid)?.User_Name || `#${uid}`
  if (bad.length) {
    ElMessageBox.alert(
      bad.map(r => `${nameOf(r.uid)}：${r.reason}`).join('\n'),
      `添加完成：${ok} 成功 / ${bad.length} 失败`, { type: 'warning' },
    ).catch(() => {})
  } else {
    ElMessage.success(`已添加 ${ok} 名成员`)
  }
  addDlg.visible = false
  refreshAll()
}

// ── 批量导入成员（实名名单 → 后端核验姓名匹配预览 → 重名消歧 → 就绪行提交；A1）──
const batchDlg = reactive({ visible: false, loading: false, submitting: false,
  slot: 'primary', raw: '', rows: [] })
const batchFileRef = ref(null)

function openBatchMember() {
  batchDlg.visible = true          // rows 保留：未处理完的名单重开可继续
}

// 名单文本 → 姓名数组（取每行第一个非空单元格；跳过表头；纯数字按账号 ID）
function parseNameList(text) {
  const out = []
  for (const line of String(text || '').split(/\r?\n/)) {
    const cell = line.split(/[,，;；\t]/).map((s) => s.trim()).filter(Boolean)[0]
    if (!cell) continue
    if (!out.length && /^(姓名|实名|名字|name)$/i.test(cell)) continue
    out.push(cell)
  }
  return out
}

const batchItemOf = (index, cellOrUid) => ({
  index,
  ...(/^\d+$/.test(String(cellOrUid)) ? { user_id: Number(cellOrUid) } : { real_name: cellOrUid }),
  [batchDlg.slot]: props.groupId,
})

async function runBatchPreview() {
  const names = parseNameList(batchDlg.raw)
  if (!names.length) return ElMessage.warning('没有解析到姓名行')
  batchDlg.loading = true
  try {
    const res = await api({ url: '/admin/club/membership/batch/preview', method: 'post',
      data: { items: names.map((n, i) => batchItemOf(i, n)) } })
    const rows = res.data?.data?.rows || []
    batchDlg.rows = rows.map((r) => ({
      index: r.index, input: names[r.index] ?? '',
      match: r.match, reason: r.reason, chosen: null, result: null,
    }))
    const ready = batchDlg.rows.filter((r) => resolvedUid(r) && !r.reason).length
    ElMessage.success(`预览完成：${ready} 行就绪 / ${batchDlg.rows.length - ready} 行待处理`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '匹配预览失败')
  } finally {
    batchDlg.loading = false
  }
}

// 重名/冲突行：候选人员 × 参与账号 展开为可选账号（主号优先；合并号不产生新业务不列）
function candidateOptions(row) {
  const opts = []
  for (const p of row.match?.candidates || []) {
    const school = p.schools?.length ? ` · ${p.schools.join('/')}` : ''
    for (const a of p.accounts || []) {
      if (a.lifecycle === 'merged') continue
      opts.push({
        value: a.user_id,
        label: `${p.verified_name}（昵称 ${a.username} #${a.user_id}` +
          `${a.is_primary ? ' · 主号' : ''}${school}）` +
          (a.ineligible_reason ? ` · ${a.ineligible_reason}` : ''),
      })
    }
  }
  return opts
}

const resolvedUid = (row) => row.chosen || (
  ['unique_matched', 'explicit_id'].includes(row.match?.status)
    ? row.match?.resolved_user_id : null)

const resolvedLabel = (row) => {
  if (row.chosen) {
    const opt = candidateOptions(row).find((o) => o.value === row.chosen)
    return opt ? opt.label : `账号 #${row.chosen}`
  }
  const acc = row.match?.resolved_account
  return acc ? `${acc.username} #${acc.user_id}` : '—'
}

// 消歧选定后按显式 ID 重跑单行预览，槽位互斥等预检由后端算
async function rePreviewRow(row) {
  if (!row.chosen) return
  try {
    const res = await api({ url: '/admin/club/membership/batch/preview', method: 'post',
      data: { items: [batchItemOf(row.index, String(row.chosen))] } })
    const r = res.data?.data?.rows?.[0]
    if (r) { row.match = r.match; row.reason = r.reason }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '单行预检失败')
  }
}

const readyBatchRows = computed(() =>
  batchDlg.rows.filter((r) => !r.result && resolvedUid(r) && !r.reason))

async function submitBatchMembers() {
  const rows = readyBatchRows.value
  if (!rows.length) return
  batchDlg.submitting = true
  try {
    const res = await api({ url: '/admin/club/membership/batch', method: 'post',
      data: { items: rows.map((r) => ({ user_id: resolvedUid(r), [batchDlg.slot]: props.groupId })) } })
    const results = res.data?.data?.results || []
    rows.forEach((r, i) => { r.result = results[i] || { ok: false, reason: '无返回结果' } })
    const ok = results.filter((x) => x.ok).length
    ElMessage.success(`批量设置完成：${ok} 成功 / ${results.length - ok} 拒绝`)
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量设置失败')
  } finally {
    batchDlg.submitting = false
  }
}

function onBatchFile(ev) {
  const f = ev.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { batchDlg.raw = String(reader.result || ''); runBatchPreview() }
  reader.readAsText(f)
  ev.target.value = ''
}

// ── 成员行操作 ──
async function promotePrimary(row) {
  try {
    await ElMessageBox.confirm(
      `将 ${row.username} 在本组的归属转为主要组后，其原主要组归属将被替换。`,
      '转为主要', { type: 'info', confirmButtonText: '转为主要' })
  } catch { return }
  try {
    await api({
      url: `/admin/club/membership/${row.user_id}`, method: 'put',
      data: { primary: props.groupId },
    })
    ElMessage.success('已转为主要')
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

async function removeMember(row) {
  try {
    await ElMessageBox.confirm(
      `将 ${row.username} 移出${detail.value?.group?.name || '本组'}（${row.slot === 'primary' ? '主要' : '次要'}归属）。`,
      '移出本组', { type: 'warning', confirmButtonText: '移出' })
  } catch { return }
  try {
    await api({
      url: `/admin/club/membership/${row.user_id}`, method: 'put',
      data: { [row.slot]: null },
    })
    ElMessage.success('已移出')
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

// ── 编辑组 / 归档（自旧组树页迁入）──
const cascaderProps = { checkStrictly: true, emitPath: false }
const editDlg = reactive({ visible: false, submitting: false, form: {} })

const parentOptions = computed(() => buildGroupCascaderOptions(props.groupRows, props.groupId))

function openEditGroup() {
  const g = detail.value?.group
  if (!g) return
  editDlg.form = { name: g.name, parent_id: g.parent_id, sort_order: g.sort_order,
                   description: g.description || '' }
  editDlg.visible = true
}

async function submitEditGroup() {
  const f = editDlg.form
  if (!f.name?.trim()) return ElMessage.warning('请输入组名')
  editDlg.submitting = true
  try {
    const res = await api({
      url: `/admin/club/groups/${props.groupId}`, method: 'put',
      data: {
        name: f.name.trim(), parent_id: f.parent_id ?? null,
        sort_order: f.sort_order ?? 0, description: (f.description || '').trim(),
      },
    })
    ElMessage.success(res.data?.message || '已保存')
    editDlg.visible = false
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    editDlg.submitting = false
  }
}

async function confirmArchive() {
  const g = detail.value?.group
  try {
    await ElMessageBox.confirm(
      `归档后「${g.name}」将从组织架构页与所有选择器隐藏，历史徽标 / 档案仍解析组名。`,
      `归档「${g.name}」`, { type: 'warning', confirmButtonText: '归档' })
  } catch { return }
  try {
    const res = await api({ url: `/admin/club/groups/${props.groupId}/archive`, method: 'post' })
    ElMessage.success(res.data?.message || '已归档')
    refreshAll()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '归档失败')
  }
}

// 删除仅零引用（子组/任职/归属都算引用——历史档案要能解析组名），与旧组树页同口径
const hasRefs = computed(() => {
  const refs = detail.value?.group?.refs || {}
  return Object.values(refs).some(n => (n || 0) > 0)
})

async function confirmDelete() {
  const g = detail.value?.group
  try {
    await ElMessageBox.confirm(
      `删除「${g.name}」不可恢复（当前零引用才可删）。`,
      `删除「${g.name}」`, { type: 'warning', confirmButtonText: '删除' })
  } catch { return }
  try {
    const res = await api({ url: `/admin/club/groups/${props.groupId}`, method: 'delete' })
    ElMessage.success(res.data?.message || '已删除')
    detail.value = null
    emit('refresh')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}
</script>

<style scoped>
.group-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.empty-card :deep(.dew-card__body) {
  padding: 48px 24px;
}

.empty-hint {
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.head-card :deep(.dew-card__body) {
  padding: 16px 20px;
}

.head-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-primary, var(--el-text-color-primary));
}

.head-desc {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 120px;
}

.slot-card :deep(.dew-card__body) {
  padding: 14px 18px;
}

.slot-card :deep(.dew-card__header) {
  padding: 14px 18px 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.slot-item {
  min-width: 190px;
  max-width: 250px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}

.slot-item.vacant {
  border-style: dashed;
  border-color: var(--el-border-color);
}

.slot-pos {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.slot-holder {
  display: flex;
  align-items: center;
  gap: 10px;
}

.holder-name {
  font-weight: 500;
  font-size: 13.5px;
}

.holder-term {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.slot-empty {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 8px 0;
}

.slot-ops {
  margin-top: 8px;
}

.slot-extra {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.overseer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.overseer-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.overseer-link {
  margin-left: auto;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.table-card :deep(.dew-card__header) {
  padding: 12px 18px 0;
}

.members-title {
  padding: 4px 0;
}

.add-btn {
  margin-left: auto;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-empty {
  padding: 18px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.text-muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.option-id {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.batch-import-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
}

.batch-warn {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
