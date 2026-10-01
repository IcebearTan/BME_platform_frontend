<script setup>
// 组织详情面板（组织架构页重构，主从分栏的从侧）：合并原 OrgGroupDetail。
// 全社态（node=null）：社长+管理层紧凑行卡 + 各组人数一览；
// 组态（node）：组信息头（组长/分管/人数/进入工作区）+ 成员名录；子组在左侧树中可达，不再重复墙。
// 「进入工作区」逻辑不动：单例探测 /work/me 按 club_group_id 匹配，跳 /work?ws=&tab=group
// （工作台 III 重构后 tab=group 重定向到 /work/items）。
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag, DewButton } from '@bme/dew-ui'
import DewImage from '@bme/dew-ui/DewImage.vue'
import { Right } from '@element-plus/icons-vue'
import OrgMemberList from './OrgMemberList.vue'
import { useWorkAccess } from '../../composables/useWorkAccess'
import { assetUrl } from '../../services/campService'

const props = defineProps({
  org: { type: Object, default: null },
  node: { type: Object, default: null },     // null=全社总览
})
const emit = defineEmits(['select-group'])   // 全社态各组一览点击（组态导航走左侧树）

const router = useRouter()
const goProfile = (id) => {
  if (id) router.push(`/profile/${id}`)
}

const memberTotal = computed(() => {
  const c = props.node?.counts || {}
  return (c.primary || 0) + (c.secondary || 0)
})
const children = computed(() => props.node?.children || [])

// 「进入工作区」按钮（设计方案 §6.1）：本组工作区且我有权时显示
const { hasAccess: workAccess, workspaceForGroup, detect: detectWork } = useWorkAccess()
onMounted(detectWork)
const myWorkspace = computed(() =>
  (workAccess.value ? workspaceForGroup(props.node?.id) : null))
const goWorkspace = (ws) => {
  if (ws) router.push({ path: '/work', query: { ws: String(ws.id), tab: 'group' } })
}
</script>

<template>
  <div class="odp">
    <!-- ━━ 全社总览态 ━━ -->
    <template v-if="!node">
      <!-- 社长 -->
      <section v-if="org?.president" class="odp-section">
        <div class="odp-section-title">社长</div>
        <div class="officer-row officer-row--hero" @click="goProfile(org.president.id)">
          <DewImage shape="circle" :size="44" :src="assetUrl(org.president.avatar) || null"
                    :initial="org.president.username" class="officer-avatar" />
          <span class="officer-name">{{ org.president.username }}</span>
          <DewTag type="warning" size="sm" round>{{ org.president.title }}</DewTag>
        </div>
      </section>

      <!-- 管理层（紧凑行卡：头像+姓名+职位徽章一行一个） -->
      <section v-if="(org?.management || []).length" class="odp-section">
        <div class="odp-section-title">管理层</div>
        <div class="officer-list">
          <div v-for="m in org.management" :key="m.id" class="officer-row"
               @click="goProfile(m.id)">
            <DewImage shape="circle" :size="32" :src="assetUrl(m.avatar) || null"
                      :initial="m.username" class="officer-avatar" />
            <span class="officer-name">{{ m.username }}</span>
            <DewTag type="warning" size="sm" round>{{ m.title }}</DewTag>
            <DewTag v-if="m.group" type="info" size="sm" round>{{ m.group }}</DewTag>
          </div>
        </div>
      </section>

      <!-- 各组人数一览（点击进组态） -->
      <section class="odp-section">
        <div class="odp-section-title">组别一览</div>
        <DewCard v-if="(org?.tree || []).length" variant="flat" size="md" class="odp-card">
          <div v-for="g in org.tree" :key="g.id" class="org-group-row"
               @click="emit('select-group', g.id)">
            <span class="org-group-name">{{ g.name }}</span>
            <span class="org-group-meta">
              {{ (g.counts?.primary || 0) + (g.counts?.secondary || 0) }} 人
              <template v-if="(g.children || []).length">· {{ g.children.length }} 个子组</template>
            </span>
            <el-icon :size="13" class="org-group-arrow"><Right /></el-icon>
          </div>
        </DewCard>
        <p v-else class="odp-empty">组织架构待发布：组别与干事配置后将在此展示。</p>
      </section>
    </template>

    <!-- ━━ 组态 ━━ -->
    <template v-else>
      <!-- 组头 -->
      <header class="ogd-head">
        <div class="ogd-title-row">
          <h2 class="ogd-name">{{ node.name }}</h2>
          <DewTag v-if="memberTotal > 0" type="neutral" size="sm" round>{{ memberTotal }} 人</DewTag>
          <DewTag v-else type="info" size="sm" round>招新中</DewTag>
          <DewButton v-if="myWorkspace" size="sm" active class="ogd-work-btn"
                     @click="goWorkspace(myWorkspace)">
            进入工作区
          </DewButton>
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
        <p v-if="children.length" class="ogd-subgroups">
          下设 {{ children.length }} 个子组：{{ children.map(c => c.name).join(' / ') }}（在左侧组织树中选择查看）
        </p>
      </header>

      <!-- 成员名录（直挂；组长置顶、辅员带标，见 OrgMemberList） -->
      <section class="odp-section">
        <div class="odp-section-title">
          成员名录
          <span v-if="children.length" class="odp-section-hint">仅本组直挂成员</span>
        </div>
        <DewCard variant="flat" size="md" class="odp-card">
          <OrgMemberList :members="node.members" />
        </DewCard>
      </section>
    </template>
  </div>
