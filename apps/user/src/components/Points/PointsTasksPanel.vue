<template>
  <DewCard v-if="store.getters.isLogin && enabledTasks.length" :glass="true" :divided="true" size="lg" class="ptp-card">
    <template #header>
      <div class="ptp-header">
        <div class="ptp-title">积分任务</div>
        <button class="ptp-more" aria-label="查看我的积分" @click="router.push('/user-center/points')">
          全部<el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </template>
    <div class="ptp-list">
      <button
        v-for="task in enabledTasks"
        :key="task.id"
        class="ptp-task"
        @click="router.push(task.action_path || '/user-center/points')"
      >
        <span class="ptp-copy">
          <span class="ptp-name">{{ task.title }}</span>
          <span class="ptp-freq">{{ task.done_today ? '今日已完成' : task.frequency }}</span>
        </span>
        <span class="ptp-right">
          <strong v-if="task.kind === 'daily_checkin' && task.amount_desc" class="ptp-amount">+{{ task.amount }}</strong>
          <strong v-else-if="task.amount != null" class="ptp-amount">+{{ formatPoints(task.amount) }}</strong>
          <el-icon class="ptp-arrow"><ArrowRight /></el-icon>
        </span>
      </button>
    </div>
  </DewCard>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ArrowRight } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import { pointsService, formatPoints } from '../../services/pointsService'

const store = useStore()
const router = useRouter()
const tasks = ref([])
const enabledTasks = computed(() => tasks.value.filter(task => task.enabled))
onMounted(async () => {
  if (!store.getters.isLogin) return
  try {
    // 静默加载：接口失败或未配置任务时整卡隐藏，不占首页版面
    tasks.value = ((await pointsService.tasks()).data.items || []).filter(task => task.scope === 'platform')
  } catch { tasks.value = [] }
})
</script>

<style scoped>
.ptp-card { min-width: 0; }
.ptp-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ptp-title { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.ptp-more { display: inline-flex; align-items: center; gap: 2px; border: 0; padding: 0; background: transparent; color: var(--dew-text-muted); font-size: 12px; cursor: pointer; }
.ptp-more:hover { color: var(--color-primary); }
.ptp-list { display: flex; flex-direction: column; }
.ptp-task { display: flex; width: 100%; align-items: center; gap: 10px; padding: 10px 2px; background: transparent; border: 0; border-bottom: 1px solid var(--dew-card-divider); color: var(--dew-text); text-align: left; font: inherit; cursor: pointer; }
.ptp-task:last-child { border-bottom: 0; }
.ptp-task:hover .ptp-name { color: var(--color-primary); }
.ptp-copy { flex: 1; min-width: 0; }
.ptp-name { display: block; font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }
.ptp-freq { display: block; margin-top: 2px; font-size: 12px; color: var(--dew-text-muted); }
.ptp-right { display: inline-flex; align-items: center; gap: 4px; }
.ptp-amount { color: var(--color-primary); font-size: 15px; font-variant-numeric: tabular-nums; }
.ptp-arrow { color: var(--dew-text-muted); font-size: 12px; }
</style>
