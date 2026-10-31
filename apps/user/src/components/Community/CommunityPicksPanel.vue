<template>
  <DewCard class="community-picks" :glass="true" no-hover size="lg">
    <template #header><div class="picks-heading"><span>社区发现</span><el-icon><ChatLineSquare /></el-icon></div></template>
    <section v-for="section in sections" :key="section.key" class="picks-section" :aria-label="section.title">
      <h3>{{ section.title }}<span>{{ section.subtitle }}</span></h3>
      <div v-if="loading" class="picks-loading"><DewSkeleton v-for="n in section.limit" :key="n" variant="text" /></div>
      <div v-else-if="error" class="picks-empty">暂时没能加载内容 <DewButton size="sm" type="ghost" @click="load">重试</DewButton></div>
      <ol v-else-if="data[section.key]?.length" class="picks-list">
        <li v-for="(item, index) in data[section.key]" :key="item.id">
          <a :href="router.resolve(`/community/thread/${item.id}`).href" target="_blank" rel="noopener" :title="item.title">
            <DewBadge :type="section.key === 'featured' ? 'info' : index === 0 ? 'warning' : 'neutral'">{{ section.key === 'featured' ? '荐' : String(index + 1).padStart(2, '0') }}</DewBadge>
            <span class="picks-title">{{ item.title }}</span>
          </a>
        </li>
      </ol>
      <p v-else class="picks-empty">{{ section.key === 'featured' ? '精选内容即将出现' : '暂时还没有热帖，来开启讨论吧' }}</p>
    </section>
    <template #footer><p class="picks-update" title="按近 24 小时的阅读人数、评论人数与点赞人数综合排序">近 24 小时 · 每 15 分钟更新</p></template>
  </DewCard>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ChatLineSquare } from '@element-plus/icons-vue'
import { DewCard, DewBadge, DewSkeleton, DewButton } from '@bme/dew-ui'
import api from '../../api'
const props = defineProps({ tagId: { type: [String, Number], default: '' } })
const router = useRouter()
const sections = [{ key: 'featured', title: '精选推荐', subtitle: '值得一看', limit: 3 }, { key: 'hot', title: '今日热帖', subtitle: '大家正在聊', limit: 5 }]
const data = ref({ featured: [], hot: [] }), loading = ref(true), error = ref(false)
let sequence = 0
async function load() {
  const current = ++sequence
  loading.value = true; error.value = false
  try {
    const response = await api.get('/community/discovery', { params: props.tagId ? { tag_id: props.tagId } : {} })
    if (current === sequence) data.value = response.data.data || { featured: [], hot: [] }
  } catch { if (current === sequence) error.value = true }
  finally { if (current === sequence) loading.value = false }
}
watch(() => props.tagId, load, { immediate: true })
onBeforeUnmount(() => { sequence++ })
</script>

<style scoped>
.picks-heading { display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 17px; color: var(--dew-text-heading); }
.picks-heading .el-icon { color: var(--dew-text-muted); }
.picks-section + .picks-section { border-top: 1px solid var(--dew-card-divider); margin-top: 20px; padding-top: 20px; }
.picks-section h3 { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; font-weight: 650; color: var(--dew-text-heading); margin: 0 0 12px; }
.picks-section h3 span { font-size: 11px; font-weight: 400; color: var(--dew-text-faint); }
.picks-list { padding: 0; margin: 0; list-style: none; }
.picks-list a { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 11px 0; color: var(--dew-text-heading); text-decoration: none; border-radius: var(--radius-md); }
.picks-list a:hover, .picks-list a:focus-visible { background: var(--dew-ghost-hover-bg); }
.picks-list a > :first-child { flex-shrink: 0; }
.picks-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.65; }
.picks-empty { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--dew-text-muted); font-size: 12px; line-height: 1.8; padding: 5px 0; }
.picks-loading { display: grid; gap: 18px; padding: 8px 0; }
.picks-update { margin: 0; color: var(--dew-text-faint); font-size: 11px; }
</style>
