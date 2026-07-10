<template>
  <div class="camp-selection">
    <DewCard variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
      <template #header><h3>可选课程</h3></template>
      <div v-if="loading" v-loading="true" style="min-height: 80px;"></div>
      <div v-else-if="!available.length" class="empty">暂无可选课程（或已全部选完）</div>
      <div v-else class="course-grid">
        <DewCard v-for="c in available" :key="c.course_id" variant="inset" size="sm"
                 :interactive="true" style="margin: 8px; min-width: 200px;">
          <div class="course-title">{{ c.title }}</div>
          <div class="course-meta">难度：{{ c.difficulty || '—' }}</div>
          <DewButton size="sm" type="glass" @click="pick(c.course_id)">选课</DewButton>
        </DewCard>
      </div>
    </DewCard>

    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>已选课程</h3></template>
      <div v-if="!mine.length" class="empty">还未选课</div>
      <div v-else class="course-grid">
        <DewCard v-for="c in mine" :key="c.course_id" variant="inset" size="sm"
                 accent="success" style="margin: 8px; min-width: 200px;">
          <div class="course-title">{{ c.title }}</div>
          <DewButton size="sm" type="glass" @click="goStudy(c.course_id)">去学习</DewButton>
        </DewCard>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { DewCard, DewButton } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });
const router = useRouter();

const courses = ref([]);
const mine = ref([]);
const loading = ref(false);

const mineIds = computed(() => new Set(mine.value.map((c) => c.course_id)));
const available = computed(() => courses.value.filter((c) => !mineIds.value.has(c.course_id)));

async function load() {
  loading.value = true;
  try {
    const [c, m] = await Promise.all([
      campService.fetchCourses(props.sid),
      campService.fetchMyCourses(props.sid),
    ]);
    courses.value = c.courses || [];
    mine.value = m.courses || [];
  } catch {
    ElMessage.error('加载课程失败');
  } finally {
    loading.value = false;
  }
}

async function pick(course_id) {
  try {
    await campService.pickCourse(props.sid, course_id);
    ElMessage.success('选课成功');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '选课失败');
  }
}

// 跳到既有课程详情页学习（带 from=camp，详情页返回时回到本营期选课 Tab）
function goStudy(courseId) {
  router.push({ path: '/study/details', query: { id: courseId, from: 'camp' } });
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.course-grid { display: flex; flex-wrap: wrap; }
.course-title { font-weight: 600; margin-bottom: 4px; }
.course-meta { font-size: 12px; color: #909399; margin-bottom: 8px; }
.empty { color: #909399; padding: 16px 0; }
</style>
