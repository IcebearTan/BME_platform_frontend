<template>
  <!-- 项目交付节点区（09-14 成员提交制，用户复盘定）：节点时间轴，展开区两块——
       ① 交付材料：只有成员交付（负责人不提交——他看材料+直接评价，无通过/退回审核）；
          提交即全员可见，重提=新版本；节点头带提交状态（负责人=已交 x/y，成员=已提交/未提交）；
       ② 节点评价：负责人对每位成员打分 0-100 + 评语（成员仅见本人），评齐即完。
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
          <span v-if="m.due_date" class="ms-due">{{ m.due_date }}</span>
          <span class="ms-status">
            <span v-if="canManage">已交 {{ submittedCount(m) }}/{{ m.member_count }} · 已评 {{ m.evaluated_count }}/{{ m.member_count }}</span>
            <span v-else>
              <span :class="{ 'st-submitted': hasMySubmission(m) }">{{ hasMySubmission(m) ? '已提交' : '未提交' }}</span>
               · {{ myEval(m) ? `我的评价 ${myEval(m).score} 分` : '待评价' }}
            </span>
            <span v-if="m.node_complete" class="st-done">已完成</span>
          </span>
          <el-icon class="ms-caret" :class="{ open: expanded.has(m.id) }"><ArrowDown /></el-icon>
        </button>

        <!-- 展开区：要求 + ① 交付材料 + ② 节点评价 -->
        <div v-if="expanded.has(m.id)" class="ms-body">
          <p v-if="m.requirement" class="ms-req"><span class="req-label">交付要求：</span>{{ m.requirement }}</p>
          <p v-if="m.description" class="ms-req"><span class="req-label">说明：</span>{{ m.description }}</p>

          <!-- 交付与评价合框（09-14 用户定：评价就在交付行上，别拆两处）——
               负责人视角按成员分组：左=该成员版本链（没交=未提交），右=评价（无分=「评价」按钮，有分=分数+评语+修改）；
               成员视角：自己的版本链+提交盒，下接本人评价自见 -->
          <div class="ms-sec-label">{{ canManage ? '成员交付与评价' : '我的交付' }}</div>

          <template v-if="canManage">
            <div v-if="!evalMembers.length" class="eval-empty">项目暂无其他成员可交付/评价</div>
            <div v-for="g in memberGroups(m)" :key="g.member.user_id" class="mem-row">
              <div class="mem-deliver">
                <div class="mem-name">
                  {{ g.member.username }}
                  <span v-if="!g.subs.length" class="mem-nosub">未提交</span>
                </div>
                <div v-for="s in g.subs" :key="s.id" :class="['chain-item', `cs-${s.status}`]">
                  <div class="chain-line">
                    <span class="chain-ver">v{{ s.version }}</span>
                    <span v-if="s.status === 'submitted'" class="chain-st submitted">已提交</span>
                    <span v-else-if="s.status === 'superseded'" class="chain-st superseded">已被新版替代</span>
                    <span class="chain-time">{{ (s.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
                  </div>
                  <p v-if="s.content" class="chain-content">{{ s.content }}</p>
                  <div v-if="s.attachments?.length" class="chain-atts">
                    <button v-for="a in s.attachments" :key="a.id" type="button"
                            class="att-link" @click="downloadAtt(a)">{{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}</button>
                  </div>
                </div>
              </div>
              <div class="mem-eval">
                <template v-if="g.eval">
                  <div class="eval-main">
                    <span class="eval-score">{{ g.eval.score }} 分</span>
                    <DewButton type="ghost" size="sm" :disabled="!editable" @click="openEval(m, g.member, g.eval)">修改</DewButton>
                  </div>
                  <div class="eval-sub" :title="g.eval.comment">
                    {{ g.eval.updated_at }}<template v-if="g.eval.comment"> · {{ g.eval.comment }}</template>
                  </div>
                </template>
                <DewButton v-else type="glass" size="sm" :disabled="!editable" @click="openEval(m, g.member)">评价</DewButton>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-for="s in m.submissions" :key="s.id" :class="['chain-item', `cs-${s.status}`]">
              <div class="chain-line">
                <span class="chain-ver">v{{ s.version }}</span>
                <span v-if="s.status === 'submitted'" class="chain-st submitted">已提交</span>
                <span v-else-if="s.status === 'superseded'" class="chain-st superseded">已被新版替代</span>
                <span class="chain-time">{{ (s.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
              </div>
              <p v-if="s.content" class="chain-content">{{ s.content }}</p>
              <div v-if="s.attachments?.length" class="chain-atts">
                <button v-for="a in s.attachments" :key="a.id" type="button"
                        class="att-link" @click="downloadAtt(a)">{{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}</button>
              </div>
            </div>
            <div v-if="!m.submissions.length" class="chain-empty">尚无提交</div>

            <!-- 提交区（仅成员——负责人不交付，他看材料+评价；approved/归档关闭） -->
            <div v-if="canSubmit(m)" class="submit-box">
              <DewInput v-model="drafts[m.id].content" type="textarea" :rows="2"
                        placeholder="我的交付说明（做了什么/材料清单）" />
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

            <!-- 本人评价自见（与我的交付同框） -->
            <div class="eval-self">
              <template v-if="myEval(m)">
                <span class="eval-score big">{{ myEval(m).score }} 分</span>
                <span v-if="myEval(m).comment" class="eval-comment">{{ myEval(m).comment }}</span>
                <span class="eval-time">{{ myEval(m).updated_at }}</span>
              </template>
              <span v-else class="eval-empty">待负责人评价</span>
            </div>
          </template>
        </div>
      </div>

      <!-- 负责人：追加节点 -->
      <div v-if="canManage && editable" class="pm-add">
        <DewButton v-if="!adding" type="ghost" size="sm" @click="adding = true">＋ 追加交付节点</DewButton>
        <div v-else class="add-form">
          <div class="add-grid">
            <DewInput v-model="addForm.title" size="sm" placeholder="节点标题（如：中期检查）" />
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
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { DewButton, DewInput, DewDialog, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  unitId: { type: Number, required: true },
  campStatus: { type: String, required: true },
  editable: { type: Boolean, default: true },     // camp archived/unit terminated → false
  ownerUserId: { type: Number, default: null },   // 兼容 ProjectBoard 传参（成员提交制后暂未使用）
});
const emit = defineEmits(['changed']);

const loading = ref(true);
const milestones = ref([]);
const evalMembers = ref([]);   // 应评花名册（leader 渲染用）
const myRole = ref('member');
const expanded = ref(new Set());
const drafts = ref({});
const submitting = ref(null);
const adding = ref(false);
const addingSaving = ref(false);
const addForm = ref({ title: '', requirement: '', due_date: '' });

const canManage = ref(false);   // leader/admin（由接口 my_role 回填）

// ── 评价弹窗 ──
const evalDlg = ref(false);
const evalSaving = ref(false);
const evalTarget = ref({ mid: null, memberUid: null, memberName: '', nodeTitle: '' });
const evalForm = ref({ score: '', comment: '' });

// 附件下载：先换短签直连再开新窗（裸链带不了 Authorization 头，2026-09-17 修旧链 401）
async function downloadAtt(a) {
  try {
    const url = await campService.fetchSubmissionAttachmentUrl(a.id);
    window.open(url, '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败');
  }
}

function toggleExpand(id) {
  const s = new Set(expanded.value);
  s.has(id) ? s.delete(id) : s.add(id);
  expanded.value = s;
  if (s.has(id) && !drafts.value[id]) {
    drafts.value[id] = { content: '', files: [] };
  }
}

// 成员提交制（09-14 用户复盘定）：只有成员交付；负责人不提交（看材料+评价）
function canSubmit(m) {
  return myRole.value === 'member' && m.status !== 'approved' && props.editable;
}
// 现行版本（非 superseded）才算「已提交」；负责人视角按提交人去重计数
function hasMySubmission(m) {
  return (m.submissions || []).some((s) => s.status !== 'superseded');
}
function submittedCount(m) {
  return new Set((m.submissions || []).filter((s) => s.status !== 'superseded')
    .map((s) => s.submitted_by)).size;
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
// 负责人视角按成员分组（09-14 合框）：左=该成员版本链，右=评价；没交的成员也占一行（未提交）
function memberGroups(m) {
  return evalMembers.value.map((t) => ({
    member: t,
    subs: (m.submissions || []).filter((s) => s.submitted_by === t.user_id),
    eval: evalOf(m, t.user_id),
  }));
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

// ── 节点评价 ──
function openEval(m, member, prev = null) {
  evalTarget.value = { mid: m.id, memberUid: member.user_id,
                       memberName: member.username, nodeTitle: m.title };
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
    addForm.value = { title: '', requirement: '', due_date: '' };
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
.st-submitted { color: var(--color-success); }
.st-done { color: var(--color-success); }
.ms-caret { font-size: 12px; color: var(--dew-text-faint); transition: transform 0.2s ease; }
.ms-caret.open { transform: rotate(180deg); }

.ms-body { padding: 0 12px 12px 44px; display: flex; flex-direction: column; gap: 10px; }
.ms-req { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0; }
.req-label { color: var(--dew-text-faint); }
.ms-sec-label { font-size: 12px; font-weight: 650; color: var(--dew-text-faint); letter-spacing: 0.5px; }

/* 成员交付与评价合框行（负责人视角）：左=交付，右=评价（整行垂直居中，09-14 用户定） */
.mem-row {
  display: flex; align-items: center; gap: 14px; padding: 8px 0;
  border-bottom: 1px dashed var(--dew-card-border);
}
.mem-row:last-child { border-bottom: none; }
.mem-deliver { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.mem-name { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }
.mem-nosub { font-size: 11.5px; font-weight: 400; color: var(--dew-text-faint); margin-left: 6px; }
.mem-eval {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: stretch;
  gap: 2px; max-width: 45%; min-width: 118px;
}
/* 上行：分数左 · 修改右（两端撑开）；下行：时间·评语与分数左对齐——上下两行左边缘齐，
   不会因右对齐而视觉歪斜（09-14 用户反馈） */
.eval-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.eval-sub {
  max-width: 100%; font-size: 11.5px; color: var(--dew-text-faint);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 版本链（交付材料）：轻分隔线排版，不套卡片框——状态由 chip 表达（09-14 用户定：
   别搞长长的状态色边框盒子） */
.chain { display: flex; flex-direction: column; gap: 2px; }
.chain-item {
  display: flex; flex-direction: column; gap: 4px; padding: 4px 0;
}
.chain-item + .chain-item { border-top: 1px dashed var(--dew-card-border); }
.chain-item.cs-superseded { opacity: 0.55; }
.chain-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chain-ver { font-size: 12px; font-weight: 700; color: var(--dew-text-heading); }
.chain-by { font-size: 12px; color: var(--dew-text-muted); }
.chain-st { font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 1px 8px; }
.chain-st.submitted {
  color: var(--color-success);
  border: 1px solid color-mix(in srgb, var(--color-success) 40%, transparent);
}
.chain-st.superseded { color: var(--dew-text-faint); border: 1px solid var(--dew-card-border); }
.chain-time { font-size: 11.5px; color: var(--dew-text-faint); }
.chain-content { font-size: 12.5px; color: var(--dew-text-muted); margin: 0; line-height: 1.6; }
.chain-note { font-size: 12px; color: var(--color-warning); margin: 0; }
.chain-atts { display: flex; flex-wrap: wrap; gap: 8px; }
.att-link {
  font-size: 12px; color: var(--color-primary); text-decoration: none;
  border: none; background: none; padding: 0; cursor: pointer; text-align: left;
}
.att-link:hover { text-decoration: underline; }
.chain-empty { font-size: 12px; color: var(--dew-text-faint); }

/* 提交盒 */
.submit-box { display: flex; flex-direction: column; gap: 8px; }
.submit-row { display: flex; align-items: center; gap: 10px; }
.file-input-hidden { display: none; }
.submit-closed { font-size: 12px; color: var(--dew-text-faint); }
.mode-switch { display: flex; }

/* 评价通用（分数/评语/时间） */
.eval-score { flex-shrink: 0; font-weight: 700; color: var(--color-primary); }
.eval-score.big { font-size: 16px; }
.eval-time { flex-shrink: 0; font-size: 11.5px; color: var(--dew-text-faint); }
.eval-empty { font-size: 12px; color: var(--dew-text-faint); }

/* 成员自见（与我的交付同框） */
.eval-self {
  display: flex; align-items: baseline; gap: 12px; padding: 8px 0 0;
  border-top: 1px dashed var(--dew-card-border);
}

.pm-add { margin-top: 2px; }
.add-form { display: flex; flex-direction: column; gap: 8px; }
.add-grid { display: grid; grid-template-columns: 1.6fr 0.9fr; gap: 8px; }
.add-actions { display: flex; justify-content: flex-end; gap: 8px; }
.eval-form { display: flex; flex-direction: column; gap: 10px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }

@media (max-width: 760px) { .add-grid { grid-template-columns: 1fr; } .ms-body { padding-left: 12px; } }
</style>
