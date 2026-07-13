<template>
  <div :class="['study-hub-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <!-- 轮播Banner区域 -->
    <div class="banner-section">
      <el-carousel
        :interval="4000"
        type="card"
        height="160px"
        indicator-position="outside"
        arrow="hover"
      >
        <el-carousel-item v-for="(banner, index) in banners" :key="index">
          <div class="banner-item" @click="handleBannerClick(banner)">
            <div v-if="!banner.bare" class="banner-overlay">
              <h3 class="banner-title">{{ banner.title }}</h3>
              <p class="banner-description">{{ banner.description }}</p>
            </div>
            <img :src="banner.image" :alt="banner.title" class="banner-image" />
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>

    <!-- 内容切换：学习入口 / 社区广场 / 座位图 -->
    <div class="content-switcher">
      <DewButtonBar v-model="activeTab" :items="hubTabs" size="md" />
    </div>

    <!-- 快捷入口 -->
    <div v-if="activeTab === 'entries'" class="study-entries">
      <div class="entries-grid">
        <DewCard
          v-for="entry in studyEntries"
          :key="entry.id"
          size="sm"
          :interactive="!entry.disabled"
          :no-hover="entry.disabled"
          :class="['entry-card', { 'entry-card--disabled': entry.disabled }]"
          @click="handleEntryClick(entry)"
        >
          <div class="entry-inner">
            <div class="entry-icon-wrapper" :style="{ background: entry.color + '1a' }">
              <el-icon class="entry-icon" :style="{ color: entry.color }">
                <component :is="entryIcons[entry.id]" />
              </el-icon>
            </div>
            <h4 class="entry-title">{{ entry.title }}</h4>
            <p class="entry-description">{{ entry.description }}</p>
          </div>
        </DewCard>
      </div>
    </div>

    <!-- 社区广场：推送最新帖子（compact 预览，点击进社区） -->
    <div v-else-if="activeTab === 'community'" class="community-feed">
      <div v-if="communityPosts.length" class="post-list">
        <DewPostCard
          v-for="post in communityPosts"
          :key="post.id"
          :post="post"
          mode="compact"
          @click="goCommunity"
        />
      </div>
      <div v-else class="post-empty">社区还没有内容，快来发布第一条吧</div>
    </div>

    <!-- 在线看板 -->
    <div v-else-if="activeTab === 'seatmap'" class="seatmap-section">
      <SeatBoard />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElCarousel, ElCarouselItem, ElIcon } from 'element-plus'
import {
  Reading, EditPen, School, Select, Files, Box, MagicStick,
} from '@element-plus/icons-vue'
import DewButtonBar from '../ui/DewButtonBar.vue'
import DewCard from '../ui/DewCard.vue'
import DewPostCard from '../ui/DewPostCard.vue'
import SeatBoard from '../SeatMap/SeatBoard.vue'
import api from '../../api'

const store = useStore()
const router = useRouter()

// 获取主题状态
const isDarkMode = computed(() => store.getters.isDarkMode)

// 内容切换 tab
const activeTab = ref('entries')
const hubTabs = [
  { value: 'entries', label: '快捷入口' },
  { value: 'community', label: '社区广场' },
  { value: 'seatmap', label: '在线看板' },
]

// 学习入口图标映射（Element Plus 图标，替代原 emoji）
const entryIcons = {
  courses: Reading,
  'question-bank': EditPen,
  camp: School,
  exams: Select,
  resources: Files,
  '3d-print': Box,
  'llm': MagicStick,
}

// 轮播Banner数据
const banners = ref([
  {
    id: 1,
    title: '2026 暑期训练营',
    description: '加入营期，沉浸式学习与考勤打卡',
    image: import.meta.env.BASE_URL + '2026暑期训练营.png',
    route: '/camp-home',
    bare: true
  },
  {
    id: 2,
    title: '大模型服务中心',
    description: '大模型 API 接口平台',
    image: import.meta.env.BASE_URL + '大模型服务中心.png',
    route: '/ai-service',
    bare: true
  },
  {
    id: 3,
    title: '3D打印农场',
    description: '在线预约，一站式 3D 打印服务',
    image: import.meta.env.BASE_URL + '3D打印农场.png',
    route: '/service/3d-print',
    bare: true
  }
])

