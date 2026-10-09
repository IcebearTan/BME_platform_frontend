<template>
  <div class="xlab-root create-page">
    <MenuComponent />
    <main class="create-shell">
      <header class="create-header">
        <router-link to="/lab/projects" class="back-link"><el-icon><ArrowLeft /></el-icon> 项目广场</router-link>
        <div><h1>发布项目</h1><small>把项目整理成一份可以被发现、理解和继续讨论的公开档案。</small></div>
        <span class="draft-state"><i :class="{ saved: draftSaved }"></i>{{ draftSaved ? '草稿已保存' : '正在保存' }}</span>
      </header>
      <nav class="section-nav" aria-label="发布步骤"><a v-for="(item,index) in sections" :key="item.id" :href="`#${item.id}`"><span>{{ index+1 }}</span>{{ item.label }}</a></nav>
      <div class="workbench-layout">
        <form class="project-form" @submit.prevent="save">
          <DewCard id="basic" variant="flat" size="md" class="form-section">
            <div class="section-heading"><span>01</span><div><h2>基本信息</h2><p>决定项目在广场中如何被第一眼识别。</p></div></div>
            <div class="field-grid two-columns">
              <label><span>项目来源</span><div class="fixed-value"><el-icon><Lock /></el-icon>自由分享</div></label>
              <label><span>项目名称 *</span><input v-model="form.title" required maxlength="100" placeholder="例如：宿舍智能门锁"></label>
            </div>
            <label><span>一句话简介</span><input v-model="form.summary" maxlength="300" placeholder="用一句话说清项目解决了什么问题"></label>
            <div class="field-grid two-columns">
              <fieldset><legend>项目赛道 *</legend><DewButtonBar class="seg seg-track" :items="tracks" :model-value="form.track" size="sm" stretch @update:model-value="(value) => form.track = value" /></fieldset>
              <fieldset><legend>当前状态</legend><DewButtonBar class="seg seg-status" :items="statuses" :model-value="form.project_status" size="sm" stretch @update:model-value="(value) => form.project_status = value" /></fieldset>
            </div>
            <label><span>标签 <small>逗号分隔，最多 6 个</small></span><input v-model="form.tagsText" placeholder="硬件, 医工交叉, 物联网"></label>
          </DewCard>
          <DewCard id="content" variant="flat" size="md" class="form-section">
            <div class="section-heading"><span>02</span><div><h2>项目内容</h2><p>用封面和完整介绍建立项目的上下文。</p></div></div>
            <label><span>项目封面 <small>16:9，jpg/png/webp，最大 10MB</small></span></label>
            <div class="cover-upload">
              <img v-if="cover" :src="cover.url" alt="封面预览"><div v-else><el-icon><Picture /></el-icon><span>添加项目封面</span></div>
              <button type="button" class="cover-act" @click="chooseCover">{{cover?'替换封面':'选择图片'}}</button>
              <button v-if="cover" type="button" class="remove-media" aria-label="移除封面" @click="removeCover"><el-icon><Delete /></el-icon></button>
            </div>
            <label><span>完整项目介绍</span><textarea v-model="form.description" rows="9" placeholder="介绍问题背景、解决方案、当前成果和下一步计划"></textarea></label>
            <label><span>项目图片 <small>最多 9 张，仅本次发布上传</small></span></label>
            <div class="gallery-upload"><div v-for="(image,index) in images" :key="image.url" class="gallery-item"><img :src="image.url" alt="项目图片预览"><button type="button" :aria-label="`移除第 ${index+1} 张图片`" @click="removeImage(index)"><el-icon><Close /></el-icon></button></div><button v-if="images.length<9" type="button" class="gallery-add" @click="chooseImages"><el-icon><Plus /></el-icon><span>添加图片</span></button></div>
          </DewCard>
          <DewCard id="resources" variant="flat" size="md" class="form-section">
            <div class="section-heading"><span>03</span><div><h2>成员与资源</h2><p>让访问者知道谁参与，以及在哪里继续了解项目。</p></div></div>
            <label><span>团队成员 <small>逗号分隔</small></span><input v-model="form.membersText" placeholder="成员昵称或姓名"></label>
            <div class="resource-grid">
              <label><span>GitHub</span><input v-model="form.github" type="url" placeholder="GitHub 项目地址"></label>
              <label><span>Demo</span><input v-model="form.demo" type="url" placeholder="在线演示地址"></label>
              <label><span>Docs</span><input v-model="form.docs" type="url" placeholder="项目文档地址"></label>
            </div>
            <label><span>其他资料 <small>每行：名称 空格 链接</small></span><textarea v-model="form.assetsText" rows="4" placeholder="研究报告 项目链接"></textarea></label>
          </DewCard>
          <DewCard id="finish" variant="flat" size="md" class="form-section">
            <div class="section-heading"><span>04</span><div><h2>发布确认</h2><p>项目会以“自由分享”来源直接出现在项目广场。</p></div></div>
            <div class="publish-checks"><p><el-icon><CircleCheck /></el-icon>发布后自动打开详情档案</p><p><el-icon><CircleCheck /></el-icon>发布成功后清除文字草稿</p><p class="warn"><el-icon><Warning /></el-icon>图片不会写入浏览器草稿</p></div>
            <div class="form-actions"><router-link to="/lab/projects" class="cancel-link">取消</router-link><DewButton class="btn-publish" :disabled="saving||!canPublish" @click="save">{{saving?'发布中':'发布项目'}}<el-icon><Right /></el-icon></DewButton></div>
          </DewCard>
        </form>
        <DewCard variant="flat" size="sm" class="preview-panel">
          <div class="preview-head"><span>实时预览</span><div><button type="button" :class="{active:previewMode==='card'}" @click="previewMode='card'">卡片</button><button type="button" :class="{active:previewMode==='detail'}" @click="previewMode='detail'">详情</button></div></div>
          <DewCard v-if="previewMode==='card'" class="preview-card" no-hover>
            <div class="preview-cover"><img v-if="cover" :src="cover.url" alt=""><span v-else>{{previewTitle.charAt(0)}}</span><b>自由分享</b></div>
            <div class="preview-card-body"><small :class="`pv-${form.project_status}`"><i></i>{{statusText}} · {{trackText}}</small><h2>{{previewTitle}}</h2><p>{{previewSummary}}</p><div class="preview-tags"><span v-for="tag in previewTags" :key="tag">{{tag}}</span></div><footer><div class="pv-creator"><i>我</i><span>正在发布的作者</span></div><b>0 浏览</b></footer></div>
          </DewCard>
          <div v-else class="preview-detail">
            <div class="detail-cover"><img v-if="cover" :src="cover.url" alt=""><span v-else>{{previewTitle.charAt(0)}}</span></div>
            <small>自由分享 · {{statusText}}</small><h2>{{previewTitle}}</h2><p>{{previewSummary}}</p><div class="preview-tags"><span v-for="tag in previewTags" :key="tag">{{tag}}</span></div>
            <section><b>项目简介</b><p>{{form.description||'完整项目介绍将在这里展示。'}}</p></section><section><b>项目赛道</b><p>{{trackText}}</p></section>
          </div>
        </DewCard>
      </div>
      <input ref="coverInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="pickCover">
      <input ref="galleryInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="pickImages">
    </main>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, CircleCheck, Close, Delete, Lock, Picture, Plus, Right, Warning } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButton, DewButtonBar, DewCard } from '@bme/dew-ui';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';
