<template>
  <DewCard variant="default" size="lg" :no-hover="true" class="profile-card">
    <template #header>
      <div class="head-row">
        <h3>我的导生名片</h3>
        <span v-if="locked || deadline" class="head-hint">
          {{ locked ? '志愿已截止，名片锁定' : `${deadline} 截止后锁定，届时不可再改` }}
        </span>
      </div>
    </template>

    <div class="profile-body">
      <!-- 左：编辑区 -->
      <div class="edit-col">
        <div class="photo-col">
          <div
            class="photo-box"
            :class="{ 'drag-over': dragOver, uploading, locked }"
            @click="pickPhoto"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
          >
            <img v-if="photoSrc" :src="photoSrc" alt="" />
            <div v-else class="photo-empty">
              <el-icon><Plus /></el-icon>
              <span>点击或拖入展示图片</span>
            </div>
            <transition name="fade">
              <div v-if="uploading || dragOver" class="photo-mask">
                {{ uploading ? '上传中…' : '松开即可上传' }}
              </div>
            </transition>
          </div>
          <span class="photo-hint">展示图片 · JPG / PNG · 不超过 5MB{{ locked ? '（已锁定）' : '' }}</span>
          <!-- 隐藏的 el-upload：pickPhoto 触发其文件选择 -->
          <el-upload
            ref="uploadRef"
            :show-file-list="false"
            :http-request="doUpload"
            accept="image/jpeg,image/png"
            class="photo-upload"
          >
            <span></span>
          </el-upload>
        </div>

        <!-- 表单 -->
        <div class="form-col">
          <div class="form-item">
            <label class="form-label">自我介绍 <span class="label-sub">最多 1000 字</span></label>
            <div class="bio-toolbar">
              <DewButton
                type="ghost"
                size="sm"
                :disabled="locked"
                @mousedown.prevent
                @click="openLinkDialog"
              >
                <el-icon aria-hidden="true"><Link /></el-icon>
                <span>插入链接</span>
              </DewButton>
            </div>
            <DewInput
              ref="bioInputRef"
              :model-value="form.bio"
              type="textarea"
              :rows="10"
              resize="none"
              placeholder="介绍你的经历、擅长的方向、能带学员做什么，以及你期待怎样的伙伴。"
              :disabled="locked"
              @update:model-value="updateBio"
            />
            <div class="bio-meta">
              <span class="form-hint">粘贴以 http:// 或 https:// 开头的完整网址，学员可直接点击访问</span>
              <span class="bio-counter">{{ Array.from(form.bio).length }}/1000</span>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">分类方向 <span class="label-sub">选择 1 个（学员将继承此方向与课程）</span></label>
            <div class="tag-chips">
              <DewButton
                v-for="t in msTags"
                :key="t"
                type="glass"
                size="sm"
                :active="form.tags.includes(t)"
                :aria-pressed="form.tags.includes(t)"
                :disabled="locked"
                @click="toggleTag(t)"
              >{{ t }}</DewButton>
            </div>
          </div>

          <div class="form-item form-row">
            <label class="form-label">名额上限</label>
            <div class="stepper">
              <DewButton type="ghost" size="sm" :disabled="locked || form.capacity === null || form.capacity <= 1" @click="form.capacity--">−</DewButton>
              <span class="stepper-num" :class="{ unlimited: form.capacity === null }">{{ form.capacity ?? '不限' }}</span>
              <DewButton type="ghost" size="sm" :disabled="locked || form.capacity === null || form.capacity >= 30" @click="form.capacity++">＋</DewButton>
              <DewButton type="ghost" size="sm" :active="form.capacity === null"
                :aria-pressed="form.capacity === null" :disabled="locked"
                @click="toggleUnlimited">不限</DewButton>
            </div>
            <span class="form-hint">最多愿意带几位学员，不设限就点「不限」</span>
          </div>

          <div class="form-actions">
            <DewButton type="glass" :disabled="locked" :loading="saving" @click="save">
              {{ hasProfile ? '保存修改' : '发布名片' }}
            </DewButton>
          </div>
        </div>
      </div>

      <!-- 右：学员视角实时预览（所见即所得，直接复用浏览页的海报卡） -->
      <div class="preview-col">
        <div class="preview-inner">
          <MsMentorCard :mentor="previewMentor" :index="0" size="lg" />
          <div class="preview-caption">学员浏览页实时预览</div>
        </div>
      </div>
    </div>
  </DewCard>

  <DewDialog v-model="linkDialogVisible" title="插入链接" width="min(520px, 94vw)">
    <div class="link-form">
      <div class="link-field">
        <span class="form-label">链接文字</span>
        <DewInput
          ref="linkLabelInputRef"
          v-model="linkForm.label"
          placeholder="例如：项目资料"
        />
      </div>
      <div class="link-field">
        <span class="form-label">链接地址</span>
        <DewInput v-model="linkForm.url" placeholder="https://example.com" />
      </div>
    </div>
    <template #footer>
      <div class="link-actions">
        <DewButton type="ghost" size="sm" @click="closeLinkDialog">取消</DewButton>
        <DewButton type="glass" size="sm" @click="insertBioLink">插入</DewButton>
      </div>
    </template>
  </DewDialog>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Link, Plus } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewDialog, DewInput } from '@bme/dew-ui';
