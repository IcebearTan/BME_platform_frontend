<template>
  <div class="camp-attendance-page">
    <div class="page-header">
      <div class="page-title">考勤</div>
      <div class="header-actions">
        <span class="hint">模式与参数编辑在「设置与生命周期」，此处只读数据与运行操作</span>
      </div>
    </div>

    <template v-if="attModeSaved === 'daily'">
      <el-alert type="info" :closable="false"
        :title="`本营 ${studentCount} 名学员；承诺出勤日按营期范围内工作日（${session.weekdays_only ? '仅周一~周五' : '含周末'}）展开`" />
      <div style="margin-top: 12px;">
        <el-button v-if="manageWritable" type="primary" @click="regenPlan">重生成承诺出勤日</el-button>
        <span class="hint">加入新学员时自动生成；此处可手动重生成（幂等，自动清理范围外/范围内周末的旧承诺日）</span>
      </div>
    </template>
    <el-alert v-else type="info" :closable="false"
      title="按周累计模式：学员报名不收承诺日，出勤看板按周统计打卡次数与时长" />

    <!-- 营内考勤看板（原跨营看板内嵌复用，隐藏选择器） -->
    <div class="att-board">
      <CampAttendanceBoard :camp-id="campId" hide-selector
        :start-date="session.start_date" :end-date="session.end_date" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../../../api'
import CampAttendanceBoard from '../../../components/CampAttendanceBoard.vue'
import { useCampContext } from '../context/campContext'

const ctx = useCampContext()
const { campId, session, manageWritable, attModeSaved } = ctx

const studentCount = ref(0)

async function fetchCounts() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/members`, {
      params: { page: 1, page_size: 1 },
    })
    studentCount.value = res.data?.counts?.student ?? 0
  } catch { /* counts 失败不阻塞考勤页 */ }
}

async function regenPlan() {
  try {
    const res = await api.post(`/camp/attendance/plan/${campId.value}`)
    ElMessage.success(`已重生成，共 ${res.data.plan_count} 个承诺日`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '重生成失败')
  }
}

onMounted(fetchCounts)
</script>

<style scoped>
.camp-attendance-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint {
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.att-board {
  margin-top: 8px;
}
</style>
