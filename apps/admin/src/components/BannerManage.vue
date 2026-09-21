<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">首页轮播</div>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>&nbsp;新建轮播帧</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%">
        <el-table-column label="顺序" width="70" align="center">
          <template #default="{ $index }">
            <span class="sort-num">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="110" align="center">
          <template #default="{ $index }">
            <el-button size="small" text :disabled="$index === 0" @click="move($index, -1)">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button size="small" text :disabled="$index === rows.length - 1" @click="move($index, 1)">
              <el-icon><Bottom /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="底图" width="150" align="center">
          <template #default="{ row }">
            <div class="banner-thumb" :class="{ 'is-hidden': !row.visible }">
              <img v-if="row.image" :src="assetUrl(row.image)" :alt="row.title" />
              <span v-else class="banner-thumb--empty">未上传</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column label="链接" min-width="140">
          <template #default="{ row }">
            <el-tag v-if="row.link_type === 'route'" size="small" effect="plain">{{ row.link_value }}</el-tag>
            <el-tag v-else-if="row.link_type === 'external'" size="small" type="warning" effect="plain">{{ row.link_value }}</el-tag>
            <el-tag v-else size="small" type="info" effect="plain">无跳转</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="营期帧" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_camp_frame" size="small" type="success" effect="plain">是</el-tag>
            <span v-else class="dim-text">—</span>
          </template>
        </el-table-column>
        <el-table-column label="可见" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.visible" @change="(v) => toggleVisible(row, v)" />
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" min-width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-upload
              class="swap-upload"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/jpeg,image/png,image/webp"
              :on-change="(f) => onSwapImage(row, f)"
            >
              <el-button type="success" size="small">换图</el-button>
            </el-upload>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footnote">底图规范：1600×800（2:1）、WebP/JPG ≤500KB、关键内容避开左下角 30% 区域（角标/文案位）。</div>
    </DewCard>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dlg.visible" :title="dlg.id ? '编辑轮播帧' : '新建轮播帧'" width="520px">
      <el-form :model="dlg.form" label-width="90px">
        <el-form-item label="标题" required>
          <el-input v-model="dlg.form.title" placeholder="轮播帧标题（角标/无图兜底文案）" maxlength="100" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dlg.form.description" placeholder="副标题（选填）" maxlength="200" />
        </el-form-item>
        <el-form-item label="跳转类型">
          <el-select v-model="dlg.form.link_type" style="width: 160px;">
            <el-option label="站内路由" value="route" />
            <el-option label="外部链接" value="external" />
            <el-option label="无跳转" value="none" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dlg.form.link_type !== 'none'" label="跳转目标">
          <el-input v-model="dlg.form.link_value" :placeholder="dlg.form.link_type === 'route' ? '如 /camp 或 /ai-service' : '如 /3dfarm/'" />
        </el-form-item>
        <el-form-item v-if="dlg.id" label="显示焦点">
          <div class="focus-editor">
            <div class="focus-strip"
                 :style="{ backgroundImage: `url(${assetUrl(dlgRowImage)})`, backgroundPosition: `50% ${dlg.form.image_focus_y}%` }"></div>
            <el-slider v-model="dlg.form.image_focus_y" :min="0" :max="100" :step="1" />
            <span class="form-hint">0=取景偏上 · 50=中带（默认） · 100=偏下——首页展示条在全宽 160px 高的底图上纵向取景的位置，即时预览如上</span>
          </div>
        </el-form-item>
        <el-form-item label="营期帧">
          <el-switch v-model="dlg.form.is_camp_frame" />
          <span class="form-hint">开启后此帧叠加主推营动态角标（标题随招募营变化；09-14 起默认不用）</span>
        </el-form-item>
        <el-form-item v-if="!dlg.id" label="底图" required>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/jpeg,image/png,image/webp"
            :on-change="onCreateImageChange"
          >
            <el-button>{{ dlg.imageFile ? '重新选择底图' : '选择底图' }}</el-button>
          </el-upload>
          <span v-if="dlg.imageFile" class="form-hint">已选：{{ dlg.imageFile.name }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.submitting" @click="submit">{{ dlg.id ? '保存' : '创建（默认隐藏）' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 裁切对话框：2:1 取景（存储规格）；拖拽平移、滚轮/双指缩放 -->
    <el-dialog v-model="cropDlg.visible" title="裁切底图（2:1）" width="720px" @closed="closeCropDialog">
      <div class="crop-stage">
        <img ref="cropImgEl" :src="cropDlg.src" alt="待裁切底图" />
      </div>
      <p class="form-hint">拖动平移、滚轮缩放取景框；首页主卡按设备在 2:1 / 16:7 / 16:9 间自适应取景，请把主体放在取景框<b>纵向中部</b>，再用「显示焦点」微调。</p>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeCropDialog">取消</el-button>
          <el-button type="primary" :loading="cropDlg.submitting" @click="confirmCrop">确认裁切并{{ cropDlg.mode === 'create' ? '使用' : '上传' }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Top, Bottom } from '@element-plus/icons-vue';
import { DewCard } from '@bme/dew-ui';
import api, { assetUrl } from '../api';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const loading = ref(false);
const rows = ref([]);

// 编辑中帧的当前底图（焦点预览用；换图后行数据刷新会跟着变）
const dlgRowImage = computed(() => {
  const row = rows.value.find(r => r.Banner_Id === dlg.id);
  return row?.image || '';
});

const fetchRows = async () => {
  loading.value = true;
  try {
    const res = await api.get('/banner/admin/list');
    rows.value = res.data?.data || [];
  } catch (e) {
    ElMessage.error('获取轮播列表失败');
  } finally {
    loading.value = false;
  }
};

// ── 新建/编辑 ──
const dlg = reactive({
  visible: false,
  id: null,
  submitting: false,
  imageFile: null,
  form: { title: '', description: '', link_type: 'route', link_value: '', is_camp_frame: false },
});

const openCreate = () => {
  dlg.id = null;
  dlg.imageFile = null;
  dlg.form = { title: '', description: '', link_type: 'route', link_value: '', is_camp_frame: false, image_focus_y: 50 };
  dlg.visible = true;
};

const openEdit = (row) => {
  dlg.id = row.Banner_Id;
  dlg.imageFile = null;
  dlg.form = {
    title: row.title,
    description: row.description || '',
    link_type: row.link_type,
    link_value: row.link_value || '',
    is_camp_frame: !!row.is_camp_frame,
    image_focus_y: row.image_focus_y ?? 50,
  };
  dlg.visible = true;
};

const onCreateImageChange = (uploadFile) => {
  const raw = uploadFile?.raw;
  if (!raw) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(raw.type)) {
    ElMessage.warning('底图仅支持 jpg/png/webp 格式');
    return;
  }
  openCropDialog(raw, 'create');   // 选图先进裁切器（2:1 取景所见即所得），确认后才作为待传图
};

