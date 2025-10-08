<template>
  <div class="announcement-list-container" :class="{ 'theme-dark': isDarkMode }">
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
      
      <div class="filter-section">
        <!-- 已读状态筛选 -->
        <div class="filter-group" v-if="!isTeacher">
          <span class="filter-group-label">按阅读状态：</span>
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
        
        <!-- 分类筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">分类筛选：</span>
          <div class="filter-tabs">
            <div 
              v-for="categoryFilter in categoryFilters"
              :key="categoryFilter.key"
              class="filter-tab"
              :class="{ 'active': activeCategoryFilter === categoryFilter.key }"
              @click="activeCategoryFilter = categoryFilter.key"
            >
              <span class="filter-label">{{ categoryFilter.label }}</span>
              <span class="filter-count">({{ getCategoryFilterCount(categoryFilter.key) }})</span>
            </div>
          </div>
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
              :model-value="selectedAnnouncements.includes(announcement.id)"
              @change="handleAnnouncementSelection(announcement.id, $event)"
              :label="announcement.id"
            />
          </div>

          <!-- 未读状态指示器 -->
          <div v-if="!announcement.isRead && !isTeacher" class="unread-indicator"></div>

          <!-- 公告内容 -->
          <div class="announcement-content" @click="handleAnnouncementClick(announcement)">
            <div class="announcement-header">
              <div class="announcement-title-row">
                <h4 class="announcement-title">{{ announcement.title }}</h4>
                <span class="announcement-category-badge" :class="`category-${announcement.category}`">
                  {{ getCategoryText(announcement.category) }}
                </span>
              </div>
            </div>
            
            <div class="announcement-preview" v-if="announcement.content">
              {{ getPreviewText(announcement.content) }}
            </div>
            
            <div class="announcement-footer">
              <div class="announcement-info">
                <div class="announcement-date">
                  {{ formatDate(announcement.publishDate) }}
                </div>
              </div>
              
              <div class="announcement-meta">
                <div class="meta-left">
                  <div class="meta-item">
                    <el-icon><View /></el-icon>
                    <span>{{ announcement.readCount || 0 }}</span>
                  </div>
                  <div class="meta-item" v-if="announcement.attachments?.length > 0">
                    <el-icon><Paperclip /></el-icon>
                    <span>{{ announcement.attachments.length }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 学生操作区域 -->
          <div v-if="!isTeacher" class="student-actions">
            <div class="action-section">
              <div class="announcement-status">
                <span class="status-tag" :class="`status-${announcement.isRead ? 'read' : 'unread'}`">
                  {{ announcement.isRead ? '已读' : '未读' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 管理员操作区域 -->
          <div v-if="isTeacher" class="announcement-actions">
            <el-dropdown trigger="click" @command="handleAnnouncementAction">
              <el-button type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', announcement }">
                    <el-icon><EditPen /></el-icon>
                    编辑公告
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'duplicate', announcement }">
                    <el-icon><DocumentCopy /></el-icon>
                    复制公告
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'stats', announcement }">
                    <el-icon><TrendCharts /></el-icon>
                    查看统计
                  </el-dropdown-item>
                  <el-dropdown-item 
                    :command="{ action: 'delete', announcement }"
                    class="danger-item"
                  >
                    <el-icon><Delete /></el-icon>
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
      <div class="empty-actions" v-if="isTeacher">
        <el-button type="primary" @click="emit('create-announcement')">
          <el-icon><DocumentAdd /></el-icon>
          发布第一条公告
        </el-button>
      </div>
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
        <el-button size="small" @click="emit('cancel-batch-mode')">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Search, 
  View, 
  Paperclip, 
  MoreFilled,
  EditPen,
  DocumentCopy,
  TrendCharts,
  Delete,
  DocumentAdd
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  announcements: {
    type: Array,
    default: () => []
  },
  isTeacher: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  batchMode: {
    type: Boolean,
    default: false
  },
  selectedAnnouncements: {
    type: Array,
    default: () => []
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'announcement-click',
  'announcement-action',
  'create-announcement',
  'cancel-batch-mode',
  'batch-delete',
  'select-all',
  'update:selected-announcements'
]);

// 响应式数据
const searchQuery = ref('');
const activeFilter = ref('all');
const activeCategoryFilter = ref('all');

// 筛选选项
const announcementFilters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' }
];

const categoryFilters = [
  { key: 'all', label: '全部分类' },
  { key: 'notice', label: '通知公告' },
  { key: 'task', label: '任务安排' },
  { key: 'exam', label: '考试信息' },
  { key: 'activity', label: '活动通知' },
  { key: 'other', label: '其他' }
];

// 计算属性
const filteredAnnouncements = computed(() => {
  let filtered = props.announcements;

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(announcement => 
      announcement.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 已读状态过滤
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(announcement => {
      switch (activeFilter.value) {
        case 'unread':
          return !announcement.isRead;
        case 'read':
          return announcement.isRead;
        default:
          return true;
      }
    });
  }

  // 分类过滤
  if (activeCategoryFilter.value !== 'all') {
    filtered = filtered.filter(announcement => 
      announcement.category === activeCategoryFilter.value
    );
  }

  // 按发布时间排序
  return filtered.sort((a, b) => {
    return new Date(b.publishDate) - new Date(a.publishDate);
  });
});

