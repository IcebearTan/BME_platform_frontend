<script setup>
/**
 * 文章阅读页 V2（Markdown 渲染）。
 * 拷贝自 ArticleDetailComponent.vue 的外壳（DewCard flat 正文框 / 侧栏作者卡 / 操作栏 / 响应式），
 * 换掉与 v1 HTML 系统硬耦合的部分：
 *   - 拉取：GET /v2/article/<id> → content_md（裸 Markdown）
 *   - 渲染：v-html → MdPreview（md-editor-v3）
 *   - 目录：临时 div + IntersectionObserver → MdCatalog
 * 互动区（点赞 / 评论 / 收藏）走 discussion 体系，与 v1 同构（useArticleReactions）。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Share, Star, StarFilled, ChatDotRound, Collection, View } from '@element-plus/icons-vue'
import { DewCard, DewSkeleton } from '../../ui'
import { MdPreview, MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import './md-setup' // 自托管 highlight.js（与编辑器共享）
import api from '../../../api'
import ArticleCommentSection from '../ArticleCommentSection.vue'
import { useArticleReactions } from '../../../composables/useArticleReactions'

const PREVIEW_ID = 'article-v2-preview' // MdPreview 与 MdCatalog 共享，锚点一致

const route = useRoute()
const router = useRouter()
const store = useStore()
const articleId = ref(route.query.id)
const loading = ref(true)   // 首屏加载态：文章头部 + 正文骨架占位

const isDarkMode = computed(() => store.getters.isDarkMode)
const editorTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

const contentMd = ref('')
const articleTitle = ref('')
const articleTime = ref('')
const articleAuthor = ref('')
const authorAvatar = ref('')
const authorId = ref(null)

// 互动状态（点赞 / 收藏 / 计数），v2 走 discussion reaction 体系
const {
  likeCount, replyCount, viewCount, isLiked, isFavorited,
  initCounts, ensureThread, fetchMe, recordView, toggleLike, toggleFav,
} = useArticleReactions(articleId, 2)

const isLoggedIn = () => !!localStorage.getItem('token')

// 阅读页正文随页面流滚动 → 目录跟随 documentElement
const scrollEl = typeof document !== 'undefined' ? document.documentElement : undefined

const getArticle = async () => {
  if (!articleId.value) return
  try {
    const res = await api({ method: 'get', url: `/v2/article/${articleId.value}` })
    const d = res.data.data || {} // V2 返 {code, data:{...}}，比 v1 多一层 data
    articleTitle.value = d.title || ''
    articleTime.value = d.publish_time || ''
    articleAuthor.value = d.author_name || ''
    authorId.value = d.author_id ?? null
    authorAvatar.value = d.author_avatar || ''
    contentMd.value = d.content_md || ''
    // 详情接口附带的计数（匿名也有），回填互动 composable
    initCounts(d.like_count ?? 0, d.reply_count ?? 0, d.view_count ?? 0)
  } catch (e) {
    console.error('获取文章失败', e)
    ElMessage.error('文章加载失败')
  } finally {
    loading.value = false
  }
}

const goAuthor = () => {
  if (authorId.value == null) return
  router.push({ name: 'user-profile', params: { id: authorId.value } })
}

const handleShare = async () => {
  const url = window.location.href
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.info('分享链接：' + url)
  }
}

const scrollToComments = () => {
  const el = document.getElementById(`comments-${articleId.value}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  await getArticle()
  // 已登录：建立 / 取得汇总 thread 并拉取本人点赞 / 收藏态（匿名跳过，计数已由详情接口带回）
  if (isLoggedIn()) {
    try {
      await ensureThread()
      await fetchMe()
      await recordView()
    } catch (e) {
      console.error('互动区初始化失败', e)
    }
  }
})
</script>

<template>
  <div class="article-wrap">
    <div class="article-layout">
      <!-- 主列：正文 -->
      <div class="article-primary">
        <DewCard variant="flat" size="lg" class="article-main">
          <!-- 头部 -->
          <header class="article-header">
            <template v-if="loading">
              <DewSkeleton variant="text" width="60%" height="30px" style="margin-bottom: 20px;" />
              <div class="article-meta">
                <div class="author-info">
                  <DewSkeleton variant="circle" :size="40" />
                  <div class="author-details" style="display: flex; flex-direction: column; gap: 6px;">
                    <DewSkeleton variant="text" width="100px" />
                    <DewSkeleton variant="text" width="80px" height="12px" />
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <h1 class="article-title">{{ articleTitle }}</h1>
              <div class="article-meta">
                <div class="author-info" :class="{ clickable: authorId != null }" @click="goAuthor">
                  <el-avatar :size="40" :src="authorAvatar">{{ (articleAuthor || '?').charAt(0) }}</el-avatar>
                  <div class="author-details">
                    <span class="author-name">{{ articleAuthor }}</span>
                    <time class="publish-time">{{ formatTime(articleTime) }}</time>
                  </div>
                </div>
                <div class="meta-stats">
                  <span class="stat"><el-icon><View /></el-icon>{{ viewCount }}</span>
                  <span class="stat"><el-icon><Star /></el-icon>{{ likeCount }}</span>
                </div>
              </div>
            </template>
          </header>

          <!-- 正文（Markdown 渲染） -->
          <div class="article-content">
            <DewSkeleton v-if="loading" variant="text" :lines="8" :gap="14" />
            <MdPreview
              v-else
              :model-value="contentMd"
              :id="PREVIEW_ID"
              :theme="editorTheme"
              preview-theme="default"
              code-theme="atom"
            />
          </div>

          <!-- 底部交互栏 -->
          <footer class="article-footer">
            <div class="actions">
              <button class="art-action" :class="{ 'is-liked': isLiked }" @click="toggleLike">
                <el-icon><StarFilled v-if="isLiked" /><Star v-else /></el-icon>
                <span>{{ isLiked ? '已点赞' : '点赞' }}</span>
                <span v-if="likeCount" class="art-count">{{ likeCount }}</span>
              </button>
              <button class="art-action" @click="scrollToComments">
                <el-icon><ChatDotRound /></el-icon>
                <span>评论</span>
              </button>
              <button class="art-action" @click="handleShare">
                <el-icon><Share /></el-icon>
                <span>分享</span>
              </button>
              <button class="art-action" :class="{ 'is-favorited': isFavorited }" @click="toggleFav">
                <el-icon><Collection /></el-icon>
                <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
              </button>
            </div>
          </footer>
        </DewCard>

        <!-- 评论区（复用 ArticleCommentSection，:version=2 走 article_v2 thread） -->
        <DewCard variant="flat" size="lg" class="article-comments" :id="`comments-${articleId}`">
          <ArticleCommentSection :article-id="articleId" :version="2" />
        </DewCard>
      </div>

      <!-- 侧边栏 -->
      <aside class="article-sidebar">
        <!-- 目录（MdCatalog 跟随 MdPreview 的标题） -->
        <DewCard variant="flat" divided class="side-card">
          <template #header>目录</template>
          <MdCatalog :editor-id="PREVIEW_ID" :theme="editorTheme" :scroll-element="scrollEl" />
        </DewCard>

        <!-- 关于作者 -->
        <DewCard variant="flat" divided class="side-card">
          <template #header>关于作者</template>
          <div class="author-card" :class="{ clickable: authorId != null }" @click="goAuthor">
            <el-avatar :size="56" :src="authorAvatar">{{ (articleAuthor || '?').charAt(0) }}</el-avatar>
            <h4 class="author-card-name">{{ articleAuthor }}</h4>
            <p class="author-card-desc">技术分享者</p>
          </div>
        </DewCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.article-wrap {
  font-family: var(--dew-font, inherit);
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px 48px;
  box-sizing: border-box;
}

.article-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.article-primary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* flat 正文卡：清掉 DewCard 默认内边距，由内部三段自定义 */
.article-main :deep(.dew-card__body) {
  padding: 0;
}

