<script setup>
import { onMounted, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api'
import { API_URL } from '../../api'
import { Star, StarFilled } from '@element-plus/icons-vue'

import StudentRankComponent from './StudentRankComponent.vue'
import ChapterTree from './ChapterTree.vue'

const store = useStore()  // 获取 Vuex store
const router = useRouter()  // 获取 Vue Router 实例

// 主题计算属性
const themeClass = computed(() => store.state.isDarkMode ? 'theme-dark' : 'theme-light')

const courseDetails = ref(null)
const courseId = ref(router.currentRoute.value.query.id)
const courseInfo = ref([])

const formatedCourseDetails = ref([])

const difficulty = 3 // 课程难度，这里暂时写死，实际应该从后端获取

const items = [
    { label: '医学', type: 'success' },
    { label: '计算机', type: 'info' },
    { label: '人工智能', type: 'warning' },
    { label: '医疗器械', type: 'danger' },
    { label: '医学', type: 'success' },
    { label: '计算机', type: 'info' },
    { label: '人工智能', type: 'warning' },
    { label: '医疗器械', type: 'danger' }
];

const colorPalette = [
    "#b391ff", // 蓝紫色: 和谐邻近色
    "#91bdff", // 原始色: 柔和蓝色
    "#91ffde", // 蓝绿色: 清新冷色调
    "#ffcc91", // 橙黄色: 温暖对比色
    "#ff91c0"  // 玫红色: 活力点缀色
];

const randomColor = (courseName) => {
    console.log(courseName)
    // 简单哈希：将字符串转成数字和 
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }
    // 取余映射到色板 
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
};

// 加载状态
const isLoading = ref(true)

const fetchCourseInfo = async () => {
  isLoading.value = true
  try {
    const res = await api({
      url: '/course/search',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })

    if (res.data.code === 200) {
      courseInfo.value = res.data
      userProgress.value.chapters = res.data.Chapters || 0; // 设置章节数量
      console.log(courseInfo.value)
    }
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

// 课时数据存储
const lessonsData = ref({})

const fetchCourseDetails = async () => {
  try {
    // 获取章节列表
    const chapterRes = await api({
      url: '/course/chapter_list',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })
    courseDetails.value = chapterRes.data

    // 获取课时列表
    const lessonRes = await api({
      url: '/course/lesson/list',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })

    // 处理课时数据，转换为以 chapterId 为 key 的映射
    if (lessonRes.data.code === 200) {
      const lessonsMap = {}
      lessonRes.data.data.forEach(item => {
        lessonsMap[item.Chapter_Id] = item.lessons || []
      })
      lessonsData.value = lessonsMap
    }

    formatedCourseDetails.value = formatChapters(courseDetails.value, lessonsData.value)

    // 获取学习进度（已完成课时）
    try {
      const progressRes = await api({
        url: '/learningProgress/lesson/list',
        method: 'get',
        params: { Course_Id: courseId.value }
      })
      if (progressRes.data.code === 200 && progressRes.data.data) {
        // 提取所有已完成课时的ID
        const completed = progressRes.data.data
          .filter(item => item.status === 'completed')
          .map(item => String(item.lesson_id))
        completedLessons.value = completed
      }
    } catch (e) {
      console.warn('获取学习进度失败', e)
    }

    if (chapterRes.data.code === 200) {
      //由于后端设计问题这里还需要修改
      // console.log(courseDetails.value)
    }
  } catch (error) {
    console.error(error)
  }
}

// 构建多层级树形结构
// 构建多层级树形结构（包含课时）
const formatChapters = (chapters, lessonsData = {}) => {
  if (!chapters || chapters.length === 0) return [];

  // 创建节点映射
  const nodeMap = new Map();
  const rootNodes = [];

  // 初始化所有节点
  chapters.forEach(chapter => {
    // 获取该章节下的课时
    const chapterLessons = lessonsData[chapter.Chapter_Id] || []

    nodeMap.set(chapter.Chapter_Id, {
      id: chapter.Chapter_Id,
      name: chapter.Chapter_Name,
      order: chapter.Chapter_Order,
      level: chapter.Chapter_Level,
      parentId: chapter.Chapter_Parent_Id,
      children: [],
      lessons: chapterLessons  // 添加课时数据
    });
  });

  // 构建树形结构
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
      } else {
        // 如果找不到父节点，也作为根节点处理
        rootNodes.push(node);
      }
    }
  });

  // 对每个节点按 order 排序
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(rootNodes);

  return rootNodes;
}

