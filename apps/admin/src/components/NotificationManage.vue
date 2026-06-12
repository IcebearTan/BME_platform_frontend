<template>
  <div class="notification-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>通知管理</h2>
      <el-button type="primary" :icon="Plus" @click="showSendDialog">
        发送系统通知
      </el-button>
    </div>

    <!-- 发送通知对话框 -->
    <el-dialog
      v-model="sendDialogVisible"
      title="发送系统通知"
      width="550px"
      :close-on-click-modal="false"
    >
      <el-form :model="sendForm" :rules="sendRules" ref="sendFormRef" label-width="90px">
        <el-form-item label="通知标题" prop="title">
          <el-input v-model="sendForm.title" placeholder="请输入通知标题" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="通知内容" prop="content">
          <el-input
            v-model="sendForm.content"
            type="textarea"
            placeholder="请输入通知内容"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="接收对象" prop="targetType">
          <el-radio-group v-model="sendForm.targetType">
            <el-radio value="all">所有用户</el-radio>
            <el-radio value="specified">指定用户</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="sendForm.targetType === 'specified'" label="选择用户" prop="user_ids">
          <el-select
            v-model="sendForm.user_ids"
            multiple
            filterable
            placeholder="搜索并选择用户"
            style="width: 100%"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="`${user.username} (${user.email})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标记重要">
          <el-switch v-model="sendForm.is_important" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="sendDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSend" :loading="sending">发送</el-button>
      </template>
    </el-dialog>

    <!-- 已发送通知列表 -->
    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>已发送通知</span>
          <el-tag type="info" size="small">共 {{ total }} 条</el-tag>
        </div>
      </template>

      <el-table :data="notificationList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
        <el-table-column label="接收人" width="120">
          <template #default="{ row }">
            <span>{{ getUserName(row.user_id) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="重要" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_important" type="danger" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已读" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_read" type="success" size="small">是</el-tag>
            <el-tag v-else type="warning" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: center; margin-top: 16px;">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api'

// ── 状态 ──
const loading = ref(false)
const sending = ref(false)
const sendDialogVisible = ref(false)
const sendFormRef = ref(null)

const notificationList = ref([])
const userList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const sendForm = reactive({
  title: '',
  content: '',
  targetType: 'all',
  user_ids: [],
  is_important: false,
})

const sendRules = {
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入通知内容', trigger: 'blur' }],
  targetType: [{ required: true, message: '请选择接收对象', trigger: 'change' }],
}

// ── 获取通知列表 ──
async function fetchList() {
  loading.value = true
  try {
    const res = await api({
      url: '/notification/list',
      method: 'get',
      params: { page: currentPage.value, per_page: pageSize.value, all: 'true' },
    })
    if (res.data.code === 200) {
      notificationList.value = res.data.data.notifications
      total.value = res.data.data.total
    }
  } catch (e) {
    console.error('获取通知列表失败:', e)
  } finally {
    loading.value = false
  }
}

// ── 获取用户列表（用于发送通知时选择接收人） ──
async function fetchUsers() {
  try {
    const res = await api({ url: '/user/all_users', method: 'get' })
    if (res.data.code === 200) {
      userList.value = res.data.users || res.data.data || []
    }
  } catch (e) {
    console.error('获取用户列表失败:', e)
  }
}

// ── 打开发送对话框 ──
function showSendDialog() {
  Object.assign(sendForm, {
    title: '',
    content: '',
    targetType: 'all',
    user_ids: [],
    is_important: false,
  })
  sendDialogVisible.value = true
}

// ── 发送通知 ──
async function handleSend() {
  try {
    await sendFormRef.value.validate()
  } catch {
    return
  }

  sending.value = true
  try {
    const payload = {
      title: sendForm.title,
      content: sendForm.content,
      category: 'system',
      source_type: 'admin',
      is_important: sendForm.is_important,
    }

    let res
    if (sendForm.targetType === 'all') {
      // 发给所有人
      res = await api({
        url: '/notification/batch_create',
        method: 'post',
        data: payload,
      })
    } else {
      // 发给指定用户
      if (sendForm.user_ids.length === 0) {
        ElMessage.warning('请至少选择一个用户')
        sending.value = false
        return
      }
      payload.user_ids = sendForm.user_ids
      res = await api({
        url: '/notification/batch_create',
        method: 'post',
        data: payload,
      })
    }

    if (res.data.code === 200) {
      ElMessage.success(res.data.message)
      sendDialogVisible.value = false
      fetchList()
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (e) {
    console.error('发送通知失败:', e)
    ElMessage.error('发送失败，请检查网络')
  } finally {
    sending.value = false
  }
}

// ── 工具函数 ──
function getUserName(userId) {
  const user = userList.value.find(u => u.id === userId)
  return user ? user.username : `用户#${userId}`
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── 初始化 ──
onMounted(() => {
  fetchList()
  fetchUsers()
})
</script>

<style scoped>
.notification-manage {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
</style>
