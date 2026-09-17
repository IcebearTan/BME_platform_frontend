<template>
  <!-- 项目营申报（09-13 申报即设计模板：节点序列替代「计划」栏，三起点=空白/平台默认/复制历史）。
       过审时节点自动建项目模板+实例化里程碑——项目落地自带完整交付流程；审核时管理员可见。
       可多申报/多负责/多加入（参与不设上限）；双入口：非成员视图（CampView upcoming）+
       成员工作台（ProjectHub 申报 view）。普通学员报名在选择阶段开放。 -->
  <div class="apply-card-wrap">
    <DewCard v-if="loading" variant="inset" size="lg" :no-hover="true" class="apply-card">
      <DewSkeleton variant="text" width="40%" />
      <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
    </DewCard>

    <template v-else>
      <!-- 待审列表：安静态，不阻塞继续申报 -->
      <DewCard v-if="pendingApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">{{ pendingApps.length }} 个申报待审核</div>
        <div class="pending-list">
          <div v-for="a in pendingApps" :key="a.id" class="pending-item">
            <span class="pending-name">「{{ a.name }}」</span>
            <span class="pending-nodes">{{ a.template_nodes?.length || 0 }} 节点</span>
            <span class="pending-date">{{ (a.created_at || '').slice(0, 10) }}</span>
          </div>
        </div>
        <div class="apply-hint" style="margin-bottom: 0;">
          管理员逐个审核：通过即创建项目、你自动入营成为该项目负责人。审核期间可继续申报其他项目。
        </div>
      </DewCard>

      <!-- 09-17 门槛可配置：本营开了负责人申报等级门槛且当前 LV1 → 锁定态（默认关=零门槛史，不渲染本卡） -->
      <DewCard v-if="leaderGateOn && myLevel < 2 && mine.can_apply"
               variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">申报一个新项目</div>
        <div class="apply-hint">
          本营项目负责人申报需 LV2 及以上——你当前是 LV1；等级由管理员按平台参与度调整，多打卡、多发作品，升级很快。
        </div>
        <DewButton type="glass" disabled>LV2 后可申报</DewButton>
      </DewCard>

      <!-- 申报表单（upcoming 恒开；被拒项目直接重报即可） -->
      <DewCard v-else-if="mine.can_apply" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">申报一个新项目</div>
        <div class="apply-hint">
          管理员审核通过后项目创建并对全营展示，你自动入营开始组队；可同时申报多个项目，负责多少个不受限制。
        </div>

        <div class="field-label">项目名称 <span class="field-req">必填</span></div>
        <DewInput v-model="form.name" size="lg" placeholder="如：智能输液监护系统" :disabled="submitting" />

        <div class="field-label">项目背景</div>
        <DewInput v-model="form.background" type="textarea" :rows="2"
                  placeholder="为什么做这件事、面向什么场景" :disabled="submitting" />

        <div class="field-label">目标</div>
        <DewInput v-model="form.goal" type="textarea" :rows="2"
                  placeholder="预期达成什么（可验收的成果形态）" :disabled="submitting" />

        <div class="field-label">所需能力</div>
        <DewInput v-model="form.required_abilities" type="textarea" :rows="2"
                  placeholder="希望成员具备的技能（硬件/软件/机械/文档…）" :disabled="submitting" />

        <div class="field-label">招募说明</div>
        <DewInput v-model="form.recruit_note" type="textarea" :rows="2"
                  placeholder="打算招几个人、怎么分工" :disabled="submitting" />

        <!-- ── 交付节点（申报即模板：替代「计划」栏；过审自动实例化）── -->
        <div class="field-label">交付节点 <span class="field-req">至少 1 个</span>
          <span class="field-hint">项目流程的施工图——过审即按此生成里程碑；结题后可发布到项目广场供人借鉴</span>
        </div>

        <div v-if="!platformList.length && !sourceList.length" class="start-hint">
          可直接在下方添加节点；平台默认模板与历史项目模板上线后，可一键预填起步。
        </div>
        <template v-else>
          <div class="start-row">
            <button type="button" :class="['start-chip', { on: startMode === 'blank' }]"
                    @click="pickStart('blank')">空白自建</button>
            <button v-if="platformList.length" type="button"
                    :class="['start-chip', { on: startMode === 'platform' }]"
                    @click="pickStart('platform')">平台默认模板</button>
            <button v-if="sourceList.length" type="button"
                    :class="['start-chip', { on: startMode === 'clone' }]"
                    @click="pickStart('clone')">复制历史项目</button>
          </div>
          <DewSelect v-if="startMode !== 'blank'" v-model="sourceId" size="sm"
                     :options="sourceOptions" placeholder="选择模板源（预填后可再改）"
                     @update:model-value="applySource" />
        </template>

        <div class="node-list">
          <div v-for="(n, i) in form.template_nodes" :key="i" class="node-item">
            <span class="node-order">{{ i + 1 }}</span>
            <div class="node-main">
              <div class="node-grid">
                <DewInput v-model="n.title" size="sm" placeholder="节点标题（如：开题报告）" />
                <DewSelect v-model="n.submit_mode" size="sm" :options="MODE_OPTS" />
              </div>
              <DewInput v-model="n.deliverable_req" size="sm" placeholder="交付要求（选填，如：报告+演示）" />
            </div>
            <div class="node-ops">
              <DewButton type="ghost" size="sm" :disabled="i === 0" @click="moveNode(i, -1)">上移</DewButton>
              <DewButton type="ghost" size="sm" :disabled="i === form.template_nodes.length - 1" @click="moveNode(i, 1)">下移</DewButton>
              <DewButton type="ghost" size="sm" @click="form.template_nodes.splice(i, 1)">删除</DewButton>
            </div>
          </div>
          <DewButton type="ghost" size="sm" class="add-node"
                     @click="form.template_nodes.push({ title: '', deliverable_req: '', submit_mode: 'team' })">
            ＋ 添加节点
          </DewButton>
        </div>

        <div class="apply-actions">
          <DewButton size="lg" :loading="submitting" :disabled="!canSubmit" @click="submit">
            提交申报
          </DewButton>
        </div>
      </DewCard>

      <!-- 申报历史（被拒可见原因，重报走上方表单） -->
      <DewCard v-if="rejectedApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">被退回的申报</div>
        <div v-for="a in rejectedApps" :key="a.id" class="reject-note">
          「{{ a.name }}」：{{ a.reject_reason || '未填写原因' }}——可修改后用上方表单重新申报
        </div>
      </DewCard>

      <!-- 窗口已过且无待审：说明卡 -->
      <DewCard v-if="!mine.can_apply && !pendingApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">项目申报</div>
        <div class="apply-hint">申报期已结束（项目申报在「待开放」阶段进行）。</div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewSelect, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  session: { type: Object, required: true },   // 营期行（project 营）
});
const emit = defineEmits(['submitted']);

