<template>
  <!-- 项目交付节点区（09-13 评价制）：节点时间轴 + 负责人对每位成员的节点评价
       （分数 0-100 + 评语，成员仅见本人）；评齐即完（读时派生）。
       文件提交/审核链入口本轮下线（后端保留），后续上线文件提交管理时恢复。 -->
  <div class="pm-wrap">
    <div v-if="loading" class="pm-loading"><DewSkeleton variant="rect" width="100%" height="140" rounded="8px" /></div>
    <template v-else>
      <div v-if="!milestones.length" class="pm-empty">
        {{ canManage ? '还没有交付节点——先建项目模板（施工图）自动生成，或在下方手动添加' : '负责人尚未配置交付节点' }}
      </div>

      <!-- 节点列表 -->
      <div v-for="m in milestones" :key="m.id" :class="['ms-row', { 'ms-done': m.node_complete }]">
        <button type="button" class="ms-head" @click="toggleExpand(m.id)">
          <span class="ms-order">{{ m.order_no }}</span>
          <span class="ms-title">{{ m.title }}</span>
          <span v-if="m.due_date" class="ms-due">{{ m.due_date }}</span>
          <span class="ms-status">
            <span v-if="canManage">已评 {{ m.evaluated_count }}/{{ m.member_count }}</span>
            <span v-else>{{ myEval(m) ? `我的评价 ${myEval(m).score} 分` : '待评价' }}</span>
            <span v-if="m.node_complete" class="st-done">已完成</span>
          </span>
          <el-icon class="ms-caret" :class="{ open: expanded.has(m.id) }"><ArrowDown /></el-icon>
        </button>

        <!-- 展开区：要求 + 评价（leader=全员逐人；成员=仅本人） -->
        <div v-if="expanded.has(m.id)" class="ms-body">
          <p v-if="m.requirement" class="ms-req"><span class="req-label">交付要求：</span>{{ m.requirement }}</p>
          <p v-if="m.description" class="ms-req"><span class="req-label">说明：</span>{{ m.description }}</p>

          <!-- 负责人视角：逐成员评价 -->
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

          <!-- 成员视角：仅本人评价 -->
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

      <!-- 负责人：追加节点（评价制下无交付模式之分，submit_mode 后端默认 team） -->
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
  ownerUserId: { type: Number, default: null },   // 项目负责人（保留给后续文件提交管理）
});
const emit = defineEmits(['changed']);

const loading = ref(true);
const milestones = ref([]);
const evalMembers = ref([]);   // 应评花名册（leader 渲染用）
const myRole = ref('member');
const expanded = ref(new Set());
const adding = ref(false);
const addingSaving = ref(false);
const addForm = ref({ title: '', requirement: '', due_date: '' });

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
}

function evalOf(m, uid) {
  return (m.evaluations || []).find((e) => e.member_user_id === uid) || null;
}
function myEval(m) {
  return (m.evaluations || [])[0] || null;   // 成员视角后端只回本人行
}

async function load() {
  loading.value = true;
  expanded.value = new Set();      // 切换项目时收起展开态/追加面板，防跨项目残留
  adding.value = false;
  try {
    const d = await campService.fetchMilestones(props.unitId);
    milestones.value = d.milestones || [];
    evalMembers.value = d.eval_members || [];
    myRole.value = d.my_role || 'member';
    canManage.value = myRole.value === 'leader';
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载交付节点失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
// 看板切换项目（unitId 变化）须重载——多项目时 DewSelect 切换不重挂载组件
watch(() => props.unitId, load);

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
.ms-row.ms-done { border-color: color-mix(in srgb, var(--color-success) 35%, transparent); }
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
.ms-done .ms-order { color: var(--color-success); border-color: color-mix(in srgb, var(--color-success) 40%, transparent); }
.ms-title { font-weight: 650; color: var(--dew-text-heading); }
.ms-due { font-size: 12px; color: var(--dew-text-faint); }
.ms-status { font-size: 12px; font-weight: 600; margin-left: auto; color: var(--dew-text-muted);
  display: inline-flex; align-items: center; gap: 8px; }
.st-done { color: var(--color-success); }
.ms-caret { font-size: 12px; color: var(--dew-text-faint); transition: transform 0.2s ease; }
.ms-caret.open { transform: rotate(180deg); }

.ms-body { padding: 0 12px 12px 44px; display: flex; flex-direction: column; gap: 10px; }
.ms-req { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0; }
.req-label { color: var(--dew-text-faint); }

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
