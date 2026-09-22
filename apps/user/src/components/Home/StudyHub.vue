<template>
  <div
    ref="bannerSectionRef"
    :class="['study-hub-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]"
  >
    <!-- 轮播Banner区域（DB 驱动：GET /banner/list）。
         加载期骨架占位（对齐 card 轮播主卡形制，防数据到达后布局下推）；失败/空数据整区隐藏 -->
    <div v-if="bannersLoading" class="banner-section banner-section--loading">
      <DewSkeleton variant="rect" class="banner-skeleton" :height="carouselHeight" rounded="12px" />
    </div>
    <div v-else-if="banners.length" class="banner-section">
      <div class="carousel-viewport" @mouseenter="pauseBannerAutoplay" @mouseleave="startBannerAutoplay">
        <div
          :class="['carousel-stage', { 'carousel-stage--single': !hasSidePreviews }]"
          :style="{ '--carousel-ratio': carouselRatio }"
        >
          <article
          v-for="(banner, index) in banners"
          :key="banner.id"
          :class="['banner-slide', slideClass(index)]"
          :style="slideStyle(index)"
          @click="handleSlideClick(index, banner)"
          >
            <div class="banner-item">
            <!-- 学期营帧 = corner 模式：左下角玻璃状态条（避开底图烧录文字区），标题/状态/链接由主推营期驱动 -->
            <div v-if="!banner.bare" :class="['banner-overlay', { 'overlay-corner': banner.corner }]">
              <template v-if="banner.corner">
                <div class="camp-live-chip">
                  <span v-if="banner.live" class="chip-dot"></span>
                  <span class="chip-title">{{ banner.title }}</span>
                  <span class="chip-sep">·</span>
                  <span class="chip-desc">{{ banner.description }}</span>
                </div>
              </template>
              <template v-else>
                <h3 class="banner-title">{{ banner.title }}</h3>
                <p class="banner-description">{{ banner.description }}</p>
              </template>
            </div>
            <DewImage :src="banner.image" :alt="banner.title" class="banner-image"
                      :fit="banner.fit"
                      :position="`50% ${banner.focusY ?? 50}%`"
                      :lazy="false" />
            </div>
          </article>
          <button v-if="banners.length > 1" class="carousel-arrow carousel-arrow--prev" type="button" aria-label="上一张" @click.stop="previousBanner">‹</button>
          <button v-if="banners.length > 1" class="carousel-arrow carousel-arrow--next" type="button" aria-label="下一张" @click.stop="nextBanner">›</button>
        </div>
      </div>
      <div
        v-if="banners.length > 1"
        class="carousel-indicators"
        aria-label="轮播分页"
        @mouseenter="pauseBannerAutoplay"
        @mouseleave="handleIndicatorsLeave"
      >
        <button
          v-for="(_banner, index) in banners"
          :key="`indicator-${index}`"
          :class="{ 'is-active': index === activeBannerIndex }"
          type="button"
          :aria-label="`切换到第 ${index + 1} 张`"
          @mouseenter="scheduleBannerPreview(index)"
          @mouseleave="cancelBannerPreview"
          @focus="goToBanner(index)"
          @click="goToBanner(index)"
        />
      </div>
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
          :key="post.type + '-' + post.id"
          :post="post"
          mode="compact"
          @click="onPostClick"
          @user-click="onUserClick"
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
import { ref, reactive, computed, nextTick, onBeforeUnmount, onMounted, h } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
// el-carousel / el-icon 由 unplugin-vue-components 按需解析（含样式），不再显式 import
import {
  Reading, School, Box, MagicStick, OfficeBuilding,
} from '@element-plus/icons-vue'
import DewButtonBar from '@bme/dew-ui/DewButtonBar.vue'
import DewCard from '@bme/dew-ui/DewCard.vue'
import DewImage from '@bme/dew-ui/DewImage.vue'
import DewPostCard from '@bme/dew-ui/DewPostCard.vue'
import DewSkeleton from '@bme/dew-ui/DewSkeleton.vue'
import SeatBoard from '../SeatMap/SeatBoard.vue'
import api from '../../api'
import { assetUrl, campService } from '../../services/campService'

