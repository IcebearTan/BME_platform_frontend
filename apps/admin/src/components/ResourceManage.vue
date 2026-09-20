<script setup>
// 平台资料管理（2026-09-20，学习资源中心第一期）：独立资料的上传/编辑/删除/排序。
// 课程资料仍在课程管理页维护，本页只管 standalone_resource。
// 数据流对齐 ArticleManage：全量拉回 + 本地筛选 + 前端分页（资料量小）。
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Upload, Edit, Delete, Top, Bottom } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

// 分类枚举（与后端 resource_center.py CATEGORIES 同步）
const CATEGORIES = [
  { value: 'software', label: '软件工具' },
  { value: 'handbook', label: '学习手册' },
  { value: 'standard', label: '规范文档' },
  { value: 'other', label: '其他' }
]
const CATEGORY_TAG = { software: 'primary', handbook: 'success', standard: 'warning', other: 'info' }
const categoryLabel = (key) => (CATEGORIES.find(c => c.value === key) || {}).label || key

// ── 列表数据 ──
const allResources = ref([])
const loading = ref(false)
const query = ref({ category: '', key: '' })
const searched = ref({ category: '', key: '' })
const page = ref(1)
const pageSize = 15

const fetchResources = async () => {
  loading.value = true
  try {
    // 后端 per_page 封顶 50，分页取全量（资料量小，最多拉 20 页兜底）
    const rows = []
    let p = 1
    let pages = 1
    do {
      const res = await api.get('/resources/standalone', { params: { page: p, per_page: 50 } })
      if (res.data.code !== 200) throw new Error(res.data.message || '加载失败')
      rows.push(...(res.data.data || []))
      pages = res.data.pages || 1
      p += 1
    } while (p <= pages && p <= 20)
    allResources.value = rows
  } catch (e) {
    ElMessage.error('平台资料加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchResources)

// ── 本地筛选 + 前端分页 ──
const filteredResources = computed(() => {
  const { category, key } = searched.value
  const kw = (key || '').trim().toLowerCase()
  return allResources.value.filter(r =>
    (!category || r.category === category) &&
    (!kw || (r.name || '').toLowerCase().includes(kw))
  )
})

const pagedResources = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredResources.value.slice(start, start + pageSize)
})

const handleSearch = () => {
  searched.value = { ...query.value }
  page.value = 1
}

const handlePageChange = (p) => { page.value = p }

// ── 大小格式化 ──
const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

// ── 上传弹窗 ──
const uploadDlg = ref({
  visible: false, uploading: false,
  category: 'software', description: '',
  files: []
})

const openUpload = () => {
  uploadDlg.value = { visible: true, uploading: false, category: 'software', description: '', files: [] }
}

const submitUpload = async () => {
  if (!uploadDlg.value.files.length) {
    ElMessage.warning('请先选择文件')
    return
  }
  uploadDlg.value.uploading = true
  try {
    const fd = new FormData()
    fd.append('category', uploadDlg.value.category)
    fd.append('description', uploadDlg.value.description || '')
    uploadDlg.value.files.forEach(f => fd.append('Files', f.raw))
    const res = await api.post('/resources/standalone', fd)
    if (res.data.code === 200) {
      ElMessage.success(`成功上传 ${res.data.data.length} 个文件`)
      uploadDlg.value.visible = false
      fetchResources()
    } else {
      ElMessage.error(res.data.message || '上传失败')
    }
  } catch (e) {
    const data = e.response?.data
    let msg = '上传失败，请稍后重试'
    if (typeof data?.message === 'string') msg = data.message
    else if (data?.message && typeof data.message === 'object') {
      const k = Object.keys(data.message)[0]
      msg = data.message[k]?.[0] || msg
    }
    ElMessage.error(msg)
  } finally {
    uploadDlg.value.uploading = false
  }
}

// ── 编辑弹窗 ──
const editDlg = ref({
  visible: false, submitting: false,
  id: null, name: '', category: 'other', description: ''
})
const editRules = {
  name: [{ required: true, message: '请输入资料名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}
const editFormRef = ref(null)

const openEdit = (row) => {
  editDlg.value = {
    visible: true, submitting: false,
    id: row.id, name: row.name, category: row.category,
    description: row.description || ''
  }
}

const submitEdit = async () => {
  const ok = await editFormRef.value?.validate().catch(() => false)
  if (!ok) return
  editDlg.value.submitting = true
  try {
    const res = await api.put(`/resources/standalone/${editDlg.value.id}`, {
      name: editDlg.value.name,
      category: editDlg.value.category,
      description: editDlg.value.description || ''
    })
    if (res.data.code === 200) {
      ElMessage.success('已更新')
      editDlg.value.visible = false
      fetchResources()
    } else {
      ElMessage.error(res.data.message || '更新失败')
    }
  } catch (e) {
    const data = e.response?.data
    let msg = '更新失败，请稍后重试'
    if (typeof data?.message === 'string') msg = data.message
    else if (data?.message && typeof data.message === 'object') {
      const k = Object.keys(data.message)[0]
      msg = data.message[k]?.[0] || msg
    }
    ElMessage.error(msg)
  } finally {
    editDlg.value.submitting = false
  }
}

// ── 删除 ──
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除资料「${row.name}」吗？文件将同时从存储中移除。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const res = await api.delete(`/resources/standalone/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchResources()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  }).catch((error) => {
    if (error !== 'cancel') {
      const data = error.response?.data
      ElMessage.error((typeof data?.message === 'string' && data.message) || '删除失败，请稍后重试')
    }
  })
}

// ── 排序（上移/下移：筛选视图内换位 → 全量 id 重排落库，失败回拉） ──
const viewIndexOf = (row) => filteredResources.value.findIndex(x => x.id === row.id)

const canMoveUp = (row) => viewIndexOf(row) > 0
const canMoveDown = (row) => viewIndexOf(row) >= 0 && viewIndexOf(row) < filteredResources.value.length - 1

const moveItem = async (row, dir) => {
  const view = filteredResources.value
  const i = viewIndexOf(row)
  const j = i + dir
  if (i < 0 || j < 0 || j >= view.length) return
  const other = view[j]
  const arr = [...allResources.value]
  const ai = arr.findIndex(x => x.id === row.id)
  const aj = arr.findIndex(x => x.id === other.id)
  ;[arr[ai], arr[aj]] = [arr[aj], arr[ai]]     // 全局数组内两行换位，其余相对顺序不变
  try {
    const res = await api.post('/resources/standalone/sort', { Resource_Ids: arr.map(x => x.id) })
    if (res.data.code === 200) {
      allResources.value = arr
    } else {
      ElMessage.error(res.data.message || '排序失败')
    }
  } catch (e) {
    ElMessage.error('排序失败，请稍后重试')
    fetchResources()
  }
}
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">平台资料管理</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" :model="query" @submit.prevent>
          <el-form-item label="分类">
            <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 140px"
              @change="handleSearch">
              <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="query.key" placeholder="输入资料名称" clearable
              @keyup.enter="handleSearch" @clear="handleSearch" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" plain @click="openUpload">
              <el-icon style="margin-right: 4px;"><Upload /></el-icon>上传资料
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="pagedResources" v-loading="loading" style="width: 100%; border-radius: 10px;"
        max-height="calc(100vh - 320px)" :row-style="{ height: '40px' }">
        <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            <el-tag :type="CATEGORY_TAG[row.category] || 'info'" size="small">{{ categoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column prop="uploader" label="上传人" width="110" />
        <el-table-column prop="created_at" label="上传时间" width="140" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" :disabled="!canMoveUp(row)" @click="moveItem(row, -1)">
              <el-icon><Top /></el-icon>上移
            </el-button>
            <el-button text size="small" :disabled="!canMoveDown(row)" @click="moveItem(row, 1)">
              <el-icon><Bottom /></el-icon>下移
            </el-button>
            <el-button text size="small" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination @current-change="handlePageChange" layout="prev, pager, next"
          :total="filteredResources.length" :current-page="page" :page-size="pageSize" />
      </div>
    </DewCard>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadDlg.visible" title="上传平台资料" width="560px">
      <el-form label-width="90px">
        <el-form-item label="分类" required>
          <el-select v-model="uploadDlg.category" style="width: 100%">
            <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="uploadDlg.description" type="textarea" :rows="2" maxlength="500" show-word-limit
            placeholder="一句话说明（选填，悬停资料名时可见）" />
        </el-form-item>
        <el-form-item label="文件" required>
          <el-upload drag multiple :auto-upload="false" v-model:file-list="uploadDlg.files"
            style="width: 100%;">
            <el-icon style="font-size: 40px; color: #909399;"><Upload /></el-icon>
            <div style="margin-top: 6px;">将文件拖拽到此处，或 <em>点击选择</em>（可多选，单文件不超过 100MB）</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="uploadDlg.uploading" :disabled="!uploadDlg.files.length"
            @click="submitUpload">上传所选文件</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDlg.visible" title="编辑资料信息" width="520px">
      <el-form ref="editFormRef" :model="editDlg" :rules="editRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="editDlg.name" maxlength="200" show-word-limit placeholder="展示名（含扩展名）" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="editDlg.category" style="width: 100%">
            <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="editDlg.description" type="textarea" :rows="2" maxlength="500" show-word-limit
            placeholder="一句话说明（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="editDlg.submitting" @click="submitEdit">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 表体高度由 el-table max-height prop 内滚（视口锚定），卡片不定高裁切 */
.table-card { overflow: hidden; }
.table-card :deep(.dew-card__body) { padding: 0; }
</style>
