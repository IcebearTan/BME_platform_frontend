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
              v-for="chapter in filteredChapterList"
              :key="chapter.id"
              class="catalog-chapter"
            >
              <!-- 一级章节（章）- 仅展开/折叠 -->
              <div
                class="catalog-item parent-item"
                :class="{ 'expanded': chapter.expanded, 'has-children': chapter.children && chapter.children.length > 0 }"
                @click="toggleParentChapter(chapter)"
              >
                <div class="catalog-item-content">
                  <div class="catalog-item-text">
                    <span class="catalog-item-title">{{ chapter.name }}</span>
                  </div>
                  <el-icon class="expand-icon" v-if="chapter.children && chapter.children.length > 0">
                    <ArrowDown v-if="chapter.expanded" />
                    <ArrowRight v-else />
                  </el-icon>
                </div>
              </div>

              <!-- 一级章节的直接课时（如果有） -->
              <div
                v-if="chapter.expanded && chapter.lessons && chapter.lessons.length > 0"
                class="level1-lessons"
              >
                <div
                  v-for="(lesson, lessonIndex) in chapter.lessons"
                  :key="`level1-lesson-${lesson.Lesson_Id || lesson.id}`"
                  class="catalog-item lesson-item"
                  :class="{
                    'active': currentLesson && (currentLesson.Lesson_Id || currentLesson.id) === (lesson.Lesson_Id || lesson.id),
                    'completed': lesson.Lesson_Is_Complete,
                    'locked': false
                  }"
                  @click="handleLessonSelect(lesson, chapter)"
                >
                  <div class="catalog-item-content">
                    <div class="catalog-item-text">
                      <span class="lesson-title">{{ lesson.Lesson_Name || lesson.Lesson_Title || lesson.title }}</span>
                    </div>
                    <el-icon
                      class="status-icon"
                      :class="{
                        'completed': lesson.Lesson_Is_Complete
                      }"
                      v-if="lesson.Lesson_Is_Complete"
                    >
                      <Select />
                    </el-icon>
                  </div>
                </div>
              </div>

              <!-- 二级章节（节）+ 课时列表 -->
              <div
                v-if="chapter.children && chapter.children.length > 0"
                class="sub-chapters"
                :class="{
                  'expanded': chapter.expanded,
                  'collapsed': !chapter.expanded
                }"
              >
                <div
                  v-for="(subChapter, subIndex) in chapter.children"
                  :key="`${chapter.id}-${subIndex}`"
                  class="sub-chapter-group"
                >
                  <!-- 二级章节标题 - 可展开/折叠 -->
                  <div
                    class="catalog-item sub-item sub-chapter-header"
                    :class="{
                      'has-children': subChapter.children && subChapter.children.length > 0,
                      'has-lessons': subChapter.lessons && subChapter.lessons.length > 0,
                      'expanded': subChapter.expanded
                    }"
                    @click="toggleSubChapter(subChapter)"
                  >
                    <div class="catalog-item-content">
                      <div class="catalog-item-text">
                        <span class="catalog-item-title">{{ subChapter.name }}</span>
                      </div>
                      <el-icon class="expand-icon" v-if="(subChapter.children && subChapter.children.length > 0) || (subChapter.lessons && subChapter.lessons.length > 0)">
                        <ArrowDown v-if="subChapter.expanded" />
                        <ArrowRight v-else />
                      </el-icon>
                    </div>
                  </div>

                  <!-- 三级章节 + 课时列表 - 根据二级章节展开状态显示 -->
                  <div
                    v-if="subChapter.expanded"
                    class="third-chapters"
                    :class="{ 'expanded': subChapter.expanded }"
                  >
                    <!-- 二级章节的直接课时（始终显示，只要它有课时） -->
                    <div
                      v-if="subChapter.lessons && subChapter.lessons.length > 0"
                      class="lesson-list"
                    >
                      <div
                        v-for="(lesson, lessonIndex) in subChapter.lessons"
                        :key="`lesson-${lesson.Lesson_Id || lesson.id}`"
                        class="catalog-item lesson-item"
                        :class="{
                          'active': currentLesson && (currentLesson.Lesson_Id || currentLesson.id) === (lesson.Lesson_Id || lesson.id),
                          'completed': lesson.Lesson_Is_Complete,
                          'locked': false
                        }"
                        @click="handleLessonSelect(lesson, subChapter)"
                      >
                        <div class="catalog-item-content">
                          <div class="catalog-item-text">
                            <span class="lesson-title">{{ lesson.Lesson_Name || lesson.Lesson_Title || lesson.title }}</span>
                          </div>
                          <el-icon
                            class="status-icon"
                            :class="{
                              'completed': lesson.Lesson_Is_Complete
                            }"
                            v-if="lesson.Lesson_Is_Complete"
                          >
                            <Select />
                          </el-icon>
                        </div>
                      </div>
                    </div>

                    <!-- 三级章节 -->
                    <div
                      v-for="(thirdChapter, thirdIndex) in (subChapter.children || [])"
                      :key="`${subChapter.id}-${thirdIndex}`"
                      class="third-chapter-group"
                    >
                      <!-- 三级章节标题 - 可展开/折叠 -->
                      <div
                        class="catalog-item third-item third-chapter-header"
                        :class="{
                          'has-lessons': thirdChapter.lessons && thirdChapter.lessons.length > 0,
                          'expanded': thirdChapter.expanded
                        }"
                        @click="toggleThirdChapter(thirdChapter)"
                      >
                        <div class="catalog-item-content">
                          <div class="catalog-item-text">
                            <span class="catalog-item-title">{{ thirdChapter.name }}</span>
                          </div>
                          <el-icon class="expand-icon" v-if="thirdChapter.lessons && thirdChapter.lessons.length > 0">
                            <ArrowDown v-if="thirdChapter.expanded" />
                            <ArrowRight v-else />
                          </el-icon>
                        </div>
                      </div>

                      <!-- 课时列表 - 根据三级章节展开状态显示 -->
                      <div
                        v-if="thirdChapter.lessons && thirdChapter.lessons.length > 0 && thirdChapter.expanded"
                        class="lesson-list"
                      >
                        <div
                          v-for="(lesson, lessonIndex) in thirdChapter.lessons"
                          :key="`lesson-${lesson.Lesson_Id || lesson.id}`"
                          class="catalog-item lesson-item"
                          :class="{
                            'active': currentLesson && (currentLesson.Lesson_Id || currentLesson.id) === (lesson.Lesson_Id || lesson.id),
                            'completed': lesson.Lesson_Is_Complete,
                            'locked': false
                          }"
                          @click="handleLessonSelect(lesson, thirdChapter)"
                        >
                          <div class="catalog-item-content">
                            <div class="catalog-item-text">
                              <span class="lesson-title">{{ lesson.Lesson_Name || lesson.Lesson_Title || lesson.title }}</span>
                            </div>
                            <el-icon
                              class="status-icon"
                              :class="{
                                'completed': lesson.Lesson_Is_Complete
                              }"
                              v-if="lesson.Lesson_Is_Complete"
                            >
                              <Select />
                            </el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <div class="content-wrapper" v-if="currentChapter || currentLesson">
          <!-- 章节标题 -->
          <div class="chapter-header">
            <div class="chapter-header-content">
              <div class="chapter-info">
                <!-- 使用 displayData 计算属性 -->
                <h1 class="chapter-title-main">{{ displayData.title }}</h1>
                <p class="chapter-subtitle-main" v-if="currentLesson && currentChapter">{{ currentChapter.name }}</p>
              </div>
              <div class="chapter-meta">
                <div class="meta-item" v-if="displayData.time">
                  <el-icon class="meta-icon"><Clock /></el-icon>
                  <span class="meta-text">{{ displayData.time }}</span>
                </div>
                <div class="meta-item" v-if="currentChapter?.progress !== undefined">
                  <el-icon class="meta-icon"><TrendCharts /></el-icon>
                  <span class="meta-text">{{ Math.round(currentChapter.progress) }}% 完成</span>
                </div>
                <div class="meta-item" v-if="currentChapter && !currentChapter.completed">
                  <el-button type="primary" size="small" @click="handleMarkCompleted">
                    <el-icon><Select /></el-icon>
                    标记完成
                  </el-button>
                </div>
                <div class="meta-item" v-else-if="currentChapter?.completed">
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
            <div class="video-section" v-if="displayData.videoUrl">
              <div class="video-container">
                <video
                  :src="displayData.videoUrl"
                  controls
                  :poster="displayData.cover"
                  @loadedmetadata="handleVideoLoaded"
                  @timeupdate="handleVideoProgress"
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            </div>

            <!-- 文档内容区域 -->
            <div class="document-section">
              <div class="document-content" v-html="displayData.content"></div>
            </div>

            <!-- 相关题目区域 -->
            <div class="questions-section" v-if="displayData.questions && displayData.questions.length > 0">
              <div class="section-header">
                <h3>相关题目</h3>
                <el-button type="primary" @click="handleAllQuestions">
                  查看全部题目
                </el-button>
              </div>
              
              <div class="questions-grid">
                <div 
                  v-for="question in displayData.questions.slice(0, 6)" 
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
            <div class="resources-section" v-if="displayData.resources && displayData.resources.length > 0">
              <div class="section-header">
                <h3>课程资源</h3>
              </div>
              
              <div class="resources-list">
                <div 
                  v-for="resource in displayData.resources" 
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

        <!-- 加载状态 -->
        <div class="loading-state" v-if="isLoading">
          <el-empty description="加载中..." />
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-else-if="!currentChapter && !currentLesson">
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
import api from '../api';
import { ElMessage } from 'element-plus';
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
const currentLesson = ref(null);
const currentChapterIndex = ref(0);
const videoProgress = ref(0);
const isLoading = ref(true);
const courseId = computed(() => route.params.courseId);

