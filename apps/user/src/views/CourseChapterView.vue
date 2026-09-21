<template>
  <div class="course-learning" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <!-- ── 顶栏：上下文始终可见（§4.1）── -->
    <CourseLearningTopbar
      v-if="isReady"
      :course-title="courseTitle"
      :chapter-title="currentChapter?.title || ''"
      :completed="summary.completed"
      :total="summary.total"
      :collapsed="catalogCollapsed"
      @back="goBack"
      @toggle-catalog="catalogCollapsed = !catalogCollapsed"
    />
    <!-- 加载期顶栏占位（结构化骨架，不用 el-empty 表加载） -->
    <div v-else-if="isLoading" class="topbar-skeleton">
      <DewSkeleton variant="text" width="96px" height="16px" />
      <DewSkeleton variant="text" width="180px" height="18px" />
      <DewSkeleton variant="text" width="72px" height="14px" />
    </div>

    <!-- ── 主体：可折叠目录 + 独立滚动内容区 ── -->
    <div class="cl-body">
      <!-- 目录（失败/无权限/空课程不渲染目录结构） -->
      <CourseLearningCatalog
        v-if="isReady"
        :chapters="chapterTree"
        :current-lesson-id="currentLesson?.id ?? null"
        :completed="summary.completed"
        :total="summary.total"
        :collapsed="catalogCollapsed"
        @select="(lesson) => selectLesson(lesson.id)"
      />
      <div v-else-if="isLoading" class="catalog-skeleton" aria-hidden="true">
        <div class="cs-head">
          <DewSkeleton variant="text" width="72px" height="16px" />
          <DewSkeleton variant="rect" height="6px" style="margin-top: 12px" />
        </div>
        <DewSkeleton variant="text" :lines="12" />
      </div>

      <!-- 内容区：页面唯一主要滚动区域 -->
      <main class="cl-content" ref="scrollEl">
        <!-- 页面级状态：失败 / 无章节 / 无权限（§7） -->
        <CourseLearningState
          v-if="isError || isEmpty || isForbidden"
          :state="pageState"
          @retry="bootstrap"
          @back="goBack"
        />

        <!-- 加载骨架：标题 + 段落（§7.1） -->
        <div v-else-if="isLoading" class="content-skeleton">
          <DewSkeleton variant="text" width="34%" height="30px" />
          <DewSkeleton variant="text" width="22%" height="14px" />
          <DewSkeleton variant="rect" height="0" style="padding-bottom: 56.25%; margin: 20px 0" />
          <DewSkeleton variant="text" :lines="7" />
        </div>

        <!-- 有章节但全无课时：目录保留，内容区给明确提示 -->
        <div v-else-if="!currentLesson" class="no-lesson-panel">
          <p class="no-lesson-title">课程暂无课时</p>
          <p class="no-lesson-desc">章节已发布，课时还在准备中。</p>
        </div>

        <!-- 课时纸张：页头 → 主媒介 → 正文 → 资源 → 完成与翻页（§4.3/§4.4） -->
        <article v-else class="lesson-paper">
          <CourseLessonHeader
            :lesson="currentLesson"
            :chapter-title="currentChapter?.title || ''"
            :is-completed="currentLesson.completed"
          />

          <CourseLessonContent v-if="hasLessonContent" :lesson="currentLesson" />
          <div v-else class="lesson-empty">
            <p class="lesson-empty-title">本课暂未发布学习内容</p>
            <p class="lesson-empty-desc">可以先返回目录选择其他课时，或直接进入下一课。</p>
          </div>

          <section v-if="resources.length" class="paper-section">
            <h3 class="paper-section-title">课程资源</h3>
            <ResourceFileList
              :items="resources"
              :theme-class="isDarkMode ? 'theme-dark' : 'theme-light'"
              :download-one="downloadResource"
            />
          </section>

          <CourseLessonNavigation
            :has-prev="hasPrev"
            :prev-title="prevEntry?.lesson.title || ''"
            :has-next="hasNext"
            :is-completed="currentLesson.completed"
            :can-complete="hasLessonContent"
            :saving="completionState === 'saving'"
            :save-error="completionState === 'error'"
            :finished="justFinished"
            @prev="goPrev"
            @next="goNext"
            @complete="handleComplete"
            @back="goBack"
          />
        </article>
      </main>
    </div>
  </div>
</template>

