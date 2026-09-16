<template>
  <div :class="['search-view-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端汉堡 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="isMobileMenuOpen = true">
            <Expand />
          </el-icon>
        </div>
      </el-header>
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="isMobileMenuOpen = false" />

      <el-main class="search-main-container">
        <div class="search-layout">
          <!-- HERO：无卡片化（营期 IA §3.1 页头范式），居中搜索落地感 -->
          <div class="search-hero">
            <h1 class="search-title">搜索全站</h1>
            <p class="search-sub">用户 · 项目 · 课程 · 营期 · 文章，一站直达</p>
            <DewInput
              v-model="draftKw" class="search-input" :prefix-icon="Search" round clearable
              size="lg" placeholder="搜索站内用户，回车查看结果" @enter="doSearch"
            />
          </div>

          <!-- 五域框架（待办 B.2）：用户域已开，其余占位禁用、逐域点亮；
               DewButtonBar 无逐项禁用，按 ms tag-chips 范式自写 -->
          <div class="domain-bar">
            <button
              v-for="d in domains" :key="d.value" type="button" class="domain-chip"
              :class="{ 'is-active': !d.disabled && d.value === tab, 'is-disabled': d.disabled }"
              :disabled="d.disabled" :title="d.disabled ? '后续开放' : ''"
              @click="switchDomain(d.value)"
            >
              <el-icon :size="14"><component :is="d.icon" /></el-icon>
              {{ d.label }}
            </button>
          </div>

          <!-- 用户域结果 -->
          <template v-if="tab === 'user'">
            <div v-if="!kw" class="search-hint">输入关键词，回车开始搜索</div>

            <DewCard v-else size="lg" no-hover class="result-card">
              <!-- 骨架（三段式：circle 头像 + 两行文本，与社区/排行榜骨架同范式） -->
              <div v-if="loading" class="user-list">
                <div v-for="i in 5" :key="i" class="user-row skel-row">
                  <DewSkeleton variant="circle" :size="44" />
                  <div class="skel-lines">
                    <DewSkeleton variant="text" width="32%" />
                    <DewSkeleton variant="text" width="52%" />
                  </div>
                </div>
              </div>

              <template v-else-if="users.length">
                <div class="result-meta">找到 {{ total }} 位与「{{ kw }}」相关的用户</div>
                <div class="user-list">
                  <div
                    v-for="(u, i) in users" :key="u.id" class="user-row" role="link"
                    :style="{ '--reveal-index': i }"
                    :aria-label="`查看 ${u.username} 的主页`" @click="openProfile(u.id)"
                  >
                    <DewImage
                      shape="circle" :size="44" :src="assetUrl(u.avatar_url)"
                      :initial="u.username ? u.username[0] : '?'" alt=""
                    />
                    <div class="user-info">
                      <div class="user-name-line">
                        <span class="user-name">{{ u.username }}</span>
                        <span v-if="u.level" class="user-level">LV{{ u.level }}</span>
                      </div>
                      <div class="user-sub">
                        {{ [u.institute, u.major].filter(Boolean).join(' · ') || '这位同学还没有填写院系信息' }}
                      </div>
                    </div>
                    <el-icon class="user-go" :size="14"><ArrowRight /></el-icon>
                  </div>
                </div>
                <div v-if="total > pageSize" class="pagination-wrap">
                  <el-pagination
                    layout="prev, pager, next" :total="total" :page-size="pageSize"
                    :current-page="page" @current-change="onPage"
                  />
                </div>
              </template>

              <div v-else class="search-empty">
                <div class="empty-line">没有找到与「{{ kw }}」相关的用户</div>
                <div class="empty-sub">换个关键词试试，或检查有没有错别字</div>
              </div>
            </DewCard>
          </template>
        </div>
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Search, ArrowRight, Expand, User, Folder, Reading, Calendar, Document } from '@element-plus/icons-vue'
import { DewInput, DewCard, DewImage, DewSkeleton, DewMessage } from '@bme/dew-ui'
import MenuComponent from '../components/MenuComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import { userService } from '../services/userService'
import { assetUrl } from '../services/campService'

const route = useRoute()
const router = useRouter()
const store = useStore()

const isDarkMode = computed(() => store.getters.isDarkMode)

// 移动端检测（与 HomeView/CommunityView 同款骨架）
const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkWindowSize = () => { isMobile.value = window.innerWidth <= 768 }
onMounted(() => window.addEventListener('resize', checkWindowSize))
onUnmounted(() => window.removeEventListener('resize', checkWindowSize))

const domains = [
  { value: 'user', label: '用户', icon: User },
  { value: 'project', label: '项目', icon: Folder, disabled: true },
  { value: 'course', label: '课程', icon: Reading, disabled: true },
  { value: 'camp', label: '营期', icon: Calendar, disabled: true },
  { value: 'article', label: '文章', icon: Document, disabled: true },
]

// URL 即状态：kw/tab 从路由取，页码为组件态（换关键词即重置）
const tab = computed(() => route.query.tab || 'user')
const kw = computed(() => (route.query.kw || '').trim())
const draftKw = ref(kw.value)

const pageSize = 20
const page = ref(1)
const users = ref([])
const total = ref(0)
const loading = ref(false)

function doSearch() {
  const k = draftKw.value.trim()
  if (!k || k === kw.value) return
  router.push({ query: { ...route.query, kw: k, tab: 'user' } })
}

