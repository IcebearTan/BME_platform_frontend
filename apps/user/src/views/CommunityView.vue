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

            <!-- 筛选栏 -->
            <div class="filter-bar">
              <el-segmented v-model="sortType" :options="sortOptions" size="default" />
              <el-button type="primary" :icon="Plus" @click="handleCreatePost">
                发布内容
              </el-button>
            </div>

            <!-- 信息流 -->
            <div class="feed-list">
              <template v-for="item in feedItems" :key="item.id">
                <!-- 推文卡片 -->
                <TweetCard 
                  v-if="item.type === 'tweet'"
                  :tweet="item"
                  @click="handleTweetClick"
                  @user-click="handleUserClick"
                  @comment="handleComment"
                  @share="handleShare"
                  @like="handleLike"
                  @bookmark="handleBookmark"
                  @image-click="handleImageClick"
                />
                
                <!-- 讨论贴卡片 -->
                <DiscussionCard 
                  v-else-if="item.type === 'discussion'"
                  :discussion="item"
                  @click="handleDiscussionClick"
                />
              </template>

              <!-- 加载更多 -->
              <div v-if="hasMore" class="load-more">
                <el-button :loading="loading" @click="loadMore">
                  {{ loading ? '加载中...' : '加载更多' }}
                </el-button>
              </div>
            </div>
          </main>

          <!-- 右侧栏 - 发布帖子 -->
          <aside class="right-sidebar">
            <!-- 发布帖子卡片 -->
            <div class="create-post-card">
              <h3 class="sidebar-title">发布新帖</h3>
              <el-form :model="newThread" label-position="top" size="default">
                <el-form-item label="标题">
                  <el-input v-model="newThread.title" placeholder="请输入帖子标题" maxlength="100" show-word-limit />
                </el-form-item>
                <el-form-item label="内容">
                  <el-input
                    v-model="newThread.content"
                    type="textarea"
                    :rows="4"
                    placeholder="分享你的想法..."
                    maxlength="2000"
                    show-word-limit
                  />
                </el-form-item>
                <el-button type="primary" :loading="createLoading" @click="submitNewThread" class="submit-btn">
                  发布帖子
                </el-button>
              </el-form>
            </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import MenuComponent from '../components/MenuComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import TweetCard from '../components/Community/TweetCard.vue'
import DiscussionCard from '../components/Community/DiscussionCard.vue'
import SidebarWidget from '../components/Community/SidebarWidget.vue'
import api from '../api'
import {
  Grid, Collection, Document, ChatDotRound, User, TrendCharts, Plus, ArrowRight
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

// 排序选项
const sortType = ref('latest')
const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '热门', value: 'pinned' }
]

