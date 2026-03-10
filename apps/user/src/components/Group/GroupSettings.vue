<template>
  <div class="group-settings" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部 -->
    <div class="settings-header">
      <div class="header-info">
        <h3 class="settings-title">小组设置</h3>
        <div class="settings-subtitle">管理小组基本信息、权限和偏好设置</div>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 基本信息设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><InfoFilled /></el-icon>
          <h4 class="section-title">基本信息</h4>
        </div>
        
        <el-form 
          ref="basicFormRef"
          :model="basicForm" 
          :rules="basicRules"
          label-width="100px"
          class="settings-form"
        >
          <el-form-item label="小组名称" prop="groupName">
            <el-input 
              v-model="basicForm.groupName"
              placeholder="请输入小组名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="小组描述" prop="description">
            <el-input
              v-model="basicForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入小组描述"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="小组状态">
            <el-radio-group v-model="basicForm.status">
              <el-radio label="active">进行中</el-radio>
              <el-radio label="completed">已结束</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSaveBasicInfo" :loading="saving">
              保存基本信息
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 成员管理设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><User /></el-icon>
          <h4 class="section-title">成员管理</h4>
        </div>
        
        <div class="settings-form">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">成员上限</div>
              <div class="setting-desc">设置小组最大成员数量</div>
            </div>
            <div class="setting-control">
              <el-input-number 
                v-model="memberSettings.maxMembers"
                :min="1"
                :max="100"
                @change="handleMemberSettingChange"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">需要审核</div>
              <div class="setting-desc">新成员加入需要管理员审核（默认开启）</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="memberSettings.requireApproval"
                disabled
              />
            </div>
          </div>

          <!-- 考勤设置 - 暂时禁用 -->
          <!--
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">考勤设置</div>
              <div class="setting-desc">是否启用小组考勤功能</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="memberSettings.enableAttendance"
                @change="handleMemberSettingChange"
              />
            </div>
          </div>
          -->
        </div>
      </div>

      <!-- 通知设置 - 暂时禁用 -->
      <!--
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Bell /></el-icon>
          <h4 class="section-title">通知设置</h4>
        </div>

        <div class="settings-form">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">新任务通知</div>
              <div class="setting-desc">有新任务发布时通知成员</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="notificationSettings.newTask"
                @change="handleNotificationChange"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">截止提醒</div>
              <div class="setting-desc">任务即将截止时提醒成员</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="notificationSettings.deadline"
                @change="handleNotificationChange"
              />
            </div>
          </div>

          <div class="setting-item" v-show="notificationSettings.deadline">
            <div class="setting-info">
              <div class="setting-label">提醒时间</div>
              <div class="setting-desc">提前多长时间提醒</div>
            </div>
            <div class="setting-control">
              <el-select
                v-model="notificationSettings.deadlineHours"
                style="width: 150px"
                @change="handleNotificationChange"
              >
                <el-option label="1小时前" :value="1" />
                <el-option label="6小时前" :value="6" />
                <el-option label="12小时前" :value="12" />
                <el-option label="24小时前" :value="24" />
                <el-option label="48小时前" :value="48" />
              </el-select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">公告通知</div>
              <div class="setting-desc">有新公告发布时通知成员</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="notificationSettings.announcement"
                @change="handleNotificationChange"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">成员变动</div>
              <div class="setting-desc">成员加入或离开时通知</div>
            </div>
            <div class="setting-control">
              <el-switch
                v-model="notificationSettings.memberChange"
                @change="handleNotificationChange"
              />
            </div>
          </div>
        </div>
      </div>
      -->

      <!-- 删除小组 -->
      <div class="delete-group-section">
        <el-button type="danger" @click="handleDeleteGroup">
          删除小组
        </el-button>
        <p class="delete-hint">永久删除小组及所有相关数据，此操作不可恢复</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';
