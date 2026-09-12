<template>
  <!-- 项目模板编辑器（v1.3 阶段4，负责人）：节点施工图。
       无模板=三起点创建（空白/平台默认/复制历史——创建即实例化里程碑）；
       有模板=编辑打磨（不影响已实例化里程碑；结题归档后他人复制的就是这份蓝图）。 -->
  <div class="tpl-editor">
    <div v-if="loading" class="tpl-loading"><DewSkeleton variant="rect" width="100%" height="200" rounded="8px" /></div>

    <template v-else>
      <!-- 三起点选择（仅无模板时） -->
      <div v-if="!template" class="start-grid">
        <button v-for="opt in STARTS" :key="opt.mode" type="button"
                :class="['start-card', { picked: mode === opt.mode }]" @click="pickStart(opt.mode)">
          <span class="start-title">{{ opt.title }}</span>
          <span class="start-desc">{{ opt.desc }}</span>
        </button>
      </div>

      <!-- 起点=平台模板 / 复制历史：源选择 -->
      <template v-if="!template && (mode === 'platform' || mode === 'clone')">
        <div class="field-label">{{ mode === 'platform' ? '选择平台默认模板' : '选择历史项目模板' }}</div>
        <div v-if="!sourceOptions.length" class="no-source">
          {{ mode === 'platform' ? '暂无可用的平台模板（管理员尚未维护）' : '暂无可复制的历史模板（项目结题归档后其模板可被复制）' }}
        </div>
        <DewSelect v-else v-model="sourceId" size="lg" :options="sourceOptions" />
        <template v-if="sourceId">
          <div class="src-preview">
            <div class="src-head">模板节点（{{ previewNodes.length }} 个，创建后可再调整）</div>
            <div v-for="(n, i) in previewNodes" :key="i" class="src-node">
              <span class="src-order">{{ i + 1 }}</span>
              <span class="src-title">{{ n.title }}</span>
              <DewTag size="sm" round>{{ n.submit_mode === 'member' ? '个人交付' : '整队交付' }}</DewTag>
            </div>
          </div>
        </template>
      </template>

      <!-- 模板名 -->
      <template v-if="template || readyToEdit">
        <div class="field-label">模板名称</div>
        <DewInput v-model="form.name" size="lg" placeholder="如：硬件研发三阶段" :disabled="saving" />

        <!-- 节点编辑器 -->
        <div class="field-label">节点序列 <span class="field-hint">（按交付顺序排列；创建后自动生成为项目里程碑）</span></div>
        <div class="node-list">
          <div v-for="(n, i) in form.nodes" :key="i" class="node-item">
            <span class="node-order">{{ i + 1 }}</span>
            <div class="node-main">
              <DewInput v-model="n.title" size="sm" placeholder="节点标题（如：中期检查）" />
              <DewInput v-model="n.deliverable_req" size="sm" placeholder="交付要求（选填，如：中期报告+演示）" />
              <div class="node-ops">
                <DewSelect v-model="n.submit_mode" size="sm" :options="MODE_OPTS" class="node-mode" />
                <button type="button" class="mv" :disabled="i === 0" @click="move(i, -1)">上移</button>
                <button type="button" class="mv" :disabled="i === form.nodes.length - 1" @click="move(i, 1)">下移</button>
                <button type="button" class="mv del" @click="form.nodes.splice(i, 1)">删除</button>
              </div>
            </div>
          </div>
          <button type="button" class="add-node" @click="form.nodes.push({ title: '', deliverable_req: '', submit_mode: 'team' })">
            ＋ 添加节点
          </button>
        </div>

        <div class="tpl-note">
          {{ template
            ? '编辑模板不影响已生成的里程碑；结题归档后，其他负责人可复制这份模板起步。'
            : '创建后节点将自动生成为项目里程碑（之后可增删调时）。' }}
        </div>
      </template>

      <div class="tpl-actions">
        <DewButton type="ghost" @click="$emit('close')">关闭</DewButton>
        <DewButton v-if="!template" type="glass" :loading="saving" :disabled="!canCreate" @click="create">
          创建模板并生成里程碑
        </DewButton>
        <DewButton v-else type="glass" :loading="saving" :disabled="!form.name.trim()" @click="save">保存模板</DewButton>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DewButton, DewInput, DewSelect, DewTag, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  unitId: { type: Number, required: true },
  sid: { type: Number, required: true },
});
const emit = defineEmits(['close', 'created', 'changed']);

const STARTS = [
  { mode: 'blank', title: '空白自建', desc: '从零开始搭自己的节点序列' },
  { mode: 'platform', title: '平台默认模板', desc: '按项目类别选用管理员维护的起点' },
  { mode: 'clone', title: '复制历史项目', desc: '站在往届项目的施工图上改' },
];
const MODE_OPTS = [
  { label: '整队交付（负责人交·老师审）', value: 'team' },
  { label: '个人交付（成员交·负责人审）', value: 'member' },
];

const loading = ref(true);
const template = ref(null);
const mode = ref('blank');
const sourceId = ref(null);
const platformList = ref([]);
const sourceList = ref([]);
const form = ref({ name: '', nodes: [] });
const saving = ref(false);

