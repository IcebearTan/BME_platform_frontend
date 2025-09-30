<template>
  <div :class="['profile-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <!-- 导航栏 -->
    <div class="header-container">
      <!-- 桌面菜单 -->
      <div v-if="!isMobile" class="desktop-menu-container">
        <MenuComponent />
      </div>
      <!-- 移动端汉堡图标 -->
      <div v-else class="mobile-header">
        <!-- Logo (保持在左侧) -->
        <div class="mobile-logo">
          <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
        </div>
        <!-- 汉堡按钮 (放在右侧) -->
        <el-icon class="hamburger-icon" @click="toggleMobileMenu">
          <Expand />
        </el-icon>
      </div>
    </div>
    <!-- 移动端菜单 (条件渲染) -->
    <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">AMEII 教育平台</h1>
          <p class="hero-subtitle">Advanced Medical Engineering Innovation Institute</p>
          <p class="hero-description">
            致力于医工融合人才培养，打造创新型医学工程教育生态系统
          </p>
          <div class="hero-buttons">
            <button class="btn btn-primary" @click="navigateToStudy">开始学习</button>
            <button class="btn btn-secondary" @click="scrollToAbout">了解更多</button>
          </div>
        </div>
        <div class="hero-image">
          <img src="../assets/Logo_NewYear.png" alt="AMEII Logo" />
        </div>
      </div>
    </section>

    <!-- 特色介绍区域 -->
    <section class="features-section" id="about">
      <div class="container">
        <h2 class="section-title">平台特色</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="icon-innovation"></i>
            </div>
            <h3>创新教学模式</h3>
            <p>融合理论与实践，采用项目驱动的教学方法，培养学生的创新思维和实践能力</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="icon-collaboration"></i>
            </div>
            <h3>产学研结合</h3>
            <p>与医院、科研院所深度合作，提供真实的医工融合项目实训机会</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="icon-technology"></i>
            </div>
            <h3>前沿技术培训</h3>
            <p>涵盖人工智能、生物医学工程、医疗设备等前沿技术领域</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据统计区域 -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">1000+</div>
            <div class="stat-label">在线学员</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">50+</div>
            <div class="stat-label">专业课程</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">20+</div>
            <div class="stat-label">合作医院</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">95%</div>
            <div class="stat-label">就业率</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 课程体系区域 -->
    <section class="curriculum-section">
      <div class="container">
        <h2 class="section-title">课程体系</h2>
        <div class="curriculum-timeline">
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h3>基础理论课程</h3>
              <p>医学基础、工程数学、生物医学工程原理</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h3>专业核心课程</h3>
              <p>医疗器械设计、生物信号处理、医学影像技术</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h3>实践项目课程</h3>
              <p>临床实习、产品开发、创新创业项目</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h3>行业前沿课程</h3>
              <p>人工智能医学、精准医疗、数字医疗</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 合作伙伴区域 -->
    <section class="partners-section">
      <div class="container">
        <h2 class="section-title">合作伙伴</h2>
        <div class="partners-grid">
          <div class="partner-card">
            <img src="../assets/Logo_plain.png" alt="中山大学" />
            <h4>中山大学</h4>
          </div>
          <div class="partner-card">
            <img src="../assets/Logo_plain.png" alt="生物医学工程学院" />
            <h4>生物医学工程学院</h4>
          </div>
          <div class="partner-card">
            <img src="../assets/Logo_plain.png" alt="医工融创训练营" />
            <h4>医工融创训练营</h4>
          </div>
        </div>
      </div>
    </section>

    <!-- 联系我们区域 -->
    <section class="contact-section">
      <div class="container">
        <h2 class="section-title">联系我们</h2>
        <div class="contact-content">
          <div class="contact-info">
            <div class="contact-item">
              <i class="icon-location"></i>
              <span>广州市海珠区新港西路135号</span>
            </div>
            <div class="contact-item">
              <i class="icon-email"></i>
              <span>contact@ameii.sysu.edu.cn</span>
            </div>
            <div class="contact-item">
              <i class="icon-phone"></i>
              <span>020-84110000</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    </div> <!-- 关闭 main-content -->

    <!-- 页脚 -->
    <div class="page-footer">
      <PageFooterComponent />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import MenuComponent from "../components/MenuComponent.vue"
