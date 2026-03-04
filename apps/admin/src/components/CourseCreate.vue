<script setup>
import api from '../api';
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Edit } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

const courseId = ref(route.params.id);
const isEdit = computed(() => !!courseId.value);

const loading = ref(false);
const activeTab = ref('basic');

// 课程基本信息
const courseForm = reactive({
  Course_title: '',
  Course_Introduction: '',
  Course_Class_Hour: 0,
  Course_Difficulty: 1,
  Course_Tags: '',
  Course_Other_Tags: ''
});

// 课时数（从课程基本信息获取）
const totalLessons = computed(() => {
  const count = courseForm.Course_Class_Hour;
  return (count === null || count === undefined || isNaN(count)) ? 0 : Number(count);
});

// 章节列表
const chapters = ref([]);
const chapterForm = reactive({
  name: '',
  order: 0,
  level: 1,  // 层级深度：1=一级, 2=二级, 3=三级...
  parent_id: null  // 父章节ID，最高级为null
});

// 编辑章节相关
const editingChapterId = ref(null);
const editingChapterName = ref('');

// 将章节列表转换为树形结构用于下拉选择
const chapterTreeData = computed(() => {
  const list = Array.isArray(chapters.value) ? chapters.value : [];
  const map = {};
  const roots = [];

  // 创建所有节点的映射
  list.forEach(item => {
    map[item.Chapter_Id] = { ...item, children: [] };
  });

  // 构建树形结构
  list.forEach(item => {
    if (item.Chapter_Parent_Id && map[item.Chapter_Parent_Id]) {
      map[item.Chapter_Parent_Id].children.push(map[item.Chapter_Id]);
    } else {
      roots.push(map[item.Chapter_Id]);
    }
  });

  return roots;
});

// 用于下拉选择的平铺列表（带缩进显示层级）
const flatChapters = computed(() => {
  const result = [];
  const flatten = (items, level = 1) => {
    items.forEach(item => {
      result.push({ ...item, Chapter_Level: level });
      if (item.children && item.children.length > 0) {
        flatten(item.children, level + 1);
      }
    });
  };
  flatten(chapterTreeData.value);
  return result;
});

// 排序后的章节列表（确保父章节在子章节之前）
const sortedChapters = computed(() => {
  const list = Array.isArray(chapters.value) ? chapters.value : [];

  // 构建树形结构
  const map = {};
  const roots = [];

  list.forEach(item => {
    map[item.Chapter_Id] = { ...item, children: [] };
  });

  list.forEach(item => {
    if (item.Chapter_Parent_Id && map[item.Chapter_Parent_Id]) {
      map[item.Chapter_Parent_Id].children.push(map[item.Chapter_Id]);
    } else {
      roots.push(map[item.Chapter_Id]);
    }
  });

  // 递归展平，确保父章节在前
  const result = [];
  const flattenWithOrder = (items) => {
    // 先按 order 排序
    items.sort((a, b) => (a.Chapter_Order || 0) - (b.Chapter_Order || 0));
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        flattenWithOrder(item.children);
      }
    });
  };

  // 根节点也按 order 排序
  roots.sort((a, b) => (a.Chapter_Order || 0) - (b.Chapter_Order || 0));
  roots.forEach(root => {
    result.push(root);
    if (root.children && root.children.length > 0) {
      flattenWithOrder(root.children);
    }
  });

  return result;
});

// 课时相关
const selectedChapterId = ref(null);
const lessons = ref([]);
const lessonForm = reactive({
  Lesson_Title: '',
  Lesson_Type: 'video',
  Lesson_Content: '',
  Lesson_Duration: 0,
  Resource_Url: ''
});

const lessonTypes = [
  { value: 'video', label: '视频' },
  { value: 'text', label: '图文' },
  { value: 'link', label: '外链' },
  { value: 'quiz', label: '测验' },
  { value: 'homework', label: '作业' }
];

