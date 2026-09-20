<script setup>
// 学习资源中心（2026-09-20 第一期）：跨课程资料聚合入口。
// 左栏来源导航（平台四分类 + 有资料的课程，课程资料整课归组不打散）+ 右侧文件列表 +
// 全局搜索（跨来源混排时以 tag 标注来源：课程名 / 分类名）。
// 下载策略：课程资料沿用 Down_Code 一次性码；平台资料走短签直连（2h 多次有效）。
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import {
  Menu as Expand, Search, Collection, Cpu, Notebook, DocumentChecked, FolderOpened
} from '@element-plus/icons-vue'
import api, { API_URL } from '../api'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import ResourceFileList from '../components/Course/ResourceFileList.vue'
import { DewCard, DewSidebar, DewInput, DewButton } from '@bme/dew-ui'

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)
const themeClass = computed(() => (isDarkMode.value ? 'theme-dark' : 'theme-light'))

// --- 响应式 Header 逻辑（对齐 UserCenter 外壳） ---
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

// ── 目录（左栏数据） ──
const catalog = ref({ categories: [], courses: [] })
const catalogLoading = ref(true)

// ── 当前来源与列表 ──
const activeSource = ref('')          // 'cat:{key}' | 'course:{id}'
const listItems = ref([])
const listLoading = ref(true)
const pager = ref({ page: 1, perPage: 20, total: 0 })

// ── 全局搜索 ──
const keyword = ref('')
const searchItems = ref([])
const searchLoading = ref(false)

const isSearchMode = computed(() => keyword.value.trim().length > 0)

// ── 左栏导航项 ──
const CAT_ICONS = { software: Cpu, handbook: Notebook, standard: DocumentChecked, other: FolderOpened }

const withCount = (label, count) => (count > 0 ? `${label} (${count})` : label)

const sidebarItems = computed(() => {
  const catChildren = catalog.value.categories.map(c => ({
    value: `cat:${c.key}`,
    label: withCount(c.label, c.count),
    icon: CAT_ICONS[c.key] || FolderOpened
  }))
  const courseChildren = catalog.value.courses.length
    ? catalog.value.courses.map(c => ({
        value: `course:${c.id}`,
        label: withCount(c.title, c.count),
        icon: Collection
      }))
    : [{ value: 'courses-empty', label: '暂无课程资料', disabled: true }]
  return [
    { label: '平台资料', children: catChildren },
    { label: '课程资料', children: courseChildren }
  ]
})

// ── 右栏标题 ──
const currentTitle = computed(() => {
  if (isSearchMode.value) return `搜索「${keyword.value.trim()}」`
  const [kind, id] = activeSource.value.split(':')
  if (kind === 'course') {
    const c = catalog.value.courses.find(x => String(x.id) === id)
    return c ? c.title : '课程资料'
  }
  const c = catalog.value.categories.find(x => x.key === id)
  return c ? c.label : '平台资料'
})

const totalCount = computed(() => (isSearchMode.value ? searchItems.value.length : pager.value.total || listItems.value.length))

// ── 数据加载 ──
const fetchCatalog = async () => {
  catalogLoading.value = true
  try {
    const res = await api({ url: '/resources/catalog', method: 'get' })
    if (res.data.code === 200) {
      catalog.value = {
        categories: res.data.categories || [],
        courses: res.data.courses || []
      }
    }
  } catch (error) {
    console.error('获取资源目录失败', error)
  } finally {
    catalogLoading.value = false
  }
}

const fetchStandalone = async (catKey, page = 1) => {
  listLoading.value = true
  try {
    const res = await api({
      url: '/resources/standalone',
      method: 'get',
      params: { category: catKey, page, per_page: 20 }
    })
    if (res.data.code === 200) {
      listItems.value = res.data.data || []
      pager.value = {
        page: res.data.page, perPage: res.data.per_page, total: res.data.total
      }
    }
  } catch (error) {
    console.error('获取平台资料失败', error)
  } finally {
    listLoading.value = false
  }
}

const fetchCourseResources = async (courseId) => {
  listLoading.value = true
  try {
    const res = await api({
      url: '/course/resources',
      method: 'get',
      params: { Course_Id: courseId }
    })
    if (res.data.code === 200) {
      listItems.value = res.data.data || []
      pager.value = { page: 1, perPage: listItems.value.length, total: listItems.value.length }
    }
  } catch (error) {
    console.error('获取课程资料失败', error)
  } finally {
    listLoading.value = false
  }
}

const loadSource = (source) => {
  const [kind, id] = source.split(':')
  if (kind === 'course') fetchCourseResources(id)
  else fetchStandalone(id)
}

const onSidebarSelect = (value) => {
  if (value === 'courses-empty') return
  keyword.value = ''
  activeSource.value = value
  loadSource(value)
}

const goToPage = (page) => {
  const [kind, id] = activeSource.value.split(':')
  if (kind !== 'cat' || page < 1) return
  if (pager.value.pages && page > pager.value.pages) return
  fetchStandalone(id, page)
}

