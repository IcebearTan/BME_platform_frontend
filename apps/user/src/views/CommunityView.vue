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
          <!-- 左侧导航栏 -->
          <aside class="left-sidebar">
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
            <!-- 顶部活动Banner -->
            <div class="activity-banner">
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

          <!-- 右侧栏 -->
          <aside class="right-sidebar">
            <!-- 热门话题 -->
            <SidebarWidget title="热门话题" :show-more="true" @more="handleMoreTopics">
              <div 
                v-for="(topic, index) in hotTopics" 
                :key="index"
                class="topic-item"
                @click="handleTopicItemClick(topic)"
              >
                <div class="topic-rank">{{ index + 1 }}</div>
                <div class="topic-content">
                  <div class="topic-name">#{{ topic.name }}</div>
                  <div class="topic-count">{{ topic.count }} 讨论</div>
                </div>
              </div>
            </SidebarWidget>

            <!-- 推荐用户 -->
            <SidebarWidget title="推荐关注" :show-more="true" @more="handleMoreUsers">
              <div 
                v-for="user in recommendUsers" 
                :key="user.id"
                class="user-item"
              >
                <el-avatar :size="40" :src="user.avatar" />
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-bio">{{ user.bio }}</div>
                </div>
                <el-button size="small" type="primary" plain>关注</el-button>
              </div>
            </SidebarWidget>

            <!-- 活跃榜单 -->
            <SidebarWidget title="本周活跃">
              <div 
                v-for="(user, index) in activeUsers" 
                :key="index"
                class="active-user-item"
              >
                <span class="rank-badge" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                <el-avatar :size="32" :src="user.avatar" />
                <span class="user-name">{{ user.name }}</span>
                <span class="user-score">{{ user.score }}分</span>
              </div>
            </SidebarWidget>
          </aside>
        </div>
      </el-main>

      <!-- <el-footer class="footer-container">
        <PageFooterComponent />
      </el-footer> -->
    </el-container>
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
import { 
  Grid, Collection, Document, ChatDotRound, User, TrendCharts, Plus, ArrowRight
} from '@element-plus/icons-vue'
import { Menu as Expand } from '@element-plus/icons-vue'
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
const sortType = ref('推荐')
const sortOptions = ['推荐', '最新', '热门']

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

// 事件处理
const handleTopicClick = (topic) => {
  ElMessage.info(`进入专题: ${topic.title}`)
}

const handleCreatePost = () => {
  ElMessage.info('打开发布编辑器')
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

const handleDiscussionClick = (discussion) => {
  ElMessage.info(`查看讨论: ${discussion.title}`)
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
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
.community-view-container {
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.theme-light .community-view-container {
  background: #f5f7fa;
}

.theme-dark .community-view-container {
  background: #1a1a1a;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.theme-dark .header-container {
  background: #2c2c2c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* 三栏布局 */
.community-layout {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  gap: 24px;
  align-items: start;
}

/* 左侧导航栏 */
.left-sidebar {
  position: sticky;
  top: 100px;
}

.nav-menu {
  border-radius: 8px;
  overflow: hidden;
}

.theme-light .nav-menu {
  background: #ffffff;
  border: 1px solid #e8e8e8;
}

.theme-dark .nav-menu {
  background: #2c2c2c;
  border: 1px solid #3a3a3a;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 14px;
  font-weight: 400;
}

.theme-light .nav-item {
  color: #4a5568;
}

.theme-dark .nav-item {
  color: #a0aec0;
}

.theme-light .nav-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.theme-dark .nav-item:hover {
  background: #3a3a3a;
  color: #e2e8f0;
}

.theme-light .nav-item.active {
  background: #edf2f7;
  color: #1a202c;
  font-weight: 500;
}

.theme-dark .nav-item.active {
  background: #3a3a3a;
  color: #ffffff;
  font-weight: 500;
}

.nav-item .el-icon {
  font-size: 18px;
  opacity: 0.85;
}

/* 主内容区 */
.main-content {
  min-height: 100vh;
}

/* 活动Banner */
.activity-banner {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.activity-banner :deep(.el-carousel__container) {
  border-radius: 8px;
}

.activity-banner :deep(.el-carousel__indicators) {
  display: flex;
  justify-content: flex-start;
  padding-left: 24px;
  bottom: 8px;
}

.activity-banner :deep(.el-carousel__indicator) {
  padding: 4px;
}

.activity-banner :deep(.el-carousel__button) {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  opacity: 0.4;
}

.activity-banner :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  opacity: 1;
  width: 18px;
}

.banner-item {
  width: 100%;
  height: 100%;
  cursor: pointer;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
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
  top: 100px;
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
    grid-template-columns: 200px 1fr 260px;
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

  .left-sidebar,
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
</style>