const fetchDownloadUrl = async () => {
  try {
    const res = await api({
      url: '/course/book_down',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })

    if (res.data.code === 200) {
      console.log(res)
      await downloadBook(res)
    }
  } catch (error) {
    console.error(error)
  }
}

const downloadBook = async (res) => {
  console.log(API_URL)
  const downCode = res.data.Down_Code;
  const url = `${API_URL}/course/book_download?Down_Code=${encodeURIComponent(downCode)}`
  const URL = String(url)
  window.open(URL, '_blank')
}

const handleDownload = () => {
  fetchDownloadUrl()
}

const coverColor = computed(() => {
  // 如果没有标题，使用默认色
  return courseInfo.value?.Course_Title
    ? randomColor(courseInfo.value.Course_Title)
    : colorPalette[0];
});

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(s => s + s).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

// 生成渐变色（可以根据 coverColor 调整深浅）
const wrapperBg = computed(() => {
  // 简洁风格：使用微妙的渐变背景
  return store.state.isDarkMode 
    ? '#1a1a1a' 
    : 'linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%)';
});

// 查询当前用户是否已经加入课程
const isEnrolled = ref(false)

// 查询当前用户是否已加入课程小组
const hasGroup = ref(false)

// 检查用户是否已选课
const checkEnrollment = async () => {
  try {
    const res = await api({
      url: '/userCourse/check',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })
    if (res.data.code === 200 && res.data.data?.enrolled) {
      isEnrolled.value = true
    }
  } catch (error) {
    console.error('检查选课状态失败:', error)
  }
}

// 检查用户是否已加入课程小组
const checkGroupEnrollment = async () => {
  try {
    const res = await api({
      url: '/course-group/check',
      method: 'get',
      params: {
        course_id: courseId.value
      }
    })
    if (res.data.code === 200 && res.data.enrolled) {
      hasGroup.value = true
    }
  } catch (error) {
    console.error('检查小组加入状态失败:', error)
  }
}

// 点击加入/退课按钮
const debugEnroll = async () => {
  if (!isEnrolled.value) {
    // 选课
    try {
      const res = await api({
        url: '/userCourse/enroll',
        method: 'post',
        data: {
          Course_Id: courseId.value
        }
      })
      if (res.data.code === 200) {
        isEnrolled.value = true
        ElMessage.success('选课成功')
      } else {
        ElMessage.error(res.data.message || '选课失败')
      }
    } catch (error) {
      console.error('选课失败:', error)
      ElMessage.error('选课失败，请重试')
    }
  } else {
    // 退课
    try {
      const res = await api({
        url: '/userCourse/drop',
        method: 'post',
        data: {
          Course_Id: courseId.value
        }
      })
      if (res.data.code === 200) {
        isEnrolled.value = false
        ElMessage.success('退课成功')
      } else {
        ElMessage.error(res.data.message || '退课失败')
      }
    } catch (error) {
      console.error('退课失败:', error)
      ElMessage.error('退课失败，请重试')
    }
  }
}

// 已完成课时列表，用于显示勾选标记
const completedLessons = ref([])

const userProgress = ref({
  chapters: 0,
  section_num: 0,
  section_name: '',
  chapter_num: 0,
  chapter_name: '',
  progress: 0,
}) //个人进度


const checkUnlock = (chapterOrder) => {
  // 解锁条件：小节序号 ≤ 已完成章节数 + 1
  return chapterOrder <= userProgress.value.chapter_num + 1;
}

// 在组件挂载后执行
onMounted(() => {
  fetchCourseDetails()
  fetchCourseInfo()

  checkEnrollment()
  checkGroupEnrollment()
})

// 方法：警告提示
const caution = () => {
  ElMessage.error('前面的内容以后再来探索吧！')
}

const difficultyMap = {
  1: '简单',
  2: '较易',
  3: '中等',
  4: '较难',
  5: '困难'
}

const courseDifficulty = computed(() => {
  const d = courseInfo.value?.Course_Difficulty
  return d ? difficultyMap[d] || '未知' : '未知'
})

// 学习进度
const learningProgress = computed(() => {
  if (!userProgress.value.chapter_num || userProgress.value.chapter_num <= 0) {
    return '暂无'
  }
  const percent = Math.round(userProgress.value.chapter_num * 100 / (userProgress.value.chapters || 1))
  return percent + '%'
})