// ── 全局搜索（防抖 + 过期响应丢弃） ──
let searchTimer = null
let searchSeq = 0

const fetchSearch = async (kw) => {
  const seq = ++searchSeq
  searchLoading.value = true
  try {
    const res = await api({
      url: '/resources/search',
      method: 'get',
      params: { keyword: kw }
    })
    if (seq === searchSeq && res.data.code === 200) {
      // 后端回 tag_label（snake_case）；映射为组件的 tagLabel，并定来源标签色：
      // 课程资料 → primary，平台资料 → neutral
      searchItems.value = (res.data.items || []).map(it => ({
        ...it,
        tagLabel: it.tag_label,
        tagType: it.source === 'course' ? 'primary' : 'neutral'
      }))
    }
  } catch (error) {
    console.error('搜索失败', error)
  } finally {
    if (seq === searchSeq) searchLoading.value = false
  }
}

watch(keyword, (v) => {
  clearTimeout(searchTimer)
  const kw = (v || '').trim()
  if (!kw) {
    searchSeq++          // 使在途响应作废
    searchItems.value = []
    searchLoading.value = false
    return
  }
  searchTimer = setTimeout(() => fetchSearch(kw), 300)
})

onUnmounted(() => clearTimeout(searchTimer))

// 搜索结果行点击：课程资料 → 跳到该课程来源；平台资料无操作（按钮下载）
const onSearchRowClick = (item) => {
  if (item.source !== 'course') return
  keyword.value = ''
  const value = `course:${item.course_id}`
  if (activeSource.value === value) {
    loadSource(value)
  } else {
    activeSource.value = value
    loadSource(value)
  }
}

// ── 下载策略 ──
// 课程资料：一次性下载码（与课程详情页同款链路）
const downloadCourse = async (courseId, ids) => {
  if (!ids.length) return
  try {
    const res = await api({
      url: '/course/resource_down',
      method: 'get',
      params: { Course_Id: courseId, Resource_Ids: ids.join(',') }
    })
    if (res.data.code === 200) {
      window.open(`${API_URL}/course/resource_download?Down_Code=${encodeURIComponent(res.data.Down_Code)}`, '_blank')
    } else {
      ElMessage.warning(res.data.message || '获取下载链接失败')
    }
  } catch (error) {
    console.error('下载失败', error)
    ElMessage.error('下载失败，请重试')
  }
}

const downloadCourseOne = (item) => {
  const [kind, id] = activeSource.value.split(':')
  const courseId = isSearchMode.value && item.source === 'course' ? item.course_id : id
  return downloadCourse(courseId, [item.id])
}

const downloadCourseBatch = (ids) => {
  const [, id] = activeSource.value.split(':')
  return downloadCourse(id, ids)
}

const downloadCourseAll = () => downloadCourse(activeSource.value.split(':')[1], [])

// 平台资料：短签直连（2h 多次有效，<a> 标签带不了 Authorization 头）
const downloadStandalone = async (item) => {
  try {
    const res = await api({
      url: `/resources/standalone/${item.id}/token`,
      method: 'get'
    })
    if (res.data.code === 200) {
      window.open(`${API_URL}${res.data.url}`, '_blank')
    } else {
      ElMessage.warning(res.data.message || '获取下载链接失败')
    }
  } catch (error) {
    console.error('下载失败', error)
    ElMessage.error('下载失败，请重试')
  }
}

// 搜索模式：按条目来源分发
const downloadSearchOne = (item) => (
  item.source === 'course'
    ? downloadCourse(item.course_id, [item.id])
    : downloadStandalone(item)
)

// ── 初始化：目录 + 默认来源（优先第一个有资料的平台分类，否则第一门有资料的课程） ──
onMounted(async () => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)

  await fetchCatalog()
  const firstCat = catalog.value.categories.find(c => c.count > 0)
  const firstCourse = catalog.value.courses[0]
  activeSource.value = firstCat
    ? `cat:${firstCat.key}`
    : (firstCourse ? `course:${firstCourse.id}` : 'cat:software')
  loadSource(activeSource.value)
})
</script>

