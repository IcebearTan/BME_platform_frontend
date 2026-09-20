<script>
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';

// 社区治理（Phase 2 09-20）：global 帖置顶（可设天数）/锁定/隐藏/恢复/删除。
// 后端 pin/lock/hide 走 can_moderate_thread（super_admin 或 discussion_management 权限）。
export default {
  components: { DewCard },

  data() {
    return {
      threads: [],
      allThreads: [],
      statusFilter: 'all',
      categoryFilter: '',
      searchKey: '',
      currentPage: 1,
      pageSize: 15,
      loading: false,
      statusText: { normal: '正常', hidden: '已隐藏', locked: '已锁定', deleted: '已删除' },
      statusTag: { normal: 'success', hidden: 'info', locked: 'warning', deleted: 'danger' },
      categories: [
        { value: 'chat', label: '闲聊' }, { value: 'ask', label: '提问' },
        { value: 'share', label: '分享' }, { value: 'recruit', label: '招人' },
      ],
      tableLabel: [
        { prop: 'id', label: 'ID', width: '70px' },
        { prop: 'title', label: '标题', minWidth: '200px' },
        { prop: 'author_name', label: '作者', width: '120px' },
        { prop: 'reply_count', label: '回复', width: '70px' },
        { prop: 'created_at', label: '发布时间', width: '160px' },
      ],
    };
  },

  async created() {
    await this.fetchThreads();
  },

  methods: {
    async fetchThreads() {
      this.loading = true;
      try {
        const params = { scope_type: 'global', status: this.statusFilter, per_page: 50 };
        if (this.categoryFilter) params.category = this.categoryFilter;
        const res = await api.get('/discussions/threads', { params });
        let rows = (res.data && res.data.data) || [];
        if (this.searchKey.trim()) {
          const kw = this.searchKey.trim().toLowerCase();
          rows = rows.filter((t) => (t.title || '').toLowerCase().includes(kw));
        }
        this.allThreads = rows;
        this.currentPage = 1;
        this.updatePaged();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '加载帖子失败');
      } finally {
        this.loading = false;
      }
    },

    updatePaged() {
      const start = (this.currentPage - 1) * this.pageSize;
      this.threads = this.allThreads.slice(start, start + this.pageSize);
    },

    handlePageChange(page) {
      this.currentPage = page;
      this.updatePaged();
    },

    async togglePin(row) {
      if (row.pinned_effective) {
        // 已置顶 → 直接取消
        try {
          await api.post(`/discussions/threads/${row.id}/pin`);
          ElMessage.success('已取消置顶');
          this.fetchThreads();
        } catch (e) {
          ElMessage.error(e?.response?.data?.message || '操作失败');
        }
        return;
      }
      let days = null;
      try {
        const { value } = await ElMessageBox.prompt(
          '置顶天数（1-30，留空 = 永久置顶）', '置顶帖子',
          { confirmButtonText: '置顶', cancelButtonText: '取消', inputPattern: /^$|^([1-9]|[12][0-9]|30)$/, inputErrorMessage: '请输入 1-30 或留空' },
        );
        days = value ? Number(value) : null;
      } catch { return; }
      try {
        const body = days ? { expires_days: days } : {};
        await api.post(`/discussions/threads/${row.id}/pin`, body);
        ElMessage.success(days ? `已置顶 ${days} 天` : '已置顶');
        this.fetchThreads();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },

    async toggleLock(row) {
      try {
        const res = await api.post(`/discussions/threads/${row.id}/lock`);
        ElMessage.success(res.data?.data?.status === 'locked' ? '已锁定' : '已解锁');
        this.fetchThreads();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },

    async toggleHide(row) {
      try {
        const res = await api.post(`/discussions/threads/${row.id}/hide`);
        ElMessage.success(res.data?.data?.status === 'hidden' ? '已隐藏' : '已恢复');
        this.fetchThreads();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },

    async handleDelete(row) {
      try {
        await ElMessageBox.confirm('确定删除这篇帖子？连带回复一起删除，不可恢复。', '提示', {
          confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
        });
      } catch { return; }
      try {
        await api.delete(`/discussions/threads/${row.id}`);
        ElMessage.success('已删除');
        this.fetchThreads();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '删除失败');
      }
    },
  },
};
</script>

<template>
  <div class="selectable" style="width: 100%;">
    <div class="page-header">
      <div class="page-title">社区治理
        <span class="page-subtitle">全局帖：置顶 / 锁定 / 隐藏 / 删除</span>
      </div>
      <div class="header-actions">
        <el-select v-model="statusFilter" style="width: 120px;" @change="fetchThreads">
          <el-option label="全部状态" value="all" />
          <el-option label="正常" value="normal" />
          <el-option label="已隐藏" value="hidden" />
          <el-option label="已锁定" value="locked" />
        </el-select>
        <el-select v-model="categoryFilter" placeholder="话题" clearable style="width: 110px; margin-left: 12px;" @change="fetchThreads">
          <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item style="margin: 0 0 0 12px;">
            <el-input placeholder="搜索标题" v-model="searchKey" @keyup.enter="fetchThreads" clearable style="width: 180px;" />
          </el-form-item>
          <el-form-item style="margin: 0 0 0 8px;">
            <el-button type="primary" @click="fetchThreads">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div style="margin: 20px;">
      <DewCard no-hover class="table-card">
        <el-table v-loading="loading" :data="threads" style="width: 100%; border-radius: 10px;"
                  max-height="calc(100vh - 320px)" :row-style="{ height: '40px' }">
          <el-table-column v-for="item in tableLabel" :key="item.prop" :prop="item.prop" :label="item.label"
                           :width="item.width" :min-width="item.minWidth || 125" show-overflow-tooltip />
          <el-table-column label="话题" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.category_text" size="small" type="info">{{ row.category_text }}</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="关联项目" width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.project_title">{{ row.project_title }}</span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusTag[row.status] || 'info'" size="small">{{ statusText[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="置顶" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.pinned_effective" type="warning" size="small">置顶中</el-tag>
              <el-tag v-else-if="row.is_pinned" type="info" size="small">已过期</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" min-width="300">
            <template #default="{ row }">
              <el-button :type="row.pinned_effective ? 'warning' : 'primary'" size="small" @click="togglePin(row)">
                {{ row.pinned_effective ? '取消置顶' : '置顶' }}
              </el-button>
              <el-button :type="row.status === 'locked' ? 'success' : 'warning'" size="small" @click="toggleLock(row)">
                {{ row.status === 'locked' ? '解锁' : '锁定' }}
              </el-button>
              <el-button :type="row.status === 'hidden' ? 'success' : 'info'" size="small" @click="toggleHide(row)">
                {{ row.status === 'hidden' ? '恢复' : '隐藏' }}
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination @current-change="handlePageChange" :current-page="currentPage" :page-size="pageSize"
                         :total="allThreads.length" layout="prev, pager, next" />
        </div>
      </DewCard>
    </div>
  </div>
</template>

<style scoped>
.selectable { user-select: text; }
.table-card { overflow: hidden; }
.table-card :deep(.dew-card__body) { padding: 0; }
.page-subtitle { font-size: 13px; font-weight: 400; color: var(--el-text-color-secondary); margin-left: 10px; }
</style>
