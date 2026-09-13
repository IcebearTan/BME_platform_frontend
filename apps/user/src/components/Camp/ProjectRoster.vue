<template>
  <!-- 负责人成员勾选（统一 roster API：expected_version 乐观锁 + 幂等键 + 逐项回报）。
       本地暂存差异（待加入/待移出），一次 PUT 原子提交；逐项冲突就地标出。 -->
  <div class="project-roster">
    <div v-if="loading" class="roster-loading"><DewSkeleton variant="rect" width="100%" height="240" rounded="8px" /></div>

    <template v-else>
      <div v-if="!roster.selection_open" class="roster-notice">
        {{ campStatus === 'selecting' ? '项目当前状态不可勾选' : '已开营，普通勾选关闭；成员变更请联系管理员处理' }}
      </div>

      <!-- 当前成员（含暂存差异） -->
      <div class="roster-section">
        <div class="roster-title">当前成员（{{ memberRows.length }}）</div>
        <div v-if="!memberRows.length" class="roster-empty">还没有成员，从下方候选名单勾选</div>
        <div v-else class="roster-list">
          <div v-for="m in memberRows" :key="m.user_id" :class="['roster-row', { removing: pendingRemove.has(m.user_id) }]">
            <span class="row-name">{{ m.username }}</span>
            <DewTag v-if="m.role === 'leader'" size="sm" round>负责人</DewTag>
            <DewTag v-if="pendingRemove.has(m.user_id)" size="sm" round>待移出</DewTag>
            <DewButton v-if="m.role !== 'leader' && roster.selection_open && !pendingRemove.has(m.user_id)"
                       type="ghost" size="sm" class="row-op" @click="stageRemove(m)">移出</DewButton>
            <DewButton v-else-if="pendingRemove.has(m.user_id)" type="ghost" size="sm" class="row-op"
                       @click="stageRemove(m)">撤销</DewButton>
          </div>
        </div>
      </div>

      <!-- 候选名单（选择期开放） -->
      <div v-if="roster.selection_open" class="roster-section">
        <div class="roster-title">候选成员（{{ filteredCandidates.length }}）</div>
        <DewInput v-model="keyword" size="sm" placeholder="搜索姓名" class="roster-search" />
        <div v-if="!filteredCandidates.length" class="roster-empty">没有匹配的候选（候选=本营成员）</div>
        <div v-else class="roster-list">
          <div v-for="c in filteredCandidates" :key="c.user_id"
               :class="['roster-row', { adding: pendingAdd.has(c.user_id) }]">
            <span class="row-name">{{ c.username }}</span>
            <DewTag v-if="c.my_pref_rank" size="sm" round>志愿 {{ c.my_pref_rank }}</DewTag>
            <span class="row-meta">
              已参与 {{ c.project_count }}<template v-if="c.remaining_slots != null"> / 余 {{ c.remaining_slots }}</template>
            </span>
            <span v-if="c.units?.length" class="row-units">{{ c.units.map((u) => u.name).join('、') }}</span>
            <DewButton v-if="!pendingAdd.has(c.user_id)" type="glass" size="sm" class="row-op"
                       :disabled="c.remaining_slots === 0" @click="stageAdd(c)">加入</DewButton>
            <DewButton v-else type="ghost" size="sm" class="row-op" @click="stageAdd(c)">撤销</DewButton>
          </div>
        </div>
      </div>

      <!-- 暂存差异 + 提交 -->
      <div v-if="roster.selection_open" class="roster-footer">
        <span class="diff-text" v-if="diffCount">待提交：加入 {{ pendingAdd.size }} 人 · 移出 {{ pendingRemove.size }} 人</span>
        <span class="diff-text" v-else>无待提交变更</span>
        <DewButton type="glass" :loading="submitting" :disabled="!diffCount" @click="save">提交变更</DewButton>
      </div>

      <!-- 逐项回报（冲突/拒绝就地列出，不吞部分成功） -->
      <div v-if="itemResults.length" class="roster-results">
        <div v-for="(r, i) in itemResults" :key="i" :class="['result-row', r.result]">
          {{ resultText(r) }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DewButton, DewInput, DewTag, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  unitId: { type: Number, required: true },
  campStatus: { type: String, required: true },
});
const emit = defineEmits(['changed']);

