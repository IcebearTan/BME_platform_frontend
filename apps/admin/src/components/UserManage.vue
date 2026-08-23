<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';

const formInline = reactive({
  key: ''
});
const dialogFormVisible = ref(false);
const users = ref([]);
const allUsers = ref([]);
const filteredUsers = ref([]); // 新增：用于存储当前筛选后的用户列表
const currentPage = ref(1);//当前页面
const pageSize = ref(16);//每页显示的条数
const action = ref('edit');
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
          <el-table-column fixed="right" label="Operations" min-width="120">
            <template #="scoped">
              <el-button type="primary" size="small" @click="handleEdit(scoped.row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scoped.row)">删除</el-button>
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

    <el-dialog v-model="dialogFormVisible" :title="action == 'add' ? '新增课程' : '编辑用户'" width="500">
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item label="用户名" :label-width="formLabelWidth" prop="username">
          <el-input v-model="form.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="用户密码" :label-width="formLabelWidth" prop="password">
          <el-input v-model="form.password" autocomplete="off" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancle">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确认</el-button>
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

