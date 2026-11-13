<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { Coin, ArrowRight, Calendar, ChatDotRound, Refresh, Document } from '@element-plus/icons-vue'
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui'
import { usePoints } from '../../composables/usePoints'
import { pointsService } from '../../services/pointsService'
import PointsTaskStatus from './PointsTaskStatus.vue'
import PointsHelp from './PointsHelp.vue'
import '../../styles/points.css'

const router = useRouter()
const store = useStore()
const { summary, balanceLabel, failed, loading, refresh } = usePoints()
const tasks = ref([]), tasksLoading = ref(true), tasksFailed = ref(false)
let disposed = false
async function load() {
  tasksLoading.value = true; tasksFailed.value = false
  try {
    const { data } = await pointsService.tasks()
    if (!disposed) tasks.value = (data.items || []).filter(task => task.scope === 'platform' && task.enabled)
  } catch { if (!disposed) tasksFailed.value = true }
  finally { if (!disposed) tasksLoading.value = false }
}
function openTask(task) { router.push(task.action_path || '/user-center/points') }
function openPoints() { router.push('/user-center/points') }
onMounted(() => { refresh(); load() })
onBeforeUnmount(() => { disposed = true })
</script>
<template>
  <section v-if="store.getters.isLogin" class="home-points points-theme" aria-label="我的积分">
    <DewCard no-hover class="points-accent-card ptp-card" size="lg">
      <div class="hp-header"><span class="hp-coin"><Coin /></span><h3>我的积分</h3><PointsHelp text="积分与商城共用。平台任务尚未配置奖励时显示待开放。" /><span class="hp-spacer" /><DewButton type="ghost" size="sm" aria-label="进入积分中心" @click="openPoints"><el-icon><ArrowRight /></el-icon></DewButton></div>
      <div class="hp-wallet"><div><span class="hp-label">可用积分</span><div class="hp-balance-value"><DewSkeleton v-if="loading && !summary" width="100px" height="44px" :animated="false" /><strong v-else data-testid="home-points-balance">{{ balanceLabel }}</strong></div></div><DewButton size="sm" class="points-action" @click="openPoints">积分中心</DewButton></div>
      <div class="hp-account-slot">
        <div v-if="failed" class="hp-account-state"><span>积分暂未更新</span><DewButton type="ghost" size="sm" :loading="loading" aria-label="重试首页积分" @click="refresh(true)"><el-icon><Refresh /></el-icon></DewButton></div>
        <div v-else-if="summary?.status && summary.status !== 'ready'" class="hp-account-state">{{ summary.status === 'unlinked' ? '未关联积分账户' : summary.needs_identity ? '待身份核验' : '积分暂不可用' }}</div>
      </div>
      <div class="hp-tasks" :aria-busy="tasksLoading">
        <template v-if="tasksLoading">
          <div v-for="n in 3" :key="n" class="hp-task hp-task-skeleton" aria-hidden="true">
            <DewSkeleton variant="rect" width="17px" height="17px" :animated="false" />
            <DewSkeleton width="72px" :animated="false" /><span class="hp-spacer" />
            <DewSkeleton width="68px" height="28px" :animated="false" />
          </div>
        </template>
        <div v-else-if="tasksFailed" class="hp-task-message" role="status">任务暂未更新<DewButton type="ghost" size="sm" @click="load">重试</DewButton></div>
        <div v-else-if="!tasks.length" class="hp-task-message">暂无积分任务</div>
        <template v-else>
          <button v-for="task in tasks" :key="task.id" class="hp-task" @click="openTask(task)"><span class="hp-task-icon"><component :is="task.kind === 'community_post' ? ChatDotRound : task.kind === 'article' ? Document : Calendar" /></span><span>{{ task.title }}</span><span class="hp-spacer" /><PointsTaskStatus :task="task" /></button>
        </template>
      </div>
    </DewCard>
  </section>
</template>
<style scoped>
.home-points { width: 100%; min-width: 0; color: var(--dew-text); }
.hp-header, .hp-wallet, .hp-account-state, .hp-task { display: flex; align-items: center; gap: 10px; }
.hp-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.hp-coin { width: 30px; height: 30px; display: grid; place-items: center; border-radius: var(--radius-full); color: var(--points-ink); background: var(--points-icon-bg); }
.hp-coin svg { width: 18px; height: 18px; }
.hp-spacer { flex: 1; }
.hp-wallet { justify-content: space-between; padding: 16px 0 0; }
.hp-balance-value { display: flex; align-items: center; height: 44px; margin-top: 5px; }
.hp-wallet strong { display: block; color: var(--points-ink); font-size: 34px; line-height: 44px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.hp-label, .hp-account-state { color: var(--dew-text-muted); font-size: 12px; }
.hp-account-slot { display: flex; align-items: center; height: 28px; }
.hp-account-state { width: 100%; justify-content: space-between; }
.hp-tasks { min-height: 155px; box-sizing: border-box; border-top: 1px solid var(--points-line); padding-top: 10px; }
.hp-task { width: 100%; min-height: 48px; box-sizing: border-box; padding: 10px 0; border: 0; background: transparent; font: inherit; font-size: 13px; color: var(--dew-text); text-align: left; cursor: pointer; }
.hp-task-skeleton { cursor: default; }
.hp-task-message { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 144px; font-size: 12px; color: var(--dew-text-muted); }
.hp-task:hover { color: var(--points-ink); }
.hp-task-icon { display: inline-flex; color: var(--points-ink); }
.hp-task-icon svg { width: 17px; height: 17px; }
</style>
