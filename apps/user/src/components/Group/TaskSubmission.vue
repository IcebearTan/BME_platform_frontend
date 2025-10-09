<template>
  <div class="task-submission" :class="{ 'theme-dark': isDarkMode }">
    <div class="submission-container">
      <!-- 返回按钮 -->
      <div class="submission-header">
        <el-button 
          type="default" 
          size="default"
          @click="handleBack"
          class="back-button"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回任务列表
        </el-button>
        <h2 class="submission-title">作业提交</h2>
      </div>

    <div v-if="task" class="submission-content">
      <!-- 任务信息展示 -->
      <div class="task-info">
        <div class="info-header">
          <h3 class="info-title">{{ task.title }}</h3>
          <div class="info-badges">
            <span class="task-type-badge" :class="`type-${task.type}`">
              {{ task.type === 'exercise' ? '题目任务' : '自定义任务' }}
            </span>
          </div>
        </div>
        
        <div class="info-meta">
          <div class="meta-item">
            <span class="meta-label">创建时间：</span>
            <span class="meta-value">{{ formatDateTime(task.createDate) }}</span>
          </div>
          <div class="meta-item" v-if="task.dueDate">
            <span class="meta-label">截止时间：</span>
            <span class="meta-value" :class="{ 'overdue-text': isOverdue(task) }">
              {{ formatDateTime(task.dueDate) }}
            </span>
          </div>
        </div>

        <div class="info-content">
          <h4>任务描述</h4>
          <div class="content-text">{{ task.description }}</div>
          
          <h4 v-if="task.requirements">任务要求</h4>
          <div v-if="task.requirements" class="content-text">{{ task.requirements }}</div>
        </div>
      </div>

      <!-- 题目任务：跳转解题 -->
      <div v-if="task.type === 'exercise'" class="exercise-submission">
        <div class="exercise-notice">
          <el-icon><InfoFilled /></el-icon>
          <span>这是一个题目任务，请点击下方按钮前往解题页面完成答题</span>
        </div>
        <div class="exercise-action">
          <el-button 
            type="primary" 
            size="large"
            @click="handleGoToExercise"
            :disabled="getTaskActualStatus(task) === 'completed'"
          >
            <el-icon><EditPen /></el-icon>
            {{ getTaskActualStatus(task) === 'overdue' ? '补做题目' : 
               getTaskActualStatus(task) === 'completed' ? '已完成' : '前往解题' }}
          </el-button>
        </div>
      </div>

      <!-- 自定义任务：提交表单 -->
      <div v-else class="custom-submission">
        <el-form 
          ref="submissionFormRef"
          :model="submissionForm" 
          :rules="submissionRules"
          label-width="80px"
        >
          <el-form-item label="提交内容" prop="content">
            <el-input 
              v-model="submissionForm.content"
              type="textarea"
              :rows="8"
              placeholder="请输入作业内容或说明"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="附件上传">
            <el-upload
              class="submission-upload"
              :file-list="submissionForm.attachments"
              :on-change="handleSubmissionFileChange"
              :on-remove="handleSubmissionFileRemove"
              :before-upload="() => false"
              multiple
            >
              <el-button size="small">
                <el-icon><Upload /></el-icon>
                添加文件
              </el-button>
              <template #tip>
                <div class="upload-tip">支持上传文档、图片等文件，单个文件不超过50MB</div>
              </template>
            </el-upload>
          </el-form-item>
        </el-form>

        <!-- 提交按钮区域 -->
        <div class="submission-actions">
          <el-button @click="handleSaveDraft" :loading="savingDraft" size="large">
            <el-icon><Document /></el-icon>
            保存草稿
          </el-button>
          <el-button type="primary" @click="handleSubmitAssignment" :loading="submitting" size="large">
            <el-icon><Check /></el-icon>
            提交作业
          </el-button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { 
  ArrowLeft,
  InfoFilled,
  EditPen,
  Upload,
  Document,
  Check
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  task: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits([
  'back',
  'task-submit'
]);

// Vuex store 和 Router
const store = useStore();
const router = useRouter();

// 响应式数据
const submitting = ref(false);
const savingDraft = ref(false);

// 表单引用和数据
const submissionFormRef = ref();
const submissionForm = ref({
  content: '',
  attachments: []
});

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 提交表单验证规则
const submissionRules = {
  content: [
    { required: true, message: '请输入提交内容', trigger: 'blur' },
    { min: 10, max: 2000, message: '内容长度在 10 到 2000 个字符', trigger: 'blur' }
  ]
};

// 方法
const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 判断任务是否逾期
const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date();
};

