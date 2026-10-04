<script setup>
// 组织树（组织架构页重构）：el-tree 常驻侧栏，完整层级可折叠（默认展开到二级），
// 节点=组名+人数角标，当前选中高亮；子组随树展开天然可达——替代钻入栈。
// 选中态由父层写入 URL（?group=），本组件只受控展示与上抛点击。
import { ref, computed, watch, nextTick } from 'vue'
import { OfficeBuilding } from '@element-plus/icons-vue'

const props = defineProps({
  tree: { type: Array, default: () => [] },
  currentId: { type: [Number, String], default: null },
})
const emit = defineEmits(['select'])   // select(node | null)——null=全社总览

const treeRef = ref(null)

// 平铺索引：id → { node, parents }（parents=自顶向下祖先 id 链，供深链时展开路径）
const index = computed(() => {
  const map = new Map()
  const walk = (list, parents) => {
    for (const n of list) {
      map.set(n.id, { node: n, parents })
      walk(n.children || [], [...parents, n.id])
    }
  }
  walk(props.tree, [])
  return map
})
const topIds = computed(() => props.tree.map(n => n.id))

// 高亮跟随受控值；选中节点的祖先链展开（深链 /organization?group=31 时树展开到位）
watch(() => props.currentId, async (id) => {
  await nextTick()
  const tree = treeRef.value
  if (!tree) return
  tree.setCurrentKey(id ?? null)
  const rec = index.value.get(id)
  if (rec) for (const pid of rec.parents) tree.getNode(pid)?.expand()
}, { immediate: true })

function memberCount(node) {
  const c = node.counts || {}
  return (c.primary || 0) + (c.secondary || 0)
}

function onNodeClick(data) {
  emit('select', data)
}
</script>

<template>
  <div class="org-tree">
    <button type="button" class="org-root-item"
            :class="{ 'org-root-item--active': !currentId }"
            @click="emit('select', null)">
      <el-icon :size="15" class="org-root-icon"><OfficeBuilding /></el-icon>
      <span class="org-root-label">全社总览</span>
    </button>
    <el-tree ref="treeRef" :data="tree" node-key="id"
             :props="{ label: 'name', children: 'children' }"
             :default-expanded-keys="topIds"
             highlight-current expand-on-click-node
             @node-click="onNodeClick">
      <template #default="{ data }">
        <span class="tree-node">
          <span class="tree-node-name">{{ data.name }}</span>
          <span v-if="memberCount(data) > 0" class="tree-node-count ws-num">{{ memberCount(data) }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<style scoped>
.org-tree { display: flex; flex-direction: column; }

.org-root-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; margin-bottom: 6px; border: none; border-radius: 8px;
  font-size: 13.5px; font-family: inherit; text-align: left; width: 100%;
  color: var(--dew-text-muted); background: transparent; cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.org-root-item:hover { background: var(--ws-hover); color: var(--dew-text); }
.org-root-item--active {
  background: var(--ws-active);
  color: var(--dew-text-heading); font-weight: 600;
}
.org-root-icon { flex: none; }
.org-root-label { flex: 1; min-width: 0; }

.org-tree :deep(.el-tree) {
  background: transparent;
  --el-tree-node-content-height: 30px;
  --el-tree-expand-icon-color: var(--dew-text-faint);
}
.org-tree :deep(.el-tree-node__content) { border-radius: 6px; }
.org-tree :deep(.el-tree-node__content:hover) { background: var(--ws-hover); }
.org-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ws-active);
  color: var(--dew-text-heading); font-weight: 600;
}

.tree-node { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; }
.tree-node-name {
  font-size: 13px; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tree-node-count {
  flex: none; min-width: 16px; padding: 0 5px; border-radius: 8px;
  font-size: 11px; line-height: 16px; text-align: center;
  color: var(--dew-text-muted);
  background: var(--ws-hover);
}
</style>
