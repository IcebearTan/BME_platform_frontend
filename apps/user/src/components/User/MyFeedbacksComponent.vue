<template>
  <div class="uc-feedbacks">
    <DewCard
      size="lg"
      divided
      class="feedbacks-card"
      v-loading="loading"
      element-loading-background="transparent"
    >
      <template #header>
        <div class="fb-header">
          <span class="fb-title">我的反馈记录</span>
          <span class="fb-subtitle">查看您提交的所有反馈记录</span>
        </div>
      </template>

      <!-- 反馈表格（DewUI 没有表格组件，保留 el-table，用 --el-table-* 变量映射到 DewUI token 做亮/暗适配） -->
      <div class="fb-table-wrap" v-if="feedbackList.length > 0">
        <el-table
          :data="feedbackList"
          style="width: 100%;"
          stripe
          :cell-style="{ 'vertical-align': 'top', 'padding': '12px 8px' }"
          :default-sort="{ prop: 'created_at', order: 'descending' }"
        >
          <el-table-column label="标题" width="120">
            <template #default="scope">
              <div class="cell-content title-cell">{{ scope.row.title }}</div>
            </template>
          </el-table-column>

          <el-table-column label="问题描述" min-width="240">
            <template #default="scope">
              <div class="cell-content content-cell">{{ scope.row.content }}</div>
            </template>
          </el-table-column>

          <el-table-column label="图片" width="70" align="center">
            <template #default="scope">
              <div v-if="scope.row.has_image && scope.row.images && scope.row.images.length > 0" class="image-preview">
                <el-image
                  :src="scope.row.images[0]"
                  style="width: 40px; height: 40px; border-radius: 6px"
                  fit="cover"
                  :preview-src-list="scope.row.images"
                  :preview-teleported="true"
                />
                <span v-if="scope.row.images.length > 1" class="image-count">
                  +{{ scope.row.images.length - 1 }}
                </span>
              </div>
              <span v-else class="muted">无</span>
            </template>
          </el-table-column>

          <el-table-column label="时间" width="150">
            <template #default="scope">
              <div class="cell-content time-cell">{{ scope.row.created_at }}</div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="90" align="center">
            <template #default="scope">
              <DewTag
                :type="scope.row.status === '已处理' ? 'success' : 'warning'"
                size="sm"
                round
              >
                {{ scope.row.status || '待处理' }}
              </DewTag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="110" align="center">
            <template #default="scope">
              <div class="action-buttons">
                <DewButton size="sm" type="ghost" @click="viewDetail(scope.row)">查看</DewButton>
                <DewButton size="sm" type="danger" @click="confirmDelete(scope.row)">删除</DewButton>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <span class="empty-text">暂无反馈记录</span>
        <DewButton :active="true" @click="$router.push('/')">去首页提交反馈</DewButton>
      </div>
    </DewCard>

    <!-- 详情对话框（DewUI） -->
    <DewDialog v-model="detailVisible" title="反馈详情" :width="600">
      <div v-if="currentFeedback" class="feedback-detail">
        <div class="detail-item">
          <label>标题：</label>
          <span>{{ currentFeedback.title }}</span>
        </div>
        <div class="detail-item">
          <label>问题描述：</label>
          <p class="content">{{ currentFeedback.content }}</p>
        </div>
        <div class="detail-item" v-if="currentFeedback.has_image && currentFeedback.images && currentFeedback.images.length">
          <label>相关图片：</label>
          <div class="images-grid">
            <el-image
              v-for="(img, index) in currentFeedback.images"
              :key="index"
              :src="img"
              style="width: 80px; height: 80px; border-radius: 8px"
              fit="cover"
              :preview-src-list="currentFeedback.images"
              :initial-index="index"
              :preview-teleported="true"
            />
          </div>
        </div>
        <div class="detail-item">
          <label>提交时间：</label>
          <span>{{ currentFeedback.created_at }}</span>
        </div>
        <div class="detail-item">
          <label>处理状态：</label>
          <DewTag
            :type="currentFeedback.status === '已处理' ? 'success' : 'warning'"
            size="sm"
            round
          >
            {{ currentFeedback.status || '待处理' }}
          </DewTag>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewDialog, DewMessageBox } from '../ui'