// 获取任务实际状态
const getTaskActualStatus = (task) => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue(task)) return 'overdue';
  return 'pending';
};

// 事件处理
const handleBack = () => {
  emit('back');
};

// 前往解题（题目任务）
const handleGoToExercise = () => {
  if (!props.task) return;
  
  // 跳转到解题页面
  router.push({
    name: 'exercise-solve',
    params: { 
      id: props.task.exerciseId || props.task.id 
    },
    query: { 
      taskId: props.task.id,
      title: props.task.title,
      from: 'submission-component'
    }
  });
  
  ElMessage.success(`正在跳转到解题页面：${props.task.title}`);
};

// 保存草稿
const handleSaveDraft = async () => {
  if (!submissionFormRef.value || !props.task) return;
  
  try {
    savingDraft.value = true;
    
    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('草稿已保存');
      savingDraft.value = false;
    }, 800);
  } catch (error) {
    console.error('保存草稿失败:', error);
    ElMessage.error('保存草稿失败');
    savingDraft.value = false;
  }
};

// 提交作业（自定义任务）
const handleSubmitAssignment = async () => {
  if (!submissionFormRef.value || !props.task) return;
  
  try {
    await submissionFormRef.value.validate();
    
    submitting.value = true;
    
    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('作业提交成功！');
      submitting.value = false;
      
      // 触发任务提交事件
      emit('task-submit', {
        taskId: props.task.id,
        content: submissionForm.value.content,
        attachments: submissionForm.value.attachments
      });
      
      // 返回任务列表
      handleBack();
    }, 1500);
  } catch (error) {
    console.error('Form validation failed:', error);
  }
};

// 文件上传处理
const handleSubmissionFileChange = (file, fileList) => {
  submissionForm.value.attachments = fileList;
};

const handleSubmissionFileRemove = (file, fileList) => {
  submissionForm.value.attachments = fileList;
};

// 初始化
onMounted(() => {
  // 重置表单
  submissionForm.value = {
    content: '',
    attachments: []
  };
});
</script>

<style scoped>
.task-submission {
  width: 100%;
  height: 100%;
  padding: 0;
  background-color: transparent;
  display: flex;
  flex-direction: column;
}

.theme-dark .task-submission {
  background-color: transparent;
}

.submission-container {
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* 头部样式 */
.submission-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 0;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.theme-dark .submission-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 30, 30, 0.9);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 8px;
}

.back-button:hover {
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-1px);
}

.theme-dark .back-button {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
}

.theme-dark .back-button:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
}

.submission-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
  line-height: 1.4;
}

.theme-dark .submission-title {
  color: #f9fafb;
}

/* 内容区域 */
.submission-content {
  width: 100%;
  background: #ffffff;
  overflow-y: auto;
  flex: 1;
  border: none;
  box-shadow: none;
}

.theme-dark .submission-content {
  background: rgba(30, 30, 30, 0.95);
  border: none;
}

