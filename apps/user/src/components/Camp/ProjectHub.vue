<template>
  <!-- 项目营成员工作台（09-13 二次拍板：营期层「看板/项目」tab 退役，本组件即全部）。
       buttonbar：项目意向=选择期临时默认项；我负责的=有负责项目才出现；我参加的；请假=能力位。
       考勤以项目为单位进各看板（活动考勤区）；周打卡为个人数据，收敛为顶部状态条。 -->
  <div class="project-hub">
    <!-- 名额 + 周打卡状态条 -->
    <DewCard variant="inset" size="lg" :no-hover="true" class="quota-card">
      <div class="quota-row">
        <div class="quota-main">
          <span class="quota-label">项目参与</span>
          <span class="quota-num">{{ mine.project_count ?? '—' }}<template v-if="mine.project_limit"> / {{ mine.project_limit }}</template></span>
          <span v-if="remainingHint" class="quota-hint">{{ remainingHint }}</span>
        </div>
        <div v-if="attOn && weekly?.mode === 'weekly'" class="quota-side">
          累计出勤 {{ weekly.total_days || 0 }} 次 · {{ weekly.total_hours || 0 }}h
        </div>
        <div v-else-if="selectingOpen" class="quota-side">组队进行中 · 可提交/修改项目意向</div>
      </div>
    </DewCard>

    <div v-if="viewItems.length" class="hub-bar-scroll">
      <DewButtonBar v-model="view" :items="viewItems" class="hub-bar" />
    </div>

    <!-- ① 项目意向（选择期临时视图：项目墙 + 意向托盘，按钮驱动） -->
    <template v-if="view === 'pref'">
      <div class="section-title">本期项目</div>
      <div v-if="loading" class="hub-loading"><DewSkeleton variant="rect" width="100%" height="200" rounded="8px" /></div>
      <DewCard v-else-if="!projects.length" variant="flat" class="empty-card">
        <div class="empty-text">本期暂无过审项目。项目由负责人在申报期申报、管理员审核后创建。</div>
      </DewCard>
      <template v-else>
        <div class="project-grid">
          <DewCard v-for="p in projects" :key="p.unit_id" variant="default"
                   :tinted="picked(p.unit_id)" :accent="picked(p.unit_id) ? 'primary' : null"
                   class="project-card">
            <div class="card-head">
              <div class="card-name">{{ p.name }}</div>
              <DewTag v-if="p.status !== 'active'" size="sm" round>{{ unitStatusText[p.status] || p.status }}</DewTag>
            </div>
            <div class="card-meta">
              <span>负责人 {{ p.leader_name }}</span>
              <span class="dot">·</span>
              <span>成员 {{ p.member_count }} 人</span>
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
            <div class="card-actions">
              <!-- 已在项目内（自己负责/已加入）：不可进意向（09-13 修复：自选自项目无意义） -->
              <span v-if="p.my_role" class="joined-mark">{{ p.my_role === 'leader' ? '我是负责人' : '已在本项目' }}</span>
              <template v-else>
                <DewButton v-if="picked(p.unit_id)" type="glass" size="sm" @click="togglePick(p)">移出意向</DewButton>
                <DewButton v-else type="ghost" size="sm" :disabled="trayFull || p.status === 'terminated'"
                           @click="togglePick(p)">加入意向</DewButton>
              </template>
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
          <div v-if="!tray.length" class="tray-empty">点项目卡上的「加入意向」按钮</div>
          <div v-else class="tray-list">
            <div v-for="(t, i) in tray" :key="t.unit_id" class="tray-item">
              <span class="tray-rank">{{ i + 1 }}</span>
              <span class="tray-name">{{ t.name }}</span>
              <DewInput v-model="t.note" size="sm" class="tray-note"
                        placeholder="选填：给负责人的留言" />
              <DewButton type="ghost" size="sm" class="tray-remove" @click.stop="removePick(t.unit_id)">移出</DewButton>
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

    <!-- ② 我负责的（单项目看板：成员管理/关键节点/活动考勤/成果/发布） -->
    <template v-else-if="view === 'lead'">
      <ProjectBoard v-if="mine.leading?.length" :sid="sid" :session="session"
                    :units="mine.leading" role="leader" @changed="reload" />
    </template>

    <!-- ③ 我参加的（同款看板，无管理区） -->
    <template v-else-if="view === 'join'">
      <ProjectBoard v-if="mine.joining?.length" :sid="sid" :session="session"
                    :units="mine.joining" role="member" @changed="reload" />
    </template>

    <!-- ④ 请假 -->
    <LeaveApply v-else-if="view === 'leave'" :sid="sid" />

    <!-- 没有任何可落视图（非选择期且未参与项目且无请假）：整体空态 -->
    <DewCard v-if="!viewItems.length" variant="flat" class="empty-card">
      <div class="empty-text">
        {{ session.status === 'upcoming' ? '申报期尚未结束——项目过审并开营后，这里会出现你的项目工作区。'
           : '你本期未加入任何项目。' }}
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewTag, DewButtonBar, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';
import ProjectBoard from './ProjectBoard.vue';
import LeaveApply from './LeaveApply.vue';

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
const attOn = computed(() => !!props.session.policy?.capabilities?.attendance);
const leaveOn = computed(() => !!props.session.policy?.capabilities?.leave);
const remainingHint = computed(() => {
  if (mine.value.project_limit == null) return '';
  const left = mine.value.remaining_slots ?? 0;
  return left ? `还可参与 ${left} 个` : '已达上限';
});

