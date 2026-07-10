<template>
  <div class="mentor-members">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>团队成员（{{ students.length }}）</h3></template>
      <div v-if="!students.length" class="empty">本团队暂无学员</div>
      <div v-else class="member-grid">
        <DewCard v-for="m in students" :key="m.user_id" variant="inset" size="sm" style="min-width: 160px;">
          <div class="m-name">{{ m.username }}</div>
          <div class="m-joined">加入于 {{ m.joined_at ? m.joined_at.slice(0, 10) : '—' }}</div>
        </DewCard>
      </div>
      <div class="hint">成员增删由老师/超管在管理端操作</div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const members = ref([]);
const students = computed(() => members.value.filter((m) => m.role === 'student'));

async function load() {
  try { const d = await campService.fetchMembers(props.sid); members.value = d.members || []; }
  catch { ElMessage.error('加载成员失败'); }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.member-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.m-name { font-weight: 600; }
.m-joined { font-size: 12px; color: var(--dew-text-muted); margin-top: 4px; }
.hint { font-size: 12px; color: var(--dew-text-faint); margin-top: 14px; }
.empty { color: var(--dew-text-muted); padding: 16px 0; }
</style>
