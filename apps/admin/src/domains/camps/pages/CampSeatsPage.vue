<template>
  <div class="camp-seats-page">
    <div class="page-header">
      <div class="page-title">座位分配</div>
      <div class="header-actions">
        <span class="hint">座位资源（物理座位）在「系统与基础设施」维护</span>
        <el-button v-if="manageWritable" type="primary" size="small" @click="openAssignSeat">分配座位</el-button>
      </div>
    </div>

    <el-alert v-if="!physicalSeats.length" type="info" :closable="false"
      title="平台尚无物理座位资源：请先在「系统与基础设施 / 物理座位」录入房间与座位，再回此分配" />

    <DewCard no-hover class="table-card">
      <el-table :data="seats" border size="small" v-loading="loading">
        <el-table-column label="座位" prop="label" width="120" />
        <el-table-column label="分配给">
          <template #default="{ row }">{{ row.username || '—' }}</template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 分配座位 -->
    <el-dialog v-model="seatDlg.visible" title="分配座位" width="460px">
      <el-form :model="seatDlg.form" label-width="70px">
        <el-form-item label="座位" required>
          <el-select v-model="seatDlg.form.seat_id" filterable placeholder="选择物理座位" style="width: 100%;">
            <el-option v-for="s in physicalSeats" :key="s.Seat_Id" :label="s.Seat_Label" :value="s.Seat_Id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配给">
          <el-select v-model="seatDlg.form.user_id" clearable filterable remote reserve-keyword
            :remote-method="memberPicker.search" :loading="memberPicker.loading.value"
            placeholder="输入姓名搜索；留空 = 解绑" style="width: 100%;" @visible-change="memberPicker.onOpen">
            <el-option v-for="m in memberPicker.options.value" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seatDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAssignSeat">分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createMemberPicker } from '../shared/memberOptions'

const ctx = useCampContext()
const { campId, manageWritable, options } = ctx
const { physicalSeats, ensureSeats } = options

const seats = ref([])
const loading = ref(false)
const seatDlg = reactive({ visible: false, form: { seat_id: null, user_id: null } })
const memberPicker = createMemberPicker(campId)

async function fetchSeats() {
  loading.value = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/seats`)
    seats.value = res.data?.seats || []
  } catch {
    seats.value = []
  } finally {
    loading.value = false
  }
}

function openAssignSeat() {
  seatDlg.form = { seat_id: null, user_id: null }
  seatDlg.visible = true
  memberPicker.onOpen(true)
}

async function submitAssignSeat() {
  if (!seatDlg.form.seat_id) { ElMessage.warning('请选择座位'); return }
  try {
    await api.post('/camp/seat/assign', {
      camp_session_id: campId.value, seat_id: seatDlg.form.seat_id, user_id: seatDlg.form.user_id,
    })
    ElMessage.success('已分配')
    seatDlg.visible = false
    fetchSeats()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '分配失败')
  }
}

onMounted(() => {
  fetchSeats()
  ensureSeats()
})
</script>

<style scoped>
.camp-seats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
