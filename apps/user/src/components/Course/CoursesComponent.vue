<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ArrowDown } from '@element-plus/icons-vue'
import api from '../../api';
import LearningPathComponent from './LearningPathComponent.vue'

const router = useRouter()
const store = useStore()

// 主题计算属性
const themeClass = computed(() => store.state.isDarkMode ? 'theme-dark' : 'theme-light')

const colorPalette = [
    "#b391ff", // 蓝紫色: 和谐邻近色
    "#91bdff", // 原始色: 柔和蓝色
    "#91ffde", // 蓝绿色: 清新冷色调
    "#ffcc91", // 橙黄色: 温暖对比色
    "#ff91c0"  // 玫红色: 活力点缀色
];

const randomColor = (courseName) => {
    // 简单哈希：将字符串转成数字和 
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }
    // 取余映射到色板 
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
};

const USE_MOCK = false  // 本地调试用 mock 数据，上线前改为 false

const mockCourseList = [
    { Course_Id: '1', Course_title: '生物医学工程导论', Course_Introduction: '介绍生物医学工程的基本概念和发展方向', Course_Chapters: 8, Course_Class_Hour: 120, Course_Time: '2026-03-15 10:00:00', Course_Tags: '硬件组' },
    { Course_Id: '2', Course_title: '医学影像处理', Course_Introduction: '学习CT、MRI等医学影像的处理与分析技术', Course_Chapters: 12, Course_Class_Hour: 180, Course_Time: '2026-05-20 14:00:00', Course_Tags: '软件组' },
    { Course_Id: '3', Course_title: '嵌入式系统设计', Course_Introduction: '学习嵌入式系统的软硬件协同设计方法', Course_Chapters: 10, Course_Class_Hour: 150, Course_Time: '2026-01-10 09:00:00', Course_Tags: '硬件组' },
    { Course_Id: '4', Course_title: '人工智能在医疗中的应用', Course_Introduction: '探索AI技术在疾病诊断、药物研发等领域的应用', Course_Chapters: 15, Course_Class_Hour: 200, Course_Time: '2025-09-01 10:00:00', Course_Tags: '软件组' },
    { Course_Id: '5', Course_title: '生物材料学基础', Course_Introduction: '学习各类生物材料的性能及其医学应用', Course_Chapters: 6, Course_Class_Hour: 90, Course_Time: '2025-06-15 08:30:00', Course_Tags: '硬件组' },
    { Course_Id: '6', Course_title: '先进制造工艺', Course_Introduction: '了解3D打印、精密加工等先进制造技术', Course_Chapters: 9, Course_Class_Hour: 135, Course_Time: '2025-03-20 14:00:00', Course_Tags: '先进制造组' },
    { Course_Id: '7', Course_title: '数字信号处理', Course_Introduction: '学习信号处理的基本理论和算法实现', Course_Chapters: 11, Course_Class_Hour: 165, Course_Time: '2024-09-01 10:00:00', Course_Tags: '软件组' },
    { Course_Id: '8', Course_title: '医学仪器原理', Course_Introduction: '掌握常见医学检测仪器的工作原理与设计', Course_Chapters: 7, Course_Class_Hour: 105, Course_Time: '2024-03-15 09:00:00', Course_Tags: '硬件组' },
    { Course_Id: '9', Course_title: 'Python数据分析', Course_Introduction: '从零开始学习Python数据分析', Course_Chapters: 4, Course_Class_Hour: 60, Course_Time: '2026-06-01 10:00:00', Course_Tags: '软件组' },
]

const courseList = ref([])

const buttons = reactive([
    { label: '全部课程', active: true },
    { label: '硬件组', active: false },
    { label: '软件组', active: false },
    { label: '先进制造组', active: false },
]);

// 设置活动按钮的方法
const setActive = (index) => {
    buttons.forEach((button, i) => {
        button.active = i === index;
    });
};

