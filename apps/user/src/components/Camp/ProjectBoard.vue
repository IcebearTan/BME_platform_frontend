<template>
  <!-- 单项目看板（09-13 项目区重构）：负责人/成员共用，role 控制管理区显隐。
       多项目时顶部下拉切换；区块 = 看板头 / 成员管理(负责) / 节点交付 / 成果。 -->
  <div class="project-board">
    <!-- 多项目切换 -->
    <div v-if="units.length > 1" class="board-switch">
      <span class="switch-label">切换项目</span>
      <DewSelect v-model="currentId" size="sm" :options="unitOptions" class="switch-select" />
    </div>

    <template v-if="cur">
      <!-- 看板头 -->
      <DewCard variant="inset" size="lg" :no-hover="true" class="board-head">
        <div class="head-row">
          <div class="head-main">
            <span class="head-name">{{ cur.name }}</span>
            <DewTag v-if="cur.status !== 'active'" size="sm" round>{{ unitStatusText[cur.status] || cur.status }}</DewTag>
            <span class="head-meta">
              {{ role === 'leader' ? '我是负责人' : '成员' }} · 成员 {{ cur.member_count }} 人 · 负责人 {{ cur.leader_name }}
            </span>
          </div>
          <div class="head-actions">
            <DewButton v-if="role === 'leader'" type="ghost" size="sm"
                       :disabled="session.status === 'archived'" @click="openTemplate">项目模板</DewButton>
            <DewButton v-if="role === 'leader'" type="glass" size="sm" @click="openPublish">发布到项目广场</DewButton>
          </div>
        </div>
        <p v-if="cur.goal" class="head-goal">{{ cur.goal }}</p>
      </DewCard>

      <!-- 成员管理（负责） -->
      <template v-if="role === 'leader'">
        <div class="sec-title">成员管理</div>
        <DewCard variant="default" :no-hover="true" class="sec-card">
          <ProjectRoster :unit-id="cur.unit_id" :camp-status="session.status" @changed="emitChanged" />
        </DewCard>
      </template>

      <!-- 节点交付（模板实例化的里程碑：材料提交/审核 + 节点评价；09-14 用户定名「项目进展」） -->
      <div class="sec-title">项目进展</div>
      <DewCard variant="default" :no-hover="true" class="sec-card">
        <ProjectMilestones :unit-id="cur.unit_id" :camp-status="session.status"
                           :editable="session.status !== 'archived' && cur.status === 'active'"
                           :owner-user-id="cur.leader_user_id" @changed="emitChanged" />
      </DewCard>

      <!-- 活动考勤（09-13 拍板：以项目为单位，负责人发起/勾选出席） -->
      <div class="sec-title">活动考勤</div>
      <DewCard variant="default" :no-hover="true" class="sec-card">
        <ProjectActivities :sid="sid" :session="session" :unit-id="cur.unit_id" />
      </DewCard>

      <!-- 周考勤（09-13：项目营开了周打卡后负责人的成员×周面板，两区并显不并口径） -->
      <template v-if="role === 'leader' && weeklyOn">
        <div class="sec-title">周考勤</div>
        <DewCard variant="default" :no-hover="true" class="sec-card">
          <ProjectWeeklyAttendance :unit-id="cur.unit_id" />
        </DewCard>
      </template>

      <!-- 成果 -->
      <div class="sec-title">项目成果</div>
      <DewCard variant="default" :no-hover="true" class="sec-card">
        <div class="outcome-head">
          <span class="outcome-title">验收材料与成果</span>
          <DewButton v-if="role === 'leader' && session.status !== 'archived' && cur.status === 'active'"
                     type="ghost" size="sm" @click="openOutcome">登记成果</DewButton>
        </div>
        <div v-if="!outcomes.length" class="outcome-empty">
          {{ role === 'leader' ? '尚无成果登记——结题材料验收后在此登记，管理员核验后入档' : '负责人尚未登记成果' }}
        </div>
        <div v-else class="outcome-list">
          <div v-for="o in outcomes" :key="o.id" class="outcome-item">
            <span class="outcome-name">{{ o.title }}</span>
            <span :class="['outcome-status', `os-${o.status}`]">{{ OUTCOME_TEXT[o.status] || o.status }}</span>
            <span v-if="o.reject_reason" class="outcome-reason">驳回原因：{{ o.reject_reason }}</span>
          </div>
        </div>
      </DewCard>
    </template>

    <!-- 项目模板（三起点+节点编辑） -->
    <DewDialog v-model="tplDlg" :title="`项目模板 · ${cur?.name || ''}`" width="680px">
      <TemplateEditor v-if="tplDlg && cur" :unit-id="cur.unit_id" :sid="sid"
                      @close="tplDlg = false" @changed="emitChanged" />
    </DewDialog>

    <!-- 发布到项目广场 -->
    <DewDialog v-model="publishDlg" title="发布到项目广场" width="560px">
      <div class="publish-form">
        <div class="pub-note">
          发布后全站可见（标题与详情自动取自项目档案，下方可覆盖）；结营后自动标「已完成」并挂结营档案引用。
        </div>
        <div class="field-label">一句话简介（留空取项目目标）</div>
        <DewInput v-model="publishForm.summary" type="textarea" :rows="2" />
        <div class="field-label">标签（逗号分隔，最多 6 个）</div>
        <DewInput v-model="publishForm.tagsText" placeholder="医工交叉, 硬件" />
        <div class="field-label">资料链接（每行一条：名称 空格 链接）</div>
        <DewInput v-model="publishForm.linksText" type="textarea" :rows="2" placeholder="演示视频 https://..." />
        <div class="form-actions">
          <DewButton type="ghost" @click="publishDlg = false">取消</DewButton>
          <DewButton type="glass" :loading="publishing" @click="doPublish">发布</DewButton>
        </div>
      </div>
    </DewDialog>

    <!-- 登记成果 -->
    <DewDialog v-model="outcomeDlg" title="登记项目成果" width="520px">
      <div class="outcome-form">
        <div class="field-label">成果标题 <span class="field-req">必填</span></div>
        <DewInput v-model="outcomeForm.title" size="lg" placeholder="如：样机一台 / 论文一篇 / 开源仓库" />
        <div class="field-label">说明</div>
        <DewInput v-model="outcomeForm.description" type="textarea" :rows="3"
                  placeholder="成果形态与完成情况（核验与结营档案可见）" />
        <div class="outcome-note">提交后由管理员核验；未核验的成果不进入结营档案。</div>
        <div class="outcome-actions">
          <DewButton type="ghost" @click="outcomeDlg = false">取消</DewButton>
          <DewButton type="glass" :loading="outcomeSaving" :disabled="!outcomeForm.title.trim()"
                     @click="saveOutcome">提交登记</DewButton>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewTag, DewDialog, DewSelect } from '@bme/dew-ui';
