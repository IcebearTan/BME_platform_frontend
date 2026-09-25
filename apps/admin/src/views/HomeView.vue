<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold, Bell, ArrowDown, Sunny, Moon, School,
} from '@element-plus/icons-vue'
import api from '../api'
import { useMenu } from '../app/navigation/useMenu'
import { GROUP_LABELS } from '../app/navigation/navGroups'
import { campLabels } from '../domains/camps/context/campLabel'

const store = useStore()
const router = useRouter()
const route = useRoute()
const { menuSections } = useMenu()

const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 菜单激活随当前路由派生（原 created() 只算一次的漂移修复）：
// meta.activeMenu 支持对象详情子路由共同激活父菜单（如 /camps/:id/* → 教学周期与营期）
const activeIndex = computed(() => {
  if (route.path === '/' || route.path === '/dashboard') return '/'
  return route.meta?.activeMenu || route.path
})

// 面包屑：工作台 > 业务域 > [营期对象名] > 页面（营期名由工作区壳写入 campLabels）
const breadcrumbItems = computed(() => {
  const items = [{ label: '工作台', to: '/' }]
  if (route.path === '/' || route.path === '/dashboard') return items
  const groupLabel = route.meta?.navGroup ? GROUP_LABELS[route.meta.navGroup] : null
  if (groupLabel) items.push({ label: groupLabel })
  if (route.meta?.campCrumb) {
    items.push({ label: campLabels[route.params.campId] || `营期 #${route.params.campId}` })
  }
  if (route.meta?.title) items.push({ label: route.meta.title })
  return items
})

const isDarkMode = computed(() => store.getters.isDarkMode)

const userInitial = computed(() => {
  const name = store?.state?.user?.name || '管'
  return String(name).charAt(0).toUpperCase()
})

function toggleTheme() {
  store.commit('toggleTheme')
}

// 退出登录：confirm → logout action（连 token 一起清）→ 登录页
function handleUserAction(command) {
  if (command !== 'logout') return
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    store.dispatch('logout')
    router.push('/login')
    ElMessage.success('已退出登录')
  }).catch(() => {})
}

onMounted(async () => {
  try {
    const res = await api({
      url: "/user/user_index",
      method: "get",
    })
    if (res.data.code == 200) {
      store.dispatch('setUser', res.data)
    }
  } catch (error) {
    ElMessage.error('登录失效，请重新登录')
    router.push('/login')
  }
})
</script>

<template>
  <div class="admin-layout aurora-bg">
    <!-- 顶部导航栏 -->
    <div class="top-navbar">
      <div class="navbar-left">
        <el-button
          @click="toggleSidebar"
          :icon="Fold"
          text
          size="large"
          class="sidebar-toggle"
        />
        <div class="breadcrumb-container">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="(item, i) in breadcrumbItems"
              :key="i"
              :to="item.to ? { path: item.to } : undefined"
            >{{ item.label }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>

      <div class="navbar-right">
        <div class="icon-btn theme-toggle" :class="{ 'is-dark': isDarkMode }" @click="toggleTheme" :title="isDarkMode ? '切换到白天模式' : '切换到夜间模式'">
          <el-icon :size="18"><Sunny v-if="!isDarkMode" /><Moon v-else /></el-icon>
        </div>
        <div class="icon-btn notification-btn" @click="router.push('/operations/notifications')" title="通知中心">
          <el-icon :size="18"><Bell /></el-icon>
          <span class="icon-dot"></span>
        </div>

        <el-dropdown @command="handleUserAction">
          <div class="user-profile">
            <div class="user-avatar-letter">{{ userInitial }}</div>
            <span class="username">{{ store.state.user?.name || '管理员' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="sidebar-container" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container" v-show="!sidebarCollapsed">
          <div class="logo-icon"><el-icon><School /></el-icon></div>
          <div class="logo-text">
            <div class="logo-title">训练营</div>
            <div class="logo-subtitle">后台管理系统</div>
          </div>
        </div>
        <div class="logo-mini" v-show="sidebarCollapsed">
          <div class="logo-icon"><el-icon><School /></el-icon></div>
        </div>
      </div>

      <div class="sidebar-menu">
        <el-menu
          :default-active="activeIndex"
          class="modern-menu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
        >
          <template v-for="section in menuSections" :key="section.key">
            <!-- 直达菜单项（工作台 / 单子项域） -->
            <el-menu-item
              v-if="section.type === 'item'"
              :index="section.path"
              class="top-level-item"
              @click="router.push(section.path)"
            >
              <el-icon class="menu-icon"><component :is="section.iconComp" /></el-icon>
              <span class="menu-text">{{ section.label }}</span>
            </el-menu-item>

            <!-- 业务域分组 -->
            <el-sub-menu v-else :index="section.key">
              <template #title>
                <el-icon class="menu-icon"><component :is="section.iconComp" /></el-icon>
                <span class="menu-text">{{ section.label }}</span>
              </template>
              <el-menu-item
                v-for="item in section.items"
                :key="item.path"
                :index="item.path"
                class="submenu-item"
                @click="router.push(item.path)"
              >
                <el-icon v-if="item.iconComp"><component :is="item.iconComp" /></el-icon>
                <span>{{ item.label }}</span>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </div>

      <!-- 底部品牌 -->
      <div class="sidebar-footer">
        <div class="brand-footer" v-show="!sidebarCollapsed">BME 管理系统</div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-container" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style>
/* 全局样式 - 不使用scoped以确保优先级（极光衬底由 global.css 的 .aurora-bg 提供） */
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.admin-layout .top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--dew-card-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--dew-card-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 1000;
  box-shadow: var(--shadow-sm);
}

.admin-layout .navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-layout .sidebar-toggle {
  color: var(--text-secondary) !important;
  transition: var(--transition-fast);
}

.admin-layout .sidebar-toggle:hover {
  color: var(--primary-color) !important;
  background: rgba(var(--primary-color-rgb), 0.1) !important;
}

.admin-layout .breadcrumb-container {
  margin-left: 16px;
}

.admin-layout .navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 顶栏圆形玻璃图标按钮（主题切换 / 通知） */
.admin-layout .icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  color: var(--text-secondary);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-border);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, color 0.3s ease;
}

