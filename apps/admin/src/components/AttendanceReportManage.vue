<template>
  <div class="attendance-report-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>出勤报告管理</h2>
    </div>

    <!-- 说明 -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px;"
    >
      每天 00:00 自动汇总昨日全平台出勤明细（HTML 正文 + CSV 附件），发送给下方收件人。
      收件人通过 RBAC 权限 <el-tag size="small">attendance_report_recipient</el-tag> 管理。
    </el-alert>

    <!-- 收件人管理 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>邮件收件人（{{ recipients.length }} 人）</span>
          <div>
            <el-button type="primary" :icon="Plus" @click="showAddDialog">添加收件人</el-button>
            <el-button :icon="Refresh" @click="fetchRecipients" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="recipients" v-loading="loading" stripe>
        <el-table-column prop="user_id" label="ID" width="70" />
        <el-table-column prop="username" label="姓名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="220" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="danger" text :icon="Delete" @click="handleRemove(row)">移除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <span style="color: #909399;">暂无收件人，点击右上角「添加收件人」</span>
        </template>
      </el-table>
    </el-card>

    <!-- 测试发送 -->
    <el-card shadow="never" style="margin-top: 16px;">
      <template #header><span>发送测试邮件</span></template>
      <el-form inline>
        <el-form-item label="报告日期">
          <el-date-picker
            v-model="testDate"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledFuture"
            placeholder="不选则默认昨日"
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Promotion" @click="handleSendTest" :loading="sending">
            立即发送测试邮件
          </el-button>
        </el-form-item>
      </el-form>
      <p class="hint">
        将立即生成所选日期的出勤汇总，发送给上方全部收件人（{{ recipients.length }} 人）。
        用于验证邮件格式与 SMTP 连通性，或补发某天的报告。
      </p>
    </el-card>

    <!-- 添加收件人对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加收件人"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-select
        v-model="addUserIds"
        multiple
        filterable
        placeholder="搜索姓名/邮箱选择用户"
        style="width: 100%;"
      >
        <el-option
          v-for="u in candidateUsers"
          :key="u.id"
          :label="`${u.username} (${u.email})`"
          :value="u.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="adding">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Refresh, Delete, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

// 收件人资格对应的 RBAC 权限名
const PERMISSION_NAME = 'attendance_report_recipient'

const loading = ref(false)
const sending = ref(false)
const adding = ref(false)

const recipients = ref([])     // 当前收件人 [{ user_id, username, email }]
const allUsers = ref([])       // 全部用户
const addDialogVisible = ref(false)
const addUserIds = ref([])
const testDate = ref('')

// 候选用户 = 全部用户 - 已是收件人的（避免重复添加）
const candidateUsers = computed(() => {
  const ids = new Set(recipients.value.map(r => r.user_id))
  return allUsers.value.filter(u => !ids.has(u.id))
})

// ── 获取当前收件人 ──
async function fetchRecipients() {
  loading.value = true
  try {
    const res = await api({ url: '/attendance-report/recipients', method: 'get' })
    if (res.data.code === 200) {
      recipients.value = res.data.data.recipients
    }
  } catch (e) {
    console.error('获取收件人失败:', e)
    ElMessage.error('获取收件人失败')
  } finally {
    loading.value = false
  }
}

// ── 获取全部用户（添加收件人时选择） ──
// 注意：/user/user_list 直接返回数组，字段为 User_Id / User_Name / User_Email
async function fetchUsers() {
  try {
    const res = await api({ url: '/user/user_list', method: 'get' })
    const list = Array.isArray(res.data) ? res.data : (res.data.data || [])
    allUsers.value = list.map(u => ({
      id: u.User_Id ?? u.id,
      username: u.User_Name ?? u.username,
      email: u.User_Email ?? u.email,
    }))
  } catch (e) {
    console.error('获取用户列表失败:', e)
    ElMessage.error('获取用户列表失败（需要用户管理权限）')
  }
}

function showAddDialog() {
  addUserIds.value = []
  addDialogVisible.value = true
}

// ── 批量添加收件人（逐个 assign 该权限） ──
async function handleAdd() {
  if (addUserIds.value.length === 0) {
    ElMessage.warning('请至少选择一个用户')
    return
  }
  adding.value = true
  try {
    let ok = 0, fail = 0
    for (const uid of addUserIds.value) {
      try {
        const res = await api({
          url: '/permissions/assign',
          method: 'post',
          data: { user_id: uid, permission_name: PERMISSION_NAME },
        })
        if (res.data.code === 200) ok++
        else fail++
      } catch {
        fail++
      }
    }
    if (ok > 0) {
      ElMessage.success(`已添加 ${ok} 位收件人${fail ? `，${fail} 位失败（可能已有权限）` : ''}`)
    } else {
      ElMessage.warning('添加失败，请检查权限接口')
    }
    addDialogVisible.value = false
    fetchRecipients()
  } finally {
    adding.value = false
  }
}

// ── 移除收件人（revoke 该权限） ──
async function handleRemove(row) {
  try {
    await ElMessageBox.confirm(
      `确定移除「${row.username}」的出勤报告收件人权限？移除后将不再收到勤邮件。`,
      '移除收件人',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    const res = await api({
      url: '/permissions/revoke',
      method: 'post',
      data: { user_id: row.user_id, permission_name: PERMISSION_NAME },
    })
    if (res.data.code === 200) {
      ElMessage.success('已移除')
      fetchRecipients()
    } else {
      ElMessage.error(res.data.message || '移除失败')
    }
  } catch (e) {
    console.error('移除失败:', e)
    ElMessage.error('移除失败')
  }
}

// ── 发送测试邮件 ──
async function handleSendTest() {
  if (recipients.value.length === 0) {
    ElMessage.warning('当前没有收件人，请先添加')
    return
  }
  sending.value = true
  try {
    const payload = testDate.value ? { date: testDate.value } : {}
    const res = await api({
      url: '/attendance-report/send_now',
      method: 'post',
      data: payload,
    })
    if (res.data.code === 200) {
      const d = res.data.data
      ElMessage.success(`已发送：${d.date}，出勤 ${d.person_count} 人，总时长 ${d.total_hours} 小时`)
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (e) {
    console.error('发送测试失败:', e)
    ElMessage.error('发送失败，请查看后端日志')
  } finally {
    sending.value = false
  }
}

function disabledFuture(date) {
  return date.getTime() > Date.now()
}

onMounted(() => {
  fetchRecipients()
  fetchUsers()
})
</script>

<style scoped>
.attendance-report-manage {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint {
  color: #909399;
  font-size: 13px;
  margin: 8px 0 0;
}
</style>