const getCourseList = async () => {
    if (USE_MOCK) {
        courseList.value = mockCourseList
        return
    }
    try {
        const res = await api({
            url: '/course/list',
            method: 'get',
        })
        courseList.value = res.data
    } catch (err) {
        console.error(err)
    }
}

const handleCourseClick = (courseId) => {
    console.log(courseId)
    console.log(typeof courseId)
    router.push({ path: '/study/details', query: { id: courseId } })
}

// 计算属性：根据按钮过滤课程
const filteredCourses = computed(() => {
    const activeBtn = buttons.find(btn => btn.active);
    if (!activeBtn || activeBtn.label === '全部课程') {
        return courseList.value;
    }
    return courseList.value.filter(course => course.Course_Tags === activeBtn.label);
});

// 计算属性：按年份分组，年份降序排列
const groupedCourses = computed(() => {
    const groups = {}
    filteredCourses.value.forEach(course => {
        const year = course.Course_Time ? course.Course_Time.substring(0, 4) : '未知'
        if (!groups[year]) groups[year] = []
        groups[year].push(course)
    })
    return Object.keys(groups)
        .sort((a, b) => b - a)
        .map(year => ({ year, courses: groups[year] }))
})

const expandedYears = reactive(new Set())

const toggleYear = (year) => {
    if (expandedYears.has(year)) {
        expandedYears.delete(year)
    } else {
        expandedYears.add(year)
    }
}

const getDisplayCourses = (group) => {
    if (expandedYears.has(group.year)) return group.courses
    return group.courses.slice(0, 6)
}

const hoverCourse = ref(null)
const hoverPosition = ref({ x: 0, y: 0 })

const handleMouseEnter = (course, event) => {
    hoverCourse.value = course;
    const cardRect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320; // 估算悬浮框宽度（px），可根据实际调整
    const gap = 10; // 间距

    // 判断右侧空间是否足够
    if (window.innerWidth - cardRect.right > tooltipWidth + gap) {
        // 右侧空间足够，展示在右侧
        hoverPosition.value = {
            x: cardRect.right + gap,
            y: cardRect.top
        }
    } else {
        // 右侧空间不够，展示在左侧
        hoverPosition.value = {
            x: cardRect.left - tooltipWidth - gap,
            y: cardRect.top
        }
    }
}
const handleMouseLeave = () => {
    hoverCourse.value = null
}

// 根据课程标题长度返回合适的CSS类
const getTextSizeClass = (title) => {
    if (!title) return 'medium-text';
    const length = title.length;
    if (length <= 4) return 'short-text';
    if (length <= 8) return 'medium-text';
    return 'long-text';
}

// 将分钟转换为小时显示
const formatClassHour = (minutes) => {
    if (!minutes || minutes === 0) return '0小时';
    const hours = Math.floor(minutes / 60);
    return hours + '小时';
}



onMounted(() => {
    getCourseList()  // 在组件挂载时调用获取课程列表的方法
})
</script>