.admin-layout .icon-btn:hover {
  color: var(--primary-color);
  transform: scale(1.08);
  box-shadow: var(--shadow-md);
}

/* 主题切换：白天金色 / 夜间深灰（仿用户端 MenuComponent） */
.admin-layout .theme-toggle:not(.is-dark) {
  background: linear-gradient(135deg, #f3bf12, #e6b222);
  color: #fff;
  border-color: rgba(243, 156, 18, 0.3);
  box-shadow: 0 3px 12px rgba(243, 156, 18, 0.2);
}

.admin-layout .theme-toggle:not(.is-dark):hover {
  color: #fff;
  transform: scale(1.08) rotate(15deg);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.35);
}

.admin-layout .theme-toggle.is-dark {
  background: linear-gradient(135deg, #2e3338, #313941);
  color: #ffd700;
  border-color: rgba(189, 195, 199, 0.2);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
}

.admin-layout .theme-toggle.is-dark:hover {
  transform: scale(1.08) rotate(-15deg);
  box-shadow: 0 6px 20px rgba(52, 73, 94, 0.4);
}

/* 通知红点 */
.admin-layout .icon-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--error-color);
  border: 2px solid var(--dew-card-bg);
}

/* 用户首字母头像 */
.admin-layout .user-avatar-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.admin-layout .user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.admin-layout .user-profile:hover {
  background: var(--bg-tertiary);
}

.admin-layout .username {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

/* 侧边栏容器 */
.admin-layout .sidebar-container {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: rgba(15, 16, 20, 0.55);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  transition: width var(--transition-normal);
  z-index: 999;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* 防止内容溢出导致滚动 */
}

.admin-layout .sidebar-container.collapsed {
  width: 64px;
}

/* 侧边栏头部 */
.admin-layout .sidebar-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden; /* 防止文字溢出 */
  position: relative;
}

.admin-layout .logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap; /* 防止文字换行 */
  opacity: 1;
  transform: translateX(0);
  transition: opacity 0.15s ease, transform 0.15s ease;
  width: 100%; /* 确保容器占满宽度 */
  min-width: 0; /* 允许收缩但不会被挤压 */
}

/* 折叠状态下隐藏logo文字，避免挤压 */
.admin-layout .sidebar-container.collapsed .logo-container {
  opacity: 0;
  transform: translateX(-100%); /* 完全移出视窗避免挤压 */
  pointer-events: none;
  width: 0; /* 折叠时宽度为0，避免占用空间 */
}

.admin-layout .logo-icon {
  font-size: 32px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* 防止图标被压缩 */
}

