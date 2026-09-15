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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Top, Bottom } from '@element-plus/icons-vue';
import { DewCard } from '@bme/dew-ui';
import api, { assetUrl } from '../api';

const loading = ref(false);
const rows = ref([]);

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
  dlg.form = { title: '', description: '', link_type: 'route', link_value: '', is_camp_frame: false };
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
  if (raw.size > 10 * 1024 * 1024) {
    ElMessage.warning('底图不能超过 10MB（系统会统一转码到 1600×800 ≤500KB）');
    return;
  }
  dlg.imageFile = raw;
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
const onSwapImage = async (row, uploadFile) => {
  const raw = uploadFile?.raw;
  if (!raw) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(raw.type)) {
    ElMessage.warning('底图仅支持 jpg/png/webp 格式');
    return;
  }
  const fd = new FormData();
  fd.append('Banner_Id', row.Banner_Id);
  fd.append('image', raw);
  try {
    const res = await api.post('/banner/image/update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (res.data.code === 200) {
      Object.assign(row, res.data.data);
      ElMessage.success('底图已更新');
    } else {
      ElMessage.error(res.data.message || '底图更新失败');
    }
  } catch (e) {
    ElMessage.error('底图更新失败');
  }
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

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