/* ━━━━ 头部 ━━━━ */
.article-header {
  padding: 36px 40px 24px;
  border-bottom: 1px solid var(--dew-card-flat-divider);
}

.article-title {
  margin: 0 0 20px 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--dew-text-heading);
  word-break: break-word;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info.clickable {
  cursor: pointer;
}

.author-info.clickable:hover :deep(.el-avatar) {
  transform: scale(1.06);
}

.author-info :deep(.el-avatar) {
  transition: transform 0.35s var(--dew-bounce, ease);
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.publish-time {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* ━━━━ 正文（MdPreview） ━━━━ */
.article-content {
  padding: 28px 40px;
  overflow-x: auto; /* 宽代码/表格在正文卡内滚动，不冒泡到 el-main（否则会破坏侧栏 sticky） */
}

/* 让 MdPreview 透明融入 flat 卡片背景（亮/暗由 theme 接管） */
.article-content :deep(.md-editor),
.article-content :deep(.md-editor-preview-wrapper) {
  background: transparent !important;
  border: none;
}

/* ━━━━ 底部交互栏 ━━━━ */
.article-footer {
  padding: 20px 40px 32px;
  border-top: 1px solid var(--dew-card-flat-divider);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.art-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--dew-text-muted);
  transition: color 0.25s ease, background 0.25s ease, transform 0.35s var(--dew-bounce);
}

.art-action .el-icon {
  font-size: 17px;
}

.art-action:hover {
  color: var(--dew-text-heading);
  background: var(--dew-ghost-hover-bg);
}

.art-action:active {
  transform: scale(0.95);
}

.art-action.is-liked {
  color: #f43f5e;
}

.art-action.is-favorited {
  color: #f59e0b;
}

.art-count {
  font-variant-numeric: tabular-nums;
}

/* 头部统计（浏览数 / 点赞数） */
.meta-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.meta-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums;
}

