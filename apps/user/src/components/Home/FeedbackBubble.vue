<template>
  <Teleport to="body">
    <div class="feedback-float" data-feedback-ui>
      <DewButton :active="true" size="md" aria-label="报个Bug" @click="openFeedbackDialog"
        @mouseenter="bubbleHovered = true" @mouseleave="bubbleHovered = false">
        {{ bubbleHovered ? '(^_^)' : '报个Bug' }}
      </DewButton>
    </div>
  </Teleport>
  <el-dialog v-model="dialogVisible" title="问题反馈" width="min(560px, calc(100vw - 24px))"
    :z-index="REPORTER_LAYER + 1" modal-class="feedback-report-overlay" class="feedback-report-dialog"
    :close-on-click-modal="false" :before-close="closeDialog">
    <el-alert v-if="!isLoggedIn" title="登录后即可提交反馈，已填写的内容会在当前窗口保留。" type="info" :closable="false" />
    <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" />
    <el-form ref="feedbackFormRef" :model="form" :rules="rules" label-position="top" novalidate :disabled="isSubmitting">
      <el-form-item label="问题标题" prop="title">
        <DewInput v-model="form.title" :disabled="isSubmitting" placeholder="一句话描述遇到的问题" />
      </el-form-item>
      <el-form-item label="反馈类型">
        <el-select v-model="form.category" :teleported="false" style="width: 100%">
          <el-option v-for="option in categories" :key="option.value" :value="option.value" :label="option.label" />
        </el-select>
      </el-form-item>
      <el-form-item label="问题描述" prop="content">
        <DewInput v-model="form.content" type="textarea" :rows="4" :disabled="isSubmitting"
          placeholder="刚才进行了什么操作？期望与实际结果分别是什么？" />
      </el-form-item>
      <section class="feedback-snapshot" aria-label="页面快照">
        <div class="feedback-snapshot-head">
          <strong>页面快照</strong>
          <DewButton v-if="snapshotUrl" type="ghost" size="sm" :disabled="isSubmitting" @click="removeSnapshot">移除</DewButton>
          <DewButton v-else type="ghost" size="sm" :loading="capturing" :disabled="isSubmitting" @click="takeSnapshot">重新采集</DewButton>
        </div>
        <div v-if="capturing" role="status"><DewSkeleton variant="rect" width="100%" :height="100" />正在生成当前页面快照…</div>
        <button v-else-if="snapshotUrl" type="button" class="feedback-snapshot-preview" aria-label="预览页面快照" :disabled="isSubmitting" @click="preview(snapshotUrl)">
          <DewImage :src="snapshotUrl" alt="当前页面快照" width="100%" :height="132" fit="contain" :lazy="false" />
        </button>
        <p v-else class="feedback-muted" role="status">{{ snapshotError || '未附带页面快照，可继续提交或手动上传图片。' }}</p>
        <p class="feedback-muted">自动记录打开反馈时的可见页面，可预览或移除；仅在提交时发送。</p>
        <p v-if="pageContext" class="feedback-source">来源：{{ pageContext.url }}</p>
      </section>
      <el-form-item label="补充图片（可选）">
        <el-upload v-model:file-list="fileList" :auto-upload="false" :limit="1"
          accept="image/jpeg,image/png,image/webp,image/gif" list-type="picture"
          :on-change="validateFile" :on-preview="previewUpload" :on-exceed="uploadExceeded">
          <DewButton size="sm" :disabled="isSubmitting">上传图片</DewButton>
          <template #tip><span class="feedback-muted">JPG / PNG / WebP / GIF，最多 1 张、5MB；不占用页面快照名额。</span></template>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <DewButton :disabled="isSubmitting" @click="closeDialog()">取消</DewButton>
      <DewButton v-if="!isLoggedIn" :active="true" @click="login">登录后提交</DewButton>
      <DewButton v-else :active="true" :loading="isSubmitting" :disabled="capturing" @click="submitFeedback">提交反馈</DewButton>
    </template>
  </el-dialog>
  <el-dialog v-model="previewVisible" title="图片预览" width="min(960px, calc(100vw - 24px))"
    :z-index="REPORTER_LAYER + 3" modal-class="feedback-report-overlay" class="feedback-report-dialog">
    <DewImage :src="previewUrl" alt="反馈图片预览" width="100%" height="60vh" fit="contain" :lazy="false" />
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { DewButton, DewInput, DewImage, DewSkeleton } from '@bme/dew-ui'
import { authSession } from '../../api'
import { feedbackService } from '../../services/feedbackService'
import { capturePageSnapshot, feedbackPageContext } from '../../utils/pageSnapshot'
import '../../styles/feedback.css'