const store = useStore()
const router = useRouter()

// XLAB 入口图标：Lucide brain-circuit（ISC，@license lucide-static v1.45.0）——EP 无大脑类图标，
// 按「图标走 EP 或 SVG」约束内联；描边吃 currentColor，随入口色走
const IconBrainCircuit = () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24',
  width: '1em', height: '1em', fill: 'none', stroke: 'currentColor',
  'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
}, [
  h('path', { d: 'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z' }),
  h('path', { d: 'M9 13a4.5 4.5 0 0 0 3-4' }),
  h('path', { d: 'M6.003 5.125A3 3 0 0 0 6.401 6.5' }),
  h('path', { d: 'M3.477 10.896a4 4 0 0 1 .585-.396' }),
  h('path', { d: 'M6 18a4 4 0 0 1-1.967-.516' }),
  h('path', { d: 'M12 13h4' }),
  h('path', { d: 'M12 18h6a2 2 0 0 1 2 2v1' }),
  h('path', { d: 'M12 8h8' }),
  h('path', { d: 'M16 8V5a2 2 0 0 1 2-2' }),
  h('circle', { cx: 16, cy: 13, r: 0.5 }),
  h('circle', { cx: 18, cy: 3, r: 0.5 }),
  h('circle', { cx: 20, cy: 21, r: 0.5 }),
  h('circle', { cx: 20, cy: 8, r: 0.5 }),
])

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
  camp: School,
  '3d-print': Box,
  'llm': MagicStick,
  'xlab': IconBrainCircuit,
  'club': OfficeBuilding,
}

// 轮播Banner数据（09-15 起 DB 驱动，管理端「首页轮播」页维护，换图零发版）：
// 帧静态部分（底图/标题/链接/顺序/可见）来自 GET /banner/list；
// is_camp_frame=1 的帧为「营期帧」能力位——叠加 /camp/featured 主推营动态角标（09-14 撤动态帧后
// seed 置 0，恢复动态帧改 DB 标志即可零代码）。底图规范见 docs/首页banner-运营规范.md。
const banners = ref([])
const bannersLoading = ref(true)   // 加载期骨架占位（防数据到达后整区下推 CLS）
const bannerSectionRef = ref(null)
const carouselHeight = ref('160px')
const isCompactBanner = ref(false)
const activeBannerIndex = ref(0)
const hasSidePreviews = computed(() => !isCompactBanner.value && banners.value.length > 1)
const imageRatio = computed(() => {
  const ratios = [...new Set(banners.value.map((banner) => banner.displayRatio).filter(Boolean))]
  return ratios.length === 1 ? ratios[0] : (isCompactBanner.value ? 16 / 9 : 2 / 1)
})
const carouselRatio = computed(() => {
  // 多帧时主卡仅占舞台 68%，舞台必须按该比例反算，主卡才与原图同宽高比。
  return hasSidePreviews.value ? imageRatio.value / 0.68 : imageRatio.value
})
let bannerResizeObserver = null
let bannerAutoplayTimer = null
let bannerPreviewTimer = null

function getBannerRatio(width) {
  if (width <= 768) return 16 / 9
  if (width <= 1200) return 16 / 7
  return 2 / 1
}

function updateCarouselHeight() {
  const width = bannerSectionRef.value?.clientWidth
  if (!width) return

  // 窄屏使用全宽舞台；桌面保留原来的半栏视觉尺度。
  isCompactBanner.value = width <= 768
  const activeCardWidth = isCompactBanner.value ? width : width * 0.74 * (hasSidePreviews.value ? 0.68 : 1)
  const ratio = carouselRatio.value || getBannerRatio(width)
  const height = Math.round(activeCardWidth / ratio)
  carouselHeight.value = `${Math.max(120, height)}px`
}

