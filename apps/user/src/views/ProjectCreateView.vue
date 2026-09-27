<template>
  <div class='xlab-root lab-create'>
    <div class='lab-nav-space'></div>
    <MenuComponent />
    <main class='lab-create-main'>
      <router-link class='lab-back' to='/lab/projects'>← PROJECT PLAZA</router-link>
      <div class='lab-create-heading'><span>// NEW_PROJECT</span><h1>分享我的项目</h1><p>把正在进行或已经完成的作品发布到 XLAB。</p></div>
      <form class='lab-create-form' @submit.prevent='save'>
        <label for='lab-title'>01 项目名称 *</label><input id='lab-title' v-model='form.title' class='xl-input' required maxlength='100' placeholder='如：宿舍智能门锁'>
        <label>02 封面 <small>16:9，jpg/png/webp，≤10MB</small></label>
        <div class='xl-up-grid'><div v-if='cover' class='xl-up-cell cover'><img :src='cover.url' alt='封面预览'><button type='button' class='xl-up-del' aria-label='移除封面' @click='removeCover'>×</button></div><button v-else type='button' class='xl-up-add cover-cell' @click='coverInput.click()'>+ COVER</button></div>
        <label>03 项目图片 <small>最多 9 张</small></label>
        <div class='xl-up-grid'><div v-for='(image, index) in images' :key='image.url' class='xl-up-cell'><img :src='image.url' alt='项目图片预览'><button type='button' class='xl-up-del' aria-label='移除图片' @click='removeImage(index)'>×</button></div><button v-if='images.length < 9' type='button' class='xl-up-add' @click='galleryInput.click()'>+ ADD</button></div>
        <label for='lab-summary'>04 一句话简介</label><input id='lab-summary' v-model='form.summary' class='xl-input' maxlength='300' placeholder='列表页展示'>
        <label for='lab-description'>05 详细介绍</label><textarea id='lab-description' v-model='form.description' class='xl-input' rows='5' placeholder='做了什么、怎么做的、给谁用'></textarea>
        <label>06 状态</label><div class='xl-chip-row'><button v-for='item in statuses' :key='item.value' type='button' :class='["xl-chip", { on: form.project_status === item.value }]' @click='form.project_status = item.value'>{{ item.label }}</button></div>
        <label for='lab-tags'>07 标签 <small>逗号分隔，最多 6 个</small></label><input id='lab-tags' v-model='form.tagsText' class='xl-input' placeholder='硬件, 物联网'>
        <label for='lab-members'>08 成员</label><input id='lab-members' v-model='form.membersText' class='xl-input' placeholder='成员昵称，逗号分隔'>
        <label for='lab-links'>09 资料链接 <small>每行一条：名称 空格 链接</small></label><textarea id='lab-links' v-model='form.linksText' class='xl-input' rows='3' placeholder='开源仓库 https://github.com/...'></textarea>
        <p class='lab-create-note'>自由分享免审上架；营期项目请由负责人在营期工作台发布。</p>
        <div class='lab-create-actions'><router-link to='/lab/projects' class='xl-btn ghost'>取消</router-link><button class='xl-btn primary' type='submit' :disabled='saving || !form.title.trim()'>{{ saving ? '发布中…' : '发布项目' }}</button></div>
      </form>
      <input ref='coverInput' type='file' accept='image/jpeg,image/png,image/webp' hidden @change='pickCover'>
      <input ref='galleryInput' type='file' accept='image/jpeg,image/png,image/webp' multiple hidden @change='pickImages'>
    </main>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MenuComponent from '../components/MenuComponent.vue';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';

