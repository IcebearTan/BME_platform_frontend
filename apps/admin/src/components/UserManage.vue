<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { DewCard } from '@bme/dew-ui';

const store = useStore();
// 调级走 PUT /admin/users/<id>/level，后端要求 system_management 权限；按钮同步显隐，其余保持只读
const canSetLevel = computed(() => store.getters.can('system_management'));

const formInline = reactive({
  key: ''
});
const users = ref([]);
const allUsers = ref([]);
const filteredUsers = ref([]); // 新增：用于存储当前筛选后的用户列表
const currentPage = ref(1);//当前页面
const pageSize = ref(16);//每页显示的条数
const totalItems = ref(0);//总条数

const handleSearch = () => {//搜索框逻辑，前端搜索
  const keyword = formInline.key.trim();
  currentPage.value = 1;
  if (!keyword) {
    filteredUsers.value = allUsers.value;
  } else {
    filteredUsers.value = allUsers.value.filter(user => {
      const name = user.User_Name ? String(user.User_Name) : '';
      const mode = user.User_Mode ? String(user.User_Mode) : '';
      const id = user.User_Id ? String(user.User_Id) : '';
      return name.includes(keyword) || mode.includes(keyword) || id.includes(keyword);
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
    width: 200
  },
  {
    prop: 'User_Mode',
    label: '用户权限',
    width: 150
  },
  {
    prop: 'join_time',
    label: '入营时间',
    width: 250
  },
  {
    prop: 'User_Email',
    label: '用户邮箱',
    width: 250
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
    ElMessage({
        message: 'Unpredicted error',
        type: 'warning'
      });
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

// ── 用户等级（LV1-4）：展示随等级递进取色，调级弹窗 ──
const LEVEL_TAG_TYPES = { 1: 'info', 2: 'success', 3: 'warning', 4: 'danger' };
const levelTagType = (level) => LEVEL_TAG_TYPES[level] || 'info';

const levelDlg = reactive({ visible: false, submitting: false, userId: null, userName: '', level: 1 });

const openLevelDlg = (row) => {
  levelDlg.userId = row.User_Id;
  levelDlg.userName = row.User_Name;
  levelDlg.level = row.level || 1;
  levelDlg.visible = true;
};

const submitLevel = async () => {
  levelDlg.submitting = true;
  try {
    const res = await api.put(`/admin/users/${levelDlg.userId}/level`, { level: levelDlg.level });
    ElMessage.success(res.data.message || '等级已调整');
    levelDlg.visible = false;
    fetchUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '调整失败');
  } finally {
    levelDlg.submitting = false;
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
              placeholder=" 输入用户名&权限&id"
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
          style="width: 100%; overflow-y: auto; height: calc(100% - 40px);"
          :row-style="{ height: '40px' }"
        >
          <el-table-column v-for="item in tableLabel" :key="item.prop" :prop="item.prop" :label="item.label"
            :width="item.width ? item.width : 125" />
          <el-table-column label="等级" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.level" :type="levelTagType(row.level)" size="small">LV{{ row.level }}</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column v-if="canSetLevel" label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button size="small" link @click="openLevelDlg(row)">调级</el-button>
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

    <!-- 调级弹窗（等级地基：现阶段手动调整） -->
    <el-dialog v-model="levelDlg.visible" title="调整等级" width="420px">
      <el-form label-width="70px">
        <el-form-item label="用户">
          <span>{{ levelDlg.userName }}（{{ levelDlg.userId }}）</span>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="levelDlg.level" style="width: 100%;">
            <el-option v-for="n in [1, 2, 3, 4]" :key="n" :label="`LV${n}`" :value="n" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="levelDlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="levelDlg.submitting" @click="submitLevel">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页头/筛选/分页样式由 styles/pages.css 统一提供 */
.table-card {
  max-height: 600px;
  overflow: hidden;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}
</style>

