<template>
  <div class="project-members"><h2>长期成员</h2><p v-if="error" role="alert">{{ error }} <DewButton size="sm" @click="load">重试</DewButton></p><DewSkeleton v-else-if="loading" variant="rect" width="100%" height="160" /><template v-else><div v-for="member in rows" :key="member.user_id" class="pdm-row"><span>{{ member.name }}</span><span>{{ member.role === 'leader' ? '负责人' : '成员' }}</span><div v-if="project.can_manage && project.can_write && member.role !== 'leader'"><DewButton size="sm" type="ghost" @click="change(member, 'transfer')">转交负责人</DewButton><DewButton size="sm" type="ghost" @click="change(member, 'remove')">移出长期团队</DewButton></div></div><div v-if="project.can_manage && project.can_write" class="pdm-add"><DewInput v-model="keyword" placeholder="搜索成员姓名" @enter="search" /><DewButton size="sm" @click="search">搜索</DewButton></div><div v-for="candidate in candidates" :key="candidate.user_id" class="pdm-row"><span>{{ candidate.name }}</span><DewButton size="sm" :disabled="rows.some(r => r.user_id === candidate.user_id)" @click="change(candidate, 'add')">加入长期团队</DewButton></div></template></div>
</template>
<script setup>
import {ref,watch,onBeforeUnmount} from 'vue'
import {DewButton,DewInput,DewSkeleton} from '@bme/dew-ui'
import {ElMessage,ElMessageBox} from 'element-plus'
import {projectService,mutation} from './service'
const props=defineProps({project:Object}),emit=defineEmits(['changed'])
const rows=ref([]),candidates=ref([]),keyword=ref(''),loading=ref(true),error=ref(''),busy=ref(false)
let sequence=0
async function load(){const seq=++sequence;loading.value=true;error.value='';rows.value=[];try{const d=await projectService.members(props.project.id);if(seq===sequence)rows.value=d.members}catch(e){if(seq===sequence)error.value=e.response?.data?.message||'名单加载失败'}finally{if(seq===sequence)loading.value=false}}
async function search(){const seq=sequence;try{const d=await projectService.candidates(props.project.id,keyword.value);if(seq===sequence)candidates.value=d.users}catch(e){ElMessage.error(e.response?.data?.message||'搜索失败')}}
async function change(member,action){if(busy.value)return;let reason='';try{const r=await ElMessageBox.prompt(`${member.name} · ${action==='add'?'加入长期团队':action==='transfer'?'转交项目负责人':'移出长期团队'}`,'记录调整原因',{inputValidator:v=>!!v?.trim()||'请填写原因',confirmButtonText:'确认',cancelButtonText:'取消'});reason=r.value}catch{return}busy.value=true;try{await projectService.changeMember(props.project.id,mutation(props.project,{user_id:member.user_id,action,reason}));await load();emit('changed');ElMessage.success('成员已更新')}catch(e){ElMessage.error(e.response?.data?.message||'操作失败')}finally{busy.value=false}}
watch(()=>props.project.id,()=>{candidates.value=[];load()},{immediate:true});onBeforeUnmount(()=>sequence++)
</script>
<style scoped>.pdm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--dew-card-flat-border)}.pdm-add{display:flex;gap:10px;margin-top:24px}.pdm-add :deep(.dew-input){max-width:240px}</style>