const courseHour = computed(() => {
  const minutes = courseInfo.value?.Course_Class_Hour
  if (!minutes) return '未知'
  const hours = Math.floor(minutes / 60)
  return hours + ' 小时'
})

// 面包屑导航数据
const breadcrumbItems = computed(() => [
  { label: '课程', path: '/study' },
  { label: courseInfo.value?.Course_Title || '课程详情', path: '' }
])

// 返回学习中心
const goBack = () => {
  router.push('/study')
}

// 跳转到章节详情页面
const handleChapterClick = (chapterIndex, subChapterIndex = null) => {
  // 检查是否已报名且章节已解锁
  if (!isEnrolled.value || !checkUnlock(chapterIndex + 1)) {
    ElMessage.warning('请先报名课程或完成前置章节')
    return
  }
  
  const chapter = formatedCourseDetails.value[chapterIndex]
  if (!chapter) {
    console.warn('章节不存在:', chapterIndex)
    return
  }
  
  // 构造章节ID，这里可以根据实际数据结构调整
  let chapterId = chapter.order || (chapterIndex + 1)
  let chapterTitle = chapter.name
  
  // 如果点击的是子章节，可以进一步处理
  if (subChapterIndex !== null && chapter.subChapters[subChapterIndex]) {
    const subChapter = chapter.subChapters[subChapterIndex]
    // 可以使用子章节的ID或者组合ID
    chapterId = `${chapterId}-${subChapterIndex + 1}`
    chapterTitle = `${chapter.name} - ${subChapter.name}`
    console.log('点击子章节:', subChapter.name)
  } else if (subChapterIndex === null) {
    console.log('点击主章节:', chapter.name)
  }
  
  console.log('跳转参数:', {
    courseId: courseId.value,
    chapterId: chapterId,
    chapterTitle: chapterTitle
  })
  
  // 显示跳转提示
  ElMessage.success(`正在进入章节：${chapterTitle}`)
  
  // 跳转到课程章节页面
  router.push({
    name: 'course-chapter',
    params: { courseId: courseId.value },
    query: {
      chapterId: chapterId,
      chapterTitle: chapterTitle
    }
  })
}

// 处理树形章节组件的点击事件
const handleTreeChapterClick = (chapter, indexPath) => {
  // 检查是否已报名且章节已解锁
  if (!isEnrolled.value || !checkUnlock(chapter.order)) {
    ElMessage.warning('请先报名课程或完成前置章节')
    return
  }

  // indexPath 格式: "1" 或 "1-2" 或 "1-2-3"
  const chapterId = indexPath
  const chapterTitle = chapter.name

  console.log('跳转参数:', {
    courseId: courseId.value,
    chapterId: chapterId,
    chapterTitle: chapterTitle
  })

  // 显示跳转提示
  ElMessage.success(`正在进入章节：${chapterTitle}`)

  // 跳转到课程章节页面
  router.push({
    name: 'course-chapter',
    params: { courseId: courseId.value },
    query: {
      chapterId: chapterId,
      chapterTitle: chapterTitle
    }
  })
}

// 处理课时点击事件
const handleLessonClick = (lesson, chapter, indexPath) => {
  // 检查是否已报名且章节已解锁
  if (!isEnrolled.value || !checkUnlock(chapter.order)) {
    ElMessage.warning('请先报名课程或完成前置章节')
    return
  }

  console.log('点击课时:', {
    courseId: courseId.value,
    lessonId: lesson.id,
    chapterId: indexPath,
    lessonTitle: lesson.title,
    lessonType: lesson.type
  })

  // 显示跳转提示
  ElMessage.success(`正在进入课时：${lesson.title}`)

  // 跳转到课程章节页面，传递课时ID
  router.push({
    name: 'course-chapter',
    params: { courseId: courseId.value },
    query: {
      chapterId: indexPath,
      chapterTitle: chapter.name,
      lessonId: lesson.id
    }
  })
}
</script>

