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
              <div class="nav-left">
                <el-button 
                  :disabled="!hasPrevChapter" 
                  @click="handlePrevChapter"
                  :icon="ArrowLeft"
                >
                  上一章节
                </el-button>
              </div>
              
              <div class="nav-center">
                <el-button @click="handleMarkCompleted" v-if="!currentChapter.completed">
                  标记为完成
                </el-button>
                <el-button type="success" disabled v-else>
                  <el-icon><Select /></el-icon>
                  已完成
                </el-button>
              </div>
              
              <div class="nav-right">
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
  Download
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  color: #333333;
}

.theme-dark .course-chapter-view {
  background: #1f1f1f;
  color: #e5e5e5;
}

/* --- 顶部栏 --- */
.top-bar {
  height: 80px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.theme-dark .top-bar {
  background: #2a2a2a;
  border-bottom: 1px solid #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.top-bar-content {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666666;
  background: #f5f5f5;
}

.back-button:hover {
  background: #e8e8e8;
  color: #333333;
}

.theme-dark .back-button {
  color: #b0b0b0;
  background: #3a3a3a;
}

.theme-dark .back-button:hover {
  background: #4a4a4a;
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
  min-height: calc(100vh - 160px);
}

/* --- 左侧目录 --- */
.sidebar-catalog {
  width: 380px;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar-catalog.collapsed {
  width: 60px;
}

.theme-dark .sidebar-catalog {
  background: #2a2a2a;
  border-right: 1px solid #404040;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
}

.catalog-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 20px;
}

.catalog-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* 通用目录项样式 */
.catalog-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 4px 0;
  background-color: transparent;
}

.catalog-item:hover {
  background-color: #f5f5f5;
}

.catalog-item.active {
  background-color: #333333;
  color: #ffffff;
}

.catalog-item.active .catalog-item-title {
  color: #ffffff;
}

.catalog-item.active .expand-icon {
  color: #ffffff !important;
}

.catalog-item.active .status-icon {
  color: #ffffff !important;
}

.catalog-item.active .status-icon.completed {
  color: #7dd3fc !important;
}

.catalog-item.active .status-icon.locked {
  color: #d1d5db !important;
}

.theme-dark .catalog-item {
  background-color: transparent;
}

.theme-dark .catalog-item:hover {
  background-color: #3a3a3a;
}

.theme-dark .catalog-item.active {
  background-color: #e5e5e5;
  color: #333333;
}

.theme-dark .catalog-item.active .catalog-item-title {
  color: #333333;
}

.theme-dark .catalog-item.active .expand-icon {
  color: #333333 !important;
}

.theme-dark .catalog-item.active .status-icon {
  color: #333333 !important;
}

.theme-dark .catalog-item.active .status-icon.completed {
  color: #22c55e !important;
}

.theme-dark .catalog-item.active .status-icon.locked {
  color: #6b7280 !important;
}

/* 父章节样式 */
.catalog-item.parent-item {
  padding: 14px 16px;
  font-weight: 600;
  margin: 6px 0;
}

/* 子章节样式 */
.catalog-item.sub-item {
  margin-left: 16px;
  margin-right: 0;
  padding: 10px 16px;
}

.catalog-item.sub-item.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.catalog-item.sub-item.completed {
  opacity: 0.8;
}

.theme-dark .catalog-item.sub-item.completed {
  opacity: 0.8;
}

/* 子章节折叠/展开动画 */
.sub-chapters {
  overflow: hidden;
  transition: all 0.3s ease;
}

.sub-chapters.collapsed {
  max-height: 0;
  opacity: 0;
}

.sub-chapters.expanded {
  max-height: 1000px;
  opacity: 1;
}

.catalog-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.catalog-item-text {
  flex: 1;
}

.catalog-item-title {
  display: block;
  font-weight: 500;
  line-height: 1.4;
  font-size: clamp(13px, 2.5vw, 16px);
}

.expand-icon {
  font-size: clamp(14px, 2.5vw, 16px);
  color: #666666;
  transition: transform 0.2s ease;
}

.theme-dark .expand-icon {
  color: #b0b0b0;
}

.status-icon {
  font-size: clamp(14px, 2.5vw, 16px);
  color: #666666;
}

.status-icon.completed {
  color: #52c41a !important;
}

.status-icon.locked {
  color: #d9d9d9 !important;
}

.theme-dark .status-icon {
  color: #b0b0b0;
}

.theme-dark .status-icon.completed {
  color: #73d13d !important;
}

.theme-dark .status-icon.locked {
  color: #595959 !important;
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
  padding: 32px;
}

.chapter-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* --- 视频区域 --- */
.video-section {
  padding: 0 0 40px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 40px;
}

.theme-dark .video-section {
  border-bottom: 1px solid #404040;
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
  padding: 0 0 40px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 40px;
}

.theme-dark .document-section {
  border-bottom: 1px solid #404040;
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
  padding: 0 0 40px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 40px;
}

.theme-dark .questions-section {
  border-bottom: 1px solid #404040;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.question-card {
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  background: #f0f0f0;
}

.theme-dark .question-card {
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
}

.theme-dark .question-card:hover {
  background: #404040;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
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
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
  transform: translateY(-1px);
}

.theme-dark .resource-item {
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
}

.theme-dark .resource-item:hover {
  background: #404040;
  border-color: #5a5a5a;
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
  padding-top: 40px;
  margin-top: 40px;
  border-top: 1px solid #e0e0e0;
}

.theme-dark .chapter-navigation {
  border-top: 1px solid #404040;
}

.nav-left, .nav-right, .nav-center {
  display: flex;
  align-items: center;
}

.nav-center {
  gap: 16px;
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
    max-height: 200px;
    order: 2;
  }
  
  .content-area {
    order: 1;
  }
  
  .content-wrapper {
    padding: 20px 16px;
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
  
  .nav-center {
    order: -1;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .content-wrapper {
    padding: 16px 12px;
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