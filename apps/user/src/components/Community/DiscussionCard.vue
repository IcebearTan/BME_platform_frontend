<template>
  <div
    :class="['discussion-card', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]"
    :data-discussion-id="discussion.id"
  >
    <!-- 分类标签 -->
    <div class="discussion-category">
      <el-icon><ChatDotRound /></el-icon>
      <span>讨论</span>
      <span class="category-name">· {{ discussion.category }}</span>
    </div>

    <!-- 标题 -->
    <h3 class="discussion-title">{{ discussion.title }}</h3>

    <!-- 作者信息 -->
    <div class="author-section">
      <el-avatar :size="32" :src="discussion.author_avatar" />
      <div class="author-info">
        <span class="author-name">{{ discussion.author }}</span>
        <span class="publish-time">{{ discussion.publishTime }}</span>
      </div>
    </div>

    <!-- 完整内容 -->
    <div class="discussion-content">{{ discussion.content || discussion.summary }}</div>

    <!-- 操作按钮 -->
    <div class="discussion-actions">
      <el-button
        :type="discussion.liked ? 'primary' : 'default'"
        text
        @click.stop="handleLike"
      >
        <el-icon><StarFilled v-if="discussion.liked" /><Star v-else /></el-icon>
        <span>{{ discussion.liked ? '已赞' : '点赞' }}</span>
        <span v-if="discussion.like_count">({{ discussion.like_count }})</span>
      </el-button>
      <el-button text @click.stop="handleReply">
        <el-icon><ChatDotRound /></el-icon>
        <span>回复</span>
        <span v-if="discussion.reply_count">({{ discussion.reply_count }})</span>
      </el-button>
      <el-button text>
        <el-icon><View /></el-icon>
        <span>{{ formatNumber(discussion.views) }} 浏览</span>
      </el-button>
    </div>

    <!-- 回复列表 -->
    <div v-if="discussion.replies && discussion.replies.length > 0" class="replies-section">
      <div class="replies-header">全部回复 ({{ discussion.replies.length }})</div>
      <div
        v-for="reply in discussion.replies"
        :key="reply.id"
        class="reply-item"
      >
        <el-avatar :size="28" :src="reply.author_avatar" />
        <div class="reply-content">
          <div class="reply-header">
            <span class="reply-author">{{ reply.author }}</span>
            <span class="reply-time">{{ reply.time }}</span>
          </div>
          <div class="reply-text">{{ reply.content }}</div>
          <div class="reply-actions">
            <el-button
              :type="reply.liked ? 'primary' : 'default'"
              text
              size="small"
              @click.stop="handleReplyLike(reply)"
            >
              <el-icon><StarFilled v-if="reply.liked" /><Star v-else /></el-icon>
              <span>{{ reply.like_count || 0 }}</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 回复输入框 -->
    <div class="reply-input-section" v-if="showReplyInput">
      <el-input
        v-model="replyContent"
        type="textarea"
        :rows="2"
        placeholder="写下你的回复..."
      />
      <el-button type="primary" size="small" @click="submitReply">回复</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ChatDotRound, View, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../../api'

const props = defineProps({
  discussion: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['like', 'reply'])

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

const showReplyInput = ref(false)
const replyContent = ref('')
const viewed = ref(false)

// 使用 Intersection Observer 检测卡片是否进入视口
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !viewed.value) {
          viewed.value = true
          // 调用帖子详情 API（会同时增加浏览量）
          api.get(`/discussions/threads/${props.discussion.id}`)
            .then(res => {
              if (res.data && res.data.code === 200) {
                const data = res.data.data
                props.discussion.views = data.view_count
                props.discussion.like_count = data.like_count
                props.discussion.reply_count = data.reply_count
              }
            })
            .catch(err => console.error('获取帖子详情失败:', err))
          observer.disconnect()
        }
      })
    },
    { threshold: 0.5 }
  )

  const card = document.querySelector(`[data-discussion-id="${props.discussion.id}"]`)
  if (card) {
    observer.observe(card)
  }
})

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}

