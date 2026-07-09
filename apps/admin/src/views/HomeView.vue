<script>
import { RouterView } from "vue-router";
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import {
  Document, User, ChatLineRound, Trophy, Setting, Location,
  Grid, Fold, Bell, ArrowDown, Clock, EditPen, TrendCharts,
  HomeFilled, Picture, Search, List, Plus, Cpu, DataLine, Key, Tickets
} from '@element-plus/icons-vue';

export default {
  name: "HomeView",
  components: {

  },

  data() {
    return {
      activeIndex: '/',
      sidebarCollapsed: false,
      userAvatar: '',
      store: useStore(),
      router: useRouter(),
    };
  },

  computed: {
    currentPageTitle() {
      const routeMap = {
        '/': '仪表盘',
        '/dashboard': '仪表盘',
        '/user-manage/users': '用户管理',
        '/user-manage/attendence': '考勤管理',
        '/article/manage': '文章管理',
        '/article/create': '创建文章',
        '/group/manage': '小组管理',
        '/course/manage': '课程管理',
        '/course/create': '发布课程',
        '/course/edit/:id': '编辑课程',
        '/learningprgress/manage': '学习进度',
        '/medal/manage': '勋章管理',
        '/medal/grant': '勋章查询',
        '/audit/logs': '审计日志',
        '/notification/manage': '通知管理',
        '/seat/manage': '座位管理',
        '/attendance-report/manage': '出勤报告',
        '/camp/attendance': '营期考勤看板',
        '/camp/sessions': '营期管理',
        '/camp/sessions/:id': '营期详情'
      };
      return routeMap[this.$route.path] || '系统管理';
    },
    isStaff() {
      return this.store.getters.isStaff;
    }
  },

  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    handleUserAction(command) {
      switch(command) {
        case 'profile':
          this.$message.info('个人资料功能开发中...');
          break;
        case 'settings':
          this.$message.info('系统设置功能开发中...');
          break;
        case 'logout':
          this.$confirm('确定要退出登录吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }).then(() => {
            this.store.dispatch('clearUser');
            this.router.push('/login');
            this.$message.success('已退出登录');
          });
          break;
      }
    },

    handleSettingsClick() {
      this.$message.info('系统设置功能开发中...');
    }
  },

  async created() {
    api({
      url: "/user/user_index",
      method: "get",
    }).catch((error) => {
      ElMessage.error('登录失效，请重新登录')
      this.router.push('/login')
    }).then((res) => {
      if (res.data.code == 200) {
        this.store.dispatch('setUser', res.data)
      }
    })

    if (this.$route.path === '/') {
      this.activeIndex = '/dashboard'
    }
    else {
      this.activeIndex = this.$route.path
    }
    console.log(this.activeIndex)
  }
};
</script>

<script setup>
import api from '../api';
import { onMounted } from 'vue'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'


const handleOpen = (key, keyPath) => {
  
}

const handleClose = (key, keyPath) => {

}
</script>



