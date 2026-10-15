<script setup>
import { computed } from 'vue'
import { CircleCheckFilled, Clock, Lock, QuestionFilled } from '@element-plus/icons-vue'
import { pointsTaskState } from '../../services/pointsService'
const props = defineProps({ task: { type: Object, required: true } })
const state = computed(() => pointsTaskState(props.task))
const states = {
  completed: { label: '已完成', icon: CircleCheckFilled },
  incomplete: { label: '未完成', icon: Clock },
  unavailable: { label: '待开放', icon: Lock },
  unknown: { label: '待更新', icon: QuestionFilled },
}
</script>
<template>
  <span class="points-task-state" :class="`points-task-state--${state}`" :data-state="state" role="img" :aria-label="states[state].label">
    <span class="points-task-state__mark"><component :is="states[state].icon" aria-hidden="true" /></span>
    <span aria-hidden="true">{{ states[state].label }}</span>
  </span>
</template>
<style scoped>
.points-task-state { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 12px; font-weight: 500; color: var(--dew-text-muted); white-space: nowrap; }
.points-task-state__mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--dew-ghost-hover-bg); }
.points-task-state__mark svg { width: 18px; height: 18px; }
.points-task-state--completed { color: var(--points-ink, var(--color-warning)); }
.points-task-state--completed .points-task-state__mark { background: var(--color-warning-light); }
.points-task-state--completed svg { width: 22px; height: 22px; }
.points-task-state--incomplete .points-task-state__mark { background: transparent; box-shadow: inset 0 0 0 1px var(--dew-card-divider); }
.points-task-state--unavailable .points-task-state__mark { color: var(--dew-text-faint); }
</style>
