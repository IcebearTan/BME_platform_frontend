<template>
  <div class="project-dashboard">
    <div class="board-heading">
      <div><h2>项目总览</h2><p class="board-note">查看全营项目进展，点击项目或节点查看材料与评价。</p></div>
      <div class="board-actions">
        <DewButton size="sm" :disabled="!board || loading" @click="exportCsv">导出当前名单与进度</DewButton>
        <DewButton size="sm" :loading="loading" @click="load">刷新</DewButton>
      </div>
    </div>
    <DewCard v-if="loading" no-hover><DewSkeleton variant="rect" width="100%" :height="180" /></DewCard>
    <DewCard v-else-if="error" no-hover><div role="alert" class="error-state">{{ error }}</div><DewButton size="sm" @click="load">重试</DewButton></DewCard>
    <template v-else-if="board">
      <el-alert v-if="board.archived" type="info" :closable="false" :title="`结营复盘 · 冻结于 ${formatTime(board.frozen_at)}`" description="展示结营时冻结的进度，暂停实时待办和逾期提醒。" />
      <div class="summary-grid" aria-label="全营统计">
        <DewCard no-hover size="md"><div class="stat-label">全营项目 / 成员</div><div class="stat-number">{{ summary.project_count }} / {{ summary.participant_count }}</div><div class="board-note">{{ summary.completed_projects }} 个项目全部节点完成</div></DewCard>
        <DewCard no-hover size="md"><div class="stat-label">节点完成率</div><div class="stat-number">{{ percent(summary.completion_rate) }}</div><div class="board-note">{{ summary.completed_nodes }} / {{ summary.total_nodes }} 个节点 · {{ summary.unconfigured_projects }} 项目未配置</div></DewCard>
        <DewCard no-hover size="md"><div class="stat-label">逾期项目</div><div class="stat-number" :class="{ danger: summary.overdue_projects }">{{ summary.overdue_projects }}</div><div class="board-note">{{ summary.overdue_nodes }} 个未完成节点超过截止日</div></DewCard>
        <DewCard no-hover size="md"><div class="stat-label">待验收 / 待评价</div><div class="stat-number">{{ summary.pending_reviews }} / {{ summary.pending_evaluations }}</div><div class="board-note">管理员验收材料 / 负责人评价成员</div></DewCard>
        <DewCard no-hover size="md"><div class="stat-label">已核验 / 待核验成果</div><div class="stat-number">{{ summary.verified_outcomes }} / {{ summary.pending_outcomes }}</div><div class="board-note">全营汇总，统计不随筛选改变</div></DewCard>
      </div>
      <div class="board-toolbar">
        <DewInput v-model="keyword" size="sm" clearable placeholder="搜索项目、负责人或成员" aria-label="搜索项目、负责人或成员" class="keyword-input" />
        <DewSelect v-model="risk" size="sm" :options="riskOptions" class="board-filter" aria-label="进度筛选" />
        <DewSelect v-model="status" size="sm" :options="statusOptions" class="board-filter" aria-label="项目状态筛选" />
        <span class="board-note">当前 {{ filtered.length }} 个项目</span>
      </div>
      <p class="board-note">已完成以节点验收或应评成员全部评齐为准；截止日当天不算逾期。无此节点显示“—”，未配置节点不计入完成率。</p>
      <DewCard no-hover class="matrix-card">
        <el-table :data="pageRows" row-key="key" max-height="620" class="progress-matrix" :empty-text="board.projects.length ? '没有符合筛选条件的项目' : '本营暂无项目'">
          <el-table-column label="项目" min-width="210" fixed="left"><template #default="{ row }"><button class="project-link" @click="openProject(row)">{{ row.name }}</button></template></el-table-column>
          <el-table-column label="负责人 / 人数" width="140"><template #default="{ row }">{{ row.leader_name }}<div class="board-note">{{ row.member_count }} 人 · {{ statusText[row.status] || row.status }}</div></template></el-table-column>
          <el-table-column label="完成情况" width="135"><template #default="{ row }"><template v-if="row.configured"><DewProgress :percentage="row.completion_rate" size="sm" /><div class="board-note">{{ row.completed_nodes }} / {{ row.node_count }} 节点</div></template><span v-else class="board-note">未配置节点</span></template></el-table-column>
          <el-table-column label="当前节点" min-width="150" prop="current_node" />
          <el-table-column label="下一截止" width="120"><template #default="{ row }"><span :class="{ danger: row.overdue_nodes }">{{ row.next_due_date || '—' }}</span></template></el-table-column>
          <el-table-column label="需关注" min-width="175"><template #default="{ row }"><div class="risk-tags"><el-tag v-for="item in row.risks" :key="item" :type="item === 'overdue' || item === 'leader_missing' ? 'danger' : 'warning'" size="small" effect="plain">{{ riskText[item] }}</el-tag><span v-if="!row.risks.length" class="board-note">—</span></div></template></el-table-column>
          <el-table-column v-for="column in board.columns" :key="column.key" :label="column.title" width="125" align="center"><template #default="{ row }"><template v-if="nodeAt(row, column.key)"><el-tooltip :content="nodeHint(nodeAt(row, column.key))" placement="top"><button class="node-cell" :class="{ danger: nodeAt(row, column.key).overdue, completed: nodeAt(row, column.key).node_complete }" @click="openProject(row, nodeAt(row, column.key).id)">{{ nodeText(nodeAt(row, column.key)) }}<small v-if="nodeAt(row, column.key).overdue">逾期</small></button></el-tooltip></template><span v-else class="board-note" title="本项目无此节点">—</span></template></el-table-column>
          <el-table-column label="成果" width="100"><template #default="{ row }">{{ row.verified_outcomes }} 已核验<div class="board-note">{{ row.pending_outcomes }} 待核验</div></template></el-table-column>
          <el-table-column label="最近更新" width="155"><template #default="{ row }">{{ formatTime(row.last_activity_at) }}</template></el-table-column>
        </el-table>
        <div v-if="filtered.length > pageSize" class="board-pagination"><el-pagination v-model:current-page="page" :page-size="pageSize" :total="filtered.length" layout="prev, pager, next" /></div>
      </DewCard>
      <p class="board-note">数据截至 {{ formatTime(board.as_of) }}。多人参与多个项目时，成员人数按营期去重，项目人数按各项目统计。</p>
    </template>
    <el-drawer v-model="drawerOpen" :title="selectedName" size="min(760px, 100vw)" class="project-detail-drawer" append-to-body destroy-on-close @closed="closeDetail">
      <DewSkeleton v-if="detailLoading" variant="rect" width="100%" :height="220" />
      <div v-else-if="detailError" role="alert"><p class="danger">{{ detailError }}</p><DewButton size="sm" @click="fetchDetail">重试</DewButton></div>
      <template v-else-if="detail">
        <p class="board-note">负责人 {{ detail.leader_name }} · {{ detail.member_count }} 人 · {{ statusText[detail.status] || detail.status }} · 完成 {{ percent(detail.completion_rate) }}</p>
        <div class="member-tags"><el-tag v-for="(member, i) in detail.members" :key="member.user_id || i" size="small" effect="plain">{{ member.name }}{{ member.role === 'leader' ? '（负责人）' : '' }}</el-tag></div>
        <el-empty v-if="!detail.nodes.length" description="尚未配置交付节点，请由项目负责人建立节点计划。" />
        <el-collapse v-else v-model="expandedNodes">
          <el-collapse-item v-for="(node, index) in detail.nodes" :key="node.stage_key" :name="node.stage_key">
            <template #title><span class="detail-node-title">{{ index + 1 }}. {{ node.title }}<el-tag size="small" :type="node.node_complete ? 'success' : node.overdue ? 'danger' : 'info'">{{ nodeText(node) }}{{ node.overdue ? ' · 逾期' : '' }}</el-tag></span></template>
            <p class="board-note">截止 {{ node.due_date || '未设置' }} · {{ node.completion_mode === 'leader_review' ? '负责人交付，管理员验收' : node.completion_mode === 'member_evaluation' ? '成员交付，负责人评价' : '历史档案记录' }}</p>
            <p v-if="node.required_count != null" class="board-note">已提交 {{ node.submitted_count }} / {{ node.required_count }} 人<span v-if="node.completion_mode === 'member_evaluation'"> · 已评价 {{ node.evaluated_count }} / {{ node.required_count }} 人</span></p>
            <p v-if="node.requirement" class="material-text">要求：{{ node.requirement }}</p>
            <p v-if="node.description" class="material-text">{{ node.description }}</p>
            <div v-for="submission in node.submissions || []" :key="submission.id" class="material-card">
              <strong>{{ submission.name }} · v{{ submission.version }} · {{ submissionText[submission.status] || submission.status }}</strong>
              <p class="board-note">{{ formatTime(submission.created_at) }}</p><p v-if="submission.content" class="material-text">{{ submission.content }}</p>
              <div class="attachment-list"><el-button v-for="attachment in submission.attachments" :key="attachment.id" link type="primary" @click="download(attachment)">{{ attachment.filename }}</el-button></div>
              <p v-if="submission.review_note" class="material-text">审核说明：{{ submission.review_note }}</p>
            </div>
            <div v-if="node.evaluations?.length" class="evaluation-list"><p v-for="(evaluation, i) in node.evaluations" :key="i">{{ evaluation.name || `成员 ${evaluation.member_user_id}` }} · {{ evaluation.score }} 分<span v-if="evaluation.comment"> · {{ evaluation.comment }}</span></p></div>
            <p v-if="node.final_versions?.length" class="board-note">已冻结最终材料 {{ node.final_versions.length }} 份</p>
            <p v-if="!node.submissions?.length && !node.evaluations?.length && !node.final_versions?.length" class="board-note">暂无提交或评价记录</p>
          </el-collapse-item>
        </el-collapse>
        <h3 class="outcome-heading">项目成果</h3>
        <p v-if="!detail.outcomes?.length" class="board-note">暂无登记成果</p>
        <div v-for="(outcome, i) in detail.outcomes || []" :key="i" class="material-card"><strong>{{ outcome.title }} · {{ outcomeText[outcome.status] || outcome.status }}</strong><p class="material-text">{{ outcome.description }}</p></div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewSelect, DewProgress, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true }, workspace: Boolean });
