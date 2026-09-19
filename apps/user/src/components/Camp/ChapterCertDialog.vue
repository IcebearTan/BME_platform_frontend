<template>
  <!-- 章节认证共享弹窗（09-19 抽自组会审阅，供组会矩阵与学员进度看板同用）：
       未认证=打分可空；已认证=改分/撤销。写走 campService.certifyChapter /
       revokeChapterCertification（team/progress/certify 幂等端点，带 score=免撤销改分）。 -->
  <DewDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
             title="章节认证" width="420px">
    <div class="cert-form">
      <p class="cert-line">
        {{ student?.username }} · {{ chapter?.course_title }} /
        {{ chapterTitle }}
        <template v-if="cert">
          （已认证{{ cert.score != null ? ` ${cert.score} 分` : '，未打分' }}）
        </template>
      </p>
      <div class="cert-field">分数（0-100，留空 = 只认证不打分）</div>
      <DewInput :model-value="score" @update:model-value="score = $event"
                placeholder="如 88，可留空" @keydown.enter="save" />
      <div v-if="!scoreValid" class="cert-err">分数须为 0-100 的整数或留空</div>
      <div class="cert-actions">
        <DewButton v-if="cert" type="danger" size="sm"
                   :loading="saving" @click="revoke">撤销认证</DewButton>
        <DewButton v-else type="ghost" size="sm" @click="$emit('update:modelValue', false)">取消</DewButton>
        <DewButton type="glass" size="sm" :loading="saving"
                   :disabled="!scoreValid || readonly" @click="save">
          {{ cert ? '保存' : '认证' }}
        </DewButton>
      </div>
    </div>
  </DewDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewDialog, DewButton, DewInput } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sid: { type: Number, required: true },
  student: { type: Object, default: null },     // {user_id, username}
  chapter: { type: Object, default: null },     // {chapter_id, name|chapter_title, course_title}
  cert: { type: Object, default: null },        // {score} | null（null=未认证）
  readonly: { type: Boolean, default: false },  // 结营只读
});
const emit = defineEmits(['update:modelValue', 'done']);

const chapterTitle = computed(() => props.chapter?.name || props.chapter?.chapter_title || '');
const score = ref('');
const saving = ref(false);
const scoreValid = computed(() => /^$|^(100|[1-9]?\d)$/.test(score.value.trim()));

watch(() => props.modelValue, (open) => {
  if (open) score.value = props.cert?.score != null ? String(props.cert.score) : '';
});

async function save() {
  if (saving.value || !scoreValid.value || props.readonly) return;
  saving.value = true;
  try {
    await campService.certifyChapter(
      props.sid, props.student.user_id, props.chapter.chapter_id,
      score.value.trim() === '' ? null : Number(score.value.trim()));
    ElMessage.success(props.cert ? '已更新认证' : '已认证');
    emit('update:modelValue', false);
    emit('done');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '认证失败');
  } finally { saving.value = false; }
}
async function revoke() {
  if (saving.value) return;
  saving.value = true;
  try {
    await campService.revokeChapterCertification(
      props.sid, props.student.user_id, props.chapter.chapter_id);
    ElMessage.success('已撤销认证');
    emit('update:modelValue', false);
    emit('done');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '撤销失败');
  } finally { saving.value = false; }
}
</script>

<style scoped>
.cert-form { display: flex; flex-direction: column; gap: 8px; }
.cert-line { margin: 0; font-size: 13px; font-weight: 600; color: var(--dew-text-heading); line-height: 1.6; }
.cert-field { font-size: 12.5px; color: var(--dew-text-muted); }
.cert-err { font-size: 12px; color: var(--color-danger, #e5484d); }
.cert-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.cert-actions .dew-button:first-child { margin-right: auto; }
</style>