const store = useStore();
// 09-17 门槛可配置：leader_level_gate 营期行覆盖，缺位回退关（=项目营上线以来零门槛，旧营期行为不变）
const myLevel = computed(() => store.getters.level || 1);
const leaderGateOn = computed(() => props.session?.policy?.capabilities?.leader_level_gate ?? false);

const MODE_OPTS = [
  { label: '整队交付（负责人交·老师审）', value: 'team' },
  { label: '个人交付（成员交·负责人审）', value: 'member' },
];
const blankNodes = () => [{ title: '', deliverable_req: '', submit_mode: 'team' }];

const loading = ref(true);
const mine = ref({});
const submitting = ref(false);
const form = ref({ name: '', background: '', goal: '', required_abilities: '', recruit_note: '',
                   template_nodes: blankNodes() });

// ── 模板三起点（与过审后 TemplateEditor 同构：空白 / 平台默认 / 复制历史）──
const startMode = ref('blank');
const sourceId = ref(null);
const platformList = ref([]);
const sourceList = ref([]);
const sourceOptions = computed(() => (startMode.value === 'platform'
  ? platformList.value.map((t) => ({ label: `${t.name}${t.category ? `（${t.category}）` : ''} · ${t.nodes.length} 节点`, value: t.id }))
  : sourceList.value.map((s) => ({ label: `${s.name} · ${s.camp_name}${s.archived ? '（往届）' : ''} · ${s.node_count} 节点`, value: s.unit_id }))));

