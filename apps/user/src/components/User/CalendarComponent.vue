<!-- 使用vue3语法 -->
<script setup>
import api from '../../api';
import { onMounted, watch } from 'vue'
import { ref } from 'vue'
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { DewCard } from '../ui';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

// 可选 userId：查看他人主页时取对方年度出勤；不传则自己
const props = defineProps({
  userId: { type: [Number, String], default: null }
})

//获取年度出勤数据
const yearAttendenceData = ref([]);

const fetchYearAttendanceData = async () => {
  try {
    const response = await api({
      url: '/records/yearly',
      method: 'get',
      params: props.userId ? { user_id: props.userId } : undefined
    })
    // 后端直接返回数组，不需要检查 code
    if (Array.isArray(response.data)) {
      yearAttendenceData.value = response.data;
    } else if (response.data && response.data.code === 200) {
      yearAttendenceData.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Error fetching year attendance data:', error);
    // 失败时使用空数据
    yearAttendenceData.value = [];
  }
};

onMounted(() => {
  fetchYearAttendanceData();
})
// 路由切换不同用户时刷新
watch(() => props.userId, fetchYearAttendanceData)

// 累计出勤天数

const currentYearDays = computed(() => {
  return yearAttendenceData.value.reduce((total, record) => {
    return total + (record.total_hours > 0 ? 1 : 0);
  }, 0);
})

// 最高连续出勤天数
const streakDays = computed(() => {
  let maxStreak = 0;
  let currentStreak = 0;
  let prevDate = null;

  yearAttendenceData.value.forEach(record => {
    const currentDate = new Date(record.date);

    if (record.total_hours > 0) { // 只有出勤的日期才参与连续天数计算
      if (prevDate) {
        const timeDiff = currentDate.getTime() - prevDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

        if (dayDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1; // 重新开始计数
        }
      } else {
        currentStreak = 1;
      }

      prevDate = currentDate;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 0; // 中断连续出勤
      prevDate = null; // 重置 prevDate
    }

    maxStreak = Math.max(maxStreak, currentStreak); // 每次循环都更新 maxStreak
  });
  return maxStreak;
})

// 生成日历数据
const calendarDays = computed(() => {
  const days = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  for (let month = 0; month < 12; month++) {
    const date = new Date(currentYear, month, 1);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    
    // 生成当月所有天数
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, monthIndex, d);
      const dateKey = currentDate.toLocaleDateString('en-CA');
      days.push({
        date: currentDate,
        count: attendanceData.value[dateKey] || 0,
        month: monthIndex, // 添加月份索引
        // color: monthColors[monthIndex] // 添加月份颜色
      });
    }
  }
  return days;
});

// 可见月份标签
const visibleMonths = computed(() => {
  const today = new Date();
  const currentYear = today.getFullYear();
  return Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
});

//判断是否出勤
const hasAttendance = (day) => day.count > 0;

// 工具提示文本
const getTooltipText = (day) => {
  // return `${day.date.toLocaleDateString()}`;
};

// 判断是否是今天
const isToday = (date) => {
  const today = new Date();
  date = new Date(date);
  return date.toDateString() === today.toDateString();
};

const hoverDay = ref(null);

