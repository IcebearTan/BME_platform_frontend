<script setup>
// 服务设置（批次 A 只读）：白名单有效配置分组表——有效值/来源/适用组件/是否
// 需重启；密钥只显示配置状态。无任何写操作入口（批次 B 才引入在线配置）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag } from '@bme/dew-ui'
import { scheduleAdminService } from '../scheduleAdminService'

const settings = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    settings.value = await scheduleAdminService.fetchSettings()
  } catch (err) {
    ElMessage.error(err.message || '配置加载失败')
  } finally {
    loading.value = false
  }
})

function displayValue(value) {
  if (typeof value === 'boolean') return value ? '开启' : '关闭'
  return String(value)
}

const SOURCE_META = {
  env: { label: '环境变量', tag: 'primary' },
  default: { label: '应用默认', tag: 'info' },
  code: { label: '代码常量', tag: 'neutral' },
}
</script>

<template>
  <div class="settings-panel" v-loading="loading">
    <template v-if="settings">
      <div class="scope-note">
        更新于 {{ settings.as_of }}。{{ settings.scope_note }}；「需重启」指修改该值后须重启进程生效。
      </div>

      <DewCard v-for="group in settings.groups" :key="group.section" size="md" divided class="settings-group">
        <template #header><span class="card-head">{{ group.section }}</span></template>
        <el-table :data="group.items" size="small">
          <el-table-column prop="key" label="配置项" min-width="280" show-overflow-tooltip />
          <el-table-column label="有效值" width="130">
            <template #default="{ row }">
              <span class="value-text">{{ displayValue(row.value) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="160">
            <template #default="{ row }">
              <DewTag :type="(SOURCE_META[row.source] || {}).tag || 'info'" size="sm">
                {{ row.source }}
              </DewTag>
            </template>
          </el-table-column>
          <el-table-column prop="component" label="适用组件" min-width="200" show-overflow-tooltip />
          <el-table-column label="生效方式" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.restart_needed ? 'restart-yes' : 'restart-no'">
                {{ row.restart_needed ? '需重启' : '即时' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </DewCard>

      <DewCard size="md" divided class="settings-group">
        <template #header><span class="card-head">密钥状态（只显示是否已配置）</span></template>
        <div v-for="s in settings.secrets" :key="s.key" class="secret-row">
          <span class="value-text">{{ s.key }}</span>
          <DewTag :type="s.configured ? 'success' : 'danger'" size="sm">
            {{ s.configured ? '已配置' : '未配置' }}
          </DewTag>
          <span class="secret-note">{{ s.note }}</span>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<style scoped>
.scope-note {
  font-size: 13px;
  color: var(--text-secondary, var(--text-primary));
  line-height: 1.6;
}

.card-head {
  font-size: 13px;
  font-weight: 600;
}

.value-text {
  font-variant-numeric: tabular-nums;
}

.restart-yes {
  color: var(--color-warning, #d97706);
}

.restart-no {
  color: var(--text-secondary, var(--text-primary));
}

.secret-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
}

.secret-row + .secret-row {
  border-top: 1px solid var(--border-light, rgba(0, 0, 0, 0.06));
}

.secret-note {
  font-size: 12px;
  color: var(--text-faint, var(--text-secondary));
}
</style>
