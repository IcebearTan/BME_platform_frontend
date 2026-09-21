<template>
  <div class="camp-courses-page">
    <div class="page-header">
      <div class="page-title">课程</div>
      <div class="header-actions">
        <span class="hint">项目营绑定的课程目录（培训营课程由分类方向定义）</span>
        <el-button v-if="manageWritable" type="primary" size="small" @click="openAddCourse" :disabled="!availableCourses.length">加课程</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="courses" border size="small" v-loading="loading">
        <el-table-column label="课程" prop="title" min-width="200" />
        <el-table-column label="难度" prop="difficulty" width="100" />
        <el-table-column v-if="manageWritable" label="操作" width="80">
          <template #default="{ row }">
            <el-button size="small" type="danger" link @click="removeCourse(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 加课程 -->
    <el-dialog v-model="courseDlg.visible" title="加课程" width="460px">
      <el-select v-model="courseDlg.course_id" filterable placeholder="选择课程" style="width: 100%;">
        <el-option v-for="c in availableCourses" :key="c.Course_Id" :label="c.Course_title + (c.Course_Status === 'off_shelf' ? '（已下架）' : '')" :value="c.Course_Id" />
      </el-select>
      <template #footer>
        <el-button @click="courseDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAddCourse">加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'

const ctx = useCampContext()
const { campId, manageWritable, options } = ctx

const courses = ref([])
const loading = ref(false)
const courseDlg = reactive({ visible: false, course_id: null })

async function fetchCourses() {
  loading.value = true
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/courses`)
    courses.value = res.data?.courses || []
  } catch { courses.value = [] }
  finally { loading.value = false }
}

const availableCourses = computed(() => {
  // /camp/.../courses 返回 int id 而 /course/admin_list 返回字符串 id，统一转 String 再比对
  const added = new Set(courses.value.map((c) => String(c.course_id)))
  return options.allCourses.value.filter((c) => !added.has(String(c.Course_Id)))
})

function openAddCourse() { courseDlg.course_id = null; courseDlg.visible = true }

async function submitAddCourse() {
  if (!courseDlg.course_id) { ElMessage.warning('请选择课程'); return }
  try {
    await api.post(`/camp/sessions/${campId.value}/courses`, { course_id: courseDlg.course_id })
    ElMessage.success('已加入')
    courseDlg.visible = false
    fetchCourses()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加入失败')
  }
}

function removeCourse(row) {
  ElMessageBox.confirm(`确定从本营移除课程「${row.title}」吗？（不影响学员已选课记录）`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    await api.delete(`/camp/sessions/${campId.value}/courses/${row.course_id}`)
    ElMessage.success('已移除')
    fetchCourses()
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '移除失败')
  })
}

onMounted(() => {
  fetchCourses()
  options.ensureCourses()
})
</script>

<style scoped>
.camp-courses-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
