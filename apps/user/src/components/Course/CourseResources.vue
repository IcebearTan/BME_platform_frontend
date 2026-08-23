<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Document, Files, Picture, VideoPlay, Headset } from '@element-plus/icons-vue'
import api, { API_URL } from '../../api'
import { DewButton, DewSkeleton } from '../ui'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  themeClass: {
    type: String,
    default: 'theme-light'
  }
})

// 资源列表
const resources = ref([])
const isLoading = ref(false)
const selectedIds = ref([])   // 多选：资源 id 数组
const batchDownloading = ref(false)

const fetchResources = async () => {
  isLoading.value = true
  try {
    const res = await api({
      url: '/course/resources',
      method: 'get',
      params: { Course_Id: props.courseId }
    })
    if (res.data.code === 200) {
      resources.value = res.data.data || []
    }
  } catch (error) {
    console.error('获取课程资源失败', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchResources)

// ── 文件类型图标（按扩展名，克制：只区分文档/压缩包/图片/视频/音频） ──
const EXT_ICON_MAP = [
  { exts: ['zip', 'rar', '7z', 'tar', 'gz'], icon: Files },
  { exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'], icon: Picture },
  { exts: ['mp4', 'mov', 'avi', 'mkv', 'webm'], icon: VideoPlay },
  { exts: ['mp3', 'wav', 'flac', 'aac', 'm4a'], icon: Headset }
]

const getIcon = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const hit = EXT_ICON_MAP.find(m => m.exts.includes(ext))
  return hit ? hit.icon : Document
}

// ── 大小格式化 ──
const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

// ── 多选 ──
const allSelected = computed(() =>
  resources.value.length > 0 && selectedIds.value.length === resources.value.length
)
const someSelected = computed(() => selectedIds.value.length > 0 && !allSelected.value)

const toggleAll = (val) => {
  selectedIds.value = val ? resources.value.map(r => r.id) : []
}

// ── 下载：一次性下载码换真实下载地址，浏览器直接打开 ──
const downloadingRows = ref([])  // 行内下载中的资源 id

const download = async (ids) => {
  if (!ids.length) return
  try {
    const res = await api({
      url: '/course/resource_down',
      method: 'get',
      params: {
        Course_Id: props.courseId,
        Resource_Ids: ids.join(',')
      }
    })
    if (res.data.code === 200) {
      const url = `${API_URL}/course/resource_download?Down_Code=${encodeURIComponent(res.data.Down_Code)}`
      window.open(url, '_blank')
    } else {
      ElMessage.warning(res.data.message || '获取下载链接失败')
    }
  } catch (error) {
    console.error('下载失败', error)
    ElMessage.error('下载失败，请重试')
  }
}

const downloadOne = async (item) => {
  downloadingRows.value.push(item.id)
  try {
    await download([item.id])
  } finally {
    downloadingRows.value = downloadingRows.value.filter(id => id !== item.id)
  }
}

const downloadSelected = async () => {
  batchDownloading.value = true
  try {
    await download(selectedIds.value)
  } finally {
    batchDownloading.value = false
  }
}

const downloadAll = async () => {
  batchDownloading.value = true
  try {
    // 不传 Resource_Ids，后端打包该课程全部资源
    try {
      const res = await api({
        url: '/course/resource_down',
        method: 'get',
        params: { Course_Id: props.courseId }
      })
      if (res.data.code === 200) {
        const url = `${API_URL}/course/resource_download?Down_Code=${encodeURIComponent(res.data.Down_Code)}`
        window.open(url, '_blank')
      } else {
        ElMessage.warning(res.data.message || '获取下载链接失败')
      }
    } catch (error) {
      console.error('下载失败', error)
      ElMessage.error('下载失败，请重试')
    }
  } finally {
    batchDownloading.value = false
  }
}
</script>

<template>
  <div class="course-resources" :class="themeClass">
    <!-- 加载骨架 -->
    <div v-if="isLoading" class="resources-skeleton">
      <div v-for="n in 4" :key="n" class="skeleton-row">
        <DewSkeleton variant="text" width="26px" height="16px" />
        <DewSkeleton variant="circle" :size="18" />
        <DewSkeleton variant="text" width="45%" />
        <DewSkeleton variant="text" width="50px" height="12px" />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="resources.length === 0" class="resources-empty" :class="themeClass">
      暂无相关资源
    </div>

    <template v-else>
      <!-- 工具栏：全选 + 批量下载 -->
      <div class="resources-toolbar" :class="themeClass">
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="someSelected"
          @change="toggleAll"
        >全选</el-checkbox>
        <div class="toolbar-actions">
          <DewButton
            v-if="selectedIds.length > 0"
            size="sm"
            :loading="batchDownloading"
            @click="downloadSelected"
          >
            <el-icon class="btn-icon"><Download /></el-icon>
            下载所选（{{ selectedIds.length }}）
          </DewButton>
          <DewButton size="sm" type="primary" :loading="batchDownloading" @click="downloadAll">
            <el-icon class="btn-icon"><Download /></el-icon>
            一键下载
          </DewButton>
        </div>
      </div>

      <!-- 资源列表 -->
      <div class="resources-list">
        <div
          v-for="item in resources"
          :key="item.id"
          class="resource-row"
          :class="themeClass"
        >
          <el-checkbox
            class="row-check"
            :model-value="selectedIds.includes(item.id)"
            @change="val => val ? selectedIds.push(item.id) : (selectedIds = selectedIds.filter(id => id !== item.id))"
          />
          <el-icon class="row-icon"><component :is="getIcon(item.name)" /></el-icon>
          <span class="row-name" :title="item.name">{{ item.name }}</span>
          <span class="row-size">{{ formatSize(item.size) }}</span>
          <span class="row-date">{{ item.created_at }}</span>
          <el-button
            class="row-download"
            text
            size="small"
            :loading="downloadingRows.includes(item.id)"
            @click="downloadOne(item)"
          >
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.course-resources {
  width: 100%;
  padding: 16px 20px 20px;
  box-sizing: border-box;
}

/* ── 骨架屏 ── */
.resources-skeleton {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0 8px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* ── 空状态 ── */
.resources-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
  font-size: 14px;
}

.theme-light.resources-empty { color: #999; }
.theme-dark.resources-empty { color: #777; }

/* ── 工具栏 ── */
.resources-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid;
}

.theme-light.resources-toolbar { border-color: rgba(0, 0, 0, 0.08); }
.theme-dark.resources-toolbar { border-color: rgba(255, 255, 255, 0.1); }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-icon {
  margin-right: 2px;
}

/* ── 列表 ── */
.resources-list {
  display: flex;
  flex-direction: column;
}

.resource-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

/* hover 用底色反馈（形态反馈优先于变色） */
.theme-light.resource-row:hover { background-color: rgba(0, 0, 0, 0.035); }
.theme-dark.resource-row:hover { background-color: rgba(255, 255, 255, 0.06); }

.row-check {
  flex-shrink: 0;
  height: auto;
}

.row-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.theme-light.row-icon { color: #888; }
.theme-dark.row-icon { color: #999; }

.row-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-light.row-name { color: #444; }
.theme-dark.row-name { color: #ccc; }

.row-size,
.row-date {
  font-size: 12px;
  flex-shrink: 0;
}

.theme-light.row-size,
.theme-light.row-date { color: #999; }
.theme-dark.row-size,
.theme-dark.row-date { color: #777; }

.row-date {
  width: 96px;
  text-align: right;
}

.row-download {
  flex-shrink: 0;
  margin-left: 4px;
}

.theme-dark.row-download {
  color: #ccc;
}

/* 响应式：窄屏隐藏日期列 */
@media (max-width: 600px) {
  .row-date { display: none; }
  .resource-row { gap: 8px; }
}
</style>
