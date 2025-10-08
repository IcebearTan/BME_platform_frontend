<template>
  <div class="task-list-container" :class="{ 'theme-dark': isDarkMode }">
    <!-- 搜索和筛选 -->
    <div class="tasks-filters">
      <div class="search-container">
        <el-icon class="search-icon">
          <Search />
        </el-icon>
        <input 
          v-model="searchQuery"
          type="text" 
          class="search-input"
          placeholder="搜索任务单标题或内容..."
        />
      </div>
      
      <div class="filter-section">
        <!-- 截止时间筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">按截止时间：</span>
          <div class="filter-tabs">
            <div 
              v-for="filter in taskFilters"
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
        
        <!-- 类型筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">类型筛选：</span>
          <div class="filter-tabs">
            <div 
              v-for="typeFilter in taskTypeFilters"
              :key="typeFilter.key"
              class="filter-tab"
              :class="{ 'active': activeTypeFilter === typeFilter.key }"
              @click="activeTypeFilter = typeFilter.key"
            >
              <span class="filter-label">{{ typeFilter.label }}</span>
              <span class="filter-count">({{ getTypeFilterCount(typeFilter.key) }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-list" v-if="filteredTasks.length > 0">
      <div 
        v-for="(group, groupKey) in groupedTasks"
        :key="groupKey"
        class="date-group"
      >
        <!-- 日期分组标题 -->
        <div class="date-group-header">
          <h4 class="date-group-title">{{ group.label }}</h4>
          <div class="date-group-count">{{ group.tasks.length }} 个任务</div>
        </div>
        
        <!-- 该日期组的任务 -->
        <div 
          v-for="task in group.tasks" 
          :key="task.id"
          class="task-card"
          :class="{ 
            'selected': selectedTasks.includes(task.id),
            'overdue': isOverdue(task)
          }"
        >
          <!-- 选择框（仅管理员批量模式可见） -->
          <div v-if="isTeacher && batchMode" class="task-checkbox">
            <el-checkbox 
              :model-value="selectedTasks.includes(task.id)"
              @change="handleTaskSelection(task.id, $event)"
              :label="task.id"
            />
          </div>

          <!-- 任务状态指示器 -->
          <div class="task-status-indicator" :class="`status-${getTaskActualStatus(task)}`"></div>

          <!-- 任务内容 -->
          <div class="task-content" @click="handleTaskClick(task)">
            <div class="task-header">
              <div class="task-title-row">
                <h4 class="task-title">{{ task.title }}</h4>
                <span class="task-type-badge" :class="`type-${task.type}`">
                  {{ getTaskTypeText(task.type) }}
                </span>
              </div>
            </div>
            
            <div class="task-description" v-if="task.description">
              {{ getPreviewText(task.description) }}
            </div>
            
            <div class="task-footer">
              <div class="task-info">
                <div class="task-deadline">
                  <el-icon><Clock /></el-icon>
                  <span>
                    截止：{{ formatDueDate(task.dueDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作菜单（仅管理员可见） -->
          <div v-if="isTeacher" class="task-actions">
            <el-dropdown trigger="click" @command="handleTaskAction">
              <el-button type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', task }">编辑任务</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'duplicate', task }">复制任务</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'stats', task }">查看统计</el-dropdown-item>
                  <el-dropdown-item 
                    :command="{ action: 'delete', task }"
                    class="danger-item"
                  >
                    删除任务
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 学生操作区域 -->
          <div v-else class="student-actions">
            <div class="action-section">
              <!-- 状态显示 -->
              <div class="task-status">
                <span class="status-tag" :class="`status-${getTaskActualStatus(task)}`">
                  {{ getStatusText(getTaskActualStatus(task)) }}
                </span>
              </div>
              
              <!-- 操作按钮 -->
              <div class="action-buttons">
                <template v-if="task.type === 'exercise'">
                  <!-- 题目任务单：解题按钮 -->
                  <el-button 
                    v-if="getTaskActualStatus(task) !== 'completed'"
                    :type="getTaskActualStatus(task) === 'overdue' ? 'danger' : 'primary'"
                    @click.stop="handleSolveExercise(task)"
                  >
                    <el-icon><EditPen /></el-icon>
                    {{ getTaskActualStatus(task) === 'overdue' ? '补做题目' : '开始解题' }}
                  </el-button>
                </template>
                
                <template v-else>
                  <!-- 自定义任务单：提交按钮 -->
                  <el-button 
                    v-if="getTaskActualStatus(task) !== 'completed'"
                    :type="getTaskActualStatus(task) === 'overdue' ? 'danger' : 'primary'"
                    @click.stop="handleSubmitTask(task)"
                  >
                    <el-icon><Upload /></el-icon>
                    {{ getTaskActualStatus(task) === 'overdue' ? '补交任务' : '提交任务' }}
                  </el-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
      <div v-if="isTeacher" class="empty-actions">
        <el-button type="primary" @click="$emit('create-task', 'custom')">
          创建自定义任务
        </el-button>
        <el-button type="success" @click="$emit('create-task', 'exercise')">
          创建题目
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载任务中...</p>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="isTeacher && batchMode" class="batch-actions">
      <div class="batch-info">
        已选择 {{ selectedTasks.length }} 个任务
      </div>
      <div class="batch-buttons">
        <el-button size="small" @click="handleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete" :disabled="selectedTasks.length === 0">
          批量删除
        </el-button>
        <el-button size="small" @click="$emit('cancel-batch-mode')">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  Search, 
  Clock,
  MoreFilled,
  EditPen,
  Upload
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  tasks: {
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
  selectedTasks: {
    type: Array,
    default: () => []
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  // 配置化选项
  showSubmitAction: {
    type: Boolean,
    default: true
  },
  showDetailAction: {
    type: Boolean,
    default: true
  },
  itemType: {
    type: String,
    default: 'task',
    validator: (value) => ['task', 'announcement'].includes(value)
  }
});

// Emits
const emit = defineEmits([
  'update:selectedTasks',
  'task-click',
  'task-action',
  'solve-exercise',
  'submit-task',
  'task-submitted', // 新增：任务提交完成事件
  'create-task',
  'cancel-batch-mode',
  'batch-delete',
  'select-all'
]);

// 响应式数据
const searchQuery = ref('');
const activeFilter = ref('all');
const activeTypeFilter = ref('all');

// 筛选选项
const taskFilters = [
  { key: 'all', label: '全部任务' },
  { key: 'today', label: '今日截止' },
  { key: 'tomorrow', label: '明日截止' },
  { key: 'week', label: '本周截止' },
  { key: 'overdue', label: '已逾期' },
  { key: 'no_due', label: '无截止时间' }
];

const taskTypeFilters = [
  { key: 'all', label: '全部类型' },
  { key: 'exercise', label: '题目' },
  { key: 'custom', label: '自定义任务' }
];

// 计算属性
const filteredTasks = computed(() => {
  let filtered = props.tasks;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(task => 
      task.title?.toLowerCase().includes(query) || 
      task.description?.toLowerCase().includes(query)
    );
  }

  // 截止时间过滤
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(task => matchesTimeFilter(task, activeFilter.value));
  }

  // 类型过滤
  if (activeTypeFilter.value !== 'all') {
    filtered = filtered.filter(task => task.type === activeTypeFilter.value);
  }

  return filtered;
});

const groupedTasks = computed(() => {
  const groups = {};
  
  filteredTasks.value.forEach(task => {
    const dateKey = getDateGroupKey(task.createDate);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: getDateGroupLabel(task.createDate),
        tasks: []
      };
    }
    groups[dateKey].tasks.push(task);
  });

  // 按日期排序（最新的布置时间在前）
  return Object.keys(groups)
    .sort((a, b) => new Date(b) - new Date(a))
    .reduce((sorted, key) => {
      sorted[key] = groups[key];
      return sorted;
    }, {});
});