import {
  InfoFilled,
  User
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  groupData: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits([
  'settings-updated',
  'group-archived',
  'group-deleted'
]);

// Vuex store
const store = useStore();

// 响应式数据
const saving = ref(false);
const exporting = ref(false);

// 表单引用
const basicFormRef = ref();

// 基本信息表单
const basicForm = reactive({
  groupName: '',
  description: '',
  courseId: '',
  academicYear: 2024,
  semester: '1',
  status: 'active'
});

// 成员设置
const memberSettings = reactive({
  maxMembers: 30,
  requireApproval: true,
  enableAttendance: true
});

// 通知设置
const notificationSettings = reactive({
  newTask: true,
  deadline: true,
  deadlineHours: 24,
  announcement: true,
  memberChange: false
});

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

const availableCourses = ref([]);

// 获取课程列表 - 暂时禁用因为API不存在
// const fetchCourses = async () => {
//   try {
//     const res = await api({
//       url: '/courses/my',
//       method: 'get'
//     });
//     if (res.data && res.data.code === 200) {
//       availableCourses.value = (res.data.data || []).map(course => ({
//         id: course.id,
//         name: course.name
//       }));
//     }
//   } catch (error) {
//     console.error('获取课程列表失败:', error);
//   }
// };

// 表单验证规则
const basicRules = {
  groupName: [
    { required: true, message: '请输入小组名称', trigger: 'blur' },
    { min: 2, max: 50, message: '小组名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 500, message: '描述不能超过 500 个字符', trigger: 'blur' }
  ]
};

// 方法
const initializeSettings = () => {
  console.log('=== initializeSettings START ===');
  console.log('groupData.studentLimit:', props.groupData?.studentLimit);

  if (!props.groupData) {
    console.log('groupData is empty');
    return;
  }

  // 处理学期映射
  const semesterMap = {
    'spring': '1',
    'summer': '2',
    'autumn': '1',
    'winter': '2'
  };
  const semesterValue = props.groupData.semester || '1';
  const mappedSemester = semesterMap[semesterValue] || semesterValue;

  Object.assign(basicForm, {
    groupName: props.groupData.title || props.groupData.name || '',
    description: props.groupData.description || props.groupData.desc || '',
    courseId: props.groupData.courseId || props.groupData.course_id || '',
    academicYear: parseInt(props.groupData.academicYear) || new Date().getFullYear(),
    semester: mappedSemester,
    status: props.groupData.status || 'active'
  });

  // 从props中加载其他设置
  if (props.groupData.settings) {
    Object.assign(memberSettings, props.groupData.settings.member || {});
    Object.assign(notificationSettings, props.groupData.settings.notification || {});
  }

  // 加载成员上限
  const limitVal = props.groupData.studentLimit;
  console.log('limitVal:', limitVal, 'isNaN:', isNaN(limitVal));
  if (limitVal !== undefined && limitVal !== null && !isNaN(limitVal)) {
    memberSettings.maxMembers = Number(limitVal);
  }

  console.log('memberSettings.maxMembers after init:', memberSettings.maxMembers);
  console.log('=== initializeSettings END ===');
};

const handleSaveBasicInfo = async () => {
  if (!basicFormRef.value) return;

  try {
    await basicFormRef.value.validate();

    saving.value = true;

    // 调用API更新小组信息
    const res = await api({
      url: `/course-groups/${props.groupData.id}`,
      method: 'put',
      data: {
        name: basicForm.groupName,
        description: basicForm.description,
        status: basicForm.status
      }
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success('基本信息已保存');
      // 触发更新事件
      emit('settings-updated', {
        type: 'basic',
        data: { ...basicForm }
      });
    } else {
      ElMessage.error(res.data?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 监听 groupData 变化，重新初始化设置
watch(() => props.groupData, () => {
  nextTick(() => {
    initializeSettings();
  });
}, { deep: true });

// 专门监听 studentLimit 变化
watch(() => props.groupData?.studentLimit, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    memberSettings.maxMembers = newVal;
  }
});

const handleMemberSettingChange = async () => {
  console.log('handleMemberSettingChange called, maxMembers:', memberSettings.maxMembers);
  console.log('groupData.id:', props.groupData?.id);

  try {
    // 调用API更新小组人数限制
    const res = await api({
      url: `/course-groups/${props.groupData.id}`,
      method: 'put',
      data: {
        student_limit: memberSettings.maxMembers
      }
    });

    console.log('API response:', res.data);

    if (res.data && res.data.code === 200) {
      emit('settings-updated', {
        type: 'member',
        data: { ...memberSettings }
      });
      ElMessage.success('成员设置已更新');
    } else {
      ElMessage.error(res.data?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存成员设置失败:', error);
    ElMessage.error('保存失败');
  }
};

const handleNotificationChange = () => {
  // 自动保存通知设置
  emit('settings-updated', {
    type: 'notification',
    data: { ...notificationSettings }
  });
  ElMessage.success('通知设置已更新');
};

const handleArchiveGroup = () => {
  ElMessageBox.confirm(
    '归档后小组将变为只读状态，成员无法继续提交任务和发表评论。确定要归档这个小组吗？',
    '确认归档',
    {
      confirmButtonText: '确定归档',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    basicForm.status = 'completed';
    emit('group-archived', props.groupData.id);
    ElMessage.success('小组已归档');
  });
};

const handleExportData = () => {
  exporting.value = true;
  
  // 模拟导出过程
  setTimeout(() => {
    // 创建下载链接
    const data = {
      group: basicForm,
      members: [], // 实际项目中从API获取
      tasks: [], // 实际项目中从API获取
      announcements: [], // 实际项目中从API获取
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${basicForm.groupName}-导出数据-${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    exporting.value = false;
    ElMessage.success('数据导出完成');
  }, 2000);
};

const handleDeleteGroup = () => {
  ElMessageBox.prompt(
    '请输入小组名称以确认删除操作。注意：此操作将永久删除小组及所有相关数据，不可恢复！',
    '危险操作确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      inputPattern: new RegExp(`^${basicForm.groupName}$`),
      inputErrorMessage: '小组名称不匹配',
      type: 'error',
    }
  ).then(() => {
    emit('group-deleted', props.groupData.id);
    ElMessage.success('小组已删除');
  });
};

// 生命周期
onMounted(() => {
  initializeSettings();
});
</script>

<style>
/* 暗黑模式字数统计背景 - 全局样式 */
.theme-dark .el-input__count,
.theme-dark .el-input__word-count,
.theme-dark .el-textarea__count,
.theme-dark .el-textarea__word-count {
  background-color: #2a2a2a !important;
  color: #707070 !important;
}
</style>

<style scoped>
.group-settings {
  width: 100%;
  padding: 0;
}

/* 头部样式 */
.settings-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .settings-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.settings-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.theme-dark .settings-title {
  color: #f9fafb;
}

.settings-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.theme-dark .settings-subtitle {
  color: #9ca3af;
}

/* 内容区域 */
.settings-content {
  padding: 24px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

/* 设置分组 */
.settings-section {
  margin-bottom: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.theme-dark .settings-section {
  background: rgba(40, 40, 40, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: rgba(102, 126, 234, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .section-header {
  background: rgba(102, 126, 234, 0.1);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.section-icon {
  font-size: 18px;
  color: #667eea;
  margin-right: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.theme-dark .section-title {
  color: #f9fafb;
}

/* 表单样式 */
.settings-form {
  padding: 20px;
}

.settings-form .el-form-item {
  margin-bottom: 20px;
}

/* 设置项样式 */
.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .setting-item {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 20px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.theme-dark .setting-label {
  color: #e5e7eb;
}

.setting-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.theme-dark .setting-desc {
  color: #9ca3af;
}

.setting-control {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* 危险区域 */
.danger-zone {
  background: rgba(239, 68, 68, 0.02);
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.theme-dark .danger-zone {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.danger-zone .setting-label {
  color: #dc2626;
}

.theme-dark .danger-zone .setting-label {
  color: #f87171;
}

/* 复选框组样式 */
.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.el-checkbox-group .el-checkbox {
  margin-right: 0;
}

/* 滚动条样式 */
.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

.theme-dark .settings-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .settings-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-content {
    padding: 16px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-info {
    margin-right: 0;
  }
  
  .setting-control {
    width: 100%;
    justify-content: flex-start;
  }
  
  .section-header {
    padding: 12px 16px;
  }
  
  .settings-form {
    padding: 16px;
  }
}

/* 危险操作区域样式 */
.danger-section {
  border-color: #fde2e2;
}

.theme-dark .danger-section {
  border-color: #5c3838;
}

.danger-title {
  color: #f56c6c;
}

.theme-dark .danger-title {
  color: #f56c6c;
}

/* 删除小组区域 */
.delete-group-section {
  padding: 20px;
  text-align: center;
}

.delete-hint {
  margin-top: 12px;
  color: #909399;
  font-size: 13px;
}

/* 暗黑模式适配 - 深层穿透 */
.theme-dark :deep(.el-input__wrapper),
.theme-dark :deep(.el-textarea__inner) {
  background-color: #2a2a2a;
  box-shadow: 0 0 0 1px #3a3a3a inset;
}

.theme-dark :deep(.el-input__inner),
.theme-dark :deep(.el-textarea__inner) {
  color: #e5e5e5;
}

.theme-dark :deep(.el-input__inner::placeholder),
.theme-dark :deep(.el-textarea__inner::placeholder) {
  color: #707070;
}

.theme-dark :deep(.el-select .el-input__wrapper) {
  background-color: #2a2a2a;
  box-shadow: 0 0 0 1px #3a3a3a inset;
}

.theme-dark :deep(.el-radio-group),
.theme-dark :deep(.el-switch__core) {
  background-color: #2a2a2a;
}

.theme-dark :deep(.el-button) {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
  color: #e5e5e5;
}

/* 暗黑模式下danger按钮保持红色 */
.theme-dark :deep(.el-button--danger) {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

.theme-dark :deep(.el-button--danger:hover) {
  background-color: #f78989;
  border-color: #f78989;
}

/* 暗黑模式字数统计背景 */
.theme-dark .el-input__count,
.theme-dark .el-input__word-count,
.theme-dark .el-textarea__count,
.theme-dark .el-textarea__word-count,
.theme-dark :deep(.el-input__count),
.theme-dark :deep(.el-input__word-count),
.theme-dark :deep(.el-textarea__count),
.theme-dark :deep(.el-textarea__word-count) {
  background-color: #2a2a2a !important;
  color: #707070 !important;
}
</style>