<template>
  <div class="group-announcements" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部操作区 -->
    <div class="announcements-header">
      <div class="header-info">
        <h3 class="announcements-title">{{ isTeacher ? '公告管理' : '公告通知' }}</h3>
        <div class="announcements-count">共 {{ filteredAnnouncements.length }} 条公告</div>
      </div>
      
      <!-- 管理员操作 -->
      <div v-if="isTeacher" class="header-actions">
        <el-button type="primary" size="default" @click="handleCreateAnnouncement">
          <el-icon><DocumentAdd /></el-icon>
          发布公告
        </el-button>
        <el-button type="default" size="default" @click="handleBatchManage">
          <el-icon><Setting /></el-icon>
          批量管理
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="announcements-filters">
      <div class="search-container">
        <el-icon class="search-icon">
          <Search />
        </el-icon>
        <input 
          v-model="searchQuery"
          type="text" 
          class="search-input"
          placeholder="搜索公告标题或内容..."
        />
      </div>
      
      <div class="filter-tabs">
        <div 
          v-for="filter in announcementFilters"
          :key="filter.key"
          class="filter-tab"
          :class="{ 'active': activeFilter === filter.key }"
          @click="activeFilter = filter.key"
        >
          <span class="filter-label">{{ filter.label }}</span>
          <span class="filter-count">({{ getFilterCount(filter.key) }})</span>
        </div>
      </div>
    </div>

    <!-- 公告列表 -->
    <div class="announcements-list" v-if="filteredAnnouncements.length > 0">
      <div 
        v-for="(group, groupKey) in groupedAnnouncements"
        :key="groupKey"
        class="date-group"
      >
        <!-- 日期分组标题 -->
        <div class="date-group-header">
          <h4 class="date-group-title">{{ group.label }}</h4>
          <div class="date-group-count">{{ group.announcements.length }} 条公告</div>
        </div>
        
        <!-- 该日期组的公告 -->
        <div 
          v-for="announcement in group.announcements" 
          :key="announcement.id"
          class="announcement-card"
          :class="{ 
            'selected': selectedAnnouncements.includes(announcement.id),
            'unread': !announcement.isRead && !isTeacher
          }"
        >
        <!-- 选择框（仅管理员批量模式可见） -->
        <div v-if="isTeacher && batchMode" class="announcement-checkbox">
          <el-checkbox 
            v-model="selectedAnnouncements"
            :label="announcement.id"
          />
        </div>

        <!-- 公告状态标识 -->
        <div class="announcement-badges">
          <div v-if="!announcement.isRead && !isTeacher" class="unread-dot"></div>
        </div>

        <!-- 公告内容 -->
        <div class="announcement-content" @click="handleAnnouncementClick(announcement)">
          <div class="announcement-header">
            <div class="announcement-title-row">
              <h4 class="announcement-title">{{ announcement.title }}</h4>
              <span class="announcement-category-tag" :class="`category-${announcement.category}`">
                {{ getCategoryText(announcement.category) }}
              </span>
            </div>
          </div>
          
          <div class="announcement-preview">
            {{ getPreviewText(announcement.content) }}
          </div>
          
          <div class="announcement-footer">
            <div class="announcement-stats">
              <div class="stat-item">
                <el-icon><View /></el-icon>
                <span>{{ announcement.readCount || 0 }}</span>
              </div>
              <div class="stat-item" v-if="announcement.attachments?.length > 0">
                <el-icon><Paperclip /></el-icon>
                <span>{{ announcement.attachments.length }}</span>
              </div>
            </div>
            <div class="announcement-date">
              {{ formatDate(announcement.publishDate) }}
            </div>
          </div>
        </div>

        <!-- 操作菜单（仅管理员可见） -->
        <div v-if="isTeacher" class="announcement-actions">
          <el-dropdown trigger="click" @command="handleAnnouncementAction">
            <el-button type="text" class="action-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{ action: 'edit', announcement }">编辑公告</el-dropdown-item>
                <el-dropdown-item :command="{ action: 'stats', announcement }">查看统计</el-dropdown-item>
                <el-dropdown-item 
                  :command="{ action: 'delete', announcement }"
                  class="danger-item"
                >
                  删除公告
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📢</div>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
      <el-button v-if="isTeacher" type="primary" @click="handleCreateAnnouncement">
        发布第一条公告
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载公告中...</p>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="isTeacher && batchMode" class="batch-actions">
      <div class="batch-info">
        已选择 {{ selectedAnnouncements.length }} 条公告
      </div>
      <div class="batch-buttons">
        <el-button size="small" @click="handleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete" :disabled="selectedAnnouncements.length === 0">
          批量删除
        </el-button>
        <el-button size="small" @click="cancelBatchMode">取消</el-button>
      </div>
    </div>

    <!-- 发布/编辑公告对话框 -->
    <el-dialog 
      v-model="isAnnouncementDialogVisible" 
      :title="editingAnnouncement ? '编辑公告' : '发布公告'"
      width="600px"
      class="announcement-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <el-form 
        ref="announcementFormRef"
        :model="announcementForm" 
        :rules="announcementRules"
        label-width="80px"
      >
        <el-form-item label="公告标题" prop="title">
          <el-input 
            v-model="announcementForm.title" 
            placeholder="请输入公告标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公告分类" prop="category">
          <el-select v-model="announcementForm.category" placeholder="请选择分类">
            <el-option 
              v-for="category in categoryOptions"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <el-input 
            v-model="announcementForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>



        <el-form-item label="附件上传">
          <el-upload
            class="announcement-upload"
            :file-list="announcementForm.attachments"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="() => false"
            multiple
          >
            <el-button size="small">
              <el-icon><Upload /></el-icon>
              添加附件
            </el-button>
            <template #tip>
              <div class="upload-tip">支持上传图片、文档等文件，单个文件不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="isAnnouncementDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveAnnouncement" :loading="saving">
            {{ editingAnnouncement ? '保存' : '发布' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 公告详情对话框 -->
    <el-dialog 
      v-model="isDetailDialogVisible" 
      title="公告详情"
      width="700px"
      class="announcement-detail-dialog"
      :class="{ 'theme-dark': isDarkMode }"
    >
      <div v-if="selectedAnnouncementDetail" class="announcement-detail">
        <div class="detail-header">
          <h3 class="detail-title">{{ selectedAnnouncementDetail.title }}</h3>
        </div>
        
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">发布者：</span>
            <span class="meta-value">{{ selectedAnnouncementDetail.author }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发布时间：</span>
            <span class="meta-value">{{ formatDateTime(selectedAnnouncementDetail.publishDate) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">分类：</span>
            <span class="meta-value">{{ getCategoryText(selectedAnnouncementDetail.category) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">阅读次数：</span>
            <span class="meta-value">{{ selectedAnnouncementDetail.readCount || 0 }}</span>
          </div>
        </div>

        <div class="detail-content">
          <div class="content-text">{{ selectedAnnouncementDetail.content }}</div>
        </div>

        <div v-if="selectedAnnouncementDetail.attachments?.length > 0" class="detail-attachments">
          <h4 class="attachments-title">附件</h4>
          <div class="attachment-list">
            <div 
              v-for="attachment in selectedAnnouncementDetail.attachments"
              :key="attachment.id"
              class="attachment-item"
              @click="handleDownloadAttachment(attachment)"
            >
              <el-icon><Document /></el-icon>
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">({{ formatFileSize(attachment.size) }})</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  DocumentAdd, 
  Setting, 
  Search, 
  Star, 
  Warning, 
  View, 
  Paperclip, 
  MoreFilled,
  Upload,
  Document
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  groupData: {
    type: Object,
    required: true
  },
  courseType: {
    type: String,
    required: true,
    validator: (value) => ['my-courses', 'my-teachings'].includes(value)
  }
});

// Emits
const emit = defineEmits([
  'announcement-create',
  'announcement-edit',
  'announcement-delete'
]);

// Vuex store
const store = useStore();

// 响应式数据
const announcements = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const activeFilter = ref('all');
const selectedAnnouncements = ref([]);
const batchMode = ref(false);
const saving = ref(false);

// 对话框状态
const isAnnouncementDialogVisible = ref(false);
const isDetailDialogVisible = ref(false);
const selectedAnnouncementDetail = ref(null);
const editingAnnouncement = ref(null);

// 表单引用和数据
const announcementFormRef = ref();
const announcementForm = ref({
  title: '',
  category: '',
  content: '',
  attachments: []
});

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 是否为教师（管理员）
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 公告筛选选项
const announcementFilters = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' }
];

// 公告分类选项
const categoryOptions = [
  { value: 'notice', label: '通知公告' },
  { value: 'task', label: '任务安排' },
  { value: 'exam', label: '考试信息' },
  { value: 'activity', label: '活动通知' },
  { value: 'other', label: '其他' }
];

// 表单验证规则
const announcementRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择公告分类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { min: 5, max: 1000, message: '内容长度在 5 到 1000 个字符', trigger: 'blur' }
  ]
};

// 模拟公告数据
const mockAnnouncements = [
  {
    id: 1,
    title: '期中考试安排通知',
    content: '各位同学，期中考试将于下周三进行，请大家做好复习准备。考试时间：上午9:00-11:00，地点：教学楼A201。考试内容涵盖前八章的所有知识点，请大家认真复习。',
    author: '张教授',
    publishDate: new Date('2024-10-06'),
    category: 'exam',
    isRead: false,
    readCount: 25,
    attachments: [
      { id: 1, name: '考试大纲.pdf', size: 1024000 }
    ]
  },
  {
    id: 2,
    title: '实验报告提交提醒',
    content: '请各位同学按时提交本周的实验报告，截止时间为本周日晚上11:59。报告格式请参考附件中的模板。',
    author: '李老师',
    publishDate: new Date('2024-10-05'),
    category: 'task',
    isRead: true,
    readCount: 18,
    attachments: []
  },
  {
    id: 3,
    title: '小组活动安排',
    content: '本周六下午2:00将举行小组研讨活动，地点在图书馆讨论室，请大家准时参加。',
    author: '王助教',
    publishDate: new Date('2024-10-01'),
    category: 'activity',
    isRead: true,
    readCount: 12,
    attachments: []
  },
  {
    id: 4,
    title: '课程资料更新',
    content: '第五章的课件已经上传到系统，请同学们及时下载学习。',
    author: '张教授',
    publishDate: new Date('2024-09-28'),
    category: 'notice',
    isRead: true,
    readCount: 30,
    attachments: []
  },
  {
    id: 5,
    title: '作业提交说明',
    content: '请注意作业提交格式和命名规范，详见附件中的说明文档。',
    author: '李老师',
    publishDate: new Date('2024-09-20'),
    category: 'task',
    isRead: true,
    readCount: 22,
    attachments: []
  }
];

// 计算属性
const filteredAnnouncements = computed(() => {
  let filtered = announcements.value;

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(announcement => 
      announcement.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 日期过滤
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(announcement => {
      const publishDate = new Date(announcement.publishDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      switch (activeFilter.value) {
        case 'today':
          return publishDate >= today;
        case 'week':
          return publishDate >= weekStart;
        case 'month':
          return publishDate >= monthStart;
        default:
          return true;
      }
    });
  }

  // 按发布时间排序
  return filtered.sort((a, b) => {
    return new Date(b.publishDate) - new Date(a.publishDate); // 新的排在前面
  });
});

// 是否全选
const isAllSelected = computed(() => {
  return filteredAnnouncements.value.length > 0 && 
         selectedAnnouncements.value.length === filteredAnnouncements.value.length;
});

// 按日期分组的公告
const groupedAnnouncements = computed(() => {
  const groups = {};
  
  filteredAnnouncements.value.forEach(announcement => {
    const dateKey = getDateGroup(announcement.publishDate);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: getDateGroupLabel(announcement.publishDate),
        announcements: []
      };
    }
    groups[dateKey].announcements.push(announcement);
  });
  
  return groups;
});

// 方法
const loadAnnouncements = async () => {
  loading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    announcements.value = mockAnnouncements;
    loading.value = false;
  }, 500);
};

