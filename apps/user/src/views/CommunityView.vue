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
        <!-- 三栏布局容器 -->
        <div class="community-layout">
          <!-- 左侧导航栏 (暂时禁用) -->
          <aside class="left-sidebar" v-if="false">
            <div class="nav-menu">
              <div
                v-for="item in navItems"
                :key="item.value"
                :class="['nav-item', { 'active': activeFilter === item.value }]"
                @click="handleFilterChange(item.value)"
              >
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </aside>

          <!-- 中间主内容区 -->
          <main class="main-content">
            <!-- 顶部活动Banner (暂时禁用) -->
            <div class="activity-banner" v-if="false">
              <el-carousel
                :interval="5000"
                height="120px"
                indicator-position="outside"
                arrow="hover"
              >
                <el-carousel-item v-for="topic in topics" :key="topic.id">
                  <div class="banner-item" @click="handleTopicClick(topic)" :style="{ background: topic.coverGradient }">
                    <div class="banner-content-wrapper">
                      <!-- 左侧内容区 -->
                      <div class="banner-left">
                        <div class="banner-header">
                          <span class="banner-icon">{{ topic.icon }}</span>
                          <span class="banner-category">活动专题</span>
                        </div>
                        <h3 class="banner-title">{{ topic.title }}</h3>
                        <p class="banner-description">{{ topic.description }}</p>
                        <div class="banner-meta">
                          <span class="meta-tag">{{ topic.articleCount }} 篇内容</span>
                          <span class="meta-tag">{{ topic.viewCount }} 浏览</span>
                        </div>
                      </div>
                      <!-- 右侧操作区 -->
                      <div class="banner-right">
                        <el-button class="banner-action-btn" size="small" round>
                          查看详情
                          <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-carousel-item>
              </el-carousel>
            </div>

            <!-- 筛选栏：类型分类(全部/文章/讨论) × 排序(热度/最新) 正交双控件 -->
            <div class="filter-bar">
              <DewButtonBar :items="typeOptions" v-model="contentType" size="md" />
              <DewButtonBar :items="sortOptions" v-model="sortType" size="sm" />
            </div>

            <!-- 信息流（讨论帖 + 文章帖混合） -->
            <div class="feed-list">
              <template v-for="item in feedItems" :key="item.type + '-' + item.id">
                <!-- 文章帖：flat 阅读卡，整卡点击进文章详情 -->
                <ArticleCard
                  v-if="item.type === 'article'"
                  :article="item"
                  @open="goArticle"
                />
                <!-- 讨论帖：玻璃对话卡，内联互动 -->
                <DiscussionCard
                  v-else
                  :discussion="item"
                  @delete="handleDeleteThread"
                  @user-click="goProfile"
                />
              </template>

              <!-- 加载更多 -->
              <div v-if="hasMore" class="load-more">
                <DewButton :disabled="loading" @click="loadMore">
                  {{ loading ? '加载中...' : '加载更多' }}
                </DewButton>
              </div>
            </div>
          </main>

          <!-- 右侧栏 - 发布帖子 -->
          <aside class="right-sidebar">
            <!-- 发布帖子卡片 -->
            <DewCard size="lg" divided class="create-post-card">
              <template #header>
                <span class="create-post-title">发布新帖</span>
              </template>
              <div class="form-field">
                <label class="form-label">标题</label>
                <DewInput
                  v-model="newThread.title"
                  placeholder="请输入帖子标题"
                />
              </div>
              <div class="form-field">
                <label class="form-label">内容</label>
                <DewInput
                  v-model="newThread.content"
                  type="textarea"
                  :rows="4"
                  placeholder="分享你的想法..."
                />
              </div>
              <DewButton
                :active="true"
                block
                :disabled="createLoading"
                @click="submitNewThread"
                class="submit-btn"
              >
                发布帖子
              </DewButton>
            </DewCard>
          </aside>
        </div>
      </el-main>

      <!-- <el-footer class="footer-container">
        <PageFooterComponent />
      </el-footer> -->
    </el-container>

    <!-- 帖子详情对话框 (已禁用，改用内联展示) -->
    <div v-if="false">
    <el-dialog
      v-model="threadDetailVisible"
      :title="currentThread?.title"
      width="700px"
      :class="['thread-detail-dialog', { 'theme-dark': isDarkMode }]"
    >
      <div v-if="currentThread" class="thread-detail">
        <div class="thread-author">
          <el-avatar :size="40" :src="currentThread.author_avatar || ''" />
          <div class="author-info">
            <div class="author-name">{{ currentThread.author_name }}</div>
            <div class="thread-time">{{ formatTimeAgo(currentThread.created_at) }}</div>
          </div>
        </div>
        <div class="thread-content">{{ currentThread.content }}</div>
        <div class="thread-actions">
          <el-button :type="currentThread.liked ? 'primary' : 'default'" text @click="handleThreadLike(currentThread)">
            <el-icon><StarFilled v-if="currentThread.liked" /><Star v-else /></el-icon>
            <span>{{ currentThread.liked ? '已赞' : '点赞' }}</span>
            <span v-if="currentThread.like_count">({{ currentThread.like_count }})</span>
          </el-button>
          <el-button text>
            <el-icon><ChatDotRound /></el-icon>
            {{ currentThread.reply_count }} 回复
          </el-button>
          <el-button text>
            <el-icon><View /></el-icon>
            {{ currentThread.view_count }} 浏览
          </el-button>
        </div>

        <!-- 回复列表 -->
        <div class="replies-section">
          <h4>全部回复 ({{ threadReplies.length }})</h4>
          <div v-for="reply in threadReplies" :key="reply.id" class="reply-item">
            <el-avatar :size="32" :src="reply.author_avatar || ''" />
            <div class="reply-content">
              <div class="reply-header">
                <span class="reply-author">{{ reply.author_name }}</span>
                <span class="reply-time">{{ formatTimeAgo(reply.created_at) }}</span>
              </div>
              <div class="reply-text">{{ reply.content }}</div>
              <div class="reply-actions">
                <el-button text size="small" @click="handleReplyLike(reply)">
                  {{ reply.liked ? '已赞' : '赞' }} ({{ reply.like_count }})
                </el-button>
              </div>
              <!-- 子回复 -->
              <div v-if="reply.children && reply.children.length > 0" class="children-replies">
                <div v-for="child in reply.children" :key="child.id" class="reply-item child-reply">
                  <el-avatar :size="28" :src="child.author_avatar || ''" />
                  <div class="reply-content">
                    <div class="reply-header">
                      <span class="reply-author">{{ child.author_name }}</span>
                      <span class="reply-time">{{ formatTimeAgo(child.created_at) }}</span>
                    </div>
                    <div class="reply-text">{{ child.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 添加回复 -->
          <div class="add-reply">
            <el-input
              v-model="newReplyContent"
              type="textarea"
              :rows="3"
              placeholder="写下你的回复..."
            />
            <el-button type="primary" @click="submitReply" :loading="replyLoading">提交回复</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
    </div>

    <!-- 创建帖子对话框 (已禁用，改用侧边栏) -->
    <div v-if="false">
    <el-dialog
      v-model="createThreadVisible"
      title="发布新帖"
      width="600px"
      :class="['create-thread-dialog', { 'theme-dark': isDarkMode }]"
    >
      <div class="create-thread-form">
        <el-form :model="newThread" label-width="80px">
          <el-form-item label="标题">
            <el-input v-model="newThread.title" placeholder="请输入帖子标题" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="内容">
            <el-input
              v-model="newThread.content"
              type="textarea"
              :rows="6"
              placeholder="请输入帖子内容..."
              maxlength="5000"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="createThreadVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNewThread" :loading="createLoading">发布</el-button>
      </template>
    </el-dialog>
    </div>
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
import { DewButtonBar, DewCard, DewInput, DewButton } from '../components/ui'
import api from '../api'
import {
  Grid, Collection, ChatDotRound, User, TrendCharts, ArrowRight
} from '@element-plus/icons-vue'
import { Menu as Expand } from '@element-plus/icons-vue'
import { View, Star, StarFilled } from '@element-plus/icons-vue'
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

// 左侧导航项
const navItems = ref([
  { label: '全部', value: 'all', icon: Grid },
  { label: '关注', value: 'following', icon: User },
  { label: '专题', value: 'topics', icon: Collection },
  { label: '热门', value: 'trending', icon: TrendCharts }
])

const activeFilter = ref('all')

const handleFilterChange = (value) => {
  activeFilter.value = value
  ElMessage.info(`切换到: ${navItems.value.find(item => item.value === value)?.label}`)
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

// 把单条讨论帖补全：作者头像 + 内联回复（文章帖评论在详情页看，不内联）
const enrichDiscussion = async (item) => {
  if (item.type !== 'discussion') return item
  if (item.authorId) item.author_avatar = await fetchAvatar(item.authorId)
  try {
    const repliesRes = await api.get(`/discussions/threads/${item.id}/replies`)
    if (repliesRes.data && repliesRes.data.data) {
      const replies = repliesRes.data.data.map(reply => ({
        id: reply.id,
        author: reply.author_name,
        authorId: reply.author_id,
        author_avatar: '', // 先留空，后续异步加载
        content: reply.content,
        time: formatTimeAgo(reply.created_at),
        like_count: reply.like_count || 0,
        liked: reply.liked || false,
        children: reply.children || []
      }))
      for (const reply of replies) {
        reply.author_avatar = await fetchAvatar(reply.authorId)
        if (reply.children && reply.children.length > 0) {
          for (const child of reply.children) {
            child.author_avatar = await fetchAvatar(child.author_id)
          }
        }
      }
      item.replies = replies
    }
  } catch (err) {
    console.error(`获取帖子${item.id}的回复失败:`, err)
  }
  return item
}

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
        type: contentType.value
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
          title: item.title,
          summary: item.summary,
          introduction: item.summary,
          author_name: item.author_name,
          author: item.author_name,
          author_avatar: item.author_avatar,
          reply_count: item.reply_count || 0,
          created_at: item.created_at,
        }
      }
      return {
        id: item.id,
        type: 'discussion',
        title: item.title,
        content: item.summary,
        summary: item.summary,
        category: '全局',
        author: item.author_name,
        authorId: item.author_id,
        author_name: item.author_name,
        author_avatar: item.author_avatar,
        publishTime: formatTimeAgo(item.created_at),
        reply_count: item.reply_count || 0,
        like_count: item.like_count || 0,
        views: item.view_count,
        isHot: item.is_pinned,
        liked: item.liked || false,
        replies: []
      }
    })

    // 仅对新拉到的讨论帖补全（避免追加模式下重复补全 → O(n²)）
    for (const item of items) {
      await enrichDiscussion(item)
    }

    feedItems.value = reset ? items : feedItems.value.concat(items)
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
const topics = ref([
  {
    id: 1,
    title: 'Python编程入门',
    description: '从零开始学习Python编程基础',
    icon: '🐍',
    coverGradient: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
    articleCount: 25,
    viewCount: '1.2k'
  },
  {
    id: 2,
    title: '前端开发技巧',
    description: '现代前端开发最佳实践',
    icon: '💻',
    coverGradient: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
    articleCount: 32,
    viewCount: '2.5k'
  },
  {
    id: 3,
    title: '数据结构与算法',
    description: '掌握核心算法和数据结构',
    icon: '🧮',
    coverGradient: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)',
    articleCount: 18,
    viewCount: '980'
  },
  {
    id: 4,
    title: '机器学习实战',
    description: '实战项目驱动的机器学习课程',
    icon: '🤖',
    coverGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    articleCount: 15,
    viewCount: '1.8k'
  }
])