const REPORTER_LAYER = 2147483000
const router = useRouter()
const store = useStore()
const isLoggedIn = computed(() => Boolean(store.state.token))
const bubbleHovered = ref(false)
const dialogVisible = ref(false)
const isSubmitting = ref(false)
const feedbackFormRef = ref(null)
const fileList = ref([])
const form = reactive({ title: '', content: '', category: 'bug' })
const categories = [
  { value: 'bug', label: '问题故障（Bug）' }, { value: 'feature_request', label: '功能建议' },
  { value: 'content_issue', label: '内容问题' }, { value: 'account_issue', label: '账号问题' }, { value: 'other', label: '其他反馈' },
]
const rules = {
  title: [{ required: true, message: '请输入问题标题', trigger: 'blur' }, { min: 2, max: 100, message: '标题长度为 2–100 字', trigger: 'blur' }],
  content: [{ required: true, message: '请输入问题描述', trigger: 'blur' }, { min: 10, max: 1000, message: '描述长度为 10–1000 字', trigger: 'blur' }],
}
const capturing = ref(false)
const snapshotFile = ref(null)
const snapshotUrl = ref('')
const pageContext = ref(null)
const snapshotError = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')
const submitError = ref('')
let captureSequence = 0
let captureTimer

function removeSnapshot() {
  captureSequence += 1
  clearTimeout(captureTimer)
  capturing.value = false
  if (snapshotUrl.value) URL.revokeObjectURL(snapshotUrl.value)
  snapshotUrl.value = ''
  snapshotFile.value = null
}
async function takeSnapshot() {
  if (capturing.value) return
  removeSnapshot()
  const sequence = ++captureSequence
  pageContext.value = feedbackPageContext()
  capturing.value = true
  snapshotError.value = ''
  submitError.value = ''
  const timeout = new Promise((_, reject) => { captureTimer = setTimeout(() => reject(new Error('快照生成超时，可手动上传图片或继续提交。')), 8000) })
  try {
    const result = await Promise.race([capturePageSnapshot(), timeout])
    if (sequence !== captureSequence) return
    snapshotFile.value = result.file
    pageContext.value = result.context
    snapshotUrl.value = URL.createObjectURL(result.file)
  } catch (error) {
    if (sequence === captureSequence) snapshotError.value = error.message || '快照生成失败，可手动上传图片。'
  } finally {
    if (sequence === captureSequence) { clearTimeout(captureTimer); capturing.value = false }
  }
}
function openFeedbackDialog() {
  if (dialogVisible.value) return
  removeSnapshot()
  dialogVisible.value = true
  takeSnapshot()
}
function closeDialog(done) {
  if (isSubmitting.value) return
  previewVisible.value = false
  dialogVisible.value = false
  if (typeof done === 'function') done()
}
function resetForm() {
  form.title = ''; form.content = ''; form.category = 'bug'
  fileList.value = []
  removeSnapshot()
  pageContext.value = null
  snapshotError.value = ''
  submitError.value = ''
  feedbackFormRef.value?.clearValidate()
}
function validateFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.raw?.type) || file.size > 5 * 1024 * 1024) {
    fileList.value = fileList.value.filter(item => item.uid !== file.uid)
    submitError.value = '请上传 JPG / PNG / WebP / GIF 图片，大小不超过 5MB'
  }
}
const uploadExceeded = () => { submitError.value = '最多上传 1 张补充图片，请先移除已有图片' }
const preview = url => { previewUrl.value = url; previewVisible.value = true }
const previewUpload = file => preview(file.url)
function login() {
  closeDialog()
  router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
}
async function submitFeedback() {
  if (isSubmitting.value || capturing.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    if (!await feedbackFormRef.value?.validate().catch(() => false)) return
    await authSession.bootstrap()
    if (!authSession.getToken()) { submitError.value = '请先登录后提交反馈'; return }
    const data = new FormData()
    data.append('title', form.title.trim()); data.append('description', form.content.trim()); data.append('category', form.category)
    data.append('page_context', JSON.stringify(pageContext.value || feedbackPageContext()))
    if (snapshotFile.value) data.append('snapshot', snapshotFile.value)
    if (fileList.value[0]?.raw) data.append('image', fileList.value[0].raw)
    const result = await feedbackService.create(data)
    if (result.code !== 200) throw new Error(result.message || '提交失败，请重试')
    ElMessage.success('反馈已提交，处理进度可在「我的反馈」查看')
    dialogVisible.value = false
    resetForm()
  } catch (error) {
    submitError.value = error.response?.data?.message || error.message || '提交失败，请稍后重试'
  } finally { isSubmitting.value = false }
}
let reporterId = store.state.user?.User_Id || store.state.user?.id || store.state.user?.User_Email
let hadSession = Boolean(store.state.token)
const unsubscribe = store.subscribe(() => {
  const next = store.state.user?.User_Id || store.state.user?.id || store.state.user?.User_Email
  if ((reporterId && next !== reporterId) || (hadSession && !store.state.token)) { resetForm(); dialogVisible.value = false }
  reporterId = next
  hadSession = Boolean(store.state.token)
})
onBeforeUnmount(() => { removeSnapshot(); unsubscribe() })
</script>