const getFilterCount = (filterKey) => {
  if (filterKey === 'all') return announcements.value.length;
  
  return announcements.value.filter(announcement => {
    const publishDate = new Date(announcement.publishDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (filterKey) {
      case 'today':
        return publishDate >= today;
      case 'week':
        return publishDate >= weekStart;
      case 'month':
        return publishDate >= monthStart;
      default:
        return true;
    }
  }).length;
};

const getCategoryText = (category) => {
  const categoryMap = {
    'notice': '通知公告',
    'task': '任务安排',
    'exam': '考试信息',
    'activity': '活动通知',
    'other': '其他'
  };
  return categoryMap[category] || category;
};

const getPreviewText = (content) => {
  return content.length > 80 ? content.substring(0, 80) + '...' : content;
};

const formatDate = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN');
};

const formatDateTime = (date) => {
  if (!date) return '';
  return date.toLocaleString('zh-CN');
};

const formatFileSize = (size) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

const getEmptyMessage = () => {
  if (searchQuery.value) {
    return '没有找到匹配的公告';
  }
  if (activeFilter.value !== 'all') {
    return '该时间段内暂无公告';
  }
  return '还没有发布公告';
};

const getDateGroup = (date) => {
  const publishDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (publishDate >= today) {
    return 'today';
  } else if (publishDate >= yesterday) {
    return 'yesterday';
  } else {
    // 按周分组
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    if (publishDate >= weekStart) {
      return 'thisWeek';
    }
    
    // 按月分组
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (publishDate >= monthStart) {
      return 'thisMonth';
    }
    
    // 更早的按月份分组
    return `${publishDate.getFullYear()}-${publishDate.getMonth() + 1}`;
  }
};

