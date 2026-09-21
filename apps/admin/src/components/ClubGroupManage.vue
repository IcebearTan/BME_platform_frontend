<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">组树</div>
      <div class="header-actions">
        <el-button type="primary" plain @click="openCreate(null)">
          <el-icon><Plus /></el-icon>新建一级组
        </el-button>
        <el-button @click="fetchGroups" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      组名全树唯一（徽标消歧依赖）；层级上限 4 级；有子组 / 任职 / 归属引用的组只能归档不能删除——归档后在架构页与选择器隐藏，历史档案仍解析组名。
    </p>

    <DewCard no-hover class="table-card">
      <el-table :data="tree" v-loading="loading" row-key="id" default-expand-all
        :tree-props="{ children: 'children' }">
        <el-table-column label="组别" min-width="240">
          <template #default="{ row }">
            <span class="group-name">{{ row.name }}</span>
            <el-tag v-if="row.status !== 'active'" size="small" type="info" effect="plain" class="status-tag">
              已归档
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="70" align="center" prop="sort_order" />
        <el-table-column label="在任干事" width="90" align="center">
          <template #default="{ row }">{{ row.refs.officers }}</template>
        </el-table-column>
        <el-table-column label="归属成员" width="90" align="center">
          <template #default="{ row }">{{ row.refs.members }}</template>
        </el-table-column>
        <el-table-column label="子组" width="70" align="center">
          <template #default="{ row }">{{ row.refs.children }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 'active'" size="small" link type="primary" @click="openCreate(row)">
              加子组
            </el-button>
            <el-button size="small" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status === 'active'" size="small" link type="warning"
              :disabled="row.refs.children > 0 || row.refs.members > 0" @click="confirmArchive(row)">
              归档
            </el-button>
            <el-button size="small" link type="danger"
              :disabled="row.refs.children > 0 || row.refs.officers > 0 || row.refs.members > 0"
              @click="confirmDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 新建 / 编辑（改名 / 挪父 / 调序共用） -->
    <el-dialog v-model="dlg.visible" :title="dlg.id ? `编辑组「${dlg.originName}」` : '新建组'" width="520px">
      <el-form :model="dlg.form" label-width="90px">
        <el-form-item label="组名" required>
          <el-input v-model="dlg.form.name" maxlength="50" show-word-limit placeholder="全树唯一" />
        </el-form-item>
        <el-form-item label="父组">
          <el-cascader v-model="dlg.form.parent_id" :options="parentOptions" :props="cascaderProps"
            placeholder="不选 / 清空 = 一级组" clearable style="width: 100%;" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dlg.form.sort_order" :min="0" :max="999" />
          <span class="form-hint">同父内小者在前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.submitting" @click="submit">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api from '../api'
import { buildGroupCascaderOptions } from '../utils/club'

// ── 列表：接口平铺行 → 展示树（排序由后端 sort_order 保证，前端只组装）──
const rows = ref([])
const loading = ref(false)

const tree = computed(() => {
  const nodes = new Map(rows.value.map(r => [r.id, { ...r, children: [] }]))
  const roots = []
  nodes.forEach(n => {
    if (n.parent_id && nodes.has(n.parent_id)) nodes.get(n.parent_id).children.push(n)
    else roots.push(n)
  })
  const strip = n => (n.children.length ? n.children.forEach(strip) : delete n.children)
  roots.forEach(strip)
  return roots
})

async function fetchGroups() {
  loading.value = true
  try {
    const res = await api({ url: '/admin/club/groups', method: 'get' })
    rows.value = res.data?.data?.groups || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组树失败')
  } finally {
    loading.value = false
  }
}

// ── 新建 / 编辑 ──
const cascaderProps = { checkStrictly: true, emitPath: false }
const dlg = reactive({ visible: false, id: null, originName: '', submitting: false, form: {} })

// 编辑时排除自身子树（防挪成环）；归档组不可作父
const parentOptions = computed(() =>
  buildGroupCascaderOptions(rows.value, dlg.id))

const openCreate = (parent) => {
  dlg.id = null
  dlg.originName = ''
  dlg.form = { name: '', parent_id: parent?.id ?? null, sort_order: 0 }
  dlg.visible = true
}

const openEdit = (row) => {
  dlg.id = row.id
  dlg.originName = row.name
  dlg.form = { name: row.name, parent_id: row.parent_id, sort_order: row.sort_order }
  dlg.visible = true
}

const submit = async () => {
  const f = dlg.form
  if (!f.name?.trim()) return ElMessage.warning('请输入组名')
  dlg.submitting = true
  try {
    const data = { name: f.name.trim(), parent_id: f.parent_id ?? null, sort_order: f.sort_order ?? 0 }
    const res = await api({
      url: dlg.id ? `/admin/club/groups/${dlg.id}` : '/admin/club/groups',
      method: dlg.id ? 'put' : 'post',
      data,
    })
    ElMessage.success(res.data?.message || '已保存')
    dlg.visible = false
    fetchGroups()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    dlg.submitting = false
  }
}

// ── 归档 / 删除（前置条件不满足时按钮已置灰，这里再确认一道）──
const confirmArchive = (row) => {
  ElMessageBox.confirm(
    `归档后「${row.name}」将从组织架构页与所有选择器隐藏，历史徽标 / 档案仍解析组名。`,
    `归档「${row.name}」`, { type: 'warning' },
  ).then(async () => {
    try {
      const res = await api({ url: `/admin/club/groups/${row.id}/archive`, method: 'post' })
      ElMessage.success(res.data?.message || '已归档')
      fetchGroups()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '归档失败')
    }
  }).catch(() => {})
}

const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `删除「${row.name}」不可恢复（当前零引用才可删）。`,
    `删除「${row.name}」`, { type: 'warning' },
  ).then(async () => {
    try {
      const res = await api({ url: `/admin/club/groups/${row.id}`, method: 'delete' })
      ElMessage.success(res.data?.message || '已删除')
      fetchGroups()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(fetchGroups)
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }

.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.group-name {
  font-weight: 500;
}

.status-tag {
  margin-left: 8px;
}

.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
