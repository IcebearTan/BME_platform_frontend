<template>
  <div class="group-members" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部操作区 -->
    <div class="members-header">
      <div class="header-info">
        <h3 class="members-title">{{ isTeacher ? '成员管理' : '成员列表' }}</h3>
        <div class="members-count">共 {{ filteredMembers.length }} 人</div>
      </div>
      
      <!-- 管理员操作 -->
      <div v-if="isTeacher" class="header-actions">
        <el-button type="primary" size="default" @click="handleAddMember">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
        <el-button type="default" size="default" @click="handleBatchManage">
          <el-icon><Setting /></el-icon>
          批量管理
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="members-filters">
      <div class="search-container">
        <el-icon class="search-icon">
          <Search />
        </el-icon>
        <input 
          v-model="searchQuery"
          type="text" 
          class="search-input"
          placeholder="搜索成员姓名或学号..."
        />
      </div>
      
      <div class="filter-tabs">
        <div 
          v-for="filter in memberFilters"
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

    <!-- 成员列表 -->
    <div class="members-list" v-if="filteredMembers.length > 0">
      <div 
        v-for="member in filteredMembers" 
        :key="member.id"
        class="member-card"
        :class="{ 'selected': selectedMembers.includes(member.id) }"
      >
        <!-- 选择框（仅管理员可见） -->
        <div v-if="isTeacher && batchMode" class="member-checkbox">
          <el-checkbox 
            v-model="selectedMembers"
            :label="member.id"
            @change="handleMemberSelect"
          />
        </div>

        <!-- 成员头像 -->
        <div class="member-avatar">
          <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
          <div v-else class="avatar-placeholder">
            {{ member.name?.charAt(0) || 'U' }}
          </div>
        </div>

        <!-- 成员信息 -->
        <div class="member-info">
          <div class="member-basic">
            <h4 class="member-name">{{ member.name }}</h4>
          </div>
          
          <div class="member-details">
            <div class="detail-item">
              <span class="detail-label">学号：</span>
              <span class="detail-value">{{ member.studentId || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">加入时间：</span>
              <span class="detail-value">{{ formatDate(member.joinDate) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作菜单（仅管理员可见） -->
        <div v-if="isTeacher" class="member-actions">
          <el-dropdown trigger="click" @command="handleMemberAction">
            <el-button type="text" class="action-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{ action: 'edit', member }">编辑信息</el-dropdown-item>
                <el-dropdown-item :command="{ action: 'viewProfile', member }">查看详情</el-dropdown-item>
                <el-dropdown-item 
                  :command="{ action: 'remove', member }"
                  class="danger-item"
                >
                  移除成员
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">👥</div>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
      <el-button v-if="isTeacher" type="primary" @click="handleAddMember">
        添加第一个成员
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载成员中...</p>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="isTeacher && batchMode" class="batch-actions">
      <div class="batch-info">
        已选择 {{ selectedMembers.length }} 个成员
      </div>
      <div class="batch-buttons">
        <el-button size="small" @click="handleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </el-button>
        <el-button size="small" type="danger" @click="handleBatchRemove" :disabled="selectedMembers.length === 0">
          批量移除
        </el-button>
        <el-button size="small" @click="cancelBatchMode">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { Plus, Setting, Search, MoreFilled } from '@element-plus/icons-vue';

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
  'member-add',
  'member-edit', 
  'member-remove',
  'member-role-change'
]);

// Vuex store
const store = useStore();

// 响应式数据
const members = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const activeFilter = ref('all');
const selectedMembers = ref([]);
const batchMode = ref(false);

// 主题适配
const isDarkMode = computed(() => store.getters.isDarkMode);

// 是否为教师（管理员）
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 是否全选
const isAllSelected = computed(() => {
  return filteredMembers.value.length > 0 && 
         selectedMembers.value.length === filteredMembers.value.length;
});

// 成员筛选选项
const memberFilters = [
  { key: 'all', label: '全部' }
];

// 模拟成员数据
const mockMembers = [
  {
    id: 1,
    name: '张三',
    studentId: '2021001',
    avatar: null,
    joinDate: new Date('2024-09-15')
  },
  {
    id: 2,
    name: '李四',
    studentId: '2021002', 
    avatar: null,
    joinDate: new Date('2024-09-16')
  },
  {
    id: 3,
    name: '王五',
    studentId: '2021003',
    avatar: null,
    joinDate: new Date('2024-09-15')
  },
  {
    id: 4,
    name: '赵六',
    studentId: '2021004',
    avatar: null,
    joinDate: new Date('2024-09-20')
  }
];

// 计算属性
const filteredMembers = computed(() => {
  let filtered = members.value;

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(member => 
      member.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      member.studentId?.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 状态过滤 (暂时保留all选项的逻辑)
  // 由于只有'all'选项，这里不需要额外过滤

  return filtered;
});

// 方法
const loadMembers = async () => {
  loading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    members.value = mockMembers;
    loading.value = false;
  }, 500);
};

const getFilterCount = (filterKey) => {
  if (filterKey === 'all') return members.value.length;
  return members.value.length;
};

// 移除角色和状态相关的辅助函数

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
    return '没有找到匹配的成员';
  }
  if (activeFilter.value !== 'all') {
    return '该分类下暂无成员';
  }
  return '还没有成员加入小组';
};