const getDateGroupLabel = (date) => {
  const publishDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (publishDate >= today) {
    return '今天';
  } else if (publishDate >= yesterday) {
    return '昨天';
  } else {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    if (publishDate >= weekStart) {
      return '本周早些时候';
    }
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (publishDate >= monthStart) {
      return '本月早些时候';
    }
    
    // 更早的显示具体月份
    const year = publishDate.getFullYear();
    const month = publishDate.getMonth() + 1;
    if (year === now.getFullYear()) {
      return `${month}月`;
    } else {
      return `${year}年${month}月`;
    }
  }
};

// 事件处理
const handleCreateAnnouncement = () => {
  editingAnnouncement.value = null;
  announcementForm.value = {
    title: '',
    category: '',
    content: '',
    attachments: []
  };
  isAnnouncementDialogVisible.value = true;
};

const handleBatchManage = () => {
  batchMode.value = !batchMode.value;
  selectedAnnouncements.value = [];
};

const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedAnnouncements.value = [];
  } else {
    selectedAnnouncements.value = filteredAnnouncements.value.map(announcement => announcement.id);
  }
};

const handleAnnouncementClick = (announcement) => {
  selectedAnnouncementDetail.value = announcement;
  isDetailDialogVisible.value = true;
  
  // 标记为已读（仅学生）
  if (!isTeacher.value && !announcement.isRead) {
    announcement.isRead = true;
  }
};

