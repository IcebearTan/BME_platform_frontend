<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
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
    <div class="header-container">
      <div class="l-container">
        课程管理
        <el-button type="warning" @click="handleAdd" size="large" style="margin-left: 10px;">
          添加课程
        </el-button>
        <el-button type="success" @click="handleImport" size="large" style="margin-left: 10px;">
          导入课程
        </el-button>
      </div>
      <div class="r-container">
        <el-form :inline="true" class="form-inline" :model="formInline" @submit.prevent>
          <el-form-item label="课程搜索" style="margin: 0; align-items: center;">
            <el-input
              placeholder="输入课程标题"
              v-model="formInline.key"
              @keyup.enter="handleSearch"
              clearable
            ></el-input>
          </el-form-item>
          <el-form-item style="margin: 0; align-items: center; margin-right: 20px; margin-left: 10px;">
            <el-button type="primary" @click="handleSearch">
              <el-icon>
                <Search />
              </el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="selectable" style="box-shadow: 0px 5px 10px 1px#e3e3e3; margin: 20px;">
      <div class="table">
        <el-table
          :data="courses"
          style="width: 100%; overflow: auto; height: calc(100% - 40px); border-radius: 10px;"
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
          <el-table-column fixed="right" label="操作" min-width="150">
            <template #="scoped">
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
      </div>
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
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px;
  height: 40px;
}

.l-container {
  display: inline-block;
  font-size: 30px;
  font-weight: 900;
  margin-left: 20px;
  color: #3b5cd5;
}

.r-container {
  display: flex;
  align-items: center;
}

.form-inline {
  display: flex;
  justify-content: center;
}

.form-inline .el-form-item {
  text-align: center;
  margin: 0;
}

.selectable {
  user-select: text;
}

.pagination-wrapper {
  position: relative;
  width: 100%;
  background-color: white;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0 0 10px 10px;
}

.table {
  width: 100%;
  height: calc(100vh - 220px);
  max-height: 600px;
  border-radius: 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #C4C4C4;
  box-shadow: 0px 5px 10px 1px#f7f7f7;
  overflow: visible;
}

/* 表格内容样式 */
:deep(.el-table .cell) {
  padding: 0 12px;
}

:deep(.el-table__header-wrapper th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto;
}
</style>