const loading = ref(true);
const roster = ref({});
const keyword = ref('');
const pendingAdd = ref(new Set());     // user_id
const pendingRemove = ref(new Set());
const submitting = ref(false);
const itemResults = ref([]);

const memberRows = computed(() => roster.value.members || []);
const filteredCandidates = computed(() => {
  const kw = keyword.value.trim();
  return (roster.value.candidates || []).filter((c) => !kw || c.username?.includes(kw));
});
const diffCount = computed(() => pendingAdd.value.size + pendingRemove.value.size);

function refreshSets(set, id) {
  const s = new Set(set.value);
  s.has(id) ? s.delete(id) : s.add(id);
  set.value = s;
}
function stageAdd(c) { refreshSets(pendingAdd, c.user_id); }
function stageRemove(m) { refreshSets(pendingRemove, m.user_id); }

async function load() {
  loading.value = true;
  try {
    roster.value = await campService.fetchSelectionRoster(props.unitId);
    pendingAdd.value = new Set();
    pendingRemove.value = new Set();
    itemResults.value = [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载名单失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const RESULT_TEXT = {
  added: '已加入', removed: '已移出', unchanged: '无变化（已在目标状态）',
  conflict: '被拒：参与数达上限', forbidden: '被拒：不在本营或不可操作',
};
function resultText(r) {
  const uname = nameOf(r.user_id);
  return `${uname}：${RESULT_TEXT[r.result] || r.result}${r.message && r.result !== 'added' && r.result !== 'removed' ? '（' + r.message + '）' : ''}`;
}
function nameOf(uid) {
  const m = (roster.value.members || []).find((x) => x.user_id === uid);
  if (m) return m.username;
  const c = (roster.value.candidates || []).find((x) => x.user_id === uid);
  return c ? c.username : `用户#${uid}`;
}

async function save() {
  if (submitting.value || !diffCount.value) return;
  submitting.value = true;
  try {
    const operations = [
      ...[...pendingAdd.value].map((uid) => ({ user_id: uid, op: 'add' })),
      ...[...pendingRemove.value].map((uid) => ({ user_id: uid, op: 'remove' })),
    ];
    const r = await campService.putMemberSelection(props.unitId, {
      expected_version: roster.value.version,
      idempotency_key: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      operations,
    });
    itemResults.value = r.results || [];
    const bad = itemResults.value.filter((x) => x.result === 'conflict' || x.result === 'forbidden');
    if (bad.length) ElMessage.warning(`${bad.length} 项未成功，详见下方回报`);
    else ElMessage.success('已提交');
    emit('changed');
    // 重拉名单（version 已前进；未成功项回到可重试状态）
    const keep = itemResults.value;
    await load();
    itemResults.value = keep;
  } catch (e) {
    const msg = e.response?.data?.message || '提交失败，请稍后重试';
    ElMessage.error(msg);   // 409 SELECTION_VERSION_CONFLICT → 提示刷新，名单已重拉
    await load();
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.project-roster { display: flex; flex-direction: column; gap: 16px; }
.roster-loading { padding: 4px 0; }
.roster-notice {
  font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6;
  padding: 10px 14px; border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.roster-section { display: flex; flex-direction: column; gap: 8px; }
.roster-title { font-size: 13.5px; font-weight: 650; color: var(--dew-text-heading); }
.roster-search { max-width: 220px; }
.roster-empty { font-size: 12.5px; color: var(--dew-text-faint); padding: 6px 0; }
.roster-list { display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto; }
.roster-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; font-size: 13px;
  border: 1px solid transparent;
}
.roster-row:hover { background: color-mix(in srgb, var(--dew-text-muted) 7%, transparent); }
.roster-row.removing, .roster-row.adding {
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
  background: color-mix(in srgb, var(--color-primary) 7%, transparent);
}
.row-name { font-weight: 600; color: var(--dew-text-heading); min-width: 88px; }
.row-meta { font-size: 12px; color: var(--dew-text-muted); }
.row-units { font-size: 12px; color: var(--dew-text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.row-op { margin-left: auto; flex-shrink: 0; }

.roster-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.diff-text { font-size: 12.5px; color: var(--dew-text-muted); }

.roster-results { display: flex; flex-direction: column; gap: 4px; }
.result-row {
  font-size: 12.5px; padding: 6px 10px; border-radius: 6px;
  color: var(--dew-text-muted);
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.result-row.conflict, .result-row.forbidden {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.result-row.added, .result-row.removed {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}
</style>
