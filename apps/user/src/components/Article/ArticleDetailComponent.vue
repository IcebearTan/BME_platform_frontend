<template>
  <div class="article-wrap">
    <div class="article-layout">
      <!-- 主列：正文 + 评论 -->
      <div class="article-primary">
        <!-- 正文卡（纯色扁平） -->
        <DewCard variant="flat" size="lg" class="article-main">
          <!-- 头部 -->
          <header class="article-header">
            <h1 class="article-title">{{ articleTitle }}</h1>
            <div class="article-meta">
              <div class="author-info">
                <el-avatar :size="40">{{ (articleAuthor || '?').charAt(0) }}</el-avatar>
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
          </header>

          <!-- 正文 -->
          <div class="article-content">
            <div class="content-body" v-html="article"></div>
          </div>

          <!-- 底部交互栏 -->
          <footer class="article-footer">
            <div class="actions">
              <button
                class="art-action"
                :class="{ 'is-liked': isLiked }"
                @click="handleLike"
              >
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
              <button
                class="art-action"
                :class="{ 'is-favorited': isFavorited }"
                @click="toggleFavorite"
              >
                <el-icon><Collection /></el-icon>
                <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
              </button>
            </div>
          </footer>
        </DewCard>

        <!-- 评论区（纯色扁平） -->
        <DewCard variant="flat" size="lg" class="article-comments" :id="`comments-${articleId}`">
          <ArticleCommentSection :article-id="articleId" />
        </DewCard>
      </div>

      <!-- 侧边栏 -->
      <aside class="article-sidebar">
        <!-- 目录 -->
        <DewCard variant="flat" divided class="side-card">
          <template #header>目录</template>
          <div v-if="toc.length === 0" class="placeholder">暂无目录</div>
          <ul v-else class="toc-list">
            <li
              v-for="item in toc"
              :key="item.id"
              class="toc-item"
              :class="[`toc-level-${item.level}`, { active: item.id === activeId }]"
              @click="scrollToHeading(item.id)"
            >
              <a class="toc-link">
                <span class="toc-index">{{ item.index }}</span>
                {{ item.text }}
              </a>
            </li>
          </ul>
        </DewCard>

        <!-- 关于作者 -->
        <DewCard variant="flat" divided class="side-card">
          <template #header>关于作者</template>
          <div class="author-card">
            <el-avatar :size="56">{{ (articleAuthor || '?').charAt(0) }}</el-avatar>
            <h4 class="author-card-name">{{ articleAuthor }}</h4>
            <p class="author-card-desc">技术分享者</p>
          </div>
        </DewCard>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Star, StarFilled, ChatDotRound, Share, Collection } from '@element-plus/icons-vue'
import { DewCard } from '../ui'
import api from '../../api'
import ArticleCommentSection from './ArticleCommentSection.vue'

const route = useRoute()
const articleId = route.query.Article_Id

const article = ref('')
const articleTitle = ref('')
const articleTime = ref('')
const articleAuthor = ref('')
const toc = ref([])
const viewCount = ref(0)
const likeCount = ref(0)
const isLiked = ref(false)
const isFavorited = ref(false)
const activeId = ref('')
const threadId = ref(null)

let tocObserver = null

// 生成目录（带多级序号），并把 id 写回正文 heading
const generateTOC = (htmlContent) => {
  if (!htmlContent) return []
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const tocList = []
  const numberStack = [0, 0, 0, 0, 0, 0]
  let lastLevel = 1
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (level > lastLevel) numberStack[level - 1] = 1
    else if (level === lastLevel) numberStack[level - 1]++
    else { numberStack[level - 1]++; for (let i = level; i < 6; i++) numberStack[i] = 0 }
    lastLevel = level
    const indexStr = numberStack.slice(0, level).filter(n => n > 0).join('.')
    const id = `toc-heading-${index}`
    heading.id = id
    tocList.push({ id, text: heading.textContent.trim(), level, index: indexStr })
  })
  article.value = tempDiv.innerHTML
  return tocList
}

