<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
// import api from '../../../api'
// import LearningPathComponent from './LearningPathComponent.vue'
import api from '../../api';
import LearningPathComponent from './LearningPathComponent.vue'

const router = useRouter()
const store = useStore()

// 主题计算属性
const themeClass = computed(() => store.state.darkMode ? 'theme-dark' : 'theme-light')

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

const courseList = ref([])  // 使用 ref 来声明响应式数据

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
    try {
        const res = await api({
            url: '/course/list',
            method: 'get',
        })
        courseList.value = res.data  // 将返回的数据赋值给响应式变量
        console.log(courseList.value)

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
    // 假设每个课程有 Group 字段
    return courseList.value.filter(course => course.Course_Tags === activeBtn.label);
});

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
                <div class="course-card" :class="themeClass" v-for="course in filteredCourses" :key="course.Course_Id"
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
                        <div class="course-stats">共 {{ course.Course_Chapters }} 章</div>
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
                        <div class="tooltip-footer">共 {{ hoverCourse.Course_Chapters }} 章</div>
                    </div>
                </transition>
            </template>
        </div>
    </div>
</template>

<style scoped>
.course-tooltip {
    position: fixed;
    z-index: 9999;
    min-width: 220px;
    max-width: 300px;
    padding: 18px 22px;
    border-radius: 16px;
    backdrop-filter: blur(10px);
    pointer-events: none;
    transition: all 0.2s ease;
    font-size: 15px;
    word-break: break-all;
}

/* 主题适配 - 课程悬浮提示（毛玻璃效果） */
.theme-light .course-tooltip {
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(230, 230, 230, 0.6);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    color: #333;
}

.theme-dark .course-tooltip {
    background: rgba(45, 45, 45, 0.85);
    border: 1px solid rgba(64, 64, 64, 0.6);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    color: #e6e6e6;
}

.tooltip-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
}

.tooltip-intro {
    font-size: 14px;
    margin-bottom: 10px;
}

.tooltip-footer {
    font-size: 13px;
}

/* 主题适配 - 提示框文本颜色 */
.theme-light .tooltip-intro {
    color: #666;
}

.theme-light .tooltip-footer {
    color: #888;
}

.theme-dark .tooltip-intro {
    color: #bbb;
}

.theme-dark .tooltip-footer {
    color: #999;
}
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

    overflow: hidden;
}

.columnContainer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    width: 1300px;

    margin-top: 25px;
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

.theme-dark .course-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    border-color: #505050;
    background-color: #353535;
}

/* 媒体查询：当屏幕宽度小于等于 768px 时 (竖屏模式) */
@media (max-width: 768px) {
    /* .mainContainer 的调整如果 StudyComponent 内部有这个类，也一并移动 */
    /* 如果 .mainContainer 是 StudyView 的，则保留在 StudyView */
    /* .mainContainer {
    margin-left: 0;
    margin-right: 0;
    padding-left: 10px;
    padding-right: 10px;
    box-sizing: border-box;
  } */

    .columnContainer {
        /* 确保这个类名与 StudyComponent.vue 中包裹卡片的容器一致 */
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
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
    color: #333;
}

.theme-light .course-description {
    color: #666;
}

.theme-light .course-stats {
    color: #888;
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