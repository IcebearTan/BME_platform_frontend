<template>
  <el-dialog :model-value="modelValue" title="任命组长" width="540px"
    @update:model-value="v => emit('update:modelValue', v)" @open="onOpen">
    <el-form :model="form" label-width="100px">
      <el-form-item label="小组">
        <span class="group-line">{{ groupName }}</span>
      </el-form-item>
      <el-form-item label="成员" required>
        <el-select v-model="form.user_id" filterable placeholder="搜索并选择社员（不必已在组内）"
          style="width: 100%;" :loading="usersLoading">
          <el-option v-for="u in users" :key="u.User_Id" :label="u.User_Name" :value="u.User_Id">
            <span>{{ u.User_Name }}</span>
            <span v-if="u.verification_status && u.verification_status !== 'verified'" class="option-warn">未核验</span>
            <span class="option-id">#{{ u.User_Id }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="组内职位" required>
        <el-select v-model="form.position_id" style="width: 100%;">
          <el-option v-for="p in slotPositions" :key="p.id" :label="p.name" :value="p.id">
            <span>{{ p.name }}</span>
            <span class="option-id">{{ holderText(p.id) }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item v-if="incumbent" label="现任">
        <span class="incumbent-line">
          {{ incumbent.username }}（{{ incumbent.title }}）——提交后自动卸任并留档
        </span>
      </el-form-item>
      <el-form-item label="任期起" required>
        <el-date-picker v-model="form.term_start" type="date" value-format="YYYY-MM-DD"
          placeholder="选择日期" style="width: 100%;" />
      </el-form-item>
      <el-form-item label-width="0">
        <el-checkbox v-model="form.sync_primary">同步设为其主要组（原主要组归属将被替换）</el-checkbox>
      </el-form-item>
      <el-form-item label="卸任原因">
        <el-input v-model="form.end_reason" maxlength="200" placeholder="默认「组长更替」" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确认任命</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  groupId: { type: Number, default: null },
  groupName: { type: String, default: '' },
  // 组工作台 detail 的 leader_slots（含空缺），职位选项与现任信息都从这里来
  slots: { type: Array, default: () => [] },
  presetUserId: { type: Number, default: null },
  presetPositionId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue', 'success'])

const router = useRouter()

const slotPositions = computed(() => props.slots.map(s => s.position))

const incumbent = computed(() => {
  const slot = props.slots.find(s => s.position.id === form.position_id)
  return slot?.officers?.[0] || null
})

const holderText = (pid) => {
  const slot = props.slots.find(s => s.position.id === pid)
  if (!slot) return ''
  return slot.vacant ? '空缺' : `现任 ${slot.officers[0].username}`
}

// ── 成员名单：懒加载一次 ──
const users = ref([])
const usersLoading = ref(false)
async function fetchUsers() {
  if (users.value.length) return
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

const today = () => new Date().toISOString().slice(0, 10)
const form = reactive({ user_id: null, position_id: null, term_start: today(),
                        sync_primary: true, end_reason: '' })
const submitting = ref(false)

function onOpen() {
  form.user_id = props.presetUserId ?? null
  // 槽位卡进入带预选职位；成员行「设为组长」进缺省组长类职位（第一个槽）
  form.position_id = props.presetPositionId ?? slotPositions.value[0]?.id ?? null
  form.term_start = today()
  form.sync_primary = true
  form.end_reason = ''
  fetchUsers()
}

function confirmText() {
  const u = users.value.find(x => x.User_Id === form.user_id)
  const name = u?.User_Name || `#${form.user_id}`
  const pos = slotPositions.value.find(p => p.id === form.position_id)
  const posName = pos?.name || '组长'
  if (incumbent.value && incumbent.value.user_id === form.user_id) {
    return `${name} 连任 ${posName}，任期将重置为 ${form.term_start} 起。`
  }
  const oldPart = incumbent.value
    ? `将卸任 ${incumbent.value.username}（留档原因：${form.end_reason || '组长更替'}），`
    : ''
  return `${oldPart}任命 ${name} 为 ${posName} · ${props.groupName}。`
}

async function submit() {
  if (!form.user_id) return ElMessage.warning('请选择成员')
  if (!form.position_id) return ElMessage.warning('请选择组内职位')
  if (!form.term_start) return ElMessage.warning('请选择任期起')
  try {
    await ElMessageBox.confirm(confirmText(), '确认任命', {
      type: 'info', confirmButtonText: '确定', cancelButtonText: '取消',
    })
  } catch { return }

  submitting.value = true
  try {
    const res = await api({
      url: `/admin/club/groups/${props.groupId}/leader`,
      method: 'post',
      data: {
        user_id: form.user_id, position_id: form.position_id,
        term_start: form.term_start, sync_primary: form.sync_primary,
        end_reason: form.end_reason || undefined,
      },
    })
    ElMessage.success(res.data?.message || '已任命')
    emit('update:modelValue', false)
    emit('success', res.data?.data)
  } catch (e) {
    const msg = e.response?.data?.message || '任命失败'
    // 一人一职 / 编制满等拦截：引导去社团职务页先处理，回来重试
    if (e.response?.status === 409) {
      try {
        await ElMessageBox.confirm(msg, '任命被拦截', {
          confirmButtonText: '前往社团职务处理',
          cancelButtonText: '留在本页',
          type: 'warning',
        })
        emit('update:modelValue', false)
        router.push({ name: 'org.officers', query: { q: users.value.find(x => x.User_Id === form.user_id)?.User_Name || '' } })
      } catch { /* 留在本页 */ }
    } else {
      ElMessage.error(msg)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.group-line {
  font-weight: 500;
}

.incumbent-line {
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.option-id {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.option-warn {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