// 计算每日单元格的样式（发光效果基于出勤时长）
const getDayCellStyle = (day) => {
  if (day.total_hours <= 0) {
    return {};
  }

  const hours = day.total_hours;
  const baseColor = day.color || '#00d2d3';
  const dark = isDarkMode.value;

  let glowSize, glowOpacity, bgOpacity, lightColor;

  if (dark) {
    // 暗色模式：以青色为基调，时长越长越亮（亮度 30%→82%），辉光同步增强。
    // 低时长走偏暗的青，避免和亮色模式那块亮青色撞脸——这才是「暗色专属」观感。
    const t = Math.min(Math.max(hours - 0.5, 0) / 7.5, 1); // 归一化 0..1（0.5h 起算，8h 满档）
    const lightness = 30 + t * 52;          // 30% -> 82%
    glowSize = 3 + t * 18;                  // 3 -> 21
    glowOpacity = 0.15 + t * 0.55;          // 0.15 -> 0.7
    bgOpacity = 0.5 + t * 0.4;              // 0.5 -> 0.9
    lightColor = `hsl(180, 80%, ${lightness}%)`;
  } else {
    // 明亮模式：时长越长颜色越深
    if (hours <= 3) {
      // 短时间：浅色
      glowSize = 6 + hours * 2;
      glowOpacity = 0.2 + hours * 0.1;
      bgOpacity = 0.5 + hours * 0.1;
      lightColor = baseColor;
    } else if (hours <= 6) {
      // 中等时间：颜色变深
      const ratio = (hours - 3) / 3;
      glowSize = 10 + ratio * 6;
      glowOpacity = 0.4 + ratio * 0.2;
      bgOpacity = 0.6 + ratio * 0.15;
      lightColor = baseColor;
    } else {
      // 长时间(7-8h)：最深
      const ratio = (hours - 6) / 2;
      glowSize = 14 + ratio * 4;
      glowOpacity = 0.6 + ratio * 0.15;
      bgOpacity = 0.75 + ratio * 0.1;
      lightColor = baseColor;
    }
  }

  return {
    backgroundColor: lightColor,
    boxShadow: `0 0 ${glowSize}px ${glowOpacity}px ${lightColor}`,
    opacity: bgOpacity
  };
};
</script>

<template>
  <div class="calendarContainer">
    <DewCard size="lg" divided class="calendar-card">
      <template #header>
        <div class="calendar-header">
          <span class="calendar-title">出勤日历</span>
          <div class="calendar-stats">
            <span class="stat-item">累计出勤：<b>{{ currentYearDays }}</b> 天</span>
            <span class="stat-item">最高连续：<b>{{ streakDays }}</b> 天</span>
          </div>
        </div>
      </template>

      <!-- 年度网格较宽，窄屏可横向滚动，绝不裁切 -->
      <div class="calendar-scroll">
        <div class="month-labels">
          <span v-for="month in visibleMonths" :key="month">{{ month }}</span>
        </div>
        <div class="calendar-grid">
          <div
            v-for="(day, index) in yearAttendenceData"
            :key="index"
            class="day-cell"
            :class="{ 'has-attendance': day.total_hours > 0 }"
            :style="getDayCellStyle(day)"
            :title="`${day.date}: ${day.total_hours}小时`"
          >
            <span v-if="day.total_hours > 0" class="day-hours">{{ day.total_hours }}h</span>
            <div v-if="isToday(day.date)" class="today-marker"></div>
          </div>
        </div>
      </div>
    </DewCard>
  </div>
</template>

<style scoped>
.calendarContainer {
  width: 100%;
  margin-bottom: 0;
}

/* DewCard 负责玻璃表面，这里只管标题行 + 网格排版 */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-title {
  font-size: 18px;
  font-weight: 700;
}

.calendar-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--dew-text-muted);
}

.calendar-stats b {
  font-weight: 700;
  color: var(--dew-text-heading);
}

/* 年度网格约 948px 宽：窄屏横向滚动兜底，绝不裁切 */
.calendar-scroll {
  overflow-x: auto;
  padding: 6px 2px 4px;
}

.month-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--dew-text-faint);
  font-size: 12px;
}

.calendar-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 12px);
  grid-auto-columns: 12px;
  gap: 6px;
}

.day-cell {
  position: relative;
  height: 12px;
  border-radius: 2px;
  cursor: pointer;
  background: var(--color-bg-muted);
  transition:
    transform 0.25s var(--dew-bounce),
    background-color 0.3s ease,
    opacity 0.3s ease;
}

.has-attendance {
  opacity: 0.8;
}

.day-cell:hover {
  transform: scale(1.3);
  z-index: 10;
}

.day-hours {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8px;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
}

.day-cell:hover .day-hours {
  opacity: 1;
}

.today-marker {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 4px;
  height: 4px;
  background: #ff6b6b;
  border-radius: 50%;
}

/* 年度网格较宽，缩小 DewCard 左右内边距，桌面端不出现横向滚动条
   （DewCard 默认 lg 为 20px，这里覆盖；窄屏由 .calendar-scroll 兜底滚动） */
.calendar-card :deep(.dew-card__body) {
  padding-left: 8px !important;
  padding-right: 8px !important;
}
</style>
