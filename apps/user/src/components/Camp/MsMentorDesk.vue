<template>
  <div class="ms-mentor-desk">
    <DewCard v-if="loading" variant="default" size="lg" :no-hover="true">
      <div v-loading="true" class="ms-loading"></div>
    </DewCard>

    <template v-else-if="phaseInfo">
      <DewCard variant="default" size="lg" :no-hover="true" class="section-card">
        <MsPhaseBar :phase="phaseInfo.phase" />
        <div class="phase-caption">{{ deskCaption }}</div>
      </DewCard>

      <!-- 名片（upcoming/collecting 可编辑；锁定后只读展示） -->
      <MsMentorProfile
        v-if="!locked"
        :sid="sid"
        :ms-tags="phaseInfo.ms_tags"
        :deadline="phaseInfo.deadlines?.preference_deadline || ''"
        :locked="false"
        @saved="reloadAll"
      />
      <DewCard v-else-if="profile" variant="default" size="lg" :no-hover="true" class="section-card">
        <template #header>
          <div class="head-row">
            <h3>我的导生名片</h3>
            <span class="head-hint">
              已锁定 · {{ phaseInfo.deadlines?.preference_deadline
                ? `${phaseInfo.deadlines.preference_deadline} 志愿截止` : '志愿已截止' }}，协调期名额口径固定，不可修改
            </span>
          </div>
        </template>
        <div class="locked-profile">
          <el-avatar :size="56" :src="assetUrl(profile.photo_url)" shape="square">
            {{ (username || '?').charAt(0) }}
          </el-avatar>
          <div class="locked-meta">
            <div class="locked-name">{{ username }}</div>
            <div v-if="profile.tags?.length" class="locked-tags">
              <DewTag v-for="t in profile.tags" :key="t" size="sm" round>{{ t }}</DewTag>
            </div>
            <p class="locked-bio">{{ profile.bio || '（未填写介绍）' }}</p>
          </div>
        </div>
      </DewCard>
      <DewCard v-else variant="default" size="lg" :no-hover="true" class="section-card">
        <div class="result-hint">你未发布名片（本轮对学员不可见）。下个营期记得在志愿期开始前发布。</div>
      </DewCard>

      <!-- 谁报了我（collecting 期只读名单；协调由老师线下完成） -->
      <DewCard
        v-if="phaseInfo.phase === 'collecting'"
        variant="default" size="lg" :no-hover="true" class="section-card"
      >
        <template #header>
          <div class="head-row">
            <h3>谁报了我</h3>
            <div class="preference-summary" aria-label="志愿人数统计">
              <span class="summary-item summary-total">共 {{ suitors.length }} 人</span>
              <span v-for="item in preferenceCounts" :key="item.rank" class="summary-item">
                {{ item.label }} {{ item.count }}
              </span>
            </div>
          </div>
        </template>

        <div v-if="!suitors.length" class="ms-empty">还没有学员选择你</div>
        <TransitionGroup v-else name="suitor" tag="div" class="suitor-list">
          <div v-for="s in suitors" :key="s.user_id" class="suitor-item" :class="{ taken: s.matched }">
            <el-avatar
              :size="40" :src="assetUrl(s.avatar)" class="link-avatar"
              :title="`查看 ${s.username} 的主页`" @click="goProfile(s.user_id)"
            >{{ (s.username || '?').charAt(0) }}</el-avatar>
            <div class="suitor-main">
              <div class="suitor-name-row">
                <span class="suitor-name">{{ s.username }}</span>
                <span class="rank-chip">志愿 {{ s.rank }}</span>
              </div>
              <p v-if="s.note" class="suitor-note">“{{ s.note }}”</p>
            </div>
            <div class="suitor-side">
              <span v-if="s.matched" class="taken-tag">已分配给 {{ s.matched_mentor_name || '其他导生' }}</span>
            </div>
          </div>
        </TransitionGroup>
      </DewCard>

      <!-- 人员确认（done 协调期：全营名单 + 自助勾选；老师批量指派仍是主路径） -->
      <DewCard
        v-if="phaseInfo.phase === 'done'"
        variant="default" size="lg" :no-hover="true" class="section-card"
      >
        <template #header>
          <div class="head-row">
            <h3>人员确认</h3>
            <span class="head-hint">
              {{ rosterInfo?.capacity === null
                 ? `已选 ${rosterInfo?.matched ?? 0} · 名额不限`
                 : `已选 ${rosterInfo?.matched ?? 0} / ${rosterInfo?.capacity ?? 0}` }} ·
              {{ rosterInfo?.writable ? '锁定线下已定的学员，老师也可批量指派' : '营期已归档，名单只读' }}
            </span>
          </div>
        </template>

        <div v-loading="rosterLoading" class="roster-body">
          <div class="roster-toolbar">
            <DewInput
              v-model="rosterQuery" class="roster-search" clearable
              placeholder="搜索学员姓名" :prefix-icon="Search"
            />
            <span class="roster-count">{{ rosterFiltered.length }} 位学员</span>
          </div>

          <div v-if="!rosterLoading && !rosterFiltered.length" class="ms-empty">
            {{ rosterQuery ? '没有匹配的学员' : '本营暂无学员' }}
          </div>
          <TransitionGroup v-else name="suitor" tag="div" class="suitor-list">
            <div
              v-for="s in rosterFiltered" :key="s.user_id"
              class="suitor-item pick-item"
              :class="{ mine: s.status === 'mine', taken: s.status === 'taken' }"
            >
              <el-avatar
                :size="40" :src="assetUrl(s.avatar)" class="link-avatar"
                :title="`查看 ${s.username} 的主页`" @click="goProfile(s.user_id)"
              >{{ (s.username || '?').charAt(0) }}</el-avatar>
              <div class="suitor-main">
                <div class="suitor-name-row">
                  <span class="suitor-name">{{ s.username }}</span>
                  <span v-if="s.rank" class="rank-chip">志愿 {{ s.rank }}</span>
                  <span v-else-if="s.submitted" class="rank-plain">志愿未选我</span>
                  <span v-else class="rank-plain">未交志愿</span>
                </div>
                <p v-if="s.note" class="suitor-note">“{{ s.note }}”</p>
              </div>
              <div class="suitor-side pick-side">
                <DewTag v-if="s.status === 'mine' && s.source === 'admin'" size="sm">老师指派</DewTag>
                <template v-if="s.status === 'mine'">
                  <DewButton
                    v-if="rosterInfo?.writable && s.source === 'mentor_pick'"
                    type="ghost" size="sm" :loading="actingId === s.user_id"
                    @click="releaseStudent(s)"
                  >释放</DewButton>
                </template>
                <DewButton
                  v-else-if="s.status === 'free' && rosterInfo?.writable && (rosterInfo?.remaining ?? 0) > 0"
                  type="glass" size="sm" :loading="actingId === s.user_id"
                  @click="pickStudent(s)"
                >锁定</DewButton>
                <span v-else-if="s.status === 'free' && rosterInfo?.writable" class="taken-tag">名额已满</span>
                <span v-else-if="s.status === 'taken'" class="taken-tag">已属 {{ s.mentor_name || '其他导生' }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { DewButton, DewCard, DewInput, DewTag } from '@bme/dew-ui';
import MsPhaseBar from './MsPhaseBar.vue';
import MsMentorProfile from './MsMentorProfile.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const store = useStore();
const router = useRouter();
const username = computed(() => store.state.user?.username || '');

// 头像点击 → 新页签打开用户公开主页（/profile/:id 复用 UserIndex），
// 不打断导生当前的工作台/勾选现场
const goProfile = (uid) => {
  window.open(router.resolve(`/profile/${uid}`).href, '_blank', 'noopener');
};

const loading = ref(true);
const phaseInfo = ref(null);
const suitorsInfo = ref(null);   // {preview, capacity, matched, remaining}
const suitors = ref([]);

// 人员确认（done 协调期）：全营名单 + 自助勾选
const rosterInfo = ref(null);    // {writable, capacity, matched, remaining}
const rosterStudents = ref([]);
const rosterLoading = ref(false);
const rosterQuery = ref('');
const actingId = ref(null);      // 正在勾选/释放的学员（行级 loading）

const rosterFiltered = computed(() => {
  const q = rosterQuery.value.trim();
  if (!q) return rosterStudents.value;
  return rosterStudents.value.filter((s) => (s.username || '').includes(q));
});

const profile = computed(() => phaseInfo.value?.me?.profile || null);
const locked = computed(() => phaseInfo.value?.me?.profile_locked ?? true);
const preferenceCounts = computed(() => [
  { rank: 1, label: '一志愿', count: suitors.value.filter((s) => s.rank === 1).length },
  { rank: 2, label: '二志愿', count: suitors.value.filter((s) => s.rank === 2).length },
  { rank: 3, label: '三志愿', count: suitors.value.filter((s) => s.rank === 3).length },
]);

const deskCaption = computed(() => {
  const p = phaseInfo.value;
  if (!p) return '';
  if (p.phase === 'upcoming') return `完善名片，${p.deadlines.preference_start || ''} 起学员可见`;
  if (p.phase === 'collecting') return `学员正在提交志愿 · ${p.deadlines.preference_deadline || ''} 截止后由老师统一协调分配`;
  if (p.phase === 'done') return '志愿已截止：在下方锁定你的学员（名额内），老师仍可批量指派回填';
  return '';
});

async function loadRoster() {
  const sid = props.sid;
  rosterLoading.value = true;
  try {
    const r = await campService.fetchMsPickRoster(sid);
    if (sid !== props.sid) return;   // 切营防串台
    rosterInfo.value = r;
    rosterStudents.value = r.students || [];
  } catch {
    rosterInfo.value = null;
    rosterStudents.value = [];
  } finally {
    rosterLoading.value = false;
  }
}

// 勾选/释放成功或冲突后整表刷新（名额、归属都是全表状态）
async function actOnRoster(action, student) {
  if (actingId.value) return;
  actingId.value = student.user_id;
  try {
    const fn = action === 'release'
      ? campService.msReleaseStudent
      : campService.msPickStudent;
    const r = await fn(props.sid, student.user_id);
    ElMessage.success(r.message || '操作成功');
  } catch (e) {
    // 名额满/已被勾选等 409、只读 400：后端 message 面向用户，直接展示
    ElMessage.error(e.response?.data?.message || '操作失败，请稍后重试');
  } finally {
    actingId.value = null;
    loadRoster();   // 失败也刷新：本地状态可能与并发操作者不一致
  }
}
const pickStudent = (s) => actOnRoster('pick', s);
const releaseStudent = (s) => actOnRoster('release', s);

async function reloadAll() {
  const sid = props.sid;
  try {
    const ph = await campService.fetchMsPhase(sid);
    if (sid !== props.sid) return;   // 切营防串台
    phaseInfo.value = ph;
    if (ph.phase === 'collecting') {
      const su = await campService.fetchMsSuitors(sid).catch(() => null);
      if (sid !== props.sid) return;
      if (su && su.code === 200) {
        suitorsInfo.value = su;
        suitors.value = su.suitors || [];
      } else {
        suitorsInfo.value = null;
        suitors.value = [];
      }
    } else {
      suitorsInfo.value = null;
      suitors.value = [];
    }
    if (ph.phase === 'done') {
      await loadRoster();
    } else {
      rosterInfo.value = null;
      rosterStudents.value = [];
    }
  } finally {
    loading.value = false;
  }
}

watch(() => props.sid, () => { loading.value = true; reloadAll(); }, { immediate: true });
</script>

<style scoped>
.ms-mentor-desk { display: flex; flex-direction: column; gap: 16px; }

.section-card { width: 100%; }
.ms-loading { min-height: 160px; }

.phase-caption {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--dew-card-flat-border, rgba(0, 0, 0, 0.08));
  font-size: 12.5px;
  color: var(--dew-text-muted);
}