async function fetchBanners() {
  try {
    const res = await api.get('/banner/list')
    const rows = res.data?.data || []
    banners.value = rows.map(row => {
      const banner = {
        id: row.Banner_Id,
        title: row.title,
        description: row.description || '',
        image: assetUrl(row.image),
        focusY: row.image_focus_y,   // 显示条纵向焦点（0-100，默认 50 显示中带；管理页可调）
        fit: row.image_fit || 'cover',
        displayRatio: Number(row.display_ratio) || null,
        bare: true,
      }
      if (row.link_type === 'external' && row.link_value) banner.external = row.link_value
      else if (row.link_type === 'route' && row.link_value) banner.route = row.link_value
      if (row.is_camp_frame) applyFeaturedBanner(banner)
      return banner
    })
    activeBannerIndex.value = 0
  } catch (e) {
    banners.value = []   // 拉取失败整区隐藏（模板 v-if），不阻塞首屏
  } finally {
    bannersLoading.value = false
    await nextTick()
    updateCarouselHeight()
    startBannerAutoplay()
  }
}

// 营期帧叠加主推营角标：有主推营显示营名+招募中（live 圆点），无营显示「新营期筹备中」
async function applyFeaturedBanner(banner) {
  banner.bare = false
  banner.corner = true
  banner.live = false
  banner.description = '新营期筹备中'
  banner.route = '/camp'
  try {
    const data = await campService.fetchFeatured()
    if (data?.code === 200 && data.session) {
      banner.title = data.session.name || banner.title
      banner.description = '招募中，点击查看'
      banner.live = true
      banner.route = '/camp-home'
    }
  } catch (e) {
    /* 未登录/接口失败：保持静默角标兜底文案 */
  }
}
function circularOffset(index) {
  const count = banners.value.length
  if (!count) return 0
  let offset = index - activeBannerIndex.value
  if (offset > count / 2) offset -= count
  if (offset < -count / 2) offset += count
  return offset
}

function slideClass(index) {
  const offset = circularOffset(index)
  return {
    'is-active': offset === 0,
    'is-prev': offset === -1,
    'is-next': offset === 1,
    'is-hidden': Math.abs(offset) > 1,
  }
}

function slideStyle(index) {
  const offset = circularOffset(index)
  if (offset === 0) return { left: '50%', transform: 'translateX(-50%) scale(1)' }
  if (offset === -1) return { left: '0%', transform: 'translateX(-58%) scale(.84)' }
  if (offset === 1) return { left: '100%', transform: 'translateX(-42%) scale(.84)' }
  return { left: '50%', transform: 'translateX(-50%) scale(.72)' }
}

function goToBanner(index) {
  cancelBannerPreview()
  activeBannerIndex.value = index
}

function nextBanner() {
  goToBanner((activeBannerIndex.value + 1) % banners.value.length)
}

function previousBanner() {
  goToBanner((activeBannerIndex.value - 1 + banners.value.length) % banners.value.length)
}

function handleSlideClick(index, banner) {
  if (index !== activeBannerIndex.value) {
    goToBanner(index)
    return
  }
  handleBannerClick(banner)
}

function pauseBannerAutoplay() {
  if (bannerAutoplayTimer) clearInterval(bannerAutoplayTimer)
  bannerAutoplayTimer = null
}

function cancelBannerPreview() {
  if (bannerPreviewTimer) clearTimeout(bannerPreviewTimer)
  bannerPreviewTimer = null
}

function scheduleBannerPreview(index) {
  cancelBannerPreview()
  pauseBannerAutoplay()
  if (index === activeBannerIndex.value) return
  bannerPreviewTimer = setTimeout(() => {
    activeBannerIndex.value = index
    bannerPreviewTimer = null
  }, 180)
}

function handleIndicatorsLeave() {
  cancelBannerPreview()
  startBannerAutoplay()
}

function startBannerAutoplay() {
  pauseBannerAutoplay()
  if (banners.value.length > 1) bannerAutoplayTimer = setInterval(nextBanner, 5000)
}

