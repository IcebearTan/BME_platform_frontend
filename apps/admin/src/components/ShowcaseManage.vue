<script>
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';

// XLAB 广场项目治理（Phase 2 09-20）：集中上下架（admin 视角含 hidden 条目；
// 权限后端 _can_manage = is_admin 或项目 owner）。删除走用户端详情页，本页只做上下架。
export default {
  components: { DewCard },

  data() {
    return {
      projects: [],
      allProjects: [],
      sourceFilter: '',
      statusFilter: '',
      searchKey: '',
      currentPage: 1,
      pageSize: 15,
      loading: false,
      tableLabel: [
        { prop: 'id', label: 'ID', width: '70px' },
        { prop: 'title', label: '标题', minWidth: '200px' },
        { prop: 'source_text', label: '来源', width: '100px' },
        { prop: 'project_status_text', label: '项目状态', width: '90px' },
        { prop: 'owner_name', label: '发布人', width: '120px' },
        { prop: 'view_count', label: '浏览', width: '70px' },
        { prop: 'favorite_count', label: '收藏', width: '70px' },
        { prop: 'created_at', label: '创建时间', width: '160px' },
      ],
    };
  },

  async created() {
    await this.fetchProjects();
  },

  methods: {
    async fetchProjects() {
      this.loading = true;
      try {
        const params = {};
        if (this.sourceFilter) params.source = this.sourceFilter;
        const res = await api.get('/showcase/projects', { params });
        let rows = (res.data && res.data.projects) || [];
        if (this.statusFilter) rows = rows.filter((p) => p.status === this.statusFilter);
        if (this.searchKey.trim()) {
          const kw = this.searchKey.trim().toLowerCase();
          rows = rows.filter((p) => (p.title || '').toLowerCase().includes(kw)
            || (p.summary || '').toLowerCase().includes(kw));
        }
        this.allProjects = rows;
        this.currentPage = 1;
        this.updatePaged();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '加载项目失败');
      } finally {
        this.loading = false;
      }
    },

    updatePaged() {
      const start = (this.currentPage - 1) * this.pageSize;
      this.projects = this.allProjects.slice(start, start + this.pageSize);
    },

    handlePageChange(page) {
      this.currentPage = page;
      this.updatePaged();
    },

    async toggleStatus(row) {
      if (row.status === 'visible') {
        try {
          await ElMessageBox.confirm(`下架「${row.title}」？其他用户将看不到该条目。`, '提示', {
            confirmButtonText: '下架', cancelButtonText: '取消', type: 'warning',
          });
        } catch { return; }
      }
      try {
        const next = row.status === 'visible' ? 'hidden' : 'visible';
        await api.put(`/showcase/projects/${row.id}/status`, { status: next });
        ElMessage.success(next === 'visible' ? '已恢复上架' : '已下架');
        row.status = next;
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },
  },
};
</script>

<template>
  <div class="selectable" style="width: 100%;">
    <div class="page-header">
      <div class="page-title">XLAB 项目治理
        <span class="page-subtitle">广场条目集中上下架</span>
      </div>
      <div class="header-actions">
        <el-select v-model="sourceFilter" placeholder="来源" clearable style="width: 120px;" @change="fetchProjects">
          <el-option label="营期项目" value="camp" />
          <el-option label="自由分享" value="community" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="上架状态" clearable style="width: 120px; margin-left: 12px;" @change="fetchProjects">
          <el-option label="在架" value="visible" />
          <el-option label="已下架" value="hidden" />
        </el-select>
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item style="margin: 0 0 0 12px;">
            <el-input placeholder="搜索标题/简介" v-model="searchKey" @keyup.enter="fetchProjects" clearable style="width: 190px;" />
          </el-form-item>
          <el-form-item style="margin: 0 0 0 8px;">
            <el-button type="primary" @click="fetchProjects">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div style="margin: 20px;">
      <DewCard no-hover class="table-card">
        <el-table v-loading="loading" :data="projects" style="width: 100%; border-radius: 10px;"
                  max-height="calc(100vh - 320px)" :row-style="{ height: '40px' }">
          <el-table-column v-for="item in tableLabel" :key="item.prop" :prop="item.prop" :label="item.label"
                           :width="item.width" :min-width="item.minWidth || 125" show-overflow-tooltip />
          <el-table-column label="上架状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'visible' ? 'success' : 'info'" size="small">
                {{ row.status === 'visible' ? '在架' : '已下架' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" min-width="110">
            <template #default="{ row }">
              <el-button :type="row.status === 'visible' ? 'warning' : 'success'" size="small" @click="toggleStatus(row)">
                {{ row.status === 'visible' ? '下架' : '恢复上架' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination @current-change="handlePageChange" :current-page="currentPage" :page-size="pageSize"
                         :total="allProjects.length" layout="prev, pager, next" />
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