const submit = async () => {
  if (!dlg.form.title.trim()) {
    ElMessage.warning('请填写标题');
    return;
  }
  if (!dlg.id && !dlg.imageFile) {
    ElMessage.warning('新建轮播帧必须选择底图');
    return;
  }
  dlg.submitting = true;
  try {
    if (dlg.id) {
      const res = await api.post('/banner/update', { Banner_Id: dlg.id, ...dlg.form });
      if (res.data.code !== 200) throw new Error(res.data.message);
    } else {
      const fd = new FormData();
      Object.entries(dlg.form).forEach(([k, v]) => fd.append(k, v ?? ''));
      fd.append('image', dlg.imageFile);
      const res = await api.post('/banner/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.code !== 200) throw new Error(res.data.message);
    }
    ElMessage.success(dlg.id ? '已保存' : '已创建（默认隐藏，传完图在列表开启可见）');
    dlg.visible = false;
    fetchRows();
  } catch (e) {
    const data = e.response?.data;
    let msg = '操作失败，请稍后重试';
    if (typeof data?.message === 'string') msg = data.message;
    else if (e instanceof Error && e.message && e.message !== '操作失败，请稍后重试') msg = e.message;
    ElMessage.error(msg);
  } finally {
    dlg.submitting = false;
  }
};

// ── 换图 ──
const onSwapImage = (row, uploadFile) => {
  const raw = uploadFile?.raw;
  if (!raw) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(raw.type)) {
    ElMessage.warning('底图仅支持 jpg/png/webp 格式');
    return;
  }
  openCropDialog(raw, 'swap', row);
};

// ── 裁切器：2:1 取景（与存储规格一致），拖拽/滚轮缩放；确认后 create 存待传、swap 直传 ──
const cropDlg = reactive({
  visible: false,
  mode: 'create',          // create | swap
  row: null,               // swap 目标行
  src: '',                 // 本地预览 URL
  submitting: false,
});
const cropImgEl = ref(null);
let cropper = null;

