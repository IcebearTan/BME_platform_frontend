<template>
  <div class="camp-papp-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">项目申报</div>
      </div>

      <el-alert :type="status === 'upcoming' ? 'success' : 'info'" :closable="false"
        :title="status === 'upcoming'
          ? '申报期开放中：负责人提交申报，审核通过即建项目、负责人自动入营'
          : '申报期已结束（项目申报仅在「待开放」阶段进行），此处可查看历史申报'" />

      <DewCard no-hover class="table-card">
        <el-table ref="tableRef" :data="pApps" border size="small" style="margin-top: 12px;"
          v-loading="pAppsLoading" row-key="id" highlight-current-row>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="papp-expand">
                <p><b>背景：</b>{{ row.background || '—' }}</p>
                <p><b>目标：</b>{{ row.goal || '—' }}</p>
                <p><b>所需能力：</b>{{ row.required_abilities || '—' }}</p>
                <p><b>招募说明：</b>{{ row.recruit_note || '—' }}</p>
                <!-- 09-13 申报即模板：节点序列替代「计划」栏（过审即实例化里程碑） -->
                <p v-if="row.template_nodes?.length">
                  <b>交付节点：</b>
                  <span v-for="(n, i) in row.template_nodes" :key="i" class="papp-node">
                    {{ i + 1 }}. {{ n.title }}（{{ n.submit_mode === 'member' ? '个人交付' : '整队交付' }}）
                  </span>
                </p>
                <p v-else-if="row.plan"><b>计划：</b>{{ row.plan }}<span class="hint">（存量申报，过审后由负责人自建模板）</span></p>
                <p v-if="row.reject_reason"><b>退回原因：</b>{{ row.reject_reason }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="项目名" prop="name" min-width="150" />
          <el-table-column label="负责人" prop="leader_name" width="110" />
          <el-table-column label="版本" prop="version" width="60" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'"
                size="small" effect="plain">
                {{ { pending: '待审核', approved: '已通过', rejected: '已退回' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" prop="created_at" width="160" />
          <el-table-column v-if="manageWritable" label="操作" width="150" align="center">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button size="small" type="success" plain @click="reviewProjectApp(row, 'approve')">通过</el-button>
                <el-button size="small" type="danger" plain @click="reviewProjectApp(row, 'reject')">退回</el-button>
              </template>
              <span v-else class="hint">已处理</span>
            </template>
          </el-table-column>
        </el-table>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { useFocusRow, bindFocusToTable } from '../shared/useFocusRow'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, status, canManage, manageWritable, load } = ctx

const pApps = ref([])
const pAppsLoading = ref(false)
const tableRef = ref(null)

async function fetchProjectApps() {
  pAppsLoading.value = true
  try {
    const res = await api.get(`/camp/projects/${campId.value}/applications`)
    pApps.value = res.data.applications || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载申报列表失败')
  } finally { pAppsLoading.value = false }
}

async function reviewProjectApp(row, action) {
  try {
    let body = { action }
    if (action === 'reject') {
      const { value } = await ElMessageBox.prompt('退回原因（负责人重提时可见）', '退回申报', {
        confirmButtonText: '退回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      })
      body.reason = value.trim()
    } else {
      await ElMessageBox.confirm(
        `通过「${row.name}」？将创建项目、${row.leader_name} 自动入营成为负责人`, '审核通过', {
          confirmButtonText: '通过', cancelButtonText: '取消', type: 'info',
        })
    }
    const res = await api.post(`/camp/projects/${campId.value}/applications/${row.id}/review`, body)
    ElMessage.success(res.data.message || '已处理')
    fetchProjectApps()
    load()   // 过审自动入营会改变营期成员数（头部概览）
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

// ?focus=<applicationId> 深链
const { focusId } = useFocusRow()
bindFocusToTable(tableRef, pApps, focusId)

onMounted(fetchProjectApps)
</script>

<style scoped>
.camp-papp-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.papp-expand { padding: 4px 12px; }
.papp-expand p { margin: 4px 0; font-size: 12.5px; line-height: 1.7; color: var(--text-regular, #606266); }
.papp-node {
  display: inline-block; margin: 2px 6px 2px 0; padding: 1px 8px; border-radius: 4px;
  font-size: 12px; background: var(--el-fill-color-light, #f5f7fa);
}
.hint { color: var(--text-secondary); font-size: 12px; }
</style>
