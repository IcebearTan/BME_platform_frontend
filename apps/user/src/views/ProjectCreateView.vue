<template>
  <div class="xlab-root create-page">
    <aside class="create-rail" aria-hidden="true"><div><span>X</span><small>LAB</small></div></aside>
    <MenuComponent />
    <main class="create-shell">
      <header class="create-header">
        <router-link to="/lab/projects" class="back-link"><el-icon><ArrowLeft /></el-icon> PROJECT PLAZA</router-link>
        <div><p>XLAB / PUBLISH WORKBENCH</p><h1>发布项目<span>_</span></h1><small>把项目整理成一份可以被发现、理解和继续讨论的公开档案。</small></div>
        <span class="draft-state"><i></i>{{ draftSaved ? '草稿已保存' : '正在保存' }}</span>
      </header>
      <nav class="section-nav" aria-label="发布步骤"><a v-for="(item,index) in sections" :key="item.id" :href="`#${item.id}`"><span>0{{ index+1 }}</span>{{ item.label }}</a></nav>
      <div class="workbench-layout">
        <form class="project-form" @submit.prevent="save">
          <section id="basic" class="form-section">
            <div class="section-heading"><span>01</span><div><h2>基本信息</h2><p>决定项目在广场中如何被第一眼识别。</p></div></div>
            <div class="field-grid two-columns">
              <label><span>项目来源</span><div class="fixed-value"><el-icon><Lock /></el-icon>自由分享</div></label>
              <label><span>项目名称 *</span><input v-model="form.title" required maxlength="100" placeholder="例如：宿舍智能门锁"></label>
            </div>
            <label><span>一句话简介</span><input v-model="form.summary" maxlength="300" placeholder="用一句话说清项目解决了什么问题"></label>
            <div class="field-grid two-columns">
              <fieldset><legend>项目赛道 *</legend><div class="segment-grid tracks"><button v-for="item in tracks" :key="item.value" type="button" :class="{active:form.track===item.value}" @click="form.track=item.value">{{ item.label }}</button></div></fieldset>
              <fieldset><legend>当前状态</legend><div class="segment-grid"><button v-for="item in statuses" :key="item.value" type="button" :class="{active:form.project_status===item.value}" @click="form.project_status=item.value">{{ item.label }}</button></div></fieldset>
            </div>
            <label><span>标签 <small>逗号分隔，最多 6 个</small></span><input v-model="form.tagsText" placeholder="硬件, 医工交叉, 物联网"></label>
          </section>
          <section id="content" class="form-section">
            <div class="section-heading"><span>02</span><div><h2>项目内容</h2><p>用封面和完整介绍建立项目的上下文。</p></div></div>
            <label><span>项目封面 <small>16:9，jpg/png/webp，最大 10MB</small></span></label>
            <div class="cover-upload">
              <img v-if="cover" :src="cover.url" alt="封面预览"><div v-else><el-icon><Picture /></el-icon><span>添加项目封面</span></div>
              <button type="button" @click="chooseCover">{{cover?'替换封面':'选择图片'}}</button>
              <button v-if="cover" type="button" class="remove-media" aria-label="移除封面" @click="removeCover"><el-icon><Delete /></el-icon></button>
            </div>
            <label><span>完整项目介绍</span><textarea v-model="form.description" rows="9" placeholder="介绍问题背景、解决方案、当前成果和下一步计划"></textarea></label>
            <label><span>项目图片 <small>最多 9 张，仅本次发布上传</small></span></label>
            <div class="gallery-upload"><div v-for="(image,index) in images" :key="image.url" class="gallery-item"><img :src="image.url" alt="项目图片预览"><button type="button" :aria-label="`移除第 ${index+1} 张图片`" @click="removeImage(index)"><el-icon><Close /></el-icon></button></div><button v-if="images.length<9" type="button" class="gallery-add" @click="chooseImages"><el-icon><Plus /></el-icon><span>添加图片</span></button></div>
          </section>
          <section id="resources" class="form-section">
            <div class="section-heading"><span>03</span><div><h2>成员与资源</h2><p>让访问者知道谁参与，以及在哪里继续了解项目。</p></div></div>
            <label><span>团队成员 <small>逗号分隔</small></span><input v-model="form.membersText" placeholder="成员昵称或姓名"></label>
            <div class="resource-grid">
              <label><span>GitHub</span><input v-model="form.github" type="url" placeholder="GitHub 项目地址"></label>
              <label><span>Demo</span><input v-model="form.demo" type="url" placeholder="在线演示地址"></label>
              <label><span>Docs</span><input v-model="form.docs" type="url" placeholder="项目文档地址"></label>
            </div>
            <label><span>其他资料 <small>每行：名称 空格 链接</small></span><textarea v-model="form.assetsText" rows="4" placeholder="研究报告 项目链接"></textarea></label>
          </section>
          <section id="finish" class="form-section finish-section">
            <div class="section-heading"><span>04</span><div><h2>发布完成</h2><p>项目会以“自由分享”来源直接出现在项目广场。</p></div></div>
            <div class="publish-checks"><p><el-icon><CircleCheck /></el-icon>发布后自动打开详情抽屉</p><p><el-icon><CircleCheck /></el-icon>发布成功后清除文字草稿</p><p><el-icon><Warning /></el-icon>图片不会写入浏览器草稿</p></div>
            <div class="form-actions"><router-link to="/lab/projects">取消</router-link><button type="submit" :disabled="saving||!canPublish">{{saving?'发布中':'发布项目'}}<el-icon><Right /></el-icon></button></div>
          </section>
        </form>
        <aside class="preview-panel">
          <div class="preview-head"><span>LIVE PREVIEW</span><div><button type="button" :class="{active:previewMode==='card'}" @click="previewMode='card'">卡片</button><button type="button" :class="{active:previewMode==='detail'}" @click="previewMode='detail'">详情</button></div></div>
          <div v-if="previewMode==='card'" class="preview-card">
            <div class="preview-cover"><img v-if="cover" :src="cover.url" alt=""><span v-else>{{previewTitle.charAt(0)}}</span><b>自由分享</b></div>
            <div class="preview-card-body"><small>{{statusText}} / {{trackText}}</small><h2>{{previewTitle}}</h2><p>{{previewSummary}}</p><div class="preview-tags"><span v-for="tag in previewTags" :key="tag">{{tag}}</span></div><footer><i>X</i><span>YOU</span><b>0 VIEWS</b></footer></div>
          </div>
          <div v-else class="preview-detail">
            <div class="detail-cover"><img v-if="cover" :src="cover.url" alt=""><span v-else>{{previewTitle.charAt(0)}}</span></div>
            <small>自由分享 / {{statusText}}</small><h2>{{previewTitle}}</h2><p>{{previewSummary}}</p><div class="preview-tags"><span v-for="tag in previewTags" :key="tag">{{tag}}</span></div>
            <section><b>OVERVIEW</b><p>{{form.description||'完整项目介绍将在这里展示。'}}</p></section><section><b>TRACK</b><p>{{trackText}}</p></section>
          </div>
        </aside>
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
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';
const DRAFT_KEY='xlab-project-publish-draft-v2';
const router=useRouter();
const sections=[{id:'basic',label:'基本信息'},{id:'content',label:'项目内容'},{id:'resources',label:'成员与资源'},{id:'finish',label:'发布完成'}];
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
.create-page{--bg:#05070a;--panel:#0a0e13;--line:rgba(176,201,216,.17);--blue:#80b9d8;min-height:100dvh;color:#edf4f7;background:var(--bg)}
.create-rail{position:fixed;inset:0 auto 0 0;width:118px;overflow:hidden;border-right:1px solid var(--line);background:#030507}.create-rail::before{position:absolute;top:12%;right:24px;width:230px;height:72%;content:'';border:1px solid rgba(159,207,234,.28);border-radius:50%;background:linear-gradient(90deg,rgba(4,7,10,.25),rgba(4,7,10,.8)),url('../assets/xlab-space-hero.png') center/cover}.create-rail div{position:absolute;right:13px;bottom:20%;display:flex;align-items:flex-end;gap:4px;transform:rotate(-90deg);transform-origin:right bottom}.create-rail span{font:900 32px Arial Black,Arial,sans-serif}.create-rail small{padding-bottom:4px;font:9px ui-monospace,monospace}
.create-shell{box-sizing:border-box;width:calc(100% - 118px);max-width:1520px;margin-left:118px;padding:86px clamp(22px,4vw,58px) 80px}.create-header{display:grid;grid-template-columns:170px 1fr auto;align-items:end;gap:28px;padding-bottom:26px;border-bottom:1px solid var(--line)}.back-link{display:flex;align-items:center;gap:7px;color:rgba(199,218,229,.48);font:9px ui-monospace,monospace;text-decoration:none}.create-header p{margin:0;color:var(--blue);font:9px ui-monospace,monospace}.create-header h1{margin:8px 0 0;font-size:clamp(34px,4vw,54px);line-height:1}.create-header h1 span{color:var(--blue)}.create-header small{display:block;margin-top:12px;color:rgba(205,220,229,.52);font-size:11px}.draft-state{display:flex;align-items:center;gap:7px;color:rgba(198,216,226,.45);font:9px ui-monospace,monospace}.draft-state i{width:5px;height:5px;background:#76b7db;border-radius:50%;box-shadow:0 0 8px #76b7db}
.section-nav{position:sticky;top:0;z-index:20;display:grid;margin-top:18px;grid-template-columns:repeat(4,1fr);background:rgba(5,7,10,.92);border:1px solid var(--line);backdrop-filter:blur(12px)}.section-nav a{display:flex;min-height:42px;padding:0 12px;align-items:center;gap:8px;color:rgba(213,227,235,.6);border-left:1px solid var(--line);font-size:10px;text-decoration:none}.section-nav a:first-child{border-left:0}.section-nav a span{color:var(--blue);font:8px ui-monospace,monospace}.section-nav a:hover{color:#fff;background:rgba(126,184,216,.08)}
.workbench-layout{display:grid;margin-top:18px;grid-template-columns:minmax(0,1fr) minmax(300px,390px);gap:18px;align-items:start}.project-form{min-width:0}.form-section{padding:28px;background:var(--panel);border:1px solid var(--line);scroll-margin-top:62px}.form-section+.form-section{margin-top:12px}.section-heading{display:flex;margin-bottom:26px;gap:14px}.section-heading>span{color:var(--blue);font:10px ui-monospace,monospace}.section-heading h2{margin:0;font-size:20px}.section-heading p{margin:6px 0 0;color:rgba(199,217,227,.45);font-size:10px}
.project-form label{display:flex;margin-top:18px;flex-direction:column;gap:8px;color:rgba(217,230,237,.68);font-size:10px}.project-form label:first-child{margin-top:0}.project-form small{color:rgba(182,203,215,.38);font-weight:400}.project-form input,.project-form textarea{box-sizing:border-box;width:100%;padding:11px 12px;color:#f0f6f8;background:#080b0f;border:1px solid rgba(161,193,211,.22);font:12px/1.5 inherit;outline:none}.project-form input:focus,.project-form textarea:focus{border-color:var(--blue)}.project-form textarea{resize:vertical}.field-grid{display:grid;gap:14px}.two-columns{grid-template-columns:1fr 1.7fr}.fixed-value{display:flex;min-height:39px;padding:0 12px;align-items:center;gap:8px;color:rgba(219,232,239,.6);background:#080b0f;border:1px solid rgba(161,193,211,.15)}
fieldset{min-width:0;margin:20px 0 0;padding:0;border:0}legend{margin-bottom:8px;color:rgba(217,230,237,.68);font-size:10px}.segment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.segment-grid button{min-height:38px;padding:5px;color:rgba(211,225,233,.52);background:#080b0f;border:1px solid rgba(161,193,211,.18);font-size:10px;cursor:pointer}.segment-grid button.active{color:#eef8fc;background:rgba(119,180,215,.12);border-color:#78b5d7}
.cover-upload{position:relative;display:grid;margin-top:8px;aspect-ratio:16/6;place-items:center;overflow:hidden;background:#080c11;border:1px dashed rgba(144,191,217,.3)}.cover-upload>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cover-upload>div{display:flex;align-items:center;flex-direction:column;gap:8px;color:rgba(190,211,223,.38)}.cover-upload>div .el-icon{font-size:25px}.cover-upload>button{position:absolute;right:12px;bottom:12px;min-height:32px;padding:0 11px;color:#071018;background:#e4f2f8;border:0;font-size:10px;cursor:pointer}.cover-upload .remove-media{top:12px;right:12px;bottom:auto;display:grid;width:32px;padding:0;place-items:center;color:#fff;background:rgba(7,10,14,.75);border:1px solid rgba(255,255,255,.2)}
.gallery-upload{display:grid;margin-top:8px;grid-template-columns:repeat(4,1fr);gap:7px}.gallery-item,.gallery-add{position:relative;aspect-ratio:4/3;overflow:hidden;background:#080c11;border:1px solid rgba(145,187,211,.2)}.gallery-item img{width:100%;height:100%;object-fit:cover}.gallery-item button{position:absolute;top:5px;right:5px;display:grid;width:25px;height:25px;padding:0;place-items:center;color:#fff;background:rgba(5,8,11,.8);border:0;cursor:pointer}.gallery-add{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:rgba(190,211,223,.42);font-size:9px;cursor:pointer}.resource-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.publish-checks{display:grid;gap:10px}.publish-checks p{display:flex;margin:0;align-items:center;gap:8px;color:rgba(208,224,233,.58);font-size:11px}.publish-checks .el-icon{color:#87bfdd}.form-actions{display:flex;margin-top:26px;justify-content:flex-end;gap:10px}.form-actions a,.form-actions button{display:inline-flex;min-height:40px;padding:0 16px;align-items:center;justify-content:center;gap:8px;font-size:11px;text-decoration:none}.form-actions a{color:rgba(215,229,236,.62);border:1px solid rgba(161,193,211,.22)}.form-actions button{color:#071018;background:#e7f3f8;border:0;font-weight:700;cursor:pointer}.form-actions button:disabled{opacity:.4;cursor:not-allowed}
.preview-panel{position:sticky;top:62px;padding:14px;background:#080b0f;border:1px solid var(--line)}.preview-head{display:flex;min-height:34px;align-items:center;justify-content:space-between;color:rgba(188,209,221,.4);font:8px ui-monospace,monospace}.preview-head div{display:flex}.preview-head button{min-height:27px;padding:0 9px;color:rgba(204,220,229,.48);background:transparent;border:1px solid rgba(155,188,206,.16);font-size:9px;cursor:pointer}.preview-head button.active{color:#eaf5fa;border-color:#76afd0}.preview-card,.preview-detail{overflow:hidden;background:#0b1016;border:1px solid rgba(156,190,209,.18)}.preview-cover,.detail-cover{position:relative;display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;background:repeating-linear-gradient(0deg,transparent 0 24px,rgba(134,185,214,.08) 25px),#0e1820}.preview-cover img,.detail-cover img{width:100%;height:100%;object-fit:cover}.preview-cover>span,.detail-cover>span{color:rgba(196,229,247,.1);font:900 74px Arial Black,Arial,sans-serif;-webkit-text-stroke:1px rgba(163,210,237,.35)}.preview-cover>b{position:absolute;top:8px;left:8px;padding:3px 6px;color:#cceafa;background:rgba(4,8,11,.8);border:1px solid rgba(127,187,220,.32);font:7px ui-monospace,monospace}.preview-card-body{padding:14px}.preview-card small,.preview-detail>small{color:rgba(186,208,221,.4);font:8px ui-monospace,monospace}.preview-card h2,.preview-detail h2{margin:9px 0 0;font-size:17px;overflow-wrap:anywhere}.preview-card p,.preview-detail p{margin:7px 0 0;color:rgba(202,220,230,.55);font-size:10px;line-height:1.55;overflow-wrap:anywhere}.preview-tags{display:flex;margin-top:11px;flex-wrap:wrap;gap:4px}.preview-tags span{padding:3px 5px;color:rgba(206,222,231,.5);border:1px solid rgba(156,190,209,.14);font:7px ui-monospace,monospace}.preview-card footer{display:flex;margin-top:14px;padding-top:12px;align-items:center;gap:7px;border-top:1px solid rgba(156,190,209,.14);color:rgba(194,214,225,.4);font:7px ui-monospace,monospace}.preview-card footer i{display:grid;width:22px;height:22px;place-items:center;color:#d8eef9;background:#13222c;border-radius:50%;font-style:normal}.preview-card footer b{margin-left:auto}.preview-detail{padding-bottom:18px}.preview-detail>small,.preview-detail>h2,.preview-detail>p,.preview-detail>.preview-tags,.preview-detail>section{display:block;margin-right:14px;margin-left:14px}.preview-detail>small{margin-top:15px}.preview-detail section{margin-top:18px;padding-top:12px;border-top:1px solid rgba(156,190,209,.14)}.preview-detail section b{color:#9fcce4;font:8px ui-monospace,monospace}
@media(max-width:1080px){.workbench-layout{grid-template-columns:minmax(0,1fr) 320px}.create-header{grid-template-columns:130px 1fr auto}.two-columns,.resource-grid{grid-template-columns:1fr}.preview-panel{top:54px}}
@media(max-width:820px){.create-rail{display:none}.create-shell{width:100%;margin-left:0;padding:76px 14px 52px}.create-header{grid-template-columns:1fr}.draft-state{position:absolute;top:84px;right:14px}.section-nav{overflow-x:auto;grid-template-columns:repeat(4,minmax(120px,1fr))}.workbench-layout{grid-template-columns:1fr}.preview-panel{position:relative;top:auto;order:-1}.form-section{padding:22px 16px}.gallery-upload{grid-template-columns:repeat(3,1fr)}}
@media(max-width:520px){.create-header h1{font-size:36px}.section-nav a{min-width:110px}.segment-grid.tracks{grid-template-columns:repeat(2,1fr)}.gallery-upload{grid-template-columns:repeat(2,1fr)}.form-actions>*{flex:1}.preview-panel{display:none}}
</style>