// 按已读状态分组的公告
const groupedAnnouncements = computed(() => {
  const groups = {};
  
  // 如果是学生且没有应用筛选，按已读状态分组
  if (!props.isTeacher && activeFilter.value === 'all' && activeCategoryFilter.value === 'all') {
    const unreadAnnouncements = filteredAnnouncements.value.filter(a => !a.isRead);
    const readAnnouncements = filteredAnnouncements.value.filter(a => a.isRead);
    
    if (unreadAnnouncements.length > 0) {
      groups['unread'] = {
        label: '未读公告',
        announcements: unreadAnnouncements.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      };
    }
    
    if (readAnnouncements.length > 0) {
      groups['read'] = {
        label: '已读公告',
        announcements: readAnnouncements.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      };
    }
  } else {
    // 其他情况显示为单一分组
    if (filteredAnnouncements.value.length > 0) {
      groups['all'] = {
        label: '全部公告',
        announcements: filteredAnnouncements.value.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      };
    }
  }
  
  return groups;
});

// 是否全选
const isAllSelected = computed(() => {
  return filteredAnnouncements.value.length > 0 && 
         props.selectedAnnouncements.length === filteredAnnouncements.value.length;
});

// 方法
const getFilterCount = (filterKey) => {
  if (filterKey === 'all') return props.announcements.length;
  
  return props.announcements.filter(announcement => {
    switch (filterKey) {
      case 'unread':
        return !announcement.isRead;
      case 'read':
        return announcement.isRead;
      default:
        return true;
    }
  }).length;
};

const getCategoryFilterCount = (categoryKey) => {
  if (categoryKey === 'all') return props.announcements.length;
  return props.announcements.filter(announcement => announcement.category === categoryKey).length;
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

const getEmptyMessage = () => {
  if (searchQuery.value) {
    return '没有找到匹配的公告';
  }
  if (activeFilter.value === 'unread') {
    return '暂无未读公告';
  }
  if (activeFilter.value === 'read') {
    return '暂无已读公告';
  }
  if (activeCategoryFilter.value !== 'all') {
    return '该分类下暂无公告';
  }
  return '还没有发布公告';
};

// 事件处理
const handleAnnouncementClick = (announcement) => {
  emit('announcement-click', announcement);
};

const handleAnnouncementSelection = (announcementId, checked) => {
  let newSelected = [...props.selectedAnnouncements];
  if (checked) {
    if (!newSelected.includes(announcementId)) {
      newSelected.push(announcementId);
    }
  } else {
    newSelected = newSelected.filter(id => id !== announcementId);
  }
  emit('update:selected-announcements', newSelected);
};

const handleSelectAll = () => {
  if (isAllSelected.value) {
    emit('update:selected-announcements', []);
  } else {
    emit('update:selected-announcements', filteredAnnouncements.value.map(announcement => announcement.id));
  }
  emit('select-all');
};

const handleAnnouncementAction = ({ action, announcement }) => {
  emit('announcement-action', { action, announcement });
};

const handleBatchDelete = () => {
  emit('batch-delete');
};
</script>

<style scoped>
/* 基于TaskList的样式，适配公告组件 */
.announcement-list-container {
  width: 100%;
  padding: 0;
}

/* 筛选区域样式 */
.announcements-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
}

.theme-dark .filter-group-label {
  color: #9ca3af;
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
  align-items: flex-start;
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

.announcement-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.02);
}

.announcement-card.unread {
  border-left: 4px solid #ef4444;
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

.unread-indicator {
  width: 4px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: #ef4444;
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

.announcement-category-badge {
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

.category-notice {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.category-task {
  background-color: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.category-exam {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.category-activity {
  background-color: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.category-other {
  background-color: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.theme-dark .announcement-title {
  color: #ffffff;
}

.announcement-preview {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.theme-dark .announcement-preview {
  color: #e5e7eb;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-top: 12px;
}

.announcement-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  font-size: 11px;
  color: #9ca3af;
}

.info-label {
  font-weight: 500;
}

.info-value {
  color: #6b7280;
}

.announcement-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.theme-dark .info-item,
.theme-dark .info-value,
.theme-dark .announcement-date {
  color: #9ca3af;
}

.announcement-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.meta-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.theme-dark .meta-item {
  color: #9ca3af;
}

.student-actions {
  padding: 20px 24px 20px 0;
  display: flex;
  align-items: center;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.announcement-status {
  display: flex;
  justify-content: flex-end;
}

.status-tag {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.status-read {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-unread {
  background-color: rgba(245, 158, 11, 0.1);
  color: #d97706;
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

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
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
  .announcements-filters {
    gap: 12px;
  }
  
  .search-container {
    max-width: none;
  }
  
  .announcement-card {
    flex-direction: column;
  }
  
  .announcement-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .announcement-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .meta-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .student-actions {
    padding: 16px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .action-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 16px;
  }
  
  .theme-dark .student-actions {
    border-top-color: rgba(255, 255, 255, 0.1);
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