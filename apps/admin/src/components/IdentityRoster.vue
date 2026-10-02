<script setup>
// 外校名册管理（D3c，规格 5.2）：导入（upsert by ref）/ 列表 / 发认领邀请。
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])
const schools = ref([])
const filter = ref({ school_id: '' })

const fetchRoster = async () => {
  loading.value = true
  try {
    const params = {}
    if (filter.value.school_id) params.school_id = filter.value.school_id
    const res = await api({ url: '/admin/identity/roster', method: 'get', params })
    if (res.data.code === 200) rows.value = res.data.roster || []
  } catch {
    ElMessage.error('名册加载失败')
  } finally {
    loading.value = false
  }
}

const fetchSchools = async () => {
  try {
    const res = await api({ url: '/admin/identity/schools', method: 'get' })
    if (res.data.code === 200) {
      schools.value = (res.data.schools || []).filter(s => s.school_id.startsWith('external:'))
    }
  } catch { /* 静默 */ }
}

const imp = ref({ visible: false, school_id: '', text: '', busy: false, report: null })

const openImport = () => {
  imp.value = { visible: true, school_id: filter.value.school_id || '',
                text: '', busy: false, report: null }
}

const parseRows = () => imp.value.text.split('\n').map(line => {
  const [roster_ref, name, contact_email, institution_id] =
    line.split(/[,\t，]/).map(s => s.trim())
  return { roster_ref, name, contact_email, institution_id }
}).filter(r => r.roster_ref && r.name)

const doImport = async (dry) => {
  const rowsIn = parseRows()
  if (!imp.value.school_id || !rowsIn.length) {
    ElMessage.warning('请选择学校并按「引用码,姓名,联系邮箱[,学号]」每行一条填写')
    return
  }
  imp.value.busy = true
  try {
    const res = await api({
      url: '/admin/identity/roster/import', method: 'post',
      data: { school_id: imp.value.school_id, rows: rowsIn, dry_run: dry },
    })
    if (res.data.code === 200) {
      imp.value.report = res.data
      if (!dry) {
        ElMessage.success(res.data.message || '导入完成')
        fetchRoster()
      }
    } else {
      ElMessage.error(res.data.message || '导入失败')
    }
  } catch (error) {
    const m = error?.response?.data?.message
    ElMessage.error((typeof m === 'string' && m) || '导入失败，请检查格式')
  } finally {
    imp.value.busy = false
  }
}

const invite = async (row) => {
  try {
    await ElMessageBox.confirm(
      `向 ${row.name}（${row.contact_email}）发送认领邀请？邮件含一次性链接，7 天有效。`,
      '发送邀请', { type: 'info', confirmButtonText: '发送' })
  } catch { return }
  try {
    const res = await api({
      url: `/admin/identity/roster/${row.id}/invite`, method: 'post' })
    if (res.data.code === 200) {
      ElMessage.success('邀请已发送')
      const link = res.data.invite_link
      if (link) {
        await ElMessageBox.alert(link, '邀请链接（邮件发送失败时可人工转交）',
                                 { confirmButtonText: '知道了' }).catch(() => {})
      }
    }
  } catch (error) {
    const m = error?.response?.data?.message
    ElMessage.error((typeof m === 'string' && m) || '发送失败')
  }
}

onMounted(() => { fetchRoster(); fetchSchools() })
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">外校名册</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="学校">
            <el-select v-model="filter.school_id" clearable placeholder="全部外校" style="width: 180px"
                       @change="fetchRoster">
              <el-option v-for="s in schools" :key="s.school_id" :label="s.name" :value="s.school_id" />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button type="primary" @click="openImport">导入名册</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%"
                height="calc(100vh - 320px)" :row-style="{ height: '50px' }">
        <el-table-column prop="school_name" label="学校" width="120" />
        <el-table-column prop="roster_ref" label="引用码" width="130" />
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column prop="contact_email" label="联系邮箱" min-width="190" show-overflow-tooltip />
        <el-table-column prop="institution_id" label="学号" width="120" />
        <el-table-column label="认领状态" width="130">
          <template #default="{ row }">
            <el-tag v-if="row.claimed_person_id" type="success" effect="plain" size="small">已认领</el-tag>
            <el-tag v-else type="info" effect="plain" size="small">未认领</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!!row.claimed_person_id"
                       @click="invite(row)">发邀请</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <el-dialog v-model="imp.visible" title="导入名册" width="560px" append-to-body>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="学校">
          <el-select v-model="imp.school_id" placeholder="选择外校" style="width: 100%">
            <el-option v-for="s in schools" :key="s.school_id" :label="s.name" :value="s.school_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名单（每行：引用码,姓名,联系邮箱[,学号]——同一引用码重复导入=更新，不重建人员）">
          <el-input v-model="imp.text" type="textarea" :rows="8"
                    placeholder="SC2023001,苗阿妹,miao@scuec.edu.cn" />
        </el-form-item>
      </el-form>
      <div v-if="imp.report" class="import-report">
        计划：新建 {{ imp.report.created }} / 更新 {{ imp.report.updated }} / 无变化 {{ imp.report.skipped }}
        <template v-if="imp.report.errors && imp.report.errors.length">
          ；问题行：{{ imp.report.errors.join('；') }}
        </template>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="imp.visible = false">取消</el-button>
          <el-button :loading="imp.busy" @click="doImport(true)">干跑检查</el-button>
          <el-button type="primary" :loading="imp.busy" @click="doImport(false)">导入</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.import-report { color: var(--el-text-color-secondary); font-size: 13px; margin-top: 8px; }
</style>
