<template>
  <div class="teacher-admissions">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <h3>报名审批（{{ pending.length }}）</h3>
      </template>
      <div v-if="loading" style="display: flex; flex-direction: column; gap: 8px;">
        <DewSkeleton v-for="n in 3" :key="n" variant="text" :width="n === 1 ? '40%' : '85%'" />
      </div>
      <div v-else-if="!pending.length" class="empty">暂无待审批的报名申请</div>
      <div v-else class="app-list">
        <DewCard v-for="row in pending" :key="row.id" variant="inset" size="sm" style="margin: 8px 0;">
          <div class="app-row">
            <span class="app-user">{{ row.username }}</span>
            <DewTag :type="row.apply_role === 'mentor' ? 'warning' : 'neutral'" size="sm" :round="true">
              {{ row.apply_role === 'mentor' ? '导生报名' : '学员报名' }}
            </DewTag>
            <span class="app-date">承诺出勤 {{ dayCount(row) }} 天</span>
            <span class="app-time">{{ (row.created_at || '').slice(0, 10) }}</span>
          </div>
          <div class="app-reason">{{ row.reason || '（未填写事由）' }}</div>
          <div class="app-actions">
            <!-- 未启用选导生的营期可预分配导生；启用选导生时归属由开营前活动决定 -->
            <DewSelect v-if="row.apply_role !== 'mentor' && !msEnabled" v-model="row._mentor"
              placeholder="预分配导生（可选）" size="sm" style="width: 180px;"
              :options="mentors.map((m) => ({ label: m.username, value: m.user_id }))" />
            <div class="app-buttons">
              <DewButton size="sm" type="glass" :disabled="busy" @click="approve(row)">批准</DewButton>
              <DewButton size="sm" type="ghost" :disabled="busy" @click="reject(row)">拒绝</DewButton>
            </div>
          </div>
        </DewCard>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard, DewButton, DewTag, DewSkeleton, DewSelect } from '@bme/dew-ui';
import { ElMessage, ElMessageBox } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  msEnabled: { type: Boolean, default: false },
});
const emit = defineEmits(['reviewed']);

const pending = ref([]);
const mentors = ref([]);
const loading = ref(true);
const busy = ref(false);   // 审批防连击（后端另有 pending 校验兜底）

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchCampJoinRequests(props.sid);
    pending.value = (d.requests || []).map((r) => ({ ...r, _mentor: null }));
    mentors.value = d.mentors || [];
  } catch {
    ElMessage.error('加载报名申请失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

const dayCount = (row) => {
  try { return JSON.parse(row.selected_days || '[]').length; } catch { return 0; }
};

async function approve(row) {
  if (busy.value) return;
  busy.value = true;
  try {
    const r = await campService.approveCampJoin(row.id, row._mentor || null);
    ElMessage.success(r.message || '已批准');
    emit('reviewed');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '审批失败');
  } finally { busy.value = false; }
}

async function reject(row) {
  if (busy.value) return;
  let reason = '';
  try {
    const { value } = await ElMessageBox.prompt(
      `可填写拒绝原因（将通知 ${row.username}）`, '拒绝报名申请',
      { confirmButtonText: '拒绝', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' });
    reason = value || '';
  } catch { return; }
  busy.value = true;
  try {
    await campService.rejectCampJoin(row.id, reason);
    ElMessage.success('已拒绝');
    emit('reviewed');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally { busy.value = false; }
}
</script>

<style scoped>
.empty { padding: 20px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }
.app-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.app-user { font-weight: 600; min-width: 72px; }
.app-date, .app-time { font-size: 12px; color: var(--dew-text-faint); }
.app-reason { color: var(--dew-text-muted); font-size: 13px; margin: 6px 0; }
.app-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 4px; }
.app-buttons { display: flex; gap: 8px; }
</style>
