<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import UserCenterComponent from "../components/User/UserCenterComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import api from '../api';
import { ElMessage } from 'element-plus';
import { Menu as IconMenu, Rank, Fold, Expand } from '@element-plus/icons-vue';

const router = useRouter();
const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

// --- 响应式 Header 逻辑 ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
    isMobile.value = window.innerWidth <= 768;
    if (!isMobile.value) {
        isMobileMenuOpen.value = false;
    }
};

const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
};
// --- 响应式 Header 逻辑结束 ---

// --- UserCenter 原有的逻辑 ---
const username = ref('');

onMounted(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    api({
        url: "/user/user_index",
        method: "get",
    })
    .then((res) => {
        if (res.data.code == 200) {
            username.value = res.data.User_Name;
        }
    })
    .catch((error) => {
        if (error.response && error.response.status === 401) {
            router.push('/login');
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize);
});

</script>

<template>
    <div :class="['user-center', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
        <el-container>
            <el-header class="header-container">
                <!-- 桌面菜单 -->
                <div v-if="!isMobile" class="desktop-menu-container">
                    <MenuComponent />
                </div>
                <!-- 移动端头部 -->
                <div v-else class="mobile-header">
                    <div class="mobile-logo">
                        <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')"
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
                <UserCenterComponent />
            </el-main>
            <el-footer class="page-footer">
                <PageFooterComponent />
            </el-footer>
        </el-container>
    </div>
</template>


<style scoped>
/* 根容器：亮/暗双极光底（对齐全站规范） */
.user-center {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.user-center {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.user-center {
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
</style>
