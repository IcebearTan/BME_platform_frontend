<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "vuex";
import { Expand } from "@element-plus/icons-vue";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import ArticleEditorV2 from "../components/Article/v2/ArticleEditorV2.vue";

const store = useStore();
const router = useRouter();
const route = useRoute();

// --- 主题管理（根节点挂 theme-dark/light，DewUI 变量才能级联进来） ---
const isDarkMode = computed(() => store.state.isDarkMode);

// --- 编辑模式：路由带 ?id=X 时加载既有文章 ---
const articleId = computed(() => (route.query.id ? Number(route.query.id) : null));

// --- 响应式 Header 逻辑（同 ArticleView 壳） ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) isMobileMenuOpen.value = false;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<template>
  <div class="article-editor-v2-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <el-container class="common-layout">
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端头部 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" alt="Logo" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <!-- 移动端菜单 -->
      <MobileMenuComponent
        v-if="isMobile && isMobileMenuOpen"
        @close="toggleMobileMenu"
        style="z-index: 1001;"
      />

      <el-main style="padding: 0; min-height: 100vh; overflow-x: hidden;">
        <ArticleEditorV2 :article-id="articleId" />
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* --- 整体页面样式：液态玻璃需要的彩色极光底（与社区广场同款，亮/暗各一套） --- */
.article-editor-v2-page {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.article-editor-v2-page {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.article-editor-v2-page {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

/* --- Header 样式（与社区广场同款） --- */
.header-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  height: 60px;
  position: relative;
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
  display: flex;
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
  transition: color 0.3s ease;
}

.theme-light .hamburger-icon {
  color: #606266;
}

.theme-dark .hamburger-icon {
  color: #cbd5e0;
}

.hamburger-icon:hover {
  transform: scale(1.1);
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

.common-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

/* 极光背景由页面容器提供，el-main 透明让极光透出 */
.common-layout :deep(.el-main) {
  background: transparent;
}
</style>

<style>
.el-header {
  padding: 0 !important;
}

.page-footer {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 20px 10px;
  width: 100%;
  min-height: 400px;
  color: #ffffff;
  transition: all 0.3s ease;
}

.theme-light .page-footer {
  background-color: #252525;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
}
</style>
