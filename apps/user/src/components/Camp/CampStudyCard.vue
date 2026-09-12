<template>
  <!-- 学员「学习方向」卡（09-12 方向制）：方向随归属导生继承，课程章节进度由导生按章认证。
       取代原 CampSelection 选课 tab（学生自主选课已整体下线）。 -->
  <div class="camp-study">
    <DewCard v-if="!direction || !course" variant="inset" size="lg" :no-hover="true" class="study-card">
      <div class="study-title">学习方向</div>
      <div class="study-hint">{{ hint || '尚未确定学习方向——归属导生后将自动继承其方向与课程。' }}</div>
    </DewCard>

    <DewCard v-else variant="inset" size="lg" :no-hover="true" class="study-card" v-loading="loading">
      <div class="study-head">
        <div class="study-head-main">
          <div class="study-title">{{ direction }}</div>
          <div class="study-hint">
            方向随归属导生{{ mentorName ? `（${mentorName}）` : '' }}继承；完成章节学习后由导生认证进度。
          </div>
        </div>
        <span v-if="courseStatus === 'completed'" class="study-badge done">课程已完成</span>
      </div>

      <div class="course-row">
        <div class="course-info">
          <div class="course-name">{{ course.title }}</div>
          <div class="course-meta">
            难度 {{ course.difficulty || '—' }} · 章节认证 {{ certifiedChapters }}/{{ totalChapters }}
          </div>
        </div>
        <DewButton size="sm" @click="goStudy">去学习</DewButton>
      </div>

      <div v-if="chapters.length" class="chapter-list">
        <div v-for="ch in chapters" :key="ch.chapter_id" class="chapter-row">
          <span class="chapter-name" :title="ch.name">{{ ch.name }}</span>
          <span class="chapter-meta">自报 {{ ch.lessons_completed }}/{{ ch.lessons }} 课时</span>
          <span :class="['cert-tag', { certified: ch.certified }]">{{ ch.certified ? '已认证' : '未认证' }}</span>
        </div>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DewCard, DewButton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const router = useRouter();
const loading = ref(true);
const data = ref({});

const direction = computed(() => data.value.direction);
const course = computed(() => data.value.course);
const mentorName = computed(() => data.value.mentor_name);
const hint = computed(() => data.value.hint);
const chapters = computed(() => data.value.chapters || []);
const certifiedChapters = computed(() => data.value.certified_chapters || 0);
const totalChapters = computed(() => data.value.total_chapters || 0);
const courseStatus = computed(() => data.value.course_status);

function goStudy() {
  router.push(`/study/details?id=${course.value.course_id}&from=camp`);
}

onMounted(async () => {
  try {
    const r = await campService.fetchMyDirection(props.sid);
    data.value = r.data || r;   // 后端顶层字段（direction/course/chapters/hint）
  } catch { /* 未归属等场景由后端 200+hint 表达；网络错误静默空卡 */ }
  finally { loading.value = false; }
});
</script>

<style scoped>
.study-card { margin-top: 16px; }
.study-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.study-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); }
.study-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-top: 4px; }
.study-badge.done {
  flex-shrink: 0; font-size: 12px; font-weight: 600; color: var(--color-success, #67c23a);
  border: 1px solid color-mix(in srgb, var(--color-success, #67c23a) 45%, transparent);
  border-radius: 999px; padding: 2px 10px;
}
.course-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  border: 1px solid var(--dew-card-border); border-radius: 8px; padding: 12px 14px;
}
.course-name { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.course-meta { font-size: 12.5px; color: var(--dew-text-muted); margin-top: 4px; }
.chapter-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.chapter-row {
  display: flex; align-items: center; gap: 12px; font-size: 13px;
  border-bottom: 1px dashed var(--dew-card-border); padding: 6px 2px;
}
.chapter-row:last-child { border-bottom: none; }
.chapter-name { flex: 1; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-meta { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); }
.cert-tag { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); }
.cert-tag.certified { color: var(--color-success, #67c23a); font-weight: 600; }
</style>
