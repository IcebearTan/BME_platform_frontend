<script>
import { useStore } from 'vuex'
import { User, Close, Sunny, Moon } from '@element-plus/icons-vue'
import NotificationComponent from './Notification/NotificationComponent.vue'

export default {
    components: {
        NotificationComponent
    },
    data() {
        return {
            activeIndex: "/",
            visible: false,
        }
    },

    methods: {
        handleSelect(key, keyPath) {
            // console.log(key, keyPath);
        }
    },

    created() {
        this.activeIndex = this.$route.path
    },

};
</script>

<script setup>
import { onMounted, ref, nextTick, onBeforeMount, computed } from 'vue'
import { ClickOutside as vClickOutside } from 'element-plus'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'
import NotificationComponent from './Notification/NotificationComponent.vue'

// 定义props
const props = defineProps({
  hideAuthButtons: {
    type: Boolean,
    default: false
  }
})

const buttonRef = ref()
const popoverRef = ref()
const store = useStore()
const router = useRouter()

const User_Avatar = ref('');

const token = localStorage.getItem('token')
const isLogin = ref(false)

const fetchUserInfo = async () => {
  try {
    const response = await api({
      url: "/user/user_index",
      method: "get",
    });
    if (response.data.code === 200) {
      User_Info.value = response.data;
    } else {
      // 只做本地清理，不弹窗不跳转
      localStorage.removeItem('token')
    }
  } catch (error) {
    // 只做本地清理，不弹窗不跳转
    localStorage.removeItem('token')
  }
}

const publicRoutes = ['/', '/home', '/article', '/register', '/login'];
const checkLogin = () => {
    api({
        url: "/user/user_index",
        method: "get",
    }).then((res) => {
        isLogin.value = true
        fetchUserAvatar() // 改为调用 fetchUserAvatar 从服务器获取最新头像
    }).catch((error) => {
        isLogin.value = false
        store.dispatch('logout')
        localStorage.removeItem('token')
        // 不再弹窗和跳转，交给全局拦截器
    })
}

const fetchUserAvatar = async () => {
    api({
      url: "/user/user_avatars", // 请求头像的URL
      method: "get",
    })
    .then((avatarRes) => {
        if (avatarRes.data.code === 200) {
            // 检查服务器返回的头像数据是否存在
            if (avatarRes.data.User_Avatar && avatarRes.data.User_Avatar !== null) {
                User_Avatar.value = `data:image/png;base64,${avatarRes.data.User_Avatar}`;
            } else {
                // 用户尚未设置头像，使用默认头像
                User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
            }
        } else {
            User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
            // ElMessage.error('用户尚未上传头像'); // 不再弹窗
        }  
    })
    .catch((error) => {
        if (error.response && error.response.status === 400) {
            User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
            // ElMessage.error('MenuComponent:用户尚未上传头像或未知的错误'); // 不再弹窗
        } else if (error.response && error.response.status === 401) {
            localStorage.removeItem('token')
            // 不再弹窗和跳转，交给全局拦截器
        }
    })
}

