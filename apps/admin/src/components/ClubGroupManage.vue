<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">小组管理</div>
      <div class="header-actions">
        <el-button type="primary" plain @click="openCreate(null)">
          <el-icon><Plus /></el-icon>新建一级组
        </el-button>
        <el-button @click="fetchGroups" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      以组为中心管理：左侧选中小组，右侧即可查看组内名单、添加或移出成员、直接任命与更换组长；
      组名全树唯一，层级上限 4 级，有引用的组只能归档不能删除。
    </p>

    <div class="workspace-body">
      <DewCard no-hover class="tree-card">
        <el-scrollbar class="tree-scroll">
          <el-tree ref="treeRef" :data="tree" node-key="id"
            :props="{ label: 'label', children: 'children' }"
            highlight-current default-expand-all
            @current-change="onSelect">
            <template #default="{ data }">
              <span class="tree-node" :class="{ archived: data.status !== 'active' }">
                <span class="tree-name">{{ data.label }}</span>
                <span class="tree-count">{{ data.memberCount }}</span>
              </span>
            </template>
          </el-tree>
        </el-scrollbar>
      </DewCard>

      <div class="panel-area">
        <GroupDetailPanel :group-id="selectedId" :group-rows="rows"
          @refresh="fetchGroups" @create-child="openCreate" />
      </div>
    </div>

    <!-- 新建组（一级 / 子组共用） -->
    <el-dialog v-model="dlg.visible" :title="dlg.parentName ? `在「${dlg.parentName}」下新建组` : '新建一级组'" width="520px">
      <el-form :model="dlg.form" label-width="90px">
        <el-form-item label="组名" required>
          <el-input v-model="dlg.form.name" maxlength="50" show-word-limit placeholder="全树唯一" />
        </el-form-item>
        <el-form-item label="父组">
          <el-cascader v-model="dlg.form.parent_id" :options="parentOptions" :props="cascaderProps"
            :disabled="!!dlg.parentId" :placeholder="dlg.parentId ? dlg.parentName : '不选 / 清空 = 一级组'"
            clearable style="width: 100%;" />
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
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api from '../api'
import { buildGroupCascaderOptions, buildGroupTreeData } from '../utils/club'
import GroupDetailPanel from './GroupDetailPanel.vue'

const route = useRoute()

// ── 组树 ──
const rows = ref([])
const loading = ref(false)
const treeRef = ref(null)
const selectedId = ref(null)

const tree = computed(() => buildGroupTreeData(rows.value))

async function fetchGroups() {
  loading.value = true
  try {
    const res = await api({ url: '/admin/club/groups', method: 'get' })
    rows.value = res.data?.data?.groups || []
    // 深链 / 刷新后保持选中；选中组已不存在（如删除）则清空
    if (selectedId.value && !rows.value.some(r => r.id === selectedId.value)) selectedId.value = null
    if (selectedId.value) treeRef.value?.setCurrentKey(selectedId.value)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组树失败')
  } finally {
    loading.value = false
  }
}

function onSelect(data) {
  selectedId.value = data?.id ?? null
}

// 深链：组织总览「组长空缺」等入口带 ?group=<id> 直达
onMounted(async () => {
  await fetchGroups()
  const qid = Number(route.query.group)
  if (qid && rows.value.some(r => r.id === qid)) {
    selectedId.value = qid
    treeRef.value?.setCurrentKey(qid)
  }
})

// ── 新建组（一级 / 子组共用；父级来自详情面板「加子组」）──
const cascaderProps = { checkStrictly: true, emitPath: false }
const dlg = reactive({ visible: false, parentId: null, parentName: '', submitting: false, form: {} })

// 新建时可选父级排除归档组；「加子组」进来时父级锁定不可改
const parentOptions = computed(() =>
  buildGroupCascaderOptions(rows.value.filter(r => r.status === 'active')))

function openCreate(parent) {
  dlg.parentId = parent?.id ?? null
  dlg.parentName = parent?.name || ''
  dlg.form = { name: '', parent_id: dlg.parentId, sort_order: 0 }
  dlg.visible = true
}

async function submit() {
  const f = dlg.form
  if (!f.name?.trim()) return ElMessage.warning('请输入组名')
  dlg.submitting = true
  try {
    const res = await api({
      url: '/admin/club/groups',
      method: 'post',
      data: { name: f.name.trim(), parent_id: f.parent_id ?? null, sort_order: f.sort_order ?? 0 },
    })
    ElMessage.success(res.data?.message || '已创建')
    dlg.visible = false
    await fetchGroups()
    const created = rows.value.find(r => r.name === f.name.trim())
    if (created) {
      selectedId.value = created.id
      treeRef.value?.setCurrentKey(created.id)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    dlg.submitting = false
  }
}
</script>

<style scoped>
.workspace-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.tree-card {
  width: 280px;
  flex-shrink: 0;
}

/* 详情面板吃满剩余宽度：flex 行内子项默认按内容收缩，不给 flex 会右侧留白 */
.panel-area {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tree-card :deep(.dew-card__body) {
  padding: 8px;
}

.tree-scroll {
  height: calc(100vh - 230px);
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-count {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
}

.tree-node.archived .tree-name {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
  .workspace-body {
    flex-direction: column;
  }

  .tree-card {
    width: 100%;
  }

  .tree-scroll {
    height: 240px;
  }
}
</style>
