<script setup>
// 课程「相关资源」tab：数据获取 + Down_Code 一次性码下载策略；
// 文件行渲染/多选/骨架屏由共享组件 ResourceFileList 承担（2026-09-20 抽取，
// 与学习资源中心共用，行为不变）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api, { API_URL } from '../../api'
import ResourceFileList from './ResourceFileList.vue'

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

// ── 下载：一次性下载码换真实下载地址，浏览器直接打开 ──
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

const downloadOne = (item) => download([item.id])
const downloadSelected = (ids) => download(ids)
const downloadAll = () => {
  // 不传 Resource_Ids，后端打包该课程全部资源
  return api({
    url: '/course/resource_down',
    method: 'get',
    params: { Course_Id: props.courseId }
  }).then(res => {
    if (res.data.code === 200) {
      const url = `${API_URL}/course/resource_download?Down_Code=${encodeURIComponent(res.data.Down_Code)}`
      window.open(url, '_blank')
    } else {
      ElMessage.warning(res.data.message || '获取下载链接失败')
    }
  }).catch(error => {
    console.error('下载失败', error)
    ElMessage.error('下载失败，请重试')
  })
}
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