.admin-layout .logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许文字缩小但不会被挤压 */
  overflow: hidden;
  flex: 1; /* 占据剩余空间 */
}

.admin-layout .logo-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-layout .logo-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-layout .logo-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s ease 0.1s; /* 延迟显示，避免闪烁 */
}

/* 折叠状态下显示mini logo */
.admin-layout .sidebar-container.collapsed .logo-mini {
  opacity: 1;
}

/* 侧边栏菜单 */
.admin-layout .sidebar-menu {
  flex: 1;
  padding: 16px 8px;
  overflow-y: auto;
  overflow-x: hidden; /* 防止横向滚动 */
  min-width: 0; /* 允许菜单收缩 */
}

.admin-layout .modern-menu {
  background: transparent !important;
  border: none !important;
  width: 100%;
  overflow: hidden; /* 防止菜单项溢出 */
  min-width: 0; /* 允许菜单收缩 */
}

/* 主菜单项和子菜单标题的基础样式 - 增强优先级 */
.admin-layout .modern-menu .el-sub-menu__title,
.admin-layout .modern-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.9) !important;
  background: transparent !important;
  border-radius: var(--radius-md) !important;
  margin: 3px 0 !important;
  transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease !important;
  padding: 0 16px !important;
  height: 48px !important;
  line-height: 48px !important;
  border: none !important;
}

/* 悬停效果 - 柔和玻璃高光（去廉价位移） */
.admin-layout .modern-menu .el-sub-menu__title:hover,
.admin-layout .modern-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* 激活状态 - 淡蓝玻璃底 + 精致左边条（克制，不凸起） */
.admin-layout .modern-menu .el-menu-item.is-active {
  background: rgba(var(--primary-color-rgb), 0.16) !important;
  color: #ffffff !important;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(var(--primary-color-rgb), 0.28);
}

.admin-layout .modern-menu .el-menu-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  background: var(--primary-color);
  border-radius: 0 2px 2px 0;
}

/* 菜单图标样式 */
.admin-layout .menu-icon {
  margin-right: 12px !important;
  font-size: 18px;
  color: inherit !important;
}

.admin-layout .menu-text {
  font-weight: 500;
  color: inherit !important;
  transition: opacity 0.15s ease, transform 0.15s ease, width 0.15s ease; /* 平滑过渡 */
  overflow: hidden; /* 防止文字溢出 */
  text-overflow: ellipsis; /* 超长文字显示省略号 */
  white-space: nowrap; /* 防止文字换行 */
}

/* 子菜单容器 - 柔和凹陷玻璃（去突兀深色块） */
.admin-layout .modern-menu .el-sub-menu .el-menu {
  background: rgba(0, 0, 0, 0.18) !important;
  border-radius: var(--radius-md) !important;
  margin: 4px 0 !important;
  padding: 6px 0 !important;
  border: none !important;
}

/* 子菜单项样式 - 改善对比度 */
.admin-layout .modern-menu .el-sub-menu .el-menu .el-menu-item,
.admin-layout .submenu-item {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.8) !important;
  margin: 2px 8px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 14px !important;
  border-radius: var(--radius-sm) !important;
  padding-left: 48px !important;
  border: none !important;
}

.admin-layout .modern-menu .el-sub-menu .el-menu .el-menu-item:hover,
.admin-layout .submenu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

.admin-layout .modern-menu .el-sub-menu .el-menu .el-menu-item.is-active,
.admin-layout .submenu-item.is-active {
  background: rgba(var(--primary-color-rgb), 0.2) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(var(--primary-color-rgb), 0.32);
}

.admin-layout .submenu-item .el-icon {
  margin-right: 8px !important;
  font-size: 16px;
  color: inherit !important;
}

/* 禁用状态 - 更好的视觉区分 */
.admin-layout .modern-menu .el-sub-menu.is-disabled .el-sub-menu__title,
.admin-layout .modern-menu .el-menu-item.is-disabled {
  color: rgba(255, 255, 255, 0.25) !important;
  cursor: not-allowed;
  opacity: 0.5;
}

.admin-layout .modern-menu .el-sub-menu.is-disabled .el-sub-menu__title:hover,
.admin-layout .modern-menu .el-menu-item.is-disabled:hover {
  background: transparent !important;
  transform: none !important;
  color: rgba(255, 255, 255, 0.25) !important;
}

/* 修复子菜单箭头颜色和动画 */
.admin-layout .modern-menu .el-sub-menu__icon-arrow {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: all var(--transition-fast) !important;
}

