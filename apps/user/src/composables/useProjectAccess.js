import {ref} from 'vue'
import {authSession} from '../api'
import {projectService} from '../domains/projects/service'
const available=ref(false)
let token=null,pending=null
export function useProjectAccess(){
  async function detect(){
    const current=authSession.getToken()
    if(!current){available.value=false;token=null;pending=null;return false}
    if(token===current&&pending)return pending
    token=current
    pending=projectService.status().then(r=>{if(token===current)available.value=r.enabled===true;return available.value}).catch(()=>{if(token===current)available.value=false;return false})
    return pending
  }
  return{available,detect}
}