<template>
  <div class="course-wrapper" :class="themeClass" :style="{ background: wrapperBg }">
    <!-- 加载动画 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 居中容器 -->
    <div class="main-container" v-else>
      <!-- 面包屑导航 -->
      <div class="breadcrumb-container" :class="themeClass">
        <div class="breadcrumb-nav">
          <span 
            v-for="(item, index) in breadcrumbItems" 
            :key="index"
            class="breadcrumb-item"
            :class="{ 'breadcrumb-active': index === breadcrumbItems.length - 1 }"
            @click="index === 0 ? goBack() : null"
          >
            {{ item.label }}
            <span v-if="index < breadcrumbItems.length - 1" class="breadcrumb-separator"> / </span>
          </span>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-area">
        <!-- 左侧主要内容 -->
        <div class="left-content">
          <div class="course-info">
            <div class="course-info-left" 
            :style="{backgroundColor: courseInfo?.Course_Title ? randomColor(courseInfo.Course_Title) : colorPalette[0]}">
            {{ courseInfo.Course_Title }}</div>
            <div class="course-info-right">
              <h2 class="course-title" :class="themeClass">
                {{ courseInfo.Course_Title }}
              </h2>
              <div class="course-description" :class="themeClass">
                {{ courseInfo.Introduction }}
              </div>
              <div class="course-bottom">
                <el-button :class="['enrolled-btn', { 'is-enrolled': isEnrolled }]" type="primary" plain size="large" @click="debugEnroll()">{{ isEnrolled ? '正在学习' : '加入学习' }}</el-button>
                <el-button type="primary" size="large" @click="handleDownload()">下载内容</el-button>
              </div>
            </div>
          </div>

          <div class="course-contents">
            <div class="course-contents-header" :class="themeClass">
              <span class="course-contents-title" :class="themeClass">目录</span>
            </div>
            <div class="course-content-card">
              <ChapterTree
                :chapters="formatedCourseDetails"
                :is-enrolled="isEnrolled"
                :chapter-num="userProgress.chapter_num"
                :total-chapters="courseInfo.Chapters"
                :completed-lessons="completedLessons"
                :theme-class="themeClass"
                @chapter-click="handleTreeChapterClick"
                @lesson-click="handleLessonClick"
              />
              <div class="no-more-content" :class="themeClass">
                没有更多内容啦~
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧边栏 -->
        <div class="right-sidebar">
          <!-- 课程信息：始终显示 -->
          <div class="course-difficulty" :class="themeClass">
            <span class="difficulty-label" :class="themeClass">课程难度</span>
            <div class="difficulty-stars-container">
              <el-icon
                v-for="n in 5"
                :key="n"
                :class="n <= (courseInfo.Course_Difficulty == null ? 0 : courseInfo.Course_Difficulty) ? 'star-icon' : 'star-outline-icon'"
              >
                <component :is="n <= (courseInfo.Course_Difficulty == null ? 0 : courseInfo.Course_Difficulty) ? StarFilled : Star" />
              </el-icon>
              <span class="difficulty-text" :class="themeClass">{{ courseDifficulty }}</span>
            </div>
          </div>
          <div class="course-period" :class="themeClass">
            <span class="period-item" :class="themeClass">
              <div class="period-value" :class="themeClass">{{ courseInfo.Chapters || 0 }} 章</div>
              <div class="period-label" :class="themeClass">章节数量</div>
            </span>
            <span class="period-item" :class="themeClass">
              <div class="period-value" :class="themeClass">{{ courseHour }}</div>
              <div class="period-label" :class="themeClass">预计时长</div>
            </span>
            <span class="period-item" :class="themeClass" v-if="isEnrolled">
              <div class="period-value" :class="themeClass">{{ learningProgress }}</div>
              <div class="period-label" :class="themeClass">学习进度</div>
            </span>
          </div>
          <div class="course-tags">
            <el-tag
              v-for="item in items"
              :key="item.label"
              :type="item.type"
              effect="light"
              round
            >
              {{ item.label }}
            </el-tag>
          </div>

          <!-- 已开始学习所展示的额外内容 -->
          <div v-if="isEnrolled" class="enrolled-extra">
            <!-- 导师+排行：仅在已加入小组时显示 -->
            <div class="class-rank" v-if="hasGroup">
              <StudentRankComponent :course-id="courseId" :chapters="courseInfo.Chapters" />
            </div>
            <!-- 未加入小组时显示引导 -->
            <div class="no-group-tip" v-else>
              <div class="tip-content">
                <div class="tip-main">
                  <div class="tip-title">加入学习小组</div>
                  <div class="tip-desc">和同伴一起讨论课程内容</div>
                </div>
                <el-button type="primary" round class="join-group-btn">
                  加入小组
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 加载动画样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #909399;
}

