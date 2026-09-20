<template>
  <div :class="['community-view-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端汉堡图标 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>
      
      <!-- 移动端菜单 -->
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="community-main-container">
        <!-- 双栏布局容器（左主列 + 右运营栏） -->
        <div class="community-layout">
          <!-- 中间主内容区 -->
          <main class="main-content">
            <!-- 公告条（社区重设计 09-19）：最近的系统重要通知，细条不占版面，点击进通知中心 -->
            <div v-if="noticeItem" class="notice-bar" @click="router.push('/notifications')">
              <span class="notice-bar__tag">公告</span>
              <span class="notice-bar__text">{{ noticeItem.title }}</span>
              <el-icon class="notice-bar__arrow"><ArrowRight /></el-icon>
            </div>

            <!-- 推文精选带（09-19）：官方推文大封面卡，feed 正文流不重复出现 -->
            <div v-if="spotlightItems.length" class="spotlight-band">
              <div class="spotlight-head">
                <span class="spotlight-title">精选推文</span>
                <span class="spotlight-sub">官方出品</span>
              </div>
              <div class="spotlight-track">
                <div v-for="s in spotlightItems" :key="s.id" class="spotlight-card" @click="goSpotlight(s.id)">
                  <DewImage class="spotlight-card__cover" :src="assetUrl(s.cover)" ratio="16/9" alt="推文封面" />
                  <div class="spotlight-card__body">
                    <div class="spotlight-card__title">{{ s.title }}</div>
                    <div class="spotlight-card__meta">
                      <span>{{ s.author_name }}</span>
                      <span>{{ (s.publish_time || '').slice(5, 10) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 筛选栏：类型分类(全部/文章/讨论) × 排序(热度/最新) × 话题 正交控件 -->
            <div class="filter-bar">
              <DewButtonBar :items="typeOptions" v-model="contentType" size="md" />
              <DewButtonBar :items="sortOptions" v-model="sortType" size="sm" />
              <DewButtonBar v-if="topicOptions.length" :items="topicOptions" v-model="topicFilter" size="sm" />
            </div>

            <!-- 信息流（讨论帖 + 文章帖混合） -->
            <div class="feed-list">
              <!-- 加载中：帖子卡骨架占位（首屏 feedItems 为空时） -->
              <template v-if="loading && feedItems.length === 0">
                <DewCard
                  v-for="n in 4"
                  :key="'feed-skeleton-' + n"
                  variant="flat"
                  size="lg"
                  style="margin-bottom: 16px;"
                >
                  <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <DewSkeleton variant="circle" :size="40" />
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                      <DewSkeleton variant="text" width="35%" />
                      <DewSkeleton variant="text" :lines="2" />
                    </div>
                  </div>
                </DewCard>
              </template>

              <!-- 空状态 -->
              <DewCard v-else-if="feedItems.length === 0" variant="flat" size="lg">
                <div style="text-align: center; padding: 48px 0; color: var(--dew-text-faint); font-size: 14px;">
                  还没有内容，发个帖或写篇文章吧
                </div>
              </DewCard>

              <!-- 真实信息流 -->
              <template v-else>
                <template v-for="item in feedItems" :key="item.type + '-' + item.id + (item.article_version ? '-v' + item.article_version : '')">
                  <!-- 文章帖：flat 阅读卡，整卡点击进文章详情 -->
                  <ArticleCard
                    v-if="item.type === 'article'"
                    :article="item"
                    @open="goArticle"
                    @user-click="goProfile"
                  />
                  <!-- 讨论帖：玻璃对话卡，内联互动 -->
                  <DiscussionCard
                    v-else
                    :discussion="item"
                    @delete="handleDeleteThread"
                    @user-click="goProfile"
                  />
                </template>
              </template>

              <!-- 加载更多 -->
              <div v-if="hasMore" class="load-more">
                <DewButton :disabled="loading" @click="loadMore">
                  {{ loading ? '加载中...' : '加载更多' }}
                </DewButton>
              </div>
            </div>
          </main>

          <!-- 右侧栏 - 发帖入口 + 写文章 + XLAB 引流（09-19 重构：发帖改弹层，加项目现场） -->
          <aside class="right-sidebar">
            <!-- 发帖入口：一行输入形态，点击弹层发帖（支持图片） -->
            <div class="post-entry" @click="openCreateDlg">
              <el-icon class="post-entry__icon"><EditPen /></el-icon>
              <span class="post-entry__hint">分享点什么…</span>
              <span class="post-entry__btn">发帖</span>
            </div>

            <!-- 写文章入口（长文创作） -->
            <DewCard size="lg" interactive class="write-entry" @click="router.push('/article-editor-v2')">
              <div class="write-entry__inner">
                <div class="write-entry__icon">
                  <el-icon><EditPen /></el-icon>
                </div>
                <div class="write-entry__text">
                  <span class="write-entry__title">写文章</span>
                  <span class="write-entry__desc">发布长文，分享你的创作</span>
                </div>
                <el-icon class="write-entry__arrow"><ArrowRight /></el-icon>
              </div>
            </DewCard>

            <!-- XLAB 引流：正在做的项目（09-19，社区为项目广场导流） -->
            <DewCard v-if="xlabProjects.length" size="lg" class="xlab-card">
              <template #header>
                <div class="xlab-card__head" @click="router.push('/projects')">
                  <span class="xlab-card__title">项目现场</span>
                  <span class="xlab-card__more">进入 XLAB<el-icon><ArrowRight /></el-icon></span>
                </div>
              </template>
              <div class="xlab-card__list">
                <div v-for="prj in xlabProjects" :key="prj.id" class="xlab-item" @click="router.push(`/projects/${prj.id}`)">
                  <DewImage v-if="prj.cover_thumb || prj.cover" class="xlab-item__cover"
                            :src="assetUrl(prj.cover_thumb || prj.cover)" ratio="1/1" width="44px" alt="项目封面" />
                  <div v-else class="xlab-item__cover xlab-item__cover--ph">{{ (prj.title || '?')[0] }}</div>
                  <div class="xlab-item__body">
                    <div class="xlab-item__name">{{ prj.title }}</div>
                    <div class="xlab-item__meta">{{ prj.project_status_text }}<template v-if="prj.camp_name"> · {{ prj.camp_name }}</template></div>
                  </div>
                </div>
              </div>
            </DewCard>
          </aside>
        </div>
      </el-main>

      <!-- <el-footer class="footer-container">
        <PageFooterComponent />
      </el-footer> -->
    </el-container>

    <!-- 发帖弹层（09-19）：右栏入口/移动端入口点击打开，支持图片 ≤4 张 -->
    <DewDialog v-model="createDlg" title="发布新帖" width="560px">
      <div class="create-dlg__form">
        <DewInput v-model="newThread.title" placeholder="标题（至少 4 字）" />
        <DewInput v-model="newThread.content" type="textarea" :rows="5"
                  placeholder="分享你的想法（至少 10 字）…" />
        <div class="create-dlg__row">
          <span class="create-dlg__label">话题</span>
          <div class="create-dlg__chips">
            <button v-for="c in CATEGORIES" :key="c.value" type="button"
                    :class="['create-dlg__chip', { on: newThread.category === c.value }]"
                    @click="newThread.category = newThread.category === c.value ? '' : c.value">{{ c.label }}</button>
          </div>
        </div>
        <div v-if="newThread.category === 'recruit'" class="create-dlg__row">
          <span class="create-dlg__label">关联项目</span>
          <select v-model="newThread.project_id" class="create-dlg__select">
            <option :value="null">不关联</option>
            <option v-for="prj in xlabProjects" :key="prj.id" :value="prj.id">{{ prj.title }}</option>
          </select>
          <span class="create-dlg__hint-inline">招人帖关联 XLAB 项目，读者直达项目页</span>
        </div>
        <div class="create-dlg__images">
          <div v-for="(img, i) in pendingImages" :key="img.url" class="create-dlg__img-cell">
            <img :src="img.url" alt="待传图片" />
            <button type="button" class="create-dlg__img-del" @click="removePendingImage(i)">×</button>
          </div>
          <button v-if="pendingImages.length < 4" type="button" class="create-dlg__img-add"
                  :disabled="imgUploading" @click="postImgInput?.click()">
            {{ imgUploading ? '上传中…' : '+ 图片' }}
          </button>
        </div>
        <div class="create-dlg__hint">图片最多 4 张，jpg/png/webp ≤10MB</div>
      </div>
      <template #footer>
        <DewButton :disabled="createLoading" @click="createDlg = false">取消</DewButton>
        <DewButton :active="true" :disabled="createLoading || !canSubmitThread" @click="submitNewThread">
          {{ createLoading ? '发布中…' : '发布' }}
        </DewButton>
      </template>
    </DewDialog>
    <input ref="postImgInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onPostImgPick" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import MenuComponent from '../components/MenuComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import DiscussionCard from '../components/Community/DiscussionCard.vue'
import ArticleCard from '../components/Community/ArticleCard.vue'
import { DewButtonBar, DewCard, DewInput, DewButton, DewSkeleton, DewDialog, DewImage } from '@bme/dew-ui'
import api from '../api'
import { assetUrl } from '../services/campService'
import { showcaseService } from '../services/showcaseService'
import { ArrowRight } from '@element-plus/icons-vue'
import { Menu as Expand } from '@element-plus/icons-vue'
import { EditPen } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = useStore()
const router = useRouter()

// 主题状态
const isDarkMode = computed(() => store.getters.isDarkMode)

// 移动端状态
const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 类型分类 × 排序 双控件（正交：任一变化都重置到第 1 页重拉）
const contentType = ref('all')
const sortType = ref('hot')
const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '文章', value: 'article' },
  { label: '讨论', value: 'discussion' }
]
const sortOptions = [
  { label: '热度', value: 'hot' },
  { label: '最新', value: 'latest' }
]
const currentPage = ref(1)
const totalPages = ref(1)
// 话题筛选（Phase 2 09-20）：''=全部；服务端有带话题的帖子才显示这组 chip
const topicFilter = ref('')
const topicOptions = ref([])

