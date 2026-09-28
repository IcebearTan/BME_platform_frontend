<script setup>
// 「工作记录」检索（M5）：我的可见事项全史（含已完结）+ 关键词检索。
// 时间线/操作记录在事项详情页；此处是跨事项的历史入口（§6.1 工作记录）。
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag, DewSkeleton } from '@bme/dew-ui'
import { Search } from '@element-plus/icons-vue'
import { workService, ITEM_STATUS_LABELS, ITEM_STATUS_TYPE } from '../../services/workService'

const router = useRouter()
const keyword = ref('')
const scopeMine = ref(false)
const loading = ref(true)
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (keyword.value.trim()) params.q = keyword.value.trim()
    if (scopeMine.value) params.mine = 1
    const res = await workService.fetchItems(params)
    items.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

let debounce = null
watch(keyword, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; load() }, 400)
})
watch(scopeMine, () => { page.value = 1; load() })
onMounted(load)
</script>

<template>
  <div class="records-index">
    <div class="filter-bar">
      <el-input v-model="keyword" :prefix-icon="Search" style="width: 240px;"
                placeholder="检索标题 / 正文（含已完结）" clearable />
      <el-checkbox v-model="scopeMine">只看我发起或参与的</el-checkbox>
    </div>

    <template v-if="loading && !items.length">
      <DewCard v-for="i in 3" :key="i" size="md"><DewSkeleton type="text" :lines="2" /></DewCard>
    </template>
    <DewCard v-else-if="!items.length" size="md">
      <p class="empty-text">没有匹配的工作记录</p>
    </DewCard>

    <template v-else>
      <DewCard v-for="it in items" :key="it.id" size="md" interactive class="record-card"
               @click="router.push(`/work/items/${it.id}`)">
        <div class="record-row">
          <div class="record-main">
            <div class="record-title">{{ it.title }}</div>
            <div class="record-meta">
              <span>{{ it.group_name }}</span>
              <span>{{ it.created_at }}</span>
              <span>回复 {{ it.reply_count }}</span>
            </div>
          </div>
          <DewTag :type="ITEM_STATUS_TYPE[it.status] || 'neutral'" size="sm" round>
            {{ ITEM_STATUS_LABELS[it.status] || it.status }}
          </DewTag>
        </div>
      </DewCard>
      <div v-if="total > pageSize" class="pager-row">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
                       :current-page="page" @current-change="(p) => { page = p; load() }" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.record-card { margin-bottom: 10px; }
.record-row { display: flex; align-items: center; gap: 12px; }
.record-main { flex: 1; min-width: 0; }
.record-title { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--el-text-color-secondary); }
.pager-row { display: flex; justify-content: center; margin-top: 12px; }
.empty-text { margin: 4px 0; font-size: 13px; color: var(--el-text-color-secondary); }
</style>