<script setup>
// 章节学习内容页（桌面端改进方案 v1.0，2026-09-21 落地）：
// 沉浸式独立页 = 固定顶栏 + 可折叠目录 + 独立滚动内容区。
// 本视图只做页面编排；取数/路由同步/完成态分别在三个 composable，
// 子区域渲染在 components/Course/Learning/*。
// 关键正确性修复：lessonId 定位不再被 chapterId 覆盖；完成态只在后端
// 确认成功后更新；导航统一以「课」为单位。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { DewMessage, DewMessageBox, DewSkeleton } from '@bme/dew-ui';
import CourseLearningTopbar from '../components/Course/Learning/CourseLearningTopbar.vue';
import CourseLearningCatalog from '../components/Course/Learning/CourseLearningCatalog.vue';
import CourseLearningState from '../components/Course/Learning/CourseLearningState.vue';
import CourseLessonHeader from '../components/Course/Learning/CourseLessonHeader.vue';
import CourseLessonContent from '../components/Course/Learning/CourseLessonContent.vue';
import CourseLessonNavigation from '../components/Course/Learning/CourseLessonNavigation.vue';
import ResourceFileList from '../components/Course/ResourceFileList.vue';
import { useCourseLearningData, hasRichTextBody } from '../composables/useCourseLearningData';
import { useCourseLessonRoute } from '../composables/useCourseLessonRoute';
import { useLessonCompletion } from '../composables/useLessonCompletion';
import { courseResourceService } from '../services/courseResourceService';

const route = useRoute();
const router = useRouter();
const store = useStore();

const isDarkMode = computed(() => store.state.isDarkMode);
const courseId = computed(() => Number(route.params.courseId));

// ── 数据 / 路由同步 / 完成态（§8 状态模型） ──
const campSid = computed(() => route.query.sid || null);
const {
  pageState, chapterTree, flatLessons, summary,
  courseTitle, courseMode, resources, lastLessonId,
  load, collapseAll, expandTo, findEntry
} = useCourseLearningData(courseId, { campSidRef: campSid });

const { currentLesson, currentChapter, selectLesson } = useCourseLessonRoute(flatLessons);
const { completionState, completeLesson, reset: resetCompletion } = useLessonCompletion();

const catalogCollapsed = ref(false);
const justFinished = ref(false);          // 本次会话完成最后一课 → 收束反馈（§6.3）
const scrollEl = ref(null);

const isLoading = computed(() => pageState.value === 'loading');
const isReady = computed(() => pageState.value === 'ready');
const isEmpty = computed(() => pageState.value === 'empty');
const isError = computed(() => pageState.value === 'error');
const isForbidden = computed(() => pageState.value === 'forbidden');

// ── 课时定位（§6.1）：URL lessonId → 最近学习（未完成）→ 首个未完成 → 第一课 ──
async function bootstrap() {
  await load();
  if (pageState.value !== 'ready') return;

  let target = null;
  const urlId = Number(route.query.lessonId);
  if (route.query.lessonId && findEntry(urlId)) {
    target = urlId;
  }
  if (target == null && lastLessonId.value) {
    const entry = findEntry(lastLessonId.value);
    if (entry && !entry.lesson.completed) target = lastLessonId.value;
  }
  if (target == null) {
    target = flatLessons.value.find((i) => !i.lesson.completed)?.lesson.id ?? null;
  }
  if (target == null) {
    target = flatLessons.value[0]?.lesson.id ?? null;
  }

  if (target != null) {
    // 初始目录形态：仅当前课时祖先链展开，其余折叠（§4.2）
    collapseAll();
    const entry = findEntry(target);
    selectLesson(target);
    if (entry) expandTo(entry.chapter.id);
  }
}

onMounted(bootstrap);
// 同路由切课程（/course/chapter/1 → /course/chapter/2）重进学习态
watch(courseId, () => { justFinished.value = false; bootstrap(); });

// ── 课时切换的联动（§6.2）：展开祖先 / 正文回顶 / 完成态复位 ──
watch(() => currentChapter.value?.id, (id) => { if (id) expandTo(id); });

watch(() => currentLesson.value?.id, async () => {
  justFinished.value = false;
  resetCompletion();
  await nextTick();
  scrollEl.value?.scrollTo({ top: 0 });
});

// ── 上一课 / 下一课（以课时为单位，跨章节按目录顺序） ──
const currentIndex = computed(() =>
  currentLesson.value
    ? flatLessons.value.findIndex((i) => i.lesson.id === currentLesson.value.id)
    : -1
);
const prevEntry = computed(() => (currentIndex.value > 0 ? flatLessons.value[currentIndex.value - 1] : null));
const nextEntry = computed(() => {
  const i = currentIndex.value;
  return i >= 0 && i < flatLessons.value.length - 1 ? flatLessons.value[i + 1] : null;
});
const hasPrev = computed(() => !!prevEntry.value);
const hasNext = computed(() => !!nextEntry.value);

function goPrev() {
  if (prevEntry.value) selectLesson(prevEntry.value.lesson.id);
}
function goNext() {
  if (nextEntry.value) selectLesson(nextEntry.value.lesson.id);
}

