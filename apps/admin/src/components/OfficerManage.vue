<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">社团职务</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" :model="query" @submit.prevent>
          <el-form-item>
            <el-radio-group v-model="query.status" @change="fetchOfficers">
              <el-radio-button value="active">在任</el-radio-button>
              <el-radio-button value="ended">已卸任</el-radio-button>
              <el-radio-button value="all">全部</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-input v-model="query.q" placeholder="姓名 / 职位 / 组" clearable @keyup.enter="handleSearch"
              @clear="handleSearch" style="width: 200px;" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="query.showGroup" @change="handleSearch">显示组内职位</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" plain @click="openAppoint">
              <el-icon><Plus /></el-icon>任命
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button plain @click="openBatch">
              <el-icon><Upload /></el-icon>批量导入
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
    <p class="page-subtitle">
      只管全社治理头衔（社长/副社长/团支书等社团职务）的任命与卸任，挂组即分管该组；
      组长等组内职位在「小组管理」页的组内设置，勾选「显示组内职位」可在此审计全部任职。
    </p>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading">
        <el-table-column label="成员" min-width="180">
          <template #default="{ row }">
            <div class="member-cell">
              <el-avatar :size="30" :src="assetUrl(row.avatar)">{{ (row.username || '?').charAt(0) }}</el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="职位" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="positionsById[row.title_id]?.badge_tier === 1 ? 'warning' : 'info'" size="small" effect="plain">
              {{ row.title }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="归属组" min-width="140">
          <template #default="{ row }">
            {{ row.department || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="任期起" width="120" align="center" prop="term_start" />
        <el-table-column label="任期止" width="120" align="center">
          <template #default="{ row }">
            {{ row.term_end || '在任' }}
          </template>
        </el-table-column>
        <el-table-column label="卸任原因" min-width="140">
          <template #default="{ row }">
            <span v-if="row.status === 'ended'">{{ row.end_reason || '—' }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'active'">
              <el-button size="small" link @click="openEdit(row)">编辑</el-button>
              <el-button size="small" link type="danger" @click="openEnd(row)">卸任</el-button>
            </template>
            <el-button v-else size="small" link @click="openEdit(row)">修正</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination @current-change="handlePageChange" layout="prev, pager, next" :total="total"
          :current-page="page" :page-size="perPage" />
      </div>
    </DewCard>

    <!-- 任命 / 编辑（active 行） -->
    <el-dialog v-model="dlg.visible" :title="dlg.id ? '编辑任职' : '任命干事'" width="520px">
      <el-form :model="dlg.form" label-width="90px">
        <el-form-item v-if="!dlg.id" label="成员" required>
          <el-select v-model="dlg.form.user_id" placeholder="搜索并选择社员" filterable style="width: 100%;">
            <el-option v-for="u in users" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id">
              <span>{{ u.User_Name }}</span>
              <span v-if="u.verification_status && u.verification_status !== 'verified'" class="option-warn">未核验</span>
              <span class="option-id">#{{ u.User_Id }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="职位" required>
          <el-select v-model="dlg.form.title_id" placeholder="选择职位" style="width: 100%;">
            <el-option v-for="p in positionOptions" :key="p.id" :label="p.name" :value="p.id">
              <span>{{ p.name }}</span>
              <span class="option-id">{{ ruleText(p.group_rule) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="归属组">
          <el-cascader v-model="dlg.form.group_id" :options="groupOptions" :props="cascaderProps"
            :disabled="selectedPos?.group_rule === 'forbidden'"
            :placeholder="groupPlaceholder" clearable style="width: 100%;" />
        </el-form-item>
        <el-form-item label="任期起" required>
          <el-date-picker v-model="dlg.form.term_start" type="date" value-format="YYYY-MM-DD"
            placeholder="选择日期" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="任职范围">
          <el-input v-model="dlg.form.scope_note" maxlength="200" show-word-limit
            placeholder="选填（展示在个人主页社团身份卡，如：统筹硬件组日常培训与器材管理）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.submitting" @click="submitAppointOrEdit">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 卸任 -->
    <el-dialog v-model="endDlg.visible" title="卸任（记录保留）" width="480px">
      <el-form :model="endDlg.form" label-width="90px">
        <el-form-item label="卸任日期" required>
          <el-date-picker v-model="endDlg.form.term_end" type="date" value-format="YYYY-MM-DD"
            style="width: 100%;" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="endDlg.form.end_reason" type="textarea" :rows="2" maxlength="200" show-word-limit
            placeholder="选填（如：换届 / 因学业卸任）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="endDlg.visible = false">取消</el-button>
          <el-button type="danger" :loading="endDlg.submitting" @click="submitEnd">确认卸任</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ended 行修正（仅卸任留痕两字段） -->
    <el-dialog v-model="fixDlg.visible" title="修正卸任信息" width="480px">
      <el-form :model="fixDlg.form" label-width="90px">
        <el-form-item label="任期止">
          <el-date-picker v-model="fixDlg.form.term_end" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="卸任原因">
          <el-input v-model="fixDlg.form.end_reason" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="fixDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="fixDlg.submitting" @click="submitFix">确认修正</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量任命（实名名单：粘贴/上传 → 后端按核验姓名匹配 → 重名消歧 → 整表确认；A1 2026-10-04） -->
    <el-dialog v-model="batchDlg.visible" title="批量任命（实名名单）" width="880px"
      :close-on-click-modal="false">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
        title="粘贴一列实名姓名即可，无需事先查账号 ID：系统按当前核验姓名匹配并自动预填；重名行展开候选人工确认，确认后按账号 ID 提交并全量重验" />
      <el-form :inline="true" class="form-inline" @submit.prevent>
        <el-form-item label="职位">
          <el-select v-model="batchDlg.title_id" placeholder="整批职位" style="width: 160px;">
            <el-option v-for="p in positionOptions" :key="p.id" :label="p.name" :value="p.id">
              <span>{{ p.name }}</span>
              <span class="option-id">{{ ruleText(p.group_rule) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="归属组">
          <el-cascader v-model="batchDlg.group_id" :options="groupOptions" :props="cascaderProps"
            :disabled="batchPos?.group_rule === 'forbidden'" placeholder="可选" clearable style="width: 180px;" />
        </el-form-item>
        <el-form-item label="任期起">
          <el-date-picker v-model="batchDlg.term_start" type="date" value-format="YYYY-MM-DD"
            style="width: 140px;" />
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
            <span v-else class="hint">无可选候选</span>
          </template>
        </el-table-column>
        <el-table-column label="预检" min-width="200">
          <template #default="{ row }">
            <span v-if="row.reason" class="batch-warn">{{ row.reason }}</span>
            <el-tag v-else-if="resolvedUid(row) && !row.result" type="success" size="small" effect="plain">就绪</el-tag>
            <span v-else class="hint">—</span>
          </template>
        </el-table-column>
        <el-table-column label="提交结果" min-width="180">
          <template #default="{ row }">
            <template v-if="row.result">
              <el-tag :type="row.result.ok ? 'success' : 'danger'" size="small" effect="plain">
                {{ row.result.ok ? '已任命' : '拒绝' }}
              </el-tag>
              <span v-if="!row.result.ok" class="batch-msg">{{ row.result.reason }}</span>
            </template>
            <span v-else class="hint">—</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="batchDlg.visible = false">关闭（未就绪行保留，重开可继续）</el-button>
          <el-button type="primary" :loading="batchDlg.submitting" :disabled="!readyBatchRows.length"
            @click="submitBatchAppoint">提交已就绪 {{ readyBatchRows.length }} 行</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus, Upload } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api, { assetUrl } from '../api'
import { buildGroupCascaderOptions } from '../utils/club'

const route = useRoute()

// ── 职位与组树：后台可配数据（/admin/club/*），不再前端硬编码（设计方案 §0.1 双源漂移清账）──
const positions = ref([])
const positionsById = computed(() => Object.fromEntries(positions.value.map(p => [p.id, p])))
const groupOptions = ref([])

const ruleText = (rule) => ({ forbidden: '不挂组', optional: '组可选', required: '须挂组' }[rule] || '')

// 本页只任命社团职务（org_slot=club）；编辑组内职位行时把行自身职位追加进选项兜底显示
const positionOptions = computed(() => {
  const list = positions.value.filter(p => p.status === 'active' && p.org_slot === 'club')
  if (dlg.id && dlg.form.title_id) {
    const cur = positionsById.value[dlg.form.title_id]
    if (cur && !list.some(p => p.id === cur.id)) list.push(cur)
  }
  return list
})

async function fetchClubMeta() {
  try {
    const [pres, gres] = await Promise.all([
      api({ url: '/admin/club/positions', method: 'get' }),
      api({ url: '/admin/club/groups', method: 'get' }),
    ])
    positions.value = pres.data?.data?.positions || []
    groupOptions.value = buildGroupCascaderOptions(gres.data?.data?.groups || [])
  } catch { /* 配置拉不到时列表照常展示，任命提交由后端兜底报错 */ }
}

const cascaderProps = { checkStrictly: true, emitPath: false }

// ── 列表 ──
const rows = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = 20
const query = reactive({ status: 'active', q: '', showGroup: false })

const fetchOfficers = async () => {
  loading.value = true
  try {
    const res = await api({
      url: '/admin/officers',
      method: 'get',
      params: {
        page: page.value, per_page: perPage, status: query.status,
        slot: query.showGroup ? 'all' : 'club',
        q: query.q || undefined,
      },
    })
    const data = res.data?.data
    rows.value = data?.officers || []
    total.value = data?.total || 0
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取任职列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { page.value = 1; fetchOfficers() }
const handlePageChange = (p) => { page.value = p; fetchOfficers() }

// ── 用户选择（照 MedalGrant：/user/user_list 全量 + filterable）──
const users = ref([])
const fetchUsers = async () => {
  try {
    const res = await api({ url: '/user/user_list', method: 'get' })
    users.value = res.data || []
  } catch { /* 选择器拿不到名单时仍可管理现有任职；任命时再报 */ }
}

// ── 任命 / 编辑 ──
const today = () => new Date().toISOString().slice(0, 10)
const dlg = reactive({ visible: false, id: null, submitting: false, form: {} })

const openAppoint = () => {
  dlg.id = null
  dlg.form = { user_id: null, title_id: null, group_id: null, term_start: today(), scope_note: '' }
  dlg.visible = true
  if (!users.value.length) fetchUsers()
}

const openEdit = (row) => {
  if (row.status === 'ended') {
    fixDlg.id = row.id
    fixDlg.form = { term_end: row.term_end, end_reason: row.end_reason || '' }
    fixDlg.visible = true
    return
  }
  dlg.id = row.id
  dlg.form = {
    user_id: row.user_id,
    title_id: row.title_id,
    group_id: row.group_id ?? null,
    term_start: row.term_start,
    scope_note: row.scope_note || '',
  }
  dlg.visible = true
}

// 当前选中职位（group_rule 联动依据）
const selectedPos = computed(() => positionsById.value[dlg.form.title_id] || null)

const groupPlaceholder = computed(() => {
  const rule = selectedPos.value?.group_rule
  if (rule === 'forbidden') return '该职位不挂组'
  if (rule === 'required') return '必选（该职位必须归属一个组）'
  return '可选'
})

// forbidden 职位切入选时清空组选择，避免带着旧组提交被 400
watch(() => dlg.form.title_id, () => {
  if (selectedPos.value?.group_rule === 'forbidden') dlg.form.group_id = null
})

const submitAppointOrEdit = async () => {
  const f = dlg.form
  if (!dlg.id && !f.user_id) return ElMessage.warning('请选择成员')
  if (!f.title_id) return ElMessage.warning('请选择职位')
  if (selectedPos.value?.group_rule === 'required' && !f.group_id)
    return ElMessage.warning(`${selectedPos.value.name}必须归属一个组`)
  if (!f.term_start) return ElMessage.warning('请选择任期起')

  dlg.submitting = true
  try {
    // id 轨道入参（名/id 双轨的后端已兼容）；group_id 显式 null = 清空挂组；scope_note 空串归一 null
    const payload = { title_id: f.title_id, group_id: f.group_id ?? null, term_start: f.term_start,
                      scope_note: (f.scope_note || '').trim() || null }
    if (dlg.id) {
      await api({ url: `/admin/officers/${dlg.id}`, method: 'put', data: payload })
      ElMessage.success('任职信息已更新')
    } else {
      await api({ url: '/admin/officers', method: 'post', data: { user_id: Number(f.user_id), ...payload } })
      ElMessage.success('已任命')
    }
    dlg.visible = false
    fetchOfficers()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    dlg.submitting = false
  }
}

// ── 卸任 ──
const endDlg = reactive({ visible: false, id: null, submitting: false, form: {} })
const openEnd = (row) => {
  endDlg.id = row.id
  endDlg.form = { term_end: today(), end_reason: '' }
  endDlg.visible = true
}
const submitEnd = async () => {
  endDlg.submitting = true
  try {
    await api({ url: `/admin/officers/${endDlg.id}/end`, method: 'post', data: endDlg.form })
    ElMessage.success('已卸任（记录保留）')
    endDlg.visible = false
    fetchOfficers()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '卸任失败')
  } finally {
    endDlg.submitting = false
  }
}

// ── ended 行修正 ──
const fixDlg = reactive({ visible: false, id: null, submitting: false, form: {} })
const submitFix = async () => {
  fixDlg.submitting = true
  try {
    await api({ url: `/admin/officers/${fixDlg.id}`, method: 'put', data: fixDlg.form })
    ElMessage.success('已修正')
    fixDlg.visible = false
    fetchOfficers()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '修正失败')
  } finally {
    fixDlg.submitting = false
  }
}

// ── 批量任命（实名名单 → 后端核验姓名匹配预览 → 重名消歧 → 就绪行整表提交；A1）──
const batchDlg = reactive({ visible: false, loading: false, submitting: false,
  title_id: null, group_id: null, term_start: today(), raw: '', rows: [] })
const batchFileRef = ref(null)
const batchPos = computed(() => positionsById.value[batchDlg.title_id] || null)

function openBatch() {
  if (!batchDlg.term_start) batchDlg.term_start = today()
  batchDlg.visible = true       // rows 保留：未处理完的名单重开可继续
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
  title_id: batchDlg.title_id, group_id: batchDlg.group_id ?? null, term_start: batchDlg.term_start,
})

async function runBatchPreview() {
  if (!batchDlg.title_id) return ElMessage.warning('请先选择整批职位')
  if (batchPos.value?.group_rule === 'required' && !batchDlg.group_id)
    return ElMessage.warning(`${batchPos.value.name}必须归属一个组`)
  if (!batchDlg.term_start) return ElMessage.warning('请选择任期起')
  const names = parseNameList(batchDlg.raw)
  if (!names.length) return ElMessage.warning('没有解析到姓名行')
  batchDlg.loading = true
  try {
    const res = await api({ url: '/admin/officers/batch/preview', method: 'post',
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

// 重名/冲突行：候选人员 × 参与账号 展开为可选账号（主号优先展示；合并号不产生新业务不列）
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
  const acc = row.match?.resolved_account
  if (row.chosen) {
    const opt = candidateOptions(row).find((o) => o.value === row.chosen)
    return opt ? opt.label : `账号 #${row.chosen}`
  }
  return acc ? `${acc.username} #${acc.user_id}` : '—'
}

// 消歧选定后按显式 ID 重跑单行预览，资格预检由后端算（前端不自判门槛）
async function rePreviewRow(row) {
  if (!row.chosen) return
  try {
    const res = await api({ url: '/admin/officers/batch/preview', method: 'post',
      data: { items: [batchItemOf(row.index, String(row.chosen))] } })
    const r = res.data?.data?.rows?.[0]
    if (r) { row.match = r.match; row.reason = r.reason }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '单行预检失败')
  }
}

const readyBatchRows = computed(() =>
  batchDlg.rows.filter((r) => !r.result && resolvedUid(r) && !r.reason))

async function submitBatchAppoint() {
  const rows = readyBatchRows.value
  if (!rows.length) return
  batchDlg.submitting = true
  try {
    const res = await api({ url: '/admin/officers/batch', method: 'post',
      data: { items: rows.map((r) => ({ user_id: resolvedUid(r),
        title_id: batchDlg.title_id, group_id: batchDlg.group_id ?? null,
        term_start: batchDlg.term_start })) } })
    const results = res.data?.data?.results || []
    rows.forEach((r, i) => { r.result = results[i] || { ok: false, reason: '无返回结果' } })
    const ok = results.filter((x) => x.ok).length
    ElMessage.success(`批量任命完成：${ok} 成功 / ${results.length - ok} 拒绝`)
    fetchOfficers()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量任命失败')
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

onMounted(() => {
  // 深链预填：小组管理页「前往社团职务处理」带 ?q=<关键词> 跳入
  if (route.query.q) query.q = String(route.query.q)
  fetchOfficers()
  fetchUsers()
  fetchClubMeta()
})

// 同页复用（仅 query 变化）时跟随刷新
watch(() => route.query.q, (q) => {
  if (q !== undefined && q !== query.q) {
    query.q = String(q || '')
    handleSearch()
  }
})
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }

.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-id {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.option-warn {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-color-warning);
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.batch-import-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
}

.batch-msg,
.batch-warn {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.batch-warn {
  color: var(--el-color-warning);
}
</style>
