<template>
  <!-- 章节材料面板（09-20 从 CampStudyCard 抽共享）：本人材料列表 + 提交盒。
       自含加载/提交/删除/下载；父层用 v-if 控制挂载（每次展开即新拉），
       saved/removed 回传供父层刷新 material_count 等聚合计数。
       双消费方：学习方向卡（CampStudyCard）+ 组会详情课内区（MeetingDetail）——
       布置在组会、提交也进组会域，不再只藏在个人进度页。 -->
  <div class="mat-panel" v-loading="loading">
    <div v-if="!materials.length && !loading" class="mat-empty">尚无材料——提交学习记录或成果文件，供导生认证时参考</div>
    <div v-for="m in materials" :key="m.id" class="mat-row">
      <div class="mat-main">
        <div v-if="m.content" class="mat-content">{{ m.content }}</div>
        <div v-if="m.attachments?.length" class="mat-atts">
          <button v-for="a in m.attachments" :key="a.id" type="button"
                  class="att-link" @click="downloadAtt(a)">
            {{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}
          </button>
        </div>
        <span class="mat-time">{{ (m.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
      </div>
      <DewButton v-if="writable" type="ghost" size="sm" @click="removeMaterial(m)">删除</DewButton>
    </div>

    <div v-if="writable" class="mat-submit">
      <DewInput v-model="draft.content" type="textarea" :rows="2"
                placeholder="章节材料说明（实验记录 / 学习心得，选填）" />
      <input ref="fileInput" type="file" multiple class="file-input-hidden" @change="onFiles" />
      <div class="mat-submit-row">
        <DewButton type="ghost" size="sm" @click="fileInput?.click()">
          {{ draft.files.length ? `附件 ×${draft.files.length}` : '选择附件' }}
        </DewButton>
        <DewButton type="glass" size="sm" :loading="submitting"
                   :disabled="!draft.content.trim() && !draft.files.length"
                   @click="submitMaterial">提交材料</DewButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewButton, DewInput } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  chapterId: { type: Number, required: true },
  writable: { type: Boolean, default: true },   // 结营只读时隐藏提交盒/删除钮
});
const emit = defineEmits(['saved', 'removed']);

const loading = ref(false);
const materials = ref([]);
const submitting = ref(false);
const draft = ref({ content: '', files: [] });
const fileInput = ref(null);

async function loadMaterials() {
  loading.value = true;
  try {
    const d = await campService.fetchChapterMaterials(props.sid, { chapter_id: props.chapterId });
    materials.value = d.materials || [];
  } catch (e) {
    materials.value = [];
    ElMessage.error(e.response?.data?.message || '加载材料失败');
  } finally { loading.value = false; }
}

function onFiles(e) {
  draft.value.files = [...e.target.files];
  e.target.value = '';
}

async function submitMaterial() {
  if (submitting.value || (!draft.value.content.trim() && !draft.value.files.length)) return;
  submitting.value = true;
  try {
    const r = await campService.submitChapterMaterial(
      props.sid, props.chapterId, draft.value.content.trim(), draft.value.files);
    ElMessage.success(r.message || '材料已提交');
    draft.value = { content: '', files: [] };
    await loadMaterials();
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally { submitting.value = false; }
}

// 附件下载：先换短签直连再开新窗（裸链带不了 Authorization 头）
async function downloadAtt(a) {
  try {
    const url = await campService.fetchMaterialAttachmentUrl(a.id);
    window.open(url, '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败');
  }
}

async function removeMaterial(m) {
  try {
    await ElMessageBox.confirm('删除后导生将不再可见，确定删除这条材料？', '删除材料',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    await campService.deleteChapterMaterial(m.id);
    ElMessage.success('已删除');
    await loadMaterials();
    emit('removed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

onMounted(loadMaterials);
</script>

<style scoped>
.mat-panel {
  display: flex; flex-direction: column; gap: 10px; margin: 2px 0 8px;
  border: 1px dashed var(--dew-card-border); border-radius: 8px; padding: 10px 12px;
}
.mat-empty { font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.7; }
.mat-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 6px 0; border-bottom: 1px dashed var(--dew-card-border);
}
.mat-row:last-of-type { border-bottom: none; }
.mat-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mat-content { font-size: 13px; color: var(--dew-text-heading); line-height: 1.6; word-break: break-word; }
.mat-atts { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.att-link {
  border: none; background: none; padding: 0; cursor: pointer; text-align: left;
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.att-link:hover { opacity: 0.8; }
.mat-time { font-size: 11.5px; color: var(--dew-text-faint); }
.mat-submit { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; padding-top: 8px; border-top: 1px dashed var(--dew-card-border); }
.mat-submit-row { display: flex; justify-content: flex-end; gap: 8px; }
.file-input-hidden { display: none; }
</style>
