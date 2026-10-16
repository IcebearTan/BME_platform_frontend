<template><main class="project-target"><DewSkeleton v-if="loading" variant="rect" width="100%" height="180" /><p v-else role="alert">{{ error }}</p><DewButton v-if="!loading" @click="router.push('/my-projects')">我的项目</DewButton></main></template>
<script setup>
import {ref,watch,onBeforeUnmount} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {DewButton,DewSkeleton} from '@bme/dew-ui'
import {projectService} from './service'
const route=useRoute(),router=useRouter(),loading=ref(true),error=ref('');let sequence=0
watch(()=>route.params.eventId,async id=>{const seq=++sequence;loading.value=true;try{const d=await projectService.target(id);if(seq!==sequence)return;await router.replace({path:`/project-workspace/${d.project_id}`,query:{tab:d.tab,entry:d.entry||undefined,record:d.record_id||undefined,month:d.month||undefined}})}catch(e){if(seq===sequence)error.value=e.response?.data?.message||'项目通知已不可访问'}finally{if(seq===sequence)loading.value=false}},{immediate:true});onBeforeUnmount(()=>sequence++)
</script>
<style scoped>.project-target{max-width:1000px;margin:auto;padding:35px;color:var(--dew-text)}</style>
