<template>
  <div class="project-assessment"><header><h2>{{ labels[section] }}</h2><p>{{ binding.camp_name }} · {{ binding.status==='active' && binding.camp_status!=='archived' ? '本期工作' : '本期历史记录' }}</p></header>
    <DewSkeleton v-if="loading" variant="rect" width="100%" height="180" /><p v-else-if="error" role="alert">{{ error }} <DewButton @click="load">重试</DewButton></p>
    <template v-else-if="archive"><p>本期冻结记录 · 只读</p><template v-if="section==='camp-members'"><p v-for="member in archive.participants" :key="member.user_id">{{ member.name }} · {{ member.role==='leader'?'本期负责人':'成员' }}</p></template><template v-else-if="section==='camp-meetings'"><article v-for="meeting in archive.camp_meetings||[]" :key="meeting.id"><h3>{{ meeting.title }}</h3><p>{{ meeting.date }}</p><p class="pa-text">{{ meeting.content }}</p></article></template><template v-else-if="section==='camp-outcomes'"><article v-for="(outcome,index) in archive.camp_outcomes||[]" :key="index"><h3>{{ outcome.title }}</h3><p>{{ outcome.description }}</p><p>{{ outcome.status }}</p></article></template><template v-else><article v-for="node in archive.assessment_nodes||[]" :key="node.id" class="pa-node"><h3>{{ node.title }} · {{ node.node_complete?'已完成':'未完成' }}</h3><p>截止 {{ node.due_date || '未设置' }}</p><div v-for="submission in node.submissions" :key="submission.id"><h4>{{ submission.name }} · v{{ submission.version }}</h4><p class="pa-text">{{ submission.content }}</p><DewButton v-for="file in submission.attachments" :key="file.id" size="sm" type="ghost" @click="download(file)">{{ file.filename }}</DewButton></div><p v-for="evaluation in node.evaluations" :key="evaluation.member_user_id">{{ evaluation.name }} · {{ evaluation.score }}分 · {{ evaluation.comment }}</p></article></template></template>
    <template v-else-if="section==='camp-members'"><p v-for="member in binding.participants" :key="member.user_id">{{ member.name }} · {{ member.role==='leader'?'本期负责人':'成员' }}</p><p>本期名单调整在营期关联中提交；长期团队单独管理。</p></template>
    <TeacherMeetings v-else-if="section==='camp-meetings' && campView" :sid="binding.camp_id" category="project" :unit-id="binding.unit_id" />
    <CampMeetings v-else-if="section==='camp-meetings'" :sid="binding.camp_id" :unit-id="binding.unit_id" :camp-status="editable?binding.camp_status:'archived'" />
    <ProjectWorkspaceRead v-else-if="campView" :sid="binding.camp_id" :project-key="String(binding.unit_id)" :section="section==='camp-outcomes'?'outcomes':'delivery'" :focus-node="route.query.node" />
    <ProjectBoard v-else-if="section==='camp-outcomes'" :sid="binding.camp_id" :session="{status:editable?binding.camp_status:'archived'}" :units="[{unit_id:binding.unit_id,status:'active',leader_user_id:binding.leader_user_id}]" :role="binding.leader_user_id===myUserId?'leader':'member'" section="outcomes" workspace />
    <ProjectMilestones v-else :unit-id="binding.unit_id" :camp-status="editable?binding.camp_status:'archived'" :owner-user-id="binding.leader_user_id" :editable="editable" :draft-cache="draftCache" workspace />
  </div>
</template>
<script setup>
import {ref,computed,watch,onBeforeUnmount} from 'vue'
import {useRoute} from 'vue-router'
import {useStore} from 'vuex'
import {DewButton,DewSkeleton} from '@bme/dew-ui'
import {ElMessage} from 'element-plus'
import {campService} from '../../services/campService'
import {projectService} from './service'
import ProjectMilestones from '../../components/Camp/ProjectMilestones.vue'
import ProjectWorkspaceRead from '../../components/Camp/ProjectWorkspaceRead.vue'
import ProjectBoard from '../../components/Camp/ProjectBoard.vue'
import CampMeetings from '../../components/Camp/CampMeetings.vue'
import TeacherMeetings from '../../components/Camp/TeacherMeetings.vue'
const props=defineProps({project:Object,binding:Object,section:String,campView:Boolean,draftCache:Object}),route=useRoute(),store=useStore()
const labels={assessment:'本期考核','camp-members':'本期参营人员','camp-meetings':'本期组会','camp-outcomes':'本期成果'}
const loading=ref(true),error=ref(''),archive=ref(null),drafts=ref({}),myUserId=computed(()=>Number(store.state.user?.User_Id||store.state.user?.id||store.state.user?.user_id))
const editable=computed(()=>!props.campView&&props.project.can_write&&props.binding.status==='active'&&!['archived','deleted'].includes(props.binding.camp_status))
let sequence=0
async function load(){const seq=++sequence;loading.value=true;error.value='';archive.value=null;try{if(props.binding.status==='ended'){const d=await projectService.bindingArchive(props.project.id,props.binding.id);if(seq===sequence)archive.value=d.archive}}catch(e){if(seq===sequence)error.value=e.response?.data?.message||'本期记录不可访问'}finally{if(seq===sequence)loading.value=false}}
async function download(file){try{window.open(await campService.fetchSubmissionAttachmentUrl(file.id),'_blank','noopener')}catch(e){ElMessage.error(e.response?.data?.message||'附件不可访问')}}
watch(()=>[props.project.id,props.binding.id,props.binding.status],load,{immediate:true});onBeforeUnmount(()=>sequence++)
</script>
<style scoped>.project-assessment header p{font-size:13px;color:var(--dew-text-muted)}.pa-node{border-bottom:1px solid var(--dew-card-flat-border);padding:18px 0}.pa-node h3{font-size:17px}.pa-node h4{font-size:14px}.pa-text{white-space:pre-wrap;overflow-wrap:anywhere}</style>