.head-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.head-row h3 { margin: 0; font-size: 16px; font-weight: 600; }
.head-hint { font-size: 12px; color: var(--dew-text-muted); }
.preference-summary { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.summary-item {
  padding: 2px 7px;
  border: 1px solid var(--dew-card-flat-border, rgba(0, 0, 0, 0.08));
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dew-text-muted);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
}
.summary-total { color: var(--dew-text); font-weight: 600; }

.ms-empty {
  padding: 30px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 名片锁定态 */
.locked-profile { display: flex; gap: 14px; }
.locked-meta { min-width: 0; }
.locked-name { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.locked-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.locked-bio {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--dew-text-muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 意向单（订单式列表） */
.suitor-list { display: flex; flex-direction: column; gap: 10px; }
.suitor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md, 12px);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
  transition: transform 0.25s var(--dew-bounce, ease);
}
.suitor-item:hover { transform: translateX(3px); }
.suitor-item.taken { opacity: 0.55; }

.suitor-main { flex: 1; min-width: 0; }
.suitor-name-row { display: flex; align-items: center; gap: 8px; }
.suitor-name { font-size: 14px; font-weight: 600; color: var(--dew-text); }
.rank-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.suitor-note {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--dew-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.suitor-side { flex: none; }
.taken-tag { font-size: 12px; color: var(--dew-text-muted); }
.rank-plain { font-size: 11.5px; color: var(--dew-text-faint); }

.suitor-enter-active, .suitor-leave-active { transition: all 0.25s var(--dew-bounce, ease); }
.suitor-enter-from, .suitor-leave-to { opacity: 0; transform: translateY(6px); }

/* 人员确认（done 协调期勾选名单） */
.roster-body { display: flex; flex-direction: column; gap: 10px; min-height: 120px; }
/* mine 行有描边，全行预留透明边框防行高跳动 */
.pick-item { border: 1px solid transparent; }
/* 头像可点进主页：指针 + 悬停主色描边 */
.link-avatar {
  cursor: pointer;
  flex: none;
  transition: box-shadow 0.2s ease, transform 0.2s var(--dew-bounce, ease);
}
.link-avatar:hover {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent);
  transform: translateY(-1px);
}
.roster-toolbar { display: flex; align-items: center; gap: 10px; }
.roster-search { max-width: 220px; }
.roster-count { margin-left: auto; font-size: 12px; color: var(--dew-text-muted); }
.pick-item.mine {
  border: 1px solid color-mix(in srgb, var(--color-success) 45%, transparent);
  background: color-mix(in srgb, var(--color-success) 7%, transparent);
}
.pick-item.mine:hover { transform: none; }
.pick-side { display: inline-flex; align-items: center; gap: 8px; }

.result-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.6; }
</style>