// 学习功能入口数据（全部已上线可点；题库/考核/资源等未上线入口统一放服务台「学习服务」板块）
const studyEntries = ref([
  { id: 'courses', title: '课程', description: '系统化的课程学习', route: '/study', color: '#409EFF' },
  { id: 'camp', title: '营期中心', description: '查看报名与我的营期', route: '/camp', color: '#7c3aed' },
  { id: '3d-print', title: '3D打印', description: '3D 模型打印预约', external: '/3dfarm/', color: '#06b6d4' },
  { id: 'llm', title: '大模型', description: '大模型 API 接口平台', route: '/ai-service', color: '#ec4899' },
  { id: 'xlab', title: 'XLAB', description: '营期项目 × 自由分享', route: '/projects', color: '#00ff9c' },
  { id: 'club', title: '社团', description: '组织架构与干事名录', route: '/organization', color: '#10b981' },
])

// ── 社区广场：推送最新帖子（真实 API + mock 兜底） ──
const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

const mockPosts = [
  { id: 1, author: '陈思远', authorAvatar: '', publishTime: '12分钟前', title: '生物材料期末复习重点整理', content: '把这几章的核心考点和易错题梳理了一遍，附学姐笔记，需要的同学自取～', likes: 86, comments: 23, liked: false },
  { id: 2, author: '林晓彤', authorAvatar: '', publishTime: '1小时前', title: '组织工程实验报告模板分享', content: '按老师要求做了一份模板，含数据分析部分，大家可以参考。', likes: 54, comments: 15, liked: false },
  { id: 3, author: '王浩然', authorAvatar: '', publishTime: '3小时前', title: '求助：高分子降解速率怎么测？', content: '课上没太听懂这部分，有同学能讲讲体外降解实验的操作要点吗？', likes: 28, comments: 41, liked: false },
  { id: 4, author: '张雨琪', authorAvatar: '', publishTime: '昨天', title: '考研复试经验帖 | 生物医学工程方向', content: '刚结束复试，把准备过程和面试常见问题记录下来，希望对学弟学妹有帮助。', likes: 192, comments: 67, liked: false },
]

const communityPosts = ref(mockPosts)

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

// （原 base64 fetchAvatar 已移除：feed 的 author_avatar 已是相对路径，map 内直接用）

async function fetchCommunityPosts() {
  try {
    const res = await api.get('/community/feed', { params: { page: 1, per_page: 5, sort: 'latest' } })
    const raw = res.data?.data || []
    if (Array.isArray(raw) && raw.length) {
      communityPosts.value = raw.map(item => {
        const isArticle = item.type === 'article'
        const post = {
          id: item.id,
          type: item.type,
          articleId: isArticle ? (item.article_id ?? item.id) : null,
          articleVersion: isArticle ? item.article_version : null,
          author: item.author_name || '匿名',
          authorId: item.author_id,
          authorAvatar: assetUrl(item.author_avatar || ''),
          publishTime: formatTimeAgo(item.created_at),
          title: item.title,
          content: ((item.summary || '') + '').replace(/\s+/g, ' '),
          likes: item.like_count || 0,
          comments: item.reply_count || 0,
          liked: !!item.liked,
        }
        // 文章帖：用角标区分（compact 预览的轻量区分）
        if (isArticle) post.badge = '文章'
        return post
      })
      // 作者头像统一用 feed 返回的相对路径 author_avatar（含讨论帖），不再逐条调 base64 接口
    }
    // 后端无数据则保留 mock
  } catch (e) {
    // 保留 mock
  }
}

function goCommunity() {
  router.push('/community')
}

// 帖子点击：文章帖进文章详情，讨论帖进社区广场列表
function onPostClick(post) {
  if (post.type === 'article') {
    // 与社区广场一致：v2 文章进 /article-v2，v1 旧文进 /article
    if (post.articleVersion === 2) {
      router.push({ path: '/article-v2', query: { id: post.articleId } })
    } else {
      router.push({ path: '/article', query: { Article_Id: post.articleId } })
    }
  } else {
    goCommunity()
  }
}

// 作者点击：进其个人主页
// 注意 DewPostCard 在缺 authorId 时会回退 emit post.id，这里只在该 id 确为某帖作者时才跳
function onUserClick(id) {
  const hit = communityPosts.value.find(p => p.authorId != null && Number(p.authorId) === Number(id))
  if (hit) router.push('/profile/' + id)
}

// 事件处理
const emit = defineEmits(['banner-click', 'entry-click'])

