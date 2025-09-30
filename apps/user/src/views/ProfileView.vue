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
            <h3>创新教学模式</h3>
            <p>融合理论与实践，采用项目驱动的教学方法，培养学生的创新思维和实践能力</p>
          </div>
          <div class="feature-card">
            <h3>产学研结合</h3>
            <p>与医院、科研院所深度合作，提供真实的医工融合项目实训机会</p>
          </div>
          <div class="feature-card">
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
            <div class="timeline-marker">01</div>
            <div class="timeline-content">
              <h3>基础理论课程</h3>
              <p>医学基础、工程数学、生物医学工程原理</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker">02</div>
            <div class="timeline-content">
              <h3>专业核心课程</h3>
              <p>医疗器械设计、生物信号处理、医学影像技术</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker">03</div>
            <div class="timeline-content">
              <h3>实践项目课程</h3>
              <p>临床实习、产品开发、创新创业项目</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-marker">04</div>
            <div class="timeline-content">
              <h3>行业前沿课程</h3>
              <p>人工智能医学、精准医疗、数字医疗</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 团队介绍区域 -->
    <section class="teams-section">
      <div class="container">
        <h2 class="section-title">专业团队</h2>
        <div class="teams-grid">
          <div class="team-card">
            <h3>软件组</h3>
            <p>专注于医疗软件开发、算法设计与数据分析，致力于打造智能化医疗解决方案</p>
          </div>
          <div class="team-card">
            <h3>硬件组</h3>
            <p>专业从事医疗设备硬件设计、电路开发与系统集成，推动医疗设备创新</p>
          </div>
          <div class="team-card">
            <h3>先进制造组</h3>
            <p>运用3D打印、精密加工等先进制造技术，实现医疗器械的精准制造</p>
          </div>
          <div class="team-card">
            <h3>行业分析组</h3>
            <p>深度研究医疗健康产业发展趋势，提供专业的市场分析与战略咨询</p>
          </div>
          <div class="team-card">
            <h3>传媒组</h3>
            <p>负责品牌传播、内容创作与视觉设计，展现医工融合的创新魅力</p>
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

    <!-- 学生评论区域 -->
    <section class="testimonials-section">
      <div class="container">
        <h2 class="section-title">学生评价</h2>
        <div class="testimonials-wrapper">
          <div class="testimonials-scroll">
            <div class="testimonial-item">
              <p>"在AMEII平台学习让我对医工融合有了全新的认识，实践项目特别有意思！"</p>
              <div class="testimonial-author">
                <span class="name">李明</span>
                <span class="info">生物医学工程 · 2022级</span>
              </div>
            </div>
            <div class="testimonial-item">
              <p>"导师们都很专业，课程设置也很合理，从基础到前沿都有涉及。"</p>
              <div class="testimonial-author">
                <span class="name">王小雨</span>
                <span class="info">医学影像技术 · 2023级</span>
              </div>
            </div>
            <div class="testimonial-item">
              <p>"软件组的项目让我学会了很多实用的编程技能，对就业帮助很大。"</p>
              <div class="testimonial-author">
                <span class="name">张三</span>
                <span class="info">计算机科学 · 2021级</span>
              </div>
            </div>
            <div class="testimonial-item">
              <p>"硬件组的实验室设备很先进，能接触到最新的医疗设备技术。"</p>
              <div class="testimonial-author">
                <span class="name">刘佳</span>
                <span class="info">电子工程 · 2022级</span>
              </div>
            </div>
            <div class="testimonial-item">
              <p>"产学研结合的模式让我们能参与真实的医院项目，收获满满！"</p>
              <div class="testimonial-author">
                <span class="name">陈浩</span>
                <span class="info">生物医学工程 · 2020级</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 风采展示区域 -->
    <section class="showcase-section">
      <div class="container">
        <h2 class="section-title">学员风采</h2>
        <div class="showcase-wrapper">
          <div class="showcase-scroll">
            <div class="showcase-item">
              <div class="showcase-image">
                <img src="../assets/ChenMinJie.jpg" alt="项目展示" />
              </div>
              <div class="showcase-content">
                <h3>智能医疗监护系统</h3>
                <p>软件组团队开发的实时生命体征监护平台</p>
              </div>
            </div>
            <div class="showcase-item">
              <div class="showcase-image">
                <img src="../assets/LuMengXuan.jpg" alt="项目展示" />
              </div>
              <div class="showcase-content">
                <h3>便携式心电检测仪</h3>
                <p>硬件组设计的小型化心电监测设备</p>
              </div>
            </div>
            <div class="showcase-item">
              <div class="showcase-image">
                <img src="../assets/Jerry_Scintilla_avatar.jpg" alt="项目展示" />
              </div>
              <div class="showcase-content">
                <h3>3D打印医疗模型</h3>
                <p>先进制造组制作的高精度解剖教学模型</p>
              </div>
            </div>
            <div class="showcase-item">
              <div class="showcase-image">
                <img src="../assets/ジエ_avatar.png" alt="项目展示" />
              </div>
              <div class="showcase-content">
                <h3>医疗器械市场分析</h3>
                <p>行业分析组完成的深度市场研究报告</p>
              </div>
            </div>
            <div class="showcase-item">
              <div class="showcase-image">
                <img src="../assets/ice_bear_avatar.jpg" alt="项目展示" />
              </div>
              <div class="showcase-content">
                <h3>医工融合宣传片</h3>
                <p>传媒组制作的专业宣传视频作品</p>
              </div>
            </div>
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
              <span>广州市海珠区新港西路135号</span>
            </div>
            <div class="contact-item">
              <span>contact@ameii.sysu.edu.cn</span>
            </div>
            <div class="contact-item">
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
  padding-top: 80px; /* 为固定菜单留出空间 */
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
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
}