.theme-dark .loading-text {
  color: #a0a0a0;
}

/* 面包屑导航样式 */
.breadcrumb-container {
  width: 100%;
  padding: 16px 0;
  margin-bottom: 24px;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.breadcrumb-item {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.breadcrumb-item:not(.breadcrumb-active):hover {
  opacity: 0.8;
}

.breadcrumb-item.breadcrumb-active {
  cursor: default;
  font-weight: 500;
}

.theme-light .breadcrumb-item {
  color: #666;
}

.theme-light .breadcrumb-item.breadcrumb-active {
  color: #333;
}

.theme-light .breadcrumb-item:not(.breadcrumb-active):hover {
  color: #1976d2;
}

.theme-dark .breadcrumb-item {
  color: #bbb;
}

.theme-dark .breadcrumb-item.breadcrumb-active {
  color: #fff;
}

.theme-dark .breadcrumb-item:not(.breadcrumb-active):hover {
  color: #64b5f6;
}

.breadcrumb-separator {
  margin: 0 12px;
  font-weight: normal;
  opacity: 0.5;
  pointer-events: none;
}

/* 课程标题主题适配 */
.course-title {
  height: 20%;
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 12px;
}

.theme-light .course-title {
  color: #333;
}

.theme-dark .course-title {
  color: #fff;
}

/* 课程内容标题主题适配 */
.course-contents-header {
  height: 50px;
  width: 100%;
  padding-bottom: 20px;
  margin-bottom: 10px;
}

.theme-light .course-contents-header {
  border-color: #eee;
}

.theme-dark .course-contents-header {
  border-color: #333;
}

.course-contents-title {
  font-size: 25px;
  font-weight: bold;
  padding-bottom: 19px;
  border-bottom: 3px solid;
}

.theme-light .course-contents-title {
  border-color: #333;
  color: #333;
}

.theme-dark .course-contents-title {
  border-color: #fff;
  color: #fff;
}

/* 难度和时长信息主题适配 */
.difficulty-label {
  font-size: 15px;
  align-self: center;
}

.difficulty-stars-container {
  display: flex;
  align-items: center;
}

.difficulty-text {
  margin-left: 8px;
  font-size: 15px;
}

.theme-light .difficulty-label,
.theme-light .difficulty-text {
  color: #666;
}

.theme-dark .difficulty-label,
.theme-dark .difficulty-text {
  color: #bbb;
}

.period-item {
  flex: 1;
  padding: 0 8px;
  text-align: center;
}

.period-item:first-child {
  border-right: 1px solid;
}

.period-item:last-child {
  border-left: 1px solid;
}

.period-item:not(:first-child):not(:last-child) {
  border-left: 1px solid;
}

.theme-light .period-item:first-child {
  border-color: #eee;
}

.theme-dark .period-item:first-child {
  border-color: #333;
}

.theme-light .period-item:last-child {
  border-color: #eee;
}

.theme-light .period-item:not(:first-child):not(:last-child) {
  border-color: #eee;
}

.theme-dark .period-item:last-child {
  border-color: #333;
}

.theme-dark .period-item:not(:first-child):not(:last-child) {
  border-color: #333;
}

.period-value {
  font-size: 16px;
  font-weight: 500;
}

.theme-light .period-value {
  color: #333;
}

.theme-dark .period-value {
  color: #fff;
}

.period-label {
  font-size: 13px;
  margin-top: 10px;
}

.theme-light .period-label {
  color: #666;
}

.theme-dark .period-label {
  color: #bbb;
}

.course-tags {
  display: flex;
  justify-content: first baseline;
  flex-wrap: wrap;
  gap: 8px 5px;
}

/* 课程标签主题适配 */
.theme-dark .course-tags .el-tag {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #ccc !important;
}

/* Element Plus 按钮主题适配 */
.theme-dark .el-button {
  background-color: #404040 !important;
  border-color: #555 !important;
  color: #fff !important;
}

.theme-dark .el-button:hover {
  background-color: #505050 !important;
  border-color: #666 !important;
}

.theme-dark .el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

.theme-dark .el-button--primary:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
}

.theme-dark .el-button.is-plain {
  background-color: transparent !important;
  color: #409eff !important;
  border-color: #409eff !important;
}

.theme-dark .el-button.is-plain:hover {
  background-color: #409eff !important;
  color: #fff !important;
}
.course-period {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  margin-bottom: 20px;
}
.course-difficulty{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  margin-bottom: 20px;
}
.star-icon {
  color: #FFcf00;
  font-size: 26px;
  margin-right: 2px;
  vertical-align: middle;
}
/* 星级图标主题适配 */
.theme-light .star-outline-icon {
  color: #e0e0e0;
}

.theme-dark .star-outline-icon {
  color: #555;
}

.star-outline-icon {
  font-size: 22px;
  margin-right: 2px;
  vertical-align: middle;
}

.course-wrapper {
  padding: 20px;
  min-height: 100vh;
  display: flex;
  justify-content: center;
}

/* 主容器 - 居中显示 */
.main-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
}