const handleBannerClick = (banner) => {
  if (banner.external) {
    window.open(banner.external, '_blank')
  } else if (banner.route) {
    router.push(banner.route)
  }
  emit('banner-click', banner)
}

const handleEntryClick = (entry) => {
  if (entry.disabled) return
  if (entry.external) {
    window.open(entry.external, '_blank')
  } else if (entry.route) {
    router.push(entry.route)
  }
  emit('entry-click', entry)
}


onMounted(() => {
  updateCarouselHeight()
  if (typeof ResizeObserver !== 'undefined') {
    bannerResizeObserver = new ResizeObserver(updateCarouselHeight)
    bannerResizeObserver.observe(bannerSectionRef.value)
  }
  fetchBanners()
  fetchCommunityPosts()
})

onBeforeUnmount(() => {
  bannerResizeObserver?.disconnect()
  bannerResizeObserver = null
  pauseBannerAutoplay()
  cancelBannerPreview()
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
  min-width: 0;
  overflow: clip;
}

/* 加载期骨架：主卡居中，底部预留外置指示条高度，数据到达无跳动 */
.banner-section--loading {
  display: flex;
  justify-content: center;
  padding-bottom: 24px;
}

.banner-skeleton {
  width: clamp(360px, 50%, 720px);
  max-width: 100%;
}

.carousel-viewport {
  width: 100%;
  min-width: 0;
  overflow: clip;
}

.carousel-stage {
  width: clamp(420px, 74%, 900px);
  max-width: 100%;
  aspect-ratio: var(--carousel-ratio);
  position: relative;
  margin: 0 auto;
  overflow: hidden;
  isolation: isolate;
  border-radius: 12px;
}

.carousel-stage--single {
  width: clamp(360px, 50%, 720px);
}

.banner-slide {
  position: absolute;
  top: 0;
  width: 68%;
  height: 100%;
  z-index: 1;
  cursor: pointer;
  opacity: .58;
  transition: left .42s ease, transform .42s ease, opacity .28s ease;
}

.carousel-stage--single .banner-slide {
  width: 100%;
}

.banner-slide.is-active {
  z-index: 3;
  opacity: 1;
}

.banner-slide.is-prev,
.banner-slide.is-next {
  z-index: 2;
}

.banner-slide.is-hidden {
  pointer-events: none;
  opacity: 0;
}

.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.banner-slide.is-active .banner-item:hover .banner-image {
  transform: scale(1.025);
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

/* 学期营帧 corner 模式：不整幅压暗底图，只落左下角玻璃状态条 */
.banner-overlay.overlay-corner {
  justify-content: flex-end;
  align-items: flex-start;
  text-align: left;
  background: none;
  padding: 0 18px 14px;
}

.camp-live-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 92%;
  padding: 5px 13px;
  border-radius: 999px;
  background: rgba(15, 23, 32, 0.5);
  backdrop-filter: blur(12px) saturate(1.3);
  color: #fff;
  font-size: 12.5px;
  line-height: 1.5;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 25%, transparent);
}

.chip-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-sep {
  opacity: 0.5;
}

.chip-desc {
  opacity: 0.92;
  flex-shrink: 0;
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
  grid-template-columns: repeat(3, 1fr); /* 一行三个：6 个入口两行铺满 */
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

.carousel-arrow {
  position: absolute;
  top: 50%;
  z-index: 5;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  transform: translateY(-50%);
  background: rgba(15, 23, 42, .38);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.carousel-arrow:hover { background: rgba(15, 23, 42, .7); }
.carousel-arrow--prev { left: 10px; }
.carousel-arrow--next { right: 10px; }

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
}

.carousel-indicators button {
  width: 28px;
  height: 3px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: color-mix(in srgb, var(--dew-text-muted) 30%, transparent);
  cursor: pointer;
}

.carousel-indicators button.is-active { background: var(--color-primary, #409eff); }

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

  .carousel-stage,
  .banner-skeleton {
    width: 100%;
  }

  .banner-slide {
    width: 100%;
  }

  .banner-slide.is-prev,
  .banner-slide.is-next {
    opacity: 0;
    pointer-events: none;
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
