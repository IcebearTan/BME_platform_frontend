<script setup>
// 服务设置：在线配置区（B3/B4，三个白名单低耦合参数可发布覆盖，DB > env/
// 默认，逐键乐观锁 + 差异确认 + 恢复默认=发布新版本）+ 只读区（需改环境
// 变量/代码的键）。密钥只显示配置状态。
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshLeft } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewSwitch } from '@bme/dew-ui'
import { scheduleAdminService } from '../scheduleAdminService'

const settings = ref(null)
const loading = ref(true)
const publishing = ref(false)

// 本地编辑态：key -> {value, reason}（bool 存布尔；int 存数字）
const drafts = reactive({})
// 脏检查：与当前 desired/默认对比
function baseline(item) {
  return item.overridden ? item.desired_value : null
}
function isDirty(item) {
  const draft = drafts[item.key]
  if (!draft) return false
  if (item.type === 'secret') return draft.value !== ''   // 有输入才发布；恢复默认走 resetDraft+显式 null
  const base = baseline(item)
  if (base === null) return draft.value !== null
  return String(draft.value) !== String(base)
}
const hasDirty = () => (settings.value?.editable || []).some((i) => isDirty(i))

async function fetchSettings() {
  try {
    settings.value = await scheduleAdminService.fetchSettings()
    initDrafts(settings.value.editable)
  } catch (err) {
    ElMessage.error(err.message || '配置加载失败')
  } finally {
    loading.value = false
  }
}

function initDrafts(editables) {
  for (const item of editables || []) {
    if (item.type === 'secret') {
      drafts[item.key] = { value: '', reason: '' }   // 密钥只写不读：空串=保持现状（不发布）
    } else {
      drafts[item.key] = { value: item.overridden ? normalize(item, item.desired_value) : null, reason: '' }
    }
  }
}
onMounted(fetchSettings)

function normalize(item, raw) {
  return item.type === 'bool' ? String(raw).toLowerCase() === 'true' : Number(raw)
}

function effectiveText(item) {
  if (item.type === 'secret') return item.effective_value      // 已是脱敏描述串
  if (item.type === 'bool') return item.effective_value ? '开启' : '关闭'
  const unit = item.unit ? ` ${item.unit}` : ''
  return String(item.effective_value ?? '（回退链默认）') + unit
}
function defaultText(item) {
  if (item.type === 'bool') return item.default_value ? '开启' : '关闭'
  return String(item.default_value)
}
function draftText(item) {
  const draft = drafts[item.key]
  if (!draft) return '跟随默认'
  if (item.type === 'secret') return draft.value ? '已填写（发布后不回显）' : '保持现状'
  if (draft.value === null || draft.value === '') return '跟随默认'
  if (item.type === 'bool') return draft.value ? '开启' : '关闭'
  return String(draft.value)
}

/** 发布（差异确认 → PATCH；value=null 表示恢复默认） */
async function publish() {
  const items = settings.value?.editable || []
  const updates = items.filter((i) => isDirty(i) || pendingReset.has(i.key)).map((i) => ({
    key: i.key,
    value: pendingReset.has(i.key) ? null
      : (i.type === 'secret' ? (drafts[i.key].value || null) : drafts[i.key].value),
    expected_version: i.version,
    reason: drafts[i.key].reason || null,
  }))
  pendingReset.clear()
  if (!updates.length) return
  const lines = updates.map((u) => {
    const item = items.find((i) => i.key === u.key)
    let to
    if (u.value === null) to = '跟随默认'
    else if (item.type === 'secret') to = '已更新（不回显）'
    else if (item.type === 'bool') to = u.value ? '开启' : '关闭'
    else to = String(u.value)
    return `${item.label} → ${to}`
  })
  try {
    await ElMessageBox.confirm(`确认发布以下配置变更？发布后即时生效。\n${lines.join('\n')}`,
      '发布确认', { confirmButtonText: '发布', cancelButtonText: '再想想' })
  } catch { return }
  publishing.value = true
  try {
    const data = await scheduleAdminService.publishSettings(updates)
    settings.value = { ...settings.value, editable: data.editable }
    initDrafts(data.editable)
    ElMessage.success('配置已发布并即时生效')
  } catch (err) {
    ElMessage.error(err.message || '发布失败')
    fetchSettings()      // 409 等场景：重拉最新版本供再次编辑
  } finally {
    publishing.value = false
  }
}

const pendingReset = new Set()
function resetDraft(item) {
  initDrafts([item])
  pendingReset.delete(item.key)
}
function markReset(item) {
  if (item.type === 'secret') drafts[item.key].value = ''
  else drafts[item.key].value = null
  if (item.overridden) pendingReset.add(item.key)   // 已有覆盖时显式发布恢复默认
}

function displayValue(value) {
  if (typeof value === 'boolean') return value ? '开启' : '关闭'
  return String(value)
}

