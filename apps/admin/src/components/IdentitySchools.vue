<script setup>
// 学校核验配置（D4）：域清单 / NetID-邮箱映射 / 审核人名单（≥2 名判就绪，规格 §18）。
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../api'

const loading = ref(false)
const rows = ref([])

const fetchSchools = async () => {
  loading.value = true
  try {
    const res = await api({ url: '/admin/identity/schools', method: 'get' })
    if (res.data.code === 200) rows.value = res.data.schools || []
  } catch {
    ElMessage.error('配置加载失败')
  } finally {
    loading.value = false
  }
}

const edit = ref({ visible: false, schoolId: '', name: '',
                   personalDomains: '', excludedDomains: '',
                   localMatches: true, reviewerIds: '', busy: false, version: 0 })

const openEdit = (row) => {
  edit.value = {
    visible: true, schoolId: row.school_id, name: row.name,
    personalDomains: (row.personal_email_domains || []).join('\n'),
    excludedDomains: (row.excluded_email_domains || []).join('\n'),
    localMatches: !!row.email_local_matches_identifier,
    reviewerIds: (row.reviewers || []).map(r => r.user_id).join(','),
    busy: false, version: row.config_version,
  }
}

const linesToList = (text) =>
  text.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(Boolean)

const save = async () => {
  const e = edit.value
  const reviewerIds = e.reviewerIds.split(/[\s,，]+/).map(s => parseInt(s, 10))
    .filter(n => Number.isInteger(n) && n > 0)
  if (!reviewerIds.length) {
    ElMessage.warning('至少填写一名审核人 user id')
    return
  }
  e.busy = true
  try {
    const res = await api({
      url: `/admin/identity/schools/${e.schoolId}/config`,
      method: 'put',
      data: {
        name: e.name,
        personal_email_domains: linesToList(e.personalDomains),
        excluded_email_domains: linesToList(e.excludedDomains),
        email_local_matches_identifier: e.localMatches,
        reviewer_user_ids: reviewerIds,
      },
    })
    if (res.data.code === 200) {
      ElMessage.success(res.data.reviewers_ready
        ? '配置已更新（审核人就绪）'
        : '配置已更新——审核人不足 2 名，运营未就绪')
      e.visible = false
      fetchSchools()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (error) {
    const m = error?.response?.data?.message
    ElMessage.error((typeof m === 'string' && m) || '保存失败，请稍后重试')
  } finally {
    e.busy = false
  }
}

onMounted(fetchSchools)
</script>

<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">学校核验配置</div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" style="width: 100%"
                height="calc(100vh - 320px)" :row-style="{ height: '50px' }">
        <el-table-column prop="school_id" label="学校标识" width="120" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column label="个人邮箱域（精确匹配）" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.personal_email_domains || []).join('、') }}</template>
        </el-table-column>
        <el-table-column label="排除域（公务/共享）" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.excluded_email_domains || []).join('、') || '—' }}</template>
        </el-table-column>
        <el-table-column label="审核人" min-width="160">
          <template #default="{ row }">
            <el-tag :type="row.reviewers_ready ? 'success' : 'danger'" effect="plain" size="small">
              {{ row.reviewers.length }} 名{{ row.reviewers_ready ? '' : '（未就绪）' }}
            </el-tag>
            <span class="muted">
              {{ row.reviewers.map(r => `${r.username}#${r.user_id}`).join('、') }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="config_version" label="配置版本" width="90" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <el-dialog v-model="edit.visible" title="编辑学校配置" width="560px" append-to-body>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="学校名称">
          <el-input v-model="edit.name" />
        </el-form-item>
        <el-form-item label="个人邮箱域（每行一个，精确匹配；勿用通配符）">
          <el-input v-model="edit.personalDomains" type="textarea" :rows="3"
                    placeholder="mail2.sysu.edu.cn" />
        </el-form-item>
        <el-form-item label="排除域（公务/共享邮箱，每行一个）">
          <el-input v-model="edit.excludedDomains" type="textarea" :rows="2"
                    placeholder="sysu.edu.cn" />
        </el-form-item>
        <el-form-item label="邮箱本地部即 NetID 的映射规则">
          <el-switch v-model="edit.localMatches" />
          <span class="muted switch-note">开启时要求验证邮箱的 @ 前部分与申报 NetID 完全一致</span>
        </el-form-item>
        <el-form-item label="核验负责人 user id（逗号分隔；须管理员账号；至少 2 名才算运营就绪）">
          <el-input v-model="edit.reviewerIds" placeholder="74, 75" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="edit.visible = false">取消</el-button>
          <el-button type="primary" :loading="edit.busy" @click="save">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
.switch-note { margin-left: 10px; }
</style>