// 加载社区信息流（讨论帖 + 文章帖混合，来自聚合接口 /community/feed）
// reset=true：切类型/排序或发帖后重置到第 1 页；reset=false：加载更多追加下一页
const fetchThreads = async (reset = false) => {
  loading.value = true
  try {
    if (reset) {
      currentPage.value = 1
      feedItems.value = []
    } else {
      currentPage.value += 1
    }
    const res = await api.get('/community/feed', {
      params: {
        page: currentPage.value,
        per_page: 20,
        sort: sortType.value,
        type: contentType.value,
        ...(topicFilter.value ? { category: topicFilter.value } : {})
      }
    })
    const raw = (res.data && res.data.data) || []
    totalPages.value = res.data?.pages || 1
    hasMore.value = currentPage.value < totalPages.value
    // 按类型映射为前端卡片所需结构
    const items = raw.map(item => {
      if (item.type === 'article') {
        return {
          type: 'article',
          id: item.id,
          article_id: item.article_id ?? item.id,
          article_version: item.article_version,
          title: item.title,
          summary: item.summary,
          introduction: item.summary,
          cover: item.cover || null,
          cover_thumb: item.cover_thumb || null,
          author_name: item.author_name,
          author: item.author_name,
          authorId: item.author_id,
          author_avatar: assetUrl(item.author_avatar),
          author_badge: item.author_badge,
          reply_count: item.reply_count || 0,
          like_count: item.like_count || 0,
          liked: item.liked || false,
          view_count: item.view_count || 0,
          created_at: item.created_at,
        }
      }
      return {
        id: item.id,
        type: 'discussion',
        title: item.title,
        content: item.summary,
        summary: item.summary,
        images: (item.images || []).map(u => assetUrl(u)),
        topic: item.category_text || '',
        projectId: item.project_id,
        projectTitle: item.project_title || '',
        category: '全局',
        author: item.author_name,
        authorId: item.author_id,
        author_name: item.author_name,
        author_avatar: assetUrl(item.author_avatar),
        author_badge: item.author_badge,
        publishTime: formatTimeAgo(item.created_at),
        reply_count: item.reply_count || 0,
        like_count: item.like_count || 0,
        views: item.view_count,
        isHot: item.is_pinned,
        liked: item.liked || false,
        // feed 已附带前 2 条回复预览，直接用，不再逐帖拉（消灭 N+1）
        replies: (item.replies || []).map(reply => ({
          id: reply.id,
          author: reply.author_name,
          authorId: reply.author_id,
          author_avatar: assetUrl(reply.author_avatar || ''),
          content: reply.content,
          time: formatTimeAgo(reply.created_at),
          like_count: reply.like_count || 0,
          liked: reply.liked || false
        }))
      }
    })

    feedItems.value = reset ? items : feedItems.value.concat(items)

    // 话题筛选 chips：从 feed 聚合出现过的 topic（reset 时重建，翻页追加）
    const seen = new Set(topicOptions.value.map(o => o.value))
    if (reset) { topicOptions.value = []; seen.clear() }
    items.forEach((i) => {
      if (i.type === 'discussion' && i.topic && !seen.has(i.topic)) {
        seen.add(i.topic)
        const def = CATEGORIES.find(c => c.label === i.topic)
        if (def) topicOptions.value.push({ label: i.topic, value: def.value })
      }
    })

    // 当前页讨论帖批量上报浏览（幂等去重），对实际计数的帖乐观 +1，让浏览数即时反馈
    const discussionIds = items.filter(i => i.type === 'discussion').map(i => i.id)
    if (discussionIds.length) {
      api.post('/discussions/threads/view_batch', { thread_ids: discussionIds })
        .then(res => {
          const viewed = new Set((res.data && res.data.viewed) || [])
          if (viewed.size) {
            items.forEach(i => {
              if (i.type === 'discussion' && viewed.has(i.id)) {
                i.views = (i.views || 0) + 1
              }
            })
          }
        })
        .catch(() => {})
    }
  } catch (error) {
    console.error('获取社区信息流失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化时间
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

// 专题数据
// ── 社区重设计（09-19）：公告条 / 推文精选带 / XLAB 引流 ──
const noticeItem = ref(null)          // 顶部公告条：最近一条 system 重要通知
const spotlightItems = ref([])        // 精选带：官方推文（feed 不重复出现）
const xlabProjects = ref([])          // 右栏项目现场：进行中的 XLAB 项目

async function fetchNoticeBar() {
  try {
    const res = await api.get('/notification/list', { params: { category: 'system', per_page: 5 } })
    const rows = res.data?.data?.notifications || []
    noticeItem.value = rows.find(n => n.is_important) || null
  } catch { /* 公告条静默隐藏 */ }
}
async function fetchSpotlight() {
  try {
    const res = await api.get('/community/spotlight', { params: { limit: 3 } })
    spotlightItems.value = res.data?.data || []
  } catch { /* 精选带静默隐藏 */ }
}
async function fetchXlabProjects() {
  try {
    const res = await showcaseService.fetchProjects({ project_status: 'ongoing' })
    const rows = res.projects || []
    // 有封面的优先，最多 4 个
    rows.sort((a, b) => Number(!!(b.cover_thumb || b.cover)) - Number(!!(a.cover_thumb || a.cover)))
    xlabProjects.value = rows.slice(0, 4)
  } catch { /* 引流卡静默隐藏 */ }
}
const goSpotlight = (id) => router.push({ path: '/article-v2', query: { id } })

// 发帖关联项目候选（全量可见项目；右栏 xlabProjects 仅前 4）
const allProjects = ref([])
async function fetchAllProjects() {
  try {
    const res = await showcaseService.fetchProjects({})
    allProjects.value = res.projects || []
  } catch { /* 静默：关联项目下拉为空可接受 */ }
}

// ── 混合信息流 ──
const feedItems = ref([])
const loading = ref(true)
const hasMore = ref(true)

// ── 发帖弹层（09-19，替代右栏整卡表单；图片先传图床拿 URL 再随帖提交） ──
const createDlg = ref(false)
const createLoading = ref(false)
const CATEGORIES = [
  { value: 'chat', label: '闲聊' }, { value: 'ask', label: '提问' },
  { value: 'share', label: '分享' }, { value: 'recruit', label: '招人' },
]
const newThread = ref({ title: '', content: '', scope_type: 'global', scope_id: null, category: '', project_id: null })
const pendingImages = ref([])         // [{ url }]（已传图床的相对 URL）
const imgUploading = ref(false)
const postImgInput = ref(null)

const canSubmitThread = computed(() =>
  newThread.value.title.trim().length >= 4 && newThread.value.content.trim().length >= 10)

function openCreateDlg() {
  newThread.value = { title: '', content: '', scope_type: 'global', scope_id: null, category: '', project_id: null }
  pendingImages.value = []
  createDlg.value = true
  // 项目下拉数据：右栏 xlabProjects 只取 4 个，选「招人」时需要更多候选——拉全量（社团级数据量）
  if (!allProjects.length) fetchAllProjects()
}
function removePendingImage(i) {
  pendingImages.value.splice(i, 1)
}
async function onPostImgPick(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || imgUploading.value) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.error('图片仅支持 jpg/png/webp'); return
  }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('图片不能超过 10MB'); return }
  imgUploading.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/discussions/upload_image', fd)
    pendingImages.value.push({ url: res.data.url })
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '图片上传失败')
  } finally {
    imgUploading.value = false
  }
}