import MsMentorCard from './MsMentorCard.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  msTags: { type: Array, default: () => [] },
  deadline: { type: String, default: '' },   // 志愿截止时间（锁定时点提示）
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(['saved']);

const store = useStore();
const uploadRef = ref(null);
const bioInputRef = ref(null);
const linkLabelInputRef = ref(null);
const saving = ref(false);
const uploading = ref(false);
const dragOver = ref(false);
const photoFilename = ref('');     // 相对路径（/camp/ms/photo/...）
const hasProfile = ref(false);

const form = ref({ bio: '', tags: [], capacity: null });   // capacity null=不限（09-11 起默认）
const lastCap = ref(8);                                     // 「不限」↔数字 来回切时记住上次数字
const linkDialogVisible = ref(false);
const linkForm = ref({ label: '', url: '' });

function toggleUnlimited() {
  if (form.value.capacity === null) {
    form.value.capacity = lastCap.value;
  } else {
    lastCap.value = form.value.capacity;
    form.value.capacity = null;
  }
}

const photoSrc = computed(() => assetUrl(photoFilename.value));

// 学员视角预览对象（matched=0：新名片尚未被选）
const previewMentor = computed(() => ({
  username: store.state.user?.User_Name || '我',
  photo_url: photoFilename.value,
  tags: form.value.tags,
  capacity: form.value.capacity,
  bio: form.value.bio,
  matched: 0,
  remaining: form.value.capacity === null ? null : form.value.capacity,
  full: false,
}));

function toggleTag(t) {
  // 09-12 方向制：单选——再点切换，点已选中项取消
  const i = form.value.tags.indexOf(t);
  if (i >= 0) {
    form.value.tags.splice(i, 1);
    return;
  }
  form.value.tags = [t];
}

function updateBio(value) {
  form.value.bio = String(value || '');
}

function openLinkDialog() {
  if (props.locked) return;
  linkDialogVisible.value = true;
  nextTick(() => linkLabelInputRef.value?.focus());
}

function closeLinkDialog() {
  linkDialogVisible.value = false;
  linkForm.value = { label: '', url: '' };
}

function insertBioLink() {
  const url = linkForm.value.url.trim();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    ElMessage.warning('请输入完整的 http/https 链接');
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    ElMessage.warning('链接仅支持 http/https 协议');
    return;
  }
  if (/[\s)]/.test(url)) {
    ElMessage.warning('链接地址不能包含空格或右括号');
    return;
  }

  const label = linkForm.value.label.trim() || url;
  if (/[[\]]/.test(label)) {
    ElMessage.warning('链接文字不能包含 [ 或 ]');
    return;
  }

  const markdown = `[${label}](${url})`;
  if (Array.from(form.value.bio).length + Array.from(markdown).length > 1000) {
    ElMessage.warning('插入链接后会超过 1000 字');
    return;
  }
  if (!bioInputRef.value?.insertText(markdown)) return;
  closeLinkDialog();
}

function pickPhoto() {
  if (props.locked) { ElMessage.info('志愿已截止，名片锁定'); return; }
  // 触发隐藏的 el-upload 文件选择
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click();
}

function onDrop(e) {
  dragOver.value = false;
  if (props.locked) { ElMessage.info('志愿已截止，名片锁定'); return; }
  const file = e.dataTransfer?.files?.[0];
  if (file) doUpload({ file });
}

async function doUpload(options) {
  const file = options.file;
  if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
    ElMessage.error('图片格式不支持，请上传 JPG 或 PNG 图片'); return;
  }
  if (file.size / 1024 / 1024 > 5) { ElMessage.error('图片超过 5MB，请选择更小的图片'); return; }
  uploading.value = true;
  try {
    const r = await campService.uploadMsPhoto(props.sid, file);
    photoFilename.value = r.photo_url || '';
    ElMessage.success('照片已上传，记得保存名片');
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '照片上传失败');
  } finally {
    uploading.value = false;
  }
}

