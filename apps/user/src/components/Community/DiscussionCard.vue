<template>
  <DewCard
    size="lg"
    class="discussion-card"
    :data-discussion-id="discussion.id"
  >
    <!-- 分类标签 -->
    <div class="dc-tags">
      <DewTag type="neutral" size="sm" round>讨论</DewTag>
      <DewTag v-if="discussion.isHot" type="warning" size="sm" round>置顶</DewTag>
      <button
        v-if="canDelete"
        class="dc-delete"
        title="删除帖子"
        @click.stop="handleDelete"
      >
        <el-icon><Delete /></el-icon>
      </button>
    </div>

    <!-- 标题 -->
    <h3 class="dc-title">{{ discussion.title }}</h3>

    <!-- 作者信息 -->
    <div class="dc-author" @click.stop="onAuthorClick">
      <el-avatar :size="32" :src="discussion.author_avatar">{{ (discussion.author || '?').charAt(0) }}</el-avatar>
      <div class="dc-author-info">
        <span class="dc-author-name">{{ discussion.author }}</span>
        <span class="dc-time">{{ discussion.publishTime }}</span>
      </div>
    </div>

    <!-- 正文（过长自动折叠） -->
    <div class="dc-content">{{ displayContent }}</div>
    <button v-if="isLong" class="dc-expand" @click.stop="expanded = !expanded">
      {{ expanded ? '收起' : '展开全文' }}
    </button>

    <!-- 操作按钮 -->
    <div class="dc-actions">
      <button
        class="dc-action"
        :class="{ 'is-liked': discussion.liked }"
        @click.stop="handleLike"
      >
        <el-icon><StarFilled v-if="discussion.liked" /><Star v-else /></el-icon>
        <span>{{ discussion.liked ? '已赞' : '点赞' }}</span>
        <span v-if="discussion.like_count" class="dc-count">{{ discussion.like_count }}</span>
      </button>
      <button class="dc-action" @click.stop="handleReply">
        <el-icon><ChatDotRound /></el-icon>
        <span>回复</span>
        <span v-if="discussion.reply_count" class="dc-count">{{ discussion.reply_count }}</span>
      </button>
      <button class="dc-action dc-action--view">
        <el-icon><View /></el-icon>
        <span>{{ formatNumber(discussion.views) }} 浏览</span>
      </button>
    </div>

    <!-- 回复列表 -->
    <div v-if="discussion.replies && discussion.replies.length > 0" class="dc-replies">
      <div class="dc-replies-header">{{ discussion.reply_count }} 条回复</div>
      <div
        v-for="reply in discussion.replies"
        :key="reply.id"
        class="dc-reply"
      >
        <el-avatar :size="28" :src="reply.author_avatar">{{ (reply.author || '?').charAt(0) }}</el-avatar>
        <div class="dc-reply-body">
          <div class="dc-reply-head">
            <span class="dc-reply-name">{{ reply.author }}</span>
            <span class="dc-reply-time">{{ reply.time }}</span>
          </div>
          <div class="dc-reply-text">{{ reply.content }}</div>
          <button
            class="dc-action dc-action--sm"
            :class="{ 'is-liked': reply.liked }"
            @click.stop="handleReplyLike(reply)"
          >
            <el-icon><StarFilled v-if="reply.liked" /><Star v-else /></el-icon>
            <span>{{ reply.like_count || 0 }}</span>
          </button>
        </div>
      </div>
      <button
        v-if="discussion.reply_count > discussion.replies.length && !allLoaded"
        class="dc-more-replies"
        @click.stop="loadMoreReplies"
      >
        查看更多回复
      </button>
    </div>

    <!-- 回复输入框 -->
    <div v-if="showReplyInput" class="dc-reply-input">
      <DewInput
        v-model="replyContent"
        type="textarea"
        :rows="2"
        placeholder="写下你的回复..."
      />
      <DewButton size="sm" :active="true" @click="submitReply">回复</DewButton>
    </div>
  </DewCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { ChatDotRound, View, Star, StarFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag, DewInput, DewButton, DewMessageBox } from '../ui'
import api from '../../api'

const props = defineProps({
  discussion: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['like', 'reply', 'delete', 'user-click'])

const store = useStore()
const showReplyInput = ref(false)
const replyContent = ref('')

// 正文折叠：超过阈值截断，提供「展开全文 / 收起」
const COLLAPSE_THRESHOLD = 200
const rawContent = computed(() => props.discussion.content || props.discussion.summary || '')
const isLong = computed(() => rawContent.value.length > COLLAPSE_THRESHOLD)
const expanded = ref(false)
const displayContent = computed(() =>
  isLong.value && !expanded.value
    ? rawContent.value.slice(0, COLLAPSE_THRESHOLD) + '…'
    : rawContent.value
)

// 是否可删除：本人发的帖 或 管理员
// 注意：登录存的 User_Id 是 zfill(7) 字符串（如 "0000001"），帖子 author_id 是原始整数，比较前都转 Number
const canDelete = computed(() => {
  const authorId = Number(props.discussion.authorId)
  if (!Number.isNaN(authorId) && authorId === Number(store.state.user?.User_Id)) return true
  return store.getters.role === 'super_admin' || store.state.user?.User_Mode === 'admin'
})

// 作者点击：进其个人主页（仅在有作者 id 时）
const onAuthorClick = () => {
  if (props.discussion.authorId != null) emit('user-click', props.discussion.authorId)
}

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}

