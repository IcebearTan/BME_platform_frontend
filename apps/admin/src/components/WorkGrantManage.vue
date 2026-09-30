<template>
  <div class="selectable">
    <div class="page-header">
      <div>
        <div class="page-title">协作授权</div>
        <div class="page-subtitle-inline">内部工作台的授权与工作区治理（依据=在任任职或组归属，资格不等于权限）</div>
      </div>
      <div class="header-actions">
        <el-button @click="fetchAll" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      授权岗位仅三档：组员（本组工作人员）/ 协调员（本组分派与验收协调）/ 治理（全局授权管理，仅超管可授）。
      依据「任职」的授权随卸任或任期结束自动失效；依据「组归属」的授权随调组自动失效（绑定授权时组快照）——
      均为下一请求即时生效，无需重新登录。
    </p>

    <!-- 工作区管理 -->
    <DewCard no-hover class="table-card">
      <template #header>
        <div class="card-head">
          <span>组工作区</span>
          <span class="card-head-hint">一组最多一个；停用=入口关闸，数据与授权记录保留</span>
        </div>
      </template>
      <el-table :data="workspaces" v-loading="loading" style="width: 100%"
                max-height="calc(100vh - 320px)">
        <el-table-column label="组别" min-width="160">
          <template #default="{ row }">
            <span>{{ row.group_name }}</span>
            <span class="option-id">#{{ row.club_group_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="工作区状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="group_status" label="组状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.group_status === 'active' ? '' : 'info'" size="small">
              {{ row.group_status === 'active' ? '启用' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="active_grants" label="有效授权" width="90" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'active'" size="small" type="warning" plain
                       @click="toggleWorkspace(row, 'disabled')">停用</el-button>
            <el-button v-else size="small" type="success" plain
                       @click="toggleWorkspace(row, 'active')">启用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="open-ws-row">
        <el-cascader v-model="newWsGroup" :options="openableGroupOptions" :props="cascaderProps"
                     placeholder="选择要开通工作区的启用组" clearable style="width: 320px;" />
        <el-button type="primary" :disabled="!newWsGroup" :loading="wsSaving" @click="openWorkspace">开通工作区</el-button>
      </div>
    </DewCard>

    <!-- 开通授权 + 授权记录 + 撤销（拆分组件 GrantListSection） -->
    <GrantListSection ref="grantListRef" :users="users" :users-loading="usersLoading"
                      :workspaces="workspaces" @changed="fetchWorkspaces" />

    <!-- 治理工具：接管队列/交接清单/紧急介入（拆分组件 GovToolsSection） -->
    <GovToolsSection ref="govToolsRef" :users="users" :users-loading="usersLoading" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'
import { buildGroupCascaderOptions } from '../utils/club'
import GrantListSection from './GrantListSection.vue'
import GovToolsSection from './GovToolsSection.vue'

// ── 基础数据 ──
const loading = ref(false)
const users = ref([])
const usersLoading = ref(false)
const groupOptions = ref([])
const workspaces = ref([])
const cascaderProps = { checkStrictly: true, emitPath: false }
const grantListRef = ref(null)
const govToolsRef = ref(null)

const fetchUsers = async () => {
  usersLoading.value = true
  try {
    const res = await api({ url: '/user/user_list', method: 'get' })
    users.value = res.data || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取用户名单失败')
  } finally {
    usersLoading.value = false
  }
}

const fetchGroups = async () => {
  try {
    const res = await api({ url: '/admin/club/groups', method: 'get' })
    groupOptions.value = buildGroupCascaderOptions(res.data?.data?.groups || [])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组树失败')
  }
}

const fetchWorkspaces = async () => {
  try {
    const res = await api({ url: '/work/governance/workspaces', method: 'get' })
    workspaces.value = res.data?.data?.workspaces || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取工作区列表失败')
  }
}

// 已开通工作区的组不再出现在开通选择里
const openableGroupOptions = computed(() => {
  const opened = new Set(workspaces.value.map(w => w.club_group_id))
  const walk = (nodes) => nodes
    .filter(n => !opened.has(n.value))
    .map(n => ({ ...n, children: n.children ? walk(n.children) : undefined }))
    .map(n => ({ ...n, children: n.children?.length ? n.children : undefined }))
  return walk(groupOptions.value)
})

// ── 工作区开通与启停 ──
const newWsGroup = ref(null)
const wsSaving = ref(false)

const openWorkspace = async () => {
  if (!newWsGroup.value) return
  wsSaving.value = true
  try {
    const res = await api({ url: '/work/governance/workspaces', method: 'post',
                            data: { club_group_id: newWsGroup.value } })
    ElMessage.success(res.data?.message || '工作区已开通')
    newWsGroup.value = null
    await fetchWorkspaces()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '开通失败')
  } finally {
    wsSaving.value = false
  }
}

const toggleWorkspace = async (row, status) => {
  const action = status === 'disabled' ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(
      status === 'disabled'
        ? `停用「${row.group_name}」工作区后，成员将无法进入（数据与授权记录保留）。确认停用？`
        : `重新启用「${row.group_name}」工作区？`,
      `${action}工作区`, { confirmButtonText: action, cancelButtonText: '取消' })
  } catch { return }
  try {
    const res = await api({ url: `/work/governance/workspaces/${row.id}/status`, method: 'post',
                            data: { status } })
    ElMessage.success(res.data?.message || `已${action}`)
    await fetchWorkspaces()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || `${action}失败`)
  }
}

const fetchAll = async () => {
  loading.value = true
  await Promise.allSettled([
    fetchWorkspaces(),
    grantListRef.value?.fetchGrants(),
    govToolsRef.value?.fetchTakeover(),
  ])
  loading.value = false
}

onMounted(() => {
  fetchUsers()
  fetchGroups()
  fetchAll()
})
</script>

<style scoped>
.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.page-subtitle-inline { margin-top: 4px; font-size: var(--text-sm); color: var(--el-text-color-secondary); }

.table-card { margin-bottom: 16px; }
.table-card :deep(.dew-card__body) { padding: 16px; }

.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.card-head-hint { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 400; }

.open-ws-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }

.option-id { margin-left: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
