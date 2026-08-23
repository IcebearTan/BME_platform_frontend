<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';
import { Upload, Top, Bottom } from '@element-plus/icons-vue';
import router from '../router';

const formInline = reactive({
  key: ''
});

const courses = ref([]);
const allCourses = ref([]);
const filteredCourses = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const loading = ref(false);

// 导入相关状态
const importDialogVisible = ref(false);
const importPreview = ref(null);
const importLoading = ref(false);
const importErrors = ref([]);

const tableLabel = ref([
  {
    prop: 'Course_Id',
    label: 'ID',
    minWidth: '80'
  },
  {
    prop: 'Course_title',
    label: '课程标题',
    minWidth: '150'
  },
  {
    prop: 'Course_Introduction',
    label: '课程介绍',
    minWidth: '200',
    showOverflowTooltip: true
  },
  {
    prop: 'Course_Class_Hour',
    label: '学时',
    minWidth: '70',
    align: 'center'
  },
  {
    prop: 'Course_Difficulty',
    label: '难度',
    minWidth: '60',
    align: 'center'
  },
  {
    prop: 'Course_Time',
    label: '发布时间',
    minWidth: '160'
  }
]);

onMounted(() => {
  fetchCourses();
});

const fetchCourses = async () => {
  loading.value = true;
  try {
    const response = await api.get('/course/list');
    allCourses.value = response.data || [];
    filteredCourses.value = allCourses.value;
    totalItems.value = filteredCourses.value.length;
    updatePagedCourses();
  } catch (error) {
    console.error('Error fetching courses:', error);
    ElMessage({
      message: '获取课程列表失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

const updatePagedCourses = () => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  courses.value = filteredCourses.value.slice(start, end);
};

const handleSearch = () => {
  const keyword = formInline.key.trim();
  currentPage.value = 1;
  if (!keyword) {
    filteredCourses.value = allCourses.value;
  } else {
    filteredCourses.value = allCourses.value.filter(course => {
      const title = course.Course_title ? String(course.Course_title) : '';
      const id = course.Course_Id ? String(course.Course_Id) : '';
      return title.includes(keyword) || id.includes(keyword);
    });
  }
  totalItems.value = filteredCourses.value.length;
  updatePagedCourses();
};

const handlePageChange = (page) => {
  currentPage.value = page;
  updatePagedCourses();
};

const handleAdd = () => {
  router.push({ path: '/course/create' });
};

const handleImport = () => {
  importDialogVisible.value = true;
  importPreview.value = null;
  importErrors.value = [];
};

const handleImportFileChange = (file) => {
  if (!file.name.endsWith('.json')) {
    ElMessage.error('请选择 JSON 文件');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 5MB');
    return false;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      importPreview.value = data;
      importErrors.value = [];
    } catch (err) {
      ElMessage.error('JSON 格式错误，请检查文件');
      importPreview.value = null;
    }
  };
  reader.readAsText(file.raw);
  return false;
};

const buildPreviewTree = (data) => {
  return (data.chapters || []).map(ch => ({
    label: ch.name,
    children: (ch.lessons || []).map(les => ({
      label: `${les.title} (${les.type || 'text'}, ${les.duration || 0}分钟)`
    }))
  }));
};

const confirmImport = async () => {
  if (!importPreview.value) {
    ElMessage.warning('请先选择并预览文件');
    return;
  }
  importLoading.value = true;
  importErrors.value = [];
  try {
    const response = await api.post('/course/import', importPreview.value);
    ElMessage.success(response.data.message || '导入成功');
    importDialogVisible.value = false;
    fetchCourses();
  } catch (error) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) {
      importErrors.value = msg;
    } else if (typeof msg === 'object') {
      importErrors.value = Object.entries(msg).map(([k, v]) => `${k}: ${v}`);
    } else {
      importErrors.value = [msg || '导入失败，请检查数据格式'];
    }
    ElMessage.error('导入失败');
  } finally {
    importLoading.value = false;
  }
};

const handleEdit = (course) => {
  router.push({ path: `/course/edit/${course.Course_Id}` });
};

// ── 课程资源管理 ──
const resourceDialogVisible = ref(false);
const resourceCourse = ref(null);   // 当前管理的课程
const resourceList = ref([]);
const resourceLoading = ref(false);
const resourceUploading = ref(false);
const pendingFiles = ref([]);       // 待上传文件