/* 内容区域 - 左右布局 */
.content-area {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

/* 左侧主要内容 */
.left-content {
  flex: 1;
  min-width: 0; /* 防止flex子元素溢出 */
}

/* 右侧边栏 */
.right-sidebar {
  width: 350px;
  flex-shrink: 0;
}

.course-process {
  width: 350px;
  height: 150px;
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  cursor: pointer;
  box-sizing: border-box;
}

/* 主题适配 - 课程进度卡片 */
.theme-light .course-process {
  background-color: #ffffff;
  border-color: #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.theme-dark .course-process {
  background-color: #2d2d2d;
  border-color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.course-process:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  transform: scale(1.02);
}

.theme-light .course-process:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  border-color: #d0d0d0;
}

.theme-dark .course-process:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  border-color: #505050;
}

.course-process h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}

/* 移除旧的 course-details 样式，因为现在使用 left-content */

.enrolled-extra {
  margin-top: 20px;
}

.class-rank{
  width: 350px;
}

/* 未加入小组提示 */
.no-group-tip {
  width: 350px;
  padding: 16px 20px;
  border-radius: 12px;
  margin-top: 20px;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.theme-light .no-group-tip {
  background: linear-gradient(135deg, #eff8f8 0%, #e0ecec 100%);
  border: 1px solid #b8d4d4;
  box-shadow: 0 2px 12px rgba(80, 140, 140, 0.12);
}

.theme-dark .no-group-tip {
  background: linear-gradient(135deg, #4a5568 0%, #3d4450 100%);
  border: 1px solid #5a6570;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.tip-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tip-main {
  flex: 1;
}

.tip-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.theme-light .tip-title {
  color: #6e9a9a;
}

.theme-dark .tip-title {
  color: #e2e8f0;
}

.tip-desc {
  font-size: 12px;
}

.theme-light .tip-desc {
  color: #7eacac;
}

.theme-dark .tip-desc {
  color: #a0aec0;
}

.join-group-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.theme-light .join-group-btn {
  background-color: #7eacac;
  border-color: #7eacac;
  color: #fff;
}

.theme-light .join-group-btn:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background-color: #6c9c9c;
  border-color: #6c9c9c;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(110, 156, 156, 0.3);
}

.theme-dark .join-group-btn {
  background-color: #718096;
  border-color: #718096;
  color: #fff;
}

.theme-dark .join-group-btn:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background-color: #4a5568;
  border-color: #4a5568;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(110, 156, 156, 0.3);
}

.theme-dark .join-group-btn:hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background-color: #7986cb;
  border-color: #7986cb;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(110, 156, 156, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-container {
    padding: 0 20px;
    max-width: none;
  }

  .content-area {
    flex-direction: column;
    gap: 20px;
  }

  .right-sidebar {
    width: 100%;
  }

  .course-info {
    flex-direction: column;
  }

  .course-info-left {
    width: 100% !important;
    height: 120px !important;
    margin-right: 0 !important;
    margin-bottom: 20px !important;
  }

  .course-info-right {
    width: 100% !important;
    height: auto !important;
  }
}

.course-info {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-bottom: 20px;
}

.course-info-left {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: bold;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background-color: #91bdff;
  color: #fff;

  margin-right: 35px;
  border-radius: 10px;
  padding: 10px;

  width: 130px;
  height: 180px;
  text-align: center;

  transition: all 0.3s ease-in-out;
  position: relative;
  overflow: hidden;
}

.course-info-left::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  border-radius: 0 0 10px 10px;
}

/* 课程封面主题适配 */
.theme-light .course-info-left {
  box-shadow: 0 0 12px 2px #d2dbe9;
}

