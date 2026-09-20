<template>
  <!-- 布置进度（独立弹窗，2026-09-18）：一次组会的课内章节 + 课外任务编辑。
       交互独立——从列表卡右下角「去布置」或创建组会后直达打开；组会详情只负责查看，
       编辑一律走本弹窗（与「提交纪要」弹窗同层，互不叠放）。仅 team 域有课内章节。 -->
  <DewDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
             :title="`布置 · ${meeting?.title || ''}`" width="min(720px, 96vw)">
    <div v-if="loading" class="ma-loading">
      <DewSkeleton variant="rect" width="100%" height="200" rounded="8px" />
    </div>
    <div v-else-if="!detail" class="ma-none">组会不存在或已被删除。</div>
    <div v-else class="assign-form">
      <div v-if="fresh" class="ma-banner">
        组会已创建（第 1 步完成）。现在布置本期的课外任务与课内进度（第 2 步）；
        开完会后回到列表卡「提交纪要」归档（第 3 步）。
      </div>

      <template v-if="detail.chapter_catalog">
        <div class="field-label">课内章节（到下次组会前完成认证，可多选）</div>
        <div v-for="course in detail.chapter_catalog" :key="course.course_id" class="course-group">
          <div class="course-name">{{ course.course_title }}</div>
          <div class="chapter-chips">
            <button v-for="ch in course.chapters" :key="ch.id" type="button"
                    :class="['ch-chip', { on: form.chapters.includes(ch.id) }]"
                    @click="toggleChapter(ch.id)">{{ ch.name }}</button>
          </div>
        </div>
        <div v-if="!detail.chapter_catalog.some((c) => c.chapters.length)" class="ma-none">
          方向课程暂无章节，先在营期设置的分类方向中绑定课程。
        </div>
      </template>

      <div class="field-label">课外任务</div>
      <div v-for="(t, i) in form.tasks" :key="i" class="task-edit">
        <div class="task-edit-row">
          <DewInput v-model="t.title" size="sm" class="task-title-input"
                    placeholder="任务标题（如：读一篇方向综述并写笔记）" />
          <DewSelect v-model="t.submit_type" size="sm" class="task-type" :options="typeOptions" />
          <button type="button" class="row-x" title="移除该任务" @click="form.tasks.splice(i, 1)">×</button>
        </div>
        <DewInput v-model="t.note" size="sm" class="task-note-input"
                  placeholder="说明（选填，写给组员看的任务要求）" />
        <div class="task-life-row">
          <label class="life-item">
            <span class="life-label">截止</span>
            <input v-model="t.due_at" type="datetime-local" class="life-due"
                   :min="todayLocal" />
          </label>
          <label class="life-item life-switch" title="必交任务才计逾期与到期提醒">
            <span class="life-label">必交</span>
            <DewSwitch v-model="t.required" size="sm" />
          </label>
          <label class="life-item life-switch" title="关闭后过截止不再接收提交">
            <span class="life-label">允许迟交</span>
            <DewSwitch v-model="t.allow_late" size="sm" />
          </label>
        </div>
      </div>

      <div class="assign-actions">
        <DewButton type="ghost" size="sm" @click="addTask">添加任务</DewButton>
        <DewButton type="glass" size="sm" :loading="saving" :disabled="!canSave || !writable"
                   @click="save">保存布置</DewButton>
      </div>
      <div class="assign-hint">已有人提交的任务不会被删除（保护学生数据），只能改标题与说明。设了截止的必交任务会在截止前 24 小时与逾期时自动提醒。</div>
    </div>
  </DewDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewDialog, DewButton, DewInput, DewSelect, DewSkeleton, DewSwitch } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sid: { type: Number, required: true },
  meetingId: { type: Number, default: null },
  campStatus: { type: String, default: null },   // archived 时整体只读
  fresh: { type: Boolean, default: false },      // 创建组会后直达：顶部三步引导条
});
const emit = defineEmits(['update:modelValue', 'saved']);

const writable = computed(() => props.campStatus !== 'archived');
const loading = ref(false);
const detail = ref(null);
const meeting = computed(() => detail.value?.meeting || null);
const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().slice(0, 16);

