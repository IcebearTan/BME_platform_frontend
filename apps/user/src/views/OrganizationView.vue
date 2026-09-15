<script setup>
// 社团组织架构页 · 三省六部式钻入导航（v2 重设计，推翻 v1 折叠手风琴）
// 总览层：社长（居中主卡）→ 管理层五人横排（三副社长 + 团支书 + 副团支书）→ 一级组令牌墙（竖排文字）。
// 钻入层：点令牌收起总览、展开该组详情（组头 + 成员名录 + 子组令牌墙），子组可继续钻入，以此类推。
// 面包屑（社团 / 一级组 / 二级组…）负责页内逐级返回；层级不假设固定。
// 数据 = GET /organization（设计方案 docs/社团身份体系-设计方案.md §4.1）。
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { Menu as Expand, ArrowRight } from '@element-plus/icons-vue';
import MenuComponent from "../components/MenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import api from '../api';
import { DewCard, DewSkeleton } from '@bme/dew-ui';
import OfficerCard from '../components/Organization/OfficerCard.vue';
import OrgTokenBoard from '../components/Organization/OrgTokenBoard.vue';
import OrgGroupDetail from '../components/Organization/OrgGroupDetail.vue';

const store = useStore();

const isDarkMode = computed(() => store.getters.isDarkMode);

const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  fetchOrg();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// ── 数据：真接口，三段式（loading / error / done）──
const org = ref(null);
const loading = ref(true);
const loadFailed = ref(false);

async function fetchOrg() {
  loading.value = true;
  loadFailed.value = false;
  try {
    const res = await api.get('/organization');
    org.value = res.data?.data || null;
  } catch {
    org.value = null;
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

const tree = computed(() => (org.value?.tree || []));
const hasOfficers = computed(
  () => !!(org.value?.president || (org.value?.management || []).length));

// ── 钻入导航：trail = 从根到当前的组节点栈；空 = 总览层 ──
const trail = ref([]);
const current = computed(() => trail.value[trail.value.length - 1] || null);
// 过渡 key：总览 / 各层组 id，保证同层切换子组时也触发淡入淡出
const viewKey = computed(() => (current.value ? `g${current.value.id}` : 'root'));

const enterGroup = (node) => {
  trail.value.push(node);
  window.scrollTo({ top: 0 });
};

// 面包屑回跳：-1 = 总览；i = trail 第 i 层
const goCrumb = (i) => {
  if (i < 0) trail.value = [];
  else trail.value = trail.value.slice(0, i + 1);
  window.scrollTo({ top: 0 });
};
</script>

<template>
  <div :class="['organization-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="$router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <!-- Page Header -->
          <div class="page-header">
            <div class="page-title-row">
              <span class="title-accent"></span>
              <h1 class="page-title">社团组织架构</h1>
            </div>
            <p class="sub-title">现任组织结构与干事名录，点击令牌进入组别，点击人员可查看主页</p>
          </div>

          <!-- 面包屑（钻入后出现） -->
          <nav v-if="trail.length" class="org-crumbs" aria-label="组别层级">
            <button class="crumb" type="button" @click="goCrumb(-1)">社团</button>
            <template v-for="(n, i) in trail" :key="n.id || n.name">
              <el-icon class="crumb-sep"><ArrowRight /></el-icon>
              <button
                class="crumb"
                :class="{ 'crumb--current': i === trail.length - 1 }"
                type="button"
                @click="goCrumb(i)"
              >{{ n.name }}</button>
            </template>
          </nav>

          <!-- 加载骨架 -->
          <div v-if="loading" class="org-skeleton">
            <DewSkeleton variant="rect" width="180" height="28" />
            <DewSkeleton variant="rect" height="72" />
            <DewSkeleton variant="rect" height="200" />
          </div>

          <!-- 拉取失败 -->
          <DewCard v-else-if="loadFailed" variant="flat" size="lg" class="org-empty">
            组织架构加载失败，请稍后刷新重试。
          </DewCard>

          <!-- 空库：接口通但尚未建组 -->
          <DewCard v-else-if="!tree.length" variant="flat" size="lg" class="org-empty">
            组织架构待发布：组别与干事配置后将在此展示。
          </DewCard>

          <!-- 层级切换：只淡入淡出（玻璃层禁 scale/位移，防合成层闪烁） -->
          <Transition v-else name="org-fade" mode="out-in">
            <!-- 总览层（朝廷）：社长 → 管理层 → 一级组令牌墙（三段鱼贯入场） -->
            <div v-if="!current" key="root" class="org-root">
              <DewCard v-if="!hasOfficers" variant="flat" size="lg" class="org-empty">
                干事任命与成员归属录入后将在此展示完整架构，当前先呈现组别骨架。
              </DewCard>

              <!-- 社长 -->
              <section v-if="org?.president" class="org-hero rise-in">
                <OfficerCard :officer="org.president" hero />
              </section>

              <!-- 管理层（三省） -->
              <section v-if="(org?.management || []).length" class="org-section rise-in rise-d1">
                <div class="section-title-row">
                  <span class="title-accent sm"></span>
                  <h2 class="section-title">管理层</h2>
                </div>
                <div class="management-grid">
                  <OfficerCard v-for="m in org.management" :key="m.id" :officer="m" />
                </div>
              </section>

              <!-- 一级组令牌墙（六部） -->
              <section class="org-section rise-in rise-d2">
                <div class="section-title-row">
                  <span class="title-accent sm"></span>
                  <h2 class="section-title">组别</h2>
                  <span class="section-hint">点击令牌进入组别</span>
                </div>
                <OrgTokenBoard :groups="tree" @select="enterGroup" />
              </section>
            </div>

            <!-- 钻入层：组详情（子组令牌继续钻入） -->
            <OrgGroupDetail v-else :key="viewKey" :node="current" @select="enterGroup" />
          </Transition>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 根容器：极光背景（对齐 ServiceHallView/HomeView 规范），玻璃 DewCard 靠它折射出彩 */
.organization-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-attachment: fixed;
  transition: background 0.4s ease, color 0.3s ease;
}

.theme-light.organization-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
  color: #303133;
}