const DRAFT_KEY='xlab-project-publish-draft-v2';
const router=useRouter();
const sections=[{id:'basic',label:'基本信息'},{id:'content',label:'项目内容'},{id:'resources',label:'成员与资源'},{id:'finish',label:'发布确认'}];
const statuses=[{label:'构思中',value:'idea'},{label:'进行中',value:'ongoing'},{label:'已完成',value:'done'}];
const tracks=[{label:'大创',value:'innovation'},{label:'比赛',value:'competition'},{label:'实验室',value:'lab'},{label:'课程项目',value:'course'},{label:'个人探索',value:'personal'},{label:'其他',value:'other'}];
const emptyForm={title:'',summary:'',description:'',project_status:'ongoing',track:'other',tagsText:'',membersText:'',github:'',demo:'',docs:'',assetsText:''};
const form=ref({...emptyForm});const saving=ref(false);const draftSaved=ref(true);const previewMode=ref('card');const coverInput=ref(null);const galleryInput=ref(null);const cover=ref(null);const images=ref([]);let saveDraftTimer=null;
const allowed=['image/jpeg','image/png','image/webp'];
const parseList=(text)=>text.split(/[,，]/).map((value)=>value.trim()).filter(Boolean);
const previewTitle=computed(()=>form.value.title.trim()||'未命名项目');
const previewSummary=computed(()=>form.value.summary.trim()||'一句清晰的项目简介会显示在这里。');
const previewTags=computed(()=>parseList(form.value.tagsText).slice(0,3));
const statusText=computed(()=>statuses.find((item)=>item.value===form.value.project_status)?.label||'进行中');
const trackText=computed(()=>tracks.find((item)=>item.value===form.value.track)?.label||'其他');
const canPublish=computed(()=>Boolean(form.value.title.trim()&&form.value.track));
function chooseCover(){coverInput.value?.click();}
function chooseImages(){galleryInput.value?.click();}
function valid(file){if(!allowed.includes(file.type)||file.size>10*1024*1024){ElMessage.error('图片仅支持 jpg/png/webp，且不能超过 10MB');return false;}return true;}
function removeCover(){if(cover.value)URL.revokeObjectURL(cover.value.url);cover.value=null;}
function removeImage(index){URL.revokeObjectURL(images.value[index].url);images.value.splice(index,1);}
function pickCover(event){const file=event.target.files?.[0];event.target.value='';if(!file||!valid(file))return;removeCover();cover.value={file,url:URL.createObjectURL(file)};}
function pickImages(event){const files=[...(event.target.files||[])];event.target.value='';if(files.length>9-images.value.length)ElMessage.warning('最多上传 9 张项目图片');for(const file of files.slice(0,9-images.value.length))if(valid(file))images.value.push({file,url:URL.createObjectURL(file)});}
function parseAssets(text){return text.split('\n').map((line)=>line.trim()).filter(Boolean).slice(0,7).map((line)=>{const parts=line.split(/\s+/);const raw=parts.pop();const label=parts.join(' ').trim();if(!label||!raw)throw new Error('其他资料格式应为：名称 空格 链接');return{label:label.slice(0,40),url:new URL(raw).href};});}
function buildLinks(){const links=[];if(form.value.github)links.push({label:'GitHub',url:new URL(form.value.github).href});if(form.value.demo)links.push({label:'Demo',url:new URL(form.value.demo).href});if(form.value.docs)links.push({label:'Docs',url:new URL(form.value.docs).href});return[...links,...parseAssets(form.value.assetsText)].slice(0,10);}
async function save(){
  if(saving.value||!canPublish.value)return;let links;
  try{links=buildLinks();}catch(error){ElMessage.error(error.message||'请检查资源链接格式');return;}
  saving.value=true;
  try{
    const response=await showcaseService.createProject({title:form.value.title.trim(),summary:form.value.summary.trim()||null,description:form.value.description.trim()||null,project_status:form.value.project_status,track:form.value.track,tags:parseList(form.value.tagsText).slice(0,6),members:parseList(form.value.membersText),links});
    const id=response.project?.id;let imageFailed=false;
    if(id){try{if(cover.value)await showcaseService.uploadCover(id,cover.value.file);}catch{imageFailed=true;}try{if(images.value.length)await showcaseService.uploadImages(id,images.value.map((image)=>image.file));}catch{imageFailed=true;}}
    localStorage.removeItem(DRAFT_KEY);
    ElMessage[imageFailed?'warning':'success'](imageFailed?'项目已发布，部分图片未上传成功，可稍后补充':response.message||'项目已发布');
    await router.push({path:'/lab/projects',query:id?{project:String(id)}:{}});
  }catch(error){ElMessage.error(error.response?.data?.message||'发布失败');}
  finally{saving.value=false;}
}
watch(form,()=>{draftSaved.value=false;clearTimeout(saveDraftTimer);saveDraftTimer=setTimeout(()=>{localStorage.setItem(DRAFT_KEY,JSON.stringify(form.value));draftSaved.value=true;},350);},{deep:true});
onMounted(()=>{try{const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(draft&&typeof draft==='object')form.value={...emptyForm,...draft};}catch{localStorage.removeItem(DRAFT_KEY);}});
onBeforeUnmount(()=>{clearTimeout(saveDraftTimer);removeCover();images.value.forEach((image)=>URL.revokeObjectURL(image.url));});
</script>
<style scoped>
/* XLAB 发布工作台：框架层复用 DewUI（DewCard 分组卡/预览卡、DewButtonBar 赛道状态选择、
   DewButton 发布按钮），品牌色经 class 扩展注入；文本输入保留原生（maxlength 约束，
   DewInput 暂不透传该属性），视觉与 DewInput 同参数 */