.admin-layout .modern-menu .el-sub-menu__title:hover .el-sub-menu__icon-arrow {
  color: #ffffff !important;
}

.admin-layout .modern-menu .el-sub-menu.is-opened .el-sub-menu__icon-arrow {
  color: #ffffff !important;
  transform: rotateZ(180deg);
}

/* 侧边栏底部 */
.admin-layout .sidebar-footer {
  padding: 16px 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden; /* 防止内容溢出 */
  min-width: 0; /* 允许收缩 */
}

.admin-layout .brand-footer {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 0;
  letter-spacing: 0.5px;
}

/* 主内容区域 */
.admin-layout .main-container {
  margin-left: var(--sidebar-width);
  margin-top: 64px;
  transition: margin-left var(--transition-normal);
  min-height: calc(100vh - 64px);
}

.admin-layout .main-container.sidebar-collapsed {
  margin-left: 64px;
}

.admin-layout .content-wrapper {
  padding: 24px;
  min-height: calc(100vh - 64px);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .admin-layout .sidebar-container {
    width: 240px;
  }

  .admin-layout .sidebar-container.collapsed {
    width: 0;
    transform: translateX(-100%);
  }

  .admin-layout .main-container {
    margin-left: 240px;
  }

  .admin-layout .main-container.sidebar-collapsed {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .admin-layout .top-navbar {
    padding: 0 16px;
  }

  .admin-layout .username {
    display: none;
  }

  .admin-layout .breadcrumb-container {
    display: none;
  }

  .admin-layout .content-wrapper {
    padding: 16px;
  }

  .admin-layout .sidebar-container {
    width: 240px;
    transform: translateX(-100%);
  }

  .admin-layout .sidebar-container:not(.collapsed) {
    transform: translateX(0);
  }

  .admin-layout .main-container {
    margin-left: 0;
  }
}

/* 滚动条样式 - 更精致的设计 */
.admin-layout .sidebar-menu::-webkit-scrollbar {
  width: 6px;
}

.admin-layout .sidebar-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.admin-layout .sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  transition: background var(--transition-fast);
}

.admin-layout .sidebar-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

/* 折叠状态下的样式优化 */
.admin-layout .sidebar-container.collapsed .modern-menu .el-sub-menu__title,
.admin-layout .sidebar-container.collapsed .modern-menu .el-menu-item {
  width: 48px;
  padding: 0 !important;
  justify-content: center;
  overflow: hidden;
  margin: 3px 8px !important;
  min-width: 48px; /* 确保最小宽度，防止挤压 */
}

.admin-layout .sidebar-container.collapsed .modern-menu .el-sub-menu__title .menu-icon,
.admin-layout .sidebar-container.collapsed .modern-menu .el-menu-item .menu-icon {
  margin: 0 !important;
  font-size: 20px;
  flex-shrink: 0; /* 防止图标被压缩 */
}

.admin-layout .sidebar-container.collapsed .menu-text,
.admin-layout .sidebar-container.collapsed .el-sub-menu__icon-arrow {
  opacity: 0;
  transform: translateX(-10px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  width: 0; /* 完全隐藏，避免占用空间 */
  overflow: hidden;
}

/* 全局Element Plus菜单样式重置 - 确保样式一致性 */
.admin-layout .sidebar-container .el-menu {
  background-color: transparent !important;
}

.admin-layout .sidebar-container .el-menu-item,
.admin-layout .sidebar-container .el-sub-menu__title {
  background-color: transparent !important;
}

.admin-layout .sidebar-container .el-menu-item *,
.admin-layout .sidebar-container .el-sub-menu__title * {
  color: inherit !important;
}

/* 修复Element Plus默认的focus状态 */
.admin-layout .sidebar-container .el-menu-item:focus,
.admin-layout .sidebar-container .el-sub-menu__title:focus {
  background-color: transparent !important;
  outline: none !important;
}

/* 确保子菜单展开时的平滑动画 */

/* 子菜单展开时有 padding 和 margin，收起时为 0，动画更流畅 */
.admin-layout .modern-menu .el-sub-menu.is-opened .el-menu {
  padding: 8px 0 !important;
  margin: 6px 0 !important;
  overflow: hidden;
  transition: padding 0.2s, margin 0.2s, max-height var(--transition-fast);
}
.admin-layout .modern-menu .el-sub-menu .el-menu {
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
  transition: padding 0.2s, margin 0.2s, max-height var(--transition-fast);
}
</style>
