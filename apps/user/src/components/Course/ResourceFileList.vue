<script setup>
// 资料文件行列表（展示型共享组件）：课程详情页「相关资源」与学习资源中心共用。
// 从 CourseResources.vue 抽取（2026-09-20）：图标/大小格式化/多选批量/行内下载 loading
// 全部收口在此；数据获取与下载策略（Down_Code 一次性码 / 短签直连）由父级以函数注入。
import { ref, computed, watch } from 'vue'
import { Download, Document, Files, Picture, VideoPlay, Headset } from '@element-plus/icons-vue'
import { DewButton, DewSkeleton, DewTag } from '@bme/dew-ui'

const props = defineProps({
  items: {
    type: Array,
    default: () => []   // {id, name, size, created_at, description?, tagLabel?, tagType?}
  },
  isLoading: { type: Boolean, default: false },
  themeClass: { type: String, default: 'theme-light' },
  selectable: { type: Boolean, default: false },        // 多选工具栏（批量/一键下载）
  downloadOne: { type: Function, required: true },      // async (item) => {}
  downloadBatch: { type: Function, default: null },     // async (ids) => {}，selectable 时展示
  downloadAll: { type: Function, default: null },       // async () => {}，可选「一键下载」
  emptyText: { type: String, default: '暂无相关资料' }
})

const emit = defineEmits(['row-click'])

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
const selectedIds = ref([])

const allSelected = computed(() =>
  props.items.length > 0 && selectedIds.value.length === props.items.length
)
const someSelected = computed(() => selectedIds.value.length > 0 && !allSelected.value)

const toggleAll = (val) => {
  selectedIds.value = val ? props.items.map(r => r.id) : []
}

const toggleRow = (item, val) => {
  selectedIds.value = val
    ? [...selectedIds.value, item.id]
    : selectedIds.value.filter(id => id !== item.id)
}

// 数据源切换清空选择
watch(() => props.items, () => { selectedIds.value = [] })

// ── 下载（行内 loading 态） ──
const downloadingRows = ref([])
const batchDownloading = ref(false)

const downloadOne = async (item) => {
  downloadingRows.value.push(item.id)
  try {
    await props.downloadOne(item)
  } finally {
    downloadingRows.value = downloadingRows.value.filter(id => id !== item.id)
  }
}

const downloadSelected = async () => {
  if (!selectedIds.value.length) return
  batchDownloading.value = true
  try {
    await props.downloadBatch(selectedIds.value)
  } finally {
    batchDownloading.value = false
  }
}

const downloadAll = async () => {
  batchDownloading.value = true
  try {
    await props.downloadAll()
  } finally {
    batchDownloading.value = false
  }
}

const onRowClick = (item) => {
  emit('row-click', item)
}
</script>

<template>
  <div class="resource-file-list" :class="themeClass">
    <!-- 加载骨架 -->
    <div v-if="isLoading" class="rfl-skeleton">
      <div v-for="n in 4" :key="n" class="skeleton-row">
        <DewSkeleton variant="text" width="26px" height="16px" />
        <DewSkeleton variant="circle" :size="18" />
        <DewSkeleton variant="text" width="45%" />
        <DewSkeleton variant="text" width="50px" height="12px" />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="items.length === 0" class="rfl-empty">
      {{ emptyText }}
    </div>

    <template v-else>
      <!-- 工具栏：全选 + 批量下载 -->
      <div v-if="selectable && downloadBatch" class="rfl-toolbar">
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
          <!-- 一键下载：ghost 变体（默认无实体底，hover/focus 出现 DewUI 自带反馈） -->
          <DewButton v-if="downloadAll" size="sm" type="ghost" :loading="batchDownloading" @click="downloadAll">
            <el-icon class="btn-icon"><Download /></el-icon>
            一键下载
          </DewButton>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="rfl-list">
        <div
          v-for="item in items"
          :key="`${item.source || 'local'}-${item.id}`"
          class="rfl-row"
          @click="onRowClick(item)"
        >
          <el-checkbox
            v-if="selectable"
            class="row-check"
            :model-value="selectedIds.includes(item.id)"
            @change="val => toggleRow(item, val)"
            @click.stop
          />
          <el-icon class="row-icon"><component :is="getIcon(item.name)" /></el-icon>
          <span class="row-name" :title="item.description || item.name">{{ item.name }}</span>
          <DewTag v-if="item.tagLabel" :type="item.tagType || 'neutral'" size="sm" round class="row-tag">
            {{ item.tagLabel }}
          </DewTag>
          <span class="row-size">{{ formatSize(item.size) }}</span>
          <span class="row-date">{{ item.created_at }}</span>
          <el-button
            class="row-download"
            text
            size="small"
            :loading="downloadingRows.includes(item.id)"
            @click.stop="downloadOne(item)"
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
.resource-file-list {
  width: 100%;
}

/* ── 骨架屏 ── */
.rfl-skeleton {
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
.rfl-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
  font-size: 14px;
}

.theme-light .rfl-empty { color: var(--dew-text-muted); }
.theme-dark .rfl-empty { color: var(--dew-text-muted); }

/* ── 工具栏 ── */
.rfl-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--dew-card-divider);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-icon {
  margin-right: 2px;
}

/* ── 列表 ── */
.rfl-list {
  display: flex;
  flex-direction: column;
}

.rfl-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

/* hover 用底色反馈（形态反馈优先于变色） */
.theme-light .rfl-row:hover { background-color: rgba(0, 0, 0, 0.035); }
.theme-dark .rfl-row:hover { background-color: rgba(255, 255, 255, 0.06); }

.row-check {
  flex-shrink: 0;
  height: auto;
}

.row-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.theme-light .row-icon { color: var(--dew-text-muted); }
.theme-dark .row-icon { color: var(--dew-text-muted); }

.row-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-light .row-name { color: var(--dew-text); }
.theme-dark .row-name { color: var(--dew-text); }

.row-tag {
  flex-shrink: 0;
}

.row-size,
.row-date {
  font-size: 12px;
  flex-shrink: 0;
}

.theme-light .row-size,
.theme-light .row-date { color: var(--dew-text-muted); }
.theme-dark .row-size,
.theme-dark .row-date { color: var(--dew-text-muted); }

.row-date {
  width: 96px;
  text-align: right;
}

.row-download {
  flex-shrink: 0;
  margin-left: 4px;
}

.theme-dark .row-download {
  color: var(--dew-text);
}

/* 响应式：窄屏隐藏日期列 */
@media (max-width: 600px) {
  .row-date { display: none; }
  .rfl-row { gap: 8px; }
}
</style>