// ── 视图切换（选择期多「项目意向」临时项设默认；我负责的=有负责项目才出现）──
const view = ref(null);
const viewItems = computed(() => {
  const items = [];
  if (selectingOpen.value) items.push({ value: 'pref', label: '项目意向' });
  if (mine.value.leading?.length) items.push({ value: 'lead', label: '我负责的' });
  if (mine.value.joining?.length || !selectingOpen.value) items.push({ value: 'join', label: '我参加的' });
  if (leaveOn.value) items.push({ value: 'leave', label: '请假' });
  return items;
});
watch(viewItems, (items) => {
  if (!items.some((t) => t.value === view.value)) view.value = items[0]?.value ?? null;
}, { immediate: true });

const picked = (unitId) => tray.value.some((t) => t.unit_id === unitId);
const pickRank = (unitId) => tray.value.findIndex((t) => t.unit_id === unitId) + 1;
const trayFull = computed(() => limit.value != null && tray.value.length >= limit.value);

// 意向只走按钮（09-13 拍板：点卡功能砍掉）；自己负责/已加入的项目不进意向
function togglePick(p) {
  if (p.my_role || p.status === 'terminated') return;
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

// ── 周打卡（个人数据，收敛为顶部状态条；活动考勤在各项目看板内）──
const weekly = ref(null);
onMounted(() => {
  if (!attOn.value) return;
  campService.fetchMyAttendance(props.sid)
    .then((d) => { weekly.value = d; })
    .catch(() => { weekly.value = null; });
});
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

/* DewButtonBar 容器范式（照市集 market-filter-scroll 抄）：外层滚动容器隐藏滚动条，
   bar 本体 max-content 贴内容——防 flex column 交叉轴拉伸，窄屏滚动不破版不露滚动条 */
.hub-bar-scroll { min-width: 0; overflow-x: auto; scrollbar-width: none; }
.hub-bar-scroll::-webkit-scrollbar { display: none; }
.hub-bar { width: max-content; margin-bottom: 2px; }

.section-title { font-size: 14.5px; font-weight: 700; color: var(--dew-text-heading); margin-top: 4px; }

.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.project-card { display: flex; flex-direction: column; gap: 8px; position: relative; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card-name { font-size: 15.5px; font-weight: 650; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--dew-text-muted); flex-wrap: wrap; }
.card-meta .dot { color: var(--dew-text-faint); }
.card-desc { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.desc-label { color: var(--dew-text-faint); }
.card-more { font-size: 12px; color: var(--color-primary); cursor: pointer; width: fit-content; }
.card-expand p { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 4px 0 0; }
.card-actions { margin-top: auto; }
.joined-mark { font-size: 12.5px; color: var(--dew-text-faint); }
.pick-mark {
  position: absolute; top: 10px; right: 12px;
  font-size: 11.5px; font-weight: 700; color: var(--color-primary);
  padding: 2px 10px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

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
.tray-remove { flex-shrink: 0; }
.tray-actions { margin-top: 14px; }
</style>