const router = useRouter();
const statuses = [{ label: '构思中', value: 'idea' }, { label: '进行中', value: 'ongoing' }, { label: '已完成', value: 'done' }];
const form = ref({ title: '', summary: '', description: '', project_status: 'ongoing', tagsText: '', membersText: '', linksText: '' });
const saving = ref(false);
const coverInput = ref(null);
const galleryInput = ref(null);
const cover = ref(null);
const images = ref([]);
const allowed = ['image/jpeg', 'image/png', 'image/webp'];
const parseList = (text) => text.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
function valid(file) {
  if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片仅支持 jpg/png/webp，且不能超过 10MB'); return false;
  }
  return true;
}
function removeCover() { if (cover.value) URL.revokeObjectURL(cover.value.url); cover.value = null; }
function removeImage(index) { URL.revokeObjectURL(images.value[index].url); images.value.splice(index, 1); }
function pickCover(event) {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file || !valid(file)) return;
  removeCover(); cover.value = { file, url: URL.createObjectURL(file) };
}
function pickImages(event) {
  const files = [...(event.target.files || [])]; event.target.value = '';
  if (files.length > 9 - images.value.length) ElMessage.warning('最多上传 9 张项目图片');
  for (const file of files.slice(0, 9 - images.value.length)) if (valid(file)) images.value.push({ file, url: URL.createObjectURL(file) });
}
onBeforeUnmount(() => { removeCover(); images.value.forEach((image) => URL.revokeObjectURL(image.url)); });
function parseLinks(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 10);
  const links = lines.map((line) => {
    const match = line.match(/^(.*?)\s+(https?:\/\/\S+)$/);
    if (!match || !match[1].trim()) return null;
    try {
      const url = new URL(match[2]);
      return { label: match[1].trim().slice(0, 40), url: url.href };
    } catch { return null; }
  });
  if (links.some((link) => !link)) throw new Error('资料链接格式应为：名称 空格 https://链接');
  return links;
}
async function save() {
  if (saving.value || !form.value.title.trim()) return;
  let links;
  try { links = parseLinks(form.value.linksText); }
  catch (error) { ElMessage.error(error.message); return; }
  saving.value = true;
  try {
    const response = await showcaseService.createProject({
      title: form.value.title.trim(), summary: form.value.summary.trim() || null,
      description: form.value.description.trim() || null, project_status: form.value.project_status,
      tags: parseList(form.value.tagsText).slice(0, 6), members: parseList(form.value.membersText), links,
    });
    const id = response.project?.id;
    let imageFailed = false;
    if (id) {
      try { if (cover.value) await showcaseService.uploadCover(id, cover.value.file); } catch { imageFailed = true; }
      try { if (images.value.length) await showcaseService.uploadImages(id, images.value.map((image) => image.file)); } catch { imageFailed = true; }
    }
    ElMessage[imageFailed ? 'warning' : 'success'](imageFailed ? '项目已发布，部分图片未上传成功，可在详情页补传' : response.message || '已发布');
    await router.push({ path: '/lab/projects', query: id ? { project: String(id) } : {} });
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发布失败');
  } finally { saving.value = false; }
}
</script>

<style scoped>
.lab-nav-space{height:60px}.lab-create-main{max-width:800px;margin:auto;padding:32px 20px 90px}.lab-back{color:var(--xl-green);font:12px var(--xl-mono);text-decoration:none}.lab-create-heading{margin:38px 0 30px;border-bottom:1px solid var(--xl-line);padding-bottom:24px}.lab-create-heading span{color:var(--xl-green);font:12px var(--xl-mono)}.lab-create-heading h1{font-size:clamp(32px,6vw,56px);margin:12px 0}.lab-create-heading p,.lab-create-note{color:var(--xl-dim);font-size:13px}.lab-create-form{display:flex;flex-direction:column;gap:10px}.lab-create-form label{font:12px var(--xl-mono);margin-top:12px}.lab-create-form small{color:var(--xl-faint);font-size:11px}.lab-create-form .xl-up-cell.cover,.lab-create-form .xl-up-add.cover-cell{width:160px;height:90px}.lab-create-form .xl-up-add{height:96px}.lab-create-actions{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:16px}.lab-create-actions a{text-decoration:none}.lab-create-note{line-height:1.6}@media(max-width:600px){.lab-create-actions{justify-content:stretch}.lab-create-actions>*{flex:1;text-align:center}}
</style>
