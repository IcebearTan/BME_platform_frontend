<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from '@element-plus/icons-vue'
import { DewCard } from '../ui'
import api from '../../api'

const router = useRouter()
const favorites = ref([])
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    const res = await api({ method: 'get', url: '/discussions/article/favorites/me' })
    favorites.value = res.data.data || []
  } catch (e) {
    console.error('加载收藏失败', e)
  } finally {
    loading.value = false
  }
}

const open = (f) => {
  if (f.article_version === 2) {
    router.push({ path: '/article-v2', query: { id: f.article_id } })
  } else {
    router.push({ path: '/article', query: { Article_Id: f.article_id } })
  }
}

const fmt = (t) => t ? new Date(t.replace(' ', 'T')).toLocaleDateString('zh-CN') : ''

onMounted(load)
</script>

<template>
  <DewCard size="lg" divided class="fav-card">
    <template #header>
      <div class="fav-title"><el-icon><Star /></el-icon> 我的收藏</div>
    </template>

    <div v-if="loading" class="fav-empty">加载中...</div>
    <div v-else-if="favorites.length" class="fav-list">
      <div
        v-for="f in favorites"
        :key="f.article_id"
        class="fav-item"
        @click="open(f)"
      >
        <div class="fav-item-title">{{ f.title }}</div>
        <div class="fav-item-intro">{{ f.introduction }}</div>
        <div class="fav-item-meta">
          <span>{{ f.author }}</span>
          <span>·</span>
          <span>{{ fmt(f.publish_time) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="fav-empty">还没有收藏任何文章</div>
  </DewCard>
</template>

<style scoped>
.fav-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.fav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fav-item {
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  cursor: pointer;
  transition: background 0.25s var(--dew-bounce);
}

.fav-item:hover {
  background: var(--dew-card-inset-bg-hover);
}

.fav-item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
  margin-bottom: 4px;
}

.fav-item-intro {
  font-size: 13px;
  color: var(--dew-text-muted);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fav-item-meta {
  font-size: 12px;
  color: var(--dew-text-faint);
  display: flex;
  gap: 6px;
}

.fav-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-faint);
}
</style>