.create-page{position:relative;min-height:100dvh;color:var(--xg-ink);background:var(--xg-bg)}
.create-shell{box-sizing:border-box;width:100%;max-width:1280px;margin:0 auto;padding:34px clamp(16px,3vw,32px) 96px}
.create-header{display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:24px;padding-bottom:20px;border-bottom:1px solid var(--xg-line)}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--xg-purple-deep);font-size:13px;font-weight:600;text-decoration:none;transition:color .15s}.back-link:hover{color:var(--xg-purple)}
.create-header h1{margin:0;font-size:28px;font-weight:750;letter-spacing:.01em}.create-header small{display:block;margin-top:8px;color:var(--xg-sub);font-size:13px}
.draft-state{display:flex;align-items:center;gap:7px;color:var(--xg-faint);font-size:12px}.draft-state i{width:7px;height:7px;background:var(--xg-line-strong);border-radius:50%}.draft-state i.saved{background:var(--xg-purple);box-shadow:0 0 0 3px rgb(var(--xg-purple-rgb) / .15)}
.section-nav{position:sticky;top:0;z-index:20;display:grid;margin-top:16px;grid-template-columns:repeat(4,1fr);background:var(--xg-nav-bg);border:1px solid var(--xg-line);border-radius:var(--xg-radius-sm);backdrop-filter:blur(10px);overflow:hidden}
.section-nav a{display:flex;min-height:44px;padding:0 14px;align-items:center;gap:8px;color:var(--xg-sub);font-size:13px;font-weight:500;text-decoration:none;transition:background .15s,color .15s}
.section-nav a span{display:grid;width:20px;height:20px;place-items:center;color:var(--xg-purple-deep);background:var(--xg-purple-soft);border-radius:999px;font-size:11px;font-weight:700}
.section-nav a:hover{color:var(--xg-ink);background:var(--xg-surface)}
.workbench-layout{display:grid;margin-top:16px;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:24px;align-items:start}
.project-form{min-width:0}
/* 表单分组：DewCard(flat) 提供框架 */
.create-page .form-section+.form-section{margin-top:14px}
.create-page .form-section{scroll-margin-top:66px}
.create-page .form-section :deep(.dew-card__body){padding:20px 22px}
.section-heading{display:flex;margin-bottom:20px;gap:12px;align-items:flex-start}
.section-heading>span{display:grid;width:28px;height:28px;flex:0 0 auto;place-items:center;color:var(--xg-purple-deep);background:var(--xg-purple-soft);border-radius:9px;font-size:12px;font-weight:700}
.section-heading h2{margin:0;font-size:16px;font-weight:700}
.section-heading p{margin:4px 0 0;color:var(--xg-faint);font-size:12px}
.project-form label{display:flex;margin-top:16px;flex-direction:column;gap:7px;color:var(--xg-sub);font-size:12.5px;font-weight:500}
.project-form label:first-child{margin-top:0}
.project-form small{color:var(--xg-faint);font-weight:400;font-size:11px}
.project-form input,.project-form textarea{box-sizing:border-box;width:100%;padding:10px 12px;color:var(--xg-ink);background:var(--xg-bg);border:1px solid var(--xg-line);border-radius:var(--xg-radius-sm);font:13px/1.6 inherit;outline:none;transition:border-color .15s,box-shadow .15s}
.project-form input:focus,.project-form textarea:focus{border-color:var(--xg-purple);box-shadow:var(--xg-focus-ring);background:var(--xg-surface)}
.project-form input::placeholder,.project-form textarea::placeholder{color:var(--xg-faint)}
.project-form textarea{resize:vertical}
.field-grid{display:grid;gap:14px}.two-columns{grid-template-columns:1fr 1.7fr}
.fixed-value{display:flex;min-height:40px;padding:0 12px;align-items:center;gap:8px;color:var(--xg-pink-deep);background:var(--xg-pink-soft);border:1px solid transparent;border-radius:var(--xg-radius-sm);font-size:12.5px;font-weight:500}
fieldset{min-width:0;margin:16px 0 0;padding:0;border:0}
legend{margin-bottom:8px;color:var(--xg-sub);font-size:12.5px;font-weight:500}
/* 赛道/状态选择：DewButtonBar，品牌色 class 扩展（绿/粉） */
.create-page .seg-track :deep(.dew-bar__item--active){background:var(--xg-purple-soft);color:var(--xg-purple-deep)}
.create-page .seg-status :deep(.dew-bar__item--active){background:var(--xg-pink-soft);color:var(--xg-pink-deep)}
.cover-upload{position:relative;display:grid;margin-top:8px;aspect-ratio:16/6;place-items:center;overflow:hidden;background:var(--xg-bg);border:1.5px dashed var(--xg-line-strong);border-radius:var(--xg-radius-sm);transition:border-color .15s}
.cover-upload:hover{border-color:var(--xg-purple)}
.cover-upload>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cover-upload>div{display:flex;align-items:center;flex-direction:column;gap:8px;color:var(--xg-faint);font-size:12.5px}
.cover-upload>div .el-icon{font-size:26px}
.cover-act{position:absolute;right:12px;bottom:12px;min-height:32px;padding:0 13px;color:var(--xg-ink);background:var(--xg-badge-bg);border:0;border-radius:999px;box-shadow:var(--xg-shadow-soft);font-size:12px;font-weight:600;cursor:pointer}
.cover-upload .remove-media{top:12px;right:12px;bottom:auto;display:grid;width:32px;padding:0;place-items:center;color:#fff;background:rgba(23,23,28,.8);border:0;border-radius:999px;cursor:pointer}
.gallery-upload{display:grid;margin-top:8px;grid-template-columns:repeat(4,1fr);gap:8px}
.gallery-item,.gallery-add{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--xg-bg);border:1px solid var(--xg-line);border-radius:var(--xg-radius-sm)}
.gallery-item img{width:100%;height:100%;object-fit:cover}
.gallery-item button{position:absolute;top:5px;right:5px;display:grid;width:25px;height:25px;padding:0;place-items:center;color:#fff;background:rgba(23,23,28,.8);border:0;border-radius:999px;cursor:pointer}
.gallery-add{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--xg-faint);background:transparent;border:1.5px dashed var(--xg-line-strong);font-size:11.5px;cursor:pointer;transition:border-color .15s,color .15s}
.gallery-add:hover{border-color:var(--xg-purple);color:var(--xg-purple-deep)}
.resource-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.publish-checks{display:grid;gap:10px}
.publish-checks p{display:flex;margin:0;align-items:center;gap:8px;color:var(--xg-sub);font-size:13px}
.publish-checks .el-icon{color:var(--xg-purple)}
.publish-checks p.warn .el-icon{color:var(--xg-pink)}
.form-actions{display:flex;margin-top:24px;justify-content:flex-end;gap:10px}
.cancel-link{display:inline-flex;min-height:38px;padding:0 16px;align-items:center;justify-content:center;color:var(--xg-sub);border:1px solid var(--xg-line-control);border-radius:var(--xg-radius-sm);font-size:13px;font-weight:600;text-decoration:none;transition:border-color .15s,color .15s}
.cancel-link:hover{border-color:var(--xg-line-strong);color:var(--xg-ink)}
/* 发布按钮：DewButton + 品牌绿 class 扩展 */
.create-page .btn-publish{background:var(--xg-pink)!important;border-color:var(--xg-pink)!important;color:var(--xg-on-pink)!important;box-shadow:0 4px 14px rgb(var(--xg-pink-rgb) / .22)!important}
.create-page .btn-publish:hover:not(:disabled){background:var(--xg-pink-hover)!important;border-color:var(--xg-pink-hover)!important}
.create-page .btn-publish:disabled{opacity:.45}
/* ── 预览面板：DewCard(flat)；卡片模式与广场 p-card 同框架（DewCard + padding0）── */
.create-page .preview-panel{position:sticky;top:66px}
.create-page .preview-panel :deep(.dew-card__body){display:flex;flex-direction:column;gap:10px}
.preview-head{display:flex;min-height:30px;align-items:center;justify-content:space-between;color:var(--xg-faint);font-size:12px;font-weight:500}
.preview-head div{display:flex;gap:6px}
.preview-head button{min-height:28px;padding:0 12px;color:var(--xg-sub);background:transparent;border:1px solid var(--xg-line);border-radius:999px;font-size:12px;cursor:pointer}
.preview-head button.active{color:var(--xg-ink);background:var(--xg-surface-2);border-color:transparent;font-weight:600}
.create-page .preview-card :deep(.dew-card__body){padding:0!important}
.preview-card{overflow:hidden}
.preview-cover{position:relative;display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;background:var(--xg-cover-bg)}
.preview-cover img{width:100%;height:100%;object-fit:cover}
.preview-cover>span{color:var(--xg-placeholder);font-size:52px;font-weight:800}
.preview-cover>b{position:absolute;top:10px;left:10px;padding:3px 10px;color:var(--xg-pink-deep);background:var(--xg-badge-bg);border-radius:999px;font-size:11px;font-weight:600;box-shadow:0 1px 6px rgba(23,23,28,.08)}
.preview-card-body{display:flex;flex-direction:column;padding:14px 15px 13px;min-height:148px}
.preview-card-body small{display:inline-flex;align-items:center;gap:6px;color:var(--xg-faint);font-size:11.5px}
.preview-card-body small i{width:6px;height:6px;background:var(--xg-faint);border-radius:50%}
.preview-card-body small.pv-ongoing{color:var(--xg-purple-deep)}.preview-card-body small.pv-ongoing i{background:var(--xg-purple);box-shadow:0 0 0 3px rgb(var(--xg-purple-rgb) / .15)}
.preview-card-body small.pv-done{color:var(--xg-pink-deep)}.preview-card-body small.pv-done i{background:var(--xg-pink)}
.preview-card h2{margin:8px 0 0;color:var(--xg-ink);font-size:15.5px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
.preview-card-body p{display:-webkit-box;margin:6px 0 0;overflow:hidden;color:var(--xg-sub);font-size:12.5px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.preview-tags{display:flex;margin-top:10px;flex-wrap:wrap;gap:5px}
.preview-tags span{padding:2px 9px;color:var(--xg-sub);background:var(--xg-surface-2);border-radius:6px;font-size:11px}
.preview-card footer{display:flex;margin-top:auto;padding-top:11px;align-items:center;gap:7px;border-top:1px solid var(--xg-line-soft);color:var(--xg-faint);font-size:11.5px}
.pv-creator{display:flex;align-items:center;gap:7px}
.pv-creator i{display:grid;width:24px;height:24px;place-items:center;color:var(--xg-ink);background:var(--xg-surface-2);border-radius:50%;font-style:normal;font-size:11px;font-weight:600}
.preview-card footer b{margin-left:auto;color:var(--xg-faint);font-weight:500}
.preview-detail{overflow:hidden;background:var(--xg-surface);border:1px solid var(--xg-line);border-radius:var(--xg-radius);padding-bottom:16px}
.detail-cover{position:relative;display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;background:var(--xg-cover-bg)}
.detail-cover img{width:100%;height:100%;object-fit:cover}
.detail-cover>span{color:var(--xg-placeholder);font-size:52px;font-weight:800}
.preview-detail>small{display:block;margin:14px 14px 0;color:var(--xg-sub);font-size:12px}
.preview-detail>h2{margin:9px 14px 0;font-size:20px;font-weight:750}
.preview-detail>p{margin:8px 14px 0;color:var(--xg-sub);font-size:12.5px;line-height:1.7}
.preview-detail>.preview-tags{margin:12px 14px 0}
.preview-detail section{margin:16px 14px 0;padding-top:12px;border-top:1px solid var(--xg-line-soft)}
.preview-detail section b{color:var(--xg-ink);font-size:12.5px;font-weight:700}
.preview-detail section p{margin:6px 0 0;color:var(--xg-sub);font-size:12px;line-height:1.7}
@media(max-width:1080px){.workbench-layout{grid-template-columns:minmax(0,1fr) 320px}.create-header{grid-template-columns:110px 1fr auto}.two-columns,.resource-grid{grid-template-columns:1fr}}
@media(max-width:820px){.create-shell{padding:24px 14px 60px}.create-header{grid-template-columns:1fr}.draft-state{position:absolute;top:34px;right:14px}.section-nav{overflow-x:auto;grid-template-columns:repeat(4,minmax(120px,1fr))}.workbench-layout{grid-template-columns:1fr}.create-page .preview-panel{position:relative;top:auto;order:-1}.create-page .form-section :deep(.dew-card__body){padding:18px 16px}.gallery-upload{grid-template-columns:repeat(3,1fr)}}
@media(max-width:520px){.section-nav a{min-width:110px}.gallery-upload{grid-template-columns:repeat(2,1fr)}.form-actions>*{flex:1}}
</style>