function switchDomain(d) {
  if (d === tab.value) return
  router.replace({ query: { ...route.query, tab: d } })
}

function openProfile(id) {
  router.push(`/profile/${id}`)
}

function onPage(p) {
  page.value = p
  fetchUsers()
}

async function fetchUsers() {
  if (!kw.value) {
    users.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const d = await userService.search({ keyword: kw.value, page: page.value, page_size: pageSize })
    if (d.code === 200) {
      users.value = d.users || []
      total.value = d.total || 0
    }
  } catch {
    users.value = []
    total.value = 0
    DewMessage({ message: '搜索失败，请稍后重试', type: 'error' })
  } finally {
    loading.value = false
  }
}

// 导航栏搜索框在本页重复搜索/切域 → query 变化即重拉（换关键词重置页码）
watch(() => [route.query.kw, route.query.tab], ([nk]) => {
  draftKw.value = (nk || '').trim()
  page.value = 1
  fetchUsers()
}, { immediate: true })
</script>

<style scoped>
/* 背景和布局 —— 液态玻璃需要的彩色极光底（亮/暗各一套，与 HomeView/CommunityView 同款） */
.search-view-container {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}
.theme-light.search-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}
.theme-dark.search-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.common-layout { min-height: 100vh; display: flex; flex-direction: column; }
.header-container { padding: 0; height: auto; z-index: 100; }

.search-main-container { flex: 1; padding: 24px; padding-top: 84px; }
.search-layout { max-width: 780px; margin: 0 auto; }

/* HERO：无卡片化页头 + 居中搜索落地 */
.search-hero { text-align: center; padding: 20px 0 8px; animation: hero-reveal 0.5s var(--dew-bounce, ease) both; }
.search-title {
  font-size: 34px; font-weight: 700; color: var(--dew-text-heading);
  margin: 0 0 10px; letter-spacing: 1px;
}
.search-sub { font-size: 14px; color: var(--dew-text-muted); margin: 0 0 24px; letter-spacing: 2px; }
.search-input { max-width: 600px; margin: 0 auto; }

@keyframes hero-reveal {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 五域 chips */
.domain-bar {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
  margin: 24px auto 22px;
}
.domain-chip {
  border: none; background: transparent; padding: 8px 18px; border-radius: 999px;
  font-size: 14px; color: var(--dew-text-muted); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  transition: transform 0.25s var(--dew-bounce, ease), background 0.25s ease, color 0.25s ease;
}
.domain-chip:hover:not(.is-disabled):not(.is-active) {
  transform: translateY(-1px); color: var(--dew-text-text);
}
.domain-chip.is-active {
  background: var(--color-primary-light); color: var(--color-primary); font-weight: 600;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.domain-chip.is-disabled { color: var(--dew-text-faint); cursor: not-allowed; }

.search-hint { color: var(--dew-text-muted); font-size: 14px; padding: 56px 0; text-align: center; }

.result-meta { color: var(--dew-text-muted); font-size: 13px; margin-bottom: 6px; }

.user-list { display: flex; flex-direction: column; }
.user-row {
  display: flex; align-items: center; gap: 14px; padding: 14px 6px; cursor: pointer;
  border-bottom: 1px solid var(--dew-card-border, transparent);
  transition: transform 0.25s var(--dew-bounce, ease);
  animation: card-reveal 0.45s var(--dew-bounce, ease) both;
  animation-delay: calc(min(var(--reveal-index, 0), 8) * 45ms);
}
.user-row:last-child { border-bottom: none; }
.user-row:hover { transform: translateY(-1px); }
.skel-row { cursor: default; animation: none; }
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }

@keyframes card-reveal {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-info { flex: 1; min-width: 0; }
.user-name-line { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.user-level {
  font-size: 11px; color: var(--color-primary); font-weight: 600;
  background: var(--color-primary-light); border-radius: 999px; padding: 1px 8px;
}
.user-sub {
  font-size: 13px; color: var(--dew-text-muted); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* 行尾箭头：hover 时才显形（形态反馈，不变色） */
.user-go { color: var(--dew-text-faint); opacity: 0; transform: translateX(-4px); transition: all 0.25s ease; }
.user-row:hover .user-go { opacity: 1; transform: translateX(0); }

.search-empty { padding: 40px 0 36px; text-align: center; }
.empty-line { color: var(--dew-text-text); font-size: 15px; font-weight: 600; }
.empty-sub { color: var(--dew-text-muted); font-size: 13px; margin-top: 8px; }

.pagination-wrap { display: flex; justify-content: center; padding-top: 18px; }

/* 动效降级（IA §3.5） */
@media (prefers-reduced-motion: reduce) {
  .search-hero, .user-row { animation: none; }
}

/* 全局页脚（与 HomeView 同款：深底两态） */
.page-footer {
  display: flex; justify-content: center; align-items: center; flex-direction: column;
  padding: 20px; width: 100%; min-height: 400px; margin: 0; box-sizing: border-box;
  color: #ffffff; transition: all 0.3s ease;
}
.theme-light .page-footer { background-color: #252525; }
.theme-dark .page-footer { background-color: #0f0f0f; }

@media (max-width: 760px) {
  .search-main-container { padding: 16px; padding-top: 76px; }
  .search-title { font-size: 26px; }
  .search-sub { letter-spacing: 1px; margin-bottom: 18px; }
}
</style>
