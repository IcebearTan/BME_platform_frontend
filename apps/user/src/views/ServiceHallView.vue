<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from "../components/MenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import { DewCard, DewTag } from '@bme/dew-ui';
import { Menu as Expand, Printer, Monitor, MagicStick, ArrowRight, OfficeBuilding, EditPen, Select, Files } from '@element-plus/icons-vue';

const store = useStore();
const router = useRouter();

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
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const handleAIServiceClick = () => {
  router.push('/ai-service');
};

const open3DFarm = () => {
  window.open('/3dfarm/', '_blank');
};

// 服务入口数据（图标底色用 inline color+'1a'，对齐 StudyHub 范式）
const deviceServices = [
  { title: '实验室设备', desc: '各类实验器材与设备预约', icon: Monitor, color: '#909399', status: '建设中' },
];

// 学习服务：学习资源已上线（09-20 资源中心，平台资料+课程资料聚合）；
// 题库/考核仍在建设（09-15 从首页 StudyHub 迁入，口径与设备预约一致）
const goResources = () => {
  router.push('/resources');
};

const liveLearningServices = [
  { title: '学习资源', desc: '丰富的学习材料', icon: Files, color: '#909399', action: goResources },
];

const learningServices = [
  { title: '题库', desc: '练习巩固知识点', icon: EditPen, color: '#67C23A', status: '建设中' },
  { title: '考核评估', desc: '检验学习效果', icon: Select, color: '#F56C6C', status: '建设中' },
];

// 未上线板块统一渲染（设备预约 / 更多学习服务），后续再上线板块只需加一项
const pendingSections = [
  { title: '设备预约', services: deviceServices },
  { title: '更多学习服务', services: learningServices },
];

const selfServices = [
  { title: '3D打印农场', desc: '在线预约，一站式 3D 打印服务', icon: Printer, color: '#06b6d4', action: open3DFarm },
  { title: 'AI 大模型服务', desc: '创建 API Key、查看用量与申请额度', icon: MagicStick, color: '#409EFF', action: handleAIServiceClick },
];

// 社团服务：组织架构页（设计方案 docs/社团身份体系-设计方案.md §5.1）
const goOrganization = () => {
  router.push('/organization');
};

const clubServices = [
  { title: '社团组织架构', desc: '组织结构、干事名录与分组一览', icon: OfficeBuilding, color: '#10b981', action: goOrganization },
];

</script>

<template>
  <div :class="['service-hall-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
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
              <h1 class="page-title">服务台</h1>
            </div>
            <p class="sub-title">平台的功能与服务都在这里：可用的即点即达，在建的先睹为快</p>
          </div>

          <div class="service-grid">
            <!-- Section: 学习服务（已上线） -->
            <section class="service-section">
              <div class="section-title-row">
                <span class="title-accent sm"></span>
                <h2 class="section-title">学习服务</h2>
              </div>

              <div class="cards-container">
                <DewCard
                  v-for="(s, i) in liveLearningServices"
                  :key="i"
                  size="md"
                  interactive
                  class="entry-card"
                  @click="s.action && s.action()"
                >
                  <div class="card-row">
                    <div class="icon-box" :style="{ background: s.color + '1a', color: s.color }">
                      <el-icon><component :is="s.icon" /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>{{ s.title }}</h3>
                      <p>{{ s.desc }}</p>
                    </div>
                    <div class="card-action">
                      <el-icon><ArrowRight /></el-icon>
                    </div>
                  </div>
                </DewCard>
              </div>
            </section>

            <!-- Sections: 未上线板块（设备预约 / 更多学习服务），同一套「暂未开放」渲染 -->
            <section v-for="section in pendingSections" :key="section.title" class="service-section">
              <div class="section-title-row">
                <span class="title-accent sm"></span>
                <h2 class="section-title">{{ section.title }}</h2>
                <DewTag type="info" size="sm" round>暂未开放</DewTag>
              </div>

              <div class="cards-container">
                <DewCard
                  v-for="(s, i) in section.services"
                  :key="i"
                  size="md"
                  :no-hover="true"
                  class="entry-card entry-card--disabled"
                >
                  <div class="card-row">
                    <div class="icon-box" :style="{ background: s.color + '1a', color: s.color }">
                      <el-icon><component :is="s.icon" /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>{{ s.title }}</h3>
                      <p>{{ s.desc }}</p>
                    </div>
                    <DewTag type="neutral" size="sm" round>{{ s.status }}</DewTag>
                  </div>
                </DewCard>
              </div>
            </section>

            <!-- Section: 自助服务 -->
            <section class="service-section">
              <div class="section-title-row">
                <span class="title-accent sm"></span>
                <h2 class="section-title">自助服务</h2>
              </div>

              <div class="cards-container">
                <DewCard
                  v-for="(s, i) in selfServices"
                  :key="i"
                  size="md"
                  interactive
                  class="entry-card"
                  @click="s.action && s.action()"
                >
                  <div class="card-row">
                    <div class="icon-box" :style="{ background: s.color + '1a', color: s.color }">
                      <el-icon><component :is="s.icon" /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>{{ s.title }}</h3>
                      <p>{{ s.desc }}</p>
                    </div>
                    <div class="card-action">
                      <el-icon><ArrowRight /></el-icon>
                    </div>
                  </div>
                </DewCard>
              </div>
            </section>

            <!-- Section: 社团服务 -->
            <section class="service-section">
              <div class="section-title-row">
                <span class="title-accent sm"></span>
                <h2 class="section-title">社团服务</h2>
              </div>

              <div class="cards-container">
                <DewCard
                  v-for="(s, i) in clubServices"
                  :key="i"
                  size="md"
                  interactive
                  class="entry-card"
                  @click="s.action && s.action()"
                >
                  <div class="card-row">
                    <div class="icon-box" :style="{ background: s.color + '1a', color: s.color }">
                      <el-icon><component :is="s.icon" /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>{{ s.title }}</h3>
                      <p>{{ s.desc }}</p>
                    </div>
                    <div class="card-action">
                      <el-icon><ArrowRight /></el-icon>
                    </div>
                  </div>
                </DewCard>
              </div>
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
/* 根容器：极光背景（对齐 NotificationView/HomeView 规范），玻璃 DewCard 靠它折射出彩 */
.service-hall-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-attachment: fixed;
  transition: background 0.4s ease, color 0.3s ease;
}

.theme-light.service-hall-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
  color: #303133;
}

.theme-dark.service-hall-container {
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
  margin-bottom: 40px;
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

/* Service Sections */
.service-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.service-section {
  background: transparent;
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

/* Cards Container */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* DewCard 内层横向排版 */
.card-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.text-content {
  flex: 1;
  min-width: 0;
}

.text-content h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--dew-text-heading);
}

.text-content p {
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
  color: var(--dew-text-muted);
}

.card-action {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dew-text-muted);
  flex-shrink: 0;
  transition: transform 0.3s var(--dew-bounce, ease);
}

.entry-card--disabled {
  opacity: 0.65;
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

  .icon-box {
    width: 42px;
    height: 42px;
    font-size: 20px;
  }
}
</style>