<template>
  <div class="admin-layout">
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
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>
      
      <div class="navbar-right">
        <el-button :icon="Bell" text size="large" class="notification-btn" @click="router.push('/notification/manage')">
          <el-badge :value="3" class="notification-badge" />
        </el-button>
        
        <el-dropdown @command="handleUserAction">
          <div class="user-profile">
            <el-avatar :size="32" :src="userAvatar" />
            <span class="username">{{ store.state.user?.name || '管理员' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item command="settings">系统设置</el-dropdown-item>
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
          <div class="logo-icon">🎓</div>
          <div class="logo-text">
            <div class="logo-title">训练营</div>
            <div class="logo-subtitle">后台管理系统</div>
          </div>
        </div>
        <div class="logo-mini" v-show="sidebarCollapsed">
          <div class="logo-icon">🎓</div>
        </div>
      </div>

      <div class="sidebar-menu">
        <el-menu 
          :default-active="activeIndex" 
          class="modern-menu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          @open="handleOpen" 
          @close="handleClose"
        >
          <!-- 用户管理 -->
          <el-sub-menu index="1">
            <template #title>
              <el-icon class="menu-icon"><User /></el-icon>
              <span class="menu-text">用户管理</span>
            </template>
            <el-menu-item 
              index="/user-manage/users" 
              @click="router.push('/user-manage/users')"
              class="submenu-item"
            >
              <el-icon><User /></el-icon>
              <span>管理用户</span>
            </el-menu-item>
            <el-menu-item 
              index="/user-manage/attendence" 
              @click="router.push('/user-manage/attendence')"
              class="submenu-item"
            >
              <el-icon><Clock /></el-icon>
              <span>考勤管理</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 文章管理 -->
          <el-sub-menu index="2">
            <template #title>
              <el-icon class="menu-icon"><Document /></el-icon>
              <span class="menu-text">文章管理</span>
            </template>
            <el-menu-item 
              index="/article/manage" 
              @click="router.push('/article/manage')"
              class="submenu-item"
            >
              <el-icon><Document /></el-icon>
              <span>管理文章</span>
            </el-menu-item>
            <el-menu-item 
              index="/article/create" 
              @click="router.push('/article/create')" 
              disabled
              class="submenu-item"
            >
              <el-icon><EditPen /></el-icon>
              <span>草稿箱</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 小组管理 -->
          <el-sub-menu index="4">
            <template #title>
              <el-icon class="menu-icon"><ChatLineRound /></el-icon>
              <span class="menu-text">小组管理</span>
            </template>
            <el-menu-item 
              index="/group/manage" 
              @click="router.push('/group/manage')"
              class="submenu-item"
            >
              <el-icon><ChatLineRound /></el-icon>
              <span>管理小组</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 课程管理 -->
          <el-sub-menu index="3">
            <template #title>
              <el-icon class="menu-icon"><Location /></el-icon>
              <span class="menu-text">课程管理</span>
            </template>
            <el-menu-item
              index="/course/manage"
              @click="router.push('/course/manage')"
              class="submenu-item"
            >
              <el-icon><List /></el-icon>
              <span>管理课程</span>
            </el-menu-item>
            <el-menu-item
              index="/course/create"
              @click="router.push('/course/create')"
              class="submenu-item"
            >
              <el-icon><Plus /></el-icon>
              <span>发布课程</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 学习进度管理 -->
          <el-sub-menu index="5">
            <template #title>
              <el-icon class="menu-icon"><TrendCharts /></el-icon>
              <span class="menu-text">学习进度管理</span>
            </template>
            <el-menu-item 
              index="/learningprgress/manage" 
              @click="router.push('/learningprgress/manage')"
              class="submenu-item"
            >
              <el-icon><TrendCharts /></el-icon>
              <span>编辑学习进度</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 首页管理 (禁用) -->
          <el-sub-menu index="6" disabled>
            <template #title>
              <el-icon class="menu-icon"><HomeFilled /></el-icon>
              <span class="menu-text">首页管理</span>
            </template>
            <el-menu-item 
              index="/homepage/manage" 
              @click="router.push('/homepage/cover')"
              class="submenu-item"
            >
              <el-icon><Picture /></el-icon>
              <span>编辑首页封面</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 勋章管理 -->
          <el-sub-menu index="7">
            <template #title>
              <el-icon class="menu-icon"><Trophy /></el-icon>
              <span class="menu-text">勋章管理</span>
            </template>
            <el-menu-item 
              index="/medal/manage" 
              @click="router.push('/medal/manage')"
              class="submenu-item"
            >
              <el-icon><Trophy /></el-icon>
              <span>管理勋章</span>
            </el-menu-item>
            <el-menu-item 
              index="/medal/grant" 
              @click="router.push('/medal/grant')" 
              disabled
              class="submenu-item"
            >
              <el-icon><Search /></el-icon>
              <span>勋章查询</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="8">
            <template #title>
              <el-icon class="menu-icon"><Cpu /></el-icon>
              <span class="menu-text">大模型服务</span>
            </template>
            <el-menu-item
              index="/llm/projects"
              @click="router.push('/llm/projects')"
              class="submenu-item"
            >
              <el-icon><Grid /></el-icon>
              <span>项目管理</span>
            </el-menu-item>
            <el-menu-item
              index="/llm/users"
              @click="router.push('/llm/users')"
              class="submenu-item"
            >
              <el-icon><DataLine /></el-icon>
              <span>用户用量看板</span>
            </el-menu-item>
            <el-menu-item
              index="/llm/quota-requests"
              @click="router.push('/llm/quota-requests')"
              class="submenu-item"
            >
              <el-icon><Key /></el-icon>
              <span>增额申请审批</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 通知管理 -->
          <el-sub-menu index="9">
            <template #title>
              <el-icon class="menu-icon"><Bell /></el-icon>
              <span class="menu-text">通知管理</span>
            </template>
            <el-menu-item
              index="/notification/manage"
              @click="router.push('/notification/manage')"
              class="submenu-item"
            >
              <el-icon><Bell /></el-icon>
              <span>系统通知</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 座位管理 -->
          <el-sub-menu index="10">
            <template #title>
              <el-icon class="menu-icon"><Location /></el-icon>
              <span class="menu-text">座位管理</span>
            </template>
            <el-menu-item
              index="/seat/manage"
              @click="router.push('/seat/manage')"
              class="submenu-item"
            >
              <el-icon><Location /></el-icon>
              <span>座位绑定</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 出勤报告 -->
          <el-sub-menu index="11">
            <template #title>
              <el-icon class="menu-icon"><Clock /></el-icon>
              <span class="menu-text">出勤报告</span>
            </template>
            <el-menu-item
              index="/attendance-report/manage"
              @click="router.push('/attendance-report/manage')"
              class="submenu-item"
            >
              <el-icon><Clock /></el-icon>
              <span>收件人与测试发送</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 营期管理（仅老师/导生/超管可见） -->
          <el-sub-menu index="12" v-if="isStaff">
            <template #title>
              <el-icon class="menu-icon"><Tickets /></el-icon>
              <span class="menu-text">营期管理</span>
            </template>
            <el-menu-item
              index="/camp/attendance"
              @click="router.push('/camp/attendance')"
              class="submenu-item"
            >
              <el-icon><Clock /></el-icon>
              <span>考勤看板</span>
            </el-menu-item>
            <el-menu-item
              index="/camp/sessions"
              @click="router.push('/camp/sessions')"
              class="submenu-item"
            >
              <el-icon><List /></el-icon>
              <span>营期列表</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 底部系统设置 -->
      <div class="sidebar-footer">
<div class="settings-item" @click="router.push('/audit/logs')">
          <el-icon class="menu-icon"><Tickets /></el-icon>
          <span class="menu-text" v-show="!sidebarCollapsed">审计日志</span>
        </div>
        <div class="settings-item" @click="handleSettingsClick">
          <el-icon class="menu-icon"><Setting /></el-icon>
          <span class="menu-text" v-show="!sidebarCollapsed">系统设置</span>
        </div>
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
/* 全局样式 - 不使用scoped以确保优先级 */
.admin-layout {
  min-height: 100vh;
  background: var(--bg-secondary);
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
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 1000;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(8px);
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
  background: rgba(79, 70, 229, 0.1) !important;
}

.admin-layout .breadcrumb-container {
  margin-left: 16px;
}

.admin-layout .navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-layout .notification-btn {
  position: relative;
  color: var(--text-secondary) !important;
}

.admin-layout .notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
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
  background: var(--sidebar-bg);
  transition: width var(--transition-normal);
  z-index: 999;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-light);
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* 防止图标被压缩 */
}