<style>
.feedback-float { position: fixed; right: max(20px, env(safe-area-inset-right)); bottom: calc(24px + env(safe-area-inset-bottom)); z-index: 2147483000; }
.feedback-report-dialog { --el-dialog-bg-color: var(--dew-popover-bg); --el-text-color-primary: var(--dew-text-heading); --el-text-color-regular: var(--dew-text); --el-border-color: var(--dew-card-flat-border); --el-fill-color-blank: var(--dew-card-flat-bg); --el-text-color-placeholder: var(--dew-text-muted); --el-color-info-light-9: var(--color-bg-muted); --el-color-info: var(--dew-text-muted); --el-color-error-light-9: var(--color-danger-light); --el-color-error: var(--color-danger); border-radius: var(--radius-lg); display: flex; flex-direction: column; max-height: calc(100dvh - 32px); margin: 16px auto; }
.feedback-report-dialog .el-dialog__body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.feedback-report-dialog .el-dialog__header, .feedback-report-dialog .el-dialog__footer { flex-shrink: 0; }
.feedback-report-dialog .el-alert { margin-bottom: var(--space-lg); }
.feedback-report-dialog .el-dialog__footer { display: flex; justify-content: flex-end; gap: var(--space-sm); }
.feedback-snapshot { margin-bottom: var(--space-lg); border: 1px solid var(--dew-card-flat-border); border-radius: var(--radius-md); padding: var(--space-md); }
.feedback-snapshot-head { display: flex; align-items: center; justify-content: space-between; color: var(--dew-text-heading); margin-bottom: var(--space-sm); }
.feedback-snapshot-preview { display: block; padding: 0; border: 0; width: 100%; cursor: zoom-in; background: var(--dew-skeleton-bg); border-radius: var(--radius-sm); overflow: hidden; }
.feedback-snapshot-preview:disabled { cursor: default; }
.feedback-muted { font-size: var(--text-sm); line-height: 1.5; color: var(--dew-text-muted); margin: var(--space-sm) 0 0; }
.feedback-source { color: var(--dew-text-muted); font-size: var(--text-sm); overflow-wrap: anywhere; margin-bottom: 0; }
@media (max-width: 768px) { .feedback-float { right: max(12px, env(safe-area-inset-right)); bottom: calc(16px + env(safe-area-inset-bottom)); } }
</style>
