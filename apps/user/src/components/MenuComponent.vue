<script>
import { useStore } from 'vuex'
import { Sunny, Moon } from '@element-plus/icons-vue'
import NotificationBell from './Notification/NotificationBell.vue'

export default {
    components: {
        NotificationBell
    },

    computed: {
        // 根据当前路由高亮对应一级菜单；
        // 服务类子页面（服务大厅 / AI 大模型服务 / 3D 打印）统一高亮「服务大厅」
        activeIndex() {
            const path = this.$route.path
            if (path === '/service-hall' || path.startsWith('/ai-service') || path.startsWith('/service/')) {
                return '/service-hall'
            }
            // 课程相关高亮「课程」：课程列表 / 详情 / 章节页
            if (path.startsWith('/study') || path.startsWith('/course')) {
                return '/study'
            }
            // 学习中心
            if (path.startsWith('/home')) {
                return '/home'
            }
            return path
        },
        // 角色标签（超管/老师/导生/学生）
        roleLabel() {
            const map = { super_admin: '超管', teacher: '老师', mentor: '导生', student: '学生' }
            return map[this.$store.getters.role] || '同学'
        },
        roleIsStaff() {
            return ['super_admin', 'teacher', 'mentor'].includes(this.$store.getters.role)
        }
    },

    methods: {
        handleSelect(key, keyPath) {
            // console.log(key, keyPath);
        }
    },

};
</script>

<script setup>
import { onMounted, ref, nextTick, onBeforeMount, computed } from 'vue'
import { ClickOutside as vClickOutside } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'
import NotificationBell from './Notification/NotificationBell.vue'
import DewPopover from './ui/DewPopover.vue'

const buttonRef = ref()
const popoverRef = ref()
const store = useStore()
const router = useRouter()
const route = useRoute()

const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

// 登录态：直接读取本地 token（与 api 拦截器 / 路由守卫一致的真相源），同步判定，无闪烁
const isLogin = !!localStorage.getItem('token')
// 鉴权类页面（登录 / 注册 / 找回密码）隐藏头像与登录注册入口，由路由 meta 驱动
const isAuthRoute = computed(() => !!route.meta.authPage)
// 头像：优先取持久化的 store 头像，同步渲染无闪烁
const User_Avatar = computed(() => store.state.avatar || DEFAULT_AVATAR)

// 后台静默刷新头像（写入 store，由 User_Avatar 计算属性自动同步）；失败交给全局 401 拦截器
const refreshAvatar = () => {
  api({ url: '/user/user_avatars', method: 'get' })
    .then((res) => {
      if (res.data.code === 200 && res.data.User_Avatar) {
        store.commit('setAvatar', `data:image/png;base64,${res.data.User_Avatar}`)
      } else {
        store.commit('setAvatar', DEFAULT_AVATAR)
      }
    })
    .catch(() => { /* 头像刷新失败静默；401 由全局拦截器处理 */ })
}

const isExpanded = ref(false)

const isSearchInputExpand = () => {
    if (!isExpanded.value) {
        isExpanded.value = true
        searchInputClass.value ='search-input-expanded'
    } else {
        if (!searchInput.value) {
            isExpanded.value = false
            searchInputClass.value = 'search-input'
        }
    }
}

const searchInputClass = ref('search-input')
const searchInput = ref(null)

// 主题状态管理
const isDarkMode = computed(() => store.getters.isDarkMode)

// 检查当前时间来决定主题（初始化时使用）
const checkTimeTheme = () => {
  const now = new Date()
  const hour = now.getHours()
  
  // 6点到18点为白天模式，其他时间为黑夜模式
  const isDay = hour >= 6 && hour < 18
  const shouldBeDark = !isDay
  
  // 只在首次访问时自动设置主题
  if (!localStorage.getItem('themeInitialized')) {
    store.commit('setTheme', shouldBeDark)
    localStorage.setItem('themeInitialized', 'true')
  }
}

// 手动切换主题
const toggleTheme = () => {
  store.commit('toggleTheme')
  console.log(`🎨 主题切换: ${isDarkMode.value ? '🌙 夜间模式' : '☀️ 白天模式'}`)
}

onMounted(() => {
    // 初始化主题
    checkTimeTheme()
    
    // 已登录则后台静默刷新头像（不阻塞渲染，避免闪烁）
    if (isLogin) refreshAvatar()
    

})

const onClickOutside = () => {
  unref(popoverRef).popperRef?.delayHide?.()
}

