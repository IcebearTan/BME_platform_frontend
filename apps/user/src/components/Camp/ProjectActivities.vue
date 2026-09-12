<template>
  <!-- 项目活动考勤（09-13 拍板：负责人发起 会议/外出调研/其他 + 勾选出席；
       独立展示，不并入周打卡口径）。按我参与的项目分组渲染。 -->
  <div class="project-activities">
    <div v-if="loading" class="pa-loading"><DewSkeleton variant="rect" width="100%" height="120" rounded="8px" /></div>
    <DewCard v-else-if="!units.length" variant="flat" class="pa-empty">
      <div class="empty-text">{{ unitId == null
        ? '你尚未加入任何项目——加入后这里显示项目活动与出勤情况。' : '尚无活动记录' }}</div>
    </DewCard>
    <template v-else>
      <div v-for="g in units" :key="g.unit_id" class="pa-group">
        <div class="group-head">
          <span v-if="unitId == null" class="group-name">{{ g.unit_name }}</span>
          <DewTag v-if="g.is_leader" size="sm" round>我负责</DewTag>
          <DewButton v-if="g.is_leader" type="glass" size="sm" class="group-add"
                     :disabled="session.status === 'archived'" @click="openCreate(g)">发起活动</DewButton>
        </div>
        <div v-if="!g.activities.length" class="group-empty">尚无活动记录</div>
        <div v-else class="act-list">
          <div v-for="a in g.activities" :key="a.id" class="act-row">
            <DewTag size="sm" round :class="`act-type-${a.type}`">{{ a.type_text }}</DewTag>
            <span class="act-title">{{ a.title }}</span>
            <span class="act-date">{{ a.happens_on }}</span>
            <span class="act-count" :title="'成员出席 / 在册'">
              {{ a.marked ? `出席 ${a.present_count}/${a.member_count}` : '未记录出席' }}
            </span>
            <span v-if="a.my_presence === true" class="mine ok">我已出席</span>
            <span v-else-if="a.my_presence === false" class="mine miss">我缺席</span>
            <template v-if="g.is_leader">
              <DewButton type="ghost" size="sm" :disabled="session.status === 'archived'"
                         @click="openMark(g, a)">{{ a.marked ? '改出席' : '记录出席' }}</DewButton>
              <button type="button" class="act-del" @click="delAct(a)">删除</button>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 发起活动 -->
    <DewDialog v-model="createDlg" title="发起项目活动" width="480px">
      <div class="create-form">
        <div class="field-label">类型</div>
        <DewSelect v-model="createForm.type" :options="typeOptions" />
        <div class="field-label">标题 <span class="field-req">必填</span></div>
        <DewInput v-model="createForm.title" size="lg" placeholder="如：周例会 / 市一医院设备科调研" />
        <div class="field-label">日期 <span class="field-req">必填</span></div>
        <DewInput v-model="createForm.happens_on" type="date" />
        <div class="field-label">说明</div>
        <DewInput v-model="createForm.note" type="textarea" :rows="2" placeholder="集合时间地点 / 议题（选填）" />
        <div class="form-actions">
          <DewButton type="ghost" @click="createDlg = false">取消</DewButton>
          <DewButton type="glass" :loading="creating" :disabled="!canCreate" @click="doCreate">发起</DewButton>
        </div>
      </div>
    </DewDialog>

    <!-- 记录出席（负责人勾选，全量替换） -->
    <DewDialog v-model="markDlg" :title="`记录出席 · ${markCtx?.act?.title || ''}`" width="440px">
      <div class="mark-form">
        <div class="mark-hint">勾选当天到场成员（{{ markCtx?.act?.happens_on }}）；保存为全量替换，可随时改。</div>
        <div class="mark-list">
          <label v-for="m in markCtx?.group?.members || []" :key="m.user_id" class="mark-item">
            <input type="checkbox" :value="m.user_id" v-model="markPicked" />
            <span>{{ m.username }}</span>
          </label>
        </div>
        <div class="form-actions">
          <DewButton type="ghost" size="sm" @click="markDlg = false">取消</DewButton>
          <DewButton type="glass" size="sm" :loading="marking" @click="doMark">保存（{{ markPicked.length }} 人出席）</DewButton>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard, DewButton, DewInput, DewTag, DewDialog, DewSelect, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: Number, required: true },
  session: { type: Object, required: true },
  unitId: { type: Number, default: null },        // 传入=只看该项目（看板内嵌）；缺省=全部我参与的
});
const emit = defineEmits(['changed']);