const handleLike = async () => {
  try {
    const res = await api({
      url: `/discussions/threads/${props.discussion.id}/like`,
      method: 'POST'
    })
    if (res.data.code === 200) {
      props.discussion.liked = !props.discussion.liked
      props.discussion.like_count = (props.discussion.like_count || 0) + (props.discussion.liked ? 1 : -1)
      emit('like', props.discussion)
    }
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

const handleReply = () => {
  showReplyInput.value = !showReplyInput.value
}

const handleReplyLike = async (reply) => {
  try {
    const res = await api({
      url: `/discussions/replies/${reply.id}/like`,
      method: 'POST'
    })
    if (res.data.code === 200) {
      reply.liked = !reply.liked
      reply.like_count = (reply.like_count || 0) + (reply.liked ? 1 : -1)
    }
  } catch (err) {
    console.error('点赞回复失败:', err)
  }
}

const submitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  try {
    const res = await api({
      url: `/discussions/threads/${props.discussion.id}/replies`,
      method: 'POST',
      data: { content: replyContent.value }
    })
    if (res.data.code === 200 || res.data.code === 201) {
      ElMessage.success('回复成功')
      replyContent.value = ''
      showReplyInput.value = false
      emit('reply', props.discussion)
    }
  } catch (err) {
    console.error('回复失败:', err)
    ElMessage.error('回复失败，请稍后重试')
  }
}
</script>

<style scoped>
.discussion-card {
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 16px;
  border: 1px solid transparent;
}

.theme-light .discussion-card {
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.04);
}

.theme-dark .discussion-card {
  background: rgba(40, 40, 40, 0.8);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.06);
}

/* 分类标签 */
.discussion-category {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.theme-light .discussion-category {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.theme-dark .discussion-category {
  color: #a5b4fc;
  background: rgba(102, 126, 234, 0.15);
}

/* 标题 */
.discussion-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.theme-light .discussion-title {
  color: #1a1a1a;
}

.theme-dark .discussion-title {
  color: #f5f5f5;
}

/* 作者信息 */
.author-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-weight: 500;
  font-size: 14px;
}

.theme-light .author-name {
  color: #374151;
}

.theme-dark .author-name {
  color: #d1d5db;
}

.publish-time {
  font-size: 12px;
}

.theme-light .publish-time {
  color: #9ca3af;
}

.theme-dark .publish-time {
  color: #6b7280;
}

/* 内容 */
.discussion-content {
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.theme-light .discussion-content {
  color: #374151;
}

.theme-dark .discussion-content {
  color: #d1d5db;
}

/* 操作按钮 */
.discussion-actions {
  display: flex;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.theme-dark .discussion-actions {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .discussion-actions .el-button {
  color: #9ca3af;
}

.theme-dark .discussion-actions .el-button:hover {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

/* 回复列表 */
.replies-section {
  margin-top: 16px;
}

.replies-header {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}

.theme-light .replies-header {
  color: #374151;
}

.theme-dark .replies-header {
  color: #d1d5db;
}

.reply-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .reply-item {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reply-author {
  font-weight: 500;
  font-size: 13px;
}

.theme-light .reply-author {
  color: #374151;
}

.theme-dark .reply-author {
  color: #d1d5db;
}

.reply-time {
  font-size: 12px;
}

.theme-light .reply-time {
  color: #9ca3af;
}

.theme-dark .reply-time {
  color: #6b7280;
}

.reply-text {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 4px;
}

.theme-light .reply-text {
  color: #4b5563;
}

.theme-dark .reply-text {
  color: #d1d5db;
}

.reply-actions {
  display: flex;
  gap: 8px;
}

.theme-dark .reply-actions .el-button {
  color: #6b7280;
}

/* 回复输入框 */
.reply-input-section {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  align-items: flex-end;
}

.reply-input-section .el-textarea {
  flex: 1;
}

.theme-dark .reply-input-section .el-textarea__inner {
  background: #262626;
  border-color: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
}

/* 响应式 */
@media (max-width: 768px) {
  .discussion-card {
    padding: 16px;
  }

  .discussion-title {
    font-size: 16px;
  }

  .discussion-actions {
    flex-wrap: wrap;
  }
}
</style>
