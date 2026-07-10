<template>
  <div class="camp-selection">
    <!-- 可选课程 -->
    <DewCard variant="default" size="lg" :no-hover="true" class="section-card">
      <template #header>
        <div class="section-header">
          <h3>可选课程</h3>
          <span class="section-hint">营期内可选 · 选课后计入营期学习</span>
        </div>
      </template>
      <div v-if="loading" v-loading="true" class="loading"></div>
      <div v-else-if="!available.length" class="empty">
        <el-icon class="empty-icon"><Select /></el-icon>
        <span>暂无可选课程（或已全部选完）</span>
      </div>
      <div v-else class="course-grid">
        <DewCard v-for="c in available" :key="c.course_id" variant="inset" size="sm" class="course-card">
          <div class="card-cover" :style="coverStyle(c.difficulty)">
            <el-icon class="cover-icon"><Reading /></el-icon>
            <span class="diff-badge" :class="diffClass(c.difficulty)">{{ diffLabel(c.difficulty) }}</span>
          </div>
          <div class="card-meta">
            <div class="course-title" :title="c.title">{{ c.title }}</div>
            <div class="card-actions">
              <DewButton size="sm" type="ghost" @click="goCourse(c.course_id)">详情</DewButton>
              <DewButton size="sm" type="glass" @click="pick(c.course_id)">选课</DewButton>
            </div>
          </div>
        </DewCard>
      </div>
    </DewCard>

    <!-- 我的营期课程（营期内在学） -->
    <DewCard variant="default" size="lg" :no-hover="true" class="section-card">
      <template #header>
        <div class="section-header">
          <h3>我的营期课程</h3>
          <span class="section-hint">本营期内已选 · 进度在课程页自行管理</span>
        </div>
      </template>
      <div v-if="!mine.length" class="empty">
        <el-icon class="empty-icon"><Collection /></el-icon>
        <span>还未选课，从上方「可选课程」开始</span>
      </div>
      <div v-else class="course-grid">
        <DewCard v-for="c in mine" :key="c.course_id" variant="inset" size="sm" tinted accent="success" class="course-card enrolled">
          <div class="card-cover" :style="coverStyle(c.difficulty)">
            <el-icon class="cover-icon"><Reading /></el-icon>
            <span class="status-badge">
              <el-icon><CircleCheckFilled /></el-icon>已选
            </span>
          </div>
          <div class="card-meta">
            <div class="course-title" :title="c.title">{{ c.title }}</div>
            <div class="card-actions">
              <DewButton size="sm" type="glass" @click="goCourse(c.course_id)">去学习</DewButton>
            </div>
          </div>
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
import { Reading, Select, Collection, CircleCheckFilled } from '@element-plus/icons-vue';
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

// 跳到既有课程详情页（带 from=camp，详情页返回时回到本营期选课 Tab）
function goCourse(courseId) {
  router.push({ path: '/study/details', query: { id: courseId, from: 'camp' } });
}

// ── 难度色板（封面渐变 + badge） ──
const DIFF_MAP = {
  1: { label: '入门', cls: 'easy', hue: 150 },
  2: { label: '较易', cls: 'easy', hue: 170 },
  3: { label: '中等', cls: 'medium', hue: 38 },
  4: { label: '较难', cls: 'hard', hue: 18 },
  5: { label: '困难', cls: 'hard', hue: 0 },
};
function diffInfo(d) {
  const n = Number(d);
  if (!n || n < 1 || n > 5) return { label: '未分级', cls: 'unknown', hue: 220 };
  return DIFF_MAP[n];
}
const diffLabel = (d) => diffInfo(d).label;
const diffClass = (d) => 'diff-' + diffInfo(d).cls;
function coverStyle(d) {
  const { hue } = diffInfo(d);
  return { background: `linear-gradient(135deg, hsl(${hue}, 68%, 62%), hsl(${hue + 28}, 72%, 50%))` };
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.camp-selection { display: flex; flex-direction: column; gap: 16px; }

.section-card { width: 100%; }
.section-header { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.section-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.section-hint { font-size: 12px; color: var(--dew-text-muted, #909399); }

.loading { min-height: 120px; }

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

/* 课程卡：去掉 body 默认 padding，让封面撑满顶部 */
.course-card { transition: transform 0.3s var(--dew-bounce, ease); }
.course-card:hover { transform: translateY(-3px); }
.course-card :deep(.dew-card__body) { padding: 0; }

.card-cover {
  position: relative;
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
}
.cover-icon { font-size: 32px; opacity: 0.82; transition: transform 0.3s ease; }
.course-card:hover .cover-icon { transform: scale(1.08); }

.diff-badge,
.status-badge {
  position: absolute;
  top: 8px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.diff-badge { right: 8px; color: #444; }
.diff-badge.diff-easy { color: #2c8a4a; }
.diff-badge.diff-medium { color: #c77a0e; }
.diff-badge.diff-hard { color: #d23f3f; }
.diff-badge.diff-unknown { color: #6b7280; }

.status-badge { left: 8px; color: #2c8a4a; }
.status-badge .el-icon { font-size: 12px; }

.card-meta { padding: 12px 14px 14px; }
.course-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}
.card-actions { display: flex; gap: 8px; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--dew-text-muted, #909399);
  padding: 30px 0;
  font-size: 13px;
}
.empty-icon { font-size: 28px; opacity: 0.55; }
</style>