// 混合信息流数据（现在只显示讨论贴）
const feedItems = ref([])

// 加载状态
const loading = ref(false)
const hasMore = ref(true)

// 头像缓存
const avatarCache = ref({})
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

// 按需获取用户头像
const fetchAvatar = async (userId) => {
  if (!userId) return defaultAvatar
  if (avatarCache.value[userId]) return avatarCache.value[userId]

  try {
    const res = await api({
      url: '/user/user_avatars_id',
      method: 'get',
      params: { User_Id: userId }
    })
    if (res.data.code === 200 && res.data.User_Avatar) {
      const avatar = 'data:image/jpeg;base64,' + res.data.User_Avatar
      avatarCache.value[userId] = avatar
      return avatar
    }
  } catch (err) {
    console.error('获取头像失败:', err)
  }
  return defaultAvatar
}

// 帖子详情相关状态
const threadDetailVisible = ref(false)
const currentThread = ref(null)
const threadReplies = ref([])
const newReplyContent = ref('')
const replyLoading = ref(false)

// 创建帖子相关状态
const createThreadVisible = ref(false)
const newThread = ref({
  title: '',
  content: '',
  scope_type: 'global',
  scope_id: null
})
const createLoading = ref(false)

// 事件处理
const handleTopicClick = (topic) => {
  ElMessage.info(`进入专题: ${topic.title}`)
}

