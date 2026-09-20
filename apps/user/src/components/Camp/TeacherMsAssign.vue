<template>
  <div class="ms-assign">
    <!-- 统计条 + 导出 -->
    <DewCard variant="default" size="lg" :no-hover="true">
      <div class="ops-head">
        <div class="ops-stats">
          <span>学员 <b>{{ stats.students }}</b></span>
          <span class="sep">·</span>
          <span>已分配 <b>{{ stats.assigned }}</b></span>
          <span class="sep">·</span>
          <span class="warn"><b>{{ stats.unassigned }}</b> 未分配</span>
          <span class="sep">·</span>
          <span><b>{{ stats.submitted }}</b> 已交志愿</span>
        </div>
        <DewButton size="sm" type="ghost" :loading="exporting" @click="exportCsv">
          导出志愿 CSV
        </DewButton>
      </div>
      <div class="ops-hint">线下协调可在 CSV 中完成后粘贴回管理端，也可直接在下表指派后批量提交</div>
    </DewCard>

    <!-- 导生名额概览 -->
    <DewCard variant="default" size="lg" :no-hover="true" style="margin-top: 14px;">
      <template #header><h3>导生名额（{{ mentors.length }}）</h3></template>
      <div v-if="!mentors.length" class="empty">本营暂无导生</div>
      <div v-else class="mentor-chips">
        <div v-for="m in mentors" :key="m.user_id" class="mentor-chip" :class="{ full: isFull(m) }">
          <span class="chip-name">{{ m.username }}</span>
          <span v-if="m.tag" class="chip-tag">{{ m.tag }}</span>
          <span class="chip-cap">{{ m.matched }}/{{ m.capacity == null ? '不限' : m.capacity }}</span>
          <span v-if="!m.has_profile" class="chip-warn">未发名片</span>
        </div>
      </div>
    </DewCard>

    <!-- 学员指派表 -->
    <DewCard variant="default" size="lg" :no-hover="true" style="margin-top: 14px;">
      <template #header><h3>学员指派（未分配 {{ unassignedRows.length }}）</h3></template>
      <div v-if="loading" style="display: flex; flex-direction: column; gap: 8px;">
        <DewSkeleton v-for="n in 4" :key="n" variant="text" :width="n % 2 ? '70%' : '90%'" />
      </div>
      <div v-else-if="!students.length" class="empty">本营暂无学员</div>
      <template v-else>
        <div class="list-toolbar">
          <DewButtonBar :items="filterItems" v-model="filter" stretch />
        </div>
        <div class="stu-list">
          <div v-for="s in filteredStudents" :key="s.user_id" class="stu-row"
            :class="{ assigned: !!s.team_mentor_id }">
            <div class="stu-main">
              <span class="stu-name">{{ s.username }}</span>
              <span v-if="s.team_mentor_id" class="stu-mentor">已归属 {{ s.team_mentor_name }}</span>
              <span v-else class="stu-prefs">
                <template v-if="s.preferences.length">
                  志愿：<span v-for="(p, i) in s.preferences" :key="p.rank">
                    <span :class="{ 'pref-first': i === 0 }">{{ p.mentor_name }}</span>
                    <span v-if="i < s.preferences.length - 1"> → </span>
                  </span>
                </template>
                <span v-else class="pref-none">未交志愿</span>
              </span>
            </div>
            <DewSelect v-if="!s.team_mentor_id" v-model="picks[s.user_id]" size="sm"
              class="stu-pick" placeholder="选择导生"
              :options="mentorOptions" />
          </div>
        </div>
        <div class="submit-bar">
          <span class="submit-hint">已勾选 {{ pickedCount }} 名学员的归属导生</span>
          <DewButton type="glass" :disabled="!pickedCount || submitting" :loading="submitting"
            @click="submitBatch">批量指派（{{ pickedCount }}）</DewButton>
        </div>
      </template>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewButton, DewButtonBar, DewCard, DewSelect, DewSkeleton } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});
const emit = defineEmits(['reviewed']);