const sourceOptions = computed(() => (mode.value === 'platform'
  ? platformList.value.map((t) => ({ label: `${t.name}${t.category ? `（${t.category}）` : ''} · ${t.nodes.length} 节点`, value: t.id }))
  : sourceList.value.map((s) => ({ label: `${s.name} · ${s.camp_name}${s.archived ? '（往届）' : ''} · ${s.node_count} 节点`, value: s.unit_id }))));
const previewNodes = computed(() => {
  if (mode.value === 'platform') {
    return platformList.value.find((t) => t.id === sourceId.value)?.nodes || [];
  }
  return [];   // clone 源的节点数已在选项标签中展示，创建后落地可见
});
const readyToEdit = computed(() => mode.value === 'blank' || !!sourceId.value);
const canCreate = computed(() => {
  if (!readyToEdit.value || !form.value.name.trim()) return false;
  if (mode.value === 'blank' && !form.value.nodes.length) return false;   // 空白至少 1 个节点
  return true;
});

function pickStart(m) {
  mode.value = m;
  sourceId.value = null;
  form.value = { name: '', nodes: m === 'blank' ? [{ title: '', deliverable_req: '', submit_mode: 'team' }] : [] };
}
function move(i, delta) {
  const arr = form.value.nodes;
  [arr[i], arr[i + delta]] = [arr[i + delta], arr[i]];
}

async function load() {
  loading.value = true;
  try {
    const [t, p, s] = await Promise.all([
      campService.fetchUnitTemplate(props.unitId),
      campService.fetchPlatformTemplates().catch(() => ({ templates: [] })),
      campService.fetchTemplateSources(props.sid).catch(() => ({ sources: [] })),
    ]);
    template.value = t.template;
    if (t.template) {
      form.value = {
        name: t.template.name,
        nodes: t.template.nodes.map((n) => ({
          title: n.title, deliverable_req: n.deliverable_req || '', submit_mode: n.submit_mode,
        })),
      };
    }
    platformList.value = p.templates || [];
    sourceList.value = (s.sources || []).filter((x) => x.unit_id !== props.unitId);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载模板失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const normNodes = () => form.value.nodes
  .filter((n) => n.title.trim())
  .map((n) => ({ title: n.title.trim(), deliverable_req: n.deliverable_req.trim() || null, submit_mode: n.submit_mode }));

async function create() {
  if (saving.value || !canCreate.value) return;
  saving.value = true;
  try {
    const body = { mode: mode.value, name: form.value.name.trim(), nodes: normNodes() };
    if (mode.value === 'platform') body.source_template_id = sourceId.value;
    if (mode.value === 'clone') body.source_unit_id = sourceId.value;
    if (mode.value !== 'blank') delete body.nodes;           // 从源复制节点，忽略手填
    const r = await campService.createUnitTemplate(props.unitId, body);
    ElMessage.success(r.message || '模板已创建');
    emit('created');
    emit('changed');
    emit('close');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '创建失败');
  } finally {
    saving.value = false;
  }
}
async function save() {
  if (saving.value || !form.value.name.trim()) return;
  saving.value = true;
  try {
    const r = await campService.updateUnitTemplate(props.unitId, {
      name: form.value.name.trim(), nodes: normNodes(),
    });
    ElMessage.success(r.message || '已保存');
    emit('changed');
    emit('close');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.tpl-editor { display: flex; flex-direction: column; gap: 12px; }
.tpl-loading { padding: 4px 0; }

.start-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.start-card {
  display: flex; flex-direction: column; gap: 6px; text-align: left;
  border: 1px solid var(--dew-card-border); border-radius: 10px; background: transparent;
  padding: 12px; cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.start-card:hover { border-color: var(--dew-text-faint); }
.start-card.picked {
  border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.start-title { font-size: 14px; font-weight: 650; color: var(--dew-text-heading); }
.start-desc { font-size: 12px; color: var(--dew-text-muted); line-height: 1.5; }
@media (max-width: 640px) { .start-grid { grid-template-columns: 1fr; } }

.no-source { font-size: 12.5px; color: var(--dew-text-faint); padding: 4px 0; }
.src-preview { border: 1px solid var(--dew-card-border); border-radius: 10px; padding: 10px 12px; }
.src-head { font-size: 12.5px; font-weight: 600; color: var(--dew-text-heading); margin-bottom: 6px; }
.src-node { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12.5px; }
.src-order { color: var(--dew-text-faint); width: 16px; }
.src-title { color: var(--dew-text-muted); }

.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }
.field-hint { font-size: 11.5px; font-weight: 400; color: var(--dew-text-faint); }

.node-list { display: flex; flex-direction: column; gap: 8px; }
.node-item { display: flex; gap: 8px; align-items: flex-start; }
.node-order {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border);
}
.node-main { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.node-ops { display: flex; align-items: center; gap: 8px; }
.node-mode { max-width: 240px; }
.mv {
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--dew-text-faint); transition: color 0.15s ease;
}
.mv:hover:not(:disabled) { color: var(--color-primary); }
.mv:disabled { opacity: 0.4; cursor: not-allowed; }
.mv.del:hover { color: var(--color-danger, #e5484d); }
.add-node {
  align-self: flex-start;
  border: 1px dashed var(--dew-card-border); border-radius: 8px; background: transparent;
  padding: 6px 12px; font-size: 12.5px; color: var(--dew-text-muted); cursor: pointer;
}
.add-node:hover { border-color: var(--color-primary); color: var(--color-primary); }

.tpl-note { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }
.tpl-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
