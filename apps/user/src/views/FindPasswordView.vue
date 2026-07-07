<script>
import FindPasswordComponent from '../components/Auth/FindPasswordComponent.vue';
import PageFooterComponent from '../components/PageFooterComponent.vue';
import MenuComponent from '../components/MenuComponent.vue';
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'FindPasswordView',
  components: {
    FindPasswordComponent,
    PageFooterComponent,
    MenuComponent
  },
  setup() {
    const store = useStore();
    
    const isDarkMode = computed(() => store.state.isDarkMode);
    
    onMounted(() => {
      // 应用主题类到body
      document.body.className = isDarkMode.value ? 'theme-dark' : 'theme-light';
    });
    
    return {
      isDarkMode
    };
  }
};
</script>

<template>
  <div class="auth-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <!-- 背景装饰 -->
    <div class="bg-decorations">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
      <div class="bg-circle bg-circle-4"></div>
    </div>
    
    <el-container class="common-layout">
      <el-header class="header">
        <MenuComponent />
      </el-header>
      <el-main class="homeMainContainer">
        <div class="auth-content-wrapper">
          <FindPasswordComponent />
        </div>
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 背景装饰 */
.bg-decorations {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  animation: float 20s infinite ease-in-out;
  filter: blur(1px);
}

.bg-circle::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  border-radius: 50%;
  opacity: 0.3;
  animation: pulse 15s infinite ease-in-out;
}

.bg-circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 5s;
}

.bg-circle-3 {
  width: 120px;
  height: 120px;
  bottom: 20%;
  left: 20%;
  animation-delay: 10s;
}

.bg-circle-4 {
  width: 180px;
  height: 180px;
  top: 30%;
  right: 40%;
  animation-delay: 15s;
}

/* 主题适配 - 浅色模式 */
.theme-light .auth-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.theme-light .bg-circle-1 {
  background: radial-gradient(circle, rgba(64, 158, 255, 0.2) 0%, rgba(64, 158, 255, 0.05) 70%);
}

.theme-light .bg-circle-2 {
  background: radial-gradient(circle, rgba(123, 97, 255, 0.15) 0%, rgba(123, 97, 255, 0.03) 70%);
}

.theme-light .bg-circle-3 {
  background: radial-gradient(circle, rgba(255, 107, 129, 0.18) 0%, rgba(255, 107, 129, 0.04) 70%);
}

.theme-light .bg-circle-4 {
  background: radial-gradient(circle, rgba(46, 213, 115, 0.15) 0%, rgba(46, 213, 115, 0.03) 70%);
}

/* 主题适配 - 深色模式 */
.theme-dark .auth-page {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
}

.theme-dark .bg-circle-1 {
  background: radial-gradient(circle, rgba(64, 158, 255, 0.3) 0%, rgba(64, 158, 255, 0.08) 70%);
}

.theme-dark .bg-circle-2 {
  background: radial-gradient(circle, rgba(123, 97, 255, 0.25) 0%, rgba(123, 97, 255, 0.06) 70%);
}

.theme-dark .bg-circle-3 {
  background: radial-gradient(circle, rgba(255, 107, 129, 0.28) 0%, rgba(255, 107, 129, 0.07) 70%);
}

.theme-dark .bg-circle-4 {
  background: radial-gradient(circle, rgba(46, 213, 115, 0.25) 0%, rgba(46, 213, 115, 0.06) 70%);
}

.common-layout {
  min-height: 100vh;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 1px;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 10;
}

.theme-light .header {
  border-bottom: solid 1px rgba(230, 230, 230, 0.6);
  background: rgba(255, 255, 255, 0.7);
}

.theme-dark .header {
  border-bottom: solid 1px rgba(255, 255, 255, 0.1);
  background: rgba(26, 32, 44, 0.7);
}

.homeMainContainer {
  padding: 20px 0;
  margin: 0;
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  z-index: 2;
}

.auth-content-wrapper {
  position: relative;
  z-index: 3;
}

.page-footer {
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

.theme-light .page-footer {
  background-color: #252525;
  color: #ffffff;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
  color: #ffffff;
}

/* 确保el-footer元素本身的样式 */
:deep(.el-footer) {
  padding: 0;
  height: auto;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-20px) rotate(90deg);
  }
  50% {
    transform: translateY(0px) rotate(180deg);
  }
  75% {
    transform: translateY(20px) rotate(270deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .bg-circle {
    opacity: 0.3;
  }
  
  .bg-circle-1 {
    width: 120px;
    height: 120px;
  }
  
  .bg-circle-2 {
    width: 100px;
    height: 100px;
  }
  
  .bg-circle-3 {
    width: 80px;
    height: 80px;
  }
  
  .bg-circle-4 {
    width: 110px;
    height: 110px;
  }
  
  .page-footer {
    min-height: 300px;
    padding: 15px;
  }
}
</style>