// ── 完成本课（§6.3）：成功后进下一课；最后一课给课程完成反馈 ──
// 完成本课（§6.3）：先确认防误触（自动进下一课时大按钮就在手边，容易连点），
// 营期学注明完成态供导生按章认证；自主学注明课成判定规则
async function handleComplete() {
  if (!currentLesson.value) return;
  const lesson = currentLesson.value;
  const confirmDesc = courseMode.value === 'camp'
    ? '确认已完成本课学习？营期内完成情况将由导生按章认证。'
    : '确认已完成本课学习？全部课时完成后课程将标记为已完成。';
  try {
    await DewMessageBox.confirm(confirmDesc, `完成「${lesson.title}」`, { confirmText: '确认完成' });
  } catch {
    return;   // 取消不提交，不打扰
  }
  const ok = await completeLesson(lesson, courseId.value, campSid.value);
  if (!ok) return;
  DewMessage.success('已完成本课');
  if (nextEntry.value) {
    selectLesson(nextEntry.value.lesson.id);
  } else {
    justFinished.value = true;
  }
}

// 课时是否有可学内容（§7.5：无内容默认不允许标记完成）
const hasLessonContent = computed(() => {
  const l = currentLesson.value;
  if (!l) return false;
  if (l.type === 'link') return !!l.content;
  return !!l.resourceUrl || hasRichTextBody(l.content);
});

// 课程资源下载（共享 Down_Code 策略）
const downloadResource = (item) =>
  courseResourceService.download(courseId.value, [item.id])
    .catch((e) => DewMessage.error(e?.message || '下载失败，请重试'));

// ── 返回（§4.1）：营期语境回营期学习方向；普通入口回课程详情 ──
function goBack() {
  if (route.query.from === 'camp' && route.query.sid) {
    router.push({ path: '/camp', query: { sid: String(route.query.sid), tab: 'study' } });
    return;
  }
  router.push({
    path: '/study/details',
    query: { id: String(courseId.value), ...(route.query.sid ? { sid: String(route.query.sid) } : {}) }
  });
}

// ── 快捷键（§6.5）：Ctrl/⌘ + ←/→；输入框/视频控件聚焦时不抢 ──
function onKeydown(event) {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const t = event.target;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO'].includes(t.tagName))) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft') goPrev();
  else goNext();
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
/* ── 整体：全屏三段（顶栏 / 目录 / 内容），页面本体不滚动 ── */
.course-learning {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--dew-text);
  /* 极光衬底降饱和降对比（§5.2）：阅读区是稳定实色纸张，外围轻量 */
  background:
    radial-gradient(ellipse 55% 45% at 14% 16%, rgba(96, 165, 250, 0.13), transparent 60%),
    radial-gradient(ellipse 50% 55% at 86% 10%, rgba(244, 114, 182, 0.11), transparent 58%),
    radial-gradient(ellipse 60% 50% at 84% 92%, rgba(52, 211, 153, 0.10), transparent 60%),
    linear-gradient(150deg, #f6f8fc 0%, #f9f7fa 55%, #f5faf8 100%);
}

.theme-dark .course-learning {
  background:
    radial-gradient(ellipse 55% 45% at 14% 16%, rgba(59, 130, 246, 0.07), transparent 60%),
    radial-gradient(ellipse 50% 55% at 86% 10%, rgba(236, 72, 153, 0.05), transparent 58%),
    radial-gradient(ellipse 60% 50% at 84% 92%, rgba(16, 185, 129, 0.05), transparent 60%),
    linear-gradient(160deg, #17171b 0%, #101014 100%);
}

.cl-body {
  flex: 1;
  display: flex;
  min-height: 0;   /* 让内容区成为独立滚动容器 */
}

.cl-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* ── 加载骨架（§7.1）── */
.topbar-skeleton {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--dew-card-flat-border);
}

.catalog-skeleton {
  width: 296px;
  flex-shrink: 0;
  padding: 20px 16px;
  background: var(--dew-card-flat-bg);
  border-right: 1px solid var(--dew-card-flat-border);
}

.cs-head { margin-bottom: 20px; }

.content-skeleton {
  width: min(960px, calc(100% - 48px));
  margin: 28px auto 48px;
  padding: 40px 48px;
  border-radius: var(--radius-lg);
  background: var(--dew-card-flat-bg);
  border: 1px solid var(--dew-card-flat-border);
  box-shadow: var(--dew-card-flat-shadow);
}

/* ── 课时纸张：稳定实色阅读表面（§2.3/§5.1）── */
.lesson-paper {
  width: min(960px, calc(100% - 48px));
  margin: 28px auto 48px;
  border-radius: var(--radius-lg);
  background: var(--dew-card-flat-bg);
  border: 1px solid var(--dew-card-flat-border);
  box-shadow: var(--dew-card-flat-shadow);
  padding-bottom: 40px;
}

/* 课时无内容（§7.5） */
.lesson-empty {
  padding: 48px 48px 24px;
}

.lesson-empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.lesson-empty-desc {
  margin: 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 课程资源区（课程级资料，复用 ResourceFileList） */
.paper-section {
  margin: 32px 48px 0;
  padding-top: 24px;
  border-top: 1px solid var(--dew-card-flat-divider);
}

.paper-section-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

/* 有章节无课时 */
.no-lesson-panel {
  width: min(560px, calc(100% - 48px));
  margin: 96px auto;
  text-align: center;
}

.no-lesson-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.no-lesson-desc {
  margin: 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}
</style>
