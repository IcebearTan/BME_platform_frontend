<script setup>
import { onMounted, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api'
import { API_URL } from '../../api'
import { Star, StarFilled, Lock, Unlock, ArrowRight } from '@element-plus/icons-vue'
import StudentProgressComponent from './StudentProgressComponent.vue'
import StudentRankComponent from './StudentRankComponent.vue'

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

const fetchCourseInfo = async () => {
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
  }
}

const fetchCourseDetails = async () => {
  try {
    const res = await api({
      url: '/course/chapter_list',
      method: 'get',
      params: {
        Course_Id: courseId.value
      }
    })
    courseDetails.value = res.data
    formatedCourseDetails.value = formatChapters(courseDetails.value)

    if (res.data.code === 200) {
      //由于后端设计问题这里还需要修改
      // console.log(courseDetails.value)
    }
  } catch (error) {
    console.error(error)
  }
}

const formatChapters = (chapters) => {
  const formattedData = [];
  let currentTitle = null;
  let titleId = 1;  // 用于给大标题添加 ID，从 1 开始

  chapters.forEach(chapter => {
    if (chapter.Chapter_Priority === 0) {
      // 大标题，开始一个新的章节，并给大标题加上 ID
      currentTitle = {
        name: chapter.Chapter_Name,
        order: chapter.Chapter_Order,
        subChapters: []  // 存储小标题
      };
      formattedData.push(currentTitle);
    } else if (chapter.Chapter_Priority === 1 && currentTitle) {
      // 小标题，添加到最近的大标题下
      currentTitle.subChapters.push({
        name: chapter.Chapter_Name,
        order: chapter.Chapter_Order
      });
    }
  });

  return formattedData;
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
const enrolledList = ref([])
const userProgress = ref({
  chapters: 0,
  section_num: 0,
  section_name: '',
  chapter_num: 0,
  chapter_name: '',
  progress: 0,
}) //个人进度

const getEnrollments = async () => {
  // 未登录时不请求
  const token = localStorage.getItem('token');
  if (!token) {
    enrolledList.value = [];
    return;
  }
  try {
    const res = await api({
      url: '/learningProgress/student',
      method: 'get',
    })

    if (res.data.code === 200) {
      // console.log(res)
      enrolledList.value = res.data.data.records
    }
  } catch (error) { }
}

const checkEnrollment = async () => {
  await getEnrollments()
  // console.log(courseId.value)
  const courseIdInt = parseInt(courseId.value, 10); // 转为整数
  // console.log(enrolledList.value.length)
  for (let i = 0; i < enrolledList.value.length; i++) {
    if (enrolledList.value[i].course_id === courseIdInt) {
      // 已加入课程
      isEnrolled.value = true;
      Object.assign(userProgress.value, {
        section_num: enrolledList.value[i].section_num,
        section_name: enrolledList.value[i].section_name,
        chapter_num: enrolledList.value[i].chapter_num,
        chapter_name: enrolledList.value[i].chapter_name,
        progress: enrolledList.value[i].progress
      });
      break;
    }
  }
}

const checkUnlock = (chapterOrder) => {
  // 解锁条件：小节序号 ≤ 已完成章节数 + 1
  return chapterOrder <= userProgress.value.chapter_num + 1;
}

// 在组件挂载后执行
onMounted(() => {
  fetchCourseDetails()
  fetchCourseInfo()

  checkEnrollment()
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

const courseHour = computed(() => {
  return courseInfo.value?.Course_Class_Hour ? courseInfo.value.Course_Class_Hour + ' 学时' : '未知'
})

// 面包屑导航数据
const breadcrumbItems = computed(() => [
  { label: '学习中心', path: '/study' },
  { label: courseInfo.value?.Course_Title || '课程详情', path: '' }
])

// 返回学习中心
const goBack = () => {
  router.push('/study')
}
</script>

<template>
  <div class="course-wrapper" :class="themeClass" :style="{ background: wrapperBg }">
    <!-- 居中容器 -->
    <div class="main-container">
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
                <el-button type="primary" plain size="large" disabled="true" @click="caution()" class="no-cursor">{{ isEnrolled ? '正在学习' : '加入学习'}}</el-button>
                <el-button type="primary" size="large" @click="handleDownload()">下载内容</el-button>
              </div>
            </div>
          </div>

          <div class="course-contents">
            <div class="course-contents-header" :class="themeClass">
              <span class="course-contents-title" :class="themeClass">目录</span>
            </div>
            <div class="course-content-card">
              <div class="course-content-item" v-for="(item, index) in formatedCourseDetails" :key="index">
                <div style="font-size: 20px; font-weight: 500; margin-bottom: 10px;">
                  <span class="course-content-item-index">{{ index + 1 }}</span>
                  <span style="position: relative; left: -15px">{{ item.name }}</span>
                </div>
                <div class="course-content-item-sub" v-for="(subItem, subIndex) in item.subChapters" :key="subIndex"
                     :class="{ 'locked': !isEnrolled || !checkUnlock(index + 1) }">
                  <div>{{ subItem.name }}</div>
                  <div v-if="!isEnrolled || !checkUnlock(index + 1)">
                    <el-icon class="lock-icon">
                      <Lock />
                    </el-icon>
                  </div>
                </div>
              </div>
              <div class="no-more-content" :class="themeClass">
                没有更多内容啦~
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧边栏 -->
        <div class="right-sidebar">
          <!-- 已经开始学习所展示的内容 -->
          <div v-if="isEnrolled">
            <div class="course-process" :class="themeClass">
              <StudentProgressComponent :user-progress="userProgress" />
            </div>
            <div class="class-rank">
              <StudentRankComponent :course-id="courseId" :chapters="courseInfo.Chapters" />
            </div>
          </div>

          <!-- 未加入学习展示的内容 -->
          <div v-else>
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
                <div class="period-value" :class="themeClass">{{ courseInfo.Chapters || 0 }} 章 / {{ courseInfo.Sections || 0 }} 节</div>
                <div class="period-label" :class="themeClass">章节数量</div>
              </span>
              <span class="period-item" :class="themeClass">
                <div class="period-value" :class="themeClass">{{ courseHour }}</div>
                <div class="period-label" :class="themeClass">预计时长</div>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  transition: all 0.2s ease;
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
  border-bottom: 1px solid;
}

.theme-light .course-contents-header {
  border-color: #e6e6e6;
}

.theme-dark .course-contents-header {
  border-color: #404040;
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
  width: 50%;
  padding-right: 15px;
}

.period-item:first-child {
  border-right: 1px solid;
  padding-right: 15px;
}

.period-item:last-child {
  padding-left: 15px;
}

.theme-light .period-item:first-child {
  border-color: #e6e6e6;
}

.theme-dark .period-item:first-child {
  border-color: #404040;
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
  width: 300px;
  flex-shrink: 0;
}

.course-process {
  width: 300px;
  height: 120px;
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 20px;
  padding-bottom: 10px;
  border-radius: 16px;
  border: 1px solid;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
}

/* 主题适配 - 课程进度卡片 */
.theme-light .course-process {
  background-color: #ffffff;
  border-color: #e6e6e6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.theme-dark .course-process {
  background-color: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.course-process:hover {
  transform: scale(1.02);
}

.theme-light .course-process:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  border-color: #d0d0d0;
}

.theme-dark .course-process:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  border-color: #505050;
}

.course-process h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}

/* 移除旧的 course-details 样式，因为现在使用 left-content */

.class-rank{
  padding-right: 5px;
  width: 320px;
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
  border-color: #e6e6e6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.theme-dark .course-content-card {
  background-color: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.course-content-item {
  margin: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid;
}

.theme-light .course-content-item {
  border-color: #e6e6e6;
}

.theme-dark .course-content-item {
  border-color: #404040;
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
  transition: all 0.2s ease;
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
  color: #999;
}

.theme-dark .no-more-content {
  color: #666;
}
</style>