// 加载讨论区数据
const fetchThreads = async () => {
  loading.value = true
  try {
    const res = await api.get('/discussions/threads', {
      params: {
        page: 1,
        per_page: 20,
        sort: sortType.value
      }
    })
    if (res.data && res.data.data) {
      // 将后端数据转换为前端格式
      const threads = res.data.data.map(thread => ({
        id: thread.id,
        type: 'discussion',
        title: thread.title,
        content: thread.content,
        summary: thread.content ? thread.content.substring(0, 100) + '...' : '',
        category: thread.scope_type === 'global' ? '全局' : thread.scope_type,
        author: thread.author_name,
        authorId: thread.author_id,
        author_avatar: thread.author_avatar || '',
        publishTime: formatTimeAgo(thread.created_at),
        reply_count: thread.reply_count || 0,
        like_count: thread.like_count || 0,
        views: thread.view_count,
        isHot: thread.is_pinned,
        liked: thread.liked || false,
        replies: []
      }))

      // 为每个帖子获取回复列表
      for (const thread of threads) {
        try {
          const repliesRes = await api.get(`/discussions/threads/${thread.id}/replies`)
          if (repliesRes.data && repliesRes.data.data) {
            thread.replies = repliesRes.data.data.map(reply => ({
              id: reply.id,
              author: reply.author_name,
              author_avatar: reply.author_avatar || '',
              content: reply.content,
              time: formatTimeAgo(reply.created_at),
              like_count: reply.like_count || 0,
              liked: reply.liked || false
            }))
          }
        } catch (err) {
          console.error(`获取帖子${thread.id}的回复失败:`, err)
        }
      }

      feedItems.value = threads
    }
  } catch (error) {
    console.error('获取讨论列表失败:', error)
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

// 混合信息流数据（推文 + 讨论贴）
const feedItems = ref([
  {
    id: 't1',
    type: 'tweet',
    author: '张老师',
    authorId: 'u1',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    badge: '认证',
    content: '刚完成了一个Vue3项目的重构，使用 Composition API 后代码组织清晰多了！分享几个实用技巧 #前端开发 #Vue3',
    images: [],
    publishTime: '2小时前',
    comments: 23,
    shares: 5,
    likes: 156,
    liked: false,
    bookmarked: false
  },
  {
    id: 't2',
    type: 'tweet',
    author: '小明同学',
    authorId: 'u2',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    content: '今天学习了Python的装饰器，终于理解了闭包的概念 💡 感觉打开了新世界的大门！@张老师 谢谢你的教程',
    images: [],
    publishTime: '3小时前',
    comments: 12,
    shares: 2,
    likes: 89,
    liked: true,
    bookmarked: false
  },
  {
    id: 'd1',
    type: 'discussion',
    title: '如何在Vue3中优雅地处理全局状态？',
    summary: '在开发大型Vue3项目时，我发现Pinia相比Vuex更加简洁易用，但在某些复杂场景下该如何选择？大家有什么建议吗...',
    category: '前端开发',
    author: '李工程师',
    authorId: 'u3',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    publishTime: '5小时前',
    replies: 45,
    views: 1230,
    isHot: true
  },
  {
    id: 't3',
    type: 'tweet',
    author: '王博士',
    authorId: 'u4',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    badge: '专家',
    content: '推荐一个数据可视化库 ECharts，功能强大且文档完善。这是我用它做的一个项目效果 👇',
    images: [],
    publishTime: '6小时前',
    comments: 34,
    shares: 18,
    likes: 267,
    liked: false,
    bookmarked: true
  },
  {
    id: 'd2',
    type: 'discussion',
    title: '推荐一些适合初学者的Python练习项目',
    summary: '刚学完Python基础语法，想找一些实战项目来练手，有没有好的推荐？最好是难度适中、能学到实用技能的项目...',
    category: 'Python',
    author: '新手上路',
    authorId: 'u5',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    publishTime: '8小时前',
    replies: 78,
    views: 892,
    isHot: true
  },
  {
    id: 't4',
    type: 'tweet',
    author: '陈开发',
    authorId: 'u6',
    authorAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    content: '终于把异步编程搞明白了！Promise、async/await 原来是这样工作的 🎉 #JavaScript #学习笔记',
    images: [],
    publishTime: '10小时前',
    comments: 19,
    shares: 7,
    likes: 134,
    liked: false,
    bookmarked: false
  }
])

// 热门话题
const hotTopics = ref([
  { name: '前端开发', count: '12.3k' },
  { name: 'Python编程', count: '8.9k' },
  { name: 'Vue3实战', count: '7.2k' },
  { name: '算法学习', count: '6.5k' },
  { name: '机器学习', count: '5.8k' }
])

// 推荐用户
const recommendUsers = ref([
  {
    id: 1,
    name: '李老师',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    bio: '资深前端工程师 · 10年经验'
  },
  {
    id: 2,
    name: '王专家',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    bio: 'AI算法研究员 · 清华大学'
  },
  {
    id: 3,
    name: '赵架构',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    bio: '系统架构师 · 大厂技术专家'
  }
])

// 活跃用户
const activeUsers = ref([
  { name: '编程小能手', avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png', score: 2850 },
  { name: '算法达人', avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png', score: 2630 },
  { name: '前端大佬', avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png', score: 2410 }
])

// 加载状态
const loading = ref(false)
const hasMore = ref(true)

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

const handleCreatePost = () => {
  createThreadVisible.value = true
  newThread.value = { title: '', content: '', scope_type: 'global', scope_id: null }
}

const handleTweetClick = (tweet) => {
  ElMessage.info(`查看推文详情: ${tweet.id}`)
}

const handleUserClick = (userId) => {
  ElMessage.info(`查看用户主页: ${userId}`)
}

const handleComment = (tweetId) => {
  ElMessage.info(`评论推文: ${tweetId}`)
}

const handleShare = (tweetId) => {
  ElMessage.info(`分享推文: ${tweetId}`)
}

const handleLike = (tweetId) => {
  const item = feedItems.value.find(i => i.id === tweetId)
  if (item) {
    item.liked = !item.liked
    item.likes += item.liked ? 1 : -1
    ElMessage.success(item.liked ? '已点赞' : '取消点赞')
  }
}

const handleBookmark = (tweetId) => {
  const item = feedItems.value.find(i => i.id === tweetId)
  if (item) {
    item.bookmarked = !item.bookmarked
    ElMessage.success(item.bookmarked ? '已收藏' : '取消收藏')
  }
}

const handleImageClick = ({ tweetId, index, images }) => {
  ElMessage.info(`查看图片: 第${index + 1}张`)
}

const handleDiscussionClick = async (discussion) => {
  try {
    // 获取帖子详情
    const res = await api.get(`/discussions/threads/${discussion.id}`)
    if (res.data && res.data.data) {
      const thread = res.data.data
      currentThread.value = {
        ...discussion,
        content: thread.content,
        author_name: thread.author_name,
        author_avatar: thread.author_avatar,
        reply_count: thread.reply_count,
        view_count: thread.view_count,
        like_count: thread.like_count,
        is_pinned: thread.is_pinned,
        created_at: thread.created_at
      }
      // 获取回复列表
      const repliesRes = await api.get(`/discussions/threads/${discussion.id}/replies`)
      if (repliesRes.data && repliesRes.data.data) {
        threadReplies.value = repliesRes.data.data
      }
      threadDetailVisible.value = true
    }
  } catch (error) {
    console.error('获取帖子详情失败:', error)
    ElMessage.error('获取帖子详情失败')
  }
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
      fetchThreads() // 刷新列表
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

const handleTopicItemClick = (topic) => {
  ElMessage.info(`查看话题: #${topic.name}`)
}

const handleMoreTopics = () => {
  ElMessage.info('查看更多话题')
}

const handleMoreUsers = () => {
  ElMessage.info('查看更多推荐用户')
}

const loadMore = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('加载成功')
  }, 1000)
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  fetchThreads()
})

// 监听排序变化
import { watch } from 'vue'
watch(sortType, () => {
  fetchThreads()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
/* 背景和布局 */
.community-view-container {
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.theme-light .community-view-container {
  background: #f8fafc;
}

.theme-dark .community-view-container {
  background: #0f0f0f;
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

.create-post-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.theme-dark .create-post-card {
  background: rgba(40, 40, 40, 0.8);
}

.sidebar-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.theme-light .sidebar-title {
  color: #1a1a1a;
}

.theme-dark .sidebar-title {
  color: #f5f5f5;
}

.theme-dark .create-post-card :deep(.el-form-item__label) {
  color: #d1d5db !important;
}

.theme-dark .create-post-card :deep(.el-input__wrapper) {
  background: #262626 !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.theme-dark .create-post-card :deep(.el-input__inner) {
  color: #d1d5db !important;
  background: transparent !important;
}

.theme-dark .create-post-card :deep(.el-input__inner)::placeholder {
  color: #6b7280 !important;
}

.theme-dark .create-post-card :deep(.el-textarea__inner) {
  background: #262626 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #d1d5db !important;
}

.theme-dark .create-post-card :deep(.el-textarea__inner)::placeholder {
  color: #6b7280 !important;
}

.theme-dark .create-post-card :deep(.el-select) {
  --el-fill-color: #262626;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.theme-light .filter-bar {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.theme-dark .filter-bar {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* el-segmented 暗黑模式 */
.theme-dark .filter-bar .el-segmented {
  --el-segmented-bg-color: #262626;
  --el-segmented-item-selected-bg-color: #3b82f6;
  --el-segmented-item-selected-color: #ffffff;
  --el-text-color-regular: #9ca3af;
  --el-text-color: #d1d5db;
}

/* filter-bar中的按钮 */
.theme-dark .filter-bar .el-button--primary {
  background: #3b82f6;
  border-color: #3b82f6;
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

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
}

.theme-light .filter-bar {
  background: #ffffff;
  border: 1px solid #e8e8e8;
}

.theme-dark .filter-bar {
  background: #2c2c2c;
  border: 1px solid #3a3a3a;
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
