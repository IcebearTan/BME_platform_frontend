<template>
  <DewCard variant="default" size="lg" :no-hover="true" class="profile-card">
    <template #header>
      <div class="head-row">
        <h3>我的导生名片</h3>
        <span class="head-hint">{{ locked ? '志愿已截止，名片锁定' : '学员将在浏览页看到这张名片' }}</span>
      </div>
    </template>

    <div class="profile-body">
      <!-- 左：编辑区 -->
      <div class="edit-col">
        <!-- 照片：海报同比例 4:5，点击/拖拽上传 -->
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
              <span>点击或拖入照片</span>
            </div>
            <transition name="fade">
              <div v-if="uploading || dragOver" class="photo-mask">
                {{ uploading ? '上传中…' : '松开即可上传' }}
              </div>
            </transition>
          </div>
          <span class="photo-hint">jpg / png，不超过 5MB{{ locked ? '（已锁定）' : '' }}</span>
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
            <label class="form-label">自我介绍</label>
            <DewInput
              v-model="form.bio"
              type="textarea"
              :rows="5"
              maxlength="1000"
              resize="none"
              placeholder="写点什么让学员想选你：方向、能教什么、带过几届……"
              :disabled="locked"
            />
          </div>

          <div class="form-item">
            <label class="form-label">分类标签 <span class="label-sub">点选 1-3 个</span></label>
            <div class="tag-chips" :class="{ locked }">
              <span
                v-for="t in msTags"
                :key="t"
                :class="['chip', { on: form.tags.includes(t) }]"
                @click="!locked && toggleTag(t)"
              >{{ t }}</span>
            </div>
          </div>

          <div class="form-item form-row">
            <label class="form-label">名额上限</label>
            <div class="stepper">
              <DewButton type="ghost" size="sm" :disabled="locked || form.capacity <= 1" @click="form.capacity--">−</DewButton>
              <span class="stepper-num">{{ form.capacity }}</span>
              <DewButton type="ghost" size="sm" :disabled="locked || form.capacity >= 30" @click="form.capacity++">＋</DewButton>
            </div>
            <span class="form-hint">最多愿意带几位学员</span>
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
          <MsMentorCard :mentor="previewMentor" :index="0" />
          <div class="preview-caption">学员浏览页实时预览</div>
        </div>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewInput } from '../ui';
import MsMentorCard from './MsMentorCard.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  msTags: { type: Array, default: () => [] },
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(['saved']);

const store = useStore();
const uploadRef = ref(null);
const saving = ref(false);
const uploading = ref(false);
const dragOver = ref(false);
const photoFilename = ref('');     // 相对路径（/camp/ms/photo/...）
const hasProfile = ref(false);

const form = ref({ bio: '', tags: [], capacity: 8 });

const photoSrc = computed(() => assetUrl(photoFilename.value));

// 学员视角预览对象（matched=0：新名片尚未被选）
const previewMentor = computed(() => ({
  username: store.state.user?.User_Name || '我',
  photo_url: photoFilename.value,
  tags: form.value.tags,
  capacity: form.value.capacity,
  bio: form.value.bio,
  matched: 0,
  remaining: form.value.capacity,
  full: false,
}));

function toggleTag(t) {
  const i = form.value.tags.indexOf(t);
  if (i >= 0) {
    form.value.tags.splice(i, 1);
    return;
  }
  if (form.value.tags.length >= 3) {
    ElMessage.warning('最多选 3 个标签，先取消一个');
    return;
  }
  form.value.tags.push(t);
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
    ElMessage.error('仅支持 jpg / png 格式'); return;
  }
  if (file.size / 1024 / 1024 > 5) { ElMessage.error('照片不能超过 5MB'); return; }
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
      capacity: p?.capacity ?? 8,
    };
  } catch {
    ElMessage.error('加载名片失败');
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.profile-card { width: 100%; }

.head-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.head-row h3 { margin: 0; font-size: 16px; font-weight: 600; }
.head-hint { font-size: 12px; color: var(--dew-text-muted); }

.profile-body { display: flex; gap: 24px; align-items: flex-start; }
@media (max-width: 860px) { .profile-body { flex-direction: column; } }

/* ── 左：编辑区 ── */
.edit-col { flex: 1; min-width: 0; display: flex; gap: 20px; }
@media (max-width: 560px) { .edit-col { flex-direction: column; } }

.photo-col { flex: none; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.photo-box {
  position: relative;
  width: 160px;
  aspect-ratio: 4 / 5;
  border-radius: var(--radius-lg, 16px);
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
.photo-box img { width: 100%; height: 100%; object-fit: cover; }
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

/* 标签 chips：预设里点选，选中态主色描边 */
.tag-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chips.locked { opacity: 0.6; pointer-events: none; }
.chip {
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  cursor: pointer;
  color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border, rgba(128, 128, 128, 0.25));
  transition: all 0.2s ease;
  user-select: none;
}
.chip:hover { transform: translateY(-1px); color: var(--dew-text-heading); }
.chip.on {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  font-weight: 600;
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
.preview-col { flex: none; width: 238px; }
.preview-inner { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 10px; }
.preview-caption {
  text-align: center;
  font-size: 12px;
  color: var(--dew-text-faint);
}
@media (max-width: 860px) {
  .preview-col { width: 100%; }
  .preview-inner { position: static; align-items: center; }
}
</style>
