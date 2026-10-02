<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">职位定义</div>
      <div class="header-actions">
        <el-button type="primary" plain @click="openCreate">
          <el-icon><Plus /></el-icon>新建职位
        </el-button>
        <el-button @click="fetchPositions" :loading="loading">刷新</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      职位分两类：社团职务（社长/副社长/团支书等全社治理头衔，进组织页管理层区）与组内职位（组长类，落组内组长位）。
      挂组规则 / 编制限额都是职位自身字段，任命校验全部读这里；限额 0 = 不限；有任职记录（含历史）只能退役不能删除。
    </p>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading">
        <el-table-column label="职位" min-width="150">
          <template #default="{ row }">
            <span class="pos-name">{{ row.name }}</span>
            <el-tag v-if="row.status !== 'active'" size="small" type="info" effect="plain" class="status-tag">
              已退役
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类别" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.org_slot === 'club' ? 'warning' : 'success'" size="small" effect="plain">
              {{ row.org_slot === 'club' ? '社团职务' : '组内职位' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="70" align="center" prop="sort_rank" />
        <el-table-column label="徽标" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="tierTagType(row.badge_tier)" size="small" effect="plain">
              T{{ row.badge_tier }}
            </el-tag>
            <span v-if="row.badge_with_group" class="badge-group-hint">带组段</span>
          </template>
        </el-table-column>
        <el-table-column label="挂组规则" width="100" align="center">
          <template #default="{ row }">{{ ruleText(row.group_rule) }}</template>
        </el-table-column>
        <el-table-column label="同组限额" width="90" align="center">
          <template #default="{ row }">{{ row.per_group_limit || '不限' }}</template>
        </el-table-column>
        <el-table-column label="全社限额" width="90" align="center">
          <template #default="{ row }">{{ row.global_limit || '不限' }}</template>
        </el-table-column>
        <el-table-column label="在任" width="70" align="center" prop="active_count" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button size="small" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status === 'active'" size="small" link type="warning"
              :disabled="row.active_count > 0" @click="confirmRetire(row)">退役</el-button>
            <el-button size="small" link type="danger"
              :disabled="row.active_count > 0" @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 新建 / 编辑 -->
    <el-dialog v-model="dlg.visible" :title="dlg.id ? `编辑职位「${dlg.originName}」` : '新建职位'" width="560px">
      <el-form :model="dlg.form" label-width="110px">
        <el-form-item label="职位名" required>
          <el-input v-model="dlg.form.name" maxlength="30" show-word-limit placeholder="如：导师 / 顾问" />
        </el-form-item>
        <el-form-item label="类别" required>
          <el-radio-group v-model="dlg.form.org_slot">
            <el-radio-button value="club">社团职务</el-radio-button>
            <el-radio-button value="group">组内职位</el-radio-button>
          </el-radio-group>
          <div class="form-hint form-hint-block">
            社团职务进组织页管理层区（可分管组）；组内职位即组长类，落组内组长位并派工作区协调权
          </div>
        </el-form-item>
        <el-form-item label="排序 rank">
          <el-input-number v-model="dlg.form.sort_rank" :min="0" :max="999" />
          <span class="form-hint">小 = 靠前 / 徽标优先级高</span>
        </el-form-item>
        <el-form-item label="徽标层级">
          <el-radio-group v-model="dlg.form.badge_tier">
            <el-radio-button :value="1">T1 强调</el-radio-button>
            <el-radio-button :value="2">T2 次强调</el-radio-button>
            <el-radio-button :value="3">T3 中性</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="徽标带组段">
          <el-switch v-model="dlg.form.badge_with_group" />
          <span class="form-hint">开启后徽标拼「· 组名」（如 副社长 · 培训组）</span>
        </el-form-item>
        <el-form-item label="挂组规则">
          <el-radio-group v-model="dlg.form.group_rule">
            <el-radio-button value="forbidden" :disabled="dlg.form.org_slot === 'group'">
              禁止挂组
            </el-radio-button>
            <el-radio-button value="optional">可选</el-radio-button>
            <el-radio-button value="required">必须挂组</el-radio-button>
          </el-radio-group>
          <div v-if="dlg.form.org_slot === 'group'" class="form-hint form-hint-block">
            组内职位天然挂在组上，不能选「禁止挂组」
          </div>
        </el-form-item>
        <el-form-item label="同组限额">
          <el-input-number v-model="dlg.form.per_group_limit" :min="0" :max="99" />
          <span class="form-hint">同组同时在任上限，0 = 不限</span>
        </el-form-item>
        <el-form-item label="全社限额">
          <el-input-number v-model="dlg.form.global_limit" :min="0" :max="99" />
          <span class="form-hint">全社同时在任上限，0 = 不限（社长 = 1）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.submitting" @click="submit">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const rows = ref([])
const loading = ref(false)

const ruleText = (rule) => ({ forbidden: '禁止挂组', optional: '可选', required: '必须挂组' }[rule] || rule)
const tierTagType = (tier) => ({ 1: 'warning', 2: 'success', 3: 'info' }[tier] || 'info')

// rank 兜底口径与后端 club_rules 一致：<=9 社团职务 / >=10 组内职位
const slotByRank = (rank) => (rank <= 9 ? 'club' : 'group')

async function fetchPositions() {
  loading.value = true
  try {
    const res = await api({ url: '/admin/club/positions', method: 'get' })
    rows.value = res.data?.data?.positions || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取职位列表失败')
  } finally {
    loading.value = false
  }
}

// ── 新建 / 编辑 ──
const dlg = reactive({ visible: false, id: null, originName: '', submitting: false, form: {} })

const openCreate = () => {
  dlg.id = null
  dlg.originName = ''
  dlg.form = {
    name: '', org_slot: 'group', sort_rank: 99, badge_tier: 3, badge_with_group: false,
    group_rule: 'required', per_group_limit: 0, global_limit: 0,
  }
  dlg.visible = true
}

const openEdit = (row) => {
  dlg.id = row.id
  dlg.originName = row.name
  dlg.form = {
    name: row.name, org_slot: row.org_slot || slotByRank(row.sort_rank),
    sort_rank: row.sort_rank, badge_tier: row.badge_tier,
    badge_with_group: !!row.badge_with_group, group_rule: row.group_rule,
    per_group_limit: row.per_group_limit, global_limit: row.global_limit,
  }
  dlg.visible = true
}

// 组内职位切「禁止挂组」被禁选，但存量数据切换类别时仍可能撞上——自动纠到 required
watch(() => dlg.form.org_slot, (slot) => {
  if (slot === 'group' && dlg.form.group_rule === 'forbidden') dlg.form.group_rule = 'required'
})

const submit = async () => {
  const f = dlg.form
  if (!f.name?.trim()) return ElMessage.warning('请输入职位名')
  dlg.submitting = true
  try {
    // 收紧规则（如改 forbidden）时后端会校验存量在任是否违例并整单拒绝
    const res = await api({
      url: dlg.id ? `/admin/club/positions/${dlg.id}` : '/admin/club/positions',
      method: dlg.id ? 'put' : 'post',
      data: { ...f, name: f.name.trim() },
    })
    ElMessage.success(res.data?.message || '已保存')
    dlg.visible = false
    fetchPositions()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    dlg.submitting = false
  }
}

// ── 退役 / 删除 ──
const confirmRetire = (row) => {
  ElMessageBox.confirm(
    `退役后「${row.name}」不可再任命，历史任职档案不受影响。`,
    `退役「${row.name}」`, { type: 'warning' },
  ).then(async () => {
    try {
      const res = await api({ url: `/admin/club/positions/${row.id}/retire`, method: 'post' })
      ElMessage.success(res.data?.message || '已退役')
      fetchPositions()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '退役失败')
    }
  }).catch(() => {})
}

const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `删除「${row.name}」不可恢复（零引用才可删，含历史任职都算引用）。`,
    `删除「${row.name}」`, { type: 'warning' },
  ).then(async () => {
    try {
      const res = await api({ url: `/admin/club/positions/${row.id}`, method: 'delete' })
      ElMessage.success(res.data?.message || '已删除')
      fetchPositions()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(fetchPositions)
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }

.page-subtitle {
  margin: -12px 0 16px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.pos-name {
  font-weight: 500;
}

.status-tag {
  margin-left: 8px;
}

.badge-group-hint {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-hint-block {
  display: block;
  margin: 4px 0 0;
  line-height: 1.5;
}
</style>