.meta-stats .stat .el-icon {
  font-size: 15px;
}

/* ━━━━ 侧边栏 ━━━━ */
.article-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 20px;
}

/* 目录（MdCatalog）融入卡片，限制高度滚动 */
.side-card :deep(.md-editor-catalog) {
  font-size: 13px;
  color: var(--dew-text-muted);
  max-height: 50vh;
  overflow-y: auto;
}

.side-card :deep(.md-editor-catalog-active > span) {
  color: var(--dew-text-heading);
  font-weight: 600;
}

/* 作者卡 */
.author-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 4px 0;
  cursor: default;
}

.author-card :deep(.el-avatar),
.author-card-name,
.author-card-desc {
  margin: 0;
}

.author-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.author-card-desc {
  font-size: 13px;
  color: var(--dew-text-faint);
  line-height: 1.5;
}

.author-card.clickable {
  cursor: pointer;
}

.author-card.clickable:hover :deep(.el-avatar) {
  transform: scale(1.06);
}

.author-card :deep(.el-avatar) {
  transition: transform 0.35s var(--dew-bounce, ease);
}

/* ━━━━ 响应式 ━━━━ */
@media (max-width: 1024px) {
  .article-layout {
    flex-direction: column;
  }

  .article-sidebar {
    width: 100%;
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .side-card {
    flex: 1;
    min-width: 240px;
  }
}

@media (max-width: 640px) {
  .article-wrap {
    padding: 16px 14px 32px;
  }

  .article-header {
    padding: 24px 20px 20px;
  }

  .article-content {
    padding: 22px 20px;
  }

  .article-footer {
    padding: 18px 20px 26px;
  }

  .article-title {
    font-size: 22px;
  }

  .article-sidebar {
    flex-direction: column;
  }
}
</style>
