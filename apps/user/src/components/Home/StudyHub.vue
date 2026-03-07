<template>
  <div :class="['study-hub-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <!-- 轮播Banner区域 -->
    <div class="banner-section">
      <el-carousel 
        :interval="4000" 
        type="card" 
        height="200px"
        indicator-position="outside"
        arrow="hover"
      >
        <el-carousel-item v-for="(banner, index) in banners" :key="index">
          <div class="banner-item" @click="handleBannerClick(banner)">
            <div class="banner-overlay">
              <h3 class="banner-title">{{ banner.title }}</h3>
              <p class="banner-description">{{ banner.description }}</p>
            </div>
            <img :src="banner.image" :alt="banner.title" class="banner-image" />
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>

    <!-- 学习功能入口区域 -->
    <div class="study-entries">
      <div class="section-header">
        <h3 class="section-title">
          <span class="title-icon">🎓</span>
          <span>学习入口</span>
        </h3>
      </div>
      
      <div class="entries-grid">
        <div 
          v-for="entry in studyEntries" 
          :key="entry.id"
          :class="['entry-card', { 'disabled': entry.disabled }]"
          @click="handleEntryClick(entry)"
        >
          <div class="entry-icon-wrapper">
            <div class="entry-icon">{{ entry.icon }}</div>
          </div>
          <div class="entry-content">
            <h4 class="entry-title">{{ entry.title }}</h4>
            <p class="entry-description">{{ entry.description }}</p>
          </div>
          <div class="entry-arrow">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElCarousel, ElCarouselItem, ElIcon } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import bgImage from '../../assets/back_groud.jpg'

const store = useStore()
const router = useRouter()

// 获取主题状态
const isDarkMode = computed(() => store.getters.isDarkMode)

// 轮播Banner数据
const banners = ref([
  {
    id: 1,
    title: '开启学习之旅',
    description: '探索丰富的课程内容，提升你的技能',
    image: bgImage,
    route: '/study'
  },
  {
    id: 2,
    title: '加入学习小组',
    description: '与同学一起学习，共同进步',
    image: bgImage,
    route: '/group'
  },
  {
    id: 3,
    title: '技能认证考核',
    description: '通过考核验证你的学习成果',
    image: bgImage,
    route: '/exam'
  }
])

// 学习功能入口数据
const studyEntries = ref([
  {
    id: 'courses',
    title: '课程',
    description: '系统化的课程学习',
    icon: '📚',
    route: '/study',
    color: '#409EFF'
  },
  {
    id: 'question-bank',
    title: '题库',
    description: '练习巩固知识点',
    icon: '📝',
    route: '/question-bank',
    color: '#67C23A'
  },
  {
    id: 'groups',
    title: '学习小组',
    description: '协作学习与交流',
    icon: '👥',
    route: '/group',
    color: '#E6A23C'
  },
  {
    id: 'exams',
    title: '考核评估',
    description: '检验学习效果',
    icon: '✅',
    route: '/exam',
    color: '#F56C6C'
  },
  {
    id: 'resources',
    title: '学习资源',
    description: '丰富的学习材料',
    icon: '📖',
    route: '/resources',
    color: '#909399',
    disabled: true // 未来功能
  }
])

// 事件处理
const emit = defineEmits(['banner-click', 'entry-click'])

const handleBannerClick = (banner) => {
  if (banner.route) {
    router.push(banner.route)
  }
  emit('banner-click', banner)
}

const handleEntryClick = (entry) => {
  if (entry.disabled) {
    // 可以显示提示信息
    console.log('功能即将上线')
    return
  }
  
  if (entry.route) {
    router.push(entry.route)
  }
  emit('entry-click', entry)
}

onMounted(() => {
  // 组件挂载时的初始化逻辑
})
</script>

<style scoped>
.study-hub-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: all 0.3s ease;
}

/* Banner区域样式 */
.banner-section {
  width: 100%;
  position: relative;
  overflow: visible;
}

.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: visible;
}

.banner-item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 20px;
  z-index: 2;
  border-radius: 12px;
}

.banner-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.banner-description {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 学习入口区域样式 */
.study-entries {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  transition: color 0.3s ease;
}

.theme-light .section-title {
  color: #1a1a1a;
}

.theme-dark .section-title {
  color: #ffffff;
}

.title-icon {
  font-size: 22px;
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 一行两个 */
  gap: 12px;
}

.entry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 16px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 120px; /* 保证卡片高度一致 */
}