import api from '../../api'

const feedbackList = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const currentFeedback = ref(null)

// 获取反馈记录列表
const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const response = await api({
      url: '/information/error/query',
      method: 'get'
    })

    if (response.data.code === 200) {
      feedbackList.value = (response.data.data || []).map(item => {
        let images = []
        if (item.has_image && item.image) {
          const imageData = item.image.startsWith('data:image/')
            ? item.image
            : `data:image/png;base64,${item.image}`
          images = [imageData]
        }

        return {
          id: item.id,
          title: item.title,
          content: item.content,
          images,
          created_at: formatDate(item.create_time),
          has_image: item.has_image,
          status: '待处理'
        }
      })
    } else {
      ElMessage.error(response.data.message || '获取反馈记录失败')
    }
  } catch (error) {
    console.error('获取反馈记录失败:', error)
    ElMessage.error('网络错误，无法获取反馈记录')
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (feedback) => {
  currentFeedback.value = feedback
  detailVisible.value = true
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 删除反馈（DewUI 确认弹窗）
const confirmDelete = async (row) => {
  try {
    await DewMessageBox.confirm(`确定要删除标题为“${row.title}”的反馈吗？`, '删除确认', {
      confirmText: '删除',
      cancelText: '取消',
    })
  } catch (e) {
    return // 用户取消
  }
  deleteFeedback(row.id)
}

const deleteFeedback = async (id) => {
  try {
    const response = await api({
      url: '/information/error/delete',
      method: 'post',
      data: { id }
    })
    if (response.data.code === 200) {
      ElMessage.success('删除成功')
      fetchFeedbacks()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    ElMessage.error('网络错误，删除失败')
  }
}

onMounted(() => {
  fetchFeedbacks()
})
</script>

<style scoped>
.uc-feedbacks {
  width: 100%;
  min-width: 0;
}

.feedbacks-card {
  width: 100%;
}

/* 头部：标题 + 副标题 */
.fb-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fb-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.fb-subtitle {
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* el-table 变量映射到 DewUI token：让表格在玻璃卡上 + 亮/暗都正确 */
.fb-table-wrap {
  /* 容器收口：防止 el-table 的列 min-content 把栅格项撑到无限宽，
     表格超宽时在卡片内横向滚动，而不是把整个页面拉长 */
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--dew-card-inset-bg);
  --el-table-header-text-color: var(--dew-text-heading);
  --el-table-text-color: var(--dew-text);
  --el-table-border-color: var(--dew-card-divider);
  --el-table-border: 1px solid var(--dew-card-divider);
  --el-table-row-hover-bg-color: var(--dew-ghost-hover-bg);
  /* 斑马纹底色 */
  --el-fill-color-light: var(--dew-card-inset-bg);
  --el-fill-color-blank: transparent;
}

.fb-table-wrap :deep(.el-table) {
  background: transparent;
}

.fb-table-wrap :deep(.el-table th.el-table__cell) {
  background: var(--dew-card-inset-bg) !important;
  font-weight: 600;
}

.fb-table-wrap :deep(.el-table .el-table__cell) {
  border-bottom-color: var(--dew-card-divider);
}

/* 单元格文本 */
.cell-content {
  line-height: 1.4;
  font-size: 13px;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
}

.title-cell {
  font-weight: 600;
  color: var(--dew-text-heading);
  max-width: 110px;
}

.content-cell {
  color: var(--dew-text);
  max-height: 60px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.time-cell {
  font-size: 12px;
  color: var(--dew-text-faint);
  max-width: 130px;
}

.muted {
  color: var(--dew-text-faint);
  font-size: 12px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

/* 图片预览角标 */
.image-preview {
  position: relative;
  display: inline-block;
}

.image-count {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 0 6px 0 6px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 0;
  color: var(--dew-text-faint);
}

.empty-icon {
  font-size: 40px;
  color: var(--dew-text-faint);
}

.empty-text {
  font-size: 14px;
}

/* 详情对话框内容 */
.feedback-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail-item label {
  font-weight: 600;
  color: var(--dew-text-heading);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-item span,
.detail-item .content {
  color: var(--dew-text);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .fb-title {
    font-size: 16px;
  }
}
</style>
