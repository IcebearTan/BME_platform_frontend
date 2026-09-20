<template>
  <div class="teacher-meetings">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <div class="head-row">
          <h3>全营组会（{{ meetings.length }}）</h3>
          <span class="head-hint">只读总览——发起、布置与审阅由各组导生在其工作台完成</span>
        </div>
      </template>

      <div v-if="loading" style="display: flex; flex-direction: column; gap: 8px;">
        <DewSkeleton v-for="n in 4" :key="n" variant="text" :width="n % 2 ? '60%' : '88%'" />
      </div>
      <div v-else-if="!meetings.length" class="empty">本营暂无组会记录</div>
      <div v-else class="mtg-list">
        <DewCard v-for="m in meetings" :key="m.id" variant="inset" size="sm"
                 :interactive="true" style="margin: 8px 0;" @click="openDetail(m)">
          <div class="mtg-row">
            <DewTag size="sm" :round="true" :type="m.has_minutes ? 'success' : 'warning'">
              {{ m.has_minutes ? '已归档' : '进行中' }}
            </DewTag>
            <span class="mtg-team">{{ m.team_label }}</span>
            <span class="mtg-title">{{ m.title }}</span>
            <span class="mtg-date">{{ m.meeting_date }}</span>
            <span class="mtg-count">任务 {{ m.task_count }}</span>
            <span v-if="m.chapter_count" class="mtg-count">课内 {{ m.chapter_count }} 章</span>
            <el-icon class="mtg-arrow"><ArrowRight /></el-icon>
          </div>
        </DewCard>
      </div>
    </DewCard>

    <!-- 详情（复用组会详情弹窗；老师视角 _can_manage=False → 纯只读，无编辑/审阅入口） -->
    <MeetingDetail v-model="detailVisible" :sid="sid" :meeting-id="detailId" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue';
import { DewCard, DewTag, DewSkeleton } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';
import MeetingDetail from './MeetingDetail.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});

const meetings = ref([]);
const loading = ref(true);
const detailVisible = ref(false);
const detailId = ref(null);

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchCampMeetingsAll(props.sid);
    meetings.value = d.meetings || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载全营组会失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

function openDetail(m) {
  detailId.value = m.id;
  detailVisible.value = true;
}
</script>

<style scoped>
.head-row { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
.head-row h3 { margin: 0; }
.head-hint { font-size: 12px; color: var(--dew-text-faint); }
.empty { padding: 28px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }
.mtg-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mtg-team { font-size: 12px; color: var(--dew-text-faint); min-width: 60px; }
.mtg-title { font-weight: 600; color: var(--dew-text-heading); flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mtg-date { font-size: 12px; color: var(--dew-text-muted); }
.mtg-count { font-size: 12px; color: var(--dew-text-muted); }
.mtg-arrow { color: var(--dew-text-faint); }
</style>