async function save() {
  if (Array.from(form.value.bio.trim()).length > 1000) {
    ElMessage.warning('自我介绍不能超过 1000 字');
    return;
  }
  saving.value = true;
  try {
    const r = await campService.saveMsProfile(props.sid, {
      bio: form.value.bio, tags: form.value.tags, capacity: form.value.capacity,
    });
    ElMessage.success(hasProfile.value ? '名片已更新' : '名片已发布，学员可见');
    hasProfile.value = true;
    emit('saved', r.profile);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function load() {
  try {
    const r = await campService.fetchMsProfile(props.sid);
    const p = r.profile;
    hasProfile.value = !!p;
    photoFilename.value = p?.photo_url || '';
    form.value = {
      bio: p?.bio || '',
      tags: p?.tags || [],
      capacity: p?.capacity ?? null,
    };
  } catch {
    ElMessage.error('加载名片失败');
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.profile-card { width: 100%; }

.head-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-row h3 { margin: 0; font-size: 16px; font-weight: 600; }
.head-hint { font-size: 12px; color: var(--dew-text-muted); }
.bio-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.bio-counter { flex: none; font-size: 11px; color: var(--dew-text-faint); }
.bio-toolbar { display: flex; align-items: center; gap: 8px; }
.bio-toolbar :deep(.el-icon) { font-size: 14px; }
.link-form { display: flex; flex-direction: column; gap: 14px; }
.link-field { display: flex; flex-direction: column; gap: 6px; }
.link-actions { display: flex; justify-content: flex-end; gap: 10px; width: 100%; }

.profile-body { display: flex; gap: 32px; align-items: flex-start; }
@media (max-width: 860px) { .profile-body { flex-direction: column; } }

/* ── 左：编辑区 ── */
.edit-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
@media (max-width: 560px) { .edit-col { flex-direction: column; } }

.photo-col { flex: none; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.photo-box {
  position: relative;
  width: 100%;
  height: 168px;
  box-sizing: border-box;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1.5px dashed var(--dew-card-border, rgba(128, 128, 128, 0.25));
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.25s ease, transform 0.3s var(--dew-bounce, ease);
}
.photo-box:hover { transform: scale(1.02); border-color: var(--dew-text-faint); }
.photo-box.drag-over { border-color: var(--color-primary); border-style: solid; }
.photo-box.locked { cursor: not-allowed; }
.photo-box img { width: 100%; height: 100%; object-fit: contain; }
.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--dew-text-faint);
  font-size: 12px;
}
.photo-empty .el-icon { font-size: 24px; }
.photo-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.photo-hint { font-size: 11px; color: var(--dew-text-faint); }
.photo-upload { display: none; }

.form-col { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.form-item { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--dew-text); }
.label-sub { font-size: 11.5px; font-weight: 400; color: var(--dew-text-faint); margin-left: 4px; }
.form-row { flex-direction: row; align-items: center; gap: 14px; flex-wrap: wrap; }
.form-row .form-label { margin: 0; }
.form-hint { font-size: 12px; color: var(--dew-text-faint); }
.form-actions { display: flex; justify-content: flex-end; }

.tag-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chips :deep(.dew-btn) {
  min-width: 92px;
  border: 1px solid rgba(64, 158, 255, 0.28);
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}
.tag-chips :deep(.dew-btn--lit) {
  border: 2px solid var(--color-primary, #409eff) !important;
  background: rgba(64, 158, 255, 0.14) !important;
  color: var(--color-primary, #1677ff) !important;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12) !important;
  font-weight: 600;
}
.tag-chips :deep(.dew-btn:focus-visible) {
  outline: 2px solid var(--color-primary, #409eff);
  outline-offset: 2px;
}

/* 名额步进器 */
.stepper { display: flex; align-items: center; gap: 10px; }
.stepper-num {
  min-width: 34px;
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  color: var(--dew-text-heading);
  font-variant-numeric: tabular-nums;
}

/* ── 右：实时预览 ── */
.preview-col { flex: none; width: 288px; max-width: 100%; }
.preview-inner { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 10px; }
.preview-caption {
  text-align: center;
  font-size: 12px;
  color: var(--dew-text-faint);
}
@media (max-width: 860px) {
  .edit-col { width: 100%; }
  .preview-col { width: 288px; align-self: center; }
  .preview-inner { position: static; }
}
</style>
