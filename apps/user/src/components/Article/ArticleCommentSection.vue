<template>
  <div class="comment-section">
    <div class="comment-header">
      <h3 class="comment-title">评论</h3>
      <span class="comment-count">{{ total }}</span>
    </div>

    <!-- 发表框 -->
    <div class="comment-form">
      <DewInput
        v-model="newComment"
        type="textarea"
        :rows="3"
        placeholder="写下你的评论..."
      />
      <div class="comment-form-foot">
        <DewButton
          size="sm"
          :active="true"
          :disabled="!newComment.trim() || submitting"
          @click="submitComment"
        >
          {{ submitting ? '发表中...' : '发表评论' }}
        </DewButton>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="comment-empty">加载中...</div>
    <div v-else-if="comments.length" class="comment-list">
      <div v-for="c in comments" :key="c.id" class="comment-item">
        <el-avatar :size="36" :src="c.author_avatar">{{ (c.author_name || '?').charAt(0) }}</el-avatar>
        <div class="comment-body">
          <div class="comment-row">
            <span class="comment-name">{{ c.author_name }}</span>
            <span class="comment-time">{{ formatTime(c.created_at) }}</span>
          </div>
          <div class="comment-text">{{ c.content }}</div>
          <button
            class="cmt-action"
            :class="{ 'is-liked': c.liked }"
            @click="toggleLike(c)"
          >
            <el-icon><StarFilled v-if="c.liked" /><Star v-else /></el-icon>
            <span>{{ c.like_count }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="comment-empty">还没有评论，快来抢沙发吧</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Star, StarFilled } from '@element-plus/icons-vue'
import { DewInput, DewButton } from '../ui'
import api from '../../api'

const props = defineProps({
  articleId: { type: [String, Number], required: true },
})

const threadId = ref(null)
const comments = ref([])
const total = ref(0)
const newComment = ref('')
const loading = ref(true)
const submitting = ref(false)

const isLoggedIn = () => !!localStorage.getItem('token')

// 绝对时间 → 相对时间
const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t.replace(' ', 'T'))
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前'
  return d.toLocaleDateString('zh-CN')
}

// 获取或创建该文章的评论汇总 thread
const ensureThread = async () => {
  const res = await api({ method: 'get', url: `/discussions/article/${props.articleId}/thread` })
  threadId.value = res.data.data.thread_id
}

// 加载评论列表（discussion 的一级回复）
const loadComments = async () => {
  if (!threadId.value) { loading.value = false; return }
  loading.value = true
  try {
    const res = await api({ method: 'get', url: `/discussions/threads/${threadId.value}/replies` })
    comments.value = (res.data.data || []).map(r => ({ ...r, liked: false }))
    total.value = res.data.total ?? comments.value.length
  } catch (e) {
    console.error('加载评论失败', e)
  } finally {
    loading.value = false
  }
}

const submitComment = async () => {
  const text = newComment.value.trim()
  if (!text) return
  if (!isLoggedIn()) { ElMessage.warning('请先登录后再评论'); return }
  if (!threadId.value) { ElMessage.error('评论区未就绪'); return }
  submitting.value = true
  try {
    const res = await api({
      method: 'post',
      url: `/discussions/threads/${threadId.value}/replies`,
      data: { content: text }
    })
    if (res.data.code === 201) {
      ElMessage.success('评论成功')
      newComment.value = ''
      await loadComments()
    } else {
      ElMessage.error(res.data.message || '评论失败')
    }
  } catch (e) {
    console.error('评论失败', e)
    ElMessage.error('评论失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const toggleLike = async (c) => {
  if (!isLoggedIn()) { ElMessage.warning('请先登录后再点赞'); return }
  // 乐观更新（discussion 的 reactions 接口为切换语义）
  c.liked = !c.liked
  c.like_count += c.liked ? 1 : -1
  try {
    await api({
      method: 'post',
      url: '/discussions/reactions',
      data: { target_type: 'reply', target_id: c.id, reaction_type: 'like' }
    })
  } catch (e) {
    // 失败回滚
    c.liked = !c.liked
    c.like_count += c.liked ? 1 : -1
    console.error('点赞失败', e)
    ElMessage.error('操作失败，请稍后重试')
  }
}

onMounted(async () => {
  try {
    await ensureThread()
    await loadComments()
  } catch (e) {
    console.error('评论区初始化失败', e)
    loading.value = false
  }
})
</script>

<style scoped>
.comment-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.comment-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.comment-count {
  font-size: 13px;
  color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums;
}

/* 发表框 */
.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-form-foot {
  display: flex;
  justify-content: flex-end;
}

/* 列表 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  transition: background 0.3s var(--dew-bounce);
}

.comment-item:hover {
  background: var(--dew-card-inset-bg-hover);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--dew-text-heading);
}

.comment-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}

.comment-text {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 6px;
  color: var(--dew-text);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 轻量 action（平移 DiscussionCard 的 dc-action 模式，token 驱动） */
.cmt-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--dew-text-muted);
  transition: color 0.25s ease, background 0.25s ease, transform 0.35s var(--dew-bounce);
}

.cmt-action .el-icon {
  font-size: 14px;
}

.cmt-action:hover {
  color: var(--dew-text-heading);
  background: var(--dew-ghost-hover-bg);
}

.cmt-action:active {
  transform: scale(0.94);
}

.cmt-action.is-liked {
  color: #f43f5e;
}

.comment-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-faint);
}
</style>