const difficultyOptions = [
  { value: 1, label: '1 - 入门' },
  { value: 2, label: '2 - 初级' },
  { value: 3, label: '3 - 中级' },
  { value: 4, label: '4 - 高级' },
  { value: 5, label: '5 - 专家' }
];

onMounted(async () => {
  if (isEdit.value) {
    await fetchCourseDetail();
  }
});

// 获取课程详情
const fetchCourseDetail = async () => {
  loading.value = true;
  try {
    const response = await api.get('/course/search', { params: { Course_Id: courseId.value } });
    const course = response.data;
    if (course) {
      courseForm.Course_title = course.Course_Title || '';
      courseForm.Course_Introduction = course.Introduction || '';
      courseForm.Course_Class_Hour = (course.Course_Class_Hour === null || course.Course_Class_Hour === undefined) ? 0 : Number(course.Course_Class_Hour);
      courseForm.Course_Difficulty = course.Course_Difficulty || 1;
      courseForm.Course_Tags = course.Course_Tags || '';
      courseForm.Course_Other_Tags = course.Course_Other_Tags ? course.Course_Other_Tags.join(',') : '';
    }
    // 获取章节列表
    await fetchChapters();
    // 获取课时列表
    await fetchLessons();
  } catch (error) {
    console.error('Error fetching course detail:', error);
    ElMessage({
      message: '获取课程详情失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 获取章节列表
const fetchChapters = async () => {
  try {
    const response = await api.get('/course/chapter_list', { params: { Course_Id: courseId.value } });
    chapters.value = response.data || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
  }
};

// 获取课时列表
const fetchLessons = async () => {
  try {
    const response = await api.get('/course/lesson/list', { params: { Course_Id: courseId.value } });
    lessons.value = response.data.data || [];
  } catch (error) {
    console.error('Error fetching lessons:', error);
  }
};

// 保存课程基本信息
const saveCourse = async () => {
  if (!courseForm.Course_title || !courseForm.Course_Introduction) {
    ElMessage({
      message: '请填写课程标题和介绍',
      type: 'warning'
    });
    return;
  }

  loading.value = true;
  try {
    let data = {
      Course_title: courseForm.Course_title,
      Course_Introduction: courseForm.Course_Introduction,
      Course_Difficulty: courseForm.Course_Difficulty || 1,
      Course_Tags: courseForm.Course_Tags || ''
    };

    let response;
    if (isEdit.value) {
      data.Course_Id = courseId.value;
      response = await api.post('/course/edit', data);
      // 更新章节和课时数据
      if (response.data.chapters) {
        chapters.value = response.data.chapters;
      }
      if (response.data.lessons) {
        lessons.value = response.data.lessons;
      }
      if (response.data.class_hour !== undefined) {
        courseForm.Course_Class_Hour = (response.data.class_hour === null || response.data.class_hour === undefined) ? 0 : Number(response.data.class_hour);
      }
    } else {
      response = await api.post('/course/public', data);
      courseId.value = response.data.Course_Id;
      // 获取章节列表
      await fetchChapters();
      // 获取课时列表
      await fetchLessons();
    }

    ElMessage({
      message: isEdit.value ? '课程更新成功' : '课程发布成功',
      type: 'success'
    });

    // 跳转到章节管理
    activeTab.value = 'chapters';
  } catch (error) {
    console.error('Error saving course:', error);
    ElMessage({
      message: isEdit.value ? '课程更新失败' : '课程发布失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 添加章节
const addChapter = async () => {
  if (!courseId.value) {
    ElMessage({
      message: '请先保存课程基本信息',
      type: 'warning'
    });
    return;
  }

  if (!chapterForm.name) {
    ElMessage({
      message: '请输入章节名称',
      type: 'warning'
    });
    return;
  }

  loading.value = true;
  try {
    // 如果选择了父章节，level 应该是父章节的 level + 1
    let newLevel = 1;
    let newOrder = chapters.value.length + 1;

    if (chapterForm.parent_id) {
      const parentChapter = chapters.value.find(c => c.Chapter_Id === chapterForm.parent_id);
      if (parentChapter) {
        newLevel = (parentChapter.Chapter_Level || 1) + 1;
        // 计算同级兄弟章节的数量来确定 order
        const siblings = chapters.value.filter(c => c.Chapter_Parent_Id === chapterForm.parent_id);
        newOrder = siblings.length + 1;
      }
    }

    const chapterData = {
      Course_Id: courseId.value,
      Chapter_Name: [
        {
          name: chapterForm.name,
          order: chapterForm.order || newOrder,
          level: newLevel,
          parent_id: chapterForm.parent_id
        }
      ]
    };
    await api.post('/course/chapter_add', chapterData);
    ElMessage({
      message: '章节添加成功',
      type: 'success'
    });
    // 重置表单
    chapterForm.name = '';
    chapterForm.order = chapters.value.length + 2;
    chapterForm.level = 1;
    chapterForm.parent_id = null;
    await fetchChapters();
  } catch (error) {
    console.error('Error adding chapter:', error);
    ElMessage({
      message: '章节添加失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 添加子章节
const addChildChapter = async (parentChapter) => {
  if (!courseId.value) {
    ElMessage({
      message: '请先保存课程基本信息',
      type: 'warning'
    });
    return;
  }

  const childName = parentChapter.Chapter_Name + '-子章节';

  // 从平铺列表中统计该父章节下已有的子章节数量
  const siblingCount = chapters.value.filter(c => c.Chapter_Parent_Id === parentChapter.Chapter_Id).length;

  loading.value = true;
  try {
    const chapterData = {
      Course_Id: courseId.value,
      Chapter_Name: [
        {
          name: childName,
          order: siblingCount + 1,
          level: (parentChapter.Chapter_Level || 1) + 1,
          parent_id: parentChapter.Chapter_Id
        }
      ]
    };
    await api.post('/course/chapter_add', chapterData);
    ElMessage({
      message: '子章节添加成功',
      type: 'success'
    });
    await fetchChapters();
  } catch (error) {
    console.error('Error adding child chapter:', error);
    ElMessage({
      message: '子章节添加失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 开始编辑章节名称
const startEditChapter = (chapter) => {
  editingChapterId.value = chapter.Chapter_Id;
  editingChapterName.value = chapter.Chapter_Name;
};

// 取消编辑
const cancelEdit = () => {
  editingChapterId.value = null;
  editingChapterName.value = '';
};

// 保存章节名称
const saveChapterName = async (chapter) => {
  if (!editingChapterName.value.trim()) {
    ElMessage({ message: '章节名称不能为空', type: 'warning' });
    editingChapterId.value = null;
    return;
  }

  loading.value = true;
  try {
    // 调用单个章节更新接口
    await api.post('/course/chapter_edit', {
      Chapter_Id: chapter.Chapter_Id,
      Chapter_Name: editingChapterName.value,
      Chapter_Order: chapter.Chapter_Order || 1,
      Chapter_Level: chapter.Chapter_Level || 1,
      Chapter_Parent_Id: chapter.Chapter_Parent_Id
    });

    ElMessage({ message: '章节名称已更新', type: 'success' });
    await fetchChapters();
  } catch (error) {
    console.error('Error updating chapter name:', error);
    ElMessage({ message: '更新章节名称失败', type: 'error' });
  } finally {
    loading.value = false;
    editingChapterId.value = null;
    editingChapterName.value = '';
  }
};

// 删除章节
const deleteChapter = async (chapter) => {
  ElMessageBox.confirm('确定要删除该章节吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true;
    try {
      await api.post('/course/chapter_del', {
        Chapter_Id: chapter.Chapter_Id
      });
      ElMessage({ message: '章节删除成功', type: 'success' });
      await fetchChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      ElMessage({ message: '章节删除失败', type: 'error' });
    } finally {
      loading.value = false;
    }
  }).catch(() => {});
};

// 添加课时
const addLesson = async () => {
  if (!selectedChapterId.value) {
    ElMessage({
      message: '请先选择章节',
      type: 'warning'
    });
    return;
  }

  if (!lessonForm.Lesson_Title) {
    ElMessage({
      message: '请输入课时标题',
      type: 'warning'
    });
    return;
  }

  loading.value = true;
  try {
    const data = {
      Course_Id: courseId.value,
      Chapter_Id: selectedChapterId.value,
      Lesson_Title: lessonForm.Lesson_Title,
      Lesson_Type: lessonForm.Lesson_Type,
      Lesson_Content: lessonForm.Lesson_Content || '',
      Lesson_Duration: lessonForm.Lesson_Duration || 0,
      Resource_Url: lessonForm.Resource_Url || ''
    };
    await api.post('/course/lesson/add', data);
    ElMessage({
      message: '课时添加成功',
      type: 'success'
    });
    // 重置表单
    lessonForm.Lesson_Title = '';
    lessonForm.Lesson_Type = 'video';
    lessonForm.Lesson_Content = '';
    lessonForm.Lesson_Duration = 0;
    lessonForm.Resource_Url = '';
    await fetchLessons();
  } catch (error) {
    console.error('Error adding lesson:', error);
    ElMessage({
      message: '课时添加失败',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 删除课时
const deleteLesson = async (lesson) => {
  ElMessageBox.confirm('确定要删除该课时吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.post('/course/lesson/delete', { lesson_id: lesson.id });
      ElMessage({
        message: '课时删除成功',
        type: 'success'
      });
      await fetchLessons();
    } catch (error) {
      ElMessage({
        message: '课时删除失败',
        type: 'error'
      });
    }
  }).catch(() => {});
};

// 获取章节下的课时
const getChapterLessons = (chapterId) => {
  const chapter = lessons.value.find(c => c.Chapter_Id === chapterId);
  return chapter ? chapter.lessons : [];
};

// 返回列表
const goBack = () => {
  router.push({ path: '/course/manage' });
};
</script>

<template>
  <div class="course-create" style="width: 100%; padding: 20px;">
    <div class="header">
      <el-button @click="goBack" style="margin-right: 20px;">返回列表</el-button>
      <span class="title">{{ isEdit ? '编辑课程' : '发布课程' }}</span>
    </div>

    <el-tabs v-model="activeTab" class="course-tabs" v-loading="loading">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-card class="form-card">
          <el-form :model="courseForm" label-width="120px">
            <el-form-item label="课程标题" required>
              <el-input v-model="courseForm.Course_title" placeholder="请输入课程标题" />
            </el-form-item>
            <el-form-item label="课程介绍" required>
              <el-input v-model="courseForm.Course_Introduction" type="textarea" :rows="4" placeholder="请输入课程介绍" />
            </el-form-item>
            <el-form-item label="课时数">
              <el-tag type="primary" effect="plain" size="large">
                {{ totalLessons }} 课时
              </el-tag>
              <span style="margin-left: 8px; color: #909399; font-size: 12px;">（根据课时自动计算）</span>
            </el-form-item>
            <el-form-item label="难度等级">
              <el-select v-model="courseForm.Course_Difficulty">
                <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="courseForm.Course_Tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
            <el-form-item label="其他标签">
              <el-input v-model="courseForm.Course_Other_Tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveCourse">
                {{ isEdit ? '更新课程' : '发布课程' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 章节管理 -->
      <el-tab-pane label="章节管理" name="chapters" :disabled="!courseId">
        <el-card class="form-card">
          <!-- 添加章节表单 -->
          <div style="margin-bottom: 20px; padding: 15px; background: #f5f7fa; border-radius: 4px;">
            <el-form :model="chapterForm" inline>
              <el-form-item label="章节名称">
                <el-input v-model="chapterForm.name" placeholder="请输入章节名称" style="width: 200px;" />
              </el-form-item>
              <el-form-item label="父章节">
                <el-select v-model="chapterForm.parent_id" placeholder="无(顶级章节)" clearable style="width: 180px;">
                  <el-option v-for="c in flatChapters" :key="c.Chapter_Id" :label="'　'.repeat(c.Chapter_Level - 1) + '├─ ' + c.Chapter_Name" :value="c.Chapter_Id" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="addChapter">添加</el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 章节列表 -->
          <el-table v-if="chapters.length > 0" :data="sortedChapters" style="width: 100%">
            <el-table-column prop="Chapter_Name" label="章节名称" min-width="200">
              <template #default="{ row }">
                <span v-if="editingChapterId !== row.Chapter_Id" :style="{ paddingLeft: ((row.Chapter_Level - 1) * 20) + 'px' }">
                  {{ row.Chapter_Name }}
                </span>
                <div v-else style="display: flex; align-items: center; gap: 8px;">
                  <el-input
                    v-model="editingChapterName"
                    size="small"
                    @keyup.enter="saveChapterName(row)"
                    autofocus
                  />
                  <el-button type="primary" size="small" @click="saveChapterName(row)">保存</el-button>
                  <el-button size="small" @click="cancelEdit">取消</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="Chapter_Level" label="层级" width="80">
              <template #default="{ row }">
                <el-tag size="small">{{ row.Chapter_Level }}级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="Chapter_Order" label="排序" width="80" />
            <el-table-column label="操作" width="280" align="right">
              <template #default="{ row }">
                <el-button type="success" size="small" @click="addChildChapter(row)">
                  <el-icon><Plus /></el-icon> 添加子章节
                </el-button>
                <el-button type="primary" size="small" @click="startEditChapter(row)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteChapter(row)">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="chapters.length === 0" description="暂无章节，请添加" />
        </el-card>
      </el-tab-pane>

      <!-- 课时管理 -->
      <el-tab-pane label="课时管理" name="lessons" :disabled="!courseId">
        <el-card class="form-card">
          <el-form :model="lessonForm" inline style="margin-bottom: 20px;">
            <el-form-item label="选择章节">
              <el-select v-model="selectedChapterId" placeholder="请选择章节" style="width: 200px;">
                <el-option v-for="chapter in chapters" :key="chapter.Chapter_Id" :label="chapter.Chapter_Name" :value="chapter.Chapter_Id" />
              </el-select>
            </el-form-item>
          </el-form>

          <el-form :model="lessonForm" label-width="100px" v-if="selectedChapterId">
            <el-form-item label="课时标题">
              <el-input v-model="lessonForm.Lesson_Title" placeholder="请输入课时标题" />
            </el-form-item>
            <el-form-item label="课时类型">
              <el-select v-model="lessonForm.Lesson_Type" style="width: 200px;">
                <el-option v-for="item in lessonTypes" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="课时内容">
              <el-input v-model="lessonForm.Lesson_Content" type="textarea" :rows="3" placeholder="请输入课时内容" />
            </el-form-item>
            <el-form-item label="时长(分钟)">
              <el-input-number v-model="lessonForm.Lesson_Duration" :min="0" />
            </el-form-item>
            <el-form-item label="资源链接">
              <el-input v-model="lessonForm.Resource_Url" placeholder="视频/附件URL" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="addLesson">添加课时</el-button>
            </el-form-item>
          </el-form>

          <!-- 课时列表 -->
          <div v-for="chapter in lessons" :key="chapter.Chapter_Id" style="margin-top: 20px;">
            <h4>{{ chapter.Chapter_Name }}</h4>
            <el-table :data="chapter.lessons" style="width: 100%;" border v-if="chapter.lessons && chapter.lessons.length > 0">
              <el-table-column prop="title" label="课时标题" />
              <el-table-column label="类型" width="80">
                <template #default="scope">
                  {{ lessonTypes.find(t => t.value === scope.row.type)?.label || scope.row.type }}
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="时长(分钟)" width="100" />
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button type="danger" size="small" @click="deleteLesson(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无课时" :image-size="60" />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #3b5cd5;
}

.course-tabs {
  margin-top: 20px;
}

.form-card {
  margin: 10px 0;
}
</style>
