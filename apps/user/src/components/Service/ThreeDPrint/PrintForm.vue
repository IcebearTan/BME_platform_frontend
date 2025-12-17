<script setup>
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { UploadFilled, Link, Calendar, Box, Timer, ScaleToOriginal, Check } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

const props = defineProps({
  printerName: {
    type: String,
    default: ''
  }
});

const formRef = ref(null);
const fileList = ref([]);

const formData = reactive({
  fileType: 'upload', // 'upload' or 'link'
  fileLink: '',
  spoolId: '',
  estimatedWeight: undefined,
  estimatedTime: undefined,
  pickupTime: '',
  description: ''
});

// Mock Spool Data (Specific material spools)
const spoolList = [
  {
    id: 1,
    type: 'PLA',
    colorName: '黄色',
    colorHex: '#FADB14',
    remaining: 0.3,
    unit: 'kg',
  },
  {
    id: 2,
    type: 'PLA Lite',
    colorName: '白色',
    colorHex: '#FFFFFF',
    remaining: 1.0,
    unit: 'kg',
  },
  {
    id: 3,
    type: 'PETG',
    colorName: '透明',
    colorHex: '#E0E0E0', // Visual representation for transparent
    remaining: 0.1,
    unit: 'kg',
  },
  {
    id: 4,
    type: 'TPU',
    colorName: '黑色',
    colorHex: '#000000',
    remaining: 0.8,
    unit: 'kg',
  },
  {
    id: 5,
    type: 'ABS',
    colorName: '红色',
    colorHex: '#FF4D4F',
    remaining: 0.5,
    unit: 'kg',
  },
  {
    id: 6,
    type: 'PLA',
    colorName: '蓝色',
    colorHex: '#1890FF',
    remaining: 0.6,
    unit: 'kg',
  }
];

const rules = {
  spoolId: [{ required: true, message: '请选择具体耗材盘料', trigger: 'change' }],
  estimatedWeight: [{ required: true, message: '请输入预计消耗重量', trigger: 'blur' }],
  estimatedTime: [{ required: true, message: '请输入预计打印时长', trigger: 'blur' }],
  pickupTime: [{ required: true, message: '请选择期望取货时间', trigger: 'change' }]
};

const handleUploadChange = (file, fileList) => {
  console.log(file);
};

const beforeUpload = (rawFile) => {
  const isModel = rawFile.name.endsWith('.stl') || rawFile.name.endsWith('.obj') || rawFile.name.endsWith('.3mf');
  if (!isModel) {
    ElMessage.error('只能上传 .stl, .obj, .3mf 格式的模型文件!');
    return false;
  }
  if (rawFile.size / 1024 / 1024 > 50) {
    ElMessage.error('文件大小不能超过 50MB!');
    return false;
  }
  return true;
};

const submitForm = async (formEl) => {
  if (!formEl) return;
  await formEl.validate((valid, fields) => {
    if (valid) {
      if (formData.fileType === 'upload' && fileList.value.length === 0) {
        ElMessage.warning('请上传模型文件');
        return;
      }
      if (formData.fileType === 'link' && !formData.fileLink) {
        ElMessage.warning('请填写文件链接');
        return;
      }
      
      console.log('submit!', formData);
      ElMessage.success('预约提交成功！');
      formEl.resetFields();
      fileList.value = [];
    } else {
      console.log('error submit!', fields);
    }
  });
};

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7;
};

const selectSpool = (id) => {
  formData.spoolId = id;
};
</script>

