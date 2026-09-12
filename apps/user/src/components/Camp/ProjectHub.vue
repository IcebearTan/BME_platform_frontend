<template>
  <!-- 项目营「项目」tab（v1.3 阶段3）：按营期状态呈现组队/志愿/我的项目。
       selecting = 项目墙 + 志愿托盘（复用市集「卡片墙+托盘」模式）；
       running/archived = 我的项目列表（负责的+参与的）；
       负责人任何阶段都有工作区入口（成员勾选走统一 roster API）。 -->
  <div class="project-hub">
    <!-- 名额状态条 -->
    <DewCard variant="inset" size="lg" :no-hover="true" class="quota-card">
      <div class="quota-row">
        <div class="quota-main">
          <span class="quota-label">项目参与</span>
          <span class="quota-num">{{ mine.project_count ?? '—' }}<template v-if="mine.project_limit"> / {{ mine.project_limit }}</template></span>
          <span v-if="remainingHint" class="quota-hint">{{ remainingHint }}</span>
        </div>
        <div v-if="selectingOpen" class="quota-side">组队进行中 · 可提交/修改项目意向</div>
        <div v-else-if="session.status === 'running'" class="quota-side">项目进行中</div>
      </div>
    </DewCard>

    <!-- 负责人：我负责的项目（工作区） -->
    <template v-if="mine.leading?.length">
      <div class="section-title">我负责的项目</div>
      <div class="project-grid">
        <DewCard v-for="p in mine.leading" :key="p.unit_id" variant="default" :no-hover="true" class="project-card">
          <div class="card-head">
            <div class="card-name">{{ p.name }}</div>
            <DewTag v-if="p.status !== 'active'" size="sm" round>{{ unitStatusText[p.status] || p.status }}</DewTag>
          </div>
          <div class="card-meta">
            <span>成员 {{ p.member_count }} 人</span>
            <span class="dot">·</span>
            <span>负责人 {{ p.leader_name }}</span>
          </div>
          <p v-if="p.recruit_note" class="card-desc">{{ p.recruit_note }}</p>
          <div class="card-actions">
            <DewButton type="glass" size="sm" :disabled="p.status !== 'active' || session.status === 'archived'"
              @click="openRoster(p)">管理成员</DewButton>
          </div>
        </DewCard>
      </div>
    </template>

    <!-- selecting：项目墙 + 志愿托盘 -->
    <template v-if="selectingOpen">
      <div class="section-title">本期项目</div>
      <div v-if="loading" class="hub-loading"><DewSkeleton variant="rect" width="100%" height="200" rounded="8px" /></div>
      <DewCard v-else-if="!projects.length" variant="flat" class="empty-card">
        <div class="empty-text">本期暂无过审项目。项目由负责人在申报期申报、管理员审核后创建。</div>
      </DewCard>
      <template v-else>
        <div class="project-grid">
          <DewCard v-for="p in projects" :key="p.unit_id" variant="default"
                   :tinted="picked(p.unit_id)" :accent="picked(p.unit_id) ? 'primary' : null"
                   class="project-card pickable" @click="togglePick(p)">
            <div class="card-head">
              <div class="card-name">{{ p.name }}</div>
              <DewTag v-if="p.status !== 'active'" size="sm" round>{{ unitStatusText[p.status] || p.status }}</DewTag>
            </div>
            <div class="card-meta">
              <span>负责人 {{ p.leader_name }}</span>
              <span class="dot">·</span>
              <span>成员 {{ p.member_count }} 人</span>
              <span v-if="p.my_role" class="dot">·</span>
              <span v-if="p.my_role" class="role-mark">{{ p.my_role === 'leader' ? '我是负责人' : '已加入' }}</span>
            </div>
            <p v-if="p.required_abilities" class="card-desc"><span class="desc-label">需要：</span>{{ p.required_abilities }}</p>
            <p v-if="p.recruit_note" class="card-desc"><span class="desc-label">招募：</span>{{ p.recruit_note }}</p>
            <div v-if="p.background" class="card-more" @click.stop="expanded[p.unit_id] = !expanded[p.unit_id]">
              {{ expanded[p.unit_id] ? '收起' : '展开背景与目标' }}
            </div>
            <div v-if="expanded[p.unit_id]" class="card-expand">
              <p v-if="p.background"><span class="desc-label">背景：</span>{{ p.background }}</p>
              <p v-if="p.goal"><span class="desc-label">目标：</span>{{ p.goal }}</p>
              <p v-if="p.plan"><span class="desc-label">计划：</span>{{ p.plan }}</p>
            </div>
            <div class="pick-mark" v-if="picked(p.unit_id)">志愿 {{ pickRank(p.unit_id) }}</div>
          </DewCard>
        </div>

        <!-- 志愿托盘 -->
        <DewCard variant="inset" size="lg" :no-hover="true" class="tray-card">
          <div class="tray-head">
            <div class="tray-title">我的项目意向</div>
            <div class="tray-sub">按意愿排序，最多 {{ limit || 3 }} 个；整组提交，截止前可修改</div>
          </div>
          <div v-if="!tray.length" class="tray-empty">点击上方项目卡片加入意向</div>
          <div v-else class="tray-list">
            <div v-for="(t, i) in tray" :key="t.unit_id" class="tray-item">
              <span class="tray-rank">{{ i + 1 }}</span>
              <span class="tray-name">{{ t.name }}</span>
              <DewInput v-model="t.note" size="sm" class="tray-note"
                        placeholder="选填：给负责人的留言" @click.stop />
              <button type="button" class="tray-remove" @click.stop="removePick(t.unit_id)">移出</button>
            </div>
          </div>
          <div class="tray-actions">
            <DewButton type="glass" :loading="submittingPrefs" :disabled="!tray.length" @click="submitPrefs">
              {{ submittedOnce ? '重新提交意向' : '提交意向' }}（{{ tray.length }}）
            </DewButton>
          </div>
        </DewCard>
      </template>
    </template>

    <!-- running/archived：我参与的项目 -->
    <template v-if="!selectingOpen">
      <div class="section-title">我参与的项目</div>
      <DewCard v-if="!mine.joining?.length && !mine.leading?.length" variant="flat" class="empty-card">
        <div class="empty-text">{{ session.status === 'upcoming' ? '组队尚未开始——项目意向在选择阶段提交。' : '你本期未加入任何项目。' }}</div>
      </DewCard>
      <div v-else class="project-grid">
        <DewCard v-for="p in [...(mine.leading || []), ...(mine.joining || [])]" :key="p.unit_id"
                 variant="default" :no-hover="true" class="project-card">
          <div class="card-head">
            <div class="card-name">{{ p.name }}</div>
            <DewTag v-if="p.status !== 'active'" size="sm" round>{{ unitStatusText[p.status] || p.status }}</DewTag>
          </div>
          <div class="card-meta">
            <span>{{ p.my_role === 'leader' ? '我是负责人' : '成员' }}</span>
            <span class="dot">·</span>
            <span>成员 {{ p.member_count }} 人</span>
            <span class="dot">·</span>
            <span>负责人 {{ p.leader_name }}</span>
          </div>
          <p v-if="p.goal" class="card-desc">{{ p.goal }}</p>
        </DewCard>
      </div>
    </template>

    <!-- 负责人成员管理（统一 roster API） -->
    <DewDialog v-model="rosterDlg" :title="`成员管理 · ${rosterUnit?.name || ''}`" width="720px">
      <ProjectRoster v-if="rosterDlg && rosterUnit" :unit-id="rosterUnit.unit_id"
                     :camp-status="session.status" @changed="reload" />
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewTag, DewDialog, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';
import ProjectRoster from './ProjectRoster.vue';

