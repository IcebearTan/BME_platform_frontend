<template>
  <!-- 学员「学习方向」卡（09-12 方向制；09-13 多课）：方向随归属导生继承全部课程，
       各课章节进度由导生按章认证（含 0-100 评分，课程均分聚合展示）。 -->
  <div class="camp-study">
    <DewCard v-if="!direction || !courses.length" variant="inset" size="lg" :no-hover="true" class="study-card">
      <div class="study-title">学习方向</div>
      <div class="study-hint">{{ hint || '尚未确定学习方向——归属导生后将自动继承其方向与全部课程。' }}</div>
    </DewCard>

    <DewCard v-else variant="inset" size="lg" :no-hover="true" class="study-card" v-loading="loading">
      <div class="study-head">
        <div class="study-head-main">
          <div class="study-title">{{ direction }}</div>
          <div class="study-hint">
            方向随归属导生{{ mentorName ? `（${mentorName}）` : '' }}继承；完成章节学习后由导生认证进度。
          </div>
        </div>
        <span class="course-count">{{ courses.length }} 门课程</span>
      </div>

      <div v-for="c in courses" :key="c.course_id" class="course-block">
        <div class="course-row">
          <div class="course-info">
            <div class="course-name">
              {{ c.course_title }}
              <span v-if="c.course_status === 'completed'" class="study-badge done">已完成</span>
            </div>
            <div class="course-meta">
              难度 {{ c.difficulty || '—' }} · 章节认证 {{ c.certified_chapters }}/{{ c.total_chapters }}<template v-if="c.score_avg != null"> · 均分 {{ c.score_avg }}</template>
            </div>
          </div>
          <DewButton size="sm" @click="goStudy(c)">去学习</DewButton>
        </div>

        <div v-if="c.chapters.length" class="chapter-list">
          <div v-for="ch in c.chapters" :key="ch.chapter_id" class="chapter-row">
            <span class="chapter-name" :title="ch.name">{{ ch.name }}</span>
            <span class="chapter-meta">自报 {{ ch.lessons_completed }}/{{ ch.lessons }} 课时</span>
            <span :class="['cert-tag', { certified: ch.certified }]">
              {{ ch.certified ? (ch.score != null ? `已认证（${ch.score} 分）` : '已认证') : '未认证' }}
            </span>
          </div>
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
const courses = computed(() => data.value.courses || []);
const mentorName = computed(() => data.value.mentor_name);
const hint = computed(() => data.value.hint);

function goStudy(course) {
  router.push(`/study/details?id=${course.course_id}&from=camp`);
}

onMounted(async () => {
  try {
    const r = await campService.fetchMyDirection(props.sid);
    data.value = r.data || r;   // 后端顶层字段（direction/courses/hint）
  } catch { /* 未归属等场景由后端 200+hint 表达；网络错误静默空卡 */ }
  finally { loading.value = false; }
});
</script>

<style scoped>
.study-card { margin-top: 16px; }
.study-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.study-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); }
.study-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-top: 4px; }
.course-count { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); padding-top: 3px; }
.study-badge.done {
  font-size: 11px; font-weight: 600; color: var(--color-success, #67c23a);
  border: 1px solid color-mix(in srgb, var(--color-success, #67c23a) 45%, transparent);
  border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: middle;
}
.course-block + .course-block { margin-top: 14px; }
.course-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  border: 1px solid var(--dew-card-border); border-radius: 8px; padding: 12px 14px;
}
.course-name { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.course-meta { font-size: 12.5px; color: var(--dew-text-muted); margin-top: 4px; }
.chapter-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding: 0 2px; }
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
