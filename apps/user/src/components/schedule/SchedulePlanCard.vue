<script setup>
// manual 模式的排程方案确认卡：新增/移动块清单 + 应用（409 → 提示重新生成）/
// 放弃。suggest 模式直接落库不经过本卡。
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { DewCard, DewButton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'

const props = defineProps({
  /** POST /tasks 或 capture 提案：{id, mode, reason, blocks:[{start_at,end_at}], unscheduled:[...]} */
  plan: { type: Object, required: true }
})
const emit = defineEmits(['applied', 'dismissed'])

const applying = ref(false)

async function apply() {
  applying.value = true
  try {
    await scheduleService.applyPlan(props.plan.id)
    ElMessage.success('方案已应用')
    emit('applied')
  } catch (err) {
    ElMessage.error(err.message || '任务安排已变化，请重新生成')
    emit('dismissed')
  } finally {
    applying.value = false
  }
}

function discard() {
  emit('dismissed')
}
</script>

<template>
  <DewCard size="lg" divided class="plan-card">
    <template #header>
      <div class="card-head">建议的执行安排</div>
    </template>
    <p class="plan-reason">{{ plan.reason }}</p>
    <ul class="block-list">
      <li v-for="(b, i) in plan.blocks" :key="i" class="block-row">
        <span class="block-time">{{ b.start_at.slice(5, 16) }} - {{ b.end_at.slice(11, 16) }}</span>
      </li>
    </ul>
    <p v-if="plan.unscheduled?.length" class="gap-note">
      {{ plan.unscheduled.map((u) => `${u.title} 还缺 ${u.minutes} 分钟`).join('；') }}
    </p>
    <template #footer>
      <div class="footer-row">
        <DewButton size="md" type="ghost" @click="discard"><el-icon><Close /></el-icon>先不安排</DewButton>
        <DewButton size="md" type="glass" :loading="applying" @click="apply">
          <el-icon><Check /></el-icon>应用安排
        </DewButton>
      </div>
    </template>
  </DewCard>
</template>

<style scoped>
.card-head {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.plan-reason {
  margin: 0 0 8px;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}

.block-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.block-row {
  padding: 6px 0;
  border-bottom: 1px solid var(--dew-card-divider);
}

.block-row:last-child {
  border-bottom: none;
}

.block-time {
  font-size: var(--text-sm);
  color: var(--dew-text);
  font-variant-numeric: tabular-nums;
}

.gap-note {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  color: var(--color-warning, #d97706);
}

.footer-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