const props = defineProps({
  sid: { type: Number, required: true },
  session: { type: Object, required: true },   // 营期行（project 营，含 status/policy）
});

const loading = ref(true);
const mine = ref({});
const projects = ref([]);
const expanded = ref({});
const tray = ref([]);            // [{unit_id, name, note}]
const submittingPrefs = ref(false);
const submittedOnce = ref(false);

const unitStatusText = { active: '进行中', paused: '已暂停', terminated: '已终止' };
const limit = computed(() => mine.value.project_limit);
const selectingOpen = computed(() => props.session.status === 'selecting');
const remainingHint = computed(() => {
  if (mine.value.project_limit == null) return '';
  const left = mine.value.remaining_slots ?? 0;
  return left ? `还可参与 ${left} 个` : '已达上限';
});

const picked = (unitId) => tray.value.some((t) => t.unit_id === unitId);
const pickRank = (unitId) => tray.value.findIndex((t) => t.unit_id === unitId) + 1;

function togglePick(p) {
  if (p.status === 'terminated') return;
  const i = tray.value.findIndex((t) => t.unit_id === p.unit_id);
  if (i >= 0) { tray.value.splice(i, 1); return; }
  if (limit.value != null && tray.value.length >= limit.value) {
    ElMessage.warning(`最多提交 ${limit.value} 个意向`);
    return;
  }
  tray.value.push({ unit_id: p.unit_id, name: p.name, note: '' });
}
function removePick(unitId) {
  tray.value = tray.value.filter((t) => t.unit_id !== unitId);
}