.theme-dark .course-info-left {
  box-shadow: 0 0 12px 2px rgba(0, 0, 0, 0.4);
}

.theme-light .course-info-left:hover {
  box-shadow: 0 0 16px 2px #d0d1d2;
}

.theme-dark .course-info-left:hover {
  box-shadow: 0 0 16px 2px rgba(255, 255, 255, 0.1);
}

.course-info-left:hover::before {
  opacity: 1;
}

.course-info-right {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 200px;
}

.course-contents {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 30px;
}

.course-bottom {
  position: absolute;
  bottom: 0;

  /* margin: 10px; */
  margin-left: 0;

  display: flex;
  justify-content: space-between;
}

.main-col {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-content-card {
  width: 100%;
  border-radius: 12px;
  border: 1px solid;
  margin-top: 20px;
  transition: all 0.3s ease;
}

/* 主题适配 - 课程内容卡片 */
.theme-light .course-content-card {
  background-color: #ffffff;
  border-color: #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.theme-dark .course-content-card {
  background-color: #2d2d2d;
  border-color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.course-content-item {
  margin: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid;
}

.theme-light .course-content-item {
  border-color: #eee;
}

.theme-dark .course-content-item {
  border-color: #333;
}

.course-content-item-index {
  display: inline-block;
  position: relative;
  left: -35px;
  width: 50px;
  text-align: center;
  border-radius: 50px;
  color: #fff;
  transition: all 0.3s ease;
}

.theme-light .course-content-item-index {
  background-color: #333;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.theme-dark .course-content-item-index {
  background-color: #555;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
}

.course-content-item-sub {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 主题适配 - 课程内容子项 */
.theme-light .course-content-item-sub {
  color: #555;
}

.theme-light .course-content-item-sub:hover {
  background-color: #f5f5f5;
}

.theme-dark .course-content-item-sub {
  color: #cccccc;
}

.theme-dark .course-content-item-sub:hover {
  background-color: #404040;
}

.course-content-item-sub.locked {
  cursor: pointer;
}

.theme-light .course-content-item-sub.locked {
  color: #ccc;
}

.theme-dark .course-content-item-sub.locked {
  color: #666;
}

/* 锁定图标主题适配 */
.theme-light .lock-icon {
  color: #ccc;
}

.theme-dark .lock-icon {
  color: #666;
}

/* 章节主标题样式 */
.chapter-main-title {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chapter-main-title.clickable {
  cursor: pointer;
}

.chapter-title-text {
  flex: 1;
  position: relative;
  left: -15px;
}

.chapter-arrow {
  font-size: 16px;
  color: #667eea;
  opacity: 0;
  transition: all 0.3s ease;
}

.chapter-main-title.clickable:hover .chapter-arrow {
  opacity: 1;
}

/* 子章节内容样式 */
.sub-chapter-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sub-chapter-text {
  flex: 1;
}

.sub-chapter-arrow {
  font-size: 14px;
  color: #667eea;
  opacity: 0;
  transition: all 0.3s ease;
}

.course-content-item-sub.clickable:hover .sub-chapter-arrow {
  opacity: 1;
}

.course-content-item-sub.clickable {
  cursor: pointer;
}

.lock-container {
  display: flex;
  align-items: center;
}

.course-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 主题适配 - 课程描述 */
.course-description {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.theme-light .course-description {
  color: #555;
}

.theme-dark .course-description {
  color: #bbb;
}

/* 主题过渡效果 */
.course-wrapper * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

/* 全局主题适配 */
.theme-light {
  color: #333;
}

.theme-dark {
  color: #fff;
}

.no-cursor {
  cursor: auto !important;
}

/* 已加入学习按钮样式 */
.is-enrolled-btn {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}

/* 正在学习按钮 - 淡蓝样式 */
.enrolled-btn.is-enrolled {
  background-color: #a0cfff !important;
  border-color: #a0cfff !important;
  color: #fff !important;
  cursor: default !important;
  opacity: 0.8;
}

.enrolled-btn.is-enrolled:hover {
  background-color: #a0cfff !important;
  border-color: #a0cfff !important;
}

/* 没有更多内容提示 */
.no-more-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50px;
  margin-bottom: 20px;
  font-size: 15px;
}

.theme-light .no-more-content {
  color: #bbb;
}

.theme-dark .no-more-content {
  color: #666;
}
</style>