const formatSize = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const handleResources = (course) => {
  resourceCourse.value = course;
  resourceDialogVisible.value = true;
  pendingFiles.value = [];
  fetchResources();
};

const fetchResources = async () => {
  if (!resourceCourse.value) return;
  resourceLoading.value = true;
  try {
    const res = await api.get('/course/resources', {
      params: { Course_Id: resourceCourse.value.Course_Id }
    });
    resourceList.value = res.data.data || [];
  } catch (error) {
    console.error('Error fetching resources:', error);
    ElMessage.error('获取资源列表失败');
  } finally {
    resourceLoading.value = false;
  }
};

const submitResources = async () => {
  if (!pendingFiles.value.length) {
    ElMessage.warning('请先选择要上传的文件');
    return;
  }
  resourceUploading.value = true;
  try {
    const fd = new FormData();
    fd.append('Course_Id', resourceCourse.value.Course_Id);
    pendingFiles.value.forEach(f => fd.append('Files', f.raw));
    const res = await api.post('/course/resource_add', fd);
    if (res.data.code === 200) {
      ElMessage.success(`成功上传 ${res.data.data.length} 个文件`);
      pendingFiles.value = [];
      fetchResources();
    } else {
      ElMessage.error(res.data.message || '上传失败');
    }
  } catch (error) {
    console.error('Error uploading resources:', error);
    ElMessage.error('上传失败');
  } finally {
    resourceUploading.value = false;
  }
};

// 上移/下移：先本地换位再提交完整顺序，失败则回拉
const moveResource = async (index, dir) => {
  const j = index + dir;
  if (j < 0 || j >= resourceList.value.length) return;
  const list = [...resourceList.value];
  [list[index], list[j]] = [list[j], list[index]];
  resourceList.value = list;
  try {
    await api.post('/course/resource_sort', {
      Course_Id: resourceCourse.value.Course_Id,
      Resource_Ids: list.map(r => r.id)
    });
  } catch (error) {
    console.error('Error sorting resources:', error);
    ElMessage.error('排序失败');
    fetchResources();
  }
};

