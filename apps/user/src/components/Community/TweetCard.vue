<template>
  <div :class="['tweet-card', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" @click="handleClick">
    <!-- 用户信息头部 -->
    <div class="tweet-header">
      <el-avatar :size="40" :src="tweet.authorAvatar" class="user-avatar" @click.stop="handleUserClick" />
      <div class="user-info">
        <div class="user-name-row">
          <span class="user-name" @click.stop="handleUserClick">{{ tweet.author }}</span>
          <el-tag v-if="tweet.badge" size="small" type="success" class="user-badge">
            {{ tweet.badge }}
          </el-tag>
        </div>
        <span class="tweet-time">{{ tweet.publishTime }}</span>
      </div>
      <el-dropdown trigger="click" @click.stop>
        <el-icon class="more-icon"><MoreFilled /></el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>举报</el-dropdown-item>
            <el-dropdown-item>隐藏</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 推文内容 -->
    <div class="tweet-content">
      <p class="tweet-text" v-html="formatContent(tweet.content)"></p>
      
      <!-- 图片网格 -->
      <div v-if="tweet.images && tweet.images.length > 0" :class="['tweet-images', `images-${tweet.images.length}`]">
        <img 
          v-for="(image, index) in tweet.images.slice(0, 4)" 
          :key="index"
          :src="image" 
          :alt="`图片${index + 1}`"
          class="tweet-image"
          @click.stop="handleImageClick(index)"
        />
      </div>
    </div>

    <!-- 互动栏 -->
    <div class="tweet-actions" @click.stop>
      <div class="action-item" @click="handleComment">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ tweet.comments || 0 }}</span>
      </div>
      <div class="action-item" @click="handleShare">
        <el-icon><Share /></el-icon>
        <span>{{ tweet.shares || 0 }}</span>
      </div>
      <div :class="['action-item', { 'active': tweet.liked }]" @click="handleLike">
        <el-icon><component :is="tweet.liked ? 'StarFilled' : 'Star'" /></el-icon>
        <span>{{ tweet.likes || 0 }}</span>
      </div>
      <div :class="['action-item', { 'active': tweet.bookmarked }]" @click="handleBookmark">
        <el-icon><component :is="tweet.bookmarked ? 'CollectionTag' : 'Collection'" /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { ChatDotRound, Share, Star, StarFilled, Collection, CollectionTag, MoreFilled } from '@element-plus/icons-vue'

const props = defineProps({
  tweet: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'user-click', 'comment', 'share', 'like', 'bookmark', 'image-click'])

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// 格式化内容（处理@提及和#话题）
const formatContent = (content) => {
  if (!content) return ''
  
  // 处理话题标签
  let formatted = content.replace(/#(\S+)/g, '<span class="topic-tag">#$1</span>')
  
  // 处理@提及
  formatted = formatted.replace(/@(\S+)/g, '<span class="mention-tag">@$1</span>')
  
  return formatted
}

const handleClick = () => {
  emit('click', props.tweet)
}

const handleUserClick = () => {
  emit('user-click', props.tweet.authorId)
}

const handleComment = () => {
  emit('comment', props.tweet.id)
}

const handleShare = () => {
  emit('share', props.tweet.id)
}

const handleLike = () => {
  emit('like', props.tweet.id)
}

const handleBookmark = () => {
  emit('bookmark', props.tweet.id)
}

const handleImageClick = (index) => {
  emit('image-click', { tweetId: props.tweet.id, index, images: props.tweet.images })
}
</script>

<style scoped>
.tweet-card {
  background: #ffffff;
  border-radius: 0;
  padding: 16px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 0;
}

.theme-light .tweet-card {
  background: #ffffff;
  border-bottom: 1px solid #d0d7de;
}

.theme-dark .tweet-card {
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.theme-light .tweet-card:hover {
  background: #f6f8fa;
}

.theme-dark .tweet-card:hover {
  background: #161b22;
}

/* 头部 */
.tweet-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.user-avatar:hover {
  opacity: 0.85;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.1s;
}

.theme-light .user-name {
  color: #24292f;
}

.theme-dark .user-name {
  color: #c9d1d9;
}

.user-name:hover {
  opacity: 0.7;
}

.user-badge {
  font-size: 11px;
  height: 18px;
  padding: 0 6px;
}

.tweet-time {
  font-size: 13px;
  opacity: 0.6;
}

.theme-light .tweet-time {
  color: #666;
}

.theme-dark .tweet-time {
  color: #ccc;
}

.more-icon {
  font-size: 18px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.more-icon:hover {
  opacity: 1;
}

/* 内容区 */
.tweet-content {
  margin-bottom: 12px;
}

.tweet-text {
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 12px 0;
  word-break: break-word;
}

.theme-light .tweet-text {
  color: #24292f;
}

.theme-dark .tweet-text {
  color: #c9d1d9;
}

.tweet-text :deep(.topic-tag) {
  font-weight: 400;
  cursor: pointer;
}

.theme-light .tweet-text :deep(.topic-tag) {
  color: #2b6cb0;
}

.theme-dark .tweet-text :deep(.topic-tag) {
  color: #63b3ed;
}

.tweet-text :deep(.topic-tag):hover {
  text-decoration: underline;
}

.tweet-text :deep(.mention-tag) {
  font-weight: 400;
  cursor: pointer;
}

.theme-light .tweet-text :deep(.mention-tag) {
  color: #2b6cb0;
}

.theme-dark .tweet-text :deep(.mention-tag) {
  color: #63b3ed;
}

.tweet-text :deep(.mention-tag):hover {
  text-decoration: underline;
}

/* 图片网格 */
.tweet-images {
  display: grid;
  gap: 4px;
  border-radius: 8px;
  overflow: hidden;
}

.images-1 {
  grid-template-columns: 1fr;
  max-height: 400px;
}

.images-2 {
  grid-template-columns: repeat(2, 1fr);
  max-height: 300px;
}

.images-3 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.images-3 .tweet-image:first-child {
  grid-row: 1 / 3;
}

.images-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.tweet-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
  transition: opacity 0.2s;
  min-height: 140px;
  max-height: 300px;
}

.tweet-image:hover {
  opacity: 0.9;
}

/* 互动栏 */
.tweet-actions {
  display: flex;
  align-items: center;
  gap: 32px;
  padding-top: 8px;
  margin-top: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.15s;
  font-size: 13px;
  user-select: none;
}

.theme-light .action-item {
  color: #57606a;
}

.theme-dark .action-item {
  color: #8b949e;
}

.theme-light .action-item:hover {
  color: #24292f;
}

.theme-dark .action-item:hover {
  color: #c9d1d9;
}

.theme-light .action-item.active {
  color: #e53e3e;
}

.theme-dark .action-item.active {
  color: #fc8181;
}

.action-item .el-icon {
  font-size: 18px;
}

/* 响应式 */
@media (max-width: 768px) {
  .tweet-card {
    padding: 16px;
    border-radius: 8px;
  }

  .user-name {
    font-size: 14px;
  }

  .tweet-text {
    font-size: 15px;
  }

  .tweet-actions {
    gap: 24px;
  }

  .action-item {
    font-size: 13px;
  }
}
</style>