<template>
    <div class="headContainer" :class="themeClass">
        <!-- 这里强制设置了缩放 -->
        <div style="min-width: 1500px;">
            <LearningPathComponent />
        </div>

    </div>
    <div class="mainContainer" :class="themeClass">
        <div style="width: 1300px;">
            <div class="button-group-container">
                <el-button v-for="(button, index) in buttons" :key="index" :type="button.active ? 'primary' : 'text'"
                    class="styled-button" @click="setActive(index)">
                    {{ button.label }}
                </el-button>
            </div>
        </div>

        <div class="columnContainer">
            <template v-if="filteredCourses.length === 0">
                <el-card style="width: 100%; text-align: center; box-shadow: 0 0 0 0 ; border: none;" :class="themeClass">
                    <div class="empty-message">暂时没有课程哦╮(╯▽╰)╭</div>
                </el-card>
            </template>
            <template v-else>
                <div v-for="group in groupedCourses" :key="group.year" style="width: 100%;">
                    <div class="year-divider" :class="themeClass">
                        <span class="year-label">{{ group.year }}</span>
                        <span class="year-count">{{ group.courses.length }} 门课程</span>
                    </div>
                    <div class="course-grid">
                        <div class="course-card" :class="themeClass" v-for="course in getDisplayCourses(group)" :key="course.Course_Id"
                            @click="handleCourseClick(course.Course_Id)"
                            @mouseenter="handleMouseEnter(course, $event)"
                            @mouseleave="handleMouseLeave">
                            <div class="book-cover"
                                 :class="getTextSizeClass(course.Course_title)"
                                 :style="{ backgroundColor: randomColor(course.Course_title) }">
                                {{ course.Course_title }}
                            </div>
                            <div class="book-info">
                                <div class="course-content">
                                    <div class="course-title">{{ course.Course_title }}</div>
                                    <div class="course-description">{{ course.Course_Introduction }}</div>
                                </div>
                                <div class="course-stats">共 {{ course.Course_Chapters }} 章 · {{ formatClassHour(course.Course_Class_Hour) }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-if="group.courses.length > 6" class="load-more-container">
                        <el-button
                            type="text"
                            class="load-more-btn"
                            @click="toggleYear(group.year)">
                            {{ expandedYears.has(group.year) ? '收起课程' : '更多课程' }}
                            <el-icon :class="{ 'is-expanded': expandedYears.has(group.year) }"><ArrowDown /></el-icon>
                        </el-button>
                    </div>
                </div>

                <transition name="fade-tooltip">
                    <div
                        v-if="hoverCourse"
                        class="course-tooltip"
                        :class="themeClass"
                        :style="{
                        left: hoverPosition.x + 20 + 'px',
                        top: hoverPosition.y + 20 + 'px'
                        }"
                    >
                        <div class="tooltip-title">{{ hoverCourse.Course_title }}</div>
                        <div class="tooltip-intro">{{ hoverCourse.Course_Introduction }}</div>
                        <div class="tooltip-footer">共 {{ hoverCourse.Course_Chapters }} 章 · {{ formatClassHour(hoverCourse.Course_Class_Hour) }}</div>
                    </div>
                </transition>
            </template>
        </div>
    </div>
</template>

<style scoped>

.fade-tooltip-enter-active, .fade-tooltip-leave-active {
  transition: opacity 0.25s;
}
.fade-tooltip-enter-from, .fade-tooltip-leave-to {
  opacity: 0;
}
.fade-tooltip-enter-to, .fade-tooltip-leave-from {
  opacity: 1;
}

.headText {
    font-size: 30px;
    font-weight: bold;
    display: inline-block;

    height: 100%;

    display: flex;
    justify-content: center;
    align-items: center;


}

.headContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 300px;
    transition: all 0.3s ease-in-out;
}

/* 主题适配 - 头部容器 */
.theme-light .headContainer {
    background-color: #f5f4f2;
    background-image: repeating-radial-gradient(circle, rgb(255, 255, 255) 1px, transparent 3px, transparent 18px);
}

.theme-dark .headContainer {
    background-color: #2a2a2a;
    background-image: repeating-radial-gradient(circle, rgb(70, 70, 70) 1px, transparent 3px, transparent 18px);
}

.headContainer:hover{
    background-size: 180px 180px;
}

.headGraph {
    font-size: 20px;
    font-weight: bold;
    display: inline-block;

    height: 100%;

}

.mainContainer {
    height: 100%;
    /* margin-left: 15%;
    margin-right: 15%; */
    margin-top: 20px;
    margin-bottom: 20px;

    /* width: 100%; */

    /* display: flex;
    align-items: center;
    flex-wrap: wrap; */

    display: flex;
    flex-direction: column;
    align-items: center;

    overflow: visible;
}

.columnContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 1300px;
    margin-top: 25px;
}