// 学习功能入口数据
const studyEntries = ref([
  { id: 'courses', title: '课程', description: '系统化的课程学习', route: '/study', color: '#409EFF' },
  { id: 'question-bank', title: '题库', description: '练习巩固知识点', route: '/question-bank', color: '#67C23A', disabled: true },
  { id: 'camp', title: '营期', description: '2026 暑期训练营', route: '/camp-home', color: '#7c3aed' },
  { id: 'exams', title: '考核评估', description: '检验学习效果', route: '/exam', color: '#F56C6C', disabled: true },
  { id: 'resources', title: '学习资源', description: '丰富的学习材料', route: '/resources', color: '#909399', disabled: true },
  { id: '3d-print', title: '3D打印', description: '3D 模型打印预约', route: '/service/3d-print', color: '#06b6d4', disabled: true },
  { id: 'llm', title: '大模型', description: '大模型 API 接口平台', route: '/ai-service', color: '#ec4899' },
])

// ── 社区广场：推送最新帖子（真实 API + mock 兜底） ──
const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

const mockPosts = [
  { id: 1, author: '陈思远', authorAvatar: DEFAULT_AVATAR, publishTime: '12分钟前', title: '生物材料期末复习重点整理', content: '把这几章的核心考点和易错题梳理了一遍，附学姐笔记，需要的同学自取～', likes: 86, comments: 23, liked: false },
  { id: 2, author: '林晓彤', authorAvatar: DEFAULT_AVATAR, publishTime: '1小时前', title: '组织工程实验报告模板分享', content: '按老师要求做了一份模板，含数据分析部分，大家可以参考。', likes: 54, comments: 15, liked: false },
  { id: 3, author: '王浩然', authorAvatar: DEFAULT_AVATAR, publishTime: '3小时前', title: '求助：高分子降解速率怎么测？', content: '课上没太听懂这部分，有同学能讲讲体外降解实验的操作要点吗？', likes: 28, comments: 41, liked: false },
  { id: 4, author: '张雨琪', authorAvatar: DEFAULT_AVATAR, publishTime: '昨天', title: '考研复试经验帖 | 生物医学工程方向', content: '刚结束复试，把准备过程和面试常见问题记录下来，希望对学弟学妹有帮助。', likes: 192, comments: 67, liked: false },
]

const communityPosts = ref(mockPosts)
const avatarCache = {}

function formatTimeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return new Date(iso).toLocaleDateString()
}

async function fetchAvatar(userId) {
  if (!userId || avatarCache[userId]) return avatarCache[userId] || DEFAULT_AVATAR
  try {
    const res = await api({ url: '/user/user_avatars_id', method: 'get', params: { User_Id: userId } })
    const av = res.data?.User_Avatar ? `data:image/jpeg;base64,${res.data.User_Avatar}` : DEFAULT_AVATAR
    avatarCache[userId] = av
    return av
  } catch {
    return DEFAULT_AVATAR
  }
}

async function fetchCommunityPosts() {
  try {
    const res = await api.get('/discussions/threads', { params: { page: 1, per_page: 5, sort: 'latest' } })
    const threads = res.data?.data || []
    if (Array.isArray(threads) && threads.length) {
      communityPosts.value = threads.map(t => ({
        id: t.id,
        author: t.author_name || '匿名',
        authorId: t.author_id,
        authorAvatar: DEFAULT_AVATAR,
        publishTime: formatTimeAgo(t.created_at),
        title: t.title,
        content: (t.content || '').replace(/\s+/g, ' '),
        likes: t.like_count || 0,
        comments: t.reply_count || 0,
        liked: !!t.liked,
      }))
      // 异步补头像
      communityPosts.value.forEach(async (p) => {
        if (p.authorId) p.authorAvatar = await fetchAvatar(p.authorId)
      })
    }
    // 后端无数据则保留 mock
  } catch (e) {
    // 保留 mock
  }
}