// 章节列表数据
const chapterList = ref([]);

// 从API获取真实数据
const fetchChapterData = async () => {
  if (!courseId.value) {
    ElMessage.error('课程ID不存在');
    return;
  }

  isLoading.value = true;
  try {
    // 获取章节列表
    const chapterRes = await api({
      url: '/course/chapter_list',
      method: 'get',
      params: { Course_Id: courseId.value }
    });

    // 获取课时列表（包含基本信息）
    const lessonRes = await api({
      url: '/course/lesson/list',
      method: 'get',
      params: { Course_Id: courseId.value }
    });

    // 获取学习进度（包含完成状态）
    let progressMap = {};
    try {
      const progressRes = await api({
        url: '/learningProgress/lesson/list',
        method: 'get',
        params: { Course_Id: courseId.value }
      });
      if (progressRes.data.code === 200 && progressRes.data.data) {
        progressRes.data.data.forEach(item => {
          progressMap[item.lesson_id] = item;
        });
      }
    } catch (e) {
      console.warn('获取学习进度失败，使用默认状态', e);
    }

    // 处理课时数据 - 合并基本信息与进度
    const lessonsMap = {};
    if (lessonRes.data.code === 200 && lessonRes.data.data) {
      lessonRes.data.data.forEach(item => {
        // 合并课时基本信息和学习进度
        const lessons = (item.lessons || []).map(lesson => {
          const progress = progressMap[lesson.id] || {};
          return {
            ...lesson,
            // 统一字段名
            Lesson_Id: lesson.id,
            Lesson_Name: lesson.title,
            Lesson_Title: lesson.title,
            Lesson_Content: lesson.content,
            Lesson_Time: lesson.duration ? `${lesson.duration}分钟` : '0分钟',
            Lesson_Video: lesson.resource_url,
            Lesson_Cover: '',
            // 学习进度状态
            Lesson_Is_Complete: progress.status === 'completed',
            lesson_progress: progress
          };
        });
        lessonsMap[item.Chapter_Id] = lessons;
      });
    }

    // 构建树形结构 - 与 CourseDetailsComponent 保持一致
    const chapters = chapterRes.data || [];
    const nodeMap = new Map();
    const rootNodes = [];

    // 初始化所有节点
    chapters.forEach(chapter => {
      // 获取该章节下的课时
      const chapterLessons = lessonsMap[chapter.Chapter_Id] || [];

      nodeMap.set(chapter.Chapter_Id, {
        id: chapter.Chapter_Id,
        title: chapter.Chapter_Name,
        name: chapter.Chapter_Name, // 兼容 ChapterTree 的 name 字段
        order: chapter.Chapter_Order,
        level: chapter.Chapter_Level,
        parentId: chapter.Chapter_Parent_Id,
        children: [],
        lessons: chapterLessons, // 课时数据
        expanded: true
      });
    });

    // 构建树形结构 - 根据 Chapter_Parent_Id 判断
    chapters.forEach(chapter => {
      const node = nodeMap.get(chapter.Chapter_Id);
      if (chapter.Chapter_Parent_Id === null || chapter.Chapter_Parent_Id === undefined) {
        // 根节点（一级章节）
        rootNodes.push(node);
      } else {
        // 有父节点的节点
        const parent = nodeMap.get(chapter.Chapter_Parent_Id);
        if (parent) {
          parent.children.push(node);
          node.parent = parent; // 添加父节点引用
        } else {
          // 如果找不到父节点，也作为根节点处理
          rootNodes.push(node);
        }
      }
    });

    // 对根节点按 order 排序
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(rootNodes);

    // 处理每个节点，为有课时的章节添加详情，并设置锁定状态
    const processChapters = (nodes, parentCompleted = true) => {
      nodes.forEach((node) => {
        // 确保有展开状态（默认展开）
        if (node.expanded === undefined) {
          node.expanded = true;
        }

        // 如果有课时，取第一个课时的内容
        if (node.lessons && node.lessons.length > 0) {
          const lesson = node.lessons[0];
          node.duration = lesson.Lesson_Time || '0分钟';
          node.completed = lesson.Lesson_Is_Complete || false;
          node.progress = lesson.Lesson_Is_Complete ? 100 : 0;
          node.videoUrl = lesson.Lesson_Video;
          node.videoPoster = lesson.Lesson_Cover;
          node.content = lesson.Lesson_Content || '';
          // 设置锁定状态：只有在前一个章节已完成且父节点已解锁时才解锁
          node.locked = !node.completed && !parentCompleted;
        } else {
          // 没有课时的章节，默认不锁定
          node.locked = false;
          node.completed = false;
        }

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          processChapters(node.children, !node.locked && node.completed !== false);
        }
      });
    };
    processChapters(rootNodes);

    // 判断是否有子章节（一级章节有 children）
    const markParent = (nodes) => {
      nodes.forEach(node => {
        node.isParent = node.children && node.children.length > 0;
        // 如果是叶子节点（有课时），也需要标记
        if (!node.isParent && node.lessons && node.lessons.length > 0) {
          node.isLeaf = true;
        }
        if (node.children) {
          markParent(node.children);
        }
      });
    };
    markParent(rootNodes);

    chapterList.value = rootNodes;

    // 默认选中第一个有课时的章节
    const findFirstLessonChapter = (nodes) => {
      for (const node of nodes) {
        if (node.lessons && node.lessons.length > 0) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findFirstLessonChapter(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const firstChapter = findFirstLessonChapter(rootNodes);
    if (firstChapter) {
      handleChapterSelect(firstChapter);
    }
  } catch (error) {
    console.error('获取章节数据失败:', error);
    ElMessage.error('获取课程数据失败');
  } finally {
    isLoading.value = false;
  }
};

// 获取所有子章节的平铺数组（用于上一章/下一章导航）
const flatChapters = computed(() => {
  const chapters = [];
  const flatten = (nodes) => {
    nodes.forEach(node => {
      // 如果节点有子章节，递归处理
      if (node.children && node.children.length > 0) {
        flatten(node.children);
      }
      // 如果节点有课时，将该节点添加到列表（用于章节导航）
      // 这里添加的是章节节点本身，不是课时
      chapters.push(node);
    });
  };
  flatten(chapterList.value);
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

// 当前显示的数据（课时优先，否则使用章节）
const displayData = computed(() => {
  if (currentLesson.value) {
    return {
      title: currentLesson.value.Lesson_Name || currentLesson.value.Lesson_Title || currentLesson.value.title || '',
      content: currentLesson.value.Lesson_Content || currentLesson.value.content || '',
      videoUrl: currentLesson.value.Lesson_Video || currentLesson.value.resource_url || '',
      cover: currentLesson.value.Lesson_Cover || '',
      time: currentLesson.value.Lesson_Time || (currentLesson.value.duration ? `${currentLesson.value.duration}分钟` : ''),
      questions: currentLesson.value.questions || [],
      resources: currentLesson.value.resources || [],
      isComplete: currentLesson.value.Lesson_Is_Complete || false
    };
  }
  return {
    title: currentChapter.value?.name || '',
    content: currentChapter.value?.content || '',
    videoUrl: currentChapter.value?.videoUrl || '',
    cover: currentChapter.value?.videoPoster || '',
    time: currentChapter.value?.duration || '',
    questions: currentChapter.value?.questions || [],
    resources: currentChapter.value?.resources || [],
    isComplete: currentChapter.value?.completed || false
  };
});

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

const toggleSubChapter = (subChapter) => {
  if ((subChapter.children && subChapter.children.length > 0) || (subChapter.lessons && subChapter.lessons.length > 0)) {
    subChapter.expanded = !subChapter.expanded;
  }
};

const toggleThirdChapter = (thirdChapter) => {
  if (thirdChapter.lessons && thirdChapter.lessons.length > 0) {
    thirdChapter.expanded = !thirdChapter.expanded;
  }
};

const handleChapterSelect = (chapter) => {
  if (chapter.locked) {
    ElMessage.warning('请完成前面的章节后再学习此章节');
    return;
  }

  currentChapter.value = chapter;
  currentLesson.value = null; // 清除当前课时
  currentChapterIndex.value = flatChapters.value.findIndex(c => c.id === chapter.id);

  // 更新路由参数
  router.replace({
    query: { ...route.query, chapterId: chapter.id }
  });
};

// 处理课时点击
const handleLessonSelect = (lesson, chapterNode) => {
  // 如果是三级章节，需要展开其父级（二级章节）
  if (chapterNode.parent) {
    chapterNode.parent.expanded = true;
  }

  // 如果是三级章节，需要展开一级章节
  const parentChapter = chapterNode.parent;
  if (parentChapter && parentChapter.parent) {
    parentChapter.parent.expanded = true;
  }

  currentChapter.value = chapterNode;
  currentLesson.value = lesson;

  // 更新当前章节索引
  const chapterIndex = flatChapters.value.findIndex(c => c.id === chapterNode.id);
  if (chapterIndex !== -1) {
    currentChapterIndex.value = chapterIndex;
  }

  // 更新路由参数 - 使用统一的lesson id字段
  const lessonId = lesson.Lesson_Id || lesson.id;
  router.replace({
    query: { ...route.query, chapterId: chapterNode.id, lessonId: lessonId }
  });
};

const handlePrevChapter = () => {
  if (hasPrevChapter.value) {
    const prevIndex = currentChapterIndex.value - 1;
    handleChapterSelect(flatChapters.value[prevIndex]);
  }
};

const handleNextChapter = () => {
  if (hasNextChapter.value) {
    const nextIndex = currentChapterIndex.value + 1;
    handleChapterSelect(flatChapters.value[nextIndex]);
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
  // 先获取真实数据
  fetchChapterData();

  // 从路由参数初始化当前章节
  const chapterId = route.query.chapterId;
  if (chapterId) {
    const chapter = flatChapters.value.find(c => c.id === parseInt(chapterId));
    if (chapter && !chapter.locked) {
      handleChapterSelect(chapter);
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

/* 章节标题左侧黑色竖线 - 始终显示 */
.catalog-item.parent-item::before,
.catalog-item.sub-item::before,
.catalog-item.third-item::before {
  height: 16px;
  opacity: 1;
  background: #333333;
}

/* 课时未选中时不显示任何竖线 */
.catalog-item.lesson-item::before {
  height: 0;
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

/* 章节标题左侧黑色竖线 - 暗黑模式 */
.theme-dark .catalog-item.parent-item::before,
.theme-dark .catalog-item.sub-item::before,
.theme-dark .catalog-item.third-item::before {
  background: #e5e5e5;
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

/* 有子章节的父章节样式 */
.catalog-item.parent-item.has-children {
  cursor: pointer;
}

/* 没有子章节的父章节（直接可点击） */
.catalog-item.parent-item:not(.has-children) {
  cursor: pointer;
}

/* 子章节样式 - 更柔和的设计 */
.catalog-item.sub-item {
  margin-left: 6px;
  margin-right: 0;
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
}

.catalog-item.sub-item.has-lessons {
  cursor: pointer;
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

/* 三级章节样式 */
.third-chapters {
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.third-chapters:not(.expanded) {
  max-height: 0;
  opacity: 0;
}

.third-chapters.expanded {
  max-height: 2000px;
  opacity: 1;
  margin-top: 4px;
}

/* 三级章节组样式 */
.third-chapter-group {
  margin-bottom: 4px;
}

.catalog-item.third-item {
  margin-left: 12px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.catalog-item.third-item:hover {
  background-color: #f5f7fa;
}

.theme-dark .catalog-item.third-item:hover {
  background-color: #2d2d2d;
}

.catalog-item.third-item .catalog-item-title {
  font-size: 12px;
}

.catalog-item.third-item .expand-icon {
  font-size: 10px;
}

/* 课时列表样式 - 更小的字体 */
.lesson-list {
  margin-left: 8px;
  padding-left: 8px;
}

/* 一级章节课时缩进 */
.level1-lessons {
  margin-left: 6px;
  padding-left: 6px;
}

.catalog-item.lesson-item {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 6px;
  margin: 2px 0;
}

.lesson-title {
  font-size: 13px;
  font-weight: 400;
  color: #606266;
}

.theme-dark .lesson-title {
  color: #b0b0b0;
}

.catalog-item.lesson-item:hover {
  background-color: #f5f7fa;
}

.theme-dark .catalog-item.lesson-item:hover {
  background-color: #2d2d2d;
}

.catalog-item.lesson-item.active .lesson-title {
  color: #409eff;
  font-weight: 500;
}

.theme-dark .catalog-item.lesson-item.active .lesson-title {
  color: #7db3ff;
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

/* --- 加载状态 --- */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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