<template>
  <div class="audit-log-container">
    <!-- 页面标题和筛选区域 -->
    <div class="header-container">
      <div class="l-container">
        <span>审计日志</span>
        <el-button 
          type="primary" 
          @click="handleRefresh"
          :loading="loading"
        >
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
      </div>
      <div class="r-container">
        <el-form :inline="true" class="filter-form" :model="filterForm">
          <el-form-item label="用户名">
            <el-input 
              v-model="filterForm.username" 
              placeholder="输入用户名"
              clearable
              @clear="handleSearch"
              style="width: 180px;"
            />
          </el-form-item>
          
          <el-form-item label="操作类型">
            <el-select 
              v-model="filterForm.operation" 
              placeholder="选择操作类型"
              clearable
              @clear="handleSearch"
              style="width: 180px;"
            >
              <el-option label="全部" value="" />
              <el-option label="用户注册" value="用户注册" />
              <el-option label="用户登录" value="用户登录" />
              <el-option label="管理员登录" value="管理员登录" />
              <el-option label="创建文章" value="创建文章" />
              <el-option label="编辑文章" value="编辑文章" />
              <el-option label="删除文章" value="删除文章" />
              <el-option label="发布课程" value="发布课程" />
              <el-option label="编辑课程" value="编辑课程" />
              <el-option label="删除课程" value="删除课程" />
              <el-option label="创建勋章" value="创建勋章" />
              <el-option label="分配用户权限" value="分配用户权限" />
              <el-option label="撤销用户权限" value="撤销用户权限" />
            </el-select>
          </el-form-item>

          <el-form-item label="操作结果">
            <el-select 
              v-model="filterForm.result" 
              placeholder="选择结果"
              clearable
              @clear="handleSearch"
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="成功" value="成功" />
              <el-option label="失败" value="失败" />
            </el-select>
          </el-form-item>

          <el-form-item label="日期范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
              style="width: 280px;"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table 
        :data="logs" 
        v-loading="loading"
        style="width: 100%"
        height="calc(100vh - 320px)"
        :row-style="{ height: '50px' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="operation" label="操作" width="150" />
        <el-table-column prop="ip_address" label="IP地址" width="150" />
        <el-table-column prop="operation_url" label="操作URL" min-width="200" show-overflow-tooltip />
        <el-table-column prop="result" label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.result === '成功' ? 'success' : 'danger'" size="small">
              {{ row.result }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      title="操作详情" 
      width="600px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border v-if="currentLog">
        <el-descriptions-item label="ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentLog.user_id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ currentLog.username }}</el-descriptions-item>
        <el-descriptions-item label="操作">{{ currentLog.operation }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip_address }}</el-descriptions-item>
        <el-descriptions-item label="User Agent">
          <div style="word-break: break-all;">{{ currentLog.user_agent }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="操作URL">
          <div style="word-break: break-all;">{{ currentLog.operation_url }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="操作数据">
          <pre style="max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">{{ currentLog.operation_data }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="结果">
          <el-tag :type="currentLog.result === '成功' ? 'success' : 'danger'">
            {{ currentLog.result }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ formatDateTime(currentLog.timestamp) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, RefreshRight } from '@element-plus/icons-vue';
import api from '../api';

const loading = ref(false);
const logs = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);
const detailDialogVisible = ref(false);
const currentLog = ref(null);

const filterForm = reactive({
  username: '',
  operation: '',
  result: '',
  dateRange: null
});

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  const date = new Date(dateTime);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// 获取审计日志
const fetchLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      per_page: pageSize.value,
      operation: filterForm.operation || undefined
    };

    const response = await api({
      url: '/auth/audit_records',
      method: 'get',
      params: params
    });

    if (response.data.code === 200) {
      // 直接使用后端返回的数据和分页信息，不进行前端筛选
      // 原因：前端筛选会导致分页数据不完整，影响用户体验
      logs.value = response.data.data.logs || [];
      totalItems.value = response.data.data.pagination.total || 0;
      
      // 注意：用户名、结果、日期范围筛选需要后端支持
      // 目前仅支持操作类型筛选
      if (filterForm.username || filterForm.result || filterForm.dateRange) {
        ElMessage.warning('用户名、结果、日期范围筛选功能需要后端接口支持，当前仅显示操作类型筛选结果', {
          duration: 3000,
          showClose: true
        });
      }
    } else {
      ElMessage.error(response.data.message || '获取日志失败');
    }
  } catch (error) {
    console.error('获取审计日志失败:', error);
    if (error.response?.status === 403) {
      ElMessage.error('权限不足，需要系统管理权限');
    } else {
      ElMessage.error('获取审计日志失败');
    }
  } finally {
    loading.value = false;
  }
};

// 刷新数据
const handleRefresh = () => {
  ElMessage.success('正在刷新数据...');
  fetchLogs();
};

// 查询
const handleSearch = () => {
  currentPage.value = 1;
  fetchLogs();
};

// 重置
const handleReset = () => {
  filterForm.username = '';
  filterForm.operation = '';
  filterForm.result = '';
  filterForm.dateRange = null;
  currentPage.value = 1;
  fetchLogs();
};

// 翻页
const handlePageChange = (page) => {
  currentPage.value = page;
  fetchLogs();
};

// 改变每页显示数量
const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchLogs();
};

// 查看详情
const handleViewDetail = (row) => {
  currentLog.value = row;
  detailDialogVisible.value = true;
};

onMounted(() => {
  fetchLogs();
});
</script>

<style scoped>
.audit-log-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin: 10px;
  min-height: 60px;
}

.l-container {
  font-size: 30px;
  font-weight: 900;
  margin-left: 20px;
  color: #3b5cd5;
  line-height: 40px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.l-container .el-button {
  font-size: 14px;
  height: 36px;
}

.r-container {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.filter-form .el-form-item {
  margin: 5px 0;
}

/* 确保输入框和下拉框内容正常显示 */
.filter-form .el-input__wrapper {
  width: 100%;
}

.filter-form .el-select {
  width: 100%;
}

.filter-form .el-date-editor {
  width: 100%;
}

.table-container {
  margin: 20px;
  border-radius: 10px;
  border: 1px solid #C4C4C4;
  box-shadow: 0px 5px 10px 1px #f7f7f7;
  overflow: hidden;
  background: white;
}

.pagination-wrapper {
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top: 1px solid #eee;
  background: white;
}
</style>