const loading = ref(true);
const allUnits = ref([]);
const units = computed(() => props.unitId == null
  ? allUnits.value
  : allUnits.value.filter((g) => g.unit_id === props.unitId));

const typeOptions = [
  { label: '会议', value: 'meeting' },
  { label: '外出调研', value: 'field_trip' },
  { label: '其他', value: 'other' },
];

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchProjectActivities(props.sid);
    allUnits.value = d.units || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载活动考勤失败');
  } finally { loading.value = false; }
}
onMounted(load);

// ── 发起活动（负责人）──
const createDlg = ref(false);
const createForm = ref({ type: 'meeting', title: '', happens_on: '', note: '' });
const creating = ref(false);
const createGroup = ref(null);
const canCreate = computed(() => !!(createForm.value.title.trim() && createForm.value.happens_on));
function openCreate(g) {
  createGroup.value = g;
  createForm.value = { type: 'meeting', title: '', happens_on: '', note: '' };
  createDlg.value = true;
}
async function doCreate() {
  if (creating.value || !canCreate.value) return;
  creating.value = true;
  try {
    const r = await campService.createProjectActivity(createGroup.value.unit_id, {
      type: createForm.value.type,
      title: createForm.value.title.trim(),
      happens_on: createForm.value.happens_on,
      note: createForm.value.note.trim() || null,
    });
    ElMessage.success(r.message || '活动已发起');
    createDlg.value = false;
    load();
    emit('changed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发起失败');
  } finally { creating.value = false; }
}

// ── 记录出席（负责人勾选，全量替换）──
const markDlg = ref(false);
const markCtx = ref(null);        // {group, act}
const markPicked = ref([]);
const marking = ref(false);
function openMark(group, act) {
  markCtx.value = { group, act };
  markPicked.value = [...(act.present_user_ids || [])];
  markDlg.value = true;
}
async function doMark() {
  if (marking.value) return;
  marking.value = true;
  try {
    const r = await campService.markProjectActivity(markCtx.value.act.id, markPicked.value);
    ElMessage.success(r.message || '已记录');
    markDlg.value = false;
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { marking.value = false; }
}

function delAct(a) {
  ElMessageBox.confirm(`删除活动「${a.title}」（${a.happens_on}）？出席记录一并删除。`, '删除活动', {
    confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    try {
      await campService.deleteProjectActivity(a.id);
      ElMessage.success('已删除');
      load();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '删除失败');
    }
  }).catch(() => {});
}
</script>

<style scoped>
.project-activities { display: flex; flex-direction: column; gap: 14px; }
.pa-loading { padding: 4px 0; }
.pa-empty { padding: 26px 0; }
.empty-text { font-size: 13px; color: var(--dew-text-faint); text-align: center; }

.pa-group { display: flex; flex-direction: column; gap: 8px; }
.group-head { display: flex; align-items: center; gap: 8px; }
.group-name { font-size: 14px; font-weight: 700; color: var(--dew-text-heading); }
.group-add { margin-left: auto; }
.group-empty { font-size: 12.5px; color: var(--dew-text-faint); padding: 4px 0; }

.act-list { display: flex; flex-direction: column; gap: 6px; }
.act-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 9px 14px; border-radius: 10px; background: var(--dew-card-bg, rgba(148,163,184,.06));
}
.act-title { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }
.act-date { font-size: 12.5px; color: var(--dew-text-muted); }
.act-count { font-size: 12.5px; color: var(--dew-text-muted); }
.mine { font-size: 12px; font-weight: 600; }
.mine.ok { color: var(--color-success); }
.mine.miss { color: var(--color-danger, #e5484d); }
.act-row .dew-button { margin-left: auto; }
.act-del {
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--dew-text-faint); transition: color .15s ease;
}
.act-del:hover { color: var(--color-danger, #e5484d); }

.create-form { display: flex; flex-direction: column; gap: 10px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.mark-form { display: flex; flex-direction: column; gap: 12px; }
.mark-hint { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }
.mark-list { display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow: auto; }
.mark-item {
  display: flex; align-items: center; gap: 10px; padding: 6px 10px;
  border-radius: 8px; cursor: pointer; font-size: 13.5px; color: var(--dew-text-heading);
}
.mark-item:hover { background: color-mix(in srgb, var(--dew-text-muted) 8%, transparent); }
</style>
