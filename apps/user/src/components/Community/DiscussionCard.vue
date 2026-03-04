<template>
  <div :class="['discussion-card', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" @click="handleClick">
    <!-- 分类标签 -->
    <div class="discussion-category">
      <el-icon><ChatDotRound /></el-icon>
      <span>讨论</span>
      <span class="category-name">· {{ discussion.category }}</span>
    </div>

    <!-- 标题 -->
    <h3 class="discussion-title">{{ discussion.title }}</h3>

    <!-- 摘要 -->
    <p class="discussion-summary">{{ discussion.summary }}</p>

    <!-- 底部信息 -->
    <div class="discussion-footer">
      <div class="author-info">
        <el-avatar :size="24" :src="discussion.authorAvatar" />
        <span class="author-name">{{ discussion.author }}</span>
        <span class="publish-time">· {{ discussion.publishTime }}</span>
      </div>
      <div class="discussion-stats">
        <span class="stat-item">
          <el-icon><ChatDotRound /></el-icon>
          {{ discussion.replies }} 回复
        </span>
        <span class="stat-item">
          <el-icon><View /></el-icon>
          {{ formatNumber(discussion.views) }} 浏览
        </span>
        <span v-if="discussion.isHot" class="hot-badge">
          🔥 热门
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { ChatDotRound, View } from '@element-plus/icons-vue'

const props = defineProps({
  discussion: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}

const handleClick = () => {
  emit('click', props.discussion)
}
</script>

<style scoped>
.discussion-card {
  padding: 16px;
  border-radius: 0;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 0;
  position: relative;
}

.theme-light .discussion-card {
  background: #ffffff;
  border-bottom: 1px solid #d0d7de;
  border-left: 3px solid #0969da;
}

.theme-dark .discussion-card {
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  border-left: 3px solid #58a6ff;
}

.theme-light .discussion-card:hover {
  background: #f6f8fa;
}

.theme-dark .discussion-card:hover {
  background: #161b22;
}

/* 分类标签 */
.discussion-category {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 10px;
}

.theme-light .discussion-category {
  color: #57606a;
}

.theme-dark .discussion-category {
  color: #8b949e;
}

.category-name {
  opacity: 1;
}

/* 标题 */
.discussion-title {
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 10px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-light .discussion-title {
  color: #24292f;
}

.theme-dark .discussion-title {
  color: #c9d1d9;
}

/* 摘要 */
.discussion-summary {
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-light .discussion-summary {
  color: #57606a;
}

.theme-dark .discussion-summary {
  color: #8b949e;
}

/* 底部信息 */
.discussion-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.author-name {
  font-weight: 400;
}

.theme-light .author-name {
  color: #24292f;
}

.theme-dark .author-name {
  color: #c9d1d9;
}

.publish-time {
  opacity: 1;
}

.theme-light .publish-time {
  color: #57606a;
}

.theme-dark .publish-time {
  color: #8b949e;
}

.discussion-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.theme-light .stat-item {
  color: #57606a;
}

.theme-dark .stat-item {
  color: #8b949e;
}

.hot-badge {
  font-weight: 500;
  font-size: 12px;
}

.theme-light .hot-badge {
  color: #e53e3e;
}

.theme-dark .hot-badge {
  color: #fc8181;
}

/* 响应式 */
@media (max-width: 768px) {
  .discussion-card {
    padding: 16px;
  }

  .discussion-title {
    font-size: 16px;
  }

  .discussion-summary {
    font-size: 13px;
  }

  .discussion-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
