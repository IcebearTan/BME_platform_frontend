<script setup>
// 课程「相关资源」tab：取数与下载策略走共享 courseResourceService（09-21 抽取，
// 与章节学习页「课程资源」区共用）；文件行渲染/多选/骨架屏由共享组件
// ResourceFileList 承担（2026-09-20 抽取，与学习资源中心共用，行为不变）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import ResourceFileList from './ResourceFileList.vue'
import { courseResourceService } from '../../services/courseResourceService'

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

const fetchResources = async () => {
  isLoading.value = true
  try {
    resources.value = await courseResourceService.list(props.courseId)
  } catch (error) {
    console.error('获取课程资源失败', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchResources)

// ── 下载：一次性下载码换真实下载地址，浏览器直接打开 ──
const download = async (ids) => {
  if (!ids.length) return
  try {
    await courseResourceService.download(props.courseId, ids)
  } catch (error) {
    console.error('下载失败', error)
    ElMessage.error(error?.message || '下载失败，请重试')
  }
}

const downloadOne = (item) => download([item.id])
const downloadSelected = (ids) => download(ids)
const downloadAll = () => download([])
</script>

<template>
  <div class="course-resources">
    <ResourceFileList
      :items="resources"
      :is-loading="isLoading"
      :theme-class="themeClass"
      selectable
      :download-one="downloadOne"
      :download-batch="downloadSelected"
      :download-all="downloadAll"
      empty-text="暂无相关资源"
    />
  </div>
</template>

<style scoped>
.course-resources {
  width: 100%;
  padding: 16px 20px 20px;
  box-sizing: border-box;
}
</style>