// 点赞帖子
const handleThreadLike = async (thread) => {
  try {
    const res = await api.post('/discussions/reactions', {
      target_type: 'thread',
      target_id: thread.id,
      reaction_type: 'like'
    })
    if (res.data && res.data.data) {
      thread.liked = res.data.data.liked
      thread.likes = (thread.likes || 0) + (thread.liked ? 1 : -1)
    }
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

// 点赞回复
const handleReplyLike = async (reply) => {
  try {
    const res = await api.post('/discussions/reactions', {
      target_type: 'reply',
      target_id: reply.id,
      reaction_type: 'like'
    })
    if (res.data && res.data.data) {
      reply.liked = res.data.data.liked
      reply.like_count = (reply.like_count || 0) + (reply.liked ? 1 : -1)
    }
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

// 提交新帖子
const submitNewThread = async () => {
  if (!newThread.value.title || !newThread.value.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  createLoading.value = true
  try {
    const res = await api.post('/discussions/threads', newThread.value)
    if (res.data && res.data.code === 201) {
      ElMessage.success('发布成功')
      createThreadVisible.value = false
      fetchThreads(true) // 刷新列表（重置到第1页）
    }
  } catch (error) {
    console.error('发布帖子失败:', error)
    ElMessage.error('发布失败')
  } finally {
    createLoading.value = false
  }
}

// 提交回复
const submitReply = async () => {
  if (!newReplyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!currentThread.value) return
  replyLoading.value = true
  try {
    const res = await api.post(`/discussions/threads/${currentThread.value.id}/replies`, {
      content: newReplyContent.value
    })
    if (res.data && res.data.code === 201) {
      ElMessage.success('回复成功')
      newReplyContent.value = ''
      // 刷新回复列表
      const repliesRes = await api.get(`/discussions/threads/${currentThread.value.id}/replies`)
      if (repliesRes.data && repliesRes.data.data) {
        threadReplies.value = repliesRes.data.data
      }
      // 更新回复数
      currentThread.value.reply_count = (currentThread.value.reply_count || 0) + 1
    }
  } catch (error) {
    console.error('回复失败:', error)
    ElMessage.error('回复失败')
  } finally {
    replyLoading.value = false
  }
}

const loadMore = () => {
  if (!loading.value && hasMore.value) fetchThreads(false)
}

// 文章帖：点击进文章详情页
const goArticle = (article) => {
  router.push({ path: '/article', query: { Article_Id: article.article_id } })
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
})

// 监听类型/排序变化：重置到第 1 页并重拉
watch([contentType, sortType], () => {
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

.theme-light.community-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
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

/* 筛选栏：DewButtonBar 自带玻璃胶囊，外层只做排版 */
.filter-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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

  .right-sidebar {
    display: none;
  }

  .activity-banner {
    margin-bottom: 16px;
  }

  .banner-content-wrapper {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .banner-right {
    margin-left: 0;
    width: 100%;
  }

  .banner-action-btn {
    width: 100%;
  }

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