.theme-dark.organization-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
  color: #E5EAF3;
}

.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
}

.main-content {
  flex: 1;
  padding: 100px 20px 40px; /* top padding for fixed header */
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

.page-footer {
  padding: 0;
  height: auto;
}

/* Footer Theme Adaptation */
:deep(.page-footer) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  min-height: 400px;
  margin: 0;
  box-sizing: border-box;
  color: #ffffff;
  transition: all 0.3s ease;
}

.theme-light :deep(.page-footer) {
  background-color: #252525;
  color: #ffffff;
}

.theme-dark :deep(.page-footer) {
  background-color: #0f0f0f;
  color: #ffffff;
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
  animation: fadeInUp 0.6s ease-out;
}

/* Page Header */
.page-header {
  margin-bottom: 36px;
  text-align: left;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.title-accent {
  display: inline-block;
  width: 4px;
  height: 26px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}

.title-accent.sm {
  height: 18px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--dew-text-heading);
}

.sub-title {
  font-size: 15px;
  margin: 0;
  color: var(--dew-text-muted);
}

/* 面包屑 */
.org-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 24px;
}

.crumb {
  border: none;
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  color: var(--dew-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.crumb:hover {
  background: var(--color-bg-muted, rgba(127, 127, 127, 0.1));
  color: var(--dew-text-heading);
}

.crumb--current {
  color: var(--dew-text-heading);
  font-weight: 600;
  cursor: default;
}

.crumb--current:hover {
  background: transparent;
}

.crumb-sep {
  font-size: 10px;
  color: var(--dew-text-muted);
  opacity: 0.6;
}

/* 整页空态 */
.org-empty {
  color: var(--dew-text-muted);
  text-align: center;
  padding: 48px 24px;
  margin-bottom: 32px;
}

/* 加载骨架 */
.org-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 总览层 */
.org-root {
  display: flex;
  flex-direction: column;
}

/* 社长主卡（御座居中） */
.org-hero {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.org-hero :deep(.dew-card) {
  min-width: 240px;
  max-width: 280px;
}

.org-section {
  margin-bottom: 44px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--dew-text-heading);
}

.section-hint {
  font-size: 12px;
  color: var(--dew-text-muted);
}

/* 管理层五人横排（三省） */
.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* 层级切换过渡：容器只做淡入淡出（位移交给内部鱼贯入场，避免双重运动） */
.org-fade-enter-active {
  transition: opacity 0.28s ease-out;
}

.org-fade-leave-active {
  transition: opacity 0.18s ease-in;
}

.org-fade-enter-from,
.org-fade-leave-to {
  opacity: 0;
}

/* 分区鱼贯入场：社长 → 管理层 → 令牌墙（backwards 填充，结束后不占 transform） */
.rise-in {
  animation: rise-in 0.55s var(--dew-bounce) backwards;
}

.rise-d1 {
  animation-delay: 80ms;
}

.rise-d2 {
  animation-delay: 160ms;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rise-in {
    animation: none;
  }
}

/* Mobile Styles */
.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.hamburger-icon {
  font-size: 24px;
  cursor: pointer;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 80px 16px 20px;
  }

  .page-title {
    font-size: 22px;
  }

  .page-header {
    margin-bottom: 28px;
  }

  .management-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
