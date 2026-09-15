<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">社团干事</div>
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
            <el-button type="primary" plain @click="openAppoint">
              <el-icon><Plus /></el-icon>任命
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

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
            <el-tag :type="isManagement(row.title) ? 'warning' : 'info'" size="small" effect="plain">
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
              <span class="option-id">#{{ u.User_Id }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="职位" required>
          <el-select v-model="dlg.form.title" placeholder="选择职位" style="width: 100%;" @change="onTitleChange">
            <el-option v-for="t in TITLE_CHOICES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="归属组">
          <el-cascader v-model="dlg.form.department" :options="ORG_TREE" :props="cascaderProps"
            :disabled="dlg.form.title === '社长'" placeholder="选择组（社长不挂组）" clearable style="width: 100%;" />
        </el-form-item>
        <el-form-item label="任期起" required>
          <el-date-picker v-model="dlg.form.term_start" type="date" value-format="YYYY-MM-DD"
            placeholder="选择日期" style="width: 100%;" />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api, { assetUrl } from '../api'

// ── 常量（与后端 blueprints/officers.py 同源；换届重组只改此处）──
const TITLE_MANAGEMENT = ['社长', '副社长', '团支书', '副团支书']
const TITLE_CHOICES = [...TITLE_MANAGEMENT, '组长', '组员']
const isManagement = (t) => TITLE_MANAGEMENT.includes(t)

// 组织树：三级，任一节点可选（级联存叶子/所选组名，组名全树唯一）
const ORG_TREE = [
  { value: '成员发展组', label: '成员发展组' },
  { value: '运行保障组', label: '运行保障组' },
  {
    value: '项目运营组', label: '项目运营组',
    children: [
      {
        value: '培训组', label: '培训组',
        children: [
          { value: '硬件组', label: '硬件组' },
          { value: '软件组', label: '软件组' },
          { value: '先进制造组', label: '先进制造组' },
          { value: '柔性电子组', label: '柔性电子组' },
        ],
      },
      { value: '项目组', label: '项目组' },
      { value: '赛事组', label: '赛事组' },
      { value: '游学组', label: '游学组' },
    ],
  },
  { value: '行业交流组', label: '行业交流组' },
  {
    value: '品牌建设组', label: '品牌建设组',
    children: [
      { value: '活动组', label: '活动组' },
      { value: '文宣组', label: '文宣组' },
    ],
  },
  { value: '临床调研组', label: '临床调研组' },
]
const cascaderProps = { checkStrictly: true, emitPath: false }

// ── 列表 ──
const rows = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = 20
const query = reactive({ status: 'active', q: '' })

const fetchOfficers = async () => {
  loading.value = true
  try {
    const res = await api({
      url: '/admin/officers',
      method: 'get',
      params: { page: page.value, per_page: perPage, status: query.status, q: query.q || undefined },
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
  dlg.form = { user_id: null, title: '', department: null, term_start: today() }
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
    title: row.title,
    department: row.department || null,
    term_start: row.term_start,
  }
  dlg.visible = true
}

// 社长不挂组：切到社长时清空组选择，避免后端 400
const onTitleChange = (t) => { if (t === '社长') dlg.form.department = null }

const submitAppointOrEdit = async () => {
  const f = dlg.form
  if (!dlg.id && !f.user_id) return ElMessage.warning('请选择成员')
  if (!f.title) return ElMessage.warning('请选择职位')
  if ((f.title === '组长' || f.title === '组员') && !f.department) return ElMessage.warning(`${f.title}必须归属一个组`)
  if (!f.term_start) return ElMessage.warning('请选择任期起')

  dlg.submitting = true
  try {
    if (dlg.id) {
      await api({ url: `/admin/officers/${dlg.id}`, method: 'put', data: {
        title: f.title, department: f.department, term_start: f.term_start } })
      ElMessage.success('任职信息已更新')
    } else {
      await api({ url: '/admin/officers', method: 'post', data: {
        user_id: Number(f.user_id), title: f.title, department: f.department, term_start: f.term_start } })
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

onMounted(() => {
  fetchOfficers()
  fetchUsers()
})
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }

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
</style>