const handleAnnouncementAction = ({ action, announcement }) => {
  console.log('Announcement action:', action, announcement);
  
  switch (action) {
    case 'edit':
      editingAnnouncement.value = announcement;
      announcementForm.value = {
        title: announcement.title,
        category: announcement.category,
        content: announcement.content,
        attachments: [...(announcement.attachments || [])]
      };
      isAnnouncementDialogVisible.value = true;
      break;
    case 'delete':
      handleDeleteAnnouncement(announcement);
      break;
    case 'stats':
      // TODO: 显示统计信息
      break;
  }
};

const handleDeleteAnnouncement = (announcement) => {
  ElMessageBox.confirm(
    '确定要删除这条公告吗？删除后无法恢复。',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    const index = announcements.value.findIndex(item => item.id === announcement.id);
    if (index > -1) {
      announcements.value.splice(index, 1);
      ElMessage.success('公告已删除');
      emit('announcement-delete', announcement);
    }
  }).catch(() => {
    // 取消删除
  });
};

const handleBatchDelete = () => {
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedAnnouncements.value.length} 条公告吗？`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    announcements.value = announcements.value.filter(
      announcement => !selectedAnnouncements.value.includes(announcement.id)
    );
    ElMessage.success(`已删除 ${selectedAnnouncements.value.length} 条公告`);
    selectedAnnouncements.value = [];
  });
};

const cancelBatchMode = () => {
  batchMode.value = false;
  selectedAnnouncements.value = [];
};

const handleFileChange = (file, fileList) => {
  announcementForm.value.attachments = fileList;
};

const handleFileRemove = (file, fileList) => {
  announcementForm.value.attachments = fileList;
};

const handleDownloadAttachment = (attachment) => {
  // TODO: 实现文件下载
  console.log('Download attachment:', attachment);
  ElMessage.info('文件下载功能待实现');
};

const handleSaveAnnouncement = async () => {
  if (!announcementFormRef.value) return;
  
  try {
    await announcementFormRef.value.validate();
    
    saving.value = true;
    
    // 模拟API调用
    setTimeout(() => {
      if (editingAnnouncement.value) {
        // 编辑现有公告
        Object.assign(editingAnnouncement.value, {
          ...announcementForm.value,
          publishDate: new Date() // 更新发布时间
        });
        ElMessage.success('公告已更新');
        emit('announcement-edit', editingAnnouncement.value);
      } else {
        // 创建新公告
        const newAnnouncement = {
          id: Date.now(),
          ...announcementForm.value,
          author: '当前用户',
          publishDate: new Date(),
          isRead: true, // 发布者默认已读
          readCount: 0
        };
        announcements.value.unshift(newAnnouncement);
        ElMessage.success('公告发布成功');
        emit('announcement-create', newAnnouncement);
      }
      
      saving.value = false;
      isAnnouncementDialogVisible.value = false;
    }, 1000);
  } catch (error) {
    console.error('Form validation failed:', error);
  }
};

onMounted(() => {
  loadAnnouncements();
});
</script>

<style scoped>
/* 继承之前组件的基础样式，这里只定义公告特有的样式 */
.group-announcements {
  width: 100%;
  padding: 20px 0;
}

/* 头部样式 */
.announcements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .announcements-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.announcements-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .announcements-title {
  color: #ffffff;
}

.announcements-count {
  font-size: 14px;
  color: #6b7280;
  background-color: rgba(107, 114, 128, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.theme-dark .announcements-count {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选区域样式 */
.announcements-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.search-container {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #8B8B8B;
  font-size: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  font-size: 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background-color: #ffffff;
  transition: all 0.3s ease;
  outline: none;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.theme-dark .search-input {
  background-color: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.theme-dark .search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  font-size: 14px;
}

.filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.08);
  color: #667eea;
}

.filter-tab.active {
  background-color: #667eea;
  color: white;
}

.theme-dark .filter-tab {
  background-color: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
}

.theme-dark .filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.15);
  color: #8fa4f3;
}

.filter-count {
  font-size: 12px;
  opacity: 0.8;
}

/* 公告列表样式 */
.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .date-group-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.date-group-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #6b7280;
}

.theme-dark .date-group-title {
  color: #9ca3af;
}

.date-group-count {
  font-size: 12px;
  color: #9ca3af;
}

.announcement-card {
  display: flex;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.announcement-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* 移除未读的左侧边框样式 */

.announcement-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.02);
}

.theme-dark .announcement-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .announcement-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .announcement-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.announcement-checkbox {
  padding: 20px 0 20px 20px;
  display: flex;
  align-items: flex-start;
}

.announcement-badges {
  position: absolute;
  top: 16px;
  right: 60px;
  display: flex;
  gap: 6px;
  z-index: 1;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.theme-dark .unread-dot {
  border-color: rgba(40, 40, 40, 0.8);
}

.announcement-content {
  flex: 1;
  padding: 20px;
  cursor: pointer;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.announcement-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}

.announcement-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.2;
}

.theme-dark .announcement-title {
  color: #ffffff;
}

.announcement-category-tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
}



.announcement-preview {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.theme-dark .announcement-preview {
  color: #e5e7eb;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.announcement-stats {
  display: flex;
  gap: 16px;
}

.announcement-date {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.theme-dark .announcement-date {
  color: #9ca3af;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.theme-dark .stat-item {
  color: #9ca3af;
}

.category-notice {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.category-task {
  background-color: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.category-exam {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.category-activity {
  background-color: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.category-other {
  background-color: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.announcement-actions {
  padding: 20px 20px 20px 0;
  display: flex;
  align-items: flex-start;
}

.action-btn {
  padding: 8px;
  color: #6b7280;
}

.action-btn:hover {
  color: #667eea;
}

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-message {
  font-size: 16px;
  color: #8a8a8a;
  margin: 0 0 16px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-left-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #8a8a8a;
  margin: 0;
}

/* 批量操作栏 */
.batch-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
}

.theme-dark .batch-actions {
  background: rgba(40, 40, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.batch-info {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.theme-dark .batch-info {
  color: #e5e7eb;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

/* 对话框样式 */
.announcement-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.announcement-settings {
  display: flex;
  gap: 20px;
}

.announcement-upload {
  width: 100%;
}

.upload-tip {
  font-size: 12px;
  color: #8a8a8a;
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}

/* 详情对话框 */
.announcement-detail {
  padding: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .detail-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.4;
}

.theme-dark .detail-title {
  color: #ffffff;
}

.detail-badges {
  display: flex;
  gap: 8px;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.theme-dark .detail-meta {
  background: rgba(255, 255, 255, 0.03);
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

.detail-content {
  margin-bottom: 20px;
}

.content-text {
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
}

.theme-dark .content-text {
  color: #e5e7eb;
}

.detail-attachments {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 20px;
}

.theme-dark .detail-attachments {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.attachments-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.theme-dark .attachments-title {
  color: #ffffff;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.attachment-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.theme-dark .attachment-item {
  background: rgba(255, 255, 255, 0.03);
}

.theme-dark .attachment-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.attachment-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.theme-dark .attachment-name {
  color: #e5e7eb;
}

.attachment-size {
  font-size: 12px;
  color: #9ca3af;
}

/* Element Plus 样式覆盖 */
:deep(.el-dropdown-menu__item.danger-item) {
  color: #dc2626;
}

:deep(.el-dropdown-menu__item.danger-item:hover) {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .announcements-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .header-info {
    justify-content: space-between;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .announcements-filters {
    gap: 12px;
  }
  
  .search-container {
    max-width: none;
  }
  
  .announcement-card {
    flex-direction: column;
  }
  
  .announcement-badges {
    position: static;
    margin-bottom: 8px;
  }
  
  .announcement-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .announcement-meta {
    align-items: flex-start;
  }
  
  .detail-meta {
    grid-template-columns: 1fr;
  }
  
  .batch-actions {
    left: 16px;
    right: 16px;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .batch-buttons {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .announcement-content {
    padding: 16px;
  }
  
  .announcement-actions {
    padding: 16px 16px 16px 0;
  }
}
</style>