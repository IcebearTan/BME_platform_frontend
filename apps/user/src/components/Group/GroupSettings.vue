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

          <el-form-item label="所属课程">
            <el-select 
              v-model="basicForm.courseId"
              placeholder="选择所属课程"
              style="width: 100%"
            >
              <el-option 
                v-for="course in availableCourses"
                :key="course.id"
                :label="course.name"
                :value="course.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="学年学期">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-select 
                  v-model="basicForm.academicYear"
                  placeholder="学年"
                  style="width: 100%"
                >
                  <el-option 
                    v-for="year in academicYears"
                    :key="year"
                    :label="`${year}-${year + 1}学年`"
                    :value="year"
                  />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-select 
                  v-model="basicForm.semester"
                  placeholder="学期"
                  style="width: 100%"
                >
                  <el-option label="第一学期" value="1" />
                  <el-option label="第二学期" value="2" />
                </el-select>
              </el-col>
            </el-row>
          </el-form-item>

          <el-form-item label="小组状态">
            <el-radio-group v-model="basicForm.status">
              <el-radio label="active">活跃</el-radio>
              <el-radio label="inactive">暂停</el-radio>
              <el-radio label="completed">已结束</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSaveBasicInfo" :loading="saving">
              保存基本信息
            </el-button>
            <el-button @click="handleResetBasicInfo">重置</el-button>
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
              <div class="setting-desc">新成员加入需要管理员审核</div>
            </div>
            <div class="setting-control">
              <el-switch 
                v-model="memberSettings.requireApproval"
                @change="handleMemberSettingChange"
              />
            </div>
          </div>

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
        </div>
      </div>

      <!-- 通知设置 -->
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

      <!-- 高级设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Setting /></el-icon>
          <h4 class="section-title">高级设置</h4>
        </div>
        
        <div class="settings-form">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">归档小组</div>
              <div class="setting-desc">将小组设为只读状态，保留历史数据</div>
            </div>
            <div class="setting-control">
              <el-button 
                type="warning" 
                @click="handleArchiveGroup"
                :disabled="basicForm.status === 'completed'"
              >
                {{ basicForm.status === 'completed' ? '已归档' : '归档小组' }}
              </el-button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">导出数据</div>
              <div class="setting-desc">导出小组的所有数据和活动记录</div>
            </div>
            <div class="setting-control">
              <el-button type="default" @click="handleExportData" :loading="exporting">
                导出数据
              </el-button>
            </div>
          </div>

          <div class="setting-item danger-zone">
            <div class="setting-info">
              <div class="setting-label">删除小组</div>
              <div class="setting-desc">永久删除小组及所有相关数据，此操作不可恢复</div>
            </div>
            <div class="setting-control">
              <el-button type="danger" @click="handleDeleteGroup">
                删除小组
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  InfoFilled,
  User,
  Bell,
  Setting
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
  requireApproval: false,
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

// 可用课程列表
const availableCourses = ref([
  { id: 1, name: '生物医学工程基础' },
  { id: 2, name: '医学信号处理' },
  { id: 3, name: '医学图像分析' },
  { id: 4, name: '生物材料学' },
  { id: 5, name: '医疗器械设计' }
]);

// 学年选项
const academicYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
});

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
  if (props.groupData) {
    Object.assign(basicForm, {
      groupName: props.groupData.title || '',
      description: props.groupData.description || '',
      courseId: props.groupData.courseId || '',
      academicYear: props.groupData.academicYear || 2024,
      semester: props.groupData.semester || '1',
      status: props.groupData.status || 'active'
    });
    
    // 从props中加载其他设置，如果没有则使用默认值
    if (props.groupData.settings) {
      Object.assign(memberSettings, props.groupData.settings.member || {});
      Object.assign(notificationSettings, props.groupData.settings.notification || {});
    }
  }
};

const handleSaveBasicInfo = async () => {
  if (!basicFormRef.value) return;
  
  try {
    await basicFormRef.value.validate();
    
    saving.value = true;
    
    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('基本信息已保存');
      saving.value = false;
      
      // 触发更新事件
      emit('settings-updated', {
        type: 'basic',
        data: { ...basicForm }
      });
    }, 1000);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const handleResetBasicInfo = () => {
  basicFormRef.value?.resetFields();
  initializeSettings();
  ElMessage.info('已重置为原始数据');
};

const handleMemberSettingChange = () => {
  // 自动保存成员设置
  emit('settings-updated', {
    type: 'member',
    data: { ...memberSettings }
  });
  ElMessage.success('成员设置已更新');
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

<style scoped>
.group-settings {
  width: 100%;
  padding: 0;
}

/* 头部样式 */
.settings-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(248, 250, 252, 0.8);
}

.theme-dark .settings-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
  background: rgba(30, 30, 30, 0.8);
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
</style>