const typeOptions = [
  { label: '文字或文件', value: 'any' },
  { label: '需交文件', value: 'file' },
  { label: '需交文字', value: 'text' },
];
const form = ref({ chapters: [], tasks: [] });
const saving = ref(false);
const canSave = computed(() => form.value.tasks.every((t) => t.title.trim()));

// ISO → datetime-local（'2026-09-25T18:00' 形）；无截止空串
const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '');

watch(() => [props.modelValue, props.meetingId], async ([open]) => {
  if (!open || !props.meetingId) return;
  loading.value = true;
  try {
    detail.value = await campService.fetchMeetingDetail(props.meetingId);
    form.value = {
      chapters: (detail.value.chapters || []).map((c) => c.chapter_id),
      tasks: (detail.value.tasks || []).map((t) => ({
        id: t.id, title: t.title, note: t.note || '', submit_type: t.submit_type,
        due_at: toLocalInput(t.due_at),
        required: t.required !== false, allow_late: t.allow_late !== false })),
    };
  } catch (e) {
    detail.value = null;
    ElMessage.error(e.response?.data?.message || '加载布置失败');
  } finally { loading.value = false; }
});

function toggleChapter(chapterId) {
  const arr = form.value.chapters;
  const i = arr.indexOf(chapterId);
  if (i >= 0) arr.splice(i, 1); else arr.push(chapterId);
}
function addTask() {
  form.value.tasks.push({
    id: null, title: '', note: '', submit_type: 'any',
    due_at: '', required: true, allow_late: true,
  });
}
async function save() {
  if (saving.value || !canSave.value || !writable.value) return;
  saving.value = true;
  try {
    await campService.saveMeetingAssignments(props.meetingId, {
      chapters: form.value.chapters,
      tasks: form.value.tasks.map((t) => ({
        ...(t.id ? { id: t.id } : {}), title: t.title.trim(),
        note: (t.note || '').trim() || null, submit_type: t.submit_type,
        due_at: (t.due_at || '').trim() || null,
        required: !!t.required, allow_late: !!t.allow_late })),
    });
    ElMessage.success('布置已保存');
    emit('update:modelValue', false);
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存布置失败');
  } finally { saving.value = false; }
}
</script>

<style scoped>
.ma-loading { padding: 4px 0; }
.ma-none { font-size: 12.5px; color: var(--dew-text-faint); padding: 4px 0; }
.assign-form { display: flex; flex-direction: column; gap: 4px; }

.ma-banner {
  font-size: 12.5px; color: var(--color-primary); line-height: 1.6;
  padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.field-label { font-size: 12.5px; font-weight: 600; color: var(--dew-text-muted); margin-top: 4px; }
.course-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.course-name { font-size: 12.5px; font-weight: 650; color: var(--dew-text-heading); }
.chapter-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ch-chip {
  padding: 3px 12px; border-radius: 999px; font-size: 12.5px; cursor: pointer;
  border: 1px solid var(--dew-card-border);
  background: transparent; color: var(--dew-text-muted);
  transition: transform 0.2s var(--dew-bounce, ease), color 0.2s ease, border-color 0.2s ease;
}
.ch-chip:hover { transform: translateY(-1px); }
.ch-chip.on {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}
.task-edit { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.task-edit-row { display: flex; align-items: center; gap: 8px; }
.task-title-input { flex: 1; min-width: 0; }
.task-type { width: 130px; flex: none; }
.task-note-input { width: 100%; }
/* 生命周期行（migrate_44）：截止/必交/允许迟交 */
.task-life-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.life-item { display: inline-flex; align-items: center; gap: 6px; }
.life-label { font-size: 12px; color: var(--dew-text-faint); }
.life-due {
  border: 1px solid var(--dew-input-border, var(--dew-card-border));
  border-radius: 8px; padding: 4px 8px; font-size: 12.5px;
  background: transparent; color: var(--dew-text);
  font-family: inherit;
}
.row-x {
  border: none; background: none; padding: 0 4px; cursor: pointer; line-height: 1;
  font-size: 15px; color: var(--dew-text-faint);
}
.row-x:hover { color: var(--color-danger, #e5484d); }
.assign-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.assign-hint { font-size: 12px; color: var(--dew-text-faint); }
</style>