.year-divider {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 20px 0 10px 0;
    border-bottom: 1px solid;
    margin-bottom: 10px;
}

.theme-light .year-divider {
    border-color: #e0e0e0;
}

.theme-dark .year-divider {
    border-color: #404040;
}

.year-label {
    font-size: 24px;
    font-weight: 800;
}

.theme-light .year-label {
    color: #333;
}

.theme-dark .year-label {
    color: #e6e6e6;
}

.year-count {
    font-size: 13px;
}

.theme-light .year-count {
    color: #999;
}

.theme-dark .year-count {
    color: #777;
}

.load-more-container {
    width: 100%;
    text-align: center;
    padding: 10px 0 20px 0;
}

.load-more-btn {
    font-size: 14px;
    color: #909090;
    padding: 8px 20px;
    border-radius: 20px;
}

.load-more-btn:hover {
    color: #409eff;
    background-color: transparent !important;
}

.load-more-btn:active {
    color: #337ecc;
    background-color: transparent !important;
}

.load-more-btn .el-icon {
    transition: transform 0.3s;
    margin-left: 4px;
}

.load-more-btn .el-icon.is-expanded {
    transform: rotate(180deg);
}

.course-grid {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
}

.course-card {
    width: 31%;
    height: 120px;
    margin: 10px;
    padding: 0 6px 0 6px;
    border-radius: 12px;
    border: 1px solid;
    display: flex;
    align-items: center;
    transition: all 0.22s cubic-bezier(.4,0,.2,1);
    cursor: pointer;
    overflow: hidden;
    box-sizing: border-box;
}

/* 主题适配 - 课程卡片 */
.theme-light .course-card {
    background-color: #ffffff;
    border-color: #e6e6e6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.theme-dark .course-card {
    background-color: #2d2d2d;
    border-color: #404040;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.course-card:hover {
    transform: translateY(-4px) scale(1.02);
}

.theme-light .course-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    /* border-color: #c0c0c0; */
    background-color: #ffffff;
}

.theme-light .course-card:hover .course-title {
    color: #2d3748;
}

.theme-dark .course-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    border-color: #505050;
    background-color: #353535;
}

/* 媒体查询：当屏幕宽度小于等于 768px 时 (竖屏模式) */
@media (max-width: 768px) {
    .columnContainer {
        align-items: center !important;
        width: 100% !important;
    }

    .course-grid {
        flex-direction: column !important;
        align-items: center !important;
    }

    .course-card {
        width: 90% !important;
        max-width: 400px !important;
        margin: 10px 0 !important;
        padding: 15px !important;
        height: 110px !important;
    }
}



.course-title {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    flex-shrink: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-bottom: 2px;
}

.course-description {
    font-size: 12px;
    line-height: 1.3;
    height: 2.6em;
    max-height: 2.6em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
    word-wrap: break-word;
    word-break: break-word;
}

.course-stats {
    font-size: 12px;
    line-height: 1.2;
    flex-shrink: 0;
}

/* 主题适配 - 课程卡片文本 */
.theme-light .course-title {
    color: #4a5568;
}

.theme-light .course-description {
    color: #718096;
}

.theme-light .course-stats {
    color: #a0aec0;
}

.theme-dark .course-title {
    color: #e6e6e6;
}

.theme-dark .course-description {
    color: #aaa;
}

.theme-dark .course-stats {
    color: #bbb;
}

/* 主题适配 - 空状态消息 */
.empty-message {
    font-size: 16px;
    padding: 40px 20px;
}

.theme-light .empty-message {
    color: #666;
}

.theme-dark .empty-message {
    color: #aaa;
}

.book-cover {
    width: 75px;
    height: 100px;
    border-radius: 8px;
    /* margin-right: 12px; */
    padding: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    color: #fff;
    font-size: 12px;
    line-height: 1.2;
    font-weight: bold;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    word-break: break-all;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    box-sizing: border-box;
}

