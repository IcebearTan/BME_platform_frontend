<script setup>
// 组详情视图（钻入层，任意层级复用）：组头（组长/分管/人数）+ 成员名录 + 下设子组令牌墙。
// 子组令牌再点击继续向下一层钻入（emit select 交父层推栈），层级不假设固定。
// 成员名录 = 本组直挂归属（组长置顶见 OrgMemberList）；头部人数 = 含子孙上卷口径。
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag } from '@bme/dew-ui'
import OrgMemberList from './OrgMemberList.vue'
import OrgTokenBoard from './OrgTokenBoard.vue'

const props = defineProps({
  node: { type: Object, required: true },
})
defineEmits(['select'])

const router = useRouter()
const goProfile = (id) => {
  if (id) router.push(`/profile/${id}`)
}

const memberTotal = computed(() => {
  const c = props.node.counts || {}
  return (c.primary || 0) + (c.secondary || 0)
})
const children = computed(() => props.node.children || [])
</script>

<template>
  <div class="ogd">
    <!-- 组头 -->
    <header class="ogd-head rise-in">
      <div class="ogd-title-row">
        <span class="title-accent"></span>
        <h2 class="ogd-name">{{ node.name }}</h2>
        <DewTag v-if="memberTotal > 0" type="neutral" size="sm" round>{{ memberTotal }} 人</DewTag>
        <DewTag v-else type="info" size="sm" round>招新中</DewTag>
      </div>
      <div class="ogd-meta">
        <template v-if="node.leader">
          <span class="ogd-chip" title="查看组长主页" @click="goProfile(node.leader.id)">
            组长 · {{ node.leader.username }}
          </span>
        </template>
        <span v-else class="ogd-chip ogd-chip--empty">组长虚位</span>
        <a v-if="node.oversee_by" class="ogd-chip ogd-chip--oversee"
           :title="`${node.oversee_by.title}分管`" @click.prevent="goProfile(node.oversee_by.id)">
          {{ node.oversee_by.title }}分管 · {{ node.oversee_by.username }}
        </a>
      </div>
    </header>

    <!-- 成员名录（直挂） -->
    <section v-if="node.members?.length || !children.length" class="ogd-section rise-in rise-d1">
      <div class="ogd-section-title">
        <span class="title-accent sm"></span>
        <h3 class="ogd-section-name">成员名录</h3>
        <span v-if="children.length" class="ogd-section-hint">仅本组直挂成员，子组人数见下</span>
      </div>
      <DewCard variant="flat" size="lg" class="ogd-members">
        <OrgMemberList :members="node.members" />
      </DewCard>
    </section>

    <!-- 下设子组：令牌墙（点击继续钻入） -->
    <section v-if="children.length" class="ogd-section rise-in rise-d2">
      <div class="ogd-section-title">
        <span class="title-accent sm"></span>
        <h3 class="ogd-section-name">下设子组</h3>
        <span class="ogd-section-hint">点击令牌进入子组</span>
      </div>
      <OrgTokenBoard :groups="children" dense @select="$emit('select', $event)" />
    </section>
  </div>
</template>

<style scoped>
/* 分区鱼贯入场：组头 → 名录 → 子组墙（backwards 填充，结束后不占 transform） */
.rise-in {
  animation: rise-in 0.55s var(--dew-bounce) backwards;
}

.rise-d1 { animation-delay: 80ms; }
.rise-d2 { animation-delay: 160ms; }

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rise-in { animation: none; }
}

.ogd-head {
  margin-bottom: 28px;
}

.ogd-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.title-accent {
  display: inline-block;
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}

.title-accent.sm {
  height: 16px;
}

.ogd-name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.ogd-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-left: 14px;
}

.ogd-chip {
  font-size: 12.5px;
  color: var(--dew-text-heading);
  background: var(--color-bg-muted, rgba(127, 127, 127, 0.1));
  border-radius: 999px;
  padding: 3px 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.ogd-chip:hover {
  opacity: 0.75;
}

.ogd-chip--empty {
  color: var(--dew-text-muted);
  cursor: default;
  border: 1px dashed var(--el-border-color);
  background: transparent;
}

.ogd-chip--empty:hover {
  opacity: 1;
}

.ogd-chip--oversee {
  color: var(--color-primary);
}

.ogd-section {
  margin-bottom: 36px;
}

.ogd-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.ogd-section-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.ogd-section-hint {
  font-size: 12px;
  color: var(--dew-text-muted);
}

/* 名录双列（移动端单列），借用 display:contents 让成员条直接入格 */
.ogd-members :deep(.oml) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 24px;
}

.ogd-members :deep(.oml-empty) {
  grid-column: 1 / -1;
}

.ogd-empty {
  color: var(--dew-text-muted);
  text-align: center;
  padding: 32px 24px;
}

@media (max-width: 768px) {
  .ogd-name { font-size: 20px; }

  .ogd-members :deep(.oml) { grid-template-columns: 1fr; }
}
</style>
