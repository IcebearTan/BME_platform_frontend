<template>
  <div class="teacher-members">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>营期成员（{{ total || counts.all }}）</h3></template>

      <!-- 工具栏 -->
      <div class="toolbar">
        <DewInput v-model="query.keyword" placeholder="搜索姓名" size="sm"
          style="width: 180px;" @enter="search" @clear="search" clearable />
        <DewSelect v-model="query.role" size="sm" style="width: 120px;"
          placeholder="全部身份" clearable
          :options="[{ label: '学员', value: 'student' }, { label: '导生', value: 'mentor' }, { label: '成员', value: 'member' }]"
          @update:model-value="search" />
        <DewButton size="sm" @click="search">查询</DewButton>
        <div class="toolbar-right">
          <span class="count-hint">导生 {{ counts.mentor }} · 学员 {{ counts.student }}</span>
          <DewButton size="sm" type="glass" @click="openAdd">加成员</DewButton>
        </div>
      </div>

      <!-- 列表 -->
      <div v-if="loading" style="display: flex; flex-direction: column; gap: 8px;">
        <DewSkeleton v-for="n in 5" :key="n" variant="text" :width="n % 2 ? '60%' : '88%'" />
      </div>
      <div v-else-if="!rows.length" class="empty">没有符合条件的成员</div>
      <div v-else class="member-list">
        <div v-for="row in rows" :key="row.user_id" class="member-row">
          <span class="m-name">{{ row.username }}</span>
          <DewTag :type="row.role === 'mentor' ? 'primary' : row.role === 'member' ? 'info' : 'neutral'"
            size="sm" :round="true">
            {{ { mentor: '导生', member: '成员' }[row.role] || '学员' }}
          </DewTag>
          <div class="m-mentor">
            <template v-if="row.role === 'student'">
              <DewSelect :model-value="row.team_mentor_id" size="sm" placeholder="未分配"
                class="mentor-select" clearable
                :options="mentorOptions"
                @update:model-value="(v) =>reassign(row, v)" />
            </template>
            <span v-else class="m-dash">—</span>
          </div>
          <span class="m-joined">{{ (row.joined_at || '').slice(0, 10) }}</span>
          <DewButton v-if="row.role === 'student' && attEnabled" size="sm" type="ghost"
                     @click="openPlanDlg(row)">出勤日</DewButton>
          <DewButton size="sm" type="ghost" @click="remove(row)">移除</DewButton>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > query.pageSize" class="pager">
        <DewButton size="sm" :disabled="query.page <= 1" @click="query.page--; load()">上一页</DewButton>
        <span class="pager-text">{{ query.page }} / {{ totalPages }}</span>
        <DewButton size="sm" :disabled="query.page >= totalPages" @click="query.page++; load()">下一页</DewButton>
      </div>
    </DewCard>

    <!-- 调整承诺出勤日弹窗（migrate_46：全量替换 + 账本 + 通知学员） -->
    <DewDialog v-model="planDlg.visible" :title="`承诺出勤日 · ${planDlg.username}`" :width="560">
      <div v-if="planDlg.loading" style="padding: 8px 0;">
        <DewSkeleton variant="rect" width="100%" height="140" rounded="8px" />
      </div>
      <template v-else>
        <div class="plan-hint">
          点选该学员的承诺到岗日（{{ planDlg.rangeText }}{{ planDlg.weekdaysOnly ? '，仅工作日' : '' }}）；
          保存后学员会收到通知，调整记录留痕可追溯。重生成/同步不会改动这里的个人承诺日。
        </div>
        <div class="date-grid">
          <button v-for="d in planDlg.candidates" :key="d.iso" type="button"
                  :class="['date-chip', { on: planDlg.picked.has(d.iso), past: d.past }]"
                  :disabled="d.past" @click="toggleDate(d.iso)">{{ d.label }}</button>
        </div>
        <div class="plan-meta">已选 {{ planDlg.picked.size }} 天</div>
        <DewInput v-model="planDlg.reason" size="sm" style="width: 100%; margin-top: 8px;"
                  placeholder="调整原因（可选，将通知学员）" />
        <template v-if="planDlg.changes.length">
          <div class="plan-changes-title">最近调整记录</div>
          <div v-for="(c, i) in planDlg.changes.slice(0, 3)" :key="i" class="plan-change-row">
            {{ (c.created_at || '').slice(0, 16).replace('T', ' ') }} · {{ c.operator_name || '操作人' }}：
            {{ c.before.length }} 天 → {{ c.after.length }} 天<template v-if="c.reason">（{{ c.reason }}）</template>
          </div>
        </template>
      </template>
      <template #footer>
        <DewButton size="sm" type="ghost" @click="planDlg.visible = false">取消</DewButton>
        <DewButton size="sm" type="glass" :loading="planDlg.submitting"
                   :disabled="!planDlg.picked.size" @click="submitPlan">保存（{{ planDlg.picked.size }} 天）</DewButton>
      </template>
    </DewDialog>

    <!-- 加成员弹窗 -->
    <DewDialog v-model="addDlg.visible" title="加成员" :width="520">
      <div class="add-hint">搜索未入营的普通用户（每次最多 20 个候选）；学员可统一预分配导生，加入后可改派</div>
      <DewInput v-model="addDlg.keyword" placeholder="输入姓名或邮箱搜索" size="sm"
        style="width: 100%; margin: 10px 0;" @enter="searchCandidates" />
      <DewButton size="sm" @click="searchCandidates">搜索</DewButton>
      <div v-if="addDlg.loading" style="margin-top: 12px;">
        <DewSkeleton variant="text" width="70%" />
      </div>
      <div v-else class="cand-list">
        <div v-for="u in addDlg.options" :key="u.User_Id" class="cand-row" @click="togglePick(u)">
          <span class="cand-check" :class="{ checked: picked.has(u.User_Id) }"></span>
          <span class="cand-name">{{ u.User_Name }}</span>
          <span class="cand-mail">{{ u.User_Email }}</span>
        </div>
        <div v-if="!addDlg.options.length && addDlg.searched" class="empty">没有匹配的用户</div>
      </div>
      <div v-if="picked.size" class="add-form">
        <DewSelect v-model="addDlg.role" size="sm" style="width: 140px;"
          :options="[{ label: '学员', value: 'student' }, { label: '导生', value: 'mentor' }]" />
        <DewSelect v-if="addDlg.role === 'student'" v-model="addDlg.mentorId" size="sm"
          style="width: 180px;" placeholder="统一指定导生（可选）" clearable
          :options="mentorOptions" />
      </div>
      <template #footer>
        <DewButton size="sm" type="ghost" @click="addDlg.visible = false">取消</DewButton>
        <DewButton size="sm" type="glass" :disabled="!picked.size || addDlg.submitting"
          :loading="addDlg.submitting" @click="submitAdd">加入（{{ picked.size }}）</DewButton>
      </template>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { DewButton, DewCard, DewDialog, DewInput, DewSelect, DewSkeleton, DewTag } from '@bme/dew-ui';