/* 任务信息展示区域 */
.task-info {
  padding: 20px 24px;
  background: rgba(102, 126, 234, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.theme-dark .task-info {
  background: rgba(102, 126, 234, 0.08);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .info-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.info-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.4;
  flex: 1;
  margin-right: 16px;
}

.theme-dark .info-title {
  color: #ffffff;
}

.info-badges {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-type-badge {
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-exercise {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.type-custom {
  background-color: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.info-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.meta-label {
  font-weight: 500;
  color: #6b7280;
  margin-right: 8px;
}

.theme-dark .meta-label {
  color: #9ca3af;
}

.meta-value {
  color: #1a1a1a;
}

.theme-dark .meta-value {
  color: #ffffff;
}

.overdue-text {
  color: #ef4444 !important;
  font-weight: 500;
}

.info-content {
  margin-top: 0;
}

.info-content h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: #374151;
}

.theme-dark .info-content h4 {
  color: #d1d5db;
}

.content-text {
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
  white-space: pre-wrap;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.theme-dark .content-text {
  color: #e5e7eb;
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

/* 题目任务提交区域 */
.exercise-submission {
  padding: 32px 24px;
  text-align: center;
  background: rgba(16, 185, 129, 0.04);
  border: 2px dashed rgba(16, 185, 129, 0.2);
  margin: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.08);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.theme-dark .exercise-submission {
  border-color: rgba(16, 185, 129, 0.25);
  background: rgba(16, 185, 129, 0.06);
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.15);
}

.exercise-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 16px;
  color: #059669;
}

.theme-dark .exercise-notice {
  color: #10b981;
}

.exercise-action .el-button {
  font-size: 16px;
  padding: 16px 40px;
  height: auto;
}

/* 自定义任务提交区域 */
.custom-submission {
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.005);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.theme-dark .custom-submission {
  background: rgba(255, 255, 255, 0.01);
}

.custom-submission .el-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-submission .el-form-item:first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.custom-submission .el-form-item:first-child .el-form-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.custom-submission .el-form-item:first-child .el-textarea {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.custom-submission .el-form-item:first-child .el-textarea__inner {
  flex: 1;
  min-height: 200px !important;
  resize: vertical;
}

.submission-upload {
  width: 100%;
}

.upload-tip {
  font-size: 12px;
  color: #8a8a8a;
  margin-top: 4px;
}

.submission-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: auto;
  padding: 20px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(248, 250, 252, 0.5);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}

.theme-dark .submission-actions {
  border-top-color: rgba(255, 255, 255, 0.06);
  background: rgba(25, 25, 25, 0.8);
}

.submission-actions .el-button {
  min-width: 130px;
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.submission-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .submission-container {
    padding: 0;
  }
  
  .submission-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .submission-title {
    font-size: 18px;
  }
  
  .task-info {
    padding: 16px 20px;
  }
  
  .info-meta {
    grid-template-columns: 1fr;
  }
  
  .info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .info-title {
    margin-right: 0;
    font-size: 16px;
  }
  
  .exercise-submission {
    padding: 20px 16px;
    margin: 16px;
  }
  
  .custom-submission {
    padding: 16px 20px;
  }
  
  .submission-actions {
    flex-direction: column;
    gap: 10px;
    padding: 16px 20px;
  }
  
  .submission-actions .el-button {
    width: 100%;
    height: 42px;
  }
}

@media (max-width: 480px) {
  .exercise-action .el-button {
    width: 100%;
    font-size: 14px;
    padding: 12px 24px;
  }
}

/* 容器适配优化 */
.task-submission {
  box-sizing: border-box;
  overflow: hidden;
}

.submission-container {
  box-sizing: border-box;
  min-height: 0; /* 重要：允许flex子元素收缩 */
}

/* 滚动区域优化 */
.submission-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.submission-content::-webkit-scrollbar {
  width: 6px;
}

.submission-content::-webkit-scrollbar-track {
  background: transparent;
}

.submission-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.theme-dark .submission-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 表单项目间距优化 */
.custom-submission .el-form-item {
  margin-bottom: 16px;
}

.custom-submission .el-form-item:last-child {
  margin-bottom: 0;
}
</style>