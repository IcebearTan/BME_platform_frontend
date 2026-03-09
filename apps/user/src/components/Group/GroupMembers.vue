<template>
  <div class="group-members" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部操作区 -->
    <div class="members-header">
      <div class="header-info">
        <h3 class="members-title">{{ isTeacher ? '成员管理' : '成员列表' }}</h3>
        <div class="members-count" v-if="activeRequestTab === 'members'">共 {{ filteredMembers.length }} 人</div>
      </div>

      <!-- Tab 切换（仅老师可见） -->
      <div v-if="isTeacher" class="header-tabs">
        <div
          class="tab-item"
          :class="{ 'active': activeRequestTab === 'members' }"
          @click="activeRequestTab = 'members'"
        >
          成员列表
        </div>
        <div
          class="tab-item"
          :class="{ 'active': activeRequestTab === 'pending' }"
          @click="activeRequestTab = 'pending'; fetchJoinRequests()"
        >
          加入申请
          <el-badge :value="joinRequests.length" :hidden="joinRequests.length === 0" class="tab-badge" />
        </div>
      </div>
    </div>

    <!-- 成员列表视图 -->
    <template v-if="activeRequestTab === 'members'">
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
            <el-tag v-if="member.role === 'leader'" size="small" type="warning">组长</el-tag>
            <el-tag v-if="member.status === 'inactive'" size="small" type="info">已停用</el-tag>
          </div>

          <div class="member-details">
            <div class="detail-item">
              <span class="detail-label">学号：</span>
              <span class="detail-value">{{ member.student_id || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">加入时间：</span>
              <span class="detail-value">{{ member.join_date }}</span>
            </div>
            <div class="detail-item" v-if="member.completion_rate !== undefined">
              <span class="detail-label">完成率：</span>
              <span class="detail-value">{{ member.completion_rate }}%</span>
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
                <el-dropdown-item :command="{ action: 'setLeader', member }" v-if="member.role !== 'leader'">设为组长</el-dropdown-item>
                <el-dropdown-item :command="{ action: 'setMember', member }" v-if="member.role === 'leader'">取消组长</el-dropdown-item>
                <el-dropdown-item :command="{ action: 'setActive', member }" v-if="member.status === 'inactive'">启用成员</el-dropdown-item>
                <el-dropdown-item :command="{ action: 'setInactive', member }" v-if="member.status === 'active'">停用成员</el-dropdown-item>
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
    </template>

    <!-- 加入申请视图（仅老师可见） -->
    <template v-if="activeRequestTab === 'pending'">
      <div class="request-list" v-loading="joinRequestsLoading">
        <div v-if="joinRequests.length === 0" class="empty-requests">
          暂无待审核的加入申请
        </div>
        <div v-else v-for="request in joinRequests" :key="request.id" class="request-item">
          <div class="request-info">
            <div class="request-student">{{ request.student_name }}</div>
            <div class="request-reason">申请理由：{{ request.apply_reason || '无' }}</div>
            <div class="request-time">申请时间：{{ request.created_at }}</div>
          </div>
          <div class="request-actions">
            <el-button type="primary" size="small" @click="handleApproveRequest(request)">
              通过
            </el-button>
            <el-button type="danger" size="small" @click="handleRejectRequest(request)">
              拒绝
            </el-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { Search, MoreFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '../../api';

// Props
const props = defineProps({
  groupData: {
    type: Object,
    required: true
  },
  courseType: {
    type: String,
    required: true,
    validator: (value) => ['my-courses', 'my-teachings', 'all-groups'].includes(value)
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
  if (!props.groupData?.id) {
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/members`,
      method: 'get'
    });

    if (res.data && res.data.code === 200) {
      members.value = res.data.data || [];
    } else {
      members.value = [];
    }
  } catch (err) {
    console.error('获取成员列表失败:', err);
    members.value = [];
  } finally {
    loading.value = false;
  }
};

// 更新成员角色
const updateMemberRole = async (studentId, role) => {
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/members/${studentId}/role`,
      method: 'patch',
      data: { role }
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success(role === 'leader' ? '已设为组长' : '已取消组长');
      loadMembers(); // 刷新列表
    } else {
      ElMessage.error(res.data?.message || '操作失败');
    }
  } catch (err) {
    console.error('更新角色失败:', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

// 更新成员状态
const updateMemberStatus = async (studentId, status) => {
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/members/${studentId}/status`,
      method: 'patch',
      data: { status }
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success(status === 'active' ? '已启用成员' : '已停用成员');
      loadMembers(); // 刷新列表
    } else {
      ElMessage.error(res.data?.message || '操作失败');
    }
  } catch (err) {
    console.error('更新状态失败:', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

// 移除成员
const removeMember = async (studentId) => {
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/members/${studentId}`,
      method: 'delete'
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success('已移除成员');
      loadMembers(); // 刷新列表
    } else {
      ElMessage.error(res.data?.message || '操作失败');
    }
  } catch (err) {
    console.error('移除成员失败:', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

const getFilterCount = (filterKey) => {
  if (filterKey === 'all') return members.value.length;
  return members.value.length;
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

const handleMemberAction = async ({ action, member }) => {
  console.log('Member action:', action, member);

  switch (action) {
    case 'setLeader':
      await updateMemberRole(member.id, 'leader');
      break;
    case 'setMember':
      await updateMemberRole(member.id, 'member');
      break;
    case 'setActive':
      await updateMemberStatus(member.id, 'active');
      break;
    case 'setInactive':
      await updateMemberStatus(member.id, 'inactive');
      break;
    case 'remove':
      await removeMember(member.id);
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

// ========== 加入申请审核功能（仅老师）==========
const joinRequests = ref([]);
const joinRequestsLoading = ref(false);
const activeRequestTab = ref('members'); // members, pending

// 获取加入申请列表
const fetchJoinRequests = async () => {
  if (!isTeacher.value || !props.groupData?.id) return;

  joinRequestsLoading.value = true;
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/join-requests?status=pending`,
      method: 'get'
    });

    if (res.data && res.data.code === 200) {
      joinRequests.value = res.data.data || [];
    }
  } catch (err) {
    console.error('获取加入申请列表失败:', err);
  } finally {
    joinRequestsLoading.value = false;
  }
};

// 通过申请
const handleApproveRequest = async (request) => {
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/join-requests/${request.id}/approve`,
      method: 'post',
      data: { review_note: '审核通过' }
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success('已通过该学生的加入申请');
      fetchJoinRequests();
      loadMembers();
    } else {
      ElMessage.error(res.data?.message || '操作失败');
    }
  } catch (err) {
    console.error('通过申请失败:', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

// 拒绝申请
const handleRejectRequest = async (request) => {
  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/join-requests/${request.id}/reject`,
      method: 'post',
      data: { review_note: '审核拒绝' }
    });

    if (res.data && res.data.code === 200) {
      ElMessage.success('已拒绝该学生的加入申请');
      fetchJoinRequests();
    } else {
      ElMessage.error(res.data?.message || '操作失败');
    }
  } catch (err) {
    console.error('拒绝申请失败:', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

// 监听小组变化时重新加载
watch(() => props.groupData?.id, (newId) => {
  if (newId) {
    loadMembers();
    if (isTeacher.value) {
      fetchJoinRequests();
    }
  }
});

onMounted(() => {
  loadMembers();
  if (isTeacher.value) {
    fetchJoinRequests();
  }
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

/* Tab 切换样式 */
.header-tabs {
  display: flex;
  gap: 8px;
}

.tab-item {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
  position: relative;
}

.tab-item:hover {
  color: #667eea;
}

.tab-item.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  font-weight: 600;
}

.tab-badge {
  margin-left: 4px;
}

/* 加入申请列表样式 */
.request-list {
  padding: 16px 0;
  min-height: 100px;
}

.empty-requests {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 12px;
}

.theme-dark .request-item {
  background: rgba(255, 255, 255, 0.05);
}

.request-info {
  flex: 1;
}

.request-student {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 15px;
}

.theme-dark .request-student {
  color: #fff;
}

.request-reason {
  font-size: 13px;
  color: #666;
  margin-bottom: 2px;
}

.theme-dark .request-reason {
  color: #aaa;
}

.request-time {
  font-size: 12px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
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
  padding: 16px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  margin-bottom: 12px;
}

.member-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
  border-color: rgba(102, 126, 234, 0.2);
}

.member-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.04);
}

.theme-dark .member-card {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .member-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(102, 126, 234, 0.3);
}

.theme-dark .member-card.selected {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.member-checkbox {
  margin-right: 16px;
}

.member-avatar {
  width: 48px;
  height: 48px;
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
  font-size: 16px;
  font-weight: 600;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.member-basic {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-name {
  font-size: 15px;
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
  gap: 24px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.detail-label {
  color: #9ca3af;
  font-weight: 500;
}

.detail-value {
  color: #6b7280;
}

.theme-dark .detail-value {
  color: #a1a1aa;
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
  margin-left: 8px;
}

.action-btn {
  padding: 6px 10px;
  color: #9ca3af;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
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