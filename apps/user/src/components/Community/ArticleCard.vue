<template>
  <DewCard
    variant="flat"
    size="lg"
    interactive
    class="article-card"
    @click="onOpen"
  >
    <!-- 顶部：文章标签 + 时间 -->
    <div class="ac-head">
      <span class="ac-type">
        <el-icon class="ac-type__icon"><Document /></el-icon>
        文章
      </span>
      <span class="ac-time">{{ timeLabel }}</span>
    </div>

    <!-- 标题 -->
    <h3 class="ac-title">{{ article.title }}</h3>

    <!-- 简介（截断两行） -->
    <p class="ac-summary">{{ article.summary || article.introduction }}</p>

    <!-- 底部：作者 / 评论数 / 阅读全文 -->
    <div class="ac-foot">
      <div class="ac-author" @click.stop="onAuthorClick">
        <el-avatar :size="24" :src="article.author_avatar" />
        <span class="ac-name">{{ article.author_name }}</span>
      </div>
      <!-- 个人主页作者本人传入的编辑/删除操作（社区复用不传则不渲染） -->
      <div v-if="$slots.actions" class="ac-actions" @click.stop>
        <slot name="actions" />
      </div>
      <div class="ac-meta">
        <span class="ac-comments">
          <el-icon><ChatDotRound /></el-icon>
          {{ article.reply_count || 0 }}
        </span>
        <span class="ac-readmore">
          阅读全文
          <el-icon class="ac-readmore__arrow"><ArrowRight /></el-icon>
        </span>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { computed } from 'vue'
import { Document, ChatDotRound, ArrowRight } from '@element-plus/icons-vue'
import { DewCard } from '../ui'

const props = defineProps({
  /** 聚合信息流中的文章项（/community/feed 返回，type==='article'） */
  article: { type: Object, required: true },
})

const emit = defineEmits(['open', 'user-click'])

const onOpen = () => emit('open', props.article)

// 作者点击：进其个人主页（仅在有作者 id 时）
const onAuthorClick = () => {
  if (props.article.authorId != null) emit('user-click', props.article.authorId)
}

// 轻量的相对时间格式（与社区其它卡片口径一致）
const timeLabel = computed(() => formatTimeAgo(props.article.created_at))

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(date.getTime())) return dateStr
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
/* DewCard(flat) 负责纯色阅读基底（静态 hover），这里只排版 + 给一个克制的可点提示 */
.article-card {
  margin-bottom: 16px;
}

/* 顶部标签行 */
.ac-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

/* 文章标签：项目主色 primary（文章作为核心长内容担当主色，与讨论帖灰标签区分） */
.ac-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--radius-full, 999px);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.ac-type__icon {
  font-size: 13px;
}
.ac-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}

/* 标题 */
.ac-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  margin: 0 0 8px 0;
  color: var(--dew-text-heading);
  transition: color 0.3s ease;
}

/* 简介 */
.ac-summary {
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 14px 0;
  color: var(--dew-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部 */
.ac-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ac-author {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  cursor: pointer;
}
.ac-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dew-text-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ac-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.ac-comments {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums;
}
.ac-comments .el-icon {
  font-size: 15px;
}

/* 操作区（个人主页作者本人可见的编辑/删除） */
.ac-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 阅读全文：克制的可点引导（hover 箭头位移 + 主色） */
.ac-readmore {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dew-text-muted);
  transition: gap 0.3s var(--dew-bounce, ease);
}
.ac-readmore__arrow {
  font-size: 14px;
  transition: transform 0.3s var(--dew-bounce, ease);
}

/* 卡片可点提示：标题保持原色，仅「阅读全文」箭头右移（不动 flat 静态背景） */
.article-card:hover :deep(.ac-readmore__arrow) {
  transform: translateX(3px);
}

@media (max-width: 768px) {
  .ac-title {
    font-size: 16px;
  }
}
</style>
