<template>
  <div class="admin-llm-page selectable">

    <!-- 页面标题 + 筛选 -->
    <div class="page-hero">
      <div class="hero-top">
        <div class="hero-left">
          <div class="hero-eyebrow">
            <span class="eyebrow-dot"></span>
            <span>大模型服务 · 管理后台</span>
          </div>
          <h2 class="hero-title">增额申请审批</h2>
          <p class="hero-sub">审核用户提交的额度提升申请，通过后自动同步至 LiteLLM</p>
        </div>
        <div v-if="pendingCount > 0" class="pending-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{{ pendingCount }} 条待审批</span>
        </div>
      </div>
      <div class="hero-filter-bar">
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: statusFilter === tab.value }"
            @click="onFilterChange(tab.value)"
          >
            {{ tab.label }}
            <span v-if="tab.value === 'pending' && pendingCount > 0" class="tab-badge">{{ pendingCount }}</span>
          </button>
        </div>
        <el-button size="small" plain @click="fetchRequests">
          <svg style="width:13px;height:13px;margin-right:4px;vertical-align:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 申请列表 -->
    <div class="section-card">

      <el-table :data="requests" v-loading="loading" style="width:100%" class="main-table">
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar">{{ (row.username || '?')[0].toUpperCase() }}</div>
              <div>
                <div class="user-name">{{ row.username }}</div>
                <div class="user-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="当前额度" width="120">
          <template #default="{ row }">
            <span class="money-cur">{{ formatMoney(row.current_budget) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请额度" width="120">
          <template #default="{ row }">
            <span class="money-req">{{ formatMoney(row.requested_budget) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申请理由" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="reason-text">{{ row.reason || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <span class="status-badge" :class="`status-${row.status}`">
              <span class="status-dot"></span>
              {{ statusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="额度到期" width="160">
          <template #default="{ row }">
            <template v-if="row.status === 'approved'">
              <el-tag v-if="row.reverted_at" size="small" type="info" effect="light">已回滚 {{ row.reverted_at?.slice(0,10) }}</el-tag>
              <span v-else-if="row.override_expires_at" class="expires-text">{{ row.override_expires_at }}</span>
              <span v-else class="muted-text">—</span>
            </template>
            <span v-else class="muted-text">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            <span class="muted-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作 / 意见" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <div class="action-btns">
                <el-button size="small" type="success" @click="review(row, 'approve')">
                  <svg style="width:12px;height:12px;margin-right:3px;vertical-align:-1px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  通过
                </el-button>
                <el-button size="small" type="danger" plain @click="review(row, 'reject')">
                  <svg style="width:12px;height:12px;margin-right:3px;vertical-align:-1px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  拒绝
                </el-button>
              </div>
            </template>
            <span v-else class="comment-text">{{ row.review_comment || '—' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && requests.length === 0" :description="statusFilter === 'pending' ? '暂无待审批申请' : '暂无记录'" style="padding:40px 0;" />

      <div class="table-footer">
        <el-pagination
          v-if="pagination.total > pagination.per_page"
          layout="prev, pager, next, total"
          :total="pagination.total"
          :page-size="pagination.per_page"
          :current-page="pagination.page"
          @current-change="onPageChange" />
      </div>
    </div>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const requests = ref([]);
const loading = ref(false);
const statusFilter = ref('pending');
const pagination = reactive({ page: 1, per_page: 20, total: 0 });

const filterTabs = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部',   value: '' },
];

const pendingCount = computed(() =>
  statusFilter.value === 'pending' ? pagination.total : requests.value.filter(r => r.status === 'pending').length
);

const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(2)}`);
const statusText = (s) => ({ pending: '待审批', approved: '已通过', rejected: '已拒绝' }[s] || s);

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

const onFilterChange = (val) => {
  statusFilter.value = val;
  pagination.page = 1;
  fetchRequests();
};

const onPageChange = (p) => { pagination.page = p; fetchRequests(); };

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
.admin-llm-page {
  padding: 24px 28px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #f5f7fb;
  min-height: 100%;
}

/* ===== Hero ===== */
.page-hero {
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 60%, #faf5ff 100%);
  border: 1px solid #e4e7ef;
  border-radius: 14px;
  padding: 22px 28px;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
  margin-bottom: 6px;
}
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }
.hero-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #1e40af, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub { font-size: 13px; color: #64748b; margin: 0; }

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.hero-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(99, 102, 241, 0.12);
}

.pending-alert {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}
.pending-alert svg { width: 15px; height: 15px; color: #d97706; flex-shrink: 0; }

/* ===== Section Card ===== */
.section-card {
  background: #fff;
  border: 1px solid #e4e7ef;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f2f7;
  background: #fafbff;
}

/* ===== Filter Tabs ===== */
.filter-tabs {
  display: flex;
  gap: 4px;
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 7px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-tab:hover { background: #f0f6ff; color: #3b82f6; }
.filter-tab.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
  font-weight: 600;
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

/* ===== Main Table ===== */
.main-table :deep(.el-table__header-wrapper th) {
  background: #fafbff !important;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.user-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #7c3aed);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.user-email { font-size: 11px; color: #94a3b8; }

.money-cur { font-size: 13px; color: #64748b; font-weight: 500; }
.money-req { font-size: 13px; font-weight: 700; color: #2563eb; }
.reason-text { font-size: 13px; color: #475569; }
.muted-text { font-size: 12px; color: #94a3b8; }
.expires-text { font-size: 12px; color: #d97706; font-weight: 500; }
.comment-text { font-size: 12px; color: #94a3b8; font-style: italic; }

/* ===== Status Badge ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-pending  { background: #fef3c7; color: #92400e; }
.status-pending  .status-dot { background: #f59e0b; }
.status-approved { background: #d1fae5; color: #065f46; }
.status-approved .status-dot { background: #10b981; }
.status-rejected { background: #fee2e2; color: #7f1d1d; }
.status-rejected .status-dot { background: #ef4444; }

/* ===== Action Buttons ===== */
.action-btns { display: flex; gap: 6px; }

/* ===== Table Footer ===== */
.table-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f2f7;
}
</style>
