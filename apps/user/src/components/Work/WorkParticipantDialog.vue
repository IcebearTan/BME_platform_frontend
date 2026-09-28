<script setup>
// 邀请参与者对话框（§5.2 独立共享能力）：候选来自 /work/candidates
// （后端只返回有协作资格者——无权者不在可发送列表，§5.3）。
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DewDialog } from '@bme/dew-ui'
import api from '../../api'
import { workService } from '../../services/workService'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  itemId: { type: Number, required: true },
  existing: { type: Array, default: () => [] },     // 已是参与者的 user_id 列表
})
const emit = defineEmits(['update:modelValue', 'invited'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const candidates = ref([])
const loadingCandidates = ref(false)
const form = reactive({ userId: null, ptype: 'collaborator' })
const saving = ref(false)

async function loadCandidates() {
  loadingCandidates.value = true
  try {
    const res = await api.get('/work/candidates')
    const inSet = new Set(props.existing)
    candidates.value = (res.data?.data?.candidates || [])
      .filter(c => !inSet.has(c.user_id))
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '候选人加载失败')
  } finally {
    loadingCandidates.value = false
  }
}

watch(visible, (open) => {
  if (open) {
    form.userId = null
    form.ptype = 'collaborator'
    loadCandidates()
  }
})

async function submit() {
  if (!form.userId || saving.value) return
  saving.value = true
  try {
    await workService.addParticipant(props.itemId, {
      user_id: form.userId, ptype: form.ptype,
    })
    ElMessage.success('已加入参与者（对方会收到通知）')
    visible.value = false
    emit('invited')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '邀请失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DewDialog v-model="visible" title="邀请参与者" :width="440">
    <el-form label-width="80px">
      <el-form-item label="成员" required>
        <el-select v-model="form.userId" filterable style="width: 100%;"
                   :loading="loadingCandidates" placeholder="搜索并选择（仅显示有协作资格者）">
          <el-option v-for="c in candidates" :key="c.user_id" :label="c.username" :value="c.user_id">
            <span>{{ c.username }}</span>
            <span class="option-id">#{{ c.user_id }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="参与方式">
        <el-radio-group v-model="form.ptype">
          <el-radio value="collaborator">协作者</el-radio>
          <el-radio value="observer">观察者</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!form.userId" @click="submit">邀请</el-button>
    </template>
  </DewDialog>
</template>

<style scoped>
.option-id { float: right; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