const SOURCE_META = { env: 'primary', default: 'info', code: 'neutral' }
</script>

<template>
  <div class="settings-panel" v-loading="loading">
    <template v-if="settings">
      <div class="scope-note">
        更新于 {{ settings.as_of }}。{{ settings.scope_note }}
      </div>

      <!-- 在线配置（B3：白名单低耦合参数，发布即时生效） -->
      <DewCard size="md" divided>
        <template #header>
          <div class="head-row">
            <span class="card-head">在线配置（发布后即时生效）</span>
            <div class="head-actions">
              <DewButton v-if="hasDirty()" size="sm" type="ghost" @click="settings.editable.forEach(resetDraft)">
                放弃修改
              </DewButton>
              <DewButton size="sm" type="glass" :loading="publishing" :disabled="!hasDirty()" @click="publish">
                发布变更
              </DewButton>
            </div>
          </div>
        </template>
        <div v-for="item in settings.editable" :key="item.key" class="edit-row">
          <div class="edit-main">
            <div class="edit-title-row">
              <span class="edit-title">{{ item.label }}</span>
              <DewTag v-if="item.overridden" type="warning" size="sm">平台覆盖 v{{ item.version }}</DewTag>
              <DewTag v-else type="info" size="sm">跟随默认</DewTag>
            </div>
            <div class="edit-note">{{ item.note }}（{{ item.component }}）</div>
            <div v-if="item.overridden" class="edit-meta">
              最近发布：{{ item.updated_at }} by {{ item.updated_by_name || '?' }}
              <template v-if="item.reason">（{{ item.reason }}）</template>
            </div>
          </div>
          <div class="edit-control">
            <DewSwitch v-if="item.type === 'bool'" v-model="drafts[item.key].value" />
            <template v-else-if="item.type === 'int'">
              <el-input-number v-model="drafts[item.key].value" :min="1" :max="1000" size="small" />
              <span v-if="item.unit" class="unit-text">{{ item.unit }}</span>
            </template>
            <el-input v-else-if="item.type === 'str'" v-model="drafts[item.key].value"
              size="small" placeholder="留空跟随回退链" style="width: 220px" clearable />
            <el-input v-else-if="item.type === 'secret'" v-model="drafts[item.key].value"
              type="password" show-password size="small"
              placeholder="填写新值即更新；留空保持现状" style="width: 260px" />
            <el-tooltip content="恢复为跟随默认/.env（发布新版本，不擦除历史）">
              <el-button size="small" text :icon="RefreshLeft"
                :disabled="!item.overridden && drafts[item.key]?.value === (item.type === 'secret' ? '' : null)"
                @click="markReset(item)" />
            </el-tooltip>
          </div>
        </div>
        <div v-if="hasDirty()" class="reason-row">
          <el-input v-model="drafts[settings.editable.find(isDirty)?.key].reason"
            size="small" placeholder="变更原因（将记入发布历史，建议填写）" maxlength="200" />
        </div>
        <div class="effective-row">
          <span v-for="item in settings.editable" :key="item.key" class="effective-chip">
            {{ item.label }}：<b>{{ effectiveText(item) }}</b>
            <template v-if="item.overridden">（默认 {{ defaultText(item) }}）</template>
          </span>
        </div>
      </DewCard>

      <!-- 只读区（env/代码常量） -->
      <DewCard v-for="group in settings.groups" :key="group.section" size="md" divided>
        <template #header><span class="card-head">{{ group.section }}（只读，需改环境变量或代码）</span></template>
        <el-table :data="group.items" size="small">
          <el-table-column prop="key" label="配置项" min-width="280" show-overflow-tooltip />
          <el-table-column label="有效值" width="130">
            <template #default="{ row }"><span class="value-text">{{ displayValue(row.value) }}</span></template>
          </el-table-column>
          <el-table-column label="来源" width="160">
            <template #default="{ row }">
              <DewTag :type="SOURCE_META[row.source] || 'info'" size="sm">{{ row.source }}</DewTag>
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

      <DewCard size="md" divided>
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
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scope-note {
  font-size: 13px;
  color: var(--text-secondary, var(--text-primary));
  line-height: 1.6;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.card-head {
  font-size: 13px;
  font-weight: 600;
}

.edit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}

.edit-row + .edit-row {
  border-top: 1px solid var(--border-light, rgba(0, 0, 0, 0.06));
}

.edit-main {
  flex: 1;
  min-width: 0;
}

.edit-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-title {
  font-size: 13px;
  font-weight: 600;
}

.edit-note {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-faint, var(--text-secondary));
}

.edit-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary, var(--text-primary));
}

.edit-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-text {
  font-size: 12px;
  color: var(--text-secondary, var(--text-primary));
  white-space: nowrap;
}

.reason-row {
  padding-top: 8px;
  border-top: 1px dashed var(--border-light, rgba(0, 0, 0, 0.08));
}

.effective-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary, var(--text-primary));
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