</template>

<style scoped>
.odp-section { margin-bottom: 26px; }
.odp-section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; color: var(--dew-text-heading);
  margin-bottom: 10px;
}
.odp-section-hint { font-size: 12px; font-weight: 400; color: var(--dew-text-muted); }
.odp-empty { margin: 0; font-size: 13px; color: var(--dew-text-muted); }
.odp-card :deep(.oml) {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 24px;
}
.odp-card :deep(.oml-empty) { grid-column: 1 / -1; }

/* ── 干部紧凑行卡（替代 OfficerCard 玻璃卡） ── */
.officer-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background 0.2s ease;
}
.officer-row:hover { background: var(--ws-hover); }
.officer-row--hero {
  padding: 12px 14px; border-radius: 10px;
  border: 1px solid var(--ws-border); background: var(--ws-panel);
}
.officer-row--hero .officer-name { font-size: 15.5px; font-weight: 700; }
.officer-list { display: flex; flex-direction: column; }
.officer-avatar {
  flex: none; font-size: 12px; font-weight: 600;
  background: var(--ws-hover); color: var(--dew-text-muted);
}
.officer-name { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }

/* ── 各组人数一览行 ── */
.org-group-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 6px; border-radius: 8px; cursor: pointer;
  border-bottom: 1px dashed var(--ws-border);
  transition: background 0.2s ease;
}
.org-group-row:last-child { border-bottom: none; }
.org-group-row:hover { background: var(--ws-hover); }
.org-group-name { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }
.org-group-meta { flex: none; font-size: 12px; color: var(--dew-text-muted); }
.org-group-arrow { flex: none; color: var(--dew-text-faint); }

/* ── 组头（类名延续 OrgGroupDetail，e2e 契约 .ogd-name/.ogd-work-btn） ── */
.ogd-head { margin-bottom: 24px; }
.ogd-title-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
  margin-bottom: 10px;
}
.ogd-work-btn { margin-left: auto; }
.ogd-name { margin: 0; font-size: 22px; font-weight: 700; color: var(--dew-text-heading); }
.ogd-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.ogd-chip {
  font-size: 12.5px; color: var(--dew-text-heading);
  background: var(--ws-hover);
  border-radius: 999px; padding: 3px 12px; cursor: pointer;
  transition: opacity 0.2s ease;
}
.ogd-chip:hover { opacity: 0.75; }
.ogd-chip--empty {
  color: var(--dew-text-muted); cursor: default;
  border: 1px dashed var(--el-border-color); background: transparent;
}
.ogd-chip--empty:hover { opacity: 1; }
.ogd-chip--oversee { color: var(--color-primary); }
.ogd-subgroups { margin: 8px 0 0; font-size: 12px; color: var(--dew-text-muted); }

@media (max-width: 768px) {
  .ogd-name { font-size: 19px; }
  .odp-card :deep(.oml) { grid-template-columns: 1fr; }
}
</style>
