<template>
  <div class="llm-page selectable">
    <div class="page-header">
      <span class="title">大模型增额申请审批</span>
      <el-radio-group v-model="statusFilter" @change="onFilterChange">
        <el-radio-button label="pending">待审批</el-radio-button>
        <el-radio-button label="approved">已通过</el-radio-button>
        <el-radio-button label="rejected">已拒绝</el-radio-button>
        <el-radio-button label="">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="requests" v-loading="loading" border style="width: 100%">
      <el-table-column prop="username" label="用户" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="170" show-overflow-tooltip />
      <el-table-column label="当前额度($)" width="120">
        <template #default="{ row }">{{ formatMoney(row.current_budget) }}</template>
      </el-table-column>
      <el-table-column label="申请额度($)" width="120">
        <template #default="{ row }">{{ formatMoney(row.requested_budget) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="申请理由" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="170" />
      <el-table-column label="额度到期" width="170">
        <template #default="{ row }">
          <template v-if="row.status === 'approved'">
            <el-tag v-if="row.reverted_at" size="small" type="info">已回滚 {{ row.reverted_at?.slice(0,10) }}</el-tag>
            <span v-else-if="row.override_expires_at" style="font-size:12px;color:#e6a23c;">{{ row.override_expires_at }}</span>
            <span v-else>—</span>
          </template>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="success" @click="review(row, 'approve')">通过</el-button>
            <el-button size="small" type="danger" @click="review(row, 'reject')">拒绝</el-button>
          </template>
          <span v-else style="color:#999;">{{ row.review_comment || '—' }}</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="pagination.total > pagination.per_page"
      style="margin-top: 16px; justify-content: flex-end;"
      layout="prev, pager, next, total"
      :total="pagination.total"
      :page-size="pagination.per_page"
      :current-page="pagination.page"
      @current-change="onPageChange" />
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const requests = ref([]);
const loading = ref(false);
const statusFilter = ref('pending');
const pagination = reactive({ page: 1, per_page: 20, total: 0 });

const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(2)}`);
const statusText = (s) => ({ pending: '待审批', approved: '已通过', rejected: '已拒绝' }[s] || s);
const statusTag = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info');

const fetchRequests = async () => {
  loading.value = true;
  try {
    const params = { page: pagination.page, per_page: pagination.per_page };
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await api.get('/llm/admin/quota-requests', { params });
    const data = res.data.data;
    requests.value = data.requests || [];
    Object.assign(pagination, data.pagination);
  } catch (e) {
    ElMessage.error('获取申请列表失败');
  } finally {
    loading.value = false;
  }
};

const onFilterChange = () => {
  pagination.page = 1;
  fetchRequests();
};

const onPageChange = (p) => {
  pagination.page = p;
  fetchRequests();
};

const review = async (row, action) => {
  const actionText = action === 'approve' ? '通过' : '拒绝';
  let comment = '';
  try {
    const res = await ElMessageBox.prompt(
      `确认${actionText}「${row.username}」的增额申请（申请额度 $${row.requested_budget}）？可填写审批意见：`,
      `${actionText}申请`,
      { confirmButtonText: '确认', cancelButtonText: '取消', inputType: 'textarea', inputValidator: () => true }
    );
    comment = res.value || '';
  } catch { return; }
  try {
    await api.post(`/llm/admin/quota-requests/${row.id}/review`, { action, review_comment: comment });
    ElMessage.success('审批完成');
    fetchRequests();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '操作失败');
  }
};

onMounted(fetchRequests);
</script>

<style scoped>
.llm-page { padding: 20px; box-sizing: border-box; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header .title { font-size: 20px; font-weight: 600; }
</style>
