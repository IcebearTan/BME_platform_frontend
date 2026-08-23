<template>
  <DewCard variant="default" size="lg" :no-hover="true" class="profile-card">
    <template #header>
      <div class="head-row">
        <h3>我的导生名片</h3>
        <span class="head-hint">{{ locked ? '志愿已截止，名片锁定' : '学员将在浏览页看到这张名片' }}</span>
      </div>
    </template>

    <div class="profile-body">
      <!-- 照片 -->
      <div class="photo-col">
        <div class="photo-box" @click="pickPhoto">
          <img v-if="photoSrc" :src="photoSrc" alt="" />
          <div v-else class="photo-empty">
            <el-icon><Plus /></el-icon>
            <span>上传照片</span>
          </div>
        </div>
        <el-upload
          ref="uploadRef"
          :show-file-list="false"
          :http-request="doUpload"
          accept="image/jpeg,image/png"
          class="photo-upload"
        >
          <span></span>
        </el-upload>
        <span class="photo-hint">jpg / png，不超过 5MB{{ locked ? '（已锁定）' : '' }}</span>
      </div>

      <!-- 表单 -->
      <div class="form-col">
        <div class="form-item">
          <label class="form-label">自我介绍</label>
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            resize="none"
            placeholder="写点什么让学员想选你：方向、能教什么、带过几届……"
            :disabled="locked"
          />
        </div>

        <div class="form-item">
          <label class="form-label">分类标签（从营期预设中选）</label>
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择 1-3 个标签"
            :disabled="locked"
            style="width: 100%;"
          >
            <el-option v-for="t in msTags" :key="t" :label="t" :value="t" />
          </el-select>
        </div>

        <div class="form-item form-row">
          <label class="form-label">名额上限</label>
          <el-input-number v-model="form.capacity" :min="1" :max="30" :disabled="locked" />
          <span class="form-hint">最多愿意带几位学员</span>
        </div>

        <div class="form-actions">
          <DewButton type="glass" :disabled="locked" :loading="saving" @click="save">
            {{ hasProfile ? '保存修改' : '发布名片' }}
          </DewButton>
        </div>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { DewCard, DewButton } from '../ui';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  msTags: { type: Array, default: () => [] },
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(['saved']);

const uploadRef = ref(null);
const saving = ref(false);
const photoFilename = ref('');     // 相对路径（/camp/ms/photo/...）
const hasProfile = ref(false);

const form = ref({ bio: '', tags: [], capacity: 8 });

const photoSrc = computed(() => assetUrl(photoFilename.value));

function pickPhoto() {
  if (props.locked) { ElMessage.info('志愿已截止，名片锁定'); return; }
  // 触发隐藏的 el-upload 文件选择
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click();
}

async function doUpload(options) {
  const file = options.file;
  if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
    ElMessage.error('仅支持 jpg / png 格式'); return;
  }
  if (file.size / 1024 / 1024 > 5) { ElMessage.error('照片不能超过 5MB'); return; }
  try {
    const r = await campService.uploadMsPhoto(props.sid, file);
    photoFilename.value = r.photo_url || '';
    ElMessage.success('照片已上传，记得保存名片');
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '照片上传失败');
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

.profile-body { display: flex; gap: 20px; }
@media (max-width: 680px) { .profile-body { flex-direction: column; } }

.photo-col { flex: none; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.photo-box {
  width: 148px;
  height: 178px;
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  cursor: pointer;
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s var(--dew-bounce, ease);
}
.photo-box:hover { transform: scale(1.02); }
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
.photo-upload { display: none; }
.photo-hint { font-size: 11px; color: var(--dew-text-faint); }

.form-col { flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--dew-text); }
.form-row { flex-direction: row; align-items: center; gap: 12px; flex-wrap: wrap; }
.form-row .form-label { margin: 0; }
.form-hint { font-size: 12px; color: var(--dew-text-faint); }
.form-actions { display: flex; justify-content: flex-end; }
</style>
