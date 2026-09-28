<script setup>
// 「工作资料」附件索引（M4）：跨我的可见事项聚合 + 文件名检索（§12.3 受限检索，
// 服务端按访问权过滤）。下载走鉴权 fetch-blob。
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DewCard, DewSkeleton } from '@bme/dew-ui'
import { Search, Document, Download } from '@element-plus/icons-vue'
import { workService } from '../../services/workService'

const router = useRouter()
const keyword = ref('')
const loading = ref(true)
const loadFailed = ref(false)
const files = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const downloadingId = ref(null)

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    const params = { page: page.value, page_size: pageSize }
    if (keyword.value.trim()) params.q = keyword.value.trim()
    const res = await workService.searchFiles(params)
    files.value = res.data?.files || []
    total.value = res.data?.total || 0
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

let debounce = null
watch(keyword, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; load() }, 400)
})
onMounted(load)

async function download(f) {
  if (downloadingId.value) return
  downloadingId.value = f.id
  try {
    // 索引下载按事项附件关联判权：跳事项页下载（携带 link_id 上下文）
    router.push(`/work/items/${f.item_id}`)
  } finally {
    downloadingId.value = null
  }
}

function sizeText(n) {
  if (n == null) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="files-index">
    <div class="filter-bar">
      <el-input v-model="keyword" :prefix-icon="Search" style="width: 240px;"
                placeholder="按文件名搜索（仅你可见的事项）" clearable />
    </div>

    <template v-if="loading && !files.length">
      <DewCard v-for="i in 3" :key="i" size="md"><DewSkeleton type="text" :lines="2" /></DewCard>
    </template>
    <DewCard v-else-if="loadFailed" size="md">
      <p class="empty-text">加载失败</p>
      <el-button size="small" @click="load">重试</el-button>
    </DewCard>
    <DewCard v-else-if="!files.length" size="md">
      <p class="empty-text">暂无附件；事项里上传的交付与资料会汇总在这里</p>
    </DewCard>

    <template v-else>
      <DewCard v-for="f in files" :key="f.id" size="md" interactive class="file-card"
               @click="router.push(`/work/items/${f.item_id}`)">
        <div class="file-row">
          <el-icon class="file-icon" :size="16"><Document /></el-icon>
          <div class="file-main">
            <div class="file-name">{{ f.display_name }}</div>
            <div class="file-meta">
              <span>{{ f.item_title }}</span>
              <span>{{ sizeText(f.size) }}</span>
              <span>{{ f.uploaded_by }} 上传</span>
              <span>{{ f.updated_at }}</span>
            </div>
          </div>
          <el-button size="small" :icon="Download" plain @click.stop="download(f)">查看</el-button>
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
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; }
.file-card { margin-bottom: 10px; }
.file-row { display: flex; align-items: center; gap: 10px; }
.file-icon { color: var(--el-text-color-secondary); flex: none; }
.file-main { flex: 1; min-width: 0; }
.file-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; font-size: 12px; color: var(--el-text-color-secondary); }
.pager-row { display: flex; justify-content: center; margin-top: 12px; }
.empty-text { margin: 4px 0 10px; font-size: 13px; color: var(--el-text-color-secondary); }
</style>