.theme-dark .hero-section {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
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
}

.theme-light .hero-text {
  color: #1a202c;
}

.theme-dark .hero-text {
  color: #ffffff;
}

.hero-title {
  font-size: 56px;
  font-weight: 900;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.theme-light .hero-title {
  color: #1a202c;
}

.theme-dark .hero-title {
  color: #ffffff;
}

.hero-subtitle {
  font-size: 18px;
  font-weight: 300;
  margin-bottom: 24px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.theme-light .hero-subtitle {
  color: rgba(26, 32, 44, 0.7);
}

.theme-dark .hero-subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.hero-description {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.6;
  margin-bottom: 48px;
  max-width: 500px;
}

.theme-light .hero-description {
  color: rgba(26, 32, 44, 0.8);
}

.theme-dark .hero-description {
  color: rgba(255, 255, 255, 0.9);
}

.hero-buttons {
  display: flex;
  gap: 20px;
}

.btn {
  padding: 16px 32px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  min-width: 140px;
}

.btn-primary {
  background: #333333;
  color: white;
}

.btn-primary:hover {
  background: #000000;
}

.btn-secondary {
  background: transparent;
  border: 1px solid;
}

.theme-light .btn-secondary {
  color: #1a202c;
  border-color: #1a202c;
}

.theme-dark .btn-secondary {
  color: white;
  border-color: white;
}

.theme-light .btn-secondary:hover {
  background: #1a202c;
  color: white;
}

.theme-dark .btn-secondary:hover {
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
  font-size: 36px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 64px;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.theme-light .section-title {
  color: #1a1a1a;
}

.theme-dark .section-title {
  color: #ffffff;
}

/* 特色介绍区域 */
.features-section {
  padding: 120px 0;
}

.theme-light .features-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%);
}

.theme-dark .features-section {
  background: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 50%, #1a1a1a 100%);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 80px;
}

.feature-card {
  padding: 40px 30px;
  text-align: center;
  border-radius: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.theme-light .feature-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.theme-dark .feature-card {
  background: rgba(45, 55, 72, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.theme-light .feature-card::before {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.theme-dark .feature-card::before {
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
}

.feature-card:hover {
  transform: translateY(-8px);
}

.theme-light .feature-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.theme-dark .feature-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-card h3 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.theme-light .feature-card h3 {
  color: #1a1a1a;
}

.theme-dark .feature-card h3 {
  color: #ffffff;
}

.feature-card p {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
  margin: 0;
}

.theme-light .feature-card p {
  color: #6b7280;
}

.theme-dark .feature-card p {
  color: #9ca3af;
}

/* 数据统计区域 */
.stats-section {
  padding: 100px 0;
  position: relative;
}

.theme-light .stats-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 50%, #f8f9fa 100%);
}

.theme-dark .stats-section {
  background: linear-gradient(135deg, #111111 0%, #0f0f0f 50%, #111111 100%);
}

.stats-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.03;
  pointer-events: none;
}

.theme-light .stats-section::before {
  background: radial-gradient(circle at 30% 70%, #667eea 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, #764ba2 0%, transparent 50%);
}

.theme-dark .stats-section::before {
  background: radial-gradient(circle at 30% 70%, #4facfe 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, #00f2fe 0%, transparent 50%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}

.stat-item {
  text-align: center;
  padding: 40px 0;
  border-right: 1px solid;
}

.theme-light .stat-item {
  border-color: #e5e7eb;
}

.theme-dark .stat-item {
  border-color: #374151;
}

.stat-item:last-child {
  border-right: none;
}

.stat-number {
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
  line-height: 1;
}

.theme-light .stat-number {
  color: #1a1a1a;
}

.theme-dark .stat-number {
  color: #ffffff;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.theme-light .stat-label {
  color: #6b7280;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

/* 课程体系区域 */
.curriculum-section {
  padding: 120px 0;
}

.theme-light .curriculum-section {
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
}

.theme-dark .curriculum-section {
  background: linear-gradient(180deg, #1e1e1e 0%, #1a1a1a 50%, #1e1e1e 100%);
}

.curriculum-timeline {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 80px 120px;
  max-width: 1000px;
  margin: 0 auto;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  position: relative;
}

.timeline-marker {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 2px solid;
  border-radius: 50%;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.theme-light .timeline-marker {
  border-color: #1a1a1a;
  color: #1a1a1a;
}

.theme-dark .timeline-marker {
  border-color: #ffffff;
  color: #ffffff;
}

.timeline-content {
  padding: 0;
}

.timeline-content h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

.theme-light .timeline-content h3 {
  color: #1a1a1a;
}

.theme-dark .timeline-content h3 {
  color: #ffffff;
}

.timeline-content p {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  margin: 0;
}

.theme-light .timeline-content p {
  color: #6b7280;
}

.theme-dark .timeline-content p {
  color: #9ca3af;
}

/* 团队介绍区域 */
.teams-section {
  padding: 120px 0;
}

.theme-light .teams-section {
  background: radial-gradient(ellipse at center, #f1f3f4 0%, #f8f9fa 100%);
}

.theme-dark .teams-section {
  background: radial-gradient(ellipse at center, #1a1a1a 0%, #111111 100%);
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 48px;
  max-width: 1000px;
  margin: 0 auto;
}

.team-card {
  text-align: center;
  padding: 32px 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.theme-light .team-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.theme-dark .team-card {
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.team-card:hover {
  transform: translateY(-4px);
}

.theme-light .team-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.theme-dark .team-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.team-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.theme-light .team-card h3 {
  color: #1a1a1a;
}

.theme-dark .team-card h3 {
  color: #ffffff;
}

.team-card p {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  margin: 0;
  max-width: 240px;
  margin: 0 auto;
}

.theme-light .team-card p {
  color: #6b7280;
}

.theme-dark .team-card p {
  color: #9ca3af;
}

/* 合作伙伴区域 */
.partners-section {
  padding: 100px 0;
}

.theme-light .partners-section {
  background: linear-gradient(45deg, #ffffff 0%, #f9fafb 25%, #ffffff 50%, #f9fafb 75%, #ffffff 100%);
}

.theme-dark .partners-section {
  background: linear-gradient(45deg, #1a1a1a 0%, #1e1e1e 25%, #1a1a1a 50%, #1e1e1e 75%, #1a1a1a 100%);
}

.partners-grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 60px;
}

.partner-card {
  text-align: center;
  opacity: 0.6;
  transition: all 0.3s ease;
  flex: 1;
}

.partner-card:hover {
  opacity: 1;
}

.partner-card img {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  filter: grayscale(100%);
  transition: all 0.3s ease;
}

.partner-card:hover img {
  filter: grayscale(0%);
}

.partner-card h4 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.theme-light .partner-card h4 {
  color: #6b7280;
}

.theme-dark .partner-card h4 {
  color: #9ca3af;
}

/* 学生评论区域样式 */
.testimonials-section {
  padding: 120px 0;
  overflow: hidden;
  position: relative;
}

.theme-light .testimonials-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%, #f8f9fa 100%);
}

.theme-dark .testimonials-section {
  background: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 25%, #1a1a1a 50%, #1e1e1e 75%, #1a1a1a 100%);
}

.testimonials-wrapper {
  position: relative;
  overflow: hidden;
  margin-top: 60px;
}

.testimonials-wrapper::before,
.testimonials-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 150px;
  z-index: 10;
  pointer-events: none;
}

.testimonials-wrapper::before {
  left: 0;
}

.theme-light .testimonials-wrapper::before {
  background: linear-gradient(to right, #f8f9fa 0%, rgba(248, 249, 250, 0.8) 30%, rgba(248, 249, 250, 0) 100%);
}

.theme-dark .testimonials-wrapper::before {
  background: linear-gradient(to right, #1a1a1a 0%, rgba(26, 26, 26, 0.8) 30%, rgba(26, 26, 26, 0) 100%);
}

.testimonials-wrapper::after {
  right: 0;
}

.theme-light .testimonials-wrapper::after {
  background: linear-gradient(to left, #f8f9fa 0%, rgba(248, 249, 250, 0.8) 30%, rgba(248, 249, 250, 0) 100%);
}

.theme-dark .testimonials-wrapper::after {
  background: linear-gradient(to left, #1a1a1a 0%, rgba(26, 26, 26, 0.8) 30%, rgba(26, 26, 26, 0) 100%);
}

.testimonials-scroll {
  display: flex;
  gap: 30px;
  animation: scrollTestimonials 20s linear infinite;
}

.testimonial-item {
  min-width: 220px;
  max-width: 220px;
  padding: 24px 20px;
  border-radius: 16px;
  text-align: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.theme-light .testimonial-item {
  background-color: #ffffff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.theme-dark .testimonial-item {
  background-color: #2d3748;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.testimonial-item:hover {
  transform: translateY(-5px);
}

.testimonial-item p {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
  font-style: italic;
  flex: 1;
  display: flex;
  align-items: center;
}

.theme-light .testimonial-item p {
  color: #4a5568;
}

.theme-dark .testimonial-item p {
  color: #e2e8f0;
}

.testimonial-author .name {
  display: block;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}

.theme-light .testimonial-author .name {
  color: #2d3748;
}

.theme-dark .testimonial-author .name {
  color: #f7fafc;
}

.testimonial-author .info {
  font-size: 12px;
}

.theme-light .testimonial-author .info {
  color: #718096;
}

.theme-dark .testimonial-author .info {
  color: #a0aec0;
}

@keyframes scrollTestimonials {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

/* 风采展示区域样式 */
.showcase-section {
  padding: 120px 0;
  overflow: hidden;
}

.theme-light .showcase-section {
  background-color: #ffffff;
}

.theme-dark .showcase-section {
  background-color: #2d3748;
}

.showcase-wrapper {
  position: relative;
  overflow: hidden;
  margin-top: 60px;
}

.showcase-wrapper::before,
.showcase-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 150px;
  z-index: 10;
  pointer-events: none;
}

.showcase-wrapper::before {
  left: 0;
}

.theme-light .showcase-wrapper::before {
  background: linear-gradient(to right, #ffffff 0%, rgba(255, 255, 255, 0.8) 30%, rgba(255, 255, 255, 0) 100%);
}

.theme-dark .showcase-wrapper::before {
  background: linear-gradient(to right, #2d3748 0%, rgba(45, 55, 72, 0.8) 30%, rgba(45, 55, 72, 0) 100%);
}

.showcase-wrapper::after {
  right: 0;
}

.theme-light .showcase-wrapper::after {
  background: linear-gradient(to left, #ffffff 0%, rgba(255, 255, 255, 0.8) 30%, rgba(255, 255, 255, 0) 100%);
}

.theme-dark .showcase-wrapper::after {
  background: linear-gradient(to left, #2d3748 0%, rgba(45, 55, 72, 0.8) 30%, rgba(45, 55, 72, 0) 100%);
}

.showcase-scroll {
  display: flex;
  gap: 30px;
  animation: scrollShowcase 25s linear infinite reverse;
}

.showcase-item {
  min-width: 320px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.theme-light .showcase-item {
  background-color: #f8f9fa;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.theme-dark .showcase-item {
  background-color: #1a202c;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.showcase-item:hover {
  transform: translateY(-8px);
}

.theme-light .showcase-item:hover {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.theme-dark .showcase-item:hover {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.showcase-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.showcase-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.showcase-item:hover .showcase-image img {
  transform: scale(1.08);
}

.showcase-content {
  padding: 30px;
  text-align: center;
}

.showcase-content h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
}

.theme-light .showcase-content h3 {
  color: #2d3748;
}

.theme-dark .showcase-content h3 {
  color: #f7fafc;
}

.showcase-content p {
  font-size: 14px;
  line-height: 1.6;
}

.theme-light .showcase-content p {
  color: #718096;
}

.theme-dark .showcase-content p {
  color: #a0aec0;
}

@keyframes scrollShowcase {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

/* 联系我们区域 */
.contact-section {
  padding: 120px 0;
  position: relative;
}

.theme-light .contact-section {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%);
}

.theme-dark .contact-section {
  background: linear-gradient(180deg, #1a1a1a 0%, #1e1e1e 50%, #1a1a1a 100%);
}

.contact-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.015;
  pointer-events: none;
}

.theme-light .contact-section::before {
  background: radial-gradient(ellipse at top, #667eea 0%, transparent 70%);
}

.theme-dark .contact-section::before {
  background: radial-gradient(ellipse at top, #4facfe 0%, transparent 70%);
}

.contact-content {
  max-width: 800px;
  margin: 0 auto;
}

.contact-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 60px;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.contact-item span {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.theme-light .contact-item span {
  color: #6b7280;
}

.theme-dark .contact-item span {
  color: #9ca3af;
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
  
  .teams-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding-top: 60px; /* 移动端的菜单高度较小 */
  }
  
  .hero-content {
    flex-direction: column;
    text-align: center;
    gap: 30px;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-subtitle {
    font-size: 16px;
  }
  
  .hero-description {
    font-size: 18px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 60px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .stat-item {
    border-right: none;
    border-bottom: 1px solid;
    padding: 30px 0;
    text-align: center;
  }
  
  .stat-item:last-child {
    border-bottom: none;
  }
  
  .curriculum-timeline {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .teams-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .partners-grid {
    flex-direction: column;
    gap: 40px;
  }
  
  .contact-info {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
  
  .feature-card {
    padding: 30px 20px;
  }
  
  .team-card {
    padding: 24px 20px;
  }
  
  .testimonial-item {
    min-width: 200px;
    max-width: 200px;
    padding: 20px 16px;
  }
  
  .showcase-item {
    min-width: 260px;
  }
  
  .showcase-content {
    padding: 20px;
  }
  
  .section-title {
    font-size: 28px;
    margin-bottom: 48px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 32px;
  }
  
  .hero-buttons {
    flex-direction: column;
    gap: 16px;
  }
  
  .btn {
    width: 100%;
    padding: 14px 28px;
    font-size: 14px;
  }
  
  .stat-number {
    font-size: 36px;
  }
  
  .section-title {
    font-size: 24px;
  }
  
  .feature-card {
    padding: 24px 16px;
  }
  
  .team-card {
    padding: 20px 16px;
  }
  
  .testimonial-item {
    min-width: 180px;
    max-width: 180px;
    padding: 16px 12px;
  }
  
  .testimonial-item p {
    font-size: 14px;
  }
  
  .showcase-item {
    min-width: 220px;
  }
  
  .showcase-image {
    height: 160px;
  }
  
  .showcase-content {
    padding: 16px;
  }
  
  .showcase-content h3 {
    font-size: 16px;
  }
  
  .showcase-content p {
    font-size: 13px;
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


</style>