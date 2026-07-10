<template>
  <div class="mentor-leave">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>请假审批（{{ leaves.length }}）</h3></template>
      <div v-if="!leaves.length" class="empty">本团队暂无请假记录</div>
      <div v-else class="leave-list">
        <DewCard v-for="lv in leaves" :key="lv.id" variant="inset" size="sm" style="margin: 8px 0;">
          <div class="row">
            <span class="user">{{ lv.username }}</span>
            <span class="date">{{ lv.start_date }} ~ {{ lv.end_date }}</span>
            <DewBadge :type="statusType(lv.status)">{{ statusLabel(lv.status) }}</DewBadge>
          </div>
          <div class="reason">{{ lv.reason || '（未填写事由）' }}</div>
          <div v-if="lv.status === 'pending'" class="actions">
            <DewButton size="sm" type="glass" @click="approve(lv, true)">批准</DewButton>
            <DewButton size="sm" type="ghost" @click="approve(lv, false)">拒绝</DewButton>
          </div>
        </DewCard>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DewCard, DewBadge, DewButton } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const leaves = ref([]);
const statusLabel = (s) => ({ pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s);
const statusType = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'neutral');

async function load() {
  try { const d = await campService.fetchTeamLeaves(props.sid); leaves.value = d.leaves || []; }
  catch { ElMessage.error('加载请假记录失败'); }
}

async function approve(lv, ok) {
  try {
    await campService.approveLeave(lv.id, ok);
    ElMessage.success(ok ? '已批准' : '已拒绝');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '审批失败');
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.leave-list { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; }
.user { font-weight: 600; min-width: 80px; }
.date { color: var(--dew-text-muted); font-size: 13px; flex: 1; }
.reason { color: var(--dew-text-muted); font-size: 13px; margin: 6px 0; }
.actions { display: flex; gap: 8px; }
.empty { color: var(--dew-text-muted); padding: 16px 0; }
</style>