// 提交新帖子（带图集）
const submitNewThread = async () => {
  if (!canSubmitThread.value || createLoading.value) return
  createLoading.value = true
  try {
    const { category, project_id, ...threadBody } = newThread.value
    const res = await api.post('/discussions/threads', {
      ...threadBody,
      category: category || null,
      project_id: category === 'recruit' ? (project_id || null) : null,
      images: pendingImages.value.map(x => x.url),
    })
    if (res.data && res.data.code === 201) {
      ElMessage.success('发布成功')
      createDlg.value = false
      fetchThreads(true) // 刷新列表（重置到第1页）
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发布失败')
  } finally {
    createLoading.value = false
  }
}


const loadMore = () => {
  if (!loading.value && hasMore.value) fetchThreads(false)
}

// 文章帖：点击进文章详情页（V2 Markdown 文章跳 V2 阅读页，旧文章跳旧阅读页）
const goArticle = (article) => {
  if (article.article_version === 2) {
    router.push({ path: '/article-v2', query: { id: article.article_id } })
  } else {
    router.push({ path: '/article', query: { Article_Id: article.article_id } })
  }
}

// 作者点击：进其个人主页
const goProfile = (id) => {
  if (id != null && id !== '') router.push('/profile/' + id)
}

// 删除帖子成功后，从信息流里移除（按 类型+id 精确匹配，避免与文章 id 冲突）
const handleDeleteThread = (discussion) => {
  feedItems.value = feedItems.value.filter(
    item => !(item.type === 'discussion' && item.id === discussion.id)
  )
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  fetchThreads(true)
  fetchNoticeBar()
  fetchSpotlight()
  fetchXlabProjects()
})

