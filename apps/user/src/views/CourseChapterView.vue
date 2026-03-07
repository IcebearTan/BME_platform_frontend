<template>
  <div class="course-chapter-view" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="top-bar-content">
        <!-- 返回按钮 -->
        <div class="back-button" @click="handleGoBack">
          <el-icon class="back-icon">
            <ArrowLeft />
          </el-icon>
          <span class="back-text">返回课程</span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧目录 -->
      <div class="sidebar-catalog" :class="{ 'collapsed': isCatalogCollapsed }">
        <div class="catalog-content" v-show="!isCatalogCollapsed">
          <div class="catalog-list">
            <div 
              v-for="(chapter, index) in filteredChapterList" 
              :key="chapter.id"
              class="catalog-chapter"
            >
              <!-- 父章节 -->
              <div 
                class="catalog-item parent-item"
                :class="{ 'expanded': chapter.expanded }"
                @click="toggleParentChapter(chapter)"
              >
                <div class="catalog-item-content">
                  <div class="catalog-item-text">
                    <span class="catalog-item-title">{{ chapter.title }}</span>
                  </div>
                  <el-icon class="expand-icon">
                    <ArrowDown v-if="chapter.expanded" />
                    <ArrowRight v-else />
                  </el-icon>
                </div>
              </div>
              
              <!-- 子章节 -->
              <div 
                v-if="chapter.subChapters && chapter.subChapters.length > 0" 
                class="sub-chapters"
                :class="{ 
                  'expanded': chapter.expanded,
                  'collapsed': !chapter.expanded 
                }"
              >
                <div 
                  v-for="(subChapter, subIndex) in chapter.subChapters"
                  :key="`${chapter.id}-${subIndex}`"
                  class="catalog-item sub-item"
                  :class="{ 
                    'active': subChapter.id === currentChapter?.id,
                    'completed': subChapter.completed,
                    'locked': subChapter.locked 
                  }"
                  @click="handleChapterSelect(subChapter, index, subIndex)"
                >
                  <div class="catalog-item-content">
                    <div class="catalog-item-text">
                      <span class="catalog-item-title">{{ subChapter.title }}</span>
                    </div>
                    <el-icon 
                      class="status-icon"
                      :class="{
                        'completed': subChapter.completed,
                        'locked': subChapter.locked
                      }"
                      v-if="subChapter.completed || subChapter.locked"
                    >
                      <Select v-if="subChapter.completed" />
                      <Lock v-else-if="subChapter.locked" />
                    </el-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <div class="content-wrapper" v-if="currentChapter">
          <!-- 章节标题 -->
          <div class="chapter-header">
            <div class="chapter-header-content">
              <div class="chapter-info">
                <h1 class="chapter-title-main">{{ currentChapter.title }}</h1>
                <p class="chapter-subtitle-main" v-if="currentChapter.subtitle">{{ currentChapter.subtitle }}</p>
              </div>
              <div class="chapter-meta">
                <div class="meta-item" v-if="currentChapter.duration">
                  <el-icon class="meta-icon"><Clock /></el-icon>
                  <span class="meta-text">{{ currentChapter.duration }}</span>
                </div>
                <div class="meta-item" v-if="currentChapter.progress !== undefined">
                  <el-icon class="meta-icon"><TrendCharts /></el-icon>
                  <span class="meta-text">{{ Math.round(currentChapter.progress) }}% 完成</span>
                </div>
                <div class="meta-item" v-if="!currentChapter.completed">
                  <el-button type="primary" size="small" @click="handleMarkCompleted">
                    <el-icon><Select /></el-icon>
                    标记完成
                  </el-button>
                </div>
                <div class="meta-item" v-else>
                  <el-tag type="success" size="large">
                    <el-icon><Select /></el-icon>
                    已完成
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 章节内容 -->
          <div class="chapter-content">
            <!-- 视频区域 -->
            <div class="video-section" v-if="currentChapter.videoUrl">
              <div class="video-container">
                <video 
                  :src="currentChapter.videoUrl" 
                  controls 
                  :poster="currentChapter.videoPoster"
                  @loadedmetadata="handleVideoLoaded"
                  @timeupdate="handleVideoProgress"
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            </div>

            <!-- 文档内容区域 -->
            <div class="document-section">
              <div class="document-content" v-html="currentChapter.content"></div>
            </div>

            <!-- 相关题目区域 -->
            <div class="questions-section" v-if="currentChapter.questions && currentChapter.questions.length > 0">
              <div class="section-header">
                <h3>相关题目</h3>
                <el-button type="primary" @click="handleAllQuestions">
                  查看全部题目
                </el-button>
              </div>
              
              <div class="questions-grid">
                <div 
                  v-for="question in currentChapter.questions.slice(0, 6)" 
                  :key="question.id"
                  class="question-card"
                  @click="handleQuestionClick(question)"
                >
                  <div class="question-type">
                    {{ getQuestionTypeText(question.type) }}
                  </div>
                  <div class="question-title">
                    {{ question.title }}
                  </div>
                  <div class="question-difficulty">
                    <el-tag 
                      :type="getDifficultyTagType(question.difficulty)"
                      size="small"
                    >
                      {{ question.difficulty }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- 附件资源区域 -->
            <div class="resources-section" v-if="currentChapter.resources && currentChapter.resources.length > 0">
              <div class="section-header">
                <h3>课程资源</h3>
              </div>
              
              <div class="resources-list">
                <div 
                  v-for="resource in currentChapter.resources" 
                  :key="resource.id"
                  class="resource-item"
                  @click="handleResourceDownload(resource)"
                >
                  <el-icon class="resource-icon">
                    <Document v-if="resource.type === 'pdf'" />
                    <Picture v-else-if="resource.type === 'image'" />
                    <VideoPlay v-else-if="resource.type === 'video'" />
                    <Link v-else />
                  </el-icon>
                  <div class="resource-info">
                    <span class="resource-name">{{ resource.name }}</span>
                    <span class="resource-size">{{ resource.size }}</span>
                  </div>
                  <el-icon class="download-icon">
                    <Download />
                  </el-icon>
                </div>
              </div>
            </div>

            <!-- 章节导航 -->
            <div class="chapter-navigation">
              <el-button 
                :disabled="!hasPrevChapter" 
                @click="handlePrevChapter"
                :icon="ArrowLeft"
              >
                上一章节
              </el-button>
              
              <el-button 
                type="primary" 
                :disabled="!hasNextChapter" 
                @click="handleNextChapter"
              >
                下一章节
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-else>
          <el-empty description="请选择要学习的章节" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { 
  ArrowLeft, 
  ArrowRight,
  ArrowDown,
  Document, 
  Select, 
  Lock, 
  Picture,
  VideoPlay,
  Link,
  Download,
  Clock,
  TrendCharts
} from '@element-plus/icons-vue';

// 路由和状态管理
const router = useRouter();
const route = useRoute();
const store = useStore();

// 响应式数据
const isDarkMode = computed(() => store.state.isDarkMode);
const isCatalogCollapsed = ref(false);
const currentChapter = ref(null);
const currentChapterIndex = ref(0);
const videoProgress = ref(0);

// 章节列表数据 (实际开发中从API获取)
const chapterList = ref([
  {
    id: 1,
    title: '生物医学工程基础',
    isParent: true,
    expanded: true,
    subChapters: [
      {
        id: 11,
        title: '生物医学工程概述',
        subtitle: '了解生物医学工程的基本概念和发展历程',
        duration: '45分钟',
        completed: true,
        locked: false,
        progress: 100,
        videoUrl: '/videos/chapter1.mp4',
        videoPoster: '/images/chapter1-poster.jpg',
        content: `
          <h2>1.1 生物医学工程的定义</h2>
          <p>生物医学工程是运用工程学的理论和技术来解决生物学和医学问题的交叉学科...</p>
          <h2>1.2 发展历史</h2>
          <p>生物医学工程作为一门独立学科的发展可以追溯到20世纪中叶...</p>
        `,
        questions: [
          { 
            id: 1, 
            title: '生物医学工程的定义是什么？', 
            type: 'choice', 
            difficulty: '简单' 
          },
          { 
            id: 2, 
            title: '简述生物医学工程的发展历程', 
            type: 'essay', 
            difficulty: '中等' 
          }
        ],
        resources: [
          { 
            id: 1, 
            name: '生物医学工程导论.pdf', 
            type: 'pdf', 
            size: '2.5MB',
            url: '/resources/chapter1.pdf'
          }
        ]
      },
      {
        id: 12,
        title: '学科发展前沿',
        subtitle: '探索生物医学工程的最新发展趋势',
        duration: '35分钟',
        completed: false,
        locked: false,
        progress: 0,
        videoUrl: '/videos/chapter12.mp4',
        content: `
          <h2>1.3 前沿技术</h2>
          <p>人工智能在生物医学工程中的应用...</p>
        `,
        questions: [],
        resources: []
      }
    ]
  },
  {
    id: 2,
    title: '医学信号处理',
    isParent: true,
    expanded: true,
    subChapters: [
      {
        id: 21,
        title: '医学信号处理基础',
        subtitle: '学习医学信号的特点和处理方法',
        duration: '60分钟',
        completed: false,
        locked: false,
        progress: 30,
        videoUrl: '/videos/chapter2.mp4',
        content: `
          <h2>2.1 医学信号的分类</h2>
          <p>医学信号可以分为生理信号和病理信号...</p>
        `,
        questions: [
          { 
            id: 3, 
            title: '医学信号有哪些分类？', 
            type: 'choice', 
            difficulty: '中等' 
          }
        ],
        resources: []
      },
      {
        id: 22,
        title: '数字滤波技术',
        subtitle: '掌握医学信号的数字滤波方法',
        duration: '50分钟',
        completed: false,
        locked: true,
        progress: 0,
        content: '',
        questions: [],
        resources: []
      },
      {
        id: 23,
        title: '频域分析',
        subtitle: '学习医学信号的频域特征分析',
        duration: '55分钟',
        completed: false,
        locked: true,
        progress: 0,
        content: '',
        questions: [],
        resources: []
      }
    ]
  },
  {
    id: 3,
    title: '医学图像处理',
    isParent: true,
    expanded: false,
    subChapters: [
      {
        id: 31,
        title: '医学图像处理技术',
        subtitle: '掌握医学图像的获取、处理和分析技术',
        duration: '75分钟',
        completed: false,
        locked: true,
        progress: 0,
        content: '',
        questions: [],
        resources: []
      },
      {
        id: 32,
        title: '图像分割与识别',
        subtitle: '学习医学图像的分割和识别算法',
        duration: '65分钟',
        completed: false,
        locked: true,
        progress: 0,
        content: '',
        questions: [],
        resources: []
      }
    ]
  }
]);

// 获取所有子章节的平铺数组
const flatChapters = computed(() => {
  const chapters = [];
  chapterList.value.forEach(parent => {
    if (parent.subChapters) {
      chapters.push(...parent.subChapters);
    }
  });
  return chapters;
});

// 计算属性
const filteredChapterList = computed(() => {
  return chapterList.value;
});

const hasPrevChapter = computed(() => currentChapterIndex.value > 0);

const hasNextChapter = computed(() => 
  currentChapterIndex.value < flatChapters.value.length - 1 && 
  !flatChapters.value[currentChapterIndex.value + 1]?.locked
);

// 方法
const handleGoBack = () => {
  router.go(-1);
};

const toggleCatalog = () => {
  isCatalogCollapsed.value = !isCatalogCollapsed.value;
};

const toggleParentChapter = (parent) => {
  parent.expanded = !parent.expanded;
};

const handleChapterSelect = (chapter, index) => {
  if (chapter.locked) {
    ElMessage.warning('请完成前面的章节后再学习此章节');
    return;
  }
  
  currentChapter.value = chapter;
  currentChapterIndex.value = flatChapters.value.findIndex(c => c.id === chapter.id);
  
  // 更新路由参数
  router.replace({
    query: { ...route.query, chapterId: chapter.id }
  });
};

const handlePrevChapter = () => {
  if (hasPrevChapter.value) {
    const prevIndex = currentChapterIndex.value - 1;
    handleChapterSelect(flatChapters.value[prevIndex], prevIndex);
  }
};

const handleNextChapter = () => {
  if (hasNextChapter.value) {
    const nextIndex = currentChapterIndex.value + 1;
    handleChapterSelect(flatChapters.value[nextIndex], nextIndex);
  }
};

const handleMarkCompleted = () => {
  if (currentChapter.value) {
    currentChapter.value.completed = true;
    currentChapter.value.progress = 100;
    
    // 解锁下一章节
    const nextIndex = currentChapterIndex.value + 1;
    if (nextIndex < flatChapters.value.length) {
      flatChapters.value[nextIndex].locked = false;
    }
    
    ElMessage.success('章节已标记为完成！');
  }
};

const handleVideoLoaded = (event) => {
  console.log('视频加载完成:', event);
};

const handleVideoProgress = (event) => {
  const video = event.target;
  const progress = (video.currentTime / video.duration) * 100;
  videoProgress.value = progress;
  
  // 自动更新章节进度
  if (currentChapter.value && progress > currentChapter.value.progress) {
    currentChapter.value.progress = Math.min(progress, 100);
  }
};

const handleQuestionClick = (question) => {
  // 跳转到题目详情页面
  router.push({
    name: 'QuestionDetail',
    params: { id: question.id },
    query: { 
      from: 'chapter',
      chapterId: currentChapter.value?.id 
    }
  });
};

const handleAllQuestions = () => {
  // 跳转到章节题目列表页面
  router.push({
    name: 'ChapterQuestions',
    params: { chapterId: currentChapter.value?.id }
  });
};

const handleResourceDownload = (resource) => {
  // 处理资源下载
  const link = document.createElement('a');
  link.href = resource.url;
  link.download = resource.name;
  link.click();
};

const getQuestionTypeText = (type) => {
  const typeMap = {
    'choice': '选择题',
    'essay': '问答题',
    'fill': '填空题',
    'judge': '判断题'
  };
  return typeMap[type] || '未知类型';
};

const getDifficultyTagType = (difficulty) => {
  const typeMap = {
    '简单': 'success',
    '中等': 'warning',
    '困难': 'danger'
  };
  return typeMap[difficulty] || 'info';
};

// 生命周期
onMounted(() => {
  // 从路由参数初始化当前章节
  const chapterId = route.query.chapterId;
  if (chapterId) {
    const chapter = flatChapters.value.find(c => c.id === parseInt(chapterId));
    if (chapter && !chapter.locked) {
      handleChapterSelect(chapter);
    }
  }
  
  // 如果没有指定章节，默认选择第一个可用章节
  if (!currentChapter.value) {
    const firstAvailableChapter = flatChapters.value.find(c => !c.locked);
    if (firstAvailableChapter) {
      handleChapterSelect(firstAvailableChapter);
    }
  }
});

// 键盘快捷键
const handleKeydown = (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handlePrevChapter();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleNextChapter();
        break;
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* --- 整体布局 --- */
.course-chapter-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  color: #333333;
  overflow: hidden;
}

.theme-dark .course-chapter-view {
  background: #1f1f1f;
  color: #e5e5e5;
}

/* --- 顶部栏 --- */
.top-bar {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}

.theme-dark .top-bar {
  background: #252525;
  border-bottom: 1px solid #363636;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.top-bar-content {
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #606266;
  background: #f5f7fa;
}

.back-button:hover {
  background: #e8ecf0;
  color: #303133;
  transform: translateX(-2px);
}

.theme-dark .back-button {
  color: #b0b0b0;
  background: #2d2d2d;
}

.theme-dark .back-button:hover {
  background: #3a3a3a;
  color: #e5e5e5;
}

.back-icon {
  font-size: clamp(16px, 3vw, 18px);
}

.back-text {
  font-weight: 500;
  font-size: clamp(13px, 2.5vw, 15px);
}

.chapter-title {
  flex: 1;
  text-align: center;
  margin: 0 40px;
}

.chapter-title h1 {
  margin: 0 0 4px 0;
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .chapter-title h1 {
  color: #f0f0f0;
}

.chapter-subtitle {
  margin: 0;
  font-size: clamp(12px, 2.5vw, 14px);
  color: #666666;
}

.theme-dark .chapter-subtitle {
  color: #b0b0b0;
}

.progress-indicator {
  width: 200px;
  text-align: right;
}

.progress-text {
  display: block;
  font-size: clamp(10px, 2vw, 12px);
  color: #888888;
  margin-bottom: 4px;
}

.theme-dark .progress-text {
  color: #b0b0b0;
}

/* --- 主内容区 --- */
.main-content {
  flex: 1;
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* --- 左侧目录 --- */
.sidebar-catalog {
  width: 320px;
  background: #ffffff;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s ease;
  /* 添加柔和的阴影效果 */
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.03);
}

.sidebar-catalog.collapsed {
  width: 60px;
}

.theme-dark .sidebar-catalog {
  background: #252525;
  border-right: 1px solid #363636;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}

.catalog-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 16px;
  /* 添加柔和的渐变背景 */
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
}

.theme-dark .catalog-content {
  background: linear-gradient(180deg, #252525 0%, #1f1f1f 100%);
}

.catalog-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px;
}

/* 优化滚动条样式 - 更柔和 */
.catalog-list::-webkit-scrollbar {
  width: 6px;
}

.catalog-list::-webkit-scrollbar-track {
  background: transparent;
}

.catalog-list::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.catalog-list::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.theme-dark .catalog-list::-webkit-scrollbar-thumb {
  background: #404040;
}

.theme-dark .catalog-list::-webkit-scrollbar-thumb:hover {
  background: #505050;
}

/* 通用目录项样式 - 优化为更柔和的设计 */
.catalog-item {
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin: 3px 0;
  background-color: transparent;
  position: relative;
  /* 柔和的字体颜色 */
  color: #606266;
}

/* 左侧高亮条 - 关键设计元素 */
.catalog-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: #409eff;
  border-radius: 0 2px 2px 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.catalog-item:hover {
  background-color: #f5f7fa;
  color: #303133;
}

.theme-dark .catalog-item:hover {
  background-color: #2d2d2d;
  color: #e5e5e5;
}

/* 当前激活的章节 - 蓝色高亮条 */
.catalog-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.catalog-item.active::before {
  height: 24px;
  opacity: 1;
}

.catalog-item.active .catalog-item-title {
  color: #303133;
  font-weight: 600;
}

.theme-dark .catalog-item.active {
  background-color: #1a3a5c;
  color: #7db3ff;
}

.theme-dark .catalog-item.active .catalog-item-title {
  color: #ffffff;
}

.catalog-item.active .expand-icon {
  color: #409eff !important;
}

.catalog-item.active .status-icon {
  color: #409eff !important;
}

.catalog-item.active .status-icon.completed {
  color: #67c23a !important;
}

.catalog-item.active .status-icon.locked {
  color: #909399 !important;
}

.theme-dark .catalog-item {
  color: #b0b0b0;
}

.theme-dark .catalog-item.active .expand-icon {
  color: #7db3ff !important;
}

.theme-dark .catalog-item.active .status-icon {
  color: #7db3ff !important;
}

.theme-dark .catalog-item.active .status-icon.completed {
  color: #67c23a !important;
}

.theme-dark .catalog-item.active .status-icon.locked {
  color: #6b7280 !important;
}

/* 父章节样式 - 更柔和的设计 */
.catalog-item.parent-item {
  padding: 14px 14px;
  font-weight: 600;
  margin: 6px 0 3px 0;
  color: #303133;
  font-size: 14px;
}

.theme-dark .catalog-item.parent-item {
  color: #e5e5e5;
}

.catalog-item.parent-item:hover {
  background-color: #f5f7fa;
}

.theme-dark .catalog-item.parent-item:hover {
  background-color: #2d2d2d;
}

.catalog-item.parent-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.theme-dark .catalog-item.parent-item.active {
  background-color: #1a3a5c;
  color: #7db3ff;
}

/* 子章节样式 - 更柔和的设计 */
.catalog-item.sub-item {
  margin-left: 6px;
  margin-right: 0;
  padding: 10px 12px;
  font-size: 13px;
  border-left: 1px solid transparent;
}

.catalog-item.sub-item:hover {
  background-color: #f5f7fa;
}

.theme-dark .catalog-item.sub-item:hover {
  background-color: #2d2d2d;
}

.catalog-item.sub-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.catalog-item.sub-item.completed {
  opacity: 0.85;
}

.theme-dark .catalog-item.sub-item.completed {
  opacity: 0.7;
}

/* 子章节与父章节的连接线 - 增加层次感 */
.catalog-item.sub-item::after {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  width: 6px;
  height: 1px;
  background-color: #dcdfe6;
}

.theme-dark .catalog-item.sub-item::after {
  background-color: #404040;
}

.catalog-item.sub-item.active::after {
  background: linear-gradient(90deg, #409eff 0%, #dcdfe6 100%);
}

.theme-dark .catalog-item.sub-item.active::after {
  background: linear-gradient(90deg, #409eff 0%, #404040 100%);
}

/* 子章节折叠/展开动画 - 更柔和的效果 */
.sub-chapters {
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sub-chapters.collapsed {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

.sub-chapters.expanded {
  max-height: 1000px;
  opacity: 1;
  margin-top: 4px;
}

.catalog-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.catalog-item-text {
  flex: 1;
  /* 添加细微的文字阴影增加层次感 */
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.theme-dark .catalog-item-text {
  text-shadow: none;
}

.catalog-item-title {
  display: block;
  font-weight: 500;
  line-height: 1.4;
  font-size: clamp(12px, 2vw, 14px);
  color: #303133;
  transition: color 0.25s ease;
}

.theme-dark .catalog-item-title {
  color: #e5e5e5;
}

.expand-icon {
  font-size: clamp(11px, 1.8vw, 12px);
  color: #c0c4cc;
  transition: all 0.25s ease;
}

.theme-dark .expand-icon {
  color: #606266;
}

.status-icon {
  font-size: clamp(12px, 2vw, 14px);
  color: #67c23a;
  /* 添加柔和的光晕效果 */
  filter: drop-shadow(0 0 2px rgba(103, 194, 58, 0.3));
}

.status-icon.completed {
  color: #67c23a !important;
}

.status-icon.locked {
  color: #c0c4cc !important;
  filter: none;
}

.theme-dark .status-icon {
  color: #67c23a;
}

.theme-dark .status-icon.completed {
  color: #67c23a !important;
}

.theme-dark .status-icon.locked {
  color: #606266 !important;
}

/* --- 右侧内容区 --- */
.content-area {
  flex: 1;
  overflow-y: auto;
  background: #fafafa;
}

.theme-dark .content-area {
  background: #1f1f1f;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* --- 章节标题区域 --- */
.chapter-header {
  padding: 20px 0 16px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 24px;
}

.theme-dark .chapter-header {
  border-bottom: 1px solid #3a3a3a;
}

.chapter-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.chapter-info {
  flex: 1;
}

.chapter-title-main {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1a1a1a;
  line-height: 1.3;
}

.theme-dark .chapter-title-main {
  color: #ffffff;
}

.chapter-subtitle-main {
  font-size: clamp(13px, 2.5vw, 15px);
  color: #666666;
  margin: 0;
  line-height: 1.4;
}

.theme-dark .chapter-subtitle-main {
  color: #b0b0b0;
}

.chapter-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-icon {
  font-size: 14px;
  color: #666666;
}

.theme-dark .meta-icon {
  color: #b0b0b0;
}

.meta-text {
  font-size: clamp(12px, 2.2vw, 13px);
  color: #666666;
  font-weight: 500;
}

.theme-dark .meta-text {
  color: #b0b0b0;
}

.chapter-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* --- 视频区域 --- */
.video-section {
  padding: 0 0 32px 0;
  border-bottom: 1px solid #f0f0f0;
}

.theme-dark .video-section {
  border-bottom: 1px solid #3a3a3a;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000000;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* --- 文档内容区域 --- */
.document-section {
  padding: 0 0 32px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 32px;
}

.theme-dark .document-section {
  border-bottom: 1px solid #3a3a3a;
}

.document-content {
  line-height: 1.8;
  color: #333333;
  font-size: clamp(14px, 2.5vw, 16px);
}

.theme-dark .document-content {
  color: #e5e5e5;
}

.document-content :deep(h2) {
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 600;
  margin: 32px 0 16px 0;
  color: #1a1a1a;
}

.theme-dark .document-content :deep(h2) {
  color: #ffffff;
}

.document-content :deep(h3) {
  font-size: clamp(16px, 3.5vw, 20px);
  font-weight: 600;
  margin: 24px 0 12px 0;
  color: #333333;
}

.theme-dark .document-content :deep(h3) {
  color: #e5e5e5;
}

.document-content :deep(p) {
  margin: 16px 0;
}

/* --- 题目区域 --- */
.questions-section {
  padding: 0 0 32px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 32px;
}

.theme-dark .questions-section {
  border-bottom: 1px solid #3a3a3a;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.theme-dark .section-header {
  border-bottom: 1px solid #3a3a3a;
}

.section-header h3 {
  margin: 0;
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #333333;
}

.theme-dark .section-header h3 {
  color: #e5e5e5;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.question-card {
  background: transparent;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.question-card:hover {
  background: #f8f8f8;
}

.theme-dark .question-card {
  background: transparent;
}

.theme-dark .question-card:hover {
  background: #3a3a3a;
}

.question-type {
  font-size: clamp(10px, 2vw, 12px);
  color: #666666;
  font-weight: 500;
  margin-bottom: 8px;
}

.theme-dark .question-type {
  color: #b0b0b0;
}

.question-title {
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 12px;
  color: #333333;
  font-size: clamp(13px, 2.5vw, 15px);
}

.theme-dark .question-title {
  color: #e5e5e5;
}

.question-difficulty {
  text-align: right;
}

/* --- 资源区域 --- */
.resources-section {
  padding: 0;
}

.resources-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: #f8f8f8;
}

.theme-dark .resource-item {
  background: transparent;
}

.theme-dark .resource-item:hover {
  background: #3a3a3a;
}

.resource-icon {
  font-size: 18px;
  color: #666666;
}

.theme-dark .resource-icon {
  color: #b0b0b0;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resource-name {
  font-weight: 500;
  color: #333333;
  font-size: clamp(13px, 2.5vw, 15px);
}

.theme-dark .resource-name {
  color: #e5e5e5;
}

.resource-size {
  font-size: clamp(10px, 2vw, 12px);
  color: #888888;
}

.theme-dark .resource-size {
  color: #b0b0b0;
}

.download-icon {
  font-size: 16px;
  color: #888888;
}

.theme-dark .download-icon {
  color: #b0b0b0;
}

/* --- 空状态 --- */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* --- 章节导航 --- */
.chapter-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid #f0f0f0;
}

.theme-dark .chapter-navigation {
  border-top: 1px solid #3a3a3a;
}

/* --- 响应式设计 --- */

/* 平板设备 */
@media (max-width: 1024px) {
  .sidebar-catalog {
    width: 320px;
  }
  
  .content-wrapper {
    padding: 28px 24px;
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  .top-bar-content {
    padding: 0 16px;
  }
  
  .main-content {
    flex-direction: column;
  }
  
  .sidebar-catalog {
    width: 100%;
    max-height: 180px;
    order: 2;
  }
  
  .content-area {
    order: 1;
  }
  
  .content-wrapper {
    padding: 20px 16px;
  }
  
  .chapter-header {
    padding: 20px 0;
    margin-bottom: 24px;
  }
  
  .chapter-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .questions-grid {
    grid-template-columns: 1fr;
  }
  
  .chapter-navigation {
    flex-direction: column;
    gap: 16px;
    padding-top: 20px;
  }
  
  .nav-left, .nav-right {
    width: 100%;
    justify-content: center;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .content-wrapper {
    padding: 16px 12px;
  }
  
  .chapter-header {
    padding: 16px 0 12px 0;
    margin-bottom: 16px;
  }
  
  .chapter-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .chapter-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .chapter-content {
    gap: 24px;
  }
  
  .video-section,
  .document-section,
  .questions-section,
  .resources-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
  }
}

/* 超小屏设备 */
@media (max-width: 360px) {
  .content-wrapper {
    padding: 12px 8px;
  }
  
  .catalog-item {
    padding: 8px 16px;
  }
  
  .catalog-item.parent-item {
    padding: 12px 16px;
  }
  
  .catalog-item.sub-item {
    padding: 8px 12px;
    margin-left: 16px;
  }
}
</style>