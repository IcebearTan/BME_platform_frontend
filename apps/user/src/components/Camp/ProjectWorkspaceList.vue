<template>
  <div><DewSkeleton v-if="loading" variant="rect" width="100%" height="140" /><div v-else-if="error" role="alert"><p>{{ error }}</p><DewButton size="sm" @click="load">重试</DewButton></div><template v-else-if="kind === 'announcements'"><p v-if="!rows.length" class="pwl-muted">本营暂无公告</p><article v-for="row in rows" :key="row.id" class="pwl-row"><h3>{{ row.title }}</h3><small>{{ row.published_at?.slice(0, 10) }}</small><p class="pwl-content">{{ row.content }}</p></article></template><template v-else><div v-for="row in rows" :key="row.user_id" class="pwl-roster"><span>{{ row.username }}</span><span>{{ row.role === 'leader' ? '负责人' : '成员' }}</span></div><p v-if="!rows.length" class="pwl-muted">暂无当前成员</p></template></div>
</template>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { DewButton, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
import api from '../../api'
const props = defineProps({ sid: Number, unitId: Number, kind: String })
const rows = ref([]), loading = ref(true), error = ref(''); let generation = 0
async function load() {
 const seq = ++generation; loading.value = true; error.value = ''; rows.value = []
 try { const d = props.kind === 'announcements' ? await campService.fetchAnnouncements(props.sid) : (await api.get(`/camp/units/${props.unitId}/members`)).data; if (seq === generation) rows.value = d.announcements || d.members || [] }
 catch (e) { if (seq === generation) error.value = e.response?.data?.message || '列表加载失败' }
 finally { if (seq === generation) loading.value = false }
}
watch(() => [props.sid, props.unitId, props.kind], load, { immediate: true }); onBeforeUnmount(() => generation++)
</script>
<style scoped>
.pwl-row { border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; }.pwl-row h3 { font-size: 16px; }.pwl-row small, .pwl-muted { color: var(--dew-text-muted); }.pwl-content { white-space: pre-wrap; overflow-wrap: anywhere; }.pwl-roster { display: flex; justify-content: space-between; border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; }
</style>
