<script setup>
// 偏好设置（首用引导三必设的落点）：日可安排窗口、默认提醒提前量、自动安排模式
// （Phase 1 仅存储展示——智能排程 Phase 2 上线后生效）。409 → 提示并强制重拉。
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewSelect, DewButton, DewSkeleton } from '@bme/dew-ui'
import { useScheduleProfile } from '../../composables/useScheduleProfile'

const REMINDER_OPTIONS = [
  { label: '提前 5 分钟', value: 5 },
  { label: '提前 10 分钟', value: 10 },
  { label: '提前 15 分钟（默认）', value: 15 },
  { label: '提前 30 分钟', value: 30 },
  { label: '提前 1 小时', value: 60 },
  { label: '提前 2 小时', value: 120 }
]
const MODE_OPTIONS = [
  { label: '完全手动', value: 'manual' },
  { label: '适度自动（敬请期待）', value: 'suggest' },
  { label: '积极自动（敬请期待）', value: 'auto' }
]

const { profile, load, save } = useScheduleProfile()
const loading = ref(true)
const saving = ref(false)
const form = reactive({ day_start_time: '09:00', day_end_time: '22:00', default_reminder_minutes: 15 })

onMounted(async () => {
  const data = await load(true)
  if (data) {
    form.day_start_time = data.day_start_time
    form.day_end_time = data.day_end_time
    form.default_reminder_minutes = data.default_reminder_minutes
  }
  loading.value = false
})

async function submit() {
  if (form.day_start_time >= form.day_end_time) {
    ElMessage.warning('开始时间必须早于结束时间')
    return
  }
  saving.value = true
  try {
    const data = await save({
      day_start_time: form.day_start_time,
      day_end_time: form.day_end_time,
      default_reminder_minutes: form.default_reminder_minutes,
      expected_version: profile.value?.version
    })
    ElMessage.success('偏好已保存')
    form.day_start_time = data.day_start_time
    form.day_end_time = data.day_end_time
    form.default_reminder_minutes = data.default_reminder_minutes
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
    const fresh = await load(true)      // 409 等场景：重拉最新版本供再次编辑
    if (fresh) Object.assign(form, {
      day_start_time: fresh.day_start_time,
      day_end_time: fresh.day_end_time,
      default_reminder_minutes: fresh.default_reminder_minutes
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="settings-panel">
    <DewCard size="lg" divided class="settings-card">
      <template #header>
        <div class="card-head">日程偏好</div>
      </template>
      <DewSkeleton v-if="loading" variant="text" :lines="4" />
      <div v-else class="form-grid">
        <label class="field-label">每日可安排时段</label>
        <div class="window-row">
          <el-time-select v-model="form.day_start_time" start="05:00" step="00:30" end="23:30" placeholder="开始" />
          <span class="range-sep">至</span>
          <el-time-select v-model="form.day_end_time" start="05:00" step="00:30" end="23:30" placeholder="结束" />
        </div>
        <span class="field-hint">用于计算「今日可安排时间」；也是无具体时刻截止的提醒基线（默认 22:00 日终）</span>

        <label class="field-label">默认提醒提前量</label>
        <DewSelect v-model="form.default_reminder_minutes" :options="REMINDER_OPTIONS" />

        <label class="field-label">自动安排模式</label>
        <div class="mode-row">
          <DewSelect :model-value="profile?.automation_mode || 'manual'" :options="MODE_OPTIONS" disabled />
          <span class="field-hint">智能排程即将上线，当前所有时间安排均为手动</span>
        </div>
      </div>
      <template #footer>
        <div class="footer-row">
          <DewButton type="glass" :loading="saving" @click="submit">保存</DewButton>
        </div>
      </template>
    </DewCard>
  </div>
</template>

<style scoped>
.settings-panel {
  max-width: 640px;
}

.card-head {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.form-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px 12px;
  align-items: center;
}

.field-label {
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  text-align: right;
}

.field-hint {
  grid-column: 2;
  font-size: var(--text-xs);
  color: var(--dew-text-faint);
  line-height: 1.5;
  margin-top: -8px;
}

.window-row,
.mode-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.range-sep {
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}

.footer-row {
  display: flex;
  justify-content: flex-end;
}
</style>
