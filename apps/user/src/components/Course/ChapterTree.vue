<script setup>
import { computed } from 'vue'
import { ArrowRight, Lock } from '@element-plus/icons-vue'

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
  parentIndex: {
    type: String,
    default: ''
  },
  chapterNum: {
    type: Number,
    default: 0
  },
  themeClass: {
    type: String,
    default: 'theme-light'
  }
})

const emit = defineEmits(['chapter-click'])

// 计算解锁状态
const checkUnlock = (chapterOrder) => {
  return chapterOrder <= props.chapterNum + 1
}

// 处理章节点击
const handleClick = (chapter, index) => {
  const currentIndex = props.parentIndex ? `${props.parentIndex}-${index + 1}` : String(index + 1)
  emit('chapter-click', chapter, currentIndex)
}

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
      <!-- 章节项 -->
      <div
        class="chapter-item"
        :class="{
          'clickable': isEnrolled && checkUnlock(chapter.order),
          'locked': !isEnrolled || !checkUnlock(chapter.order),
          'level-1': level === 1,
          'level-2': level === 2,
          'level-3': level >= 3
        }"
        :style="{
          paddingLeft: level === 1 ? '5px' : getLevelStyle(level)
        }"
        @click="handleClick(chapter, index)"
      >
        <!-- 序号圆圈 - 仅第一级显示 -->
        <span
          v-if="level === 1"
          class="chapter-index"
        >
          {{ chapter.order }}
        </span>

        <!-- 章节标题 -->
        <span
          class="chapter-name"
          :style="{ fontSize: getFontSize(level) }"
        >
          {{ chapter.name }}
        </span>

        <!-- 箭头图标 -->
        <el-icon
          v-if="isEnrolled && checkUnlock(chapter.order)"
          class="chapter-arrow"
        >
          <ArrowRight />
        </el-icon>

        <!-- 锁定图标 -->
        <el-icon
          v-if="!isEnrolled || !checkUnlock(chapter.order)"
          class="lock-icon"
        >
          <Lock />
        </el-icon>
      </div>

      <!-- 递归渲染子章节 -->
      <ChapterTree
        v-if="chapter.children && chapter.children.length > 0"
        :chapters="chapter.children"
        :level="level + 1"
        :is-enrolled="isEnrolled"
        :parent-index="parentIndex ? `${parentIndex}-${index + 1}` : String(index + 1)"
        :chapter-num="chapterNum"
        :theme-class="themeClass"
        @chapter-click="(ch, idx) => $emit('chapter-click', ch, idx)"
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
  cursor: pointer;
  transition: all 0.2s ease;
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
  background-color: #e0e0e0;
}

/* 暗色主题分隔线 */
.chapter-tree.theme-dark .chapter-item.level-1::after {
  background-color: #404040;
}

/* 二级章节样式 */
.chapter-item.level-2 {
  font-size: 15px;
}

/* 三级及以下章节样式 */
.chapter-item.level-3 {
  font-size: 14px;
}

/* 亮色主题默认样式 */
.chapter-tree.theme-light .chapter-item {
  color: #555;
}

.chapter-tree.theme-light .chapter-item:hover {
  background-color: #f5f5f5;
}

.chapter-tree.theme-light .chapter-item.locked {
  color: #ccc;
}

.chapter-tree.theme-light .chapter-item.level-1 {
  color: #333;
}

/* 暗色主题 */
.chapter-tree.theme-dark .chapter-item {
  color: #cccccc;
}

.chapter-tree.theme-dark .chapter-item:hover {
  background-color: #404040;
}

.chapter-tree.theme-dark .chapter-item.locked {
  color: #666;
}

.chapter-tree.theme-dark .chapter-item.level-1 {
  color: #fff;
}

/* 点击状态 */
.chapter-item.clickable {
  cursor: pointer;
}

.chapter-item.clickable:hover {
  background-color: rgba(102, 126, 234, 0.1);
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

/* 箭头图标 */
.chapter-arrow {
  font-size: 16px;
  color: #667eea;
  opacity: 0;
  transition: all 0.3s ease;
  margin-left: 10px;
  flex-shrink: 0;
}

.chapter-item.clickable:hover .chapter-arrow {
  opacity: 1;
}

/* 锁定图标 */
.lock-icon {
  font-size: 14px;
  color: #ccc;
  margin-left: 10px;
  flex-shrink: 0;
}

.chapter-tree.theme-dark .lock-icon {
  color: #555;
}
</style>
