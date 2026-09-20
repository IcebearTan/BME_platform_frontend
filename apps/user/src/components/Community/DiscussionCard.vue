<template>
  <DewCard
    size="lg"
    interactive
    class="discussion-card"
    :data-discussion-id="discussion.id"
    @click="goDetail"
  >
    <!-- 分类标签 -->
    <div class="dc-tags">
      <DewTag type="neutral" size="sm" round>讨论</DewTag>
      <DewTag v-if="discussion.topic" type="info" size="sm" round>{{ discussion.topic }}</DewTag>
      <DewTag v-if="discussion.isEssence" type="success" size="sm" round>精华</DewTag>
      <span
        v-if="discussion.projectTitle"
        class="dc-project"
        title="关联的 XLAB 项目"
        @click.stop="goProject"
      >
        <el-icon><Grid /></el-icon>{{ discussion.projectTitle }}
      </span>
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
        <div class="dc-author-line">
          <span class="dc-author-name">{{ discussion.author }}</span>
          <!-- 干事徽章：作者当前主职（无任职后端不下发，不渲染） -->
          <DewTag v-if="discussion.author_badge" type="warning" size="sm" round class="dc-author-badge">
            {{ discussion.author_badge }}
          </DewTag>
        </div>
        <span class="dc-time">{{ discussion.publishTime }}</span>
      </div>
    </div>

    <!-- 正文（过长自动折叠） -->
    <div class="dc-content">{{ displayContent }}</div>
    <button v-if="isLong" class="dc-expand" @click.stop="expanded = !expanded">
      {{ expanded ? '收起' : '展开全文' }}
    </button>

    <!-- 图集（09-19 社区重设计）：1-4 图自适应网格，点击大图查看 -->
    <div v-if="images.length" :class="['dc-images', `dc-images--${Math.min(images.length, 4)}`]">
      <DewImage v-for="(img, i) in images" :key="img" class="dc-images__item"
                :src="img" ratio="4/3" alt="帖子图片" @click.stop="openViewer(i)" />
    </div>

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
      <button class="dc-action" @click.stop="goDetail">
        <el-icon><ChatDotRound /></el-icon>
        <span>回复</span>
        <span v-if="discussion.reply_count" class="dc-count">{{ discussion.reply_count }}</span>
      </button>
      <button class="dc-action dc-action--view">
        <el-icon><View /></el-icon>
        <span>{{ formatNumber(discussion.views) }} 浏览</span>
      </button>
    </div>

    <!-- 图集大图查看器 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="images"
      :initial-index="viewerIndex"
      teleported
      @close="viewerVisible = false"
    />
  </DewCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ChatDotRound, View, Star, StarFilled, Delete, Grid } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag, DewMessageBox } from '@bme/dew-ui'
import api from '../../api'

const props = defineProps({
  discussion: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['like', 'reply', 'delete', 'user-click'])

const store = useStore()
const router = useRouter()

// 新开标签页打开（09-20 用户定调）：社区流原地保留，点开的内容在新页承载
const openTab = (path) => window.open(router.resolve(path).href, '_blank', 'noopener')

// 关联项目 chip：新页直达 XLAB 项目详情（Phase 2 招人帖导流）
const goProject = () => {
  if (props.discussion.projectId != null) openTab(`/projects/${props.discussion.projectId}`)
}

// 整卡进帖子详情页（新标签页；feed 卡只做浏览层，互动都在详情页）
const goDetail = () => openTab(`/community/thread/${props.discussion.id}`)

// 帖子图集（09-19）：feed 映射后已是完整 URL
const images = computed(() => props.discussion.images || [])
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const openViewer = (i) => {
  viewerIndex.value = i
  viewerVisible.value = true
}

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
  return store.getters.role === 'super_admin'
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

.dc-author-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dc-author-badge {
  flex-shrink: 0;
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
/* 图集（09-19）：1 图大 / 2-4 图网格，点击大图查看 */
.dc-images {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
.dc-images--1 { grid-template-columns: minmax(0, 420px); }
.dc-images--2, .dc-images--4 { grid-template-columns: repeat(2, 1fr); }
.dc-images--3 { grid-template-columns: repeat(3, 1fr); }
.dc-images__item { width: 100%; cursor: zoom-in; border-radius: var(--radius-sm, 8px); overflow: hidden; }

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
