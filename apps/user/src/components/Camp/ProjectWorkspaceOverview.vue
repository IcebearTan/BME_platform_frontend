<template>
  <div class="pwo">
    <DewSkeleton v-if="loading" variant="rect" width="100%" height="200" />
    <div v-else-if="error" role="alert"><p>{{ error }}</p><DewButton size="sm" @click="load">重试</DewButton></div>
    <template v-else>
      <div class="pwo-summary"><span><strong>{{ nodes.length ? completed + ' / ' + nodes.length : '—' }}</strong> 节点完成</span><span>当前职责：{{ role === 'leader' ? '项目负责人' : '项目成员' }}</span></div>
      <DewCard variant="flat" no-hover class="pwo-next">
        <span class="pwo-label">{{ archived ? '结营复盘' : role === 'leader' ? '需要你处理' : '下一步工作' }}</span>
        <h3>{{ next ? next.title : nodes.length ? '全部节点已完成' : '尚未配置交付节点' }}</h3>
        <p v-if="next">{{ next.due_date ? `截止 ${next.due_date}` : '未设置截止日期' }} · {{ role === 'leader' ? '查看成员材料与节点评价' : '查看交付要求、提交材料和本人评价' }}</p>
        <p v-else-if="!nodes.length">{{ role === 'leader' ? '先建立项目节点计划，再开始交付。' : '项目负责人建立节点后，会在这里展示。' }}</p>
        <DewButton size="sm" @click="$emit('navigate', 'delivery', next?.id)">{{ archived ? '查看节点记录' : nodes.length ? '进入节点与交付' : '查看节点计划' }}</DewButton>
      </DewCard>
      <section><h3>项目节点</h3><button v-for="node in nodes" :key="node.id" class="pwo-node" @click="$emit('navigate', 'delivery', node.id)"><span>{{ node.title }}<small>{{ node.due_date || '未设置截止' }}</small></span><span>{{ node.node_complete ? '已完成' : node.status === 'returned' ? '待补交' : node.status === 'submitted' ? '已提交' : '未完成' }}</span></button></section>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
const props = defineProps({ unitId: Number, role: String, archived: Boolean })
defineEmits(['navigate'])
const nodes = ref([]), loading = ref(true), error = ref('')
let sequence = 0
const completed = computed(() => nodes.value.filter(n => n.node_complete).length)
const next = computed(() => nodes.value.find(n => !n.node_complete))
async function load() {
  const seq = ++sequence; loading.value = true; error.value = ''; nodes.value = []
  try { const d = await campService.fetchMilestones(props.unitId); if (seq === sequence) nodes.value = d.milestones || [] }
  catch (e) { if (seq === sequence) error.value = e.response?.data?.message || '项目概览加载失败' }
  finally { if (seq === sequence) loading.value = false }
}
watch(() => props.unitId, load, { immediate: true }); onBeforeUnmount(() => sequence++)
</script>
<style scoped>
.pwo { display: flex; flex-direction: column; gap: 24px; }.pwo-summary { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; color: var(--dew-text-muted); }.pwo-summary strong { font-size: 26px; color: var(--dew-text-heading); }.pwo-next { border: 1px solid var(--dew-card-flat-border); }.pwo-next h3 { margin: 12px 0; font-size: 18px; }.pwo-next p { color: var(--dew-text-muted); font-size: 13px; margin-bottom: 18px; }.pwo-label { color: var(--color-primary); font-size: 12px; }.pwo h3 { font-size: 16px; }.pwo-node { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 0; border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; color: var(--dew-text); background: transparent; text-align: left; cursor: pointer; font: inherit; }.pwo-node small { display: block; color: var(--dew-text-muted); margin-top: 4px; }
</style>