import { ElMessage, ElMessageBox } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  writable: { type: Boolean, default: true },
  /** 启用每日考勤的营才显示「出勤日」入口（policy.capabilities.attendance） */
  attEnabled: { type: Boolean, default: false },
});
const emit = defineEmits(['reviewed']);

const rows = ref([]);
const mentors = ref([]);
const total = ref(0);
const counts = ref({ student: 0, mentor: 0, member: 0, all: 0 });
const loading = ref(true);
const query = reactive({ page: 1, pageSize: 20, keyword: '', role: null });

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchMembersPaged(props.sid, {
      page: query.page, page_size: query.pageSize,
      keyword: query.keyword || undefined,
      role: query.role || undefined,
    });
    rows.value = d.members || [];
    total.value = d.total || 0;
    counts.value = { ...counts.value, ...(d.counts || {}) };
    counts.value.all = Object.values(d.counts || {}).reduce((s, n) => s + n, 0);
    // 改派选项：本营导生（成员行外的独立列表，member_list 未含全量导生时兜底拉 mentors）
    if (!mentors.value.length) {
      try {
        const all = await campService.fetchMembersPaged(props.sid, { page: 1, page_size: 100, role: 'mentor' });
        mentors.value = (all.members || []).map((m) => ({ label: m.username, value: m.user_id }));
      } catch { /* 导生列表失败不阻塞成员表 */ }
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载成员失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, () => { mentors.value = []; load(); }, { immediate: true });
defineExpose({ reload: load });

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)));
const mentorOptions = computed(() => mentors.value);
function search() { query.page = 1; load(); }