// 监听类型/排序/话题变化：重置到第 1 页并重拉
watch([contentType, sortType, topicFilter], () => {
  fetchThreads(true)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
/* 背景和布局 —— 液态玻璃需要的彩色极光底（亮/暗各一套） */
.community-view-container {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

/* 背景和布局 —— 极光底降噪（09-19 社区重设计：内容流信息密度高，高彩度底放大混乱感，
   降到 aurora-bg-standard 克制档；卡片叙事交给内容本身） */
.theme-light.community-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.12), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.11), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.10), transparent 55%),
    linear-gradient(135deg, #f6f8fd 0%, #faf5f8 50%, #f4faf6 100%);
}

.theme-dark.community-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.common-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 头部样式 */
.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  transition: all 0.3s ease;
}

.theme-light .header-container {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.theme-dark .header-container {
  background: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.desktop-menu-container {
  width: 100%;
}

/* 移动端头部 */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  height: 60px;
}

.mobile-logo {
  cursor: pointer;
}

.hamburger-icon {
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.theme-light .hamburger-icon {
  color: #333;
}

.theme-dark .hamburger-icon {
  color: #fff;
}

/* 主内容区 */
.community-main-container {
  flex: 1;
  padding: 24px;
  padding-top: 80px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* 两栏布局 */
.community-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
  max-width: 1200px;
  margin: 0 auto;
}

/* 发布新帖卡片：DewCard 负责玻璃表面与内边距，这里只排版表单 */
.create-post-title {
  font-size: 16px;
  font-weight: 700;
}

.form-field {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--dew-text-muted);
}

.submit-btn {
  width: 100%;
  margin-top: 6px;
}

/* ── 公告条（09-19）：细横条，通知中心 system 重要通知的露出一行 ── */
.notice-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px; margin-bottom: 14px; cursor: pointer;
  border: 1px solid var(--dew-card-border, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-md, 10px);
  background: var(--dew-card-flat-bg, rgba(255, 255, 255, 0.72));
  transition: border-color 0.15s;
}
.theme-dark .notice-bar { background: var(--dew-card-flat-bg, rgba(20, 20, 24, 0.8)); }
.notice-bar:hover { border-color: var(--dew-accent, #00915d); }
.notice-bar__tag {
  flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  color: #fff; background: #00915d; padding: 2px 8px; border-radius: 4px;
}
.notice-bar__text {
  flex: 1; min-width: 0; font-size: 13px;
  color: var(--dew-text-primary, #222);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notice-bar__arrow { flex-shrink: 0; color: var(--dew-text-faint, #999); font-size: 13px; }

/* ── 推文精选带（09-19）：官方推文大封面卡，feed 之上的独立视觉层 ── */
.spotlight-band { margin-bottom: 16px; }
.spotlight-head {
  display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px;
}
.spotlight-title { font-size: 16px; font-weight: 800; color: var(--dew-text-primary, #222); }
.spotlight-sub {
  font-size: 11px; letter-spacing: 0.05em; color: #fff; background: #00915d;
  padding: 2px 8px; border-radius: 4px;
}
.spotlight-track {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;
}
.spotlight-card {
  cursor: pointer; overflow: hidden; border-radius: var(--radius-md, 10px);
  border: 1px solid var(--dew-card-border, rgba(0, 0, 0, 0.08));
  background: var(--dew-card-flat-bg, rgba(255, 255, 255, 0.85));
  transition: transform 0.18s var(--dew-bounce, ease), box-shadow 0.18s;
}
.theme-dark .spotlight-card { background: var(--dew-card-flat-bg, rgba(20, 20, 24, 0.9)); }
.spotlight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.spotlight-card__cover { display: block; width: 100%; }
.spotlight-card__body { padding: 10px 12px 12px; }
.spotlight-card__title {
  font-size: 14px; font-weight: 700; line-height: 1.45; color: var(--dew-text-primary, #222);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  min-height: 2.9em;
}
.spotlight-card__meta {
  display: flex; justify-content: space-between; gap: 8px; margin-top: 6px;
  font-size: 11.5px; color: var(--dew-text-faint, #999);
}

/* ── 右栏发帖入口（09-19）：一行输入形态 ── */
.post-entry {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; margin-bottom: 14px; cursor: pointer;
  border: 1px solid var(--dew-card-border, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-lg, 14px);
  background: var(--dew-card-flat-bg, rgba(255, 255, 255, 0.75));
  transition: border-color 0.15s, box-shadow 0.15s;
}
.theme-dark .post-entry { background: var(--dew-card-flat-bg, rgba(20, 20, 24, 0.82)); }
.post-entry:hover { border-color: var(--dew-accent, #00915d); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.post-entry__icon { color: var(--dew-text-faint, #999); font-size: 16px; }
.post-entry__hint {
  flex: 1; font-size: 13px; color: var(--dew-text-faint, #999);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.post-entry__btn {
  flex-shrink: 0; font-size: 12px; font-weight: 700; color: #fff;
  background: var(--dew-accent, #00915d); padding: 5px 14px; border-radius: 999px;
}

/* ── XLAB 引流卡（09-19）：项目现场 ── */
.xlab-card__head {
  display: flex; align-items: center; justify-content: space-between; cursor: pointer;
}
.xlab-card__title { font-size: 15px; font-weight: 700; color: var(--dew-text-primary, #222); }
.xlab-card__more {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 12px; color: var(--dew-text-faint, #999); transition: color 0.15s;
}
.xlab-card__head:hover .xlab-card__more { color: var(--dew-accent, #00915d); }
.xlab-card__list { display: flex; flex-direction: column; gap: 4px; }
.xlab-item {
  display: flex; align-items: center; gap: 10px; padding: 6px; margin: 0 -6px;
  border-radius: var(--radius-sm, 8px); cursor: pointer; transition: background 0.15s;
}
.xlab-item:hover { background: rgba(0, 0, 0, 0.05); }
.theme-dark .xlab-item:hover { background: rgba(255, 255, 255, 0.07); }
.xlab-item__cover { flex-shrink: 0; border-radius: var(--radius-sm, 8px); overflow: hidden; }
.xlab-item__cover--ph {
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.08); color: var(--dew-text-faint, #999); font-weight: 700;
}
.theme-dark .xlab-item__cover--ph { background: rgba(255, 255, 255, 0.08); }
.xlab-item__body { flex: 1; min-width: 0; }
.xlab-item__name {
  font-size: 13px; font-weight: 600; color: var(--dew-text-primary, #222);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.xlab-item__meta { font-size: 11px; color: var(--dew-text-faint, #999); margin-top: 2px; }

/* ── 发帖弹层内部 ── */
.create-dlg__form { display: flex; flex-direction: column; gap: 10px; }
.create-dlg__row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.create-dlg__label { font-size: 12px; font-weight: 600; color: var(--dew-text-muted); flex-shrink: 0; }
.create-dlg__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.create-dlg__chip {
  font-size: 12px; padding: 4px 12px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--dew-card-border, rgba(0, 0, 0, 0.12));
  background: transparent; color: var(--dew-text-muted, #666);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.create-dlg__chip.on { background: #00915d; border-color: #00915d; color: #fff; font-weight: 600; }
.create-dlg__select {
  padding: 5px 10px; border-radius: 8px; font-size: 12.5px; max-width: 220px;
  border: 1px solid var(--dew-card-border, rgba(0, 0, 0, 0.12));
  background: var(--dew-card-flat-bg, #fff); color: var(--dew-text-primary, #222);
}
.create-dlg__hint-inline { font-size: 11px; color: var(--dew-text-faint, #999); }
.create-dlg__images { display: flex; flex-wrap: wrap; gap: 8px; }
.create-dlg__img-cell {
  position: relative; width: 72px; height: 72px; border-radius: var(--radius-sm, 8px);
  overflow: hidden; border: 1px solid rgba(0, 0, 0, 0.08);
}
.create-dlg__img-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.create-dlg__img-del {
  position: absolute; top: 0; right: 0; width: 20px; height: 20px; border: none;
  cursor: pointer; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 12px; line-height: 1;
}
.create-dlg__img-add {
  width: 72px; height: 72px; border: 1px dashed rgba(0, 0, 0, 0.2); border-radius: var(--radius-sm, 8px);
  background: transparent; color: var(--dew-text-faint, #999); font-size: 12px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.create-dlg__img-add:hover:not(:disabled) { border-color: var(--dew-accent, #00915d); color: var(--dew-accent, #00915d); }
.create-dlg__img-add:disabled { opacity: 0.5; cursor: not-allowed; }
.create-dlg__hint { font-size: 11.5px; color: var(--dew-text-faint, #999); }

/* 筛选栏：DewButtonBar 自带玻璃胶囊，外层只做排版 */
.filter-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

/* 写文章入口（右侧栏大入口卡，hover 形态反馈） */
.write-entry {
  margin-bottom: 16px;
}

.write-entry__inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.write-entry__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 20px;
}

.write-entry__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.write-entry__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.write-entry__desc {
  font-size: 12px;
  color: var(--dew-text-faint);
}

.write-entry__arrow {
  font-size: 16px;
  color: var(--dew-text-faint);
  transition: transform 0.3s var(--dew-bounce, ease);
}

.write-entry:hover .write-entry__arrow {
  transform: translateX(3px);
}

/* 加载状态 */
.theme-dark .load-more {
  color: #a1a1aa;
}

/* 帖子详情对话框 */
.thread-detail-dialog.theme-dark .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: #1a1a1a !important;
}

.thread-detail-dialog.theme-dark .el-dialog__title {
  color: #f5f5f5 !important;
}

.thread-detail-dialog.theme-dark .el-dialog__body {
  background: #1a1a1a !important;
  color: #d1d5db !important;
}

.thread-detail-dialog.theme-dark .thread-detail {
  color: #d1d5db;
}

.thread-detail-dialog.theme-dark .thread-content {
  color: #d1d5db;
  background: transparent !important;
}

.thread-detail-dialog.theme-dark .thread-author .author-name {
  color: #f5f5f5;
}

.thread-detail-dialog.theme-dark .thread-time {
  color: #6b7280;
}

.thread-detail-dialog.theme-dark .thread-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.thread-detail-dialog.theme-dark .el-button {
  color: #9ca3af;
}

.thread-detail-dialog.theme-dark .el-button:hover {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.thread-detail-dialog.theme-dark .el-button--primary {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
}

/* 回复区域 */
.thread-detail-dialog.theme-dark .reply-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.thread-detail-dialog.theme-dark .reply-author .author-name {
  color: #f5f5f5;
}

.thread-detail-dialog.theme-dark .reply-time {
  color: #6b7280;
}

.thread-detail-dialog.theme-dark .reply-text {
  color: #d1d5db;
}

.thread-detail-dialog.theme-dark .children-replies {
  border-left-color: rgba(255, 255, 255, 0.2);
}

.thread-detail-dialog.theme-dark .el-icon {
  color: inherit !important;
}

/* 创建帖子对话框 */
.create-thread-dialog.theme-dark .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: #1a1a1a !important;
}

.create-thread-dialog.theme-dark .el-dialog__title {
  color: #f5f5f5 !important;
}

.create-thread-dialog.theme-dark .el-dialog__body {
  background: #1a1a1a !important;
  color: #d1d5db !important;
}

.create-thread-dialog.theme-dark .el-input__wrapper {
  background: #262626 !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.create-thread-dialog.theme-dark .el-input__inner {
  color: #d1d5db !important;
  background: transparent !important;
}

.create-thread-dialog.theme-dark .el-input__inner::placeholder {
  color: #6b7280 !important;
}

.create-thread-dialog.theme-dark .el-textarea__inner {
  background: #262626 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #d1d5db !important;
}

.create-thread-dialog.theme-dark .el-textarea__inner::placeholder {
  color: #6b7280 !important;
}

.create-thread-dialog.theme-dark .el-form-item__label {
  color: #d1d5db !important;
  background: transparent !important;
}

.create-thread-dialog.theme-dark .el-dialog__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a1a !important;
}

.create-thread-dialog.theme-dark .el-button--primary {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
}

.create-thread-dialog.theme-dark .el-button--default {
  background: #262626 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #d1d5db !important;
}

/* 加载状态 */
.load-more {
  text-align: center;
  padding: 24px;
}

.theme-dark .load-more .el-button {
  background: #262626;
  border-color: rgba(255, 255, 255, 0.2);
  color: #d1d5db;
}

.theme-dark .load-more .el-button:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

/* 帖子详情对话框样式 */
.thread-detail {
  padding: 0;
}

.thread-author {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.thread-author .author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thread-author .author-name {
  font-weight: 600;
  font-size: 15px;
}

.theme-light .thread-author .author-name {
  color: #1a1a1a;
}

.theme-dark .thread-author .author-name {
  color: #f5f5f5;
}

.thread-time {
  font-size: 12px;
}

.theme-light .thread-time {
  color: #9ca3af;
}

.theme-dark .thread-time {
  color: #6b7280;
}

.thread-content {
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.theme-light .thread-content {
  color: #374151;
}

.theme-dark .thread-content {
  color: #d1d5db;
}

.thread-actions {
  display: flex;
  gap: 16px;
  padding: 16px 0;
}

.theme-light .thread-actions {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .thread-actions {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* 回复区域 */
.replies-section {
  margin-top: 24px;
}

.replies-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
}

.theme-light .replies-section h4 {
  color: #374151;
}

.theme-dark .replies-section h4 {
  color: #e5e7eb;
}

.reply-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.theme-light .reply-item {
  background: #f9fafb;
}

.theme-dark .reply-item {
  background: #1a1a1a;
}

.reply-item.child-reply {
  margin-bottom: 8px;
  padding: 10px;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.reply-author {
  font-weight: 500;
  font-size: 13px;
}

.theme-light .reply-author {
  color: #374151;
}

.theme-dark .reply-author {
  color: #e5e7eb;
}

.reply-time {
  font-size: 11px;
}

.theme-light .reply-time {
  color: #9ca3af;
}

.theme-dark .reply-time {
  color: #6b7280;
}

.reply-text {
  font-size: 13px;
  line-height: 1.6;
}

.theme-light .reply-text {
  color: #4b5563;
}

.theme-dark .reply-text {
  color: #d1d5db;
}

.reply-actions {
  margin-top: 8px;
}

.children-replies {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(102, 126, 234, 0.2);
}

.theme-dark .children-replies {
  border-left-color: rgba(102, 126, 234, 0.3);
}

/* 添加回复 */
.add-reply {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

/* 创建帖子表单 */
.create-thread-form {
  padding: 10px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .community-main-container {
    padding: 16px;
    padding-top: 72px;
  }

  .filter-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    padding: 14px 16px;
  }
}

.theme-light .banner-item {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.theme-dark .banner-item {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.banner-item:hover {
  transform: translateY(-1px);
}

.theme-light .banner-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.theme-dark .banner-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.banner-content-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 24px 32px;
  position: relative;
}

/* 左侧内容区 */
.banner-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.banner-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.banner-icon {
  font-size: 20px;
  line-height: 1;
}

.banner-category {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-light .banner-category {
  background: rgba(0, 0, 0, 0.06);
  color: #4a5568;
}

.theme-dark .banner-category {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e0;
}

.banner-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.theme-light .banner-title {
  color: #1a202c;
}

.theme-dark .banner-title {
  color: #ffffff;
}

.banner-description {
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
  opacity: 0.85;
}

.theme-light .banner-description {
  color: #4a5568;
}

.theme-dark .banner-description {
  color: #a0aec0;
}

.banner-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.meta-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
}

.theme-light .meta-tag {
  background: rgba(0, 0, 0, 0.04);
  color: #718096;
}

.theme-dark .meta-tag {
  background: rgba(255, 255, 255, 0.08);
  color: #a0aec0;
}

/* 右侧操作区 */
.banner-right {
  flex-shrink: 0;
  margin-left: 24px;
}

.banner-action-btn {
  font-size: 13px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.2s;
}

.theme-light .banner-action-btn {
  background: rgba(0, 0, 0, 0.06);
  border-color: transparent;
  color: #2d3748;
}

.theme-dark .banner-action-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: transparent;
  color: #e2e8f0;
}

.theme-light .banner-action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.theme-dark .banner-action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(2px);
}

/* 信息流 */
.feed-list {
  display: flex;
  flex-direction: column;
}

.load-more {
  text-align: center;
  padding: 24px;
}

/* 右侧栏 */
.right-sidebar {
  position: sticky;
}

/* 话题项 */
.topic-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.theme-light .topic-item:hover {
  background: #f7fafc;
}

.theme-dark .topic-item:hover {
  background: #3a3a3a;
}

.topic-rank {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 500;
  font-size: 11px;
}

.theme-light .topic-rank {
  background: #edf2f7;
  color: #718096;
}

.theme-dark .topic-rank {
  background: #3a3a3a;
  color: #a0aec0;
}

.topic-content {
  flex: 1;
  min-width: 0;
}

.topic-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.theme-light .topic-name {
  color: #2d3748;
}

.theme-dark .topic-name {
  color: #e2e8f0;
}

.topic-count {
  font-size: 12px;
}

.theme-light .topic-count {
  color: #718096;
}

.theme-dark .topic-count {
  color: #a0aec0;
}

/* 用户项 */
.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background 0.15s;
}

.theme-light .user-item:hover {
  background: #f7fafc;
}

.theme-dark .user-item:hover {
  background: #3a3a3a;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-info .user-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.theme-light .user-info .user-name {
  color: #2d3748;
}

.theme-dark .user-info .user-name {
  color: #e2e8f0;
}

.user-bio {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-light .user-bio {
  color: #718096;
}

.theme-dark .user-bio {
  color: #a0aec0;
}

/* 活跃用户项 */
.active-user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
}

.rank-badge {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-weight: 500;
  font-size: 10px;
  flex-shrink: 0;
}

.theme-light .rank-badge.rank-1 {
  background: #2d3748;
  color: white;
}

.theme-dark .rank-badge.rank-1 {
  background: #e2e8f0;
  color: #1a202c;
}

.theme-light .rank-badge.rank-2 {
  background: #4a5568;
  color: white;
}

.theme-dark .rank-badge.rank-2 {
  background: #cbd5e0;
  color: #2d3748;
}

.theme-light .rank-badge.rank-3 {
  background: #718096;
  color: white;
}

.theme-dark .rank-badge.rank-3 {
  background: #a0aec0;
  color: #2d3748;
}

.active-user-item .user-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-light .active-user-item .user-name {
  color: #4a5568;
}

.theme-dark .active-user-item .user-name {
  color: #a0aec0;
}

.user-score {
  font-size: 12px;
  font-weight: 400;
  flex-shrink: 0;
}

.theme-light .user-score {
  color: #718096;
}

.theme-dark .user-score {
  color: #a0aec0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .community-layout {
    grid-template-columns: 1fr 280px;
    gap: 16px;
  }
}

@media (max-width: 900px) {
  .community-main-container {
    padding: 16px;
    padding-top: 80px;
  }

  .community-layout {
    grid-template-columns: 1fr;
  }

  /* 右栏不再隐藏（09-19：移动端发帖可达）——上提为 feed 顶部的横向工具条：
     发帖入口全宽，写文章与 XLAB 卡并排 */
  .right-sidebar {
    order: -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .right-sidebar .post-entry { grid-column: 1 / -1; margin-bottom: 0; }
  .right-sidebar .write-entry { margin-bottom: 0; }

  .spotlight-track { grid-template-columns: 1fr; }

  .filter-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .community-main-container {
    padding: 12px;
    padding-top: 72px;
  }

  .banner-content-wrapper {
    padding: 16px;
  }

  .banner-title {
    font-size: 16px;
  }

  .banner-description {
    font-size: 12px;
  }

  .activity-banner :deep(.el-carousel__indicators) {
    padding-left: 16px;
  }
}

/* 帖子详情对话框样式 */
.thread-detail {
  padding: 0;
}

.thread-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.thread-author .author-info {
  display: flex;
  flex-direction: column;
}

.thread-author .author-name {
  font-weight: 600;
  font-size: 14px;
}

.theme-light .thread-author .author-name {
  color: #24292f;
}

.theme-dark .thread-author .author-name {
  color: #c9d1d9;
}

.thread-time {
  font-size: 12px;
}

.theme-light .thread-time {
  color: #57606a;
}

.theme-dark .thread-time {
  color: #8b949e;
}

.thread-content {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.theme-light .thread-content {
  color: #24292f;
}

.theme-dark .thread-content {
  color: #c9d1d9;
}

.thread-actions {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid #d0d7de;
}

.theme-dark .thread-actions {
  border-bottom-color: #30363d;
}

/* 回复区域 */
.replies-section {
  margin-top: 20px;
}

.replies-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
}

.theme-light .replies-section h4 {
  color: #24292f;
}

.theme-dark .replies-section h4 {
  color: #c9d1d9;
}

.reply-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
}

.theme-light .reply-item {
  background: #f6f8fa;
}

.theme-dark .reply-item {
  background: #161b22;
}

.reply-item.child-reply {
  margin-bottom: 8px;
  padding: 8px;
}

.reply-content {
  flex: 1;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.reply-author {
  font-weight: 500;
  font-size: 13px;
}

.theme-light .reply-author {
  color: #24292f;
}

.theme-dark .reply-author {
  color: #c9d1d9;
}

.reply-time {
  font-size: 12px;
}

.theme-light .reply-time {
  color: #57606a;
}

.theme-dark .reply-time {
  color: #8b949e;
}

.reply-text {
  font-size: 13px;
  line-height: 1.5;
}

.theme-light .reply-text {
  color: #24292f;
}

.theme-dark .reply-text {
  color: #c9d1d9;
}

.reply-actions {
  margin-top: 8px;
}

.children-replies {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 2px solid #d0d7de;
}

.theme-dark .children-replies {
  border-left-color: #30363d;
}

/* 添加回复 */
.add-reply {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

/* 创建帖子表单 */
.create-thread-form {
  padding: 10px 0;
}
</style>
