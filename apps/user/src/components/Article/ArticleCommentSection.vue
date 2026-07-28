<template>
  <div class="comment-section">
    <div class="comment-header">
      <h3 class="comment-title">评论</h3>
      <span class="comment-count">{{ comments.length }}</span>
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
        <DewButton size="sm" :active="true" :disabled="!newComment.trim()" @click="submitComment">
          发表评论
        </DewButton>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="comments.length" class="comment-list">
      <div v-for="c in comments" :key="c.id" class="comment-item">
        <el-avatar :size="36" :src="c.avatar">{{ (c.author || '?').charAt(0) }}</el-avatar>
        <div class="comment-body">
          <div class="comment-row">
            <span class="comment-name">{{ c.author }}</span>
            <span class="comment-time">{{ c.time }}</span>
          </div>
          <div class="comment-text">{{ c.content }}</div>
          <button
            class="cmt-action"
            :class="{ 'is-liked': c.liked }"
            @click="toggleLike(c)"
          >
            <el-icon><StarFilled v-if="c.liked" /><Star v-else /></el-icon>
            <span>{{ c.likeCount }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="comment-empty">还没有评论，快来抢沙发吧</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Star, StarFilled } from '@element-plus/icons-vue'
import { DewInput, DewButton } from '../ui'

defineProps({
  articleId: { type: [String, Number], default: null },
})

const store = useStore()

// ⚠️ mock 数据 —— 后端 TODO：
// ArticleComment 表目前只有 like_time / view_time，需加 content / create_time / parent_id 字段，
// 并补「发表 / 列表 / 删除 / 点赞」接口与权限防刷。当前评论仅前端本地态，刷新后重置。
const comments = ref([
  { id: 1, author: '同学 A', avatar: '', time: '2 小时前', content: '写得很清晰，组合式函数那段终于搞懂了！', liked: false, likeCount: 5 },
  { id: 2, author: '同学 B', avatar: '', time: '1 小时前', content: '能不能补充一下 watch 和 watchEffect 的区别？', liked: false, likeCount: 2 },
])
const newComment = ref('')
let nextId = 3

const isLoggedIn = () => !!localStorage.getItem('token')

const submitComment = () => {
  const text = newComment.value.trim()
  if (!text) return
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录后再评论')
    return
  }
  // TODO: 后端待补 —— 接 POST /article/{id}/comment
  const user = store.state.user || {}
  comments.value.unshift({
    id: nextId++,
    author: user.username || user.User_Name || '我',
    avatar: user.avatar || user.avatar_url || '',
    time: '刚刚',
    content: text,
    liked: false,
    likeCount: 0,
  })
  newComment.value = ''
  ElMessage.success('评论成功（演示数据，刷新后重置）')
}

const toggleLike = (c) => {
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  // TODO: 后端待补 —— 接 POST /article/comment/like
  c.liked = !c.liked
  c.likeCount += c.liked ? 1 : -1
}
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
