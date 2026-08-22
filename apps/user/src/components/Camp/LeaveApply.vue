<template>
  <div class="leave-apply">
    <DewCard variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
      <template #header><h3>申请请假</h3></template>
      <el-form label-width="80px" style="max-width: 520px;">
        <el-form-item label="日期段" required>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
            start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
            style="width: 100%;" />
        </el-form-item>
        <el-form-item label="事由">
          <DewInput v-model="reason" type="textarea" :rows="3" placeholder="请简要说明请假原因" />
        </el-form-item>
        <el-form-item>
          <DewButton type="glass" :disabled="submitting" @click="submit">提交申请</DewButton>
        </el-form-item>
      </el-form>
    </DewCard>

    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>我的请假记录</h3></template>
      <div v-if="!leaves.length" class="empty">暂无请假记录</div>
      <div v-else class="leave-list">
        <DewCard v-for="lv in leaves" :key="lv.id" variant="inset" size="sm" style="margin: 8px 0;">
          <div class="leave-row">
            <span class="lv-date">{{ lv.start_date }} ~ {{ lv.end_date }}</span>
            <DewBadge :type="statusType(lv.status)">{{ statusLabel(lv.status) }}</DewBadge>
          </div>
          <div class="lv-reason">{{ lv.reason || '（未填写事由）' }}</div>
        </DewCard>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DewCard, DewButton, DewInput, DewBadge } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const dateRange = ref(null);
const reason = ref('');
const submitting = ref(false);
const leaves = ref([]);

const statusLabel = (s) => ({ pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s);
const statusType = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'neutral');

async function load() {
  try {
    const data = await campService.fetchMyLeaves(props.sid);
    leaves.value = data.leaves || [];
  } catch {
    ElMessage.error('加载请假记录失败');
  }
}

async function submit() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择请假日期段');
    return;
  }
  submitting.value = true;
  try {
    await campService.submitLeave(props.sid, dateRange.value[0], dateRange.value[1], reason.value);
    ElMessage.success('请假申请已提交，等待导生/老师审批');
    dateRange.value = null;
    reason.value = '';
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.leave-list { display: flex; flex-direction: column; }
.leave-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.lv-date { font-weight: 600; }
.lv-reason { color: #909399; font-size: 13px; margin-top: 4px; }
.empty { color: #909399; padding: 16px 0; }
</style>