const students = ref([]);
const mentors = ref([]);
const stats = ref({ students: 0, assigned: 0, unassigned: 0, submitted: 0 });
const picks = ref({});          // student_user_id -> mentor_user_id（本地勾选，未提交）
const loading = ref(true);
const submitting = ref(false);
const exporting = ref(false);
const filter = ref('unassigned');

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchAssignRoster(props.sid);
    students.value = d.roster?.students || [];
    mentors.value = d.roster?.mentors || [];
    stats.value = d.roster?.stats || stats.value;
    picks.value = {};
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载指派名册失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

const unassignedRows = computed(() => students.value.filter((s) => !s.team_mentor_id));
const filterItems = [
  { value: 'unassigned', label: `未分配（${unassignedRows.value.length}）` },
  { value: 'all', label: `全部（${students.value.length}）` },
];
const filteredStudents = computed(() =>
  (filter.value === 'unassigned' ? unassignedRows.value : students.value));
const mentorOptions = computed(() =>
  mentors.value.map((m) => ({
    label: `${m.username}${m.tag ? ' · ' + m.tag : ''}（${m.matched}/${m.capacity == null ? '不限' : m.capacity}）`,
    value: m.user_id,
  })));
const pickedCount = computed(
  () => unassignedRows.value.filter((s) => picks.value[s.user_id]).length);

const isFull = (m) => m.capacity != null && m.matched >= m.capacity;

async function submitBatch() {
  const pairs = unassignedRows.value
    .filter((s) => picks.value[s.user_id])
    .map((s) => ({ student_user_id: s.user_id, mentor_user_id: picks.value[s.user_id] }));
  if (!pairs.length) return;
  submitting.value = true;
  try {
    const r = await campService.batchAssignMentors(props.sid, pairs);
    const results = r.results || [];
    const ok = results.filter((x) => x.status === 'assigned').length;
    const skipped = results.filter((x) => x.status === 'skipped').length;
    const failed = results.filter((x) => x.status !== 'assigned' && x.status !== 'skipped');
    ElMessage.success(`已指派 ${ok} 名学员${skipped ? `，跳过 ${skipped} 名` : ''}`);
    if (failed.length) {
      ElMessage.warning(`${failed.length} 名未成功：${failed.map((f) => f.message).join('；')}`);
    }
    emit('reviewed');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量指派失败');
  } finally { submitting.value = false; }
}

async function exportCsv() {
  exporting.value = true;
  try {
    const res = await campService.exportPreferencesCsv(props.sid);
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `camp_${props.sid}_preferences.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    ElMessage.error('导出失败');
  } finally { exporting.value = false; }
}
</script>

<style scoped>
.ops-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ops-stats { font-size: 13px; color: var(--dew-text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ops-stats b { color: var(--dew-text-heading); }
.ops-stats .warn b { color: var(--color-warning); }
.ops-stats .sep { color: var(--dew-text-faint); }
.ops-hint { margin-top: 8px; font-size: 12px; color: var(--dew-text-faint); }

.mentor-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.mentor-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px; border-radius: var(--radius-full);
  border: 1px solid var(--dew-card-border); font-size: 12.5px;
}
.mentor-chip.full { opacity: 0.6; }
.chip-name { font-weight: 600; color: var(--dew-text-heading); }
.chip-tag { color: var(--dew-text-muted); }
.chip-cap { color: var(--dew-text-faint); }
.chip-warn { color: var(--color-warning); }

.list-toolbar { margin-bottom: 10px; }
.stu-list { display: flex; flex-direction: column; }
.stu-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 6px;
}
.stu-row + .stu-row { border-top: 1px solid var(--dew-card-divider); }
.stu-row.assigned .stu-name { color: var(--dew-text-muted); }
.stu-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.stu-name { font-weight: 600; min-width: 64px; }
.stu-mentor { font-size: 12.5px; color: var(--color-success); }
.stu-prefs { font-size: 12.5px; color: var(--dew-text-faint); }
.pref-first { color: var(--dew-text-muted); font-weight: 600; }
.pref-none { color: var(--color-warning); opacity: 0.8; }
.stu-pick { width: 260px; flex-shrink: 0; }

.submit-bar {
  display: flex; align-items: center; justify-content: flex-end; gap: 12px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--dew-card-divider);
}
.submit-hint { font-size: 12px; color: var(--dew-text-faint); }
.empty { padding: 20px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }
</style>
