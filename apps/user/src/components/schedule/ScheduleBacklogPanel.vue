<script setup>
// 任务中心（W1 由待安排清单扩展）：七桶（未完成/待安排/已安排/已逾期/已完成/
// 已取消/全部）+ 标题搜索 + 真分页 + 行内快捷操作。all 桶为真·全状态
// （后端 W1 起支持，此前 all 实际筛 open）；操作按任务状态驱动而非按桶驱动。
// 没有截止的任务保持无截止展示，不伪造成逾期（后端 bucket 口径保证）；
// 查询失败显示错误与重试，不显示「清单是空的」（计划验收 2）。
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, CircleCheck, RefreshRight } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewInput, DewSkeleton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'

const props = defineProps({
  refreshKey: { type: Number, default: 0 },
  initialBucket: { type: String, default: 'unscheduled' }
})
const emit = defineEmits(['edit-task', 'create-block'])

const BUCKETS = [
  { value: 'open', label: '未完成' },
  { value: 'unscheduled', label: '待安排' },
  { value: 'scheduled', label: '已安排' },
  { value: 'overdue', label: '已逾期' },
  { value: 'done', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'all', label: '全部' }
]

const bucket = ref(BUCKETS.some((b) => b.value === props.initialBucket) ? props.initialBucket : 'unscheduled')
const keyword = ref('')
const loading = ref(true)
const loadError = ref('')
const items = ref([])
const pager = ref({ page: 1, perPage: 20, total: 0, pages: 1 })
let searchSeq = 0

const currentLabel = computed(() => BUCKETS.find((b) => b.value === bucket.value)?.label || '')

async function fetchList() {
  const seq = ++searchSeq
  loading.value = true
  loadError.value = ''
  try {
    const data = await scheduleService.fetchTasks({
      page: pager.value.page, perPage: pager.value.perPage,
      bucket: bucket.value, q: keyword.value.trim()
    })
    if (seq !== searchSeq) return      // 丢弃过期响应
    items.value = data.items || []
    pager.value.total = data.total
    pager.value.pages = data.pages
  } catch (err) {
    if (seq === searchSeq) {
      items.value = []
      loadError.value = err.message || '任务列表加载失败'
    }
  } finally {
    if (seq === searchSeq) loading.value = false
  }
}

onMounted(fetchList)
watch(() => props.refreshKey, fetchList)

let debounce = null
function onSearch() {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    pager.value.page = 1
    fetchList()
  }, 300)
}

function switchBucket(b) {
  bucket.value = b
  pager.value.page = 1
  fetchList()
}

function turnPage(delta) {
  pager.value.page = Math.min(Math.max(1, pager.value.page + delta), pager.value.pages)
  fetchList()
}

async function completeTask(task) {
  try {
    await scheduleService.taskAction(task.id, 'complete')
    ElMessage.success(`「${task.title}」已完成`)
    fetchList()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

async function reopenTask(task) {
  try {
    await scheduleService.taskAction(task.id, 'reopen')
    ElMessage.success('已重新打开')
    fetchList()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}
</script>

<template>
  <div class="backlog-panel">
    <div class="backlog-toolbar">
      <div class="bucket-tabs">
        <button v-for="b in BUCKETS" :key="b.value" class="bucket-tab"
          :class="{ 'is-active': bucket === b.value }" @click="switchBucket(b.value)">
          {{ b.label }}
        </button>
      </div>
      <DewInput v-model="keyword" class="backlog-search" placeholder="搜索任务标题" clearable
        :prefix-icon="Search" round @input="onSearch" @clear="pager.page = 1; fetchList()" />
    </div>

    <DewCard size="lg" divided>
      <DewSkeleton v-if="loading" variant="text" :lines="6" />
      <div v-else-if="loadError" class="empty-state">
        加载失败：{{ loadError }}
        <DewButton size="sm" type="ghost" style="margin-left: 10px;" @click="fetchList">重试</DewButton>
      </div>
      <template v-else>
        <div v-if="items.length === 0" class="empty-state">
          {{ keyword ? '没有匹配的任务' : `${currentLabel}清单是空的` }}
        </div>
        <ul v-else class="backlog-list">
          <li v-for="t in items" :key="t.id" class="backlog-item" @click="emit('edit-task', t)">
            <span class="b-title" :class="{ 'is-cancelled': t.status === 'cancelled' }">{{ t.title }}</span>
            <DewTag v-if="bucket === 'all'" type="neutral" size="sm">
              {{ t.status === 'open' ? '未完成' : t.status === 'done' ? '已完成' : '已取消' }}
            </DewTag>
            <DewTag v-if="t.priority === 'high'" type="danger" size="sm">高优</DewTag>
            <DewTag v-else-if="t.priority === 'low'" type="neutral" size="sm">低优</DewTag>
            <span v-if="t.due_at || t.due_date" class="b-due" :class="{ 'is-overdue': bucket === 'overdue' }">
              {{ (t.due_at || t.due_date || '').slice(5, 16) || '' }}
            </span>
            <span v-else class="b-due b-due-none">无截止</span>
            <template v-if="t.status === 'open'">
              <DewButton size="sm" type="ghost" @click.stop="emit('create-block', { taskId: t.id })">安排时间</DewButton>
              <DewButton size="sm" type="ghost" @click.stop="completeTask(t)"><el-icon><CircleCheck /></el-icon>完成</DewButton>
            </template>
            <DewButton v-else size="sm" type="ghost" @click.stop="reopenTask(t)">
              <el-icon><RefreshRight /></el-icon>重开
            </DewButton>
          </li>
        </ul>
        <div v-if="pager.pages > 1" class="backlog-pager">
          <DewButton size="sm" type="ghost" :disabled="pager.page <= 1" @click="turnPage(-1)">上一页</DewButton>
          <span class="pager-label">{{ pager.page }} / {{ pager.pages }}</span>
          <DewButton size="sm" type="ghost" :disabled="pager.page >= pager.pages" @click="turnPage(1)">下一页</DewButton>
        </div>
      </template>
    </DewCard>
  </div>
</template>

<style scoped>
.backlog-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.backlog-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.bucket-tabs {
  display: inline-flex;
  border-radius: var(--radius-full, 999px);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-divider);
  padding: 3px;
}

.bucket-tab {
  border: none;
  background: none;
  padding: 6px 16px;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  border-radius: var(--radius-full, 999px);
  cursor: pointer;
}

.bucket-tab.is-active {
  background: var(--color-primary);
  color: #fff;
}

.backlog-search {
  width: 240px;
}

.backlog-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.backlog-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--dew-card-divider);
  cursor: pointer;
}

.backlog-item:last-child {
  border-bottom: none;
}

.b-title {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--dew-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.b-title.is-cancelled {
  text-decoration: line-through;
  color: var(--dew-text-faint);
}

.b-due {
  font-size: var(--text-xs);
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.b-due.is-overdue {
  color: var(--color-danger);
}

.b-due-none {
  color: var(--dew-text-faint);
}

.backlog-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 12px;
}

.pager-label {
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
}

.empty-state {
  padding: 48px 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}
</style>
