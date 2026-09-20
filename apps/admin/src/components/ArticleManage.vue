<script>
import api from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, ArrowDown } from '@element-plus/icons-vue';
import { DewCard } from '@bme/dew-ui';

export default {
  components: { DewCard, Search, ArrowDown },

  data() {
    return {
      articles: [],          // 当前页
      allArticles: [],       // 全部（经筛选/搜索后）
      statusFilter: 'all',   // all | draft | published
      officialFilter: '',    // '' | true | false（官方推文筛选，Phase 2）
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
        if (this.officialFilter !== '') params.official = this.officialFilter;
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

    // 官方富文本新建（方案 §8.1）：先进编辑器由其创建空 HTML 草稿
    handleAddHtml() {
      this.$router.push({ path: '/public', query: { type: 'html' } });
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

    // 精华标记切换（Phase 3：热度 ×2）
    async toggleEssence(row) {
      try {
        await api.post(`/v2/article/${row.id}/edit`, { is_essence: !row.is_essence });
        ElMessage.success(row.is_essence ? '已取消精华' : '已标为精华');
        this.fetchArticles();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
      }
    },

    // 官方推文标记切换（Phase 2：推文=精选带展示位，仅文章管理员可设——本页即管理员视角）
    async toggleOfficial(row) {
      try {
        await api.post(`/v2/article/${row.id}/edit`, { is_official: !row.is_official });
        ElMessage.success(row.is_official ? '已取消推文标记' : '已设为官方推文');
        this.fetchArticles();
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '操作失败');
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
    <div class="page-header">
      <div class="page-title">文章列表
        <el-dropdown style="margin-left: 10px;" @command="(cmd) => (cmd === 'html' ? handleAddHtml() : handleAdd())">
          <el-button type="warning" size="large">
            添加文章
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="markdown">标准 Markdown（公告/技术文章）</el-dropdown-item>
              <el-dropdown-item command="html">官方富文本（秀米/公众号排版）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="header-actions">
        <el-select v-model="statusFilter" placeholder="状态" style="width: 120px;" @change="handleStatusFilter">
          <el-option label="全部" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
        <el-select v-model="officialFilter" placeholder="推文" style="width: 120px; margin-left: 12px;" @change="fetchArticles">
          <el-option label="全部内容" value="" />
          <el-option label="官方推文" value="true" />
          <el-option label="普通文章" value="false" />
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

    <div style="margin: 20px;">
      <DewCard no-hover class="table-card">
        <el-table
          :data="articles"
          style="width: 100%; border-radius: 10px;"
          max-height="calc(100vh - 320px)"
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
          <el-table-column label="推文" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.is_official" type="warning" size="small">官方</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="格式" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.content_type === 'html'" type="danger" size="small" effect="plain">富文本</el-tag>
              <span v-else>Markdown</span>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" min-width="380">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button :type="row.is_official ? 'info' : 'warning'" size="small"
                         :disabled="row.content_type === 'html' && row.is_official"
                         :title="row.content_type === 'html' ? '官方富文本推文不能取消官方标记' : ''"
                         @click="toggleOfficial(row)">
                {{ row.is_official ? '取消推文' : '设为推文' }}
              </el-button>
              <el-button :type="row.is_essence ? 'info' : 'success'" size="small" @click="toggleEssence(row)">
                {{ row.is_essence ? '取消精华' : '精华' }}
              </el-button>
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
            @current-change="handlePageChange"
            :current-page="currentPage"
            :page-size="pageSize"
            :total="allArticles.length"
            layout="prev, pager, next"
          />
        </div>
      </DewCard>
    </div>
  </div>
</template>

<style scoped>
/* 页头/筛选/分页样式由 styles/pages.css 统一提供 */
.selectable {
  user-select: text;
}

/* 表体高度由 el-table max-height prop 内滚（视口锚定），卡片不再定高裁切 */
.table-card {
  overflow: hidden;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}
</style>