import { campService } from '../../services/campService';
import { showcaseService } from '../../services/showcaseService';
import ProjectRoster from './ProjectRoster.vue';
import ProjectMilestones from './ProjectMilestones.vue';
import ProjectActivities from './ProjectActivities.vue';
import ProjectWeeklyAttendance from './ProjectWeeklyAttendance.vue';
import TemplateEditor from './TemplateEditor.vue';

const props = defineProps({
  sid: { type: Number, required: true },
  session: { type: Object, required: true },
  units: { type: Array, required: true },          // 同一角色的项目列表（mine.leading / mine.joining）
  role: { type: String, default: 'member' },       // leader / member
});
const emit = defineEmits(['changed']);

const unitStatusText = { active: '进行中', paused: '已暂停', terminated: '已终止' };
const OUTCOME_TEXT = { submitted: '待核验', verified: '已核验', rejected: '已驳回' };

const currentId = ref(null);
const unitOptions = computed(() => props.units.map((u) => ({ label: u.name, value: u.unit_id })));
const cur = computed(() => props.units.find((u) => u.unit_id === currentId.value) || props.units[0]);
watch(() => props.units, (us) => {
  if (!us.some((u) => u.unit_id === currentId.value)) currentId.value = us[0]?.unit_id ?? null;
}, { immediate: true });

const emitChanged = () => emit('changed');

// 项目营周考勤开关（与 ProjectHub 顶部状态条同口径）
const weeklyOn = computed(() => !!props.session.policy?.capabilities?.attendance
  && props.session.policy?.attendance_mode === 'weekly');

