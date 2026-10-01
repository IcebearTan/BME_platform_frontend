<script setup>
// 组织详情面板（组织架构页重构，主从分栏的从侧）：合并原 OrgGroupDetail。
// 全社态（node=null）：社长+管理层大卡（社团文化展示位）+ 各组人数一览；
// 组态（node）：组信息头（组长/分管/人数/进入工作区）+ 小组介绍预留区 + 成员大卡名录；
// 子组在左侧树中可达，不再重复墙。
// 人员卡：大头像（默认首字随之放大）+ 姓名 + 身份标签 + **信息预留槽**（短横线锚位，
// 后端补人员简介/口号字段后直接填充）；小组介绍同为预留（node.description 未来接后端列）。
// 「进入工作区」逻辑不动：单例探测 /work/me 按 club_group_id 匹配，跳 /work?ws=&tab=group。
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag, DewButton } from '@bme/dew-ui'
import DewImage from '@bme/dew-ui/DewImage.vue'
import { Right } from '@element-plus/icons-vue'
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
// 小组介绍：后端 club_group 暂无介绍列，UI 先留展示位（node.description 未来接上即自动生效）
const groupIntro = computed(() => props.node?.description || '')

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
      <!-- 社长（主卡：最大号头像，社团门面） -->
      <section v-if="org?.president" class="odp-section">
        <div class="odp-section-title">社长</div>
        <div class="officer-grid officer-grid--single">
          <div class="officer-card officer-card--hero" @click="goProfile(org.president.id)">
            <DewImage shape="circle" :size="76" :src="assetUrl(org.president.avatar) || null"
                      :initial="org.president.username || '?'" class="officer-avatar officer-avatar--hero" />
            <span class="officer-name officer-name--hero">{{ org.president.username }}</span>
            <span class="officer-tags">
              <DewTag type="warning" size="sm" round>{{ org.president.title }}</DewTag>
            </span>
            <span class="card-reserve"><span class="card-slot-line" /></span>
          </div>
        </div>
      </section>

      <!-- 管理层（大卡横排：头像+姓名+职位徽章，各带信息预留槽） -->
      <section v-if="(org?.management || []).length" class="odp-section">
        <div class="odp-section-title">管理层</div>
        <div class="officer-grid">
          <div v-for="m in org.management" :key="m.id" class="officer-card"
               @click="goProfile(m.id)">
            <DewImage shape="circle" :size="56" :src="assetUrl(m.avatar) || null"
                      :initial="m.username || '?'" class="officer-avatar" />
            <span class="officer-name">{{ m.username }}</span>
            <span class="officer-tags">
              <DewTag type="warning" size="sm" round>{{ m.title }}</DewTag>
              <DewTag v-if="m.group" type="info" size="sm" round>{{ m.group }}</DewTag>
            </span>
            <span class="card-reserve"><span class="card-slot-line" /></span>
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

      <!-- 小组介绍（预留展示位：后端补介绍列后自动生效） -->
      <section class="odp-section">
        <div class="odp-section-title">小组介绍</div>
        <DewCard variant="flat" size="md" class="odp-card">
          <p v-if="groupIntro" class="group-intro">{{ groupIntro }}</p>
          <p v-else class="group-intro group-intro--placeholder">
            小组方向、日常与成果将在这里展示（介绍待填写）
          </p>
        </DewCard>
      </section>

      <!-- 成员名录（大卡：组长置顶、辅员带标；信息预留槽与干部卡同款） -->
      <section class="odp-section">
        <div class="odp-section-title">
          成员名录
          <span v-if="children.length" class="odp-section-hint">仅本组直挂成员</span>
        </div>
        <DewCard v-if="node.members?.length" variant="flat" size="md" class="odp-card">
          <div class="member-grid">
            <div v-for="m in node.members" :key="m.id" class="member-card" @click="goProfile(m.id)">
              <DewImage shape="circle" :size="56" :src="assetUrl(m.avatar) || null"
                        :initial="m.username || '?'" class="member-avatar" />
              <span class="member-name">{{ m.username }}</span>
              <span class="member-tags">
                <DewTag v-if="m.is_leader" type="primary" size="sm" round>组长</DewTag>
                <DewTag v-else-if="m.title" type="neutral" size="sm" round>{{ m.title }}</DewTag>
                <DewTag v-if="m.slot === 'secondary'" type="neutral" size="sm" round>辅</DewTag>
              </span>
              <span class="card-reserve"><span class="card-slot-line" /></span>
            </div>
          </div>
        </DewCard>
        <p v-else class="odp-empty">本组暂无直挂成员 · 招新中</p>
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
.odp-card { margin-bottom: 4px; }

/* ━━ 干部大卡（替代原紧凑行卡）：大头像+姓名+职位徽章+信息预留槽 ━━ */
.officer-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;
}
.officer-grid--single { grid-template-columns: minmax(0, 260px); }
.officer-card {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 20px 12px 14px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--ws-border);
  background: var(--ws-panel);
  transition: transform 0.22s var(--dew-bounce, ease), border-color 0.2s ease;
}
.officer-card:hover { transform: translateY(-2px); border-color: var(--ws-border-strong); }
.officer-card--hero { padding: 26px 16px 16px; }
/* 首字大小由 DewImage 按直径锚定（size prop），无需外设字号 */
.officer-avatar--hero {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 12%, transparent);
}
.officer-name { font-size: 14.5px; font-weight: 600; color: var(--dew-text-heading); }
.officer-name--hero { font-size: 16.5px; font-weight: 700; }
.officer-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; min-height: 22px; }

/* ━━ 信息预留槽：短横线锚位，将来填人员简介/口号/成就 ━━ */
.card-reserve {
  margin-top: 8px; min-height: 26px;
  display: flex; align-items: flex-end; justify-content: center;
}
.card-slot-line {
  width: 26px; height: 3px; border-radius: 2px;
  background: var(--ws-border-strong);
}

/* ━━ 成员大卡（原双列行式名录升级：大头像+首字放大+预留槽） ━━ */
.member-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;
}
.member-card {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 18px 10px 12px; border-radius: 12px; cursor: pointer;
  transition: background 0.2s ease;
}
.member-card:hover { background: var(--ws-hover); }
/* 首字大小由 DewImage 按直径锚定（size prop），无需外设字号 */
.member-name {
  font-size: 14px; font-weight: 600; color: var(--dew-text-heading);
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.member-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; min-height: 22px; }

/* ━━ 小组介绍预留区 ━━ */
.group-intro { margin: 0; font-size: 13.5px; line-height: 1.8; color: var(--dew-text); }
.group-intro--placeholder { color: var(--dew-text-faint); }

/* ━━ 各组人数一览行 ━━ */
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

/* ━━ 组头（类名延续 OrgGroupDetail，e2e 契约 .ogd-name/.ogd-work-btn） ━━ */
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
  .officer-grid { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }
  .member-grid { grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); }
}
</style>
