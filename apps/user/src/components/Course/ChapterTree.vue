<script setup>
import { computed } from 'vue'
import { VideoPlay, Document, Link, Reading, CircleCheck } from '@element-plus/icons-vue'

// 只读目录树：展示章节/课时结构与进度，暂不支持点击进入
const props = defineProps({
  chapters: {
    type: Array,
    required: true
  },
  level: {
    type: Number,
    default: 1
  },
  isEnrolled: {
    type: Boolean,
    default: false
  },
  completedLessons: {
    type: Array,
    default: () => []
  },
  themeClass: {
    type: String,
    default: 'theme-light'
  }
})

// 计算缩进层级样式
const getLevelStyle = (level) => {
  const indentMap = {
    1: '0px',    // 一级章节
    2: '20px',   // 二级章节
    3: '40px',   // 三级章节
    4: '60px',   // 四级章节
    5: '80px'    // 五级及以上
  }
  return indentMap[level] || indentMap[5]
}

// 获取字体大小
const getFontSize = (level) => {
  const sizeMap = {
    1: '20px',   // 一级章节
    2: '15px',   // 二级章节
    3: '14px',   // 三级章节
    4: '14px',   // 四级及以下
    5: '14px'
  }
  return sizeMap[level] || sizeMap[1]
}

// 获取序号背景色
const getIndexBg = (level) => {
  const bgMap = {
    1: '#333',    // 一级章节 - 深色
    2: '#667eea', // 二级章节 - 紫色
    3: '#4ecdc4', // 三级章节 - 青色
    4: '#ff6b6b', // 四级章节 - 红色
    5: '#95a5a6'  // 五级及以上 - 灰色
  }
  return bgMap[level] || bgMap[1]
}

// 获取课时类型图标
const getLessonIcon = (type) => {
  const iconMap = {
    'video': VideoPlay,
    'text': Document,
    'link': Link,
    'quiz': Reading,
    'homework': Document
  }
  return iconMap[type] || Document
}

// 获取课时类型颜色
const getLessonTypeColor = (type) => {
  const colorMap = {
    'video': '#667eea',    // 视频 - 紫色
    'text': '#4ecdc4',     // 图文 - 青色
    'link': '#ff6b6b',     // 外链 - 红色
    'quiz': '#ffcf00',     // 测验 - 黄色
    'homework': '#95a5a6'  // 作业 - 灰色
  }
  return colorMap[type] || '#667eea'
}

// 获取课时类型名称
const getLessonTypeName = (type) => {
  const nameMap = {
    'video': '视频',
    'text': '图文',
    'link': '外链',
    'quiz': '测验',
    'homework': '作业'
  }
  return nameMap[type] || '课时'
}

// 格式化课时时长
const formatDuration = (minutes) => {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

// 计算章节进度百分比 - 包括所有子章节的课时
const getChapterProgress = (chapter) => {
  if (!props.isEnrolled) return 0

  // 递归收集所有课时
  const collectLessons = (node) => {
    let lessons = []
    if (node.lessons && node.lessons.length > 0) {
      lessons = [...node.lessons]
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        lessons = [...lessons, ...collectLessons(child)]
      })
    }
    return lessons
  }

  const allLessons = collectLessons(chapter)
  if (allLessons.length === 0) return 0

  const completedCount = allLessons.filter(lesson =>
    props.completedLessons.includes(String(lesson.id))
  ).length

  return Math.round((completedCount / allLessons.length) * 100)
}

// 检查课时是否已完成
const isLessonCompleted = (lesson) => {
  return props.completedLessons.includes(String(lesson.id))
}

// 计算主题相关的类
const isDark = computed(() => props.themeClass === 'theme-dark')
</script>

