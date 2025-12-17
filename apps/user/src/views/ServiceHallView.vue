<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from "../components/MenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import { Menu as Expand, Printer, Calendar, Monitor, ArrowRight, Service } from '@element-plus/icons-vue';

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

const handle3DPrintClick = () => {
  // Placeholder for 3D printing service
  console.log("3D Printing service clicked");
};

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
            <h1 class="main-title">服务大厅</h1>
            <p class="sub-title">便捷的校园服务一站式平台</p>
          </div>
          
          <div class="service-grid">
            <!-- Section: Device Reservation -->
            <div class="service-section">
              <div class="section-header">
                <div class="section-icon-wrapper blue">
                  <el-icon><Calendar /></el-icon>
                </div>
                <h2 class="section-title">设备预约</h2>
                <el-tag type="info" effect="plain" round size="small" class="status-tag">暂未开放</el-tag>
              </div>
              
              <div class="cards-container">
                <div class="service-card disabled">
                  <div class="card-content">
                    <div class="icon-box gray">
                      <el-icon><Monitor /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>实验室设备</h3>
                      <p>各类实验器材与设备预约</p>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span>建设中...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section: Self Service -->
            <div class="service-section">
              <div class="section-header">
                <div class="section-icon-wrapper green">
                  <el-icon><Service /></el-icon>
                </div>
                <h2 class="section-title">自助服务</h2>
              </div>
              
              <div class="cards-container">
                <div class="service-card hover-effect" @click="handle3DPrintClick">
                  <div class="card-content">
                    <div class="icon-box primary">
                      <el-icon><Printer /></el-icon>
                    </div>
                    <div class="text-content">
                      <h3>3D打印服务</h3>
                      <p>模型上传、打印预约与进度查询</p>
                    </div>
                  </div>
                  <div class="card-action">
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>
            </div>
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
.service-hall-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s ease, color 0.3s ease;
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
  padding: 100px 20px 40px; /* Increased top padding for fixed header */
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

.main-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.sub-title {
  font-size: 16px;
  margin: 0;
  opacity: 0.8;
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

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.section-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.section-icon-wrapper.blue {
  background-color: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.section-icon-wrapper.green {
  background-color: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.section-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.status-tag {
  margin-left: auto;
}

/* Cards Container */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* Service Card */
.service-card {
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.service-card.hover-effect {
  cursor: pointer;
}

.service-card.hover-effect:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-box {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.icon-box.primary {
  background: linear-gradient(135deg, #409EFF 0%, #3a8ee6 100%);
  color: white;
  box-shadow: 0 8px 16px rgba(64, 158, 255, 0.2);
}

.icon-box.gray {
  background-color: #909399;
  color: white;
}

.text-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.text-content p {
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.card-action {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.service-card:hover .card-action {
  background-color: rgba(0, 0, 0, 0.05);
  transform: translateX(5px);
}

/* Disabled State */
.service-card.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0, 0, 0, 0.02) 10px,
    rgba(0, 0, 0, 0.02) 20px
  );
}

.card-footer {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Theme: Light */
.theme-light {
  background-color: #f5f7fa;
  color: #303133;
}

.theme-light .service-card {
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  border-color: #ebeef5;
}

.theme-light .text-content p {
  color: #909399;
}

.theme-light .card-action {
  color: #909399;
}

/* Theme: Dark */
.theme-dark {
  background-color: #121212;
  color: #E5EAF3;
}

.theme-dark .service-card {
  background-color: #1E1E1E;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border-color: #363637;
}

.theme-dark .text-content p {
  color: #A3A6AD;
}

.theme-dark .card-action {
  color: #A3A6AD;
}

.theme-dark .service-card:hover .card-action {
  background-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .card-footer {
  background-color: rgba(255, 255, 255, 0.1);
  color: #909399;
}

.theme-dark .service-card.disabled {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.02) 10px,
    rgba(255, 255, 255, 0.02) 20px
  );
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
    padding: 20px 16px;
  }
  
  .main-title {
    font-size: 24px;
  }
  
  .service-card {
    padding: 20px;
  }
  
  .icon-box {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }
}
</style>
