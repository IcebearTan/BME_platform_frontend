<script setup>
import { Search } from '@element-plus/icons-vue'
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';

const store = useStore();
// 编辑/封禁走 PUT /admin/users/<id> 与 /status，后端要求 system_management 权限（super_admin 直通）
const canManage = computed(() => store.getters.can('system_management'));

const formInline = reactive({
  key: ''
});
const users = ref([]);
const allUsers = ref([]);
const filteredUsers = ref([]);
const currentPage = ref(1);
const pageSize = ref(16);
const totalItems = ref(0);

const handleSearch = () => {
  const keyword = formInline.key.trim();
  currentPage.value = 1;
  if (!keyword) {
    filteredUsers.value = allUsers.value;
  } else {
    filteredUsers.value = allUsers.value.filter(user => {
      const name = user.User_Name ? String(user.User_Name) : '';
      const role = user.role ? String(user.role) : '';
      const id = user.User_Id ? String(user.User_Id) : '';
      return name.includes(keyword) || role.includes(keyword) || id.includes(keyword);
    });
  }
  totalItems.value = filteredUsers.value.length;
  updatePagedUsers();
};

const tableLabel = ref([
  {
    prop: 'User_Id',
    label: '用户id',
    width: 80
  },
  {
    prop: 'User_Name',
    label: '用户名',
    width: 180
  },
  {
    prop: 'join_time',
    label: '入营时间',
    width: 220
  },
  {
    prop: 'User_Email',
    label: '用户邮箱',
    width: 240
  }
])

const fetchUsers = async () => {
  try {
    const response = await api({
      url: '/user/user_list',
      method: 'get',
    })
    allUsers.value = response.data;
    filteredUsers.value = allUsers.value;
    totalItems.value = allUsers.value.length;
    updatePagedUsers();
  } catch (error) {
    ElMessage.error('用户列表加载失败');
  }
}

const updatePagedUsers = () => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  users.value = filteredUsers.value.slice(start, end);
};

const handlePageChange = (page) => {
  currentPage.value = page;
  updatePagedUsers();
};

// ── 角色 / 等级 / 状态 展示 ──
const LEVEL_TAG_TYPES = { 1: 'info', 2: 'success', 3: 'warning', 4: 'danger' };
const levelTagType = (level) => LEVEL_TAG_TYPES[level] || 'info';
const roleText = (row) => (row.role === 'super_admin' ? '管理员' : '用户');
const banned = (row) => row.status === 'banned';

// ── 编辑弹窗（合并端点：用户名/全局角色/管理员标签/等级；吸收原独立「调级」弹窗）──
const editDlg = reactive({
  visible: false, submitting: false,
  userId: null, username: '', role: 'user', admin_tag: null, level: 1,
});

const openEdit = (row) => {
  editDlg.userId = row.User_Id;
  editDlg.username = row.User_Name;
  editDlg.role = row.role || 'user';
  editDlg.admin_tag = row.admin_tag || null;
  editDlg.level = row.level || 1;
  editDlg.visible = true;
};

const submitEdit = async () => {
  editDlg.submitting = true;
  try {
    const res = await api.put(`/admin/users/${editDlg.userId}`, {
      username: editDlg.username,
      role: editDlg.role,
      admin_tag: editDlg.role === 'super_admin' ? editDlg.admin_tag : null,
      level: editDlg.level,
    });
    ElMessage.success(res.data.message || '已保存');
    editDlg.visible = false;
    fetchUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    editDlg.submitting = false;
  }
};

// ── 封禁 / 解封（2026-09-11 用户定：取代删除——user.id 被 25+ 表引用，封禁=内容全留可逆）──
const toggleBan = async (row) => {
  const toBan = !banned(row);
  try {
    await ElMessageBox.confirm(
      toBan
        ? `封禁「${row.User_Name}」后将无法登录与调用接口，其文章和营期归属全部保留，可随时解封。`
        : `解封「${row.User_Name}」后该账号即可正常登录。`,
      toBan ? '封禁用户' : '解封用户',
      { type: toBan ? 'warning' : 'info', confirmButtonText: toBan ? '封禁' : '解封' }
    );
  } catch {
    return; // 用户取消
  }
  try {
    const res = await api.put(`/admin/users/${row.User_Id}/status`, {
      status: toBan ? 'banned' : 'active',
    });
    ElMessage.success(res.data.message || '操作成功');
    fetchUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
};

onMounted(() => {
  fetchUsers();
})
</script>

<template>
  <div style="width: 100%; height: 100%; position: relative; overflow: hidden;">
    <div class="page-header">
      <div class="page-title">用户列表</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" :model="formInline" @submit.prevent>
          <el-form-item label="用户查询">
            <el-input
              placeholder="输入用户名/角色/id"
              v-model="formInline.key"
              @keyup.enter="handleSearch"
              clearable
            ></el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon>
                <Search />
              </el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div style="margin: 20px;">
      <DewCard no-hover class="table-card">
        <el-table
          :data="users"
          style="width: 100%"
          max-height="calc(100vh - 320px)"
          :row-style="{ height: '40px' }"
        >
          <el-table-column v-for="item in tableLabel" :key="item.prop" :prop="item.prop" :label="item.label"
            :width="item.width ? item.width : 125" />
          <el-table-column label="角色" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="row.role === 'super_admin' ? 'danger' : 'info'" size="small">
                {{ roleText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="等级" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.level" :type="levelTagType(row.level)" size="small">LV{{ row.level }}</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="banned(row) ? 'danger' : 'success'" size="small" :effect="banned(row) ? 'dark' : 'light'">
                {{ banned(row) ? '已封禁' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canManage" label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button size="small" link @click="openEdit(row)">编辑</el-button>
              <el-button v-if="row.role !== 'super_admin'" size="small" link :type="banned(row) ? 'success' : 'danger'"
                @click="toggleBan(row)">{{ banned(row) ? '解封' : '封禁' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            @current-change="handlePageChange"
            :page-size="pageSize"
            :pager-count="11"
            layout="prev, pager, next"
            :total="totalItems"
            :current-page="currentPage"
          />
        </div>
      </DewCard>
    </div>

    <!-- 编辑弹窗：用户名 / 全局角色 / 管理员标签 / 等级（一套收编原调级弹窗） -->
    <el-dialog v-model="editDlg.visible" title="编辑用户" width="460px">
      <el-form label-width="90px">
        <el-form-item label="用户名">
          <el-input v-model="editDlg.username" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="全局角色">
          <el-select v-model="editDlg.role" style="width: 100%;">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="super_admin" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editDlg.role === 'super_admin'" label="管理员标签">
          <el-select v-model="editDlg.admin_tag" style="width: 100%;" clearable placeholder="无">
            <el-option label="teacher" value="teacher" />
            <el-option label="developer" value="developer" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="editDlg.level" style="width: 100%;">
            <el-option v-for="n in [1, 2, 3, 4]" :key="n" :label="`LV${n}`" :value="n" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="editDlg.submitting" @click="submitEdit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页头/筛选/分页样式由 styles/pages.css 统一提供 */
/* 表体高度由 el-table max-height prop 内滚（视口锚定），卡片不再定高裁切 */
.table-card {
  overflow: hidden;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}
</style>