<template>
  <div :class="['resource-center', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container>
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端头部 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="$router.push('/')"
              alt="Logo" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <!-- 移动端菜单 -->
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="page-main">
        <div class="rc-page">
          <!-- 页头：标题 + 全局搜索 -->
          <div class="rc-header">
            <div class="rc-title-block">
              <h1 class="rc-title">学习资源中心</h1>
              <p class="rc-subtitle">平台资料与各课程学习资料一站式获取</p>
            </div>
            <DewInput
              v-model="keyword"
              class="rc-search"
              placeholder="搜索资料名称"
              :prefix-icon="Search"
              round
              clearable
            />
          </div>

          <div class="rc-layout">
            <!-- 左：来源导航 -->
            <aside class="rc-sidebar">
              <DewCard size="lg" divided class="rc-sidebar-card">
                <DewSkeleton v-if="catalogLoading" variant="text" :lines="8" />
                <DewSidebar
                  v-else
                  :items="sidebarItems"
                  v-model="activeSource"
                  size="lg"
                  :collapsible="false"
                  @select="onSidebarSelect"
                />
              </DewCard>
            </aside>

            <!-- 右：文件列表 -->
            <section class="rc-content">
              <DewCard size="lg" divided class="rc-list-card">
                <template #header>
                  <div class="rc-list-header">
                    <div class="rc-list-title">
                      {{ currentTitle }}
                      <span v-if="!listLoading && !searchLoading" class="rc-list-count">共 {{ totalCount }} 份</span>
                    </div>
                  </div>
                </template>

                <!-- 搜索结果 -->
                <ResourceFileList
                  v-if="isSearchMode"
                  :items="searchItems"
                  :is-loading="searchLoading"
                  :theme-class="themeClass"
                  :download-one="downloadSearchOne"
                  empty-text="未找到相关资料"
                  @row-click="onSearchRowClick"
                />

                <!-- 平台资料（分类来源） -->
                <ResourceFileList
                  v-else-if="activeSource.startsWith('cat:')"
                  :items="listItems"
                  :is-loading="listLoading"
                  :theme-class="themeClass"
                  :download-one="downloadStandalone"
                  empty-text="该分类暂无资料"
                />

                <!-- 课程资料（整课归组，批量/一键下载） -->
                <ResourceFileList
                  v-else
                  :items="listItems"
                  :is-loading="listLoading"
                  :theme-class="themeClass"
                  selectable
                  :download-one="downloadCourseOne"
                  :download-batch="downloadCourseBatch"
                  :download-all="downloadCourseAll"
                  empty-text="该课程暂无资料"
                />

                <!-- 平台资料分页（真分页；单页放得下时不渲染） -->
                <div
                  v-if="!isSearchMode && activeSource.startsWith('cat:') && !listLoading && pager.total > pager.perPage"
                  class="rc-pager"
                >
                  <DewButton size="sm" :disabled="pager.page <= 1" @click="goToPage(pager.page - 1)">
                    上一页
                  </DewButton>
                  <span class="rc-pager-info">第 {{ pager.page }} / {{ pager.pages }} 页</span>
                  <DewButton size="sm" :disabled="pager.page >= pager.pages" @click="goToPage(pager.page + 1)">
                    下一页
                  </DewButton>
                </div>
              </DewCard>
            </section>
          </div>
        </div>
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 根容器：亮/暗双极光底（对齐 HomeView / UserCenter 规范） */
.resource-center {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.resource-center {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.resource-center {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

/* --- Header --- */
.header-container {
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: solid 1px var(--dew-card-divider);
  padding: 0;
  height: 60px;
  position: relative;
  background: transparent;
}

.desktop-menu-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.mobile-header {
  display: none;
  width: 100%;
  height: 100%;
  padding: 0 15px;
  box-sizing: border-box;
  justify-content: space-between;
  align-items: center;
}

.mobile-logo img {
  cursor: pointer;
}

.hamburger-icon {
  display: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--dew-text-muted);
}

@media (max-width: 768px) {
  .desktop-menu-container {
    display: none;
  }

  .mobile-header {
    display: flex;
  }

  .hamburger-icon {
    display: block;
  }

  .header-container {
    justify-content: space-between;
    padding: 0 15px;
  }
}

/* --- 主内容区：透明，让极光透出 --- */
.page-main {
  min-height: 100vh;
  width: 1200px;
  max-width: 100%;
  margin: 0 auto;
  background: transparent;
}

.rc-page {
  padding: 24px 20px 40px;
}

/* --- 页头 --- */
.rc-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.rc-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--dew-text-heading);
  letter-spacing: 0.5px;
}

.rc-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}

.rc-search {
  width: 280px;
  max-width: 100%;
}

/* --- 两栏布局（对齐 UserCenterComponent） --- */
.rc-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 20px;
  align-items: start;
}

.rc-content {
  min-width: 0;
}

.rc-sidebar-card {
  width: 100%;
}

/* 分组标题靠左贴边（对齐 UserCenterComponent 的侧栏微调） */
.rc-sidebar-card :deep(.dew-sidebar__item.is-group) {
  padding-left: 4px;
}

.rc-sidebar-card :deep(.dew-sidebar__item.is-group .dew-sidebar__arrow--placeholder) {
  display: none;
}

/* --- 列表卡片头 --- */
.rc-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rc-list-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.rc-list-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--dew-text-muted);
}

.rc-list-card :deep(.dew-card__body) {
  padding-top: 8px;
}

/* --- 分页（平台资料真分页） --- */
.rc-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 0 4px;
  border-top: 1px solid var(--dew-card-divider);
  margin-top: 8px;
}

.rc-pager-info {
  font-size: 12px;
  color: var(--dew-text-muted);
}

/* 响应式：窄屏堆叠 */
@media (max-width: 900px) {
  .rc-layout {
    grid-template-columns: 1fr;
  }
}
</style>