// ── 成果 ──
const outcomes = ref([]);
async function loadOutcomes() {
  if (!cur.value) return;
  try {
    const d = await campService.fetchOutcomes(cur.value.unit_id);
    outcomes.value = d.outcomes || [];
  } catch { outcomes.value = []; }
}
watch(() => cur.value?.unit_id, loadOutcomes, { immediate: true });

const outcomeDlg = ref(false);
const outcomeForm = ref({ title: '', description: '' });
const outcomeSaving = ref(false);
function openOutcome() { outcomeForm.value = { title: '', description: '' }; outcomeDlg.value = true; }
async function saveOutcome() {
  if (outcomeSaving.value || !outcomeForm.value.title.trim()) return;
  outcomeSaving.value = true;
  try {
    const r = await campService.registerOutcome(cur.value.unit_id, {
      title: outcomeForm.value.title.trim(),
      description: outcomeForm.value.description.trim() || null,
    });
    ElMessage.success(r.message || '已登记，等待核验');
    outcomeDlg.value = false;
    loadOutcomes();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登记失败');
  } finally { outcomeSaving.value = false; }
}

// ── 项目模板 ──
const tplDlg = ref(false);
function openTemplate() { tplDlg.value = true; }

// ── 发布到项目广场 ──
const publishDlg = ref(false);
const publishForm = ref({ summary: '', tagsText: '', linksText: '' });
const publishing = ref(false);
function openPublish() {
  publishForm.value = { summary: cur.value?.goal || '', tagsText: '', linksText: '' };
  publishDlg.value = true;
}
async function doPublish() {
  if (publishing.value) return;
  publishing.value = true;
  try {
    const links = publishForm.value.linksText.split('\n').map((l) => l.trim()).filter(Boolean)
      .map((line) => {
        const m = line.match(/^(\S+)\s+(https?:\/\/\S+)$/);
        return m ? { label: m[1], url: m[2] } : { label: line.slice(0, 40), url: line };
      });
    const r = await showcaseService.publishFromCamp({
      unit_id: cur.value.unit_id,
      summary: publishForm.value.summary.trim() || null,
      tags: publishForm.value.tagsText.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      links,
    });
    ElMessage.success(r.message || '已发布到项目广场');
    publishDlg.value = false;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败');
  } finally { publishing.value = false; }
}
</script>

<style scoped>
.project-board { display: flex; flex-direction: column; gap: 14px; }

.board-switch { display: flex; align-items: center; gap: 10px; }
.switch-label { font-size: 13px; color: var(--dew-text-muted); }
.switch-select { width: 260px; }

.board-head { padding-block: 14px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.head-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-name { font-size: 18px; font-weight: 700; color: var(--dew-text-heading); }
.head-meta { font-size: 12.5px; color: var(--dew-text-muted); }
.head-actions { display: flex; gap: 8px; }
.head-goal { margin: 8px 0 0; font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; }

.sec-title { font-size: 14.5px; font-weight: 700; color: var(--dew-text-heading); margin-top: 6px; }
.sec-card { padding-block: 12px; }

.outcome-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.outcome-title { font-size: 13.5px; font-weight: 650; color: var(--dew-text-heading); }
.outcome-empty { font-size: 12.5px; color: var(--dew-text-faint); }
.outcome-list { display: flex; flex-direction: column; gap: 6px; }
.outcome-item { display: flex; align-items: center; gap: 10px; font-size: 13px; flex-wrap: wrap; }
.outcome-name { font-weight: 600; color: var(--dew-text-heading); }
.outcome-status { font-size: 12px; font-weight: 600; }
.os-submitted { color: var(--color-warning); }
.os-verified { color: var(--color-success); }
.os-rejected { color: var(--color-danger, #e5484d); }
.outcome-reason { font-size: 12px; color: var(--dew-text-faint); }

.outcome-form { display: flex; flex-direction: column; gap: 10px; }
.outcome-note { font-size: 12px; color: var(--dew-text-faint); }
.outcome-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.publish-form { display: flex; flex-direction: column; gap: 10px; }
.pub-note { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }
</style>
