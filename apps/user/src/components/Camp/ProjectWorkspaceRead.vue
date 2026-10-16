<template>
  <div class="pwr">
    <DewSkeleton v-if="loading" variant="rect" width="100%" height="220" />
    <div v-else-if="error" role="alert"><p>{{ error }}</p><DewButton size="sm" @click="load">重试</DewButton></div>
    <template v-else-if="project">
      <p class="pwr-note">管理老师只读查看 · {{ project.leader_name }}负责 · {{ project.member_count }}人</p>
      <template v-if="section === 'overview'"><div class="pwr-stat">{{ project.completed_nodes }} / {{ project.node_count }} 节点完成</div><h3>{{ project.current_node }}</h3><p class="pwr-note">下一截止 {{ project.next_due_date || '未设置' }}</p><DewButton size="sm" @click="$emit('navigate', 'delivery')">查看节点材料与评价</DewButton></template>
      <template v-else-if="section === 'members'"><div v-for="(member, i) in project.members" :key="member.user_id || i" class="pwr-row"><span>{{ member.name }}</span><span>{{ member.role === 'leader' ? '负责人' : '成员' }}</span></div></template>
      <template v-else-if="section === 'outcomes'"><p v-if="!project.outcomes?.length" class="pwr-note">尚无登记成果</p><div v-for="(item, i) in project.outcomes" :key="i" class="pwr-item"><h3>{{ item.title }}</h3><p>{{ item.description }}</p><span>{{ outcomeText[item.status] || item.status }}</span></div></template>
      <template v-else><p v-if="!project.nodes.length" class="pwr-note">项目负责人尚未配置节点</p><el-collapse v-model="opened"><el-collapse-item v-for="node in project.nodes" :key="node.stage_key" :name="node.stage_key"><template #title>{{ node.title }} · {{ node.node_complete ? '已完成' : '未完成' }}</template><p>截止 {{ node.due_date || '未设置' }}</p><p>{{ node.requirement }}</p><div v-for="sub in node.submissions || []" :key="sub.id" class="pwr-item"><h3>{{ sub.name }} · v{{ sub.version }}</h3><p class="pwr-content">{{ sub.content }}</p><DewButton v-for="a in sub.attachments" :key="a.id" size="sm" type="ghost" @click="download(a)">{{ a.filename }}</DewButton></div><p v-for="(e, i) in node.evaluations || []" :key="i">{{ e.name || e.member_user_id }} · {{ e.score }}分 · {{ e.comment }}</p></el-collapse-item></el-collapse></template>
    </template>
  </div>
</template>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { DewButton, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
const props = defineProps({ sid: Number, projectKey: [String, Number], section: String, focusNode: [String, Number] })
defineEmits(['navigate'])
const project = ref(null), loading = ref(true), error = ref(''), opened = ref([])
const outcomeText = { submitted: '待核验', verified: '已核验', rejected: '已驳回' }
let generation = 0
async function load() {
  const seq = ++generation; loading.value = true; project.value = null; error.value = ''
  try { const d = await campService.fetchProjectDashboardDetail(props.sid, props.projectKey); if (seq === generation) { project.value = d.project; opened.value = d.project.nodes.filter(n => props.focusNode ? String(n.id) === String(props.focusNode) : !n.node_complete).slice(0, 1).map(n => n.stage_key) } }
  catch (e) { if (seq === generation) error.value = e.response?.data?.message || '项目详情加载失败' }
  finally { if (seq === generation) loading.value = false }
}
async function download(a) { try { const url = await campService.fetchSubmissionAttachmentUrl(a.id); window.open(url, '_blank', 'noopener') } catch (e) { ElMessage.error(e.response?.data?.message || '附件下载失败') } }
watch(() => props.focusNode, () => { if (project.value) opened.value = project.value.nodes.filter(n => String(n.id) === String(props.focusNode)).map(n => n.stage_key) })
watch(() => [props.sid, props.projectKey], load, { immediate: true }); onBeforeUnmount(() => generation++)
</script>
<style scoped>
.pwr { color: var(--dew-text); }.pwr-note { color: var(--dew-text-muted); font-size: 13px; margin-bottom: 20px; }.pwr-stat { font-size: 24px; margin-bottom: 20px; }.pwr-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--dew-card-flat-border); }.pwr-item { border-top: 1px solid var(--dew-card-flat-border); padding: 14px 0; }.pwr-item h3 { font-size: 14px; }.pwr-content { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
