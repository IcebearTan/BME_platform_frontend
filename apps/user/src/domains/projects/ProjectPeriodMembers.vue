<template>
  <section class="period-members">
    <header><div><h3>本期名单 · {{ binding.participants?.length || 0 }} 人</h3><p>参加 {{ binding.camp_name }} 的项目成员与本期负责人。</p></div><DewButton v-if="binding.can_request_participants" size="sm" @click="open">申请调整本期名单</DewButton><DewButton v-if="binding.can_manage_participants" size="sm" type="ghost" @click="$emit('manage')">管理本期人员</DewButton></header>
    <p v-if="binding.change_pending" role="status" class="pending">名单调整申请待老师确认，当前仍按下方名单参与。</p>
    <div class="member-list"><article v-for="member in binding.participants" :key="member.user_id"><span class="avatar" aria-hidden="true">{{ member.name?.slice(-2) }}</span><strong>{{ member.name }}</strong><DewTag size="sm">{{ member.role === 'leader' ? '本期负责人' : '本期成员' }}</DewTag></article></div>
    <p class="hint">本期人员调整不会将成员移出长期项目团队。</p>
    <DewDialog v-model="dialog" title="申请调整本期名单" width="580px"><p>选择本期参与人员，申请经老师确认后生效。</p><label v-for="member in members" :key="member.user_id" class="choice"><input v-model="picked" type="checkbox" :value="member.user_id">{{ member.name }}{{ member.role === 'leader' ? ' · 长期负责人' : '' }}</label><label class="reason">调整原因<DewInput v-model="reason" placeholder="说明本期人员调整" /></label><template #footer><DewButton :loading="saving" :disabled="!picked.length || !reason.trim()" @click="submit">提交申请</DewButton></template></DewDialog>
  </section>
</template>
<script setup>
import {ref,onBeforeUnmount} from 'vue'
import {DewButton,DewTag,DewDialog,DewInput} from '@bme/dew-ui'
import {ElMessage} from 'element-plus'
import {projectService,mutation} from './service'
const props=defineProps({project:Object,binding:Object}),emit=defineEmits(['changed','manage'])
const dialog=ref(false),members=ref([]),picked=ref([]),reason=ref(''),saving=ref(false)
let sequence=0
async function open(){const seq=++sequence;try{const data=await projectService.members(props.project.id);if(seq!==sequence)return;members.value=data.members.filter(m=>m.role);picked.value=props.binding.participants.map(m=>m.user_id);reason.value='';dialog.value=true}catch(e){if(seq===sequence)ElMessage.error(e.response?.data?.message||'团队名单加载失败')}}
async function submit(){if(saving.value)return;saving.value=true;try{await projectService.requestParticipants(props.project.id,props.binding.id,mutation(props.project,{expected_binding_version:props.binding.version,user_ids:picked.value,reason:reason.value}));dialog.value=false;emit('changed');ElMessage.success('本期名单调整已提交')}catch(e){ElMessage.error(e.response?.data?.message||'申请失败')}finally{saving.value=false}}
onBeforeUnmount(()=>sequence++)
</script>
<style scoped>
.period-members header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.period-members h3{margin:0;font-size:17px}.period-members p{font-size:13px;color:var(--dew-text-muted);line-height:1.7}.member-list{margin:20px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.member-list article{display:flex;align-items:center;gap:10px;padding:16px;border:1px solid var(--dew-card-flat-border);border-radius:8px}.member-list strong{font-size:14px;flex:1}.avatar{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);font-size:12px}.choice{display:flex;align-items:center;gap:8px;margin:14px 0}.reason{display:flex;flex-direction:column;gap:8px;margin-top:20px}.pending{padding:12px;background:var(--color-primary-light);border-radius:8px}
</style>