<template>
  <el-card :class="['print-form-card', { 'theme-dark': isDarkMode }]" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="header-title">
          <el-icon><Box /></el-icon> 
          {{ printerName ? `预约设备: ${printerName}` : '新建打印预约' }}
        </span>
      </div>
    </template>

    <el-form 
      ref="formRef" 
      :model="formData" 
      :rules="rules" 
      label-position="top"
      class="print-form"
    >
      <!-- File Submission Type -->
      <el-form-item label="文件提交方式" class="form-section-title">
        <el-radio-group v-model="formData.fileType" size="large">
          <el-radio-button label="upload">本地上传</el-radio-button>
          <el-radio-button label="link">外部链接</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- File Upload -->
      <el-form-item v-if="formData.fileType === 'upload'" label="模型文件 (.stl, .obj, .3mf)">
        <el-upload
          class="upload-demo"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleUploadChange"
          :before-upload="beforeUpload"
          v-model:file-list="fileList"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              单个文件不超过 50MB
            </div>
          </template>
        </el-upload>
      </el-form-item>

      <!-- Link Input -->
      <el-form-item v-else label="文件下载链接" prop="fileLink">
        <el-input 
          v-model="formData.fileLink" 
          placeholder="请输入网盘链接或模型地址"
          :prefix-icon="Link"
          size="large"
        />
      </el-form-item>

      <!-- Spool Selection Grid -->
      <el-form-item label="选择耗材盘料" prop="spoolId" class="form-section-title">
        <div class="spool-grid">
          <div 
            v-for="spool in spoolList" 
            :key="spool.id"
            :class="['spool-card', { active: formData.spoolId === spool.id }]"
            @click="selectSpool(spool.id)"
          >
            <div class="spool-color-indicator" :style="{ backgroundColor: spool.colorHex }"></div>
            <div class="spool-info">
              <div class="spool-type">{{ spool.type }}</div>
              <div class="spool-detail">
                <span class="spool-color-name">{{ spool.colorName }}</span>
                <span class="spool-remaining">余 {{ spool.remaining }}{{ spool.unit }}</span>
              </div>
            </div>
            <div class="selection-check" v-if="formData.spoolId === spool.id">
              <el-icon><Check /></el-icon>
            </div>
          </div>
        </div>
      </el-form-item>

      <!-- Estimation Fields -->
      <div class="estimation-row">
        <el-form-item label="预计消耗重量 (g)" prop="estimatedWeight" style="flex: 1">
          <el-input-number 
            v-model="formData.estimatedWeight" 
            :min="1" 
            :precision="0" 
            controls-position="right" 
            style="width: 100%"
            placeholder="请输入重量"
          >
             <template #prefix><el-icon><ScaleToOriginal /></el-icon></template>
          </el-input-number>
        </el-form-item>
        
        <el-form-item label="预计打印时长 (小时)" prop="estimatedTime" style="flex: 1">
          <el-input-number 
            v-model="formData.estimatedTime" 
            :min="0.5" 
            :step="0.5" 
            controls-position="right" 
            style="width: 100%"
            placeholder="请输入时长"
          >
             <template #prefix><el-icon><Timer /></el-icon></template>
          </el-input-number>
        </el-form-item>
      </div>

      <!-- Pickup Time -->
      <el-form-item label="期望取货时间" prop="pickupTime">
        <el-date-picker
          v-model="formData.pickupTime"
          type="datetime"
          placeholder="选择日期时间"
          :disabled-date="disabledDate"
          style="width: 100%"
          size="large"
          :prefix-icon="Calendar"
        />
      </el-form-item>

      <!-- Description -->
      <el-form-item label="备注说明">
        <el-input
          v-model="formData.description"
          type="textarea"
          rows="3"
          placeholder="如有特殊打印要求（如填充率、层高），请在此说明"
        />
      </el-form-item>

      <!-- Submit Button -->
      <el-form-item>
        <el-button type="primary" size="large" class="submit-btn" @click="submitForm(formRef)">
          提交预约申请
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style scoped>
.print-form-card {
  border-radius: 12px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.card-header {
  display: flex;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.print-form {
  padding: 10px 0;
}

.form-section-title :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.spool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  width: 100%;
}

.spool-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background-color: var(--el-bg-color);
}

.spool-card:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.spool-card.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.spool-color-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.1);
  margin-right: 12px;
  flex-shrink: 0;
}

.spool-info {
  flex: 1;
  overflow: hidden;
}

.spool-type {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
}

.spool-detail {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spool-remaining {
  font-size: 11px;
  opacity: 0.8;
}

.selection-check {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--el-color-primary);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.estimation-row {
  display: flex;
  gap: 20px;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
  font-weight: 600;
}

/* Dark Mode Styles */
.theme-dark.print-form-card {
  background-color: #1E1E1E;
  border-color: #363637;
}

.theme-dark .spool-card {
  background-color: #2b2b2b;
  border-color: #4c4c4c;
}

.theme-dark .spool-card:hover {
  border-color: #409EFF;
  background-color: #333;
}

.theme-dark .spool-card.active {
  background-color: rgba(64, 158, 255, 0.2);
  border-color: #409EFF;
}

.theme-dark .spool-type {
  color: #E5EAF3;
}

.theme-dark .spool-detail {
  color: #A3A6AD;
}

.theme-dark .form-section-title :deep(.el-form-item__label) {
  color: #E5EAF3;
}
</style>
