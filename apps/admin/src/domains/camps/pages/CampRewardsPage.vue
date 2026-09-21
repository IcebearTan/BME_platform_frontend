<template>
  <div class="camp-rewards-page">
    <div class="page-header">
      <div class="page-title">奖励</div>
      <div class="header-actions">
        <span class="hint">营内发奖自动关联本营（camp_session_id）；勋章定义与全局发放记录在「勋章中心」</span>
      </div>
    </div>

    <DewCard no-hover class="reward-card">
      <el-form :model="rewardForm" label-width="70px" style="max-width: 480px;">
        <el-form-item label="学员">
          <el-select v-model="rewardForm.user_id" filterable remote reserve-keyword
            :remote-method="memberPicker.search" :loading="memberPicker.loading.value"
            placeholder="输入姓名搜索学员" style="width: 100%;" @visible-change="memberPicker.onOpen">
            <el-option v-for="m in memberPicker.options.value" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="勋章">
          <el-select v-model="rewardForm.medal_id" placeholder="选择勋章" style="width: 100%;">
            <el-option v-for="md in medals" :key="md.id" :label="md.name" :value="md.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="rewardForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="rewardSubmitting" @click="issueReward">发放奖励</el-button>
        </el-form-item>
      </el-form>
    </DewCard>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { createMemberPicker } from '../shared/memberOptions'

const ctx = useCampContext()
const { campId, options } = ctx
const { medals, ensureMedals } = options

const rewardForm = reactive({ user_id: null, medal_id: null, description: '' })
const rewardSubmitting = ref(false)
const memberPicker = createMemberPicker(campId, 'student')

async function issueReward() {
  if (!rewardForm.user_id || !rewardForm.medal_id) { ElMessage.warning('请选择学员和勋章'); return }
  rewardSubmitting.value = true
  try {
    await api.post('/camp/reward', {
      camp_session_id: campId.value,
      user_id: rewardForm.user_id, medal_id: rewardForm.medal_id,
      description: rewardForm.description,
    })
    ElMessage.success('奖励已发放')
    rewardForm.description = ''
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发放失败')
  } finally {
    rewardSubmitting.value = false
  }
}

onMounted(ensureMedals)
</script>

<style scoped>
.camp-rewards-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reward-card :deep(.dew-card__body) {
  padding: 20px;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
