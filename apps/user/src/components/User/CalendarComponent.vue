<!-- 使用vue3语法 -->
<script setup>
import api from '../../api';
import { onMounted } from 'vue'
import { ref } from 'vue'
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

//获取年度出勤数据
const yearAttendenceData = ref([]);

const fetchYearAttendanceData = async () => {
  try {
    const response = await api({
      url: '/records/yearly',
      method: 'get'
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
    // 暗黑模式：时长越长越亮白
    if (hours <= 3) {
      glowSize = 4 + hours * 2;
      glowOpacity = 0.2 + hours * 0.1;
      bgOpacity = 0.5 + hours * 0.1;
      lightColor = baseColor;
    } else if (hours <= 6) {
      const whiteRatio = (hours - 3) / 3;
      glowSize = 10 + (hours - 3) * 3;
      glowOpacity = 0.4 + whiteRatio * 0.3;
      bgOpacity = 0.6 + whiteRatio * 0.2;
      lightColor = baseColor;
    } else {
      const whiteRatio = (hours - 6) / 2;
      glowSize = 18 + whiteRatio * 8;
      glowOpacity = 0.7 + whiteRatio * 0.3;
      bgOpacity = 0.8 + whiteRatio * 0.2;
      lightColor = `hsl(${180 + whiteRatio * 20}, 90%, ${70 + whiteRatio * 20}%)`;
    }
  } else {
    // 明亮模式：时长越短颜色越明显，长时间淡一些
    if (hours <= 3) {
      // 短时间：明显颜色
      glowSize = 8 + hours * 2;
      glowOpacity = 0.3 + hours * 0.15;
      bgOpacity = 0.7 + hours * 0.1;
      lightColor = baseColor;
    } else if (hours <= 6) {
      // 中等时间：颜色变淡
      const fadeRatio = (hours - 3) / 3;
      glowSize = 12 + fadeRatio * 4;
      glowOpacity = 0.5 - fadeRatio * 0.2;
      bgOpacity = 0.8 - fadeRatio * 0.15;
      lightColor = baseColor;
    } else {
      // 长时间(7-8h)：更淡
      const fadeRatio = (hours - 6) / 2;
      glowSize = 16 - fadeRatio * 4;
      glowOpacity = 0.3 - fadeRatio * 0.1;
      bgOpacity = 0.65 - fadeRatio * 0.1;
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
  <div class="calendarContainer" :class="{ 'theme-dark': isDarkMode }">
    <div class="calendarCard">
      <div class="calendarHeader">
        <div style="font-size: 18px;">出勤日历</div>
        <div>
          <span style="margin-right: 20px; font-size: 14px; color: gray; font-weight: lighter;">累计出勤： {{ currentYearDays }} 天</span>
          <span style="font-size: 14px; color: gray; font-weight: lighter;">最高连续： {{ streakDays }} 天</span>
        </div>
      </div>
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
  </div>
</template>

<style scoped>
.calendarContainer{
  width: 100%;
  margin-bottom: 15px;
}
.calendarCard{
  /* width: 100%; */
  height: 242px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: #e7edf5 0px 0px 10px 0px;
  padding: 5px;
  padding-bottom: 0;
}
.calendarHeader{
  height: 40px;
  display: flex;
  justify-content: space-between;
  /* align-items: center; */
  /* padding: 0 10px; */
  font-size: 16px;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #eee;
  padding:10px 10px 0px 10px;
}
.calendar-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 12px);
  grid-auto-columns: 12px; 
  gap: 6px; 
  padding: 10px 15px 0px 10px;
}

.day-cell {
  position: relative;
  height: 12px;
  border-radius: 2px;
  cursor: pointer;
  background: #ebedf0;
  transition: all 0.3s ease;
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
.calendars{
  width: 160px;
  height: 150px;

  border-radius: 5px;
  background-color: #6666665b;

  margin: 1px;
  margin-top: 20px;
}
.month-labels {
  display: flex;
  justify-content: space-between;
  color: #969696;
  font-size: 12px;
  order: 3;
  padding: 25px 5% 0px 5%;
  box-sizing: border-box;
}

/* 暗黑模式 */
.theme-dark .calendarCard {
  background-color: rgba(40, 40, 40, 0.9);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.theme-dark .calendarHeader {
  color: #f5f5f5;
  border-bottom-color: #3a3a3a;
}

.theme-dark .month-labels {
  color: #666;
}

.theme-dark .day-cell {
  background-color: #2a2a2a;
}
</style>
