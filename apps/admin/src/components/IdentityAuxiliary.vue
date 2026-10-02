<script setup>
// 辅助账号授权管理（P2-9，规格 9.3）：批准（用途+期限默认 90 天）/ 撤销 / 临期标红。
// 同人关系不替代角色授权；到期实时失效；巡检会对临期/过期发告警。
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])

const fetchGrants = async () => {
  loading.value = true
  try {
    const res = await api({ url: '/admin/identity/auxiliary-grants', method: 'get' })
    if (res.data.code === 200) rows.value = res.data.grants || []
  } catch {
    ElMessage.error('授权列表加载失败')
  } finally {
    loading.value = false
  }
}

const approve = ref({ visible: false, user_id: null, keyword: '', purpose: '',
                      scope: '', days: 90, busy: false, matched: null })

const openApprove = () => {
  approve.value = { visible: true, user_id: null, keyword: '', purpose: '',
                    scope: '', days: 90, busy: false, matched: null }
}

let userCache = null
const search = async () => {
  const kw = approve.value.keyword.trim().toLowerCase()
  if (!kw) return
  try {
    if (!userCache) {
      const res = await api({ url: '/user/user_list', method: 'get' })
      userCache = res.data?.users || res.data?.data || []
    }
    approve.value.matched = userCache.filter(u =>
      (u.username || '').toLowerCase().includes(kw)
      || (u.email || '').toLowerCase().includes(kw)).slice(0, 5)
  } catch {
    approve.value.matched = []
  }
}

const submit = async () => {
  const a = approve.value
  if (!a.user_id || !a.purpose.trim()) {
    ElMessage.warning('请选择目标账号并填写用途')
    return
  }
  a.busy = true
  try {
    const res = await api({
      url: '/admin/identity/auxiliary-grants', method: 'post',
      data: { user_id: a.user_id, purpose: a.purpose, scope: a.scope, days: a.days } })
    if (res.data.code === 200) {
      ElMessage.success('辅助账号已批准')
      a.visible = false
      fetchGrants()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    const m = error?.response?.data?.message
    ElMessage.error((typeof m === 'string' && m) || '操作失败')
  } finally {
    a.busy = false
  }
}

const revoke = async (row) => {
  try {
    await ElMessageBox.confirm(`撤销 ${row.username} 的辅助授权？无其他有效授权时账号类型回落普通。`,
                               '撤销授权', { type: 'warning' })
  } catch { return }
  try {
    const res = await api({
      url: `/admin/identity/auxiliary-grants/${row.id}/revoke`, method: 'post' })
    if (res.data.code === 200) {
      ElMessage.success('已撤销')
      fetchGrants()
    }
  } catch (error) {
    const m = error?.response?.data?.message
    ElMessage.error((typeof m === 'string' && m) || '操作失败')
  }
}

onMounted(fetchGrants)
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">辅助账号</div>
      <div class="header-actions">
        <el-button type="primary" @click="openApprove">批准辅助账号</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%"
                height="calc(100vh - 320px)" :row-style="{ height: '50px' }">
        <el-table-column prop="user_id" label="账号 ID" width="90" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="purpose" label="用途" min-width="180" show-overflow-tooltip />
        <el-table-column prop="scope" label="范围" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.state === 'active' ? 'success' : 'danger'" effect="plain" size="small">
              {{ row.state === 'active' ? '有效' : (row.state === 'expired' ? '已过期' : '已撤销') }}
            </el-tag>
            <el-tag v-if="row.expiring_soon" type="warning" effect="plain" size="small">临期</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="valid_until" label="到期" width="150" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.state === 'active'" link type="danger" @click="revoke(row)">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <el-dialog v-model="approve.visible" title="批准辅助账号" width="520px" append-to-body>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="目标账号（按用户名/邮箱搜索后选择）">
          <el-input v-model="approve.keyword" placeholder="搜索用户名或邮箱" @keyup.enter="search">
            <template #append><el-button @click="search">搜索</el-button></template>
          </el-input>
          <div v-if="approve.matched" class="match-list">
            <div v-for="u in approve.matched" :key="u.id"
                 class="match-row" :class="{ picked: approve.user_id === u.id }"
                 @click="approve.user_id = u.id">
              #{{ u.id }} {{ u.username }}（{{ u.email }}）
            </div>
            <div v-if="!approve.matched.length" class="muted">无匹配</div>
          </div>
        </el-form-item>
        <el-form-item label="用途（必填，到期复核依据）">
          <el-input v-model="approve.purpose" placeholder="如：营期运营协助（名册核对）" />
        </el-form-item>
        <el-form-item label="范围（可选）">
          <el-input v-model="approve.scope" placeholder="如：2026 秋季营 / 某组工作区" />
        </el-form-item>
        <el-form-item label="有效期（天，默认 90——到期实时失效，巡检提醒复核）">
          <el-input-number v-model="approve.days" :min="1" :max="365" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="approve.visible = false">取消</el-button>
          <el-button type="primary" :loading="approve.busy" @click="submit">批准</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.match-list { margin-top: 8px; width: 100%; }
.match-row { padding: 6px 10px; cursor: pointer; border-radius: 6px; font-size: 13px; }
.match-row:hover { background: var(--el-fill-color-light); }
.match-row.picked { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 600; }
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
</style>