const setUserAvatar = () => {
    if (store.state.avatar) {
        User_Avatar.value = `${store.state.avatar}`
    } else {
        User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
    }
    // User_Avatar.value = `data:image/png;base64,${store.state.avatar}`
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
const showNotificationHover = ref(false)

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

// 处理消息点击事件
const handleNotificationClick = () => {
  router.push('/notifications')
}

onMounted(() => {
    // 初始化主题
    checkTimeTheme()
    
    if (token) {
        checkLogin()
    } else {
        isLogin.value = false
        // 未登录时直接展示登录/注册
        User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
    }
    

})

const onClickOutside = () => {
  unref(popoverRef).popperRef?.delayHide?.()
}

const logOut = () => {
    store.dispatch('logout')
    localStorage.removeItem('token')
    window.location.reload()
}

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
                    <img style="width: 50px" src="../assets/Logo_NewYear.png" />
                    <span class="ameii-text">AMEII</span>
                </el-menu-item>
                <el-menu-item index="/home" class="study-center-item">
                    学习中心
                </el-menu-item>
                <el-menu-item index="/study">
                    课程
                </el-menu-item>
                <el-menu-item index="/question-bank">
                    题库
                </el-menu-item>
                <el-menu-item index="/order" disabled>
                    资源库
                </el-menu-item>
                <el-menu-item index="/discuss" disabled>
                    讨论
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
        
        <!-- 消息提醒组件 -->
        <el-menu-item v-if="isLogin" class="custom-menu-item notification-menu-item" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
            <div 
              class="notification-wrapper"
              @click="handleNotificationClick"
              @mouseenter="showNotificationHover = true"
              @mouseleave="showNotificationHover = false"
            >
              <NotificationComponent 
                :show-hover="showNotificationHover"
                @click-bell="handleNotificationClick"
              />
            </div>
        </el-menu-item>
        
        <el-menu-item v-if="isLogin" class="custom-menu-item theme-menu-item" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
            <div class="user-avatar" style="cursor: pointer;">
                <el-popover
                    :showArrow=false
                    trigger="click"
                    width="300px"
                    height="500px"
                    :popper-class="`popover ${isDarkMode ? 'theme-dark' : 'theme-light'}`"
                >
                    <div :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
                        <div style="display: flex; align-items: center; cursor: pointer;" @click="$router.push('/user')">
                            <div style="width: 50px; height: 50px;">
                                <el-avatar @click="visible = !visible"
                                :src="User_Avatar" alt="image"
                                :size="50"
                                />
                            </div>
                            
                            <div style="display: flex; flex-wrap: wrap; margin-left: 10px;">
                                <div class="user-name">{{ $store.state.user.User_Name }}</div>
                                <div v-if="$store.state.user.User_Mode == 'admin'" class="user-type-instructor">导师</div>
                                <div v-else class="user-type-student">学生</div>
                            </div>
                        </div>
                        <ul style="list-style: none; padding: 0; margin-bottom: 0;" role="none">
                            <li class="popli" role="none" @click="handleUserInfo()">
                                <el-icon>
                                    <User />
                                </el-icon>
                                <span style="margin-left: 10px;" >账户设置</span>
                                
                            </li>
                            <li class="popli-exit" role="none" @click="logOut()">
                                <el-icon>
                                    <Close />
                                </el-icon>
                                <span style="margin-left: 10px;" >退出</span>
                            </li>
                        </ul>
                    </div>
                    
                    <template #reference>
                        <el-avatar @click="visible = !visible"
                            :src="User_Avatar" alt="image"
                        />
                    </template>
                </el-popover>
                
            </div>
        </el-menu-item>
        
        <el-menu-item v-else-if="!props.hideAuthButtons" class="custom-menu-item auth-menu-item">
            <a href="/login" class="custom-link">登录</a>
            <span class="auth-separator">或</span>
            <a href="/register" class="custom-link">注册</a>
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
.user-name{
    position: relative;
    top: 0;
    font-size: 18px;
    margin-left: 0px;
    width: 100%;
    font-weight: bold;
    transition: color 0.3s ease;
}

/* 主题适配 */
.theme-light .user-name {
    color: #000000;
}

.theme-dark .user-name {
    color: #ffffff;
}
.popli{
    display: flex;
    align-items: center;

    font-size: 15px;
    font-weight: 500;
    padding: 8px;

    border-radius: 10px;
    transition: 0.5s;
}

.popli:hover{
    cursor: pointer;
}

/* 主题适配 */
.theme-light .popli:hover {
    background-color: transparent;
}

.theme-dark .popli:hover {
    background-color: transparent;
}

.popli-exit{
    display: flex; 
    align-items: center;

    font-size: 15px;
    font-weight: 500;
    padding: 8px;

    border-radius: 10px;
    border: solid 1px #ffffff;

    transition: 0.5s;
}

.popli-exit:hover{
    cursor: pointer;
}

/* 主题适配 */
.theme-light .popli-exit {
    border-color: #ffffff;
}

.theme-dark .popli-exit {
    border-color: #333333;
}

.theme-light .popli-exit:hover {
    background-color: transparent;
    border-color: #ff8888;
}

.theme-dark .popli-exit:hover {
    background-color: rgba(255, 136, 136, 0.2);
    border-color: #ff8888;
}

.user-type-instructor{
    position: relative;
    top: 0;
    font-size: 15px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.theme-light .user-type-instructor {
    color: #9b59b6;
    text-shadow: 0px 0px 6px rgba(155, 89, 182, 0.3);
}

.theme-dark .user-type-instructor {
    color: #bb77c4;
    text-shadow: 0px 0px 10px rgba(187, 119, 196, 0.4);
}

.user-type-student{
    position: relative;
    top: 0;
    font-size: 15px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.theme-light .user-type-student {
    color: #3498db;
    text-shadow: 0px 0px 6px rgba(52, 152, 219, 0.3);
}

.theme-dark .user-type-student {
    color: #5dade2;
    text-shadow: 0px 0px 10px rgba(93, 173, 226, 0.4);
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
</style>

<style>
.popover{
    padding: 20px !important;
    border-radius: 10px !important;
    transition: all 0.3s ease;
}

/* 弹出框主题适配 */
.theme-light .popover {
    background-color: #ffffff !important;
    border-color: #e4e7ed !important;
    color: #333333 !important;
}

.theme-dark .popover {
    background-color: #2c2c2c !important;
    border-color: #4c4c4c !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}
</style>