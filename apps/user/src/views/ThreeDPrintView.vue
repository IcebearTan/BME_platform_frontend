<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from "../components/MenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import QueueStatus from "../components/Service/ThreeDPrint/QueueStatus.vue";
import PrintForm from "../components/Service/ThreeDPrint/PrintForm.vue";
import PrinterList from "../components/Service/ThreeDPrint/PrinterList.vue";
import OrderHistory from "../components/Service/ThreeDPrint/OrderHistory.vue";
import { Menu as Expand, ArrowLeft } from '@element-plus/icons-vue';

const store = useStore();
const router = useRouter();

const isDarkMode = computed(() => store.getters.isDarkMode);

const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);
const currentView = ref('dashboard'); // 'dashboard' or 'booking'
const selectedPrinter = ref(null);

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

const goBack = () => {
  if (currentView.value === 'booking') {
    currentView.value = 'dashboard';
    selectedPrinter.value = null;
  } else {
    router.push('/service-hall');
  }
};

const handlePrinterSelect = (printer) => {
  selectedPrinter.value = printer;
  currentView.value = 'booking';
};
</script>

<template>
  <div :class="['print-view-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
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
          <!-- Breadcrumb / Back Navigation -->
          <div class="nav-header">
            <el-button link @click="goBack" class="back-btn">
              <el-icon><ArrowLeft /></el-icon> {{ currentView === 'booking' ? '返回设备列表' : '返回服务大厅' }}
            </el-button>
          </div>

          <div class="page-header">
            <h1 class="main-title">3D打印服务</h1>
            <p class="sub-title">上传模型，预约打印，轻松实现创意</p>
          </div>
          
          <!-- Dashboard View -->
          <div v-if="currentView === 'dashboard'" class="dashboard-view">
            <PrinterList @select-printer="handlePrinterSelect" />
            <OrderHistory />
          </div>

          <!-- Booking View -->
          <div v-else class="layout-grid">
            <!-- Left Column: Form -->
            <div class="left-column">
              <PrintForm :printerName="selectedPrinter?.name" />
            </div>

            <!-- Right Column: Status & Info -->
            <div class="right-column">
              <QueueStatus :queueLength="5" estimatedWaitTime="约 24 小时" />
              
              <!-- Guidelines Card -->
              <el-card class="guidelines-card" shadow="hover">
                <template #header>
                  <div class="card-header">
                    <span>打印须知</span>
                  </div>
                </template>
                <div class="guidelines-content">
                  <p>1. 请确保模型壁厚大于 1mm，以免打印失败。</p>
                  <p>2. 复杂模型请自行添加支撑结构。</p>
                  <p>3. 打印完成后请在 3 天内取走模型。</p>
                  <p>4. 如有疑问请联系实验室管理员。</p>
                </div>
              </el-card>
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
.print-view-container {
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
  padding: 100px 20px 40px;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
  animation: fadeInUp 0.6s ease-out;
}

.nav-header {
  margin-bottom: 20px;
}

.back-btn {
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.page-header {
  margin-bottom: 30px;
}

.main-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.sub-title {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.layout-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.guidelines-card {
  border-radius: 12px;
}

.guidelines-content p {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

/* Theme Adaptation */
.theme-light {
  background-color: #f5f7fa;
  color: #303133;
}

.theme-dark {
  background-color: #121212;
  color: #E5EAF3;
}

.theme-dark .back-btn {
  color: #E5EAF3;
}

.theme-dark .back-btn:hover {
  color: #409EFF;
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

@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
  
  .right-column {
    order: -1; /* Show status on top on mobile */
  }
}
</style>
