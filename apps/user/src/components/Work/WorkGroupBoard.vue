<script setup>
// 小组工作面板：事项列表（话题/任务混排，kind 筛选）+ 工作区/状态/搜索筛选 + 分页。
// 列表与计数走同一后端授权过滤（/work/items），此处只做展示层。
// 三段式加载遵循《加载态与骨架规范》；点击行进入事项详情。
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag, DewSkeleton } from '@bme/dew-ui'
import { Search, Plus, ChatLineSquare, Lock } from '@element-plus/icons-vue'
import { workService, ITEM_STATUS_LABELS, ITEM_STATUS_TYPE, VISIBILITY_LABELS } from '../../services/workService'
import { useWorkAccess } from '../../composables/useWorkAccess'
import WorkItemCreateDialog from './WorkItemCreateDialog.vue'

const route = useRoute()
const router = useRouter()
const { me } = useWorkAccess()

const workspaces = computed(() => me.value?.workspaces || [])
const workspaceId = ref(null)
const kind = ref('')                 // ''=全部 / topic / task
const status = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 20

const loading = ref(false)
const loadFailed = ref(false)
const items = ref([])
const total = ref(0)

const createVisible = ref(false)

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    const params = { page: page.value, page_size: pageSize }
    if (workspaceId.value) params.workspace_id = workspaceId.value
    if (kind.value) params.kind = kind.value
    if (status.value) params.status = status.value
    if (keyword.value.trim()) params.q = keyword.value.trim()
    const res = await workService.fetchItems(params)
    items.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch (e) {
    loadFailed.value = true
    ElMessage.error(e.response?.data?.message || '列表加载失败')
  } finally {
    loading.value = false
  }
}

const STATUS_OPTIONS = computed(() =>
  kind.value === 'task'
    ? ['todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']
    : ['draft', 'open', 'closed'])

function openItem(item) {
  router.push(`/work/items/${item.id}`)
}

// 路由 query ws= 预选工作区（组织架构页「进入工作区」入口）
onMounted(() => {
  const ws = Number(route.query.ws) || null
  workspaceId.value = workspaces.value.some(w => w.id === ws) ? ws
    : (workspaces.value.length === 1 ? workspaces.value[0].id : null)
  load()
})

watch([workspaceId, kind, status], () => {
  page.value = 1
  load()
})

let searchDebounce = null
watch(keyword, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { page.value = 1; load() }, 400)
})
</script>

<template>
  <div class="group-board">
    <!-- 筛选行 -->
    <div class="filter-bar">
      <el-select v-if="workspaces.length > 1" v-model="workspaceId" style="width: 150px;"
                 placeholder="全部工作区">
        <el-option v-for="w in workspaces" :key="w.id" :label="w.group_name" :value="w.id" />
      </el-select>
      <el-select v-model="kind" style="width: 110px;" placeholder="全部类型" clearable>
        <el-option label="话题" value="topic" />
        <el-option label="任务" value="task" />
      </el-select>
      <el-select v-model="status" style="width: 110px;" placeholder="全部状态" clearable>
        <el-option v-for="s in STATUS_OPTIONS" :key="s" :label="ITEM_STATUS_LABELS[s]" :value="s" />
      </el-select>
      <el-input v-model="keyword" :prefix-icon="Search" style="width: 200px;"
                placeholder="搜索标题 / 正文" clearable />
      <div class="spacer" />
      <el-button type="primary" :icon="Plus" @click="createVisible = true">发起话题</el-button>
    </div>

    <!-- 骨架（三段式之一） -->
    <template v-if="loading && !items.length">
      <DewCard v-for="i in 3" :key="i" size="md" class="item-card">
        <DewSkeleton type="text" :lines="2" />
      </DewCard>
    </template>

    <!-- 失败态 -->
    <DewCard v-else-if="loadFailed" size="md" class="item-card">
      <p class="empty-text">列表加载失败，请重试</p>
      <el-button size="small" @click="load">重试</el-button>
    </DewCard>

    <!-- 空态 -->
    <DewCard v-else-if="!items.length" size="md" class="item-card">
      <p class="empty-text">还没有相关工作事项；需要讨论或执行时，从右上角「发起话题」开始</p>
    </DewCard>

    <!-- 列表 -->
    <template v-else>
      <DewCard v-for="item in items" :key="item.id" size="md" interactive class="item-card"
               @click="openItem(item)">
        <div class="item-row">
          <div class="item-main">
            <div class="item-title-line">
              <span v-if="item.unread" class="unread-dot" />
              <span class="item-title">{{ item.title }}</span>
              <el-icon v-if="item.visibility === 'participants'" class="lock-icon" :size="13">
                <Lock />
              </el-icon>
            </div>
            <div class="item-meta">
              <span>{{ item.group_name }}</span>
              <span v-if="item.kind === 'task'" class="meta-strong">{{ ITEM_STATUS_LABELS[item.status] }}</span>
              <span v-if="item.kind === 'task' && item.task?.assignee_name" class="meta-assignee">
                {{ item.task.assignee_name }} 负责
              </span>
              <span v-if="item.kind === 'task' && item.task?.due_at"
                    class="meta-due" :class="{ 'meta-due--overdue': item.task.overdue }">
                截止 {{ item.task.due_at }}{{ item.task.overdue ? '（已逾期）' : '' }}
              </span>
              <span>{{ VISIBILITY_LABELS[item.visibility] }}</span>
              <span class="reply-count">
                <el-icon :size="13"><ChatLineSquare /></el-icon>
                {{ item.reply_count }}
              </span>
              <span>{{ item.last_activity_at }}</span>
            </div>
          </div>
          <DewTag :type="ITEM_STATUS_TYPE[item.status] || 'neutral'" size="sm" round>
            {{ ITEM_STATUS_LABELS[item.status] || item.status }}
          </DewTag>
        </div>
      </DewCard>
      <div v-if="total > pageSize" class="pager-row">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
                       :current-page="page" @current-change="(p) => { page = p; load() }" />
      </div>
    </template>

    <WorkItemCreateDialog v-model="createVisible" :workspaces="workspaces"
                          :default-workspace-id="workspaceId" @created="load" />
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 14px;
}
.spacer { flex: 1; }

.item-card { margin-bottom: 10px; }
.item-row { display: flex; align-items: center; gap: 12px; }
.item-main { flex: 1; min-width: 0; }

.item-title-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.item-title {
  font-size: 14.5px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.unread-dot {
  width: 8px; height: 8px; border-radius: 50%; flex: none;
  background: var(--el-color-danger, #f56c6c);
}
.lock-icon { color: var(--el-text-color-secondary); flex: none; }

.item-meta {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
  font-size: 12px; color: var(--el-text-color-secondary);
}
.meta-strong { color: var(--el-color-warning, #e6a23c); }
.meta-assignee { color: var(--el-color-primary, #409EFF); }
.meta-due { font-variant-numeric: tabular-nums; }
.meta-due--overdue { color: var(--el-color-danger, #f56c6c); font-weight: 600; }
.reply-count { display: inline-flex; align-items: center; gap: 3px; }

.pager-row { display: flex; justify-content: center; margin-top: 12px; }
.empty-text { margin: 4px 0 10px; font-size: 13px; color: var(--el-text-color-secondary); }

@media (max-width: 768px) {
  .filter-bar { gap: 8px; }
  .filter-bar :deep(.el-input), .filter-bar :deep(.el-select) { width: 130px !important; }
}
</style>