const logOut = () => {
    store.dispatch('logout')
    localStorage.removeItem('token')
    window.location.reload()
}

const goUserCenter = () => router.push('/user')

const handleUserInfo = () => {
    if (router.currentRoute.value.path != '/user-center/user-info') {
        setTimeout(() => {
            window.location.reload()
        }, 200)
        router.push('/user-center/user-info')
    }else {
        window.location.reload()
    }
}
</script>

<template>
    <el-menu 
        :default-active="activeIndex" 
        :class="['el-menu-demo', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" 
        mode="horizontal" 
        :ellipsis="false"
        @select="handleSelect" 
        router
    >
        <div class="menu-content-wrapper">
            <!-- 左侧导航区域 -->
            <div class="menu-left-section">
                <el-menu-item index="/" class="home-menu-item" style="margin: 0;">
                    <img style="width: 50px" src="../assets/New_Logo1.png" />
                    <span class="ameii-text">AMEII</span>
                </el-menu-item>
                <el-menu-item index="/home" class="study-center-item">
                    学习中心
                </el-menu-item>
                <el-menu-item index="/study">
                    课程
                </el-menu-item>
                <el-menu-item index="/community">
                    社区广场
                </el-menu-item>
                <el-menu-item index="/service-hall">
                    服务大厅
                </el-menu-item>
                <el-menu-item index="/order" disabled>
                    资源库
                </el-menu-item>
            </div>
            
            <!-- 右侧功能区域 -->
            <div class="menu-right-section">
                <el-input
                     v-model="searchInput"
                    placeholder="搜索"
                    suffix-icon="Search"
                    @focus="isSearchInputExpand()"
                    @blur="isSearchInputExpand()"
                    :class="searchInputClass"
                />

        <!-- 通知铃铛（仅登录后显示） -->
        <el-menu-item v-if="isLogin && !isAuthRoute" class="custom-menu-item notification-menu-item" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
            <NotificationBell />
        </el-menu-item>

        <!-- 主题切换按钮 -->
        <el-menu-item class="custom-menu-item theme-menu-item" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
            <div 
              class="theme-toggle-wrapper"
              @click="toggleTheme"
              :title="isDarkMode ? '切换到白天模式' : '切换到夜间模式'"
            >
              <div class="theme-toggle-button" :class="{ 'theme-dark': isDarkMode }">
                <el-icon class="theme-icon">
                  <Sunny v-if="!isDarkMode" />
                  <Moon v-else />
                </el-icon>
              </div>
            </div>
        </el-menu-item>

        <el-menu-item v-if="isLogin && !isAuthRoute" class="custom-menu-item theme-menu-item" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
            <div class="user-avatar" style="cursor: pointer;">
                <DewPopover trigger="click" placement="bottom" :width="260" :offset="6" :show-arrow="true">
                    <template #trigger>
                        <el-avatar :src="User_Avatar" alt="头像" />
                    </template>
                    <div class="avatar-pop">
                        <div class="avatar-pop__head" @click="goUserCenter">
                            <el-avatar :src="User_Avatar" alt="头像" :size="44" />
                            <div class="avatar-pop__info">
                                <div class="avatar-pop__name">{{ $store.state.user?.User_Name }}</div>
                                <div
                                    class="avatar-pop__role"
                                    :class="roleIsStaff ? 'avatar-pop__role--admin' : 'avatar-pop__role--student'"
                                >
                                    {{ roleLabel }}
                                </div>
                            </div>
                        </div>
                        <div class="avatar-pop__actions">
                            <div class="avatar-pop__action" @click="handleUserInfo">
                                <el-icon><Setting /></el-icon>
                                <span>账户设置</span>
                            </div>
                            <div class="avatar-pop__action avatar-pop__action--danger" @click="logOut">
                                <el-icon><SwitchButton /></el-icon>
                                <span>退出登录</span>
                            </div>
                        </div>
                    </div>
                </DewPopover>
                
            </div>
        </el-menu-item>
        
        <el-menu-item v-else-if="!isAuthRoute" class="custom-menu-item auth-menu-item">
            <a @click="$router.push('/login')" class="custom-link">登录</a>
            <span class="auth-separator">或</span>
            <a @click="$router.push('/register')" class="custom-link">注册</a>
        </el-menu-item>
            </div> <!-- 关闭 menu-right-section -->
        </div> <!-- 关闭 menu-content-wrapper -->
    </el-menu>
</template>


<style scoped>

