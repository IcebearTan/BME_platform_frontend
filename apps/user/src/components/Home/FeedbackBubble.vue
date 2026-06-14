<template>
  <div>
    <!-- 反馈气泡（DewButton active 玻璃风格） -->
    <div class="feedback-float">
      <DewButton :active="true" size="md" :style="greenLitStyle" @click="openFeedbackDialog" @mouseover="handleMouseOver" @mouseleave="handleMouseLeave">
        {{ bubbleText }}
      </DewButton>
    </div>

    <!-- 反馈对话框 -->
    <DewDialog v-model="dialogVisible" title="问题反馈" :width="500">
      <el-form
        ref="feedbackFormRef"
        :model="feedbackForm"
        :rules="rules"
        label-position="top"
        novalidate
      >
        <el-form-item label="问题标题" prop="title">
          <DewInput v-model="feedbackForm.title" placeholder="请输入问题标题" />
        </el-form-item>

        <el-form-item label="问题描述" prop="content">
          <DewInput
            v-model="feedbackForm.content"
            type="textarea"
            :rows="5"
            placeholder="请详细描述您遇到的问题..."
          />
        </el-form-item>

        <el-form-item label="相关图片">
          <el-upload
            v-model:file-list="fileList"
            :on-preview="handlePreview"
            :on-remove="handleRemove"
            :before-upload="beforeUpload"
            list-type="picture-card"
            :limit="1"
            accept="image/*"
            :auto-upload="false"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                只能上传jpg/png/gif文件，且不超过2MB，最多1张
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <DewButton @click="handleClose">取消</DewButton>
        <DewButton :active="true" :disabled="isSubmitting" @click="submitFeedback">
          {{ isSubmitting ? '提交中…' : '提交反馈' }}
        </DewButton>
      </template>
    </DewDialog>

    <!-- 图片预览对话框 -->
    <DewDialog v-model="previewVisible" title="图片预览" :width="600">
      <img :src="previewImageUrl" style="width: 100%; height: auto; border-radius: 12px;" />
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElForm, ElFormItem, ElUpload, ElIcon, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import DewDialog from '../ui/DewDialog.vue'
import DewButton from '../ui/DewButton.vue'
import DewInput from '../ui/DewInput.vue'
import { DewMessageBox } from '../ui/DewMessageBox.js'
import api from '../../api'

// 响应式数据
const bubbleText = ref('报个Bug')

// 绿色 lit 覆盖（报个 Bug 胶囊专属：把 DewButton 的白色 lit token 覆盖成绿色）
const greenLitStyle = {
  '--dew-btn-lit-bg': 'rgba(34, 197, 94, 0.22)',
  '--dew-btn-lit-bg-hover': 'rgba(34, 197, 94, 0.32)',
  '--dew-btn-lit-border': 'rgba(34, 197, 94, 0.45)',
  '--dew-btn-lit-color': '#16a34a',
  '--dew-btn-lit-shadow': '0 0 18px rgba(34,197,94,0.4), 0 2px 10px rgba(0,0,0,0.05)',
  '--dew-btn-lit-shadow-hover': '0 0 28px rgba(34,197,94,0.55), 0 6px 20px rgba(0,0,0,0.08)',
  '--dew-btn-lit-text-shadow': '0 0 8px rgba(34,197,94,0.4)',
}
const dialogVisible = ref(false)
const isSubmitting = ref(false)
const feedbackFormRef = ref(null)
const fileList = ref([])
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 表单数据
const feedbackForm = reactive({
  title: '',
  content: ''
})

// 表单验证规则
const rules = reactive({
  title: [
    { required: true, message: '请输入问题标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度应在2-100个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入问题描述', trigger: 'blur' },
    { min: 10, max: 1000, message: '描述长度应在10-1000个字符之间', trigger: 'blur' }
  ]
})

// 气泡悬停效果
const handleMouseOver = () => {
  bubbleText.value = '(^_^)'
}

const handleMouseLeave = () => {
  bubbleText.value = '报个Bug'
}

// 打开反馈对话框
const openFeedbackDialog = () => {
  dialogVisible.value = true
}

// 关闭对话框（DewMessageBox 确认）
const handleClose = async () => {
  try {
    await DewMessageBox.confirm('确定要关闭反馈窗口吗？未保存的内容将丢失。', '确认关闭')
    resetForm()
    dialogVisible.value = false
  } catch {
    // 用户取消关闭
  }
}

// 重置表单
const resetForm = () => {
  if (feedbackFormRef.value) {
    feedbackFormRef.value.resetFields()
  }
  feedbackForm.title = ''
  feedbackForm.content = ''
  fileList.value = []
}

// 图片上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 移除图片
const handleRemove = (file) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
  }
}

// 预览图片
const handlePreview = (file) => {
  previewImageUrl.value = file.url || file.response?.data?.url || ''
  previewVisible.value = true
}

// 提交反馈
const submitFeedback = async () => {
  if (!feedbackFormRef.value) return

  feedbackFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请检查表单填写')
      return
    }

    isSubmitting.value = true

    try {
      const imageFile = fileList.value[0]?.raw
      const formData = new FormData()
      formData.append('title', feedbackForm.title)
      formData.append('content', feedbackForm.content)
      if (imageFile) formData.append('image', imageFile)

      const response = await api({
        url: '/information/error/add',
        method: 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.code === 200) {
        ElMessage.success('反馈提交成功，感谢您的反馈！')
        resetForm()
        dialogVisible.value = false
      } else {
        ElMessage.error(response.data.message || '提交失败，请重试')
      }
    } catch (error) {
      console.error('提交反馈失败:', error)
      ElMessage.error('提交失败，请检查网络后重试')
    } finally {
      isSubmitting.value = false
    }
  })
}
</script>

<style scoped>
/* 浮动定位容器 */
.feedback-float {
  position: fixed;
  bottom: 60px;
  right: 60px;
  z-index: 1000;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .feedback-float {
    bottom: 30px;
    right: 30px;
  }
}

/* 上传组件样式优化 */
:deep(.el-upload-list--picture-card .el-upload-list__item) {
  margin: 0 8px 8px 0;
}

:deep(.el-upload--picture-card) {
  --el-upload-picture-card-size: 104px;
}
</style>
