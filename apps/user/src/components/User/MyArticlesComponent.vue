<script setup>
/**
 * 我的文章（个人中心子页）：Tab 分页管理「已发布 / 草稿箱」。
 * - 数据：GET /v2/article/my?status=published|draft（鉴权，当前用户）
 * - Tab 用 DewButtonBar（badge 显示计数）；卡片右侧显式 编辑/删除 按钮
 * - 点正文：草稿→编辑器、已发布→阅读页；编辑按钮统一进编辑器
 * - 删除 → DewMessageBox 确认 → POST /v2/article/<id>/delete
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, EditPen, Plus } from '@element-plus/icons-vue'
import { DewCard, DewButtonBar, DewButton, DewMessage, DewMessageBox, DewSkeleton } from '../ui'
import api from '../../api'

const router = useRouter()
const activeTab = ref('published')   // 'published' | 'draft'
const articles = ref([])
const loading = ref(true)
const counts = ref({ published: 0, draft: 0 })

const tabItems = [
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿箱' },
]

const loadCounts = async () => {
  try {
    const res = await api({ method: 'get', url: '/v2/article/my?status=all' })
    const all = res.data.data || []
    counts.value = {
      published: all.filter(a => a.status === 'published').length,
      draft: all.filter(a => a.status === 'draft').length,
    }
  } catch { /* 忽略：计数失败不影响列表 */ }
}

const load = async () => {
  loading.value = true
  try {
    const res = await api({ method: 'get', url: `/v2/article/my?status=${activeTab.value}` })
    articles.value = res.data.data || []
  } catch (e) {
    console.error('加载文章失败', e)
  } finally {
    loading.value = false
  }
}

const onTab = () => load()   // activeTab 已由 DewButtonBar v-model 更新

const fmt = (t) => t
  ? new Date(t.replace(' ', 'T')).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  : ''

const meta = (a) => a.status === 'draft'
  ? (a.updated_at ? `最后编辑 ${fmt(a.updated_at)}` : '未发布')
  : (fmt(a.publish_time) || fmt(a.created_at))

const openItem = (a) => {
  // 点正文：草稿→继续编辑，已发布→阅读页
  if (a.status === 'draft') {
    router.push({ path: '/article-editor-v2', query: { id: a.id } })
  } else {
    router.push({ path: '/article-v2', query: { id: a.id } })
  }
}

const editItem = (a) => {
  router.push({ path: '/article-editor-v2', query: { id: a.id } })
}

const onDelete = async (a) => {
  try {
    await DewMessageBox.confirm('删除后无法恢复，确定删除这篇文章吗？', '删除文章', { confirmText: '删除' })
  } catch { return }
  try {
    await api.post(`/v2/article/${a.id}/delete`)
    DewMessage.success('已删除')
    load()
    loadCounts()
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '删除失败')
  }
}

onMounted(() => { loadCounts(); load() })
</script>

<template>
  <DewCard size="lg" divided class="my-articles-card">
    <template #header>
      <div class="ma-header">
        <DewButtonBar
          v-model="activeTab"
          :items="[
            { value: 'published', label: '已发布', badge: counts.published },
            { value: 'draft', label: '草稿箱', badge: counts.draft },
          ]"
          size="sm"
          @update:modelValue="onTab"
        />
        <DewButton size="sm" @click="router.push('/article-editor-v2')">
          <Plus class="btn-icon" />写新文章
        </DewButton>
      </div>
    </template>

    <div v-if="loading" class="ma-list">
      <div v-for="n in 4" :key="'ma-sk-' + n" class="ma-item">
        <div class="ma-item-main" style="display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <DewSkeleton variant="text" width="45%" />
          <DewSkeleton variant="text" :lines="2" :gap="6" />
          <DewSkeleton variant="text" width="30%" />
        </div>
      </div>
    </div>
    <div v-else-if="articles.length" class="ma-list">
      <div v-for="a in articles" :key="a.id" class="ma-item">
        <div class="ma-item-main" @click="openItem(a)">
          <div class="ma-item-title">{{ a.title || '无标题草稿' }}</div>
          <div class="ma-item-intro">{{ a.introduction || '（暂无简介）' }}</div>
          <div class="ma-item-meta">{{ meta(a) }}</div>
        </div>
        <div class="ma-item-actions">
          <button class="ma-act" title="编辑" @click="editItem(a)"><EditPen /></button>
          <button class="ma-act ma-act--danger" title="删除" @click="onDelete(a)"><Delete /></button>
        </div>
      </div>
    </div>
    <div v-else class="ma-empty">
      {{ activeTab === 'draft' ? '还没有草稿，去写一篇吧' : '还没有发布过文章，写第一篇吧' }}
    </div>
  </DewCard>
</template>

<style scoped>
.ma-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.btn-icon { width: 14px; height: 14px; }

.ma-list { display: flex; flex-direction: column; gap: 8px; }
.ma-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  transition: background 0.25s var(--dew-bounce);
}
.ma-item:hover { background: var(--dew-card-inset-bg-hover); }
.ma-item-main { flex: 1; min-width: 0; cursor: pointer; }
.ma-item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ma-item-intro {
  font-size: 13px;
  color: var(--dew-text-muted);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ma-item-meta { font-size: 12px; color: var(--dew-text-faint); }

.ma-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.ma-act {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--dew-text-muted);
  transition: background 0.2s ease, color 0.2s ease;
}
.ma-act:hover { background: var(--dew-card-inset-border); color: var(--dew-text-heading); }
.ma-act--danger:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.08); }
.ma-act svg { width: 16px; height: 16px; }

.ma-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-faint);
}
</style>