import PageFooterComponent from "../components/PageFooterComponent.vue"
import MobileMenuComponent from "../components/MobileMenuComponent.vue"
import { Menu as Expand } from '@element-plus/icons-vue'

const router = useRouter()
const store = useStore()

// 获取主题状态
const isDarkMode = computed(() => store.getters.isDarkMode)

// 移动端菜单控制
const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)

// 更新屏幕尺寸状态
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

// 切换移动菜单
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 导航到学习页面
const navigateToStudy = () => {
  router.push('/home')
}

// 滚动到关于我们区域
const scrollToAbout = () => {
  document.getElementById('about').scrollIntoView({ 
    behavior: 'smooth' 
  })
}
</script>

<style scoped>
.profile-container {
  width: 100%;
  min-height: 100vh;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.theme-light .profile-container {
  background-color: #f8f9fa;
  color: #333333;
}

.theme-dark .profile-container {
  background-color: #1a1a1a;
  color: #ecf0f1;
}

/* 导航栏容器 */
.header-container {
  position: relative;
  z-index: 1000;
}

/* 移动端头部样式 */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  height: 60px;
  background: inherit;
}

.mobile-logo {
  cursor: pointer;
}

.hamburger-icon {
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-light .hamburger-icon {
  color: #333;
}

.theme-dark .hamburger-icon {
  color: #fff;
}

.hamburger-icon:hover {
  transform: scale(1.1);
}

/* 主内容区域 */
.main-content {
  flex: 1;
}

/* 英雄区域 */
.hero-section {
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
}

.theme-light .hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.theme-dark .hero-section {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
}

.hero-content {
  display: flex;
  align-items: center;
  max-width: 1200px;
  width: 100%;
  gap: 60px;
}

.hero-text {
  flex: 1;
  max-width: 600px;
  color: #ffffff;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 20px;
  margin-bottom: 20px;
  opacity: 0.9;
}

.hero-description {
  font-size: 16px;
  line-height: 1.8;
  margin-bottom: 40px;
  opacity: 0.8;
}

.hero-buttons {
  display: flex;
  gap: 20px;
}

.btn {
  padding: 15px 30px;
  font-size: 16px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(45deg, #3498db, #2980b9);
  color: white;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.6);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #333;
}

.hero-image {
  flex: 1;
  text-align: center;
}

.hero-image img {
  max-width: 300px;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3));
}



/* 通用容器和标题 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 60px;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  border-radius: 2px;
}

/* 特色介绍区域 */
.features-section {
  padding: 80px 0;
}

.theme-light .features-section {
  background-color: #ffffff;
}

.theme-dark .features-section {
  background-color: #2c2c2c;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
}

.feature-card {
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid;
}

.theme-light .feature-card {
  background-color: #ffffff;
  border-color: #e9ecef;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.theme-dark .feature-card {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.feature-card:hover {
  transform: translateY(-5px);
}

.theme-light .feature-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.theme-dark .feature-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, #3498db, #2980b9);
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-card h3 {
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
}

.feature-card p {
  line-height: 1.6;
  opacity: 0.9;
}

/* 数据统计区域 */
.stats-section {
  padding: 80px 0;
}

.theme-light .stats-section {
  background-color: #f8f9fa;
}

.theme-dark .stats-section {
  background-color: #1e1e1e;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 16px;
  opacity: 0.8;
}

/* 课程体系区域 */
.curriculum-section {
  padding: 80px 0;
}

.theme-light .curriculum-section {
  background-color: #ffffff;
}

.theme-dark .curriculum-section {
  background-color: #2c2c2c;
}