async function load() {
  loading.value = true;
  try {
    const [m, l] = await Promise.all([
      campService.fetchProjectMine(props.sid),
      campService.fetchProjectList(props.sid).catch(() => ({ projects: [] })),
    ]);
    mine.value = m;
    projects.value = l.projects || [];
    // 已提交志愿回填托盘（选择期可整组修改）
    if (selectingOpen.value) {
      try {
        const pr = await campService.fetchProjectPreferences(props.sid);
        const prefs = pr.preferences || [];
        if (prefs.length) {
          tray.value = prefs.map((p) => ({ unit_id: p.unit_id, name: p.name, note: p.note || '' }));
          submittedOnce.value = true;
        }
      } catch { /* 忽略：无志愿即空托盘 */ }
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载项目数据失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
function reload() { load(); }

async function submitPrefs() {
  if (submittingPrefs.value || !tray.value.length) return;
  submittingPrefs.value = true;
  try {
    const r = await campService.submitProjectPreferences(
      props.sid, tray.value.map((t) => ({ unit_id: t.unit_id, note: t.note || null })));
    ElMessage.success(r.message || '意向已提交');
    submittedOnce.value = true;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败，请稍后重试');
  } finally {
    submittingPrefs.value = false;
  }
}

// ── 负责人成员管理弹窗 ──
const rosterDlg = ref(false);
const rosterUnit = ref(null);
function openRoster(p) {
  rosterUnit.value = p;
  rosterDlg.value = true;
}
</script>

<style scoped>
.project-hub { display: flex; flex-direction: column; gap: 18px; }

.quota-card { padding-block: 2px; }
.quota-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.quota-main { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.quota-label { font-size: 13px; color: var(--dew-text-muted); }
.quota-num { font-size: 22px; font-weight: 700; color: var(--dew-text-heading); letter-spacing: 0.5px; }
.quota-hint { font-size: 12px; color: var(--dew-text-faint); }
.quota-side { font-size: 12.5px; color: var(--color-primary); }

.section-title { font-size: 14.5px; font-weight: 700; color: var(--dew-text-heading); margin-top: 4px; }

.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.project-card { display: flex; flex-direction: column; gap: 8px; }
.project-card.pickable { cursor: pointer; transition: transform 0.2s var(--dew-bounce, ease); }
.project-card.pickable:hover { transform: translateY(-2px); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card-name { font-size: 15.5px; font-weight: 650; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--dew-text-muted); flex-wrap: wrap; }
.card-meta .dot { color: var(--dew-text-faint); }
.role-mark { color: var(--color-primary); font-weight: 600; }
.card-desc { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.desc-label { color: var(--dew-text-faint); }
.card-more { font-size: 12px; color: var(--color-primary); cursor: pointer; width: fit-content; }
.card-expand p { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 4px 0 0; }
.card-actions { margin-top: auto; }
.pick-mark {
  position: absolute; top: 10px; right: 12px;
  font-size: 11.5px; font-weight: 700; color: var(--color-primary);
  padding: 2px 10px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.project-card { position: relative; }

.hub-loading { padding: 4px 0; }
.empty-card { padding: 26px 0; }
.empty-text { font-size: 13px; color: var(--dew-text-faint); text-align: center; }

/* 志愿托盘 */
.tray-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.tray-title { font-size: 15px; font-weight: 650; color: var(--dew-text-heading); }
.tray-sub { font-size: 12.5px; color: var(--dew-text-muted); }
.tray-empty { font-size: 13px; color: var(--dew-text-faint); padding: 10px 0; }
.tray-list { display: flex; flex-direction: column; gap: 8px; }
.tray-item { display: flex; align-items: center; gap: 10px; }
.tray-rank {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.tray-name { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); min-width: 120px; }
.tray-note { flex: 1; min-width: 0; }
.tray-remove {
  border: none; background: transparent; cursor: pointer; flex-shrink: 0;
  font-size: 12px; color: var(--dew-text-faint); transition: color 0.15s ease;
}
.tray-remove:hover { color: var(--color-danger, #e5484d); }
.tray-actions { margin-top: 14px; }
</style>
