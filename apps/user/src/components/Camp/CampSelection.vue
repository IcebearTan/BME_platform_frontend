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
          <div class="card-cover" :style="coverStyle(c.title)">
            <div class="cover-title">{{ c.title }}</div>
          </div>
          <div class="card-meta">
            <div class="diff-row" :title="diffLabel(c.difficulty)">
              <el-icon
                v-for="i in 5"
                :key="i"
                class="star"
                :class="{ filled: i <= diffLevel(c.difficulty) }"
              ><StarFilled /></el-icon>
              <span class="diff-text">{{ diffLabel(c.difficulty) }}</span>
            </div>
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
          <div class="card-cover" :style="coverStyle(c.title)">
            <span class="status-badge">
              <el-icon><CircleCheckFilled /></el-icon>已选
            </span>
            <div class="cover-title">{{ c.title }}</div>
          </div>
          <div class="card-meta">
            <div class="diff-row" :title="diffLabel(c.difficulty)">
              <el-icon
                v-for="i in 5"
                :key="i"
                class="star"
                :class="{ filled: i <= diffLevel(c.difficulty) }"
              ><StarFilled /></el-icon>
              <span class="diff-text">{{ diffLabel(c.difficulty) }}</span>
            </div>
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
import { Select, Collection, CircleCheckFilled, StarFilled } from '@element-plus/icons-vue';
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
    // 后端 /camp/selection/mine 的轻量 payload 不含 difficulty，
    // 从完整课程目录补齐，保证已选卡片也能正确显示难度星级
    const diffMap = new Map(courses.value.map((c) => [c.course_id, c.difficulty]));
    mine.value = mine.value.map((mc) => ({
      ...mc,
      difficulty: mc.difficulty ?? diffMap.get(mc.course_id),
    }));
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

// ── 封面色：与课程展示页（CoursesComponent）同逻辑——按课程名哈希映射到固定色板，同名同色 ──
const COLOR_PALETTE = ['#b391ff', '#91bdff', '#91ffde', '#ffcc91', '#ff91c0'];
function coverColor(name) {
  let hash = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}
function coverStyle(title) {
  return { background: coverColor(title) };
}

// ── 难度：1-5 → 星级 + 文字 ──
const DIFF_LABEL = { 1: '入门', 2: '较易', 3: '中等', 4: '较难', 5: '困难' };
function diffLevel(d) {
  const n = Math.floor(Number(d));
  if (!n || n < 1) return 0;
  return Math.min(5, n);
}
const diffLabel = (d) => DIFF_LABEL[diffLevel(d)] || '未分级';

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

/* 彩色封面：放课程名 */
.card-cover {
  position: relative;
  min-height: 92px;
  padding: 16px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.cover-title {
  color: rgba(255, 255, 255, 0.97);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 已选角标 */
.status-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #2c8a4a;
}
.status-badge .el-icon { font-size: 12px; }

/* 卡片下方信息 */
.card-meta { padding: 12px 14px 14px; }

/* 难度星级 */
.diff-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 12px;
}
.diff-row .star {
  font-size: 14px;
  color: var(--dew-text-faint, #c0c0c0);
  opacity: 0.45;
}
.diff-row .star.filled {
  color: #f59e0b;
  opacity: 1;
}
.diff-text {
  margin-left: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--dew-text-muted, #909399);
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