// 事件处理
const handleAddMember = () => {
  console.log('Add member');
  emit('member-add');
};

const handleBatchManage = () => {
  batchMode.value = !batchMode.value;
  selectedMembers.value = [];
};

const handleMemberSelect = () => {
  // 处理成员选择
};

const handleMemberAction = ({ action, member }) => {
  console.log('Member action:', action, member);
  
  switch (action) {
    case 'edit':
      emit('member-edit', member);
      break;
    case 'remove':
      emit('member-remove', member);
      break;
    case 'viewProfile':
      // TODO: 实现查看详情
      break;
  }
};

const handleBatchRemove = () => {
  console.log('Batch remove:', selectedMembers.value);
};

const handleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选
    selectedMembers.value = [];
  } else {
    // 全选当前过滤的成员
    selectedMembers.value = filteredMembers.value.map(member => member.id);
  }
};

const cancelBatchMode = () => {
  batchMode.value = false;
  selectedMembers.value = [];
};

onMounted(() => {
  loadMembers();
});
</script>

<style scoped>
.group-members {
  width: 100%;
  padding: 20px 0;
}

/* 头部样式 */
.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .members-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.members-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .members-title {
  color: #ffffff;
}

.members-count {
  font-size: 14px;
  color: #6b7280;
  background-color: rgba(107, 114, 128, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.theme-dark .members-count {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选区域样式 */
.members-filters {
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

/* 成员列表样式 */
.members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.member-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.member-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.02);
}

.theme-dark .member-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .member-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .member-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.member-checkbox {
  margin-right: 16px;
}

.member-avatar {
  width: 50px;
  height: 50px;
  margin-right: 16px;
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-basic {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .member-name {
  color: #ffffff;
}

/* 移除角色相关样式 */

.member-details {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.detail-label {
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  color: #374151;
}

.theme-dark .detail-label {
  color: #9ca3af;
}

.theme-dark .detail-value {
  color: #e5e7eb;
}

/* 移除状态相关样式 */

.member-actions {
  flex-shrink: 0;
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
  .members-header {
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
  
  .members-filters {
    gap: 12px;
  }
  
  .search-container {
    max-width: none;
  }
  
  .member-card {
    padding: 16px;
    flex-wrap: wrap;
  }
  
  .member-details {
    gap: 12px;
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
  .member-card {
    padding: 12px;
  }
  
  .member-avatar {
    width: 40px;
    height: 40px;
    margin-right: 12px;
  }
  
  .avatar-placeholder {
    font-size: 16px;
  }
  
  .member-basic {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .member-details {
    flex-direction: column;
    gap: 4px;
  }
}
</style>