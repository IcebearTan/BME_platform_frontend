<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">成员组归属</div>
      <div class="header-actions">
        <el-button @click="fetchMeta" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      每人主要组 ×1 ＋ 次要组 ×0~1，两槽不能同组（建议允许同父不同子）；社长不挂组。
      归属是「干活地点」而非头衔——组织架构页人数分布与普通成员徽标（组名）都读这里。批量导入暂未开放（后端接口已预留）。
    </p>

    <DewCard class="form-card">
      <el-form label-width="90px" style="max-width: 560px;">
        <el-form-item label="成员" required>
          <el-select v-model="userId" filterable placeholder="搜索并选择社员" style="width: 100%;"
            :loading="usersLoading" @change="loadMembership">
            <el-option v-for="u in users" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id">
              <span>{{ u.User_Name }}</span>
              <span class="option-id">#{{ u.User_Id }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="主要组">
          <el-cascader v-model="form.primary" :options="groupOptions" :props="cascaderProps"
            :disabled="!userId" placeholder="主要干活的组" clearable style="width: 100%;" />
        </el-form-item>
        <el-form-item label="次要组">
          <el-cascader v-model="form.secondary" :options="groupOptions" :props="cascaderProps"
            :disabled="!userId" placeholder="帮忙干活的组（可不选）" clearable style="width: 100%;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" :disabled="!userId" @click="save">保存</el-button>
          <span class="form-hint">清空即清除该槽归属</span>
        </el-form-item>
      </el-form>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'
import { buildGroupCascaderOptions } from '../utils/club'

// ── 基础数据：用户名单 + 组树 ──
const users = ref([])
const usersLoading = ref(false)
const groupOptions = ref([])
const loading = ref(false)

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

const fetchMeta = async () => {
  loading.value = true
  try {
    const res = await api({ url: '/admin/club/groups', method: 'get' })
    groupOptions.value = buildGroupCascaderOptions(res.data?.data?.groups || [])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取组树失败')
  } finally {
    loading.value = false
  }
}

// ── 单人编辑 ──
const cascaderProps = { checkStrictly: true, emitPath: false }
const userId = ref(null)
const saving = ref(false)
const form = reactive({ primary: null, secondary: null })

const loadMembership = async (uid) => {
  form.primary = null
  form.secondary = null
  if (!uid) return
  try {
    const res = await api({ url: `/admin/club/membership/${uid}`, method: 'get' })
    const data = res.data?.data || {}
    form.primary = data.primary?.id ?? null
    form.secondary = data.secondary?.id ?? null
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取归属失败')
  }
}

const save = async () => {
  if (!userId.value) return ElMessage.warning('请先选择成员')
  if (form.primary && form.secondary && form.primary === form.secondary)
    return ElMessage.warning('主要组与次要组不能是同一个组')
  saving.value = true
  try {
    const res = await api({
      url: `/admin/club/membership/${userId.value}`,
      method: 'put',
      data: { primary: form.primary ?? null, secondary: form.secondary ?? null },
    })
    ElMessage.success(res.data?.message || '归属已更新')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchMeta()
})
</script>

<style scoped>
.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.form-card :deep(.dew-card__body) { padding: 20px; }

.option-id {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