// 相对时间格式化（与 CommunityView 一致，供懒加载的回复映射用）
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 是否已懒加载过全部回复（避免重复拉取）
const allLoaded = ref(false)
const loadMoreReplies = async () => {
  try {
    const res = await api.get(`/discussions/threads/${props.discussion.id}/replies`, {
      params: { per_page: 50 }
    })
    if (res.data && res.data.data) {
      props.discussion.replies = res.data.data.map(reply => ({
        id: reply.id,
        author: reply.author_name,
        authorId: reply.author_id,
        author_avatar: reply.author_avatar || '',
        content: reply.content,
        time: formatTimeAgo(reply.created_at),
        like_count: reply.like_count || 0,
        liked: reply.liked || false
      }))
      allLoaded.value = true
    }
  } catch (err) {
    console.error('加载更多回复失败:', err)
  }
}

const handleLike = async () => {
  try {
    const res = await api({
      url: `/discussions/reactions`,
      method: 'POST',
      data: {
        target_type: 'thread',
        target_id: props.discussion.id,
        reaction_type: 'like'
      }
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
      url: `/discussions/reactions`,
      method: 'POST',
      data: {
        target_type: 'reply',
        target_id: reply.id,
        reaction_type: 'like'
      }
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

const handleDelete = async () => {
  // 二次确认（DewUI 弹窗）：取消会 reject，直接返回
  try {
    await DewMessageBox.confirm('确定删除这条帖子吗？删除后不可恢复。', '删除帖子', {
      confirmText: '删除',
      cancelText: '取消',
    })
  } catch (e) {
    return // 用户取消
  }

  try {
    const res = await api({
      url: `/discussions/threads/${props.discussion.id}`,
      method: 'DELETE',
    })
    if (res.data.code === 200) {
      ElMessage.success('已删除')
      emit('delete', props.discussion)
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    console.error('删除失败:', err)
    ElMessage.error('删除失败，请稍后重试')
  }
}
</script>

<style scoped>
/* DewCard 负责玻璃表面（四层叠加 + hover 上浮），这里只管内容排版与卡片间距 */
.discussion-card {
  margin-bottom: 16px;
}

/* 分类标签行 */
.dc-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

/* 标题 */
.dc-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  margin: 0 0 12px 0;
  color: var(--dew-text-heading);
  transition: color 0.35s ease;
}

/* 作者信息 */
.dc-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  cursor: pointer;
}

.dc-author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dc-author-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--dew-text-heading);
}

.dc-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}

/* 内容 */
.dc-content {
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 16px;
  white-space: pre-wrap;
  color: var(--dew-text);
}

/* 正文折叠时的「展开全文 / 收起」 */
.dc-expand {
  display: inline-block;
  border: none;
  background: transparent;
  padding: 0;
  margin-top: -8px;
  margin-bottom: 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.dc-expand:hover {
  opacity: 0.75;
}

/* 回复列表底部「查看更多回复」（懒加载，避免初始 N+1） */
.dc-more-replies {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.25s ease;
}

.dc-more-replies:hover {
  background: var(--dew-card-divider);
}

/* 删除按钮（仅本人 / 管理员可见） */
.dc-delete {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--dew-text-faint);
  transition: color 0.25s ease, background 0.25s ease;
}

.dc-delete .el-icon {
  font-size: 16px;
}

.dc-delete:hover {
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.10);
}

/* 操作行：复用 DewPostCard 的轻量 action 模式（token 驱动 + dew-bounce） */
.dc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--dew-card-divider);
}

.dc-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--dew-text-muted);
  transition:
    color 0.25s ease,
    background 0.25s ease,
    transform 0.35s var(--dew-bounce);
}

.dc-action .el-icon {
  font-size: 16px;
}

.dc-action:hover {
  color: var(--dew-text-heading);
  background: var(--dew-ghost-hover-bg);
}

.dc-action:active {
  transform: scale(0.94);
}

.dc-action.is-liked {
  color: #f43f5e;
}

.dc-action.is-liked:hover {
  background: rgba(244, 63, 94, 0.10);
}

.dc-count {
  font-weight: 600;
}

.dc-action--view {
  margin-left: auto;
}

.dc-action--sm {
  padding: 3px 8px;
  font-size: 12px;
}

.dc-action--sm .el-icon {
  font-size: 14px;
}

/* 回复列表 */
.dc-replies {
  margin-bottom: 4px;
}

.dc-replies-header {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--dew-text-heading);
}

.dc-reply {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  transition: background 0.3s var(--dew-bounce);
}

.dc-reply:hover {
  background: var(--dew-card-inset-bg-hover);
}

.dc-reply-body {
  flex: 1;
  min-width: 0;
}

.dc-reply-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.dc-reply-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--dew-text-heading);
}

.dc-reply-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}

.dc-reply-text {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 6px;
  color: var(--dew-text);
}

/* 回复输入框 */
.dc-reply-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  align-items: flex-end;
}

.dc-reply-input :deep(.dew-input) {
  width: 100%;
}

/* 响应式 */
@media (max-width: 768px) {
  .dc-title {
    font-size: 16px;
  }

  .dc-action--view {
    margin-left: 0;
  }
}
</style>