/* 根据文字长度的响应式字体大小类 */
.book-cover.short-text {
    font-size: 14px;
}

.book-cover.medium-text {
    font-size: 11px;
}

.book-cover.long-text {
    font-size: 9px;
}

/* 当屏幕较小时调整封面 */
@media (max-width: 768px) {
    .book-cover {
        width: 50px;
        height: 70px;
        margin-right: 10px;
        padding: 5px;
    }
    
    .book-cover.short-text {
        font-size: 10px;
    }

    .book-cover.medium-text {
        font-size: 8px;
    }

    .book-cover.long-text {
        font-size: 7px;
    }
    
    .book-info {
        height: 70px;
    }
    
    .course-description {
        height: 2.2em;
        max-height: 2.2em;
        line-height: 1.1;
        margin: 4px 0;
    }
}

.book-info {
    flex: 1;
    height: 95px;
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    min-width: 0;
}

.course-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.button-group-container {
    display: flex;
    /* justify-content: center; */
    margin-top: 30px;
    margin-left: 10px;
    margin-right: auto;
}

.styled-button {
    font-size: 17px;
    padding: 18px 20px;
    border-radius: 8px;
    transition: all 0.3s ease;
    margin-right: 20px;
}

.styled-button:focus {
    outline: none;
}

/* 主题适配 - 按钮样式 */
.theme-light .styled-button:hover {
    background-color: #f0f0f0;
}

.theme-dark .styled-button:hover {
    background-color: #404040;
}

/* 激活状态按钮 */
.theme-light .el-button--primary {
    background-color: #f0f0f0;
    color: #444;
    border-color: #f0f0f0;
}

.theme-light .el-button--primary:hover {
    background-color: #e8e8e8;
    color: #444;
}

.theme-dark .el-button--primary {
    background-color: #404040;
    color: #e6e6e6;
    border-color: #404040;
}

.theme-dark .el-button--primary:hover {
    background-color: #4a4a4a;
    color: #e6e6e6;
}

/* 普通状态按钮 */
.theme-light .el-button--text {
    background-color: transparent;
    color: #333;
    border: 1px solid transparent;
}

.theme-light .el-button--text:hover {
    background-color: #f0f0f0;
    color: #444;
}

.theme-dark .el-button--text {
    background-color: transparent;
    color: #cccccc;
    border: 1px solid transparent;
}

.theme-dark .el-button--text:hover {
    background-color: #404040;
    color: #e6e6e6;
}
</style>

<style>
.course-tooltip {
    position: fixed;
    z-index: 9999;
    min-width: 260px;
    max-width: 340px;
    padding: 20px 24px;
    border-radius: 16px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    pointer-events: none;
    transition: all 0.25s ease;
    font-size: 15px;
    word-break: break-word;
    line-height: 1.6;
    box-sizing: border-box;
}

.course-tooltip.theme-light {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(220, 220, 220, 0.8);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
    color: #333;
}

.course-tooltip.theme-dark {
    background: rgba(40, 40, 40, 0.92);
    border: 1px solid rgba(70, 70, 70, 0.8);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3);
    color: #e6e6e6;
}

.course-tooltip .tooltip-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
}

.course-tooltip.theme-light .tooltip-title {
    color: #2d3748;
}

.course-tooltip.theme-dark .tooltip-title {
    color: #e6e6e6;
}

.course-tooltip .tooltip-intro {
    font-size: 14px;
    margin-bottom: 10px;
}

.course-tooltip .tooltip-footer {
    font-size: 13px;
}

.course-tooltip.theme-light .tooltip-intro {
    color: #666;
}

.course-tooltip.theme-light .tooltip-footer {
    color: #888;
}

.course-tooltip.theme-dark .tooltip-intro {
    color: #bbb;
}

.course-tooltip.theme-dark .tooltip-footer {
    color: #999;
}
</style>