.el-menu-demo{
    width: 100% !important;
    border: none !important;
    transition: all 0.3s ease;
    display: flex !important;
    justify-content: center !important;
    padding: 0 20px;
    box-sizing: border-box;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 1000 !important;
    backdrop-filter: blur(10px);
}

.menu-content-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
}

.menu-left-section {
    display: flex;
    align-items: center;
    gap: 0;
}

.menu-right-section {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 响应式调整 */
@media (max-width: 1400px) {
    .menu-content-wrapper {
        max-width: 1000px;
    }
}

@media (max-width: 1200px) {
    .menu-content-wrapper {
        max-width: 900px;
        padding: 0 15px;
    }
    
    .menu-right-section {
        gap: 8px;
    }
}

@media (max-width: 1024px) {
    .menu-content-wrapper {
        max-width: 100%;
        padding: 0 10px;
    }
    
    .menu-right-section {
        gap: 6px;
    }
}

.el-menu-demo.theme-light {
    background-color: rgba(255, 255, 255, 0.85);
    color: #333333;
}

.el-menu-demo.theme-dark {
    background-color: rgba(0, 0, 0, 0.85);
    color: #ecf0f1;
}

/* 确保菜单项在新布局中正确显示 */
.el-menu-demo :deep(.el-menu-item) {
    height: 60px;
    line-height: 60px;
}

.el-menu-demo :deep(.menu-content-wrapper) {
    width: 100%;
}
/* 菜单项主题适配 - 优化版 */
.el-menu-demo.theme-light :deep(.el-menu-item) {
    color: #555555;
    border-bottom: 2px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    position: relative;
}

.el-menu-demo.theme-dark :deep(.el-menu-item) {
    color: #bdc3c7;
    border-bottom: 2px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    position: relative;
}

.el-menu-demo.theme-light :deep(.el-menu-item:hover) {
    background-color: transparent;
    color: #3498db;
    transform: translateY(-1px);
}

.el-menu-demo.theme-dark :deep(.el-menu-item:hover) {
    background-color: transparent;
    color: #5dade2;
    transform: translateY(-1px);
}

.el-menu-demo.theme-light :deep(.el-menu-item.is-active) {
    background: transparent;
    color: #2980b9;
    border-bottom: none;
    font-weight: 700;
    font-size: 16px;
    position: relative;
}

.el-menu-demo.theme-light :deep(.el-menu-item.is-active::after) {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background-color: #3498db;
    border-radius: 2px;
    animation: slideInBottom 0.3s ease-out;
    box-shadow: 0 1px 3px rgba(52, 152, 219, 0.4);
}

.el-menu-demo.theme-dark :deep(.el-menu-item.is-active) {
    background: transparent;
    color: #ffffff;
    border-bottom: none;
    font-weight: 700;
    font-size: 16px;
    position: relative;
}

.el-menu-demo.theme-dark :deep(.el-menu-item.is-active::after) {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background-color: #f39c12;
    border-radius: 2px;
    animation: slideInBottom 0.3s ease-out;
    box-shadow: 0 1px 3px rgba(243, 156, 18, 0.4);
}

@keyframes slideInBottom {
    from {
        width: 0;
        opacity: 0;
    }
    to {
        width: 30px;
        opacity: 1;
    }
}

.el-menu-demo.theme-light :deep(.el-menu-item.is-disabled) {
    color: #bdc3c7;
    opacity: 0.6;
}

.el-menu-demo.theme-dark :deep(.el-menu-item.is-disabled) {
    color: #95a5a6;
    opacity: 0.8;
}

/* 移除原有的自动margin，使用新的flex布局 */
.menu-left-section .el-menu-item {
    margin-right: 0;
}

.menu-right-section .el-menu-item {
    margin-left: 0;
}

/* 确保菜单项在新布局中正常显示 */
.menu-content-wrapper .el-menu-item {
    position: relative;
    display: flex;
    align-items: center;
}

/* 首页菜单项特殊样式 */
.home-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ameii-text {
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center;
}

.theme-light .ameii-text {
    background: linear-gradient(135deg, #f39c12, #e67e22);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 1px 3px rgba(243, 156, 18, 0.3);
}

.theme-dark .ameii-text {
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 1px 5px rgba(241, 196, 15, 0.4);
}

/* 首页项在激活状态下不显示特殊样式 */
.el-menu-demo :deep(.home-menu-item.is-active) {
    background: transparent !important;
    border-bottom: none !important;
    font-weight: normal !important;
    font-size: inherit !important;
}

.el-menu-demo :deep(.home-menu-item.is-active::after) {
    display: none !important;
}

/* 首页项悬停时只改变cursor，AMEII发光 */
.el-menu-demo :deep(.home-menu-item:hover) {
    background-color: transparent !important;
    color: inherit !important;
    transform: none !important;
    cursor: pointer;
}

.home-menu-item:hover .ameii-text {
    filter: drop-shadow(0 0 8px rgba(243, 156, 18, 0.8)) drop-shadow(0 0 16px rgba(243, 156, 18, 0.4));
    transform: scale(1.08);
    animation: glow-pulse 2s ease-in-out infinite alternate;
}

.theme-dark .home-menu-item:hover .ameii-text {
    filter: drop-shadow(0 0 12px rgba(241, 196, 15, 0.9)) drop-shadow(0 0 24px rgba(241, 196, 15, 0.5));
    transform: scale(1.08);
    animation: glow-pulse-dark 2s ease-in-out infinite alternate;
}

@keyframes glow-pulse {
    from {
        filter: drop-shadow(0 0 8px rgba(243, 156, 18, 0.8)) drop-shadow(0 0 16px rgba(243, 156, 18, 0.4));
    }
    to {
        filter: drop-shadow(0 0 12px rgba(243, 156, 18, 1)) drop-shadow(0 0 24px rgba(243, 156, 18, 0.6));
    }
}

@keyframes glow-pulse-dark {
    from {
        filter: drop-shadow(0 0 12px rgba(241, 196, 15, 0.9)) drop-shadow(0 0 24px rgba(241, 196, 15, 0.5));
    }
    to {
        filter: drop-shadow(0 0 16px rgba(241, 196, 15, 1)) drop-shadow(0 0 32px rgba(241, 196, 15, 0.7));
    }
}

.user-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
/* 移除固定样式，使用主题适配 */
.custom-menu-item {
  cursor: auto !important;
  background-color: transparent !important;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.theme-light .custom-menu-item {
  color: #777 !important;
}

.theme-dark .custom-menu-item {
  color: #bdc3c7 !important;
}

.notification-menu-item {
  padding: 0 !important;
}

.theme-menu-item {
  padding: 0 10px !important;
}

.theme-toggle-wrapper {
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-wrapper:hover {
  background-color: transparent;
}

/* 最高优先级覆盖 - 确保主题按钮不被任何悬停效果影响 */
/* 白天模式 - 菜单项悬停时按钮保持原色 */
.el-menu-demo.theme-light :deep(.el-menu-item:hover .theme-toggle-button:not(.theme-dark)) {
  background: linear-gradient(135deg, #f3bf12, #e6b222) !important;
}

/* 夜间模式 - 菜单项悬停时按钮保持原色 */
.el-menu-demo.theme-dark :deep(.el-menu-item:hover .theme-toggle-button.theme-dark) {
  background: linear-gradient(135deg, #2e3338, #313941) !important;
}

/* 当按钮本身悬停时的效果 */
/* 白天模式 - 按钮悬停效果 */
.el-menu-demo.theme-light :deep(.el-menu-item .theme-toggle-button:not(.theme-dark):hover) {
  background: linear-gradient(135deg, #f3bf12, #e6b222) !important;
}

/* 夜间模式 - 按钮悬停效果 */
.el-menu-demo.theme-dark :deep(.el-menu-item .theme-toggle-button.theme-dark:hover) {
  background: linear-gradient(135deg, #2e3338, #313941) !important;
}

.theme-toggle-button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  background: linear-gradient(135deg, #f3bf12, #e6b222);
  border: 1px solid rgba(243, 156, 18, 0.3);
  box-shadow: 0 3px 12px rgba(243, 156, 18, 0.2);
}

.theme-toggle-button.theme-dark {
  background: linear-gradient(135deg, #2e3338, #313941);
  border: 1px solid rgba(189, 195, 199, 0.2);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
}

.theme-light .theme-toggle-button:hover {
  transform: scale(1.08) rotate(15deg);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.35);
  background: linear-gradient(135deg, #f3bf12, #e6b222) !important;
}

.theme-toggle-button.theme-dark:hover {
  transform: scale(1.08) rotate(-15deg);
  box-shadow: 0 6px 20px rgba(52, 73, 94, 0.4);
  background: linear-gradient(135deg, #2e3338, #313941) !important;
}

.theme-toggle-button .theme-icon {
  transition: color 0.3s ease, transform 0.3s ease;
  color: #fff;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}

.theme-toggle-button .theme-icon :deep(.el-icon) {
  font-size: 16px !important;
  width: 16px !important;
  height: 16px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}

.theme-toggle-button .theme-icon :deep(svg) {
  width: 16px !important;
  height: 16px !important;
  margin: 0 auto !important;
}

.theme-toggle-button.theme-dark .theme-icon {
  color: #ffd700;
}

.notification-wrapper {
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.theme-light .notification-wrapper:hover {
  background-color: transparent;
}

.theme-dark .notification-wrapper:hover {
  background-color: transparent;
}

/* 用户头像菜单项悬停效果 - 移除白天模式背景 */
.el-menu-demo.theme-light :deep(.theme-menu-item:hover) {
  background-color: transparent !important;
}

/* 更精确地定位头像容器的悬停效果 */
.theme-light .user-avatar:hover {
  background-color: transparent !important;
}

.el-menu-demo.theme-light :deep(.el-menu-item):has(.user-avatar):hover {
  background-color: transparent !important;
}

/* Element Plus 头像组件悬停效果覆盖 */
.theme-light :deep(.el-avatar):hover {
  background-color: transparent !important;
}

/* 强制覆盖所有可能的头像悬停背景 - 白天模式 */
.el-menu-demo.theme-light :deep(.el-menu-item.theme-menu-item):hover,
.el-menu-demo.theme-light :deep(.el-menu-item.theme-menu-item):hover *,
.theme-light .el-menu-item.theme-menu-item:hover,
.theme-light .el-menu-item.theme-menu-item:hover * {
  background-color: transparent !important;
  background: transparent !important;
}

/* 强制覆盖所有可能的头像悬停背景 - 夜间模式 */
.el-menu-demo.theme-dark :deep(.el-menu-item.theme-menu-item):hover,
.el-menu-demo.theme-dark :deep(.el-menu-item.theme-menu-item):hover *,
.theme-dark .el-menu-item.theme-menu-item:hover,
.theme-dark .el-menu-item.theme-menu-item:hover * {
  background-color: transparent !important;
  background: transparent !important;
}

/* 学习中心菜单项特殊样式 - 文字渐变和放大 */
.el-menu-demo :deep(.study-center-item) {
  font-size: 16px !important;
  font-weight: 700 !important;
  position: relative;
}

/* 白天模式学习中心文字渐变 */
.el-menu-demo.theme-light :deep(.study-center-item) {
  background: linear-gradient(135deg, #3498db 0%, #9b59b6 50%, #e74c3c 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
}

/* 深色模式学习中心文字渐变 */
.el-menu-demo.theme-dark :deep(.study-center-item) {
  background: linear-gradient(135deg, #5dade2 0%, #bb8fce 50%, #f1948a 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
}

/* 学习中心悬停效果 - 文字放大和渐变变化 */
.el-menu-demo.theme-light :deep(.study-center-item:hover) {
  background-color: transparent !important;
  background: linear-gradient(135deg, #2980b9 0%, #8e44ad 50%, #c0392b 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  transform: scale(1.1) !important;
  transition: all 0.3s ease !important;
}

.el-menu-demo.theme-dark :deep(.study-center-item:hover) {
  background-color: transparent !important;
  background: linear-gradient(135deg, #85c1e9 0%, #d2b4de 50%, #fadbd8 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  transform: scale(1.1) !important;
  transition: all 0.3s ease !important;
}

/* 学习中心激活状态 */
.el-menu-demo.theme-light :deep(.study-center-item.is-active) {
  background: linear-gradient(135deg, #1f4e79 0%, #6c3483 50%, #922b21 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  transform: scale(1.05) !important;
}

.el-menu-demo.theme-dark :deep(.study-center-item.is-active) {
  background: linear-gradient(135deg, #a9cce3 0%, #e8daef 50%, #f9ebea 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  transform: scale(1.05) !important;
}

/* 自定义菜单项主题适配 - 移除背景色，跟随导航栏背景 */
.theme-light .custom-menu-item {
  background-color: transparent;
}

.theme-dark .custom-menu-item {
  background-color: transparent;
}

.theme-light .custom-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.theme-dark .custom-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.2);
}

/* 登录/注册菜单项特殊处理 - 取消整个菜单项的悬停效果 */
.auth-menu-item:hover {
  background-color: transparent !important;
}

.auth-separator {
  margin-left: 10px; 
  margin-right: 10px;
  transition: none;
}

/* 主题切换按钮区域适配 */
.theme-menu-item {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.theme-light .theme-menu-item {
  background-color: transparent;
}

.theme-dark .theme-menu-item {
  background-color: transparent;
}

.theme-light .theme-menu-item:hover {
  background-color: transparent !important;
}

.theme-dark .theme-menu-item:hover {
  background-color: transparent !important;
}

/* 主题切换按钮包装器适配 */
.theme-toggle-wrapper {
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.theme-light .theme-toggle-wrapper:hover {
  background-color: transparent;
}

.theme-dark .theme-toggle-wrapper:hover {
  background-color: transparent;
}

/* 消息提示区域适配 */
.notification-menu-item {
  transition: all 0.3s ease;
}

.theme-light .notification-menu-item {
  background-color: transparent;
}

.theme-dark .notification-menu-item {
  background-color: transparent;
}

.theme-light .notification-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.theme-dark .notification-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.2);
}

/* 用户头像区域适配 */
.user-avatar {
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.theme-light .user-avatar:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.theme-dark .user-avatar:hover {
  background-color: rgba(64, 158, 255, 0.2);
}

.custom-link{
    text-decoration: none;
    transition: all 0.3s ease;
    padding: 2px 4px;
    border-radius: 4px;
    display: inline-block;
}

/* 主题适配 */
.theme-light .custom-link {
    color: #333333;
}

.theme-dark .custom-link {
    color: #ffffff;
}

.theme-light .custom-link:hover {
    color: #409eff !important;
    text-shadow: 0 0 3px rgba(64, 158, 255, 0.3);
    /* background-color: rgba(64, 158, 255, 0.05); */
    transform: translateY(-1px);
}

.theme-dark .custom-link:hover {
    color: #409eff !important;
    text-shadow: 0 0 3px rgba(64, 158, 255, 0.5);
    /* background-color: rgba(64, 158, 255, 0.1); */
    transform: translateY(-1px);
}
/* 搜索框主题适配 */
.theme-light :deep(.search-input .el-input__wrapper) {
    border-radius: 20px;
    width: 100px;
    transition: all 0.2s ease-in-out;
    background-color: #ffffff;
    border-color: #dcdfe6;
    color: #333333;
}

.theme-dark :deep(.search-input .el-input__wrapper) {
    border-radius: 20px;
    width: 100px;
    transition: all 0.2s ease-in-out;
    background-color: #565758;
    border-color: #9b9b9b;
    color: #ecf0f1;
    box-shadow: 0 0 0 1px #606366 inset;
}

.theme-light :deep(.search-input-expanded .el-input__wrapper) {
    border-radius: 20px;
    width: 200px;
    transition: all 0.2s ease-in-out;
    background-color: #ffffff;
    border-color: #3498db;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);
}

.theme-dark :deep(.search-input-expanded .el-input__wrapper) {
    border-radius: 20px;
    width: 200px;
    transition: all 0.2s ease-in-out;
    background-color: #838383;
    border-color: #ffffff;
    box-shadow: 0 0 0 1px #ffffff inset, 0 2px 8px rgba(93, 173, 226, 0.2);
}

.theme-dark :deep(.el-input__inner) {
    color: #ecf0f1;
    background-color: transparent;
}

.theme-dark :deep(.el-input__inner::placeholder) {
    color: #cccccc;
}

/* ── 头像弹窗（DewPopover 内容，浮层本体由 DewPopover 提供） ── */
.avatar-pop {
  padding: 8px;
  font-family: var(--dew-font, inherit);
  color: var(--dew-popover-text, var(--dew-text));
}
.avatar-pop__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease;
}
.avatar-pop__head:hover { background: var(--dew-ghost-hover-bg); }
.avatar-pop__info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.avatar-pop__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--dew-text-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar-pop__role {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: var(--radius-full);
}
.avatar-pop__role--admin { color: var(--color-primary); background: var(--color-primary-light); }
.avatar-pop__role--student { color: var(--color-success); background: var(--color-success-light); }
.avatar-pop__actions {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--dew-card-divider);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.avatar-pop__action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--dew-text);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.avatar-pop__action:hover { background: var(--dew-ghost-hover-bg); }
.avatar-pop__action .el-icon { font-size: 16px; color: var(--dew-text-muted); }
.avatar-pop__action--danger { color: var(--color-danger); }
.avatar-pop__action--danger:hover { background: var(--color-danger-light); }
.avatar-pop__action--danger .el-icon { color: var(--color-danger); }
</style>

<style>
</style>