// 改派（member_update：学员行换导生；清空=回未分配池，后端会通知三方）
async function reassign(row, mentorId) {
  try {
    await campService.updateMemberMentor(props.sid, row.user_id, mentorId || null);
    row.team_mentor_id = mentorId || null;
    const m = mentors.value.find((x) => x.value === mentorId);
    ElMessage.success(mentorId ? `已改派给 ${m?.label || '导生'}` : '已解除归属');
    emit('reviewed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '改派失败');
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `移除「${row.username}」后其考勤承诺、报名与导生归属数据将被清理，且会通知本人。确定移除吗？`,
      '移除成员', { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    await campService.removeMember(props.sid, row.user_id);
    ElMessage.success('已移除');
    emit('reviewed');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '移除失败');
  }
}

// ── 加成员（member-candidates 远程搜索 + batch 落库）──
const addDlg = reactive({
  visible: false, keyword: '', options: [], loading: false,
  searching: false, searched: false, role: 'student', mentorId: null, submitting: false,
});
const picked = ref(new Set());

function openAdd() {
  addDlg.keyword = ''; addDlg.options = []; addDlg.searched = false;
  addDlg.role = 'student'; addDlg.mentorId = null;
  picked.value = new Set();
  addDlg.visible = true;
}
async function searchCandidates() {
  addDlg.loading = true;
  addDlg.searched = true;
  try {
    const d = await campService.fetchMemberCandidates(props.sid, {
      keyword: addDlg.keyword || undefined, page: 1, page_size: 20,
    });
    addDlg.options = d.users || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '搜索失败');
  } finally { addDlg.loading = false; }
}
function togglePick(u) {
  const next = new Set(picked.value);
  if (next.has(u.User_Id)) next.delete(u.User_Id);
  else next.add(u.User_Id);
  picked.value = next;
}
async function submitAdd() {
  if (!picked.value.size) return;
  addDlg.submitting = true;
  try {
    const items = [...picked.value].map((uid) => ({
      user_id: uid,
      role: addDlg.role,
      team_mentor_id: addDlg.role === 'student' ? (addDlg.mentorId || null) : null,
    }));
    const r = await campService.assignMembersBatch(props.sid, items);
    const ok = r.added || 0;
    const failed = (r.results || []).filter((x) => x.status === 'failed');
    ElMessage.success(`已加入 ${ok}/${items.length} 人`);
    if (failed.length) {
      ElMessage.warning(`${failed.length} 人未成功：${failed.map((f) => f.message).join('；')}`);
    }
    addDlg.visible = false;
    emit('reviewed');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加入失败');
  } finally { addDlg.submitting = false; }
}

// ── 承诺出勤日调整（migrate_46：日期 chip 网格 + 变更记录）──
const planDlg = reactive({
  visible: false, loading: true, submitting: false,
  uid: null, username: '', reason: '',
  candidates: [], picked: new Set(), changes: [],
  rangeText: '', weekdaysOnly: false,
});

async function openPlanDlg(row) {
  planDlg.uid = row.user_id;
  planDlg.username = row.username;
  planDlg.reason = '';
  planDlg.visible = true;
  planDlg.loading = true;
  try {
    const d = await campService.fetchStudentPlan(props.sid, row.user_id);
    const range = d.range || {};
    planDlg.weekdaysOnly = !!range.weekdays_only;
    planDlg.rangeText = `${(range.start || '').slice(5)} ~ ${(range.end || '').slice(5)}`;
    planDlg.changes = d.changes || [];
    planDlg.picked = new Set(d.dates || []);
    // 候选日期：营期范围内（工作日营剔除周末）；过去的日期禁选（保留展示）
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (range.start && range.end) {
      const cur = new Date(range.start + 'T00:00:00');
      const end = new Date(range.end + 'T00:00:00');
      while (cur <= end) {
        const day = cur.getDay();
        if (!planDlg.weekdaysOnly || (day !== 0 && day !== 6)) {
          out.push({
            iso: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
            label: `${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
            past: cur < today,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    planDlg.candidates = out;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载承诺日失败');
  } finally { planDlg.loading = false; }
}

function toggleDate(iso) {
  const next = new Set(planDlg.picked);
  if (next.has(iso)) next.delete(iso);
  else next.add(iso);
  planDlg.picked = next;
}

async function submitPlan() {
  if (!planDlg.picked.size || planDlg.submitting) return;
  planDlg.submitting = true;
  try {
    const r = await campService.adjustStudentPlan(
      props.sid, planDlg.uid, [...planDlg.picked], planDlg.reason.trim());
    ElMessage.success(r.message || '已调整');
    planDlg.visible = false;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '调整失败');
  } finally { planDlg.submitting = false; }
}
</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.count-hint { font-size: 12px; color: var(--dew-text-faint); }

.member-list { display: flex; flex-direction: column; }
.member-row {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 6px;
}
.member-row + .member-row { border-top: 1px solid var(--dew-card-divider); }
.m-name { font-weight: 600; min-width: 72px; }
.m-mentor { flex: 1; min-width: 0; }
.mentor-select { width: 220px; }
.m-dash { color: var(--dew-text-faint); }
.m-joined { font-size: 12px; color: var(--dew-text-faint); width: 84px; text-align: right; }
.member-row .dew-button { margin-left: auto; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; }
.pager-text { font-size: 12.5px; color: var(--dew-text-faint); }

.add-hint { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }

/* 承诺出勤日调整弹窗 */
.plan-hint { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }
.date-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; max-height: 220px; overflow-y: auto; }
.date-chip {
  padding: 4px 10px; border-radius: 8px; font-size: 12.5px; cursor: pointer;
  border: 1px solid var(--dew-card-border); background: transparent;
  color: var(--dew-text-muted); font-family: inherit;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.date-chip:hover:not(:disabled) { transform: translateY(-1px); }
.date-chip.on {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}
.date-chip.past { opacity: 0.4; cursor: not-allowed; }
.plan-meta { margin-top: 8px; font-size: 12.5px; color: var(--dew-text-muted); }
.plan-changes-title { margin-top: 14px; font-size: 12.5px; font-weight: 600; color: var(--dew-text-muted); }
.plan-change-row { font-size: 12px; color: var(--dew-text-faint); line-height: 1.8; }
.cand-list { margin-top: 12px; max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; }
.cand-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 6px; border-radius: var(--radius-md); cursor: pointer;
}
.cand-row:hover { background: var(--dew-ghost-hover-bg); }
.cand-check {
  width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid var(--dew-card-border); flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.cand-check.checked { background: var(--color-primary); border-color: var(--color-primary); }
.cand-name { font-weight: 600; min-width: 72px; }
.cand-mail { font-size: 12px; color: var(--dew-text-faint); overflow: hidden; text-overflow: ellipsis; }
.add-form { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.empty { padding: 20px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }
</style>