function pickStart(mode) {
  startMode.value = mode;
  sourceId.value = null;
  if (mode === 'blank') form.value.template_nodes = blankNodes();
}
function applySource() {
  if (startMode.value === 'platform') {
    const t = platformList.value.find((x) => x.id === sourceId.value);
    if (t) form.value.template_nodes = t.nodes.map((n) => ({
      title: n.title || '', deliverable_req: n.deliverable_req || '', submit_mode: n.submit_mode || 'team' }));
  } else if (startMode.value === 'clone') {
    const s = sourceList.value.find((x) => x.unit_id === sourceId.value);
    if (s?.nodes?.length) form.value.template_nodes = s.nodes.map((n) => ({
      title: n.title || '', deliverable_req: n.deliverable_req || '', submit_mode: n.submit_mode || 'team' }));
  }
}
function moveNode(i, delta) {
  const arr = form.value.template_nodes;
  [arr[i], arr[i + delta]] = [arr[i + delta], arr[i]];
}

const pendingApps = computed(() => mine.value.applications?.filter((a) => a.status === 'pending') || []);
const rejectedApps = computed(() => mine.value.applications?.filter((a) => a.status === 'rejected') || []);
const canSubmit = computed(() => !!form.value.name.trim()
  && form.value.template_nodes.some((n) => n.title.trim()));

async function load() {
  loading.value = true;
  try {
    mine.value = await campService.fetchProjectMine(props.session.id);
  } catch { /* 静默：卡在骨架态，用户刷新重试 */ }
  finally { loading.value = false; }
}
onMounted(() => {
  load();
  // 模板源（预填起点；拉不到静默降级为空白自建）
  campService.fetchPlatformTemplates().then((d) => { platformList.value = d.templates || []; }).catch(() => {});
  campService.fetchTemplateSources(props.session.id).then((d) => { sourceList.value = d.sources || []; }).catch(() => {});
});

async function submit() {
  if (submitting.value || !canSubmit.value) return;
  if (leaderGateOn.value && myLevel.value < 2) return;   // 双保险：锁定态按钮已禁用，此处兜底
  submitting.value = true;
  try {
    const nodes = form.value.template_nodes
      .filter((n) => n.title.trim())
      .map((n) => ({ title: n.title.trim(), deliverable_req: n.deliverable_req.trim() || null,
                     submit_mode: n.submit_mode }));
    const payload = {
      name: form.value.name.trim(), background: form.value.background, goal: form.value.goal,
      required_abilities: form.value.required_abilities, recruit_note: form.value.recruit_note,
      template_nodes: nodes,
    };
    const r = await campService.submitProjectApplication(props.session.id, payload);
    ElMessage.success(r.message || '申报已提交，等待管理员审核');
    emit('submitted');
    form.value = { name: '', background: '', goal: '', required_abilities: '', recruit_note: '',
                   template_nodes: blankNodes() };
    startMode.value = 'blank';
    sourceId.value = null;
    await load();   // 刷新待审列表，表单留空可继续报下一个
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.apply-card { margin-top: 16px; }
.apply-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); margin-bottom: 8px; }
.apply-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-bottom: 14px; }
.pending-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.pending-item { display: flex; align-items: baseline; gap: 10px; font-size: 13.5px; }
.pending-name { font-weight: 600; color: var(--dew-text-heading); }
.pending-nodes { font-size: 12px; color: var(--dew-text-faint); }
.pending-date { font-size: 12px; color: var(--dew-text-faint); margin-left: auto; }
.reject-note {
  font-size: 12.5px; color: var(--color-warning); line-height: 1.6; margin-bottom: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.reject-note:last-child { margin-bottom: 0; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); margin: 12px 0 6px; }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }
.field-hint { display: block; font-size: 11.5px; font-weight: 400; color: var(--dew-text-faint); margin-top: 2px; }
.apply-actions { margin-top: 16px; }

/* 模板起点 */
.start-hint { font-size: 12.5px; color: var(--dew-text-faint); margin: 4px 0 8px; }
.start-row { display: flex; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
.start-chip {
  border: 1px solid var(--dew-card-border); border-radius: 6px; background: transparent;
  padding: 5px 12px; font-size: 12.5px; color: var(--dew-text-muted); cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.start-chip:hover { border-color: var(--dew-text-faint); }
.start-chip.on {
  color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-weight: 600;
}

/* 节点序列 */
.node-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.node-item { display: flex; gap: 8px; align-items: flex-start; }
.node-order {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border);
}
.node-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.node-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 8px; }
.node-ops { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.add-node { align-self: flex-start; margin-top: 2px; }
@media (max-width: 640px) { .node-grid { grid-template-columns: 1fr; } }
</style>