const deleteResource = (row) => {
  ElMessageBox.confirm(`确定要删除资源「${row.name}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.post('/course/resource_del', { Resource_Id: row.id });
      ElMessage.success('删除成功');
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

const handleDelete = (course) => {
  ElMessageBox.confirm('确定要删除该课程吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.post('/course/course_delete', { Course_Id: course.Course_Id });
      ElMessage({
        message: '删除成功',
        type: 'success'
      });
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      ElMessage({
        message: '删除失败',
        type: 'error'
      });
    }
  }).catch(() => {});
};
</script>

<template>
  <div class="course-manage" style="width: 100%;">
    <div class="page-header">
      <div class="header-actions">
        <span class="page-title">课程管理</span>
        <el-button type="warning" @click="handleAdd" size="large">
          添加课程
        </el-button>
        <el-button type="success" @click="handleImport" size="large">
          导入课程
        </el-button>
      </div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" :model="formInline" @submit.prevent>
          <el-form-item label="课程搜索">
            <el-input
              placeholder="输入课程标题"
              v-model="formInline.key"
              @keyup.enter="handleSearch"
              clearable
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon>
                <Search />
              </el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="selectable" style="margin: 20px;">
      <DewCard no-hover class="table-card">
        <el-table
          :data="courses"
          style="width: 100%; overflow: auto; height: calc(100% - 40px);"
          :row-style="{ height: '50px' }"
          v-loading="loading"
        >
          <el-table-column
            v-for="item in tableLabel"
            :key="item.prop"
            :prop="item.prop"
            :label="item.label"
            :min-width="item.minWidth"
            :show-overflow-tooltip="item.showOverflowTooltip || false"
            :align="item.align || 'left'"
          />
          <el-table-column fixed="right" label="操作" min-width="220">
            <template #="scoped">
              <el-button type="success" size="small" @click="handleResources(scoped.row)">资源</el-button>
              <el-button type="primary" size="small" @click="handleEdit(scoped.row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scoped.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination class="selectable"
            @current-change="handlePageChange"
            :current-page="currentPage"
            :page-size="pageSize"
            :total="totalItems"
            layout="prev, pager, next"
          >
          </el-pagination>
        </div>
      </DewCard>
    </div>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入课程" width="700px" destroy-on-close>
      <div v-if="!importPreview">
        <el-upload
          drag
          accept=".json"
          :auto-upload="false"
          :limit="1"
          :on-change="handleImportFileChange"
        >
          <el-icon style="font-size: 48px; color: #909399;"><Upload /></el-icon>
          <div style="margin-top: 8px;">将 JSON 文件拖拽到此处，或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .json 格式的课程大纲文件，最大 5MB</div>
          </template>
        </el-upload>
      </div>

      <div v-if="importPreview">
        <el-descriptions title="课程预览" :column="2" border>
          <el-descriptions-item label="课程标题">{{ importPreview.course?.title }}</el-descriptions-item>
          <el-descriptions-item label="难度">{{ importPreview.course?.difficulty || '-' }}</el-descriptions-item>
          <el-descriptions-item label="课程介绍" :span="2">{{ importPreview.course?.introduction }}</el-descriptions-item>
          <el-descriptions-item label="章节数">{{ importPreview.chapters?.length || 0 }}</el-descriptions-item>
          <el-descriptions-item label="课时数">{{ importPreview.chapters?.reduce((s, c) => s + (c.lessons?.length || 0), 0) || 0 }}</el-descriptions-item>
        </el-descriptions>

        <el-tree
          :data="buildPreviewTree(importPreview)"
          :props="{ label: 'label', children: 'children' }"
          default-expand-all
          style="margin-top: 16px; max-height: 300px; overflow: auto;"
        />

        <el-alert v-if="importErrors.length" type="error" style="margin-top: 12px;" :closable="false">
          <template #title>导入错误</template>
          <ul style="margin: 4px 0; padding-left: 20px;">
            <li v-for="(err, i) in importErrors" :key="i">{{ err }}</li>
          </ul>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button v-if="importPreview" @click="importPreview = null">重新选择</el-button>
        <el-button type="primary" @click="confirmImport" :loading="importLoading" v-if="importPreview">
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 课程资源管理弹窗 -->
    <el-dialog
      v-model="resourceDialogVisible"
      :title="`课程资源 - ${resourceCourse?.Course_title || ''}`"
      width="720px"
      destroy-on-close
    >
      <!-- 上传区 -->
      <el-upload
        drag
        multiple
        :auto-upload="false"
        v-model:file-list="pendingFiles"
      >
        <el-icon style="font-size: 40px; color: #909399;"><Upload /></el-icon>
        <div style="margin-top: 6px;">将文件拖拽到此处，或 <em>点击选择</em>（可多选）</div>
        <template #tip>
          <div class="el-upload__tip">资源将上传到对象存储，学生在课程详情页「相关资源」中下载</div>
        </template>
      </el-upload>
      <div style="margin-bottom: 16px;">
        <el-button type="primary" @click="submitResources" :loading="resourceUploading" :disabled="!pendingFiles.length">
          上传所选文件
        </el-button>
      </div>

      <!-- 资源列表 -->
      <el-table :data="resourceList" v-loading="resourceLoading" style="width: 100%;" max-height="360">
        <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip />
        <el-table-column label="大小" width="100">
          <template #="scoped">{{ formatSize(scoped.row.size) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="150" />
        <el-table-column label="操作" width="170" fixed="right">
          <template #="scoped">
            <el-button
              size="small"
              :icon="Top"
              :disabled="scoped.$index === 0"
              @click="moveResource(scoped.$index, -1)"
            />
            <el-button
              size="small"
              :icon="Bottom"
              :disabled="scoped.$index === resourceList.length - 1"
              @click="moveResource(scoped.$index, 1)"
            />
            <el-button type="danger" size="small" @click="deleteResource(scoped.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页头/筛选/分页样式由 styles/pages.css 统一提供 */
.selectable {
  user-select: text;
}

.table-card {
  height: calc(100vh - 220px);
  max-height: 600px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

/* 表格内容样式 */
:deep(.el-table .cell) {
  padding: 0 12px;
}

:deep(.el-table__header-wrapper th) {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 600;
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto;
}
</style>
