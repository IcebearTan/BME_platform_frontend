<script>
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  data() {
    return {
      articles: [],          // 当前页
      allArticles: [],       // 全部（经筛选/搜索后）
      statusFilter: 'all',   // all | draft | published
      searchKey: '',
      currentPage: 1,
      pageSize: 10,
      tableLabel: [
        { prop: 'id', label: 'ID', width: '80px' },
        { prop: 'title', label: '标题', minWidth: '220px' },
        { prop: 'author_name', label: '作者', width: '130px' },
        { prop: 'updated_at', label: '更新时间', width: '170px' },
      ],
    };
  },

  async created() {
    await this.fetchArticles();
  },

  methods: {
    async fetchArticles() {
      try {
        const params = {};
        if (this.statusFilter !== 'all') params.status = this.statusFilter;
        if (this.searchKey.trim()) params.q = this.searchKey.trim();
        const res = await api.get('/v2/article/admin/list', { params });
        this.allArticles = (res.data && res.data.data) || [];
        this.currentPage = 1;
        this.updatePagedArticles();
      } catch (error) {
        console.error('加载文章失败:', error);
      }
    },

    updatePagedArticles() {
      const start = (this.currentPage - 1) * this.pageSize;
      this.articles = this.allArticles.slice(start, start + this.pageSize);
    },

    handlePageChange(page) {
      this.currentPage = page;
      this.updatePagedArticles();
    },

    handleSearch() {
      this.fetchArticles();
    },

    handleStatusFilter() {
      this.fetchArticles();
    },

    handleEdit(row) {
      this.$router.push({ path: '/editor', query: { id: row.id } });
    },

    handleAdd() {
      this.$router.push('/public');
    },

    async handleDelete(row) {
      try {
        await ElMessageBox.confirm('确定删除这篇文章？删除后不可恢复。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });
      } catch {
        return; // 取消
      }
      try {
        await api.post(`/v2/article/${row.id}/delete`);
        ElMessage.success('删除成功');
        this.fetchArticles();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '删除失败');
      }
    },

    // 状态切换：草稿→发布 / 已发布→下架（admin 可操作任何人的文章）
    async togglePublish(row) {
      try {
        if (row.status === 'draft') {
          await api.post(`/v2/article/${row.id}/publish`);
          ElMessage.success('已发布');
        } else {
          await api.post(`/v2/article/${row.id}/unpublish`);
          ElMessage.success('已下架');
        }
        this.fetchArticles();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },
  },
};
</script>

<template>
  <div class="selectable" style="width: 100%;">
    <div class="header-container">
      <div class="l-container">文章列表
        <el-button type="warning" @click="handleAdd" size="large" style="margin-left: 10px;">添加文章</el-button>
      </div>
      <div class="r-container">
        <el-select v-model="statusFilter" placeholder="状态" style="width: 120px;" @change="handleStatusFilter">
          <el-option label="全部" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item style="margin: 0 0 0 12px;">
            <el-input
              placeholder="搜索标题/简介"
              v-model="searchKey"
              @keyup.enter="handleSearch"
              clearable
              style="width: 200px;"
            />
          </el-form-item>
          <el-form-item style="margin: 0 0 0 8px;">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="selectable" style="box-shadow: 0px 5px 10px 1px#e3e3e3; margin: 20px;">
      <div class="table">
        <el-table
          :data="articles"
          style="width: 100%; overflow: auto; height: calc(100% - 40px); border-radius: 10px;"
          :row-style="{ height: '40px' }"
        >
          <el-table-column
            v-for="item in tableLabel"
            :key="item.prop"
            :prop="item.prop"
            :label="item.label"
            :width="item.width"
            :min-width="item.minWidth || 125"
            show-overflow-tooltip
          />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'draft' ? 'info' : 'success'" size="small">
                {{ row.status === 'draft' ? '草稿' : '已发布' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" min-width="230">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                :type="row.status === 'draft' ? 'success' : 'warning'"
                size="small"
                @click="togglePublish(row)"
              >
                {{ row.status === 'draft' ? '发布' : '下架' }}
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            class="selectable"
            @current-change="handlePageChange"
            :current-page="currentPage"
            :page-size="pageSize"
            :total="allArticles.length"
            layout="prev, pager, next"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px;
  height: 40px;

  .l-container {
    display: inline-block;
    font-size: 30px;
    font-weight: 900;
    margin-left: 20px;
    color: #3b5cd5;
  }

  .r-container {
    display: flex;
    align-items: center;

    .form-inline {
      display: flex;
      justify-content: center;
      .el-form-item {
        text-align: center;
      }
      margin: 0;
    }
  }
}

.selectable {
  user-select: text;
}

.pagination-wrapper {
  position: relative;
  width: 100%;
  background-color: white;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0 0 10px 10px;
}

.table {
  width: 100%;
  height: calc(100vh - 220px);
  max-height: 600px;
  border-radius: 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #C4C4C4;
  box-shadow: 0px 5px 10px 1px#f7f7f7;
  overflow: visible;
}
</style>