.admin-layout .logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许文字缩小但不会挤压 */
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
  transition: all var(--transition-fast) !important;
  padding: 0 16px !important;
  height: 48px !important;
  line-height: 48px !important;
  border: none !important;
}

/* 悬停效果 - 增强对比度 */
.admin-layout .modern-menu .el-sub-menu__title:hover,
.admin-layout .modern-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 激活状态 - 更明显的视觉反馈 */
.admin-layout .modern-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.8), rgba(99, 102, 241, 0.6)) !important;
  color: #ffffff !important;
  position: relative;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.admin-layout .modern-menu .el-menu-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #ffffff;
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

/* 子菜单容器样式 - 解决白色突兀问题 */
.admin-layout .modern-menu .el-sub-menu .el-menu {
  background: rgba(0, 0, 0, 0.3) !important;
  border-radius: var(--radius-md) !important;
  margin: 6px 0 !important;
  padding: 8px 0 !important;
  border: none !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  transform: translateX(2px);
}

.admin-layout .modern-menu .el-sub-menu .el-menu .el-menu-item.is-active,
.admin-layout .submenu-item.is-active {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.6), rgba(99, 102, 241, 0.4)) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
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

/* 设置项样式 - 不再使用el-menu */
.admin-layout .settings-item {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.8) !important;
  background: transparent !important;
  border-radius: var(--radius-md) !important;
  padding: 0 16px !important;
  height: 48px !important;
  line-height: 48px !important;
  transition: all var(--transition-fast) !important;
  cursor: pointer;
  user-select: none;
  margin: 3px 0;
  overflow: hidden; /* 防止内容溢出 */
  white-space: nowrap; /* 防止文字换行 */
}

.admin-layout .settings-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.admin-layout .settings-item .menu-icon {
  margin-right: 12px !important;
  font-size: 18px;
  color: inherit !important;
}

.admin-layout .settings-item .menu-text {
  font-weight: 500;
  color: inherit !important;
  transition: opacity 0.15s ease, transform 0.15s ease; /* 平滑过渡 */
  overflow: hidden; /* 防止文字溢出 */
  text-overflow: ellipsis; /* 超长文字显示省略号 */
}

/* 折叠状态下的设置项 */
.admin-layout .sidebar-container.collapsed .settings-item {
  width: 48px;
  padding: 0 !important;
  justify-content: center;
  margin: 3px 8px !important;
}

.admin-layout .sidebar-container.collapsed .settings-item .menu-icon {
  margin: 0 !important;
  font-size: 20px;
}

/* 折叠状态下隐藏设置项文字 */
.admin-layout .sidebar-container.collapsed .settings-item .menu-text {
  opacity: 0;
  transform: translateX(-10px);
  width: 0; /* 完全隐藏，避免占用空间 */
  overflow: hidden;
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