const openCropDialog = (raw, mode, row = null) => {
  cropDlg.mode = mode;
  cropDlg.row = row;
  cropDlg.src = URL.createObjectURL(raw);
  cropDlg.visible = true;
  nextTick(() => {
    if (cropper) { cropper.destroy(); cropper = null; }
    cropper = new Cropper(cropImgEl.value, {
      aspectRatio: 2 / 1,     // 存储规格 1600x800；显示条只取中带，取景时把主体放横向中部
      viewMode: 1,
      autoCropArea: 1,
      background: false,
    });
  });
};

const closeCropDialog = () => {
  cropDlg.visible = false;
  if (cropper) { cropper.destroy(); cropper = null; }
  if (cropDlg.src) { URL.revokeObjectURL(cropDlg.src); cropDlg.src = ''; }
};

const confirmCrop = () => {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
  if (!canvas.width || !canvas.height) { ElMessage.warning('请先框选有效区域'); return; }
  canvas.toBlob(async (blob) => {
    if (!blob) { ElMessage.error('裁切导出失败'); return; }
    cropDlg.submitting = true;
    try {
      if (cropDlg.mode === 'create') {
        dlg.imageFile = new File([blob], 'cover.webp', { type: blob.type || 'image/webp' });
        ElMessage.success('裁切完成，随创建一起上传');
        closeCropDialog();
      } else {
        const fd = new FormData();
        fd.append('Banner_Id', cropDlg.row.Banner_Id);
        fd.append('image', blob, 'cover.webp');
        const res = await api.post('/banner/image/update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.code === 200) {
          Object.assign(cropDlg.row, res.data.data);
          ElMessage.success('底图已更新');
          closeCropDialog();
        } else {
          ElMessage.error(res.data.message || '底图更新失败');
        }
      }
    } catch (e) {
      ElMessage.error('底图更新失败');
    } finally {
      cropDlg.submitting = false;
    }
  }, 'image/webp', 0.92);
};

// ── 显隐 / 排序 / 删除 ──
const toggleVisible = async (row, v) => {
  try {
    const res = await api.post('/banner/update', { Banner_Id: row.Banner_Id, visible: v });
    if (res.data.code === 200) {
      row.visible = v;
      if (v && !row.image) ElMessage.warning('该帧尚未上传底图');
    } else {
      ElMessage.error(res.data.message || '操作失败');
    }
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

// 上移/下移：先本地换位再提交完整顺序，失败回拉（范式同 CourseManage.moveResource）
const move = async (index, dir) => {
  const j = index + dir;
  if (j < 0 || j >= rows.value.length) return;
  const list = [...rows.value];
  [list[index], list[j]] = [list[j], list[index]];
  rows.value = list;
  try {
    await api.post('/banner/sort', { Banner_Ids: list.map(r => r.Banner_Id) });
  } catch (e) {
    ElMessage.error('排序失败');
    fetchRows();
  }
};

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除轮播帧「${row.title}」吗？底图文件将一并删除。`, '删除轮播帧', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const res = await api.post('/banner/delete', { Banner_Id: row.Banner_Id });
      if (res.data.code === 200) {
        ElMessage.success('已删除');
        fetchRows();
      } else {
        ElMessage.error(res.data.message || '删除失败');
      }
    } catch (e) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

onMounted(fetchRows);
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }

.sort-num { font-weight: 600; }

.banner-thumb {
  width: 120px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  margin: 4px auto;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}

.banner-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.banner-thumb.is-hidden img {
  filter: grayscale(0.8);
  opacity: 0.55;
}

.dim-text { color: var(--el-text-color-placeholder); }

.swap-upload {
  display: inline-block;
  margin: 0 8px;
}

.table-footnote {
  padding: 10px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 裁切舞台：限制高度防大图撑爆弹窗 */
.crop-stage {
  height: 420px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--el-fill-color-darker);
}

.crop-stage img {
  display: block;
  max-width: 100%;
}

/* 焦点编辑器：显示条实况预览（模拟首页全宽 160px 的取景带） */
.focus-editor {
  width: 100%;
}

.focus-strip {
  height: 64px;
  border-radius: 6px;
  background-size: cover;
  background-repeat: no-repeat;
  border: 1px solid var(--el-border-color);
  margin-bottom: 8px;
}

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
