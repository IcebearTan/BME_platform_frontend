<template>
  <div class="camp-archive-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">成果与归档</div>
      </div>

      <div v-if="status !== 'archived'" class="hint" style="padding: 8px 0 4px;">
        结营（running → archived）时自动冻结档案快照（成员/项目/里程碑终态/已核验成果），冻结后全端点只读。
        结营操作在「设置与生命周期」执行。
      </div>
      <template v-else>
        <div v-if="!archive" class="hint" style="padding: 8px 0 4px;">档案加载中或未冻结（历史结营营不补建）</div>
        <template v-else>
          <div class="hint" style="padding: 4px 0;">
            冻结于 {{ archive.frozen_at }} · 版本 v{{ archive.version }} · 修正 {{ archive.revisions.length }} 次
            <el-button v-if="manageWritable" size="small" style="margin-left: 8px;" @click="reviseArchive">登记修正</el-button>
          </div>
          <el-collapse>
            <el-collapse-item title="档案快照（关键事实）">
              <pre class="archive-snap">{{ JSON.stringify(archive.snapshot, null, 2) }}</pre>
            </el-collapse-item>
            <el-collapse-item v-if="archive.revisions.length" :title="`修正记录（${archive.revisions.length}）`">
              <div v-for="r in archive.revisions" :key="r.version" class="hint" style="padding: 4px 0;">
                v{{ r.version }} · {{ r.created_at }} · {{ r.reason }}
              </div>
            </el-collapse-item>
          </el-collapse>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, status, canManage, manageWritable } = ctx

const archive = ref(null)

async function fetchArchive() {
  if (status.value !== 'archived') return
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/archive`)
    archive.value = res.data?.archive || null
  } catch {
    archive.value = null   // 历史结营营不补建：404 等静默为空态
  }
}

async function reviseArchive() {
  if (!archive.value) return
  try {
    const { value } = await ElMessageBox.prompt(
      `登记档案修正（当前 v${archive.value.version}，修正后版本递增；快照原文不可变，修正以记录留痕）：`, '档案修正', {
        confirmButtonText: '登记', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '修正原因必填',
      })
    const res = await api.post(`/camp/sessions/${campId.value}/archive/revisions`, {
      reason: value.trim(), expected_version: archive.value.version,
    })
    ElMessage.success(res.data.message || '已登记')
    fetchArchive()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '登记失败')
  }
}

onMounted(fetchArchive)
</script>

<style scoped>
.camp-archive-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint { color: var(--text-secondary); font-size: 12px; }

.archive-snap {
  max-height: 320px; overflow: auto; margin: 0; padding: 10px;
  font-size: 12px; line-height: 1.6; border-radius: 6px;
  background: var(--fill-color-light, #f5f7fa); color: var(--text-regular, #606266);
}
</style>