.theme-light .entry-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.theme-dark .entry-card {
  background: #2c2c2c;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.entry-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.theme-dark .entry-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.entry-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.entry-card.disabled:hover {
  transform: none;
}

.entry-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.theme-light .entry-icon-wrapper {
  background: rgba(64, 158, 255, 0.1);
}

.theme-dark .entry-icon-wrapper {
  background: rgba(64, 158, 255, 0.2);
}

.entry-icon {
  font-size: 28px;
}

.entry-content {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.entry-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px 0;
  transition: color 0.3s ease;
  line-height: 1.2;
}

.theme-light .entry-title {
  color: #1a1a1a;
}

.theme-dark .entry-title {
  color: #ffffff;
}

.entry-description {
  font-size: 12px;
  margin: 0;
  line-height: 1.3;
  transition: color 0.3s ease;
  opacity: 0.8;
}

.theme-light .entry-description {
  color: #666666;
}

.theme-dark .entry-description {
  color: #cccccc;
}

.entry-arrow {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.theme-light .entry-arrow {
  color: #409EFF;
}

.theme-dark .entry-arrow {
  color: #409EFF;
}

.entry-card:hover .entry-arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}

/* 轮播组件样式修复 - 允许悬停时放大效果溢出显示 */
:deep(.el-carousel) {
  overflow: visible !important;
}

:deep(.el-carousel__container) {
  overflow: visible !important;
}

:deep(.el-carousel__item--card) {
  overflow: visible !important;
}

:deep(.el-carousel__item--card.is-active) {
  z-index: 2;
}

:deep(.el-carousel__item) {
  overflow: visible;
}

/* 轮播组件主题适配 */
:deep(.el-carousel__indicator) {
  transition: all 0.3s ease;
}

.theme-light :deep(.el-carousel__indicator button) {
  background-color: rgba(0, 0, 0, 0.3);
}

.theme-dark :deep(.el-carousel__indicator button) {
  background-color: rgba(255, 255, 255, 0.4);
}

.theme-light :deep(.el-carousel__indicator.is-active button) {
  background-color: #409EFF;
}

.theme-dark :deep(.el-carousel__indicator.is-active button) {
  background-color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .banner-title {
    font-size: 20px;
  }
  
  .banner-description {
    font-size: 14px;
  }
  
  .entry-card {
    padding: 14px 10px;
    min-height: 110px;
  }
  
  .entry-icon-wrapper {
    width: 52px;
    height: 52px;
  }
  
  .entry-icon {
    font-size: 26px;
  }
  
  .entry-title {
    font-size: 14px;
  }
  
  .entry-description {
    font-size: 11px;
  }
}

@media (max-width: 900px) {
  .study-hub-container {
    gap: 20px;
  }
  
  .banner-section :deep(.el-carousel) {
    height: 160px;
  }
  
  .banner-title {
    font-size: 18px;
  }
  
  .banner-description {
    font-size: 13px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .entries-grid {
    grid-template-columns: repeat(2, 1fr); /* 保持2列 */
    gap: 10px;
  }
  
  .entry-card {
    padding: 12px 8px;
    min-height: 100px;
  }
  
  .entry-icon-wrapper {
    width: 48px;
    height: 48px;
  }
  
  .entry-icon {
    font-size: 24px;
  }
  
  .entry-title {
    font-size: 13px;
  }
  
  .entry-description {
    font-size: 10px;
  }
}

@media (max-width: 768px) {
  .study-hub-container {
    gap: 16px;
  }
  
  .banner-section :deep(.el-carousel) {
    height: 140px;
  }
  
  .banner-overlay {
    padding: 16px;
  }
  
  .banner-title {
    font-size: 16px;
  }
  
  .banner-description {
    font-size: 12px;
  }
  
  .entries-grid {
    grid-template-columns: repeat(2, 1fr); /* 小屏也保持2列 */
    gap: 8px;
  }
  
  .entry-card {
    padding: 10px 6px;
    border-radius: 8px;
    min-height: 90px;
  }
  
  .entry-icon-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 10px;
  }
  
  .entry-icon {
    font-size: 22px;
  }
  
  .entry-title {
    font-size: 12px;
    margin-bottom: 4px;
  }
  
  .entry-description {
    font-size: 9px;
  }
  
  .entry-arrow {
    width: 16px;
    height: 16px;
    top: 8px;
    right: 8px;
  }
}

/* 进入动画 */
.study-hub-container {
  animation: slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>