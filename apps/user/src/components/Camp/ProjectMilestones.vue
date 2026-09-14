<template>
  <!-- 项目交付节点区（09-14 提交链恢复 + 评价制并存）：节点时间轴，展开区两块——
       ① 交付材料：版本化提交（文字+附件）+ 审核（member 模式负责人审成员/整队模式老师审）；
       ② 节点评价：负责人对每位成员打分 0-100 + 评语（成员仅见本人）。
       材料=过程，评价=结果；节点默认全展开（09-14 用户定）。 -->
  <div class="pm-wrap">
    <div v-if="loading" class="pm-loading"><DewSkeleton variant="rect" width="100%" height="140" rounded="8px" /></div>
    <template v-else>
      <div v-if="!milestones.length" class="pm-empty">
        {{ canManage ? '还没有交付节点——先建项目模板（施工图）自动生成，或在下方手动添加' : '负责人尚未配置交付节点' }}
      </div>

      <!-- 节点列表 -->
      <div v-for="m in milestones" :key="m.id" :class="['ms-row', `ms-${m.status}`, { 'ms-done': m.node_complete }]">
        <button type="button" class="ms-head" @click="toggleExpand(m.id)">
          <span class="ms-order">{{ m.order_no }}</span>
          <span class="ms-title">{{ m.title }}</span>
          <DewTag size="sm" round>{{ m.submit_mode === 'member' ? '个人交付' : '整队交付' }}</DewTag>
          <span v-if="m.due_date" class="ms-due">{{ m.due_date }}</span>
          <span class="ms-status">
            <span :class="`st-${m.status}`">{{ STATUS_TEXT[m.status] || m.status }}</span>
            <span v-if="canManage">已评 {{ m.evaluated_count }}/{{ m.member_count }}</span>
            <span v-else>{{ myEval(m) ? `我的评价 ${myEval(m).score} 分` : '待评价' }}</span>
            <span v-if="m.node_complete" class="st-done">已完成</span>
          </span>
          <el-icon class="ms-caret" :class="{ open: expanded.has(m.id) }"><ArrowDown /></el-icon>
        </button>

        <!-- 展开区：要求 + ① 交付材料 + ② 节点评价 -->
        <div v-if="expanded.has(m.id)" class="ms-body">
          <p v-if="m.requirement" class="ms-req"><span class="req-label">交付要求：</span>{{ m.requirement }}</p>
          <p v-if="m.description" class="ms-req"><span class="req-label">说明：</span>{{ m.description }}</p>

          <!-- ① 交付材料（版本链 + 提交盒 + 审核） -->
          <div class="ms-sec-label">交付材料</div>
          <div v-if="m.submissions.length" class="chain">
            <div v-for="s in m.submissions" :key="s.id" :class="['chain-item', `cs-${s.status}`]">
              <div class="chain-line">
                <span class="chain-ver">v{{ s.version }}</span>
                <span v-if="m.submit_mode === 'member'" class="chain-by">{{ s.submitted_by_name || `#${s.submitted_by}` }}</span>
                <span :class="['chain-status', `cs-${s.status}`]">{{ SUB_TEXT[s.status] || s.status }}</span>
                <span class="chain-time">{{ (s.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
                <!-- 审核：member 模式成员的待审版本（负责人审）；admin 可审任何待审 -->
                <template v-if="s.status === 'submitted' && canReview(m, s)">
                  <DewButton type="glass" size="sm" @click="review(s, 'approve')">通过</DewButton>
                  <DewButton type="danger" size="sm" @click="review(s, 'return')">退回</DewButton>
                </template>
              </div>
              <p v-if="s.content" class="chain-content">{{ s.content }}</p>
              <p v-if="s.review_note" class="chain-note">审核意见：{{ s.review_note }}</p>
              <div v-if="s.attachments?.length" class="chain-atts">
                <a v-for="a in s.attachments" :key="a.id" :href="campService.attachmentUrl(a.id)"
                   target="_blank" class="att-link">{{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}</a>
              </div>
            </div>
          </div>
          <div v-else class="chain-empty">尚无提交</div>

          <!-- 提交区（active 成员；approved/archived/paused 关闭） -->
          <div v-if="canSubmit(m)" class="submit-box">
            <DewInput v-model="drafts[m.id].content" type="textarea" :rows="2"
                      :placeholder="m.submit_mode === 'team' ? '整队交付说明（负责人提交）' : '我的交付说明'" />
            <div class="submit-row">
              <input :ref="(el) => (fileEls[m.id] = el)" type="file" multiple class="file-input-hidden"
                     @change="(e) => onFiles(m.id, e)" />
              <DewButton type="ghost" size="sm" @click="pickFiles(m.id)">
                {{ drafts[m.id].files.length ? `附件 ×${drafts[m.id].files.length}` : '选择附件' }}
              </DewButton>
              <DewButton type="glass" size="sm" :loading="submitting === m.id"
                         :disabled="!drafts[m.id].content.trim() && !drafts[m.id].files.length"
                         @click="submit(m)">
                {{ myLatest(m) ? '重提新版本' : '提交' }}
              </DewButton>
            </div>
          </div>
          <div v-else-if="m.status === 'approved'" class="submit-closed">已验收通过，节点关闭</div>
          <div v-else-if="m.submit_mode === 'team' && myRole === 'member'" class="submit-closed">整队交付由负责人统一提交</div>

          <!-- 交付模式切换（负责人；已有提交后不可切，防审核链混乱） -->
          <div v-if="canManage && editable && !m.submissions.length && m.status !== 'approved'" class="mode-switch">
            <DewButton type="ghost" size="sm" @click="toggleMode(m)">
              切换为{{ m.submit_mode === 'member' ? '整队交付（负责人交·老师审）' : '个人交付（成员各交·负责人审）' }}
            </DewButton>
          </div>

          <!-- ② 节点评价（leader=全员逐人；成员=仅本人） -->
          <div class="ms-sec-label eval-label">节点评价</div>
          <template v-if="canManage">
            <div v-if="!evalMembers.length" class="eval-empty">项目暂无其他成员可评价</div>
            <div v-for="t in evalMembers" :key="t.user_id" class="eval-row">
              <span class="eval-name">{{ t.username }}</span>
              <template v-if="evalOf(m, t.user_id)">
                <span class="eval-score">{{ evalOf(m, t.user_id).score }} 分</span>
                <span class="eval-comment" :title="evalOf(m, t.user_id).comment">
                  {{ evalOf(m, t.user_id).comment || '—' }}
                </span>
                <span class="eval-time">{{ evalOf(m, t.user_id).updated_at }}</span>
              </template>
              <span v-else class="eval-none">未评价</span>
              <DewButton type="ghost" size="sm" :disabled="!editable" @click="openEval(m, t)">
                {{ evalOf(m, t.user_id) ? '修改' : '评价' }}
              </DewButton>
            </div>
          </template>
          <template v-else>
            <div v-if="myEval(m)" class="eval-self">
              <span class="eval-score big">{{ myEval(m).score }} 分</span>
              <span v-if="myEval(m).comment" class="eval-comment">{{ myEval(m).comment }}</span>
              <span class="eval-time">{{ myEval(m).updated_at }}</span>
            </div>
            <div v-else class="eval-empty">待负责人评价</div>
          </template>
        </div>
      </div>

      <!-- 负责人：追加节点（含交付模式选择） -->
      <div v-if="canManage && editable" class="pm-add">
        <DewButton v-if="!adding" type="ghost" size="sm" @click="adding = true">＋ 追加交付节点</DewButton>
        <div v-else class="add-form">
          <div class="add-grid">
            <DewInput v-model="addForm.title" size="sm" placeholder="节点标题（如：中期检查）" />
            <DewSelect v-model="addForm.submit_mode" size="sm" :options="[
              { label: '整队交付（负责人交·老师审）', value: 'team' },
              { label: '个人交付（成员交·负责人审）', value: 'member' }]" />
            <DewInput v-model="addForm.due_date" size="sm" type="date" placeholder="截止日（选填）" />
          </div>
          <DewInput v-model="addForm.requirement" type="textarea" :rows="2" placeholder="交付要求（选填）" />
          <div class="add-actions">
            <DewButton type="ghost" size="sm" @click="adding = false">取消</DewButton>
            <DewButton type="glass" size="sm" :disabled="!addForm.title.trim()" :loading="addingSaving" @click="addMilestone">保存节点</DewButton>
          </div>
        </div>
      </div>

      <!-- 评价弹窗：分数 0-100 + 评语（已有评价预填，保存=upsert） -->
      <DewDialog v-model="evalDlg" :title="`节点评价 · ${evalTarget.memberName || ''} · ${evalTarget.nodeTitle || ''}`" width="420px">
        <div class="eval-form">
          <div class="field-label">评分（0-100 整数，必填）</div>
          <DewInput v-model="evalForm.score" type="number" size="lg" placeholder="0-100" />
          <div class="field-label">评语（选填，最多 500 字）</div>
          <DewInput v-model="evalForm.comment" type="textarea" :rows="3" placeholder="该成员在此节点的表现" />
          <div class="add-actions">
            <DewButton type="ghost" @click="evalDlg = false">取消</DewButton>
            <DewButton type="glass" :loading="evalSaving" @click="saveEval">保存评价</DewButton>
          </div>
        </div>
      </DewDialog>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { DewButton, DewInput, DewSelect, DewTag, DewDialog, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  unitId: { type: Number, required: true },
  campStatus: { type: String, required: true },
  editable: { type: Boolean, default: true },     // camp archived/unit terminated → false
  ownerUserId: { type: Number, default: null },   // 项目负责人（审核人判定：member 模式负责人份额由老师审）
});
const emit = defineEmits(['changed']);

const STATUS_TEXT = { open: '待提交', submitted: '待审核', returned: '已退回', approved: '已通过' };
const SUB_TEXT = { submitted: '待审核', returned: '已退回', approved: '已通过', superseded: '已被新版替代' };

const loading = ref(true);
const milestones = ref([]);
const evalMembers = ref([]);   // 应评花名册（leader 渲染用）
const myRole = ref('member');
const expanded = ref(new Set());
const drafts = ref({});
const submitting = ref(null);
const adding = ref(false);
const addingSaving = ref(false);
const addForm = ref({ title: '', requirement: '', due_date: '', submit_mode: 'team' });

const canManage = ref(false);   // leader/admin（由接口 my_role 回填）

// ── 评价弹窗 ──
const evalDlg = ref(false);
const evalSaving = ref(false);
const evalTarget = ref({ mid: null, memberUid: null, memberName: '', nodeTitle: '' });
const evalForm = ref({ score: '', comment: '' });

function toggleExpand(id) {
  const s = new Set(expanded.value);
  s.has(id) ? s.delete(id) : s.add(id);
  expanded.value = s;
  if (s.has(id) && !drafts.value[id]) {
    drafts.value[id] = { content: '', files: [] };
  }
}

function canSubmit(m) {
  if (m.status === 'approved' || !props.editable) return false;
  if (m.submit_mode === 'team') return myRole.value === 'leader';
  return myRole.value === 'leader' || myRole.value === 'member';   // member 模式全员（含负责人）各交
}
function canReview(m, s) {
  if (!props.editable) return false;
  // member 模式：负责人审成员材料；负责人份额（submitted_by==owner）由老师（admin）在管理端审
  return m.submit_mode === 'member' && myRole.value === 'leader'
    && s.submitted_by !== props.ownerUserId;
}
function myLatest(m) {
  return (m.submissions || []).some((s) => s.status === 'submitted' || s.status === 'returned');
}

function evalOf(m, uid) {
  return (m.evaluations || []).find((e) => e.member_user_id === uid) || null;
}
function myEval(m) {
  return (m.evaluations || [])[0] || null;   // 成员视角后端只回本人行
}

async function load() {
  loading.value = true;
  adding.value = false;
  try {
    const d = await campService.fetchMilestones(props.unitId);
    milestones.value = d.milestones || [];
    evalMembers.value = d.eval_members || [];
    myRole.value = d.my_role || 'member';
    canManage.value = myRole.value === 'leader';
    // 默认全展开（09-14 用户定）；drafts 就位防模板空引用
    milestones.value.forEach((m) => {
      if (!drafts.value[m.id]) drafts.value[m.id] = { content: '', files: [] };
    });
    expanded.value = new Set(milestones.value.map((m) => m.id));
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载交付节点失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
// 看板切换项目（unitId 变化）须重载——多项目时 DewSelect 切换不重挂载组件
watch(() => props.unitId, load);

// ── 交付材料：提交（multipart）──
function onFiles(mid, e) {
  drafts.value[mid].files = [...e.target.files];
  e.target.value = '';
}
// 隐藏原生 file input，由 DewButton 触发选择
const fileEls = {};
function pickFiles(mid) { fileEls[mid]?.click(); }
async function submit(m) {
  const d = drafts.value[m.id];
  if (submitting.value || (!d.content.trim() && !d.files.length)) return;
  submitting.value = m.id;
  try {
    const r = await campService.submitMilestone(m.id, d.content.trim(), d.files);
    ElMessage.success(r.message || '已提交');
    d.content = '';
    d.files = [];
    await load();
    emit('changed');
    expanded.value = new Set([...expanded.value, m.id]);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally {
    submitting.value = null;
  }
}

// ── 交付材料：审核（approve / return）──
async function review(s, action) {
  try {
    let body = { action };
    if (action === 'return') {
      const { value } = await ElMessageBox.prompt('退回说明（提交人重提时可见）：', '退回材料', {
        confirmButtonText: '退回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '说明必填',
      });
      body.note = value.trim();
    }
    const r = await campService.reviewSubmission(s.id, body);
    ElMessage.success(r.message || '已处理');
    await load();
    emit('changed');
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

// ── 交付模式切换（无提交时；后端 milestone_update 兜底 400）──
async function toggleMode(m) {
  const next = m.submit_mode === 'member' ? 'team' : 'member';
  try {
    await campService.updateMilestone(m.id, { submit_mode: next });
    ElMessage.success(next === 'member' ? '已切换为个人交付（成员各交·负责人审）' : '已切换为整队交付（负责人交·老师审）');
    await load();
    emit('changed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '切换失败');
  }
}

// ── 节点评价 ──
function openEval(m, target) {
  const prev = evalOf(m, target.user_id);
  evalTarget.value = { mid: m.id, memberUid: target.user_id,
                       memberName: target.username, nodeTitle: m.title };
  evalForm.value = { score: prev ? String(prev.score) : '', comment: prev?.comment || '' };
  evalDlg.value = true;
}
async function saveEval() {
  const raw = String(evalForm.value.score).trim();
  if (!/^\d+$/.test(raw)) { ElMessage.warning('评分须为 0-100 的整数'); return; }
  const score = Number(raw);
  if (score < 0 || score > 100) { ElMessage.warning('评分须为 0-100 的整数'); return; }
  if (evalSaving.value) return;
  evalSaving.value = true;
  try {
    const r = await campService.evaluateMilestoneNode(
      evalTarget.value.mid, evalTarget.value.memberUid,
      { score, comment: evalForm.value.comment.trim() || null });
    ElMessage.success(r.message || '评价已保存');
    evalDlg.value = false;
    await load();
    expanded.value = new Set([...expanded.value, evalTarget.value.mid]);
    emit('changed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    evalSaving.value = false;
  }
}

async function addMilestone() {
  if (addingSaving.value || !addForm.value.title.trim()) return;
  addingSaving.value = true;
  try {
    await campService.addMilestone(props.unitId, {
      ...addForm.value,
      due_date: addForm.value.due_date || null,
    });
    ElMessage.success('节点已添加');
    adding.value = false;
    addForm.value = { title: '', requirement: '', due_date: '', submit_mode: 'team' };
    await load();
    emit('changed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '添加失败');
  } finally {
    addingSaving.value = false;
  }
}
</script>

<style scoped>
.pm-wrap { display: flex; flex-direction: column; gap: 8px; }
.pm-loading, .pm-empty { padding: 6px 0; }
.pm-empty { font-size: 12.5px; color: var(--dew-text-faint); }

.ms-row { border: 1px solid var(--dew-card-border); border-radius: 10px; overflow: hidden; }
.ms-row.ms-approved, .ms-row.ms-done { border-color: color-mix(in srgb, var(--color-success) 35%, transparent); }
.ms-head {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; border: none; background: transparent; cursor: pointer;
  font-size: 13.5px; text-align: left;
}
.ms-head:hover { background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent); }
.ms-order {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border);
}
.ms-approved .ms-order, .ms-done .ms-order { color: var(--color-success); border-color: color-mix(in srgb, var(--color-success) 40%, transparent); }
.ms-title { font-weight: 650; color: var(--dew-text-heading); }
.ms-due { font-size: 12px; color: var(--dew-text-faint); }
.ms-status { font-size: 12px; font-weight: 600; margin-left: auto; color: var(--dew-text-muted);
  display: inline-flex; align-items: center; gap: 8px; }
.st-open { color: var(--dew-text-faint); }
.st-submitted { color: var(--color-warning); }
.st-returned { color: var(--color-danger, #e5484d); }
.st-approved { color: var(--color-success); }
.st-done { color: var(--color-success); }
.ms-caret { font-size: 12px; color: var(--dew-text-faint); transition: transform 0.2s ease; }
.ms-caret.open { transform: rotate(180deg); }

.ms-body { padding: 0 12px 12px 44px; display: flex; flex-direction: column; gap: 10px; }
.ms-req { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0; }
.req-label { color: var(--dew-text-faint); }
.ms-sec-label { font-size: 12px; font-weight: 650; color: var(--dew-text-faint); letter-spacing: 0.5px; }
.eval-label { margin-top: 4px; padding-top: 10px; border-top: 1px dashed var(--dew-card-border); }

/* 版本链（交付材料） */
.chain { display: flex; flex-direction: column; gap: 6px; }
.chain-item {
  border: 1px solid var(--dew-card-border); border-radius: 8px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.chain-item.cs-approved { border-color: color-mix(in srgb, var(--color-success) 30%, transparent); }
.chain-item.cs-returned { border-color: color-mix(in srgb, var(--color-danger, #e5484d) 30%, transparent); }
.chain-item.cs-superseded { opacity: 0.55; }
.chain-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chain-ver { font-size: 12px; font-weight: 700; color: var(--dew-text-heading); }
.chain-by { font-size: 12px; color: var(--dew-text-muted); }
.chain-status { font-size: 12px; font-weight: 600; }
.chain-status.cs-submitted { color: var(--color-warning); }
.chain-status.cs-returned { color: var(--color-danger, #e5484d); }
.chain-status.cs-approved { color: var(--color-success); }
.chain-time { font-size: 11.5px; color: var(--dew-text-faint); }
.chain-content { font-size: 12.5px; color: var(--dew-text-muted); margin: 0; line-height: 1.6; }
.chain-note { font-size: 12px; color: var(--color-warning); margin: 0; }
.chain-atts { display: flex; flex-wrap: wrap; gap: 8px; }
.att-link { font-size: 12px; color: var(--color-primary); text-decoration: none; }
.att-link:hover { text-decoration: underline; }
.chain-empty { font-size: 12px; color: var(--dew-text-faint); }

/* 提交盒 */
.submit-box { display: flex; flex-direction: column; gap: 8px; }
.submit-row { display: flex; align-items: center; gap: 10px; }
.file-input-hidden { display: none; }
.submit-closed { font-size: 12px; color: var(--dew-text-faint); }
.mode-switch { display: flex; }

/* 评价行（leader 逐成员） */
.eval-row {
  display: flex; align-items: center; gap: 10px; padding: 7px 0;
  border-bottom: 1px dashed var(--dew-card-border); font-size: 12.5px;
}
.eval-row:last-child { border-bottom: none; }
.eval-name { flex-shrink: 0; min-width: 64px; font-weight: 600; color: var(--dew-text-heading); }
.eval-score { flex-shrink: 0; font-weight: 700; color: var(--color-primary); }
.eval-score.big { font-size: 16px; }
.eval-comment {
  flex: 1; color: var(--dew-text-muted); line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.eval-time { flex-shrink: 0; font-size: 11.5px; color: var(--dew-text-faint); }
.eval-none { flex: 1; color: var(--dew-text-faint); }
.eval-empty { font-size: 12px; color: var(--dew-text-faint); }

/* 成员自见 */
.eval-self {
  display: flex; align-items: baseline; gap: 12px; padding: 8px 0;
}

.pm-add { margin-top: 2px; }
.add-form { display: flex; flex-direction: column; gap: 8px; }
.add-grid { display: grid; grid-template-columns: 1.4fr 1.6fr 0.8fr; gap: 8px; }
.add-actions { display: flex; justify-content: flex-end; gap: 8px; }
.eval-form { display: flex; flex-direction: column; gap: 10px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }

@media (max-width: 760px) { .add-grid { grid-template-columns: 1fr; } .ms-body { padding-left: 12px; } }
</style>
