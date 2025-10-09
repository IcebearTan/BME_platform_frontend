<template>
  <div class="attendance-management" :class="{ 'theme-dark': isDarkMode }">
    <div class="attendance-header">
      <div class="header-info">
        <h3 class="page-title">考勤管理</h3>
        <p class="page-desc">设置和管理小组考勤规则、统计数据</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleExportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <div class="attendance-content">
      <!-- 考勤规则设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Clock /></el-icon>
          <h4 class="section-title">考勤规则</h4>
        </div>
        
        <div class="settings-form">
          <el-form :model="attendanceRules" label-width="120px" :rules="rules">
            <!-- 签到时间设置 -->
            <h5 class="simple-title">签到时间设置</h5>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="第一次签到" prop="firstCheckInTime">
                  <el-time-picker 
                    v-model="attendanceRules.firstCheckInTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="选择签到时间"
                    style="width: 100%"
                    :clearable="false"
                    :editable="false"
                    @change="handleRuleChange"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item>
                  <el-checkbox 
                    v-model="attendanceRules.enableSecondCheckIn"
                    @change="handleRuleChange"
                  >
                    启用第二次签到
                  </el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24" v-if="attendanceRules.enableSecondCheckIn">
              <el-col :span="12">
                <el-form-item label="第二次签到" prop="secondCheckInTime">
                  <el-time-picker 
                    v-model="attendanceRules.secondCheckInTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="选择签到时间"
                    style="width: 100%"
                    :clearable="false"
                    :editable="false"
                    @change="handleRuleChange"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item>
                  <el-checkbox 
                    v-model="attendanceRules.enableThirdCheckIn"
                    @change="handleRuleChange"
                  >
                    启用第三次签到
                  </el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24" v-if="attendanceRules.enableSecondCheckIn && attendanceRules.enableThirdCheckIn">
              <el-col :span="12">
                <el-form-item label="第三次签到" prop="thirdCheckInTime">
                  <el-time-picker 
                    v-model="attendanceRules.thirdCheckInTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="选择签到时间"
                    style="width: 100%"
                    :clearable="false"
                    :editable="false"
                    @change="handleRuleChange"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 考勤规则 -->
            <h5 class="simple-title">考勤规则</h5>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="时间容忍范围">
                  <el-input-number 
                    v-model="attendanceRules.timeToleranceMinutes"
                    :min="0"
                    :max="60"
                    :step="5"
                    @change="handleRuleChange"
                  />
                  <span class="unit-text">分钟</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="当日出勤时长">
                  <el-input-number 
                    v-model="attendanceRules.requiredHours"
                    :min="1"
                    :max="12"
                    :step="0.5"
                    :precision="1"
                    @change="handleRuleChange"
                  />
                  <span class="unit-text">小时</span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 统计设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><DataAnalysis /></el-icon>
          <h4 class="section-title">统计设置</h4>
        </div>
        
        <div class="settings-form">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">统计周期</div>
              <div class="setting-desc">选择考勤统计的时间周期</div>
            </div>
            <div class="setting-control">
              <el-radio-group v-model="statisticsSettings.period" @change="handleStatisticsChange">
                <el-radio label="weekly">按周统计</el-radio>
                <el-radio label="monthly">按月统计</el-radio>
                <el-radio label="semester">按学期统计</el-radio>
              </el-radio-group>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">出勤率计算</div>
              <div class="setting-desc">设置出勤率的计算方式</div>
            </div>
            <div class="setting-control">
              <el-select 
                v-model="statisticsSettings.attendanceRateMethod"
                style="width: 200px"
                @change="handleStatisticsChange"
              >
                <el-option label="按签到次数" value="checkin" />
                <el-option label="按时长" value="duration" />
                <el-option label="综合评分" value="comprehensive" />
              </el-select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">自动提醒</div>
              <div class="setting-desc">自动发送考勤提醒通知</div>
            </div>
            <div class="setting-control">
              <el-switch 
                v-model="statisticsSettings.autoReminder"
                @change="handleStatisticsChange"
              />
            </div>
          </div>

          <div class="setting-item" v-show="statisticsSettings.autoReminder">
            <div class="setting-info">
              <div class="setting-label">提醒时间</div>
              <div class="setting-desc">提前多长时间发送提醒</div>
            </div>
            <div class="setting-control">
              <el-select 
                v-model="statisticsSettings.reminderMinutes"
                style="width: 150px"
                @change="handleStatisticsChange"
              >
                <el-option label="5分钟前" :value="5" />
                <el-option label="10分钟前" :value="10" />
                <el-option label="15分钟前" :value="15" />
                <el-option label="30分钟前" :value="30" />
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <!-- 考勤数据概览 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Histogram /></el-icon>
          <h4 class="section-title">数据概览</h4>
          <div class="header-actions">
            <el-button size="small" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </div>
        
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-icon present">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalPresent }}</div>
              <div class="stat-label">出勤次数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon late">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalLate }}</div>
              <div class="stat-label">迟到次数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon absent">
              <el-icon><Close /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalAbsent }}</div>
              <div class="stat-label">缺勤次数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon rate">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.attendanceRate }}%</div>
              <div class="stat-label">出勤率</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成员考勤列表 -->
      <div class="settings-section">
        <div class="section-header centered-header">
          <div class="header-left">
            <el-icon class="section-icon"><User /></el-icon>
            <h4 class="section-title">成员考勤</h4>
          </div>
          <div class="header-right">
            <el-button 
              type="primary" 
              size="small" 
              @click="toggleRanking"
            >
              {{ showRanking ? '隐藏排名' : '显示排名' }}
            </el-button>
            <el-input 
              v-model="searchKeyword"
              placeholder="搜索成员"
              style="width: 200px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
        
        <div class="attendance-table-container">
          <el-table 
            :data="sortedMemberAttendance" 
            stripe
            style="width: 100%"
            :header-cell-style="{ backgroundColor: '#f5f7fa', textAlign: 'center' }"
            :row-style="{ cursor: 'pointer' }"
            @row-click="toggleRowExpansion"
          >
            <!-- 展开行 -->
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="member-detail-panel">
                  <div class="detail-header">
                    <h5>{{ row.name }} 的考勤详情</h5>
                  </div>
                  
                  <!-- 考勤日历可视化 -->
                  <div class="attendance-calendar">
                    <div class="calendar-header">
                      <span class="calendar-title">本月考勤情况</span>
                      <div class="legend">
                        <div class="legend-item">
                          <div class="legend-color present"></div>
                          <span>正常</span>
                        </div>
                        <div class="legend-item">
                          <div class="legend-color late"></div>
                          <span>迟到</span>
                        </div>
                        <div class="legend-item">
                          <div class="legend-color absent"></div>
                          <span>缺勤</span>
                        </div>
                        <div class="legend-item">
                          <div class="legend-color weekend"></div>
                          <span>周末</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="calendar-grid">
                      <div 
                        v-for="day in row.attendanceCalendar" 
                        :key="day.date"
                        :class="['calendar-cell', day.status]"
                        :title="`${day.date}: ${getStatusText(day.status)}`"
                      >
                        {{ new Date(day.date).getDate() }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 详细统计 -->
                  <div class="detail-stats">
                    <div class="stat-item">
                      <span class="stat-label">总出勤天数:</span>
                      <span class="stat-value">{{ row.totalDays }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">准时出勤:</span>
                      <span class="stat-value">{{ row.onTimeCount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">迟到次数:</span>
                      <span class="stat-value stat-late">{{ row.lateCount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">缺勤次数:</span>
                      <span class="stat-value stat-absent">{{ row.absentCount }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <!-- 排名列 (可选显示) -->
            <el-table-column v-if="showRanking" label="排名" width="70" align="center">
              <template #default="{ $index }">
                <div class="ranking-badge" :class="getRankingClass($index)">
                  {{ $index + 1 }}
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column prop="studentId" label="学号" min-width="120" />
            
            <el-table-column label="出勤次数" min-width="100" align="center">
              <template #default="{ row }">
                <span class="stat-present">{{ row.presentCount }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="迟到次数" min-width="100" align="center">
              <template #default="{ row }">
                <span class="stat-late">{{ row.lateCount }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="缺勤次数" min-width="100" align="center">
              <template #default="{ row }">
                <span class="stat-absent">{{ row.absentCount }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="准时率" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag 
                  :type="getPunctualityRateType(row.punctualityRate)"
                  effect="light"
                >
                  {{ row.punctualityRate }}%
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="出勤率" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag 
                  :type="getAttendanceRateType(row.attendanceRate)"
                  effect="light"
                >
                  {{ row.attendanceRate }}%
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="100" fixed="right" align="center">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  type="warning" 
                  link
                  @click.stop="editAttendance(row)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { 
  Clock, Download, DataAnalysis, Histogram, 
  Check, Close, TrendCharts, User, Search, 
  Refresh 
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const store = useStore();

// 组件属性
const props = defineProps({
  groupId: {
    type: [String, Number],
    required: true
  }
});

// 事件定义
const emit = defineEmits(['settings-updated']);

// 响应式数据
const searchKeyword = ref('');
const saving = ref(false);
const showRanking = ref(false);

// 考勤规则设置
const attendanceRules = reactive({
  firstCheckInTime: '08:30',
  secondCheckInTime: '17:00',
  thirdCheckInTime: '20:30',
  enableSecondCheckIn: true,
  enableThirdCheckIn: false,
  timeToleranceMinutes: 15,
  requiredHours: 8.0
});

// 统计设置
const statisticsSettings = reactive({
  period: 'weekly',
  attendanceRateMethod: 'checkin',
  autoReminder: true,
  reminderMinutes: 10
});

// 统计数据
const statistics = reactive({
  totalPresent: 0,
  totalLate: 0,
  totalAbsent: 0,
  attendanceRate: 0
});

// 成员考勤数据
const memberAttendance = ref([]);

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 过滤后的成员考勤数据
const filteredMemberAttendance = computed(() => {
  if (!searchKeyword.value) return memberAttendance.value;
  
  return memberAttendance.value.filter(member => 
    member.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    member.studentId.includes(searchKeyword.value)
  );
});

// 按出勤率排序的成员数据
const sortedMemberAttendance = computed(() => {
  return [...filteredMemberAttendance.value].sort((a, b) => {
    // 先按出勤率排序，再按准时率排序
    if (b.attendanceRate !== a.attendanceRate) {
      return b.attendanceRate - a.attendanceRate;
    }
    return b.punctualityRate - a.punctualityRate;
  });
});

// 表单验证规则
const rules = {
  firstCheckInTime: [
    { required: true, message: '请设置第一次签到时间', trigger: 'change' }
  ],
  secondCheckInTime: [
    { required: true, message: '请设置第二次签到时间', trigger: 'change' }
  ],
  thirdCheckInTime: [
    { required: false, message: '请设置第三次签到时间', trigger: 'change' }
  ]
};

// 工具函数
const getAttendanceRateType = (rate) => {
  if (rate >= 95) return 'success';
  if (rate >= 80) return 'warning';
  return 'danger';
};

const getPunctualityRateType = (rate) => {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'danger';
};

const getRankingClass = (index) => {
  if (index === 0) return 'rank-first';
  if (index === 1) return 'rank-second';
  if (index === 2) return 'rank-third';
  return 'rank-normal';
};

const getStatusText = (status) => {
  const statusMap = {
    'present': '正常出勤',
    'late': '迟到',
    'absent': '缺勤',
    'weekend': '周末'
  };
  return statusMap[status] || '未知';
};

// 方法
const handleRuleChange = () => {
  // 保存考勤规则变更
  emit('settings-updated', {
    type: 'attendance-rules',
    data: attendanceRules
  });
};

const handleStatisticsChange = () => {
  // 保存统计设置变更
  emit('settings-updated', {
    type: 'statistics-settings',
    data: statisticsSettings
  });
};

const handleExportData = () => {
  ElMessageBox.confirm(
    '确定要导出考勤数据吗？',
    '导出确认',
    {
      confirmButtonText: '导出',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 执行导出逻辑
    ElMessage.success('考勤数据导出成功！');
  });
};

const refreshData = async () => {
  try {
    // 刷新统计数据和成员考勤数据
    await loadStatistics();
    await loadMemberAttendance();
    ElMessage.success('数据刷新成功！');
  } catch (error) {
    ElMessage.error('数据刷新失败！');
  }
};

const toggleRanking = () => {
  showRanking.value = !showRanking.value;
};

const toggleRowExpansion = (row, column, event) => {
  // 点击操作列时不展开
  if (column && column.property === 'actions') {
    return;
  }
  // 这里可以添加展开逻辑，Element Plus 会自动处理展开状态
};

const editAttendance = (member) => {
  // 编辑成员考勤记录
  ElMessage.info(`编辑 ${member.name} 的考勤记录`);
};

const loadStatistics = async () => {
  // 模拟加载统计数据
  statistics.totalPresent = 156;
  statistics.totalLate = 12;
  statistics.totalAbsent = 8;
  statistics.attendanceRate = Math.round((statistics.totalPresent / (statistics.totalPresent + statistics.totalAbsent)) * 100);
};

const loadMemberAttendance = async () => {
  // 生成考勤日历数据
  const generateAttendanceCalendar = (presentCount, lateCount, absentCount) => {
    const calendar = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      
      let status = 'weekend';
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 非周末
        const rand = Math.random();
        if (rand < 0.8) status = 'present';
        else if (rand < 0.9) status = 'late';
        else status = 'absent';
      }
      
      calendar.push({
        date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        status: status
      });
    }
    return calendar;
  };
  
  // 模拟加载成员考勤数据
  memberAttendance.value = [
    {
      id: 1,
      name: '张三',
      studentId: '2021001',
      presentCount: 18,
      onTimeCount: 16,
      lateCount: 2,
      absentCount: 1,
      totalDays: 21,
      attendanceRate: 95,
      punctualityRate: 89,
      attendanceCalendar: generateAttendanceCalendar(18, 2, 1)
    },
    {
      id: 2,
      name: '李四',
      studentId: '2021002',
      presentCount: 16,
      onTimeCount: 13,
      lateCount: 3,
      absentCount: 2,
      totalDays: 21,
      attendanceRate: 89,
      punctualityRate: 72,
      attendanceCalendar: generateAttendanceCalendar(16, 3, 2)
    },
    {
      id: 3,
      name: '王五',
      studentId: '2021003',
      presentCount: 19,
      onTimeCount: 18,
      lateCount: 1,
      absentCount: 1,
      totalDays: 21,
      attendanceRate: 95,
      punctualityRate: 95,
      attendanceCalendar: generateAttendanceCalendar(19, 1, 1)
    },
    {
      id: 4,
      name: '赵六',
      studentId: '2021004',
      presentCount: 20,
      onTimeCount: 20,
      lateCount: 0,
      absentCount: 1,
      totalDays: 21,
      attendanceRate: 95,
      punctualityRate: 100,
      attendanceCalendar: generateAttendanceCalendar(20, 0, 1)
    },
    {
      id: 5,
      name: '钱七',
      studentId: '2021005',
      presentCount: 15,
      onTimeCount: 12,
      lateCount: 3,
      absentCount: 3,
      totalDays: 21,
      attendanceRate: 83,
      punctualityRate: 67,
      attendanceCalendar: generateAttendanceCalendar(15, 3, 3)
    }
  ];
};

// 生命周期
onMounted(async () => {
  await loadStatistics();
  await loadMemberAttendance();
});
</script>

<style scoped>
.attendance-management {
  height: 100%;
  overflow-y: auto;
  background-color: #f8fafc;
}

.theme-dark.attendance-management {
  background-color: #1a1a1a;
}

.attendance-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.theme-dark .attendance-header {
  background: #2d2d2d;
  border-bottom-color: #404040;
}

.header-info .page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.theme-dark .header-info .page-title {
  color: #f9fafb;
}

.header-info .page-desc {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.theme-dark .header-info .page-desc {
  color: #9ca3af;
}

.attendance-content {
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.theme-dark .settings-section {
  background: #2d2d2d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f8fafc;
}

.theme-dark .section-header {
  background-color: #374151;
  border-bottom-color: #4b5563;
}

.section-icon {
  color: #3b82f6;
  margin-right: 12px;
  font-size: 20px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
}

.theme-dark .section-title {
  color: #f9fafb;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.settings-form {
  padding: 24px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.theme-dark .setting-item {
  border-bottom-color: #374151;
}

.setting-info {
  flex: 1;
  margin-right: 24px;
}

.setting-label {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.theme-dark .setting-label {
  color: #f9fafb;
}

.setting-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.theme-dark .setting-desc {
  color: #9ca3af;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-text {
  font-size: 14px;
  color: #6b7280;
  margin-left: 8px;
}

.theme-dark .unit-text {
  color: #9ca3af;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.theme-dark .stat-card {
  background: #374151;
  border-color: #4b5563;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.present {
  background: #10b981;
}

.stat-icon.late {
  background: #f59e0b;
}

.stat-icon.absent {
  background: #ef4444;
}

.stat-icon.rate {
  background: #3b82f6;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.theme-dark .stat-value {
  color: #f9fafb;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

.attendance-table {
  padding: 0 24px 24px;
}

.stat-present {
  color: #10b981;
  font-weight: 600;
}

.stat-late {
  color: #f59e0b;
  font-weight: 600;
}

.stat-absent {
  color: #ef4444;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .attendance-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .attendance-content {
    padding: 0 16px 16px;
  }
  
  .settings-form {
    padding: 16px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-info {
    margin-right: 0;
  }
  
  .statistics-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .section-header {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* 简单标题样式 */
.simple-title {
  margin: 24px 0 16px 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.simple-title:first-child {
  margin-top: 0;
}

.theme-dark .simple-title {
  color: #f9fafb;
}

/* 时间选择器优化 */
:deep(.el-time-editor) {
  width: 100% !important;
}

:deep(.el-time-editor .el-input__inner) {
  text-align: left;
  padding-left: 12px;
}

:deep(.el-time-editor .el-input__suffix) {
  right: 12px;
}

/* 移除时间选择器的奇怪边框效果 */
:deep(.el-time-editor.is-active) {
  border-color: #409eff;
}

:deep(.el-time-editor:focus-within) {
  border-color: #409eff;
}

/* 成员考勤表格样式 */
.centered-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.attendance-table-container {
  padding: 0 24px 24px;
}

/* 排名徽章样式 */
.ranking-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.ranking-badge.rank-first {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #92400e;
}

.ranking-badge.rank-second {
  background: linear-gradient(135deg, #c0c0c0, #e5e7eb);
  color: #374151;
}

.ranking-badge.rank-third {
  background: linear-gradient(135deg, #cd7f32, #d97706);
  color: white;
}

.ranking-badge.rank-normal {
  background: #6b7280;
  color: white;
}

/* 成员详情面板 */
.member-detail-panel {
  padding: 20px 40px;
  background: #f9fafb;
  border-radius: 8px;
  margin: 10px 0;
}

.theme-dark .member-detail-panel {
  background: #374151;
}

.detail-header h5 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.theme-dark .detail-header h5 {
  color: #f9fafb;
}

/* 考勤日历样式 */
.attendance-calendar {
  margin-bottom: 24px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.theme-dark .calendar-title {
  color: #f3f4f6;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.present {
  background: #10b981;
}

.legend-color.late {
  background: #f59e0b;
}

.legend-color.absent {
  background: #ef4444;
}

.legend-color.weekend {
  background: #e5e7eb;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  max-width: 350px;
}

.calendar-cell {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-cell:hover {
  transform: scale(1.1);
}

.calendar-cell.present {
  background: #10b981;
  color: white;
}

.calendar-cell.late {
  background: #f59e0b;
  color: white;
}

.calendar-cell.absent {
  background: #ef4444;
  color: white;
}

.calendar-cell.weekend {
  background: #e5e7eb;
  color: #6b7280;
}

.theme-dark .calendar-cell.weekend {
  background: #4b5563;
  color: #9ca3af;
}

/* 详细统计样式 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.theme-dark .stat-item {
  background: #2d2d2d;
  border-color: #4b5563;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.theme-dark .stat-value {
  color: #f9fafb;
}
</style>