const isAllSelected = computed(() => {
  return filteredTasks.value.length > 0 && 
         filteredTasks.value.every(task => props.selectedTasks.includes(task.id));
});

// 工具方法
const matchesTimeFilter = (task, filter) => {
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  
  switch (filter) {
    case 'today':
      return dueDate.toDateString() === now.toDateString();
    case 'tomorrow':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate.toDateString() === tomorrow.toDateString();
    case 'week':
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      return dueDate >= now && dueDate <= weekLater;
    case 'overdue':
      return dueDate < now && task.status !== 'completed';
    case 'no_due':
      return !task.dueDate;
    default:
      return true;
  }
};

const getDateGroupKey = (createDate) => {
  if (!createDate) return 'no_create_date';
  return new Date(createDate).toDateString();
};

const getDateGroupLabel = (createDate) => {
  if (!createDate) return '未知布置时间';
  
  const date = new Date(createDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}年${month}月${day}日`;
};

const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date();
};

const getTaskActualStatus = (task) => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue(task)) return 'overdue';
  return 'pending';
};

const getTaskTypeText = (type) => {
  return type === 'exercise' ? '题目' : '自定义任务';
};

const getStatusText = (status) => {
  const statusMap = {
    pending: '未完成',
    completed: '已完成',
    overdue: '已逾期'
  };
  return statusMap[status] || '未知状态';
};

const getPreviewText = (text) => {
  if (!text) return '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

const formatDueDate = (dateStr) => {
  if (!dateStr) return '无截止时间';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const getFilterCount = (filterKey) => {
  return props.tasks.filter(task => 
    filterKey === 'all' || matchesTimeFilter(task, filterKey)
  ).length;
};

const getTypeFilterCount = (typeKey) => {
  return props.tasks.filter(task => 
    typeKey === 'all' || task.type === typeKey
  ).length;
};

const getEmptyMessage = () => {
  if (searchQuery.value) {
    return '没有找到匹配的任务';
  }
  if (activeFilter.value !== 'all') {
    return '该状态下暂无任务';
  }
  if (activeTypeFilter.value !== 'all') {
    const typeText = activeTypeFilter.value === 'exercise' ? '题目任务' : '自定义任务';
    return `暂无${typeText}`;
  }
  return '还没有布置任务';
};

// 事件处理
const handleTaskSelection = (taskId, checked) => {
  let newSelectedTasks = [...props.selectedTasks];
  
  if (checked) {
    if (!newSelectedTasks.includes(taskId)) {
      newSelectedTasks.push(taskId);
    }
  } else {
    newSelectedTasks = newSelectedTasks.filter(id => id !== taskId);
  }
  
  emit('update:selectedTasks', newSelectedTasks);
};

const handleTaskClick = (task) => {
  emit('task-click', task);
};

const handleTaskAction = (command) => {
  emit('task-action', command);
};

const handleSolveExercise = (task) => {
  emit('solve-exercise', task);
};

const handleSubmitTask = (task) => {
  // 向父组件发射事件
  emit('submit-task', task);
};

const handleSelectAll = () => {
  let newSelectedTasks;
  
  if (isAllSelected.value) {
    // 取消全选
    newSelectedTasks = [];
  } else {
    // 全选
    newSelectedTasks = filteredTasks.value.map(task => task.id);
  }
  
  emit('update:selectedTasks', newSelectedTasks);
  emit('select-all');
};

const handleBatchDelete = () => {
  emit('batch-delete');
};

</script>

<style scoped>
.task-list-container {
  width: 100%;
}

/* 筛选区域样式 */
.tasks-filters {
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

/* 任务列表样式 */
.tasks-list {
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

.task-card {
  display: flex;
  align-items: flex-start;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.task-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.task-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.02);
}

.theme-dark .task-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .task-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .task-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.task-checkbox {
  padding: 20px 0 20px 20px;
  display: flex;
  align-items: flex-start;
}

.task-status-indicator {
  width: 4px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.status-pending {
  background-color: #f59e0b;
}

.status-in_progress {
  background-color: #3b82f6;
}

.status-completed {
  background-color: #10b981;
}

.status-overdue {
  background-color: #ef4444;
}

.task-content {
  flex: 1;
  padding: 20px;
  cursor: pointer;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.task-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  line-height: 1.2;
}

.task-type-badge {
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

.theme-dark .task-title {
  color: #ffffff;
}

.task-description {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.theme-dark .task-description {
  color: #e5e7eb;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-top: 12px;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-deadline {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.task-deadline .el-icon {
  font-size: 14px;
}

.overdue-text {
  color: #ef4444 !important;
}

.theme-dark .task-deadline {
  color: #9ca3af;
}

.status-tag {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.status-tag.status-pending {
  background-color: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-tag.status-in_progress {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.status-tag.status-completed {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-tag.status-overdue {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.task-actions {
  padding: 20px 20px 20px 0;
  display: flex;
  align-items: flex-start;
}

.student-actions {
  padding: 20px 20px 20px 0;
  display: flex;
  align-items: flex-start;
}

.action-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .filter-section {
    gap: 12px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .filter-group-label {
    min-width: auto;
    font-size: 12px;
  }
  
  .task-card {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
  }
  
  .task-content {
    width: 100%;
    padding: 16px;
  }
  
  .student-actions {
    padding: 16px;
    width: 100%;
  }
  
  .action-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .batch-actions {
    position: static;
    transform: none;
    margin: 20px 0;
    flex-direction: column;
    gap: 12px;
  }
}


</style>