.curriculum-timeline {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.curriculum-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #3498db, #e74c3c);
  transform: translateX(-50%);
}

.timeline-item {
  position: relative;
  margin-bottom: 60px;
  display: flex;
  align-items: center;
}

.timeline-item:nth-child(odd) {
  flex-direction: row;
}

.timeline-item:nth-child(even) {
  flex-direction: row-reverse;
}

.timeline-marker {
  width: 20px;
  height: 20px;
  background: linear-gradient(45deg, #f39c12, #e74c3c);
  border-radius: 50%;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.timeline-content {
  padding: 30px;
  border-radius: 15px;
  width: 45%;
  border: 1px solid;
}

.theme-light .timeline-content {
  background-color: #ffffff;
  border-color: #e9ecef;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.theme-dark .timeline-content {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.timeline-content h3 {
  font-size: 18px;
  margin-bottom: 15px;
  font-weight: 600;
}

/* 合作伙伴区域 */
.partners-section {
  padding: 80px 0;
}

.theme-light .partners-section {
  background-color: #f8f9fa;
}

.theme-dark .partners-section {
  background-color: #1e1e1e;
}

.partners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
}

.partner-card {
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  border: 1px solid;
  transition: all 0.3s ease;
}

.theme-light .partner-card {
  background-color: #ffffff;
  border-color: #e9ecef;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.theme-dark .partner-card {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.partner-card:hover {
  transform: translateY(-2px);
}

.theme-light .partner-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.theme-dark .partner-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.partner-card img {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.partner-card h4 {
  font-size: 16px;
  font-weight: 600;
}

/* 联系我们区域 */
.contact-section {
  padding: 60px 0;
}

.theme-light .contact-section {
  background-color: #ffffff;
}

.theme-dark .contact-section {
  background-color: #2c2c2c;
}

.contact-content {
  max-width: 600px;
  margin: 0 auto;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 16px;
}

.contact-item i {
  width: 50px;
  height: 50px;
  background: linear-gradient(45deg, #3498db, #2980b9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .hero-content {
    gap: 40px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-subtitle {
    font-size: 18px;
  }
  
  .section-title {
    font-size: 28px;
  }
}

@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    text-align: center;
    gap: 30px;
  }
  
  .hero-title {
    font-size: 32px;
  }
  
  .hero-subtitle {
    font-size: 16px;
  }
  
  .hero-description {
    font-size: 14px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }
  
  .curriculum-timeline::before {
    left: 20px;
  }
  
  .timeline-item {
    flex-direction: column;
    align-items: flex-start;
    padding-left: 60px;
  }
  
  .timeline-marker {
    left: 20px;
  }
  
  .timeline-content {
    width: 100%;
  }
  
  .partners-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 24px;
    margin-bottom: 40px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 28px;
  }
  
  .hero-buttons {
    flex-direction: column;
    gap: 15px;
  }
  
  .btn {
    width: 100%;
    padding: 12px 24px;
    font-size: 14px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-number {
    font-size: 28px;
  }
  
  .feature-card {
    padding: 30px 20px;
  }
  
  .timeline-content {
    padding: 20px;
  }
  
  .contact-item {
    font-size: 14px;
  }
}

/* 页脚样式 */
.page-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 40px 0;
  width: 100%;
  min-height: 400px;
  margin: 0;
  box-sizing: border-box;
  color: #ffffff;
  transition: all 0.3s ease;
}

.theme-light .page-footer {
  background-color: #252525;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
}

/* 图标样式 */
.icon-innovation::before { content: "💡"; font-size: 24px; }
.icon-collaboration::before { content: "🤝"; font-size: 24px; }
.icon-technology::before { content: "🔬"; font-size: 24px; }
.icon-location::before { content: "📍"; font-size: 20px; }
.icon-email::before { content: "📧"; font-size: 20px; }
.icon-phone::before { content: "📞"; font-size: 20px; }
</style>