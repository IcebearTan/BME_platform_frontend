<template>
  <div class="teacher-overview">
    <!-- 阶段与统计 -->
    <div class="stat-grid">
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">营期阶段</div>
        <div class="stat-value">{{ overview?.stage_label || '—' }}</div>
        <div class="stat-sub">{{ overview?.start_date?.slice(5) }} ~ {{ overview?.end_date?.slice(5) }}</div>
      </DewCard>
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">学员 / 导生</div>
        <div class="stat-value">{{ overview?.counts?.students ?? '—' }} <span class="stat-unit">/ {{ overview?.counts?.mentors ?? '—' }}</span></div>
        <div class="stat-sub" :class="{ 'stat-warn': overview?.counts?.unmatched > 0 }">
          {{ overview?.counts?.unmatched > 0 ? `${overview.counts.unmatched} 名学员未分配导生` : '学员均已分配导生' }}
        </div>
      </DewCard>
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">待处理事项</div>
        <div class="stat-value">{{ totalTodos }}</div>
        <div class="stat-sub">{{ totalTodos > 0 ? '请及时处理下列待办' : '当前没有待处理事项' }}</div>
      </DewCard>
    </div>

    <!-- 待办清单（实时投影，点击跳对应子页） -->
    <DewCard v-if="loading" variant="default" size="lg" :no-hover="true">
      <DewSkeleton variant="text" width="30%" />
      <DewSkeleton variant="text" width="80%" style="margin-top: 10px;" />
    </DewCard>
    <DewCard v-else variant="default" size="lg" :no-hover="true">
      <template #header><h3>今日待办</h3></template>
      <div v-if="!workItems.length" class="todo-empty">暂无待办事项</div>
      <div v-else class="todo-list">
        <div v-for="item in workItems" :key="item.key" class="todo-item" @click="goTodo(item.key)">
          <span class="todo-count">{{ item.count }}</span>
          <div class="todo-body">
            <span class="todo-label">{{ item.label }}</span>
            <span v-if="item.key === 'camp.leave.pending' && item.unassigned > 0" class="todo-note">
              其中 {{ item.unassigned }} 条来自未分组学员
            </span>
            <span v-if="item.key === 'camp.student.no_preference' && msDeadlineText" class="todo-note">
              截止 {{ msDeadlineText }}
            </span>
          </div>
          <el-icon class="todo-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </DewCard>

    <!-- 选导生就绪 -->
    <DewCard v-if="overview?.ms_stats" variant="default" size="lg" :no-hover="true" style="margin-top: 16px;">
      <template #header><h3>选导生就绪情况</h3></template>
      <div class="ms-row">
        <span>未发布名片的导生 <b>{{ overview.ms_stats.mentors_without_profile }}</b> 人</span>
        <span class="ms-sep">·</span>
        <span>未提交志愿的学员 <b>{{ overview.ms_stats.students_without_preference }}</b> 人</span>
        <span v-if="msDeadlineText" class="ms-sep">·</span>
        <span v-if="msDeadlineText">志愿截止 {{ msDeadlineText }}</span>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue';
import { DewCard, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});
const emit = defineEmits(['navigate']);

const overview = ref(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchTeacherOverview(props.sid);
    overview.value = d.overview || null;
  } catch { /* 403 等由外壳处理，概览静默 */ }
  finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

const workItems = computed(() => overview.value?.work_items || []);
const totalTodos = computed(() => workItems.value.reduce((s, i) => s + (i.count || 0), 0));
const msDeadlineText = computed(() => {
  const dl = overview.value?.ms_stats?.preference_deadline;
  return dl ? dl.slice(5, 16) : '';
});

// 待办 → 子页跳转（阶段 1 只接报名/请假两页，其余展示计数待后续阶段接入）
function goTodo(key) {
  if (key === 'camp.application.pending' || key === 'camp.mentor_application.pending') {
    emit('navigate', 'admissions');
  } else if (key === 'camp.leave.pending') {
    emit('navigate', 'leaves');
  }
}
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-label { font-size: 12px; color: var(--dew-text-muted); margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--dew-text-heading); }
.stat-unit { font-size: 15px; font-weight: 600; color: var(--dew-text-muted); }
.stat-sub { font-size: 12px; color: var(--dew-text-faint); margin-top: 6px; }
.stat-warn { color: var(--color-warning); }

.todo-empty { padding: 20px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }
.todo-list { display: flex; flex-direction: column; }
.todo-item {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 8px; border-radius: var(--radius-md); cursor: pointer;
  transition: background 0.2s ease;
}
.todo-item:hover { background: var(--dew-ghost-hover-bg); }
.todo-item + .todo-item { border-top: 1px solid var(--dew-card-divider); }
.todo-count {
  min-width: 36px; height: 36px; border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: #fff;
  background: var(--color-primary);
}
.todo-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.todo-label { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.todo-note { font-size: 12px; color: var(--dew-text-faint); }
.todo-arrow { color: var(--dew-text-faint); }

.ms-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dew-text-muted); flex-wrap: wrap; }
.ms-row b { color: var(--dew-text-heading); }
.ms-sep { color: var(--dew-text-faint); }
</style>