function goCommunity() {
  router.push('/community')
}

// 事件处理
const emit = defineEmits(['banner-click', 'entry-click'])

const handleBannerClick = (banner) => {
  if (banner.route) {
    router.push(banner.route)
  }
  emit('banner-click', banner)
}

const handleEntryClick = (entry) => {
  if (entry.disabled) return
  if (entry.route) {
    router.push(entry.route)
  }
  emit('entry-click', entry)
}

onMounted(() => {
  fetchCommunityPosts()
})
</script>

<style scoped>
.study-hub-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: all 0.3s ease;
}

/* Banner区域样式 */
.banner-section {
  width: 100%;
  position: relative;
  overflow: visible;
}

.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: visible;
}

.banner-item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 20px;
  z-index: 2;
  border-radius: 12px;
}

.banner-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.banner-description {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 内容切换器 */
.content-switcher {
  width: 100%;
  display: flex;
}

/* 学习入口区域样式 */
.study-entries {
  flex: 1;
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 一行四个 */
  gap: 12px;
}

.entry-card--disabled {
  opacity: 0.55;
}

.entry-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 5px;
  padding: 4px 0 2px;
}

.entry-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.entry-icon {
  font-size: 20px;
}

.entry-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  color: var(--dew-text-heading);
}

.entry-description {
  font-size: 11px;
  margin: 0;
  line-height: 1.3;
  color: var(--dew-text-muted);
}

/* ── 社区广场：帖子流（卡片样式由 DewPostCard 接管） ── */
.community-feed {
  width: 100%;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-empty {
  text-align: center;
  padding: 32px 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 在线看板（房间切换/占位等由 SeatBoard 接管） */
.seatmap-section {
  width: 100%;
}

/* 轮播组件样式修复 - 允许悬停放大溢出 + 去掉自带灰底 */
:deep(.el-carousel),
:deep(.el-carousel__container) {
  overflow: visible !important;
  background: transparent !important;
}

:deep(.el-carousel__item),
:deep(.el-carousel__item--card),
:deep(.el-carousel__item--card.is-in-stage),
:deep(.el-carousel__item--card.is-active) {
  overflow: visible !important;
  background: transparent !important;
}

:deep(.el-carousel__item--card.is-active) {
  z-index: 2;
}

/* card 轮播侧卡的灰色遮罩（侧卡变灰的元凶；激活卡无此遮罩）→ 透明 */
:deep(.el-carousel__mask) {
  background: transparent !important;
}

/* 轮播组件主题适配 */
:deep(.el-carousel__indicator) {
  transition: all 0.3s ease;
}

.theme-light :deep(.el-carousel__indicator button) {
  background-color: rgba(0, 0, 0, 0.3);
}

.theme-dark :deep(.el-carousel__indicator button) {
  background-color: rgba(255, 255, 255, 0.4);
}

.theme-light :deep(.el-carousel__indicator.is-active button) {
  background-color: #409EFF;
}

.theme-dark :deep(.el-carousel__indicator.is-active button) {
  background-color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .banner-title {
    font-size: 20px;
  }

  .banner-description {
    font-size: 14px;
  }
}

@media (max-width: 900px) {
  .study-hub-container {
    gap: 20px;
  }

  .banner-section :deep(.el-carousel) {
    height: 160px;
  }

  .banner-title {
    font-size: 18px;
  }

  .banner-description {
    font-size: 13px;
  }

  .entries-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .study-hub-container {
    gap: 16px;
  }

  .banner-section :deep(.el-carousel) {
    height: 140px;
  }

  .banner-overlay {
    padding: 16px;
  }

  .banner-title {
    font-size: 16px;
  }

  .banner-description {
    font-size: 12px;
  }

  .entries-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}

/* 进入动画 */
.study-hub-container {
  animation: slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
