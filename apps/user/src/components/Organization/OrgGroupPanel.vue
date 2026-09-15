<script setup>
// 组织架构组面板（折叠式）：一级组 = flat 卡片；二级及以下 = 卡内折叠节（默认收起）。
// 展开内容 = 本组成员条（组长置顶，见 OrgMemberList）+ 子组折叠节（递归，层级不假设固定）。
// 数据来自 GET /organization（设计方案 §4.1）。
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag } from '@bme/dew-ui'
import { ArrowRight } from '@element-plus/icons-vue'
import OrgMemberList from './OrgMemberList.vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 1 },
})

const router = useRouter()
const goProfile = (id) => {
  if (id) router.push(`/profile/${id}`)
}

const open = ref(false)                       // 多级默认折叠，呈现收起态
const memberCount = computed(() => {
  const c = props.node.counts || {}
  return (c.primary || 0) + (c.secondary || 0)
})
const hasChildren = computed(() => (props.node.children || []).length > 0)
</script>

<template>
  <!-- 一级组：卡片壳，头部即折叠开关 -->
  <DewCard v-if="depth === 1" variant="flat" size="lg" class="ogp">
    <div class="ogp-head" @click="open = !open">
      <span class="ogp-name">{{ node.name }}</span>
      <DewTag v-if="memberCount > 0" type="neutral" size="sm" round>成员 {{ memberCount }}</DewTag>
      <DewTag v-else type="info" size="sm" round>招新中</DewTag>
      <a v-if="node.oversee_by" class="ogp-oversee"
         :title="`${node.oversee_by.title}分管`"
         @click.prevent.stop="goProfile(node.oversee_by.id)">
        分管 · {{ node.oversee_by.username }}
      </a>
      <el-icon class="ogp-arrow" :class="{ 'is-open': open }"><ArrowRight /></el-icon>
    </div>

    <div v-show="open" class="ogp-body">
      <OrgMemberList :members="node.members" />
      <OrgGroupPanel
        v-for="child in node.children"
        :key="child.id || child.name"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </DewCard>

  <!-- 二级及以下：折叠节（无卡壳，缩进 + 连接线） -->
  <div v-else class="ogs" :class="`ogs--d${depth}`">
    <div class="ogs-head" @click="open = !open">
      <el-icon class="ogs-arrow" :class="{ 'is-open': open }"><ArrowRight /></el-icon>
      <span class="ogs-name">{{ node.name }}</span>
      <DewTag v-if="memberCount > 0" type="neutral" size="sm" round>{{ memberCount }} 人</DewTag>
      <DewTag v-else type="info" size="sm" round>招新中</DewTag>
      <span v-if="node.leader" class="ogs-leader" @click.prevent.stop="goProfile(node.leader.id)">
        组长 · {{ node.leader.username }}
      </span>
      <span v-else class="ogs-leader ogs-leader--empty">组长虚位</span>
      <a v-if="node.oversee_by" class="ogs-oversee"
         :title="`${node.oversee_by.title}分管`"
         @click.prevent.stop="goProfile(node.oversee_by.id)">
        分管 · {{ node.oversee_by.username }}
      </a>
    </div>

    <div v-show="open" class="ogs-body">
      <OrgMemberList :members="node.members" />
      <OrgGroupPanel
        v-for="child in node.children"
        :key="child.id || child.name"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── 一级卡片 ── */
.ogp {
  height: 100%;
}

.ogp-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.ogp-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.ogp-oversee {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.ogp-oversee:hover {
  opacity: 0.75;
}

.ogp-arrow {
  margin-left: auto;
  color: var(--dew-text-muted);
  font-size: 14px;
  transition: transform 0.3s var(--dew-bounce, ease);
}

.ogp-oversee + .ogp-arrow {
  margin-left: 0;
}

.ogp-arrow.is-open {
  transform: rotate(90deg);
}

.ogp-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── 二级及以下折叠节 ── */
.ogs {
  padding-left: 12px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.ogs-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
}

.ogs-arrow {
  font-size: 12px;
  color: var(--dew-text-muted);
  transition: transform 0.3s var(--dew-bounce, ease);
}

.ogs-arrow.is-open {
  transform: rotate(90deg);
}

.ogs-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.ogs-leader {
  font-size: 12px;
  color: var(--dew-text-heading);
  cursor: pointer;
}

.ogs-leader--empty {
  color: var(--dew-text-muted);
  cursor: default;
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base, 6px);
  padding: 1px 8px;
}

.ogs-oversee {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.ogs-oversee:hover {
  opacity: 0.75;
}

.ogs-body {
  margin: 4px 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 0 6px 12px;
  border-left: 1px solid var(--el-border-color-lighter);
}
</style>