const scrollToHeading = (headingId) => {
  const el = document.getElementById(headingId)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const scrollToComments = () => {
  const el = document.getElementById(`comments-${articleId}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// TOC 滚动跟随高亮：监听正文 heading，最靠上的可见项设为 active
const setupTocObserver = () => {
  if (tocObserver) tocObserver.disconnect()
  if (!toc.value.length) return
  tocObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting)
    if (visible.length) {
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      activeId.value = visible[0].target.id
    }
  }, { rootMargin: '0px 0px -75% 0px', threshold: 0 })
  toc.value.forEach(item => {
    const el = document.getElementById(item.id)
    if (el) tocObserver.observe(el)
  })
}

const getArticle = async () => {
  try {
    const response = await api({ method: 'get', url: '/article', params: { Article_Id: articleId } })
    const data = response.data
    articleTitle.value = data.Article_Title
    articleTime.value = data.Publish_Time
    articleAuthor.value = data.Article_Author
    const htmlContent = JSON.parse(data.html_content)
    toc.value = generateTOC(htmlContent)
  } catch (e) {
    console.error('获取文章失败', e)
  }
}

const fetchStatistic = async () => {
  try {
    const token = localStorage.getItem('token')
    const user = token ? 'loginUser' : ''
    const res = await api({ method: 'get', url: '/article/statistic', params: { Article_Id: articleId, user } })
    likeCount.value = res.data?.like_count ?? 0
    viewCount.value = res.data?.view_count ?? 0
    isLiked.value = res.data?.user_liked ?? false
  } catch (e) {
    console.error('获取统计失败', e)
  }
}

const postStatistic = async (like = false, view = false) => {
  try {
    const token = localStorage.getItem('token')
    const user = token ? 'loginUser' : ''
    await api({ method: 'post', url: '/article/statistic', data: { Article_Id: articleId, like, view, user } })
  } catch (e) {
    console.error('统计操作失败', e)
  }
}

const handleLike = async () => {
  const token = localStorage.getItem('token')
  if (!token) { ElMessage.warning('请先登录后再点赞'); return }
  const shouldLike = !isLiked.value
  await postStatistic(shouldLike, true)
  await fetchStatistic()
  if (shouldLike) ElMessage.success('点赞成功')
  else ElMessage.info('已取消点赞')
}

// 获取/创建文章评论汇总 thread（收藏挂在其上，复用 discussion reaction）
const ensureArticleThread = async () => {
  try {
    const res = await api({ method: 'get', url: `/discussions/article/${articleId}/thread` })
    threadId.value = res.data.data.thread_id
  } catch (e) {
    console.error('获取文章主题失败', e)
  }
}

// 拉取当前用户对该文章的收藏状态
const fetchFavorite = async () => {
  if (!threadId.value) return
  try {
    const res = await api({ method: 'get', url: `/discussions/threads/${threadId.value}/reactions/me` })
    isFavorited.value = res.data?.data?.bookmarked ?? false
  } catch (e) {
    console.error('获取收藏状态失败', e)
  }
}

const toggleFavorite = async () => {
  const token = localStorage.getItem('token')
  if (!token) { ElMessage.warning('请先登录后再收藏'); return }
  if (!threadId.value) { ElMessage.error('操作失败，请稍后重试'); return }
  isFavorited.value = !isFavorited.value  // 乐观更新
  try {
    await api({
      method: 'post',
      url: '/discussions/reactions',
      data: { target_type: 'thread', target_id: threadId.value, reaction_type: 'bookmark' }
    })
    ElMessage.success(isFavorited.value ? '已收藏' : '已取消收藏')
  } catch (e) {
    isFavorited.value = !isFavorited.value  // 回滚
    console.error('收藏失败', e)
    ElMessage.error('操作失败，请稍后重试')
  }
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

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  await getArticle()
  await fetchStatistic()
  if (!viewCount.value) {
    await postStatistic(false, true)
    await fetchStatistic()
  }
  await ensureArticleThread()
  await fetchFavorite()
  await nextTick()
  setupTocObserver()
})

onBeforeUnmount(() => {
  if (tocObserver) tocObserver.disconnect()
})
</script>

<style scoped>
.article-wrap {
  font-family: var(--dew-font, inherit);
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px 48px;
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

/* flat 正文/评论卡：清掉 DewCard 默认内边距，由内部三段自定义 */
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
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
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

.meta-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
}

.stat .el-icon {
  font-size: 15px;
}

/* ━━━━ 正文（v-html 内容用 :deep 命中并 token 化，跟随暗色） ━━━━ */
.article-content {
  padding: 28px 40px;
}

.article-content :deep(.content-body) {
  font-size: 16px;
  line-height: 1.85;
  color: var(--dew-text);
  word-break: break-word;
}

.article-content :deep(.content-body h1),
.article-content :deep(.content-body h2),
.article-content :deep(.content-body h3),
.article-content :deep(.content-body h4),
.article-content :deep(.content-body h5),
.article-content :deep(.content-body h6) {
  margin: 28px 0 14px;
  color: var(--dew-text-heading);
  font-weight: 600;
  scroll-margin-top: 80px;
}

.article-content :deep(.content-body h1) { font-size: 26px; }
.article-content :deep(.content-body h2) { font-size: 22px; }
.article-content :deep(.content-body h3) { font-size: 18px; }

.article-content :deep(.content-body p) {
  margin: 14px 0;
  line-height: 1.85;
}

.article-content :deep(.content-body code) {
  background: var(--dew-card-inset-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--dew-font-mono, monospace);
  font-size: 14px;
  color: var(--dew-text);
}

.article-content :deep(.content-body pre) {
  background: var(--dew-card-inset-bg);
  padding: 16px 18px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 20px 0;
  border: 1px solid var(--dew-card-inset-border);
}

.article-content :deep(.content-body pre code) {
  background: transparent;
  padding: 0;
  font-size: 14px;
  line-height: 1.6;
}

.article-content :deep(.content-body img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 20px 0;
}

.article-content :deep(.content-body blockquote) {
  margin: 16px 0;
  padding: 4px 16px;
  border-left: 3px solid var(--dew-card-flat-divider);
  color: var(--dew-text-muted);
}

.article-content :deep(.content-body ul),
.article-content :deep(.content-body ol) {
  padding-left: 22px;
  margin: 14px 0;
}

.article-content :deep(.content-body li) {
  margin: 6px 0;
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

/* 轻量 action（平移 DiscussionCard 的 dc-action 模式，token 驱动） */
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
  font-variant-numeric: tabular-nums;
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

.art-action.is-liked:hover {
  background: rgba(244, 63, 94, 0.10);
}

.art-action.is-favorited {
  color: #f59e0b;
}

.art-action.is-favorited:hover {
  background: rgba(245, 158, 11, 0.10);
}

.art-count {
  font-weight: 600;
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

.placeholder {
  color: var(--dew-text-faint);
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
  margin: 0;
}

/* 目录 */
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-link {
  display: block;
  padding: 7px 10px;
  color: var(--dew-text-muted);
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.toc-index {
  color: var(--dew-text-faint);
  font-size: 12px;
  margin-right: 6px;
  font-variant-numeric: tabular-nums;
}

.toc-link:hover {
  color: var(--dew-text-heading);
  background: var(--dew-ghost-hover-bg);
}

.toc-item.active > .toc-link {
  color: var(--dew-text-heading);
  font-weight: 600;
  background: var(--dew-ghost-hover-bg);
}

.toc-level-2 .toc-link { padding-left: 20px; font-size: 12.5px; }
.toc-level-3 .toc-link { padding-left: 30px; font-size: 12.5px; }
.toc-level-4 .toc-link,
.toc-level-5 .toc-link,
.toc-level-6 .toc-link { padding-left: 40px; font-size: 12px; }

/* 作者卡 */
.author-card {
  text-align: center;
  padding: 4px 0;
}

.author-card :deep(.el-avatar),
.author-card-name,
.author-card-desc {
  margin: 0;
}

.author-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .article-sidebar {
    flex-direction: column;
  }
}
</style>