const emit = defineEmits(['open-project']);
const board = ref(null), loading = ref(false), error = ref('');
const keyword = ref(''), risk = ref('all'), status = ref('all'), page = ref(1), pageSize = 20;
const drawerOpen = ref(false), selectedName = ref(''), selectedKey = ref(null), selectedNode = ref(null);
const detail = ref(null), detailLoading = ref(false), detailError = ref(''), expandedNodes = ref([]);
let loadSequence = 0, detailSequence = 0;
const statusText = { active: '进行中', paused: '已暂停', terminated: '已终止' };
const riskText = { overdue: '节点逾期', pending: '待验收或评价', unconfigured: '未配置节点', leader_missing: '缺少有效负责人', due_soon: '7日内截止', outcome_pending: '成果待核验' };
const riskOptions = [{ label: '全部进度', value: 'all' }, ...Object.entries(riskText).map(([value, label]) => ({ value, label })), { label: '全部节点完成', value: 'completed' }];
const statusOptions = [{ label: '全部项目状态', value: 'all' }, ...Object.entries(statusText).map(([value, label]) => ({ value, label }))];
const submissionText = { submitted: '已提交', approved: '已验收', returned: '已退回', superseded: '旧版本' };
const outcomeText = { submitted: '待核验', verified: '已核验', rejected: '已驳回' };
const summary = computed(() => board.value?.summary || {});
const filtered = computed(() => (board.value?.projects || []).filter(p => {
  const matchesText = [p.name, p.leader_name, ...p.members.map(m => m.name)].join(' ').toLowerCase().includes(keyword.value.trim().toLowerCase());
  const matchesRisk = risk.value === 'all' || (risk.value === 'completed' ? p.configured && p.completed_nodes === p.node_count : p.risks.includes(risk.value));
  return matchesText && matchesRisk && (status.value === 'all' || p.status === status.value);
}));
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const percent = n => n == null ? '—' : `${n}%`;
const formatTime = time => time ? time.slice(0, 16).replace('T', ' ') : '—';
const nodeAt = (project, key) => project.nodes.find(n => n.stage_key === key);
function nodeText(node) {
  if (node.node_complete) return '已完成';
  if (node.status === 'returned') return '待补交';
  if (node.pending_reviews) return '待验收';
  if (node.pending_evaluations) return '待评价';
  return node.status === 'submitted' ? '已提交' : '未完成';
}
const nodeHint = node => `截止：${node.due_date || '未设置'}${node.required_count != null ? `；已提交 ${node.submitted_count}/${node.required_count} 人；已评价 ${node.evaluated_count} 人` : ''}`;
async function load() {
  const sequence = ++loadSequence;
  detailSequence++; drawerOpen.value = false; detail.value = null; board.value = null; error.value = ''; loading.value = true;
  try { const data = await campService.fetchProjectDashboard(props.sid); if (sequence === loadSequence) board.value = data; }
  catch (e) { if (sequence === loadSequence) error.value = e.response?.data?.message || '项目总览加载失败，请重试'; }
  finally { if (sequence === loadSequence) loading.value = false; }
}
function closeDetail() { detailSequence++; detail.value = null; detailError.value = ''; selectedKey.value = null; }
function openProject(project, nodeId = null) {
  if (props.workspace) { emit('open-project', project, nodeId ? 'delivery' : 'overview', nodeId); return; }
  selectedKey.value = project.key; selectedName.value = project.name; selectedNode.value = nodeId; drawerOpen.value = true; fetchDetail();
}
async function fetchDetail() {
  const sequence = ++detailSequence;
  detail.value = null; detailError.value = ''; detailLoading.value = true;
  try {
    const data = await campService.fetchProjectDashboardDetail(props.sid, selectedKey.value);
    if (sequence !== detailSequence || !drawerOpen.value) return;
    detail.value = data.project;
    expandedNodes.value = detail.value.nodes.filter(n => selectedNode.value != null ? n.id === selectedNode.value : !n.node_complete).slice(0, 1).map(n => n.stage_key);
  } catch (e) { if (sequence === detailSequence) detailError.value = e.response?.data?.message || '项目详情加载失败，请重试'; }
  finally { if (sequence === detailSequence) detailLoading.value = false; }
}
async function download(attachment) {
  const tab = window.open('', '_blank'); if (tab) tab.opener = null;
  try { const url = await campService.fetchSubmissionAttachmentUrl(attachment.id); if (tab) tab.location.href = url; else window.location.assign(url); }
  catch (e) { tab?.close(); ElMessage.error(e.response?.data?.message || '附件下载失败'); }
}
function exportCsv() {
  const columns = board.value.columns;
  const headers = ['项目', '负责人', '成员', '项目状态', '完成率', '当前节点', '下一截止', '需关注', ...columns.map(c => c.title)];
  const rows = filtered.value.map(p => [p.name, p.leader_name, p.members.map(m => m.name).join('、'), statusText[p.status], percent(p.completion_rate), p.current_node, p.next_due_date || '', p.risks.map(r => riskText[r]).join('、'), ...columns.map(c => { const n = nodeAt(p, c.key); return n ? `${nodeText(n)}${n.overdue ? '（逾期）' : ''}` : '—'; })]);
  const quote = value => { const text = String(value ?? ''); return `"${(/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
  const url = URL.createObjectURL(new Blob(['\uFEFF' + [headers, ...rows].map(r => r.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${board.value.camp_name}-项目进度.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
watch([keyword, risk, status], () => { page.value = 1; });
watch(() => props.sid, () => { keyword.value = ''; risk.value = 'all'; status.value = 'all'; page.value = 1; load(); }, { immediate: true });
onBeforeUnmount(() => { loadSequence++; detailSequence++; });
</script>

<style scoped>
.project-dashboard { color: var(--dew-text); display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.board-heading, .board-actions, .board-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.board-heading { justify-content: space-between; }
.board-heading h2 { margin: 0; font-size: 20px; font-weight: 600; }
.board-note { color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; margin: 4px 0; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.stat-label { color: var(--color-text-secondary); font-size: 13px; }
.stat-number { font-size: 26px; font-weight: 600; margin: 6px 0; }
.keyword-input { width: 250px; max-width: 100%; }
.board-filter { width: 180px; max-width: 100%; }
.matrix-card { min-width: 0; }
.matrix-card :deep(.dew-card__body) { padding: 0; }
.matrix-card :deep(td.el-table-fixed-column--left) { background: var(--dew-dialog-bg); }
.progress-matrix { --el-table-bg-color: var(--dew-dialog-bg); --el-table-tr-bg-color: var(--dew-dialog-bg); --el-table-header-bg-color: var(--dew-card-flat-bg); --el-table-text-color: var(--dew-text); --el-table-header-text-color: var(--color-text-secondary); --el-table-border-color: var(--color-border); --el-table-row-hover-bg-color: var(--dew-card-flat-bg-hover); }
:global(.project-detail-drawer) { color: var(--dew-text); --el-bg-color: var(--dew-dialog-bg); --el-text-color-primary: var(--dew-text-heading); --el-text-color-regular: var(--dew-text); --el-border-color-lighter: var(--color-border); --el-fill-color-blank: var(--dew-dialog-bg); }
.project-link, .node-cell { border: 0; background: transparent; color: var(--color-primary); cursor: pointer; font: inherit; text-align: left; padding: 6px 0; }
.project-link:hover, .node-cell:hover { text-decoration: underline; }
.project-link:focus-visible, .node-cell:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.node-cell { text-align: center; width: 100%; color: var(--color-text-secondary); }
.node-cell small { display: block; font-size: 11px; }
.completed { color: var(--color-success); }
.danger, .error-state { color: var(--color-danger); }
.risk-tags, .member-tags, .attachment-list { display: flex; gap: 6px; flex-wrap: wrap; }
.board-pagination { display: flex; justify-content: flex-end; padding: 12px; }
.member-tags { margin: 12px 0 20px; }
.detail-node-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; line-height: 1.5; padding: 8px 0; }
.material-card { border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; margin: 10px 0; }
.material-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; font-size: 13px; }
.evaluation-list { color: var(--color-text-secondary); font-size: 13px; overflow-wrap: anywhere; }
.outcome-heading { margin: 24px 0 12px; font-size: 16px; }
@media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .stat-number { font-size: 22px; } .board-toolbar > .keyword-input { width: 100%; } .board-filter { flex: 1; min-width: 140px; } }
</style>