<template>
  <div class="chapter-tree" :class="themeClass">
    <div
      v-for="(chapter, index) in chapters"
      :key="chapter.id"
      class="chapter-node"
    >
      <!-- 章节项（只读，不可点击） -->
      <div
        class="chapter-item"
        :class="{
          'level-1': level === 1,
          'level-2': level === 2,
          'level-3': level >= 3
        }"
        :style="{
          paddingLeft: level === 1 ? '5px' : getLevelStyle(level)
        }"
      >
        <!-- 序号圆圈 - 仅第一级显示，使用顺序编号 -->
        <span
          v-if="level === 1"
          class="chapter-index"
        >
          {{ index + 1 }}
        </span>

        <!-- 章节标题 -->
        <span
          class="chapter-name"
          :style="{ fontSize: getFontSize(level) }"
        >
          {{ chapter.name }}
        </span>

        <!-- 章节进度圆环 - 仅第一级显示 -->
        <el-progress
          v-if="level === 1"
          type="circle"
          :percentage="getChapterProgress(chapter)"
          :width="24"
          :stroke-width="3"
          color="#67c23a"
          :show-text="false"
          class="chapter-progress"
        />
      </div>

      <!-- 课时列表 - 展示在所有章节下 -->
      <div
        v-if="chapter.lessons && chapter.lessons.length > 0"
        class="lesson-list"
      >
        <div
          v-for="lesson in chapter.lessons"
          :key="lesson.id"
          class="lesson-item"
        >
          <!-- 课时类型图标 -->
          <el-icon
            class="lesson-type-icon"
            :style="{ color: getLessonTypeColor(lesson.type) }"
          >
            <component :is="getLessonIcon(lesson.type)" />
          </el-icon>

          <!-- 课时标题 -->
          <span class="lesson-title">{{ lesson.title }}</span>

          <!-- 课时类型标签 -->
          <span
            class="lesson-type-tag"
            :style="{ backgroundColor: getLessonTypeColor(lesson.type) }"
          >
            {{ getLessonTypeName(lesson.type) }}
          </span>

          <!-- 课时时长 -->
          <span v-if="lesson.duration" class="lesson-duration">
            {{ formatDuration(lesson.duration) }}
          </span>

          <!-- 完成状态标记 - 放在最右边 -->
          <span
            v-if="isEnrolled"
            class="lesson-status-icon"
            :class="{ 'is-completed': isLessonCompleted(lesson) }"
          >
            <el-icon v-if="isLessonCompleted(lesson)"><CircleCheck /></el-icon>
            <span v-else class="empty-circle"></span>
          </span>
        </div>
      </div>

      <!-- 递归渲染子章节 -->
      <ChapterTree
        v-if="chapter.children && chapter.children.length > 0"
        :chapters="chapter.children"
        :level="level + 1"
        :is-enrolled="isEnrolled"
        :completed-lessons="completedLessons"
        :theme-class="themeClass"
      />
    </div>
  </div>
</template>

<style scoped>
.chapter-tree {
  width: 100%;
  background-color: transparent;
}

.chapter-node {
  width: 100%;
  background-color: transparent;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  margin: 5px 0;
  border-radius: 8px;
}

/* 一级章节样式 */
.chapter-item.level-1 {
  font-size: 20px;
  font-weight: 500;
  padding: 20px 15px;
  margin-bottom: 10px;
  position: relative;
  border-radius: 8px 0px 0px 8px;
}

/* 一级章节底部分隔线 */
.chapter-item.level-1::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.08);
}

/* 暗色主题分隔线 */
.chapter-tree.theme-dark .chapter-item.level-1::after {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 二级章节样式 */
.chapter-item.level-2 {
  font-size: 15px;
  font-weight: 500;
}

/* 三级及以下章节样式 */
.chapter-item.level-3 {
  font-size: 14px;
  font-weight: 500;
}

/* 亮色主题默认样式 */
.chapter-tree.theme-light .chapter-item {
  color: #555;
}

.chapter-tree.theme-light .chapter-item.level-1 {
  color: #333;
}

/* 暗色主题 */
.chapter-tree.theme-dark .chapter-item {
  color: #cccccc;
}

.chapter-tree.theme-dark .chapter-item.level-1 {
  color: #fff;
}

/* 序号圆角矩形 - 仅一级章节显示 */
.chapter-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  border-radius: 50px;
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
  /* 阴影效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
  /* 略微超出列表背景 */
  margin-left: -20px;
  position: relative;
  z-index: 1;
}

/* 亮色主题序号背景 */
.chapter-tree.theme-light .level-1 .chapter-index {
  background-color: #333;
}

/* 暗色主题序号背景 */
.chapter-tree.theme-dark .level-1 .chapter-index {
  background-color: #555;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
}

/* 章节名称 */
.chapter-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 章节进度圆环 */
.chapter-progress {
  margin-left: auto;
  margin-right: 0;
  flex-shrink: 0;
  align-content: center;
}

/* 一级章节的进度圆环更大 */
.chapter-item.level-1 .chapter-progress {
  width: 32px !important;
  height: 32px !important;
}

/* 课时状态图标 */
.lesson-status-icon {
  font-size: 16px;
  margin-left: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.lesson-status-icon.is-completed {
  color: #67c23a;
}

.empty-circle {
  width: 14px;
  height: 14px;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  box-sizing: border-box;
}

/* 课时列表样式 */
.lesson-list {
  width: 100%;
  padding-left: 20px;
  padding-right: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.lesson-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin: 4px 0;
  margin-right: 10px;
  border-radius: 6px;
  background-color: transparent;
  overflow: hidden;
  box-sizing: border-box;
}

/* 课时类型图标 */
.lesson-type-icon {
  font-size: 16px;
  margin-right: 10px;
  flex-shrink: 0;
}

/* 课时标题 */
.lesson-title {
  flex: 1;
  font-size: 14px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-tree.theme-light .lesson-title {
  color: #555;
}

.chapter-tree.theme-dark .lesson-title {
  color: #bbb;
}

/* 课时类型标签 */
.lesson-type-tag {
  font-size: 10px;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

/* 课时时长 */
.lesson-duration {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
  /* margin-right: 10px; */
  flex-shrink: 0;
}

.chapter-tree.theme-dark .lesson-duration {
  color: #777;
}
</style>
