<script setup>
// 身份中心（D4，规格 12.1）：核验状态 + 身份核验向导 + 账号认领。
// 路由 /user-center/identity（个人中心「账户与反馈」分组）。
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Connection } from '@element-plus/icons-vue'
import { DewCard } from '@bme/dew-ui'
import api from '../../api'
import VerificationWizard from './VerificationWizard.vue'
import LinkCasePanel from './LinkCasePanel.vue'

const loading = ref(true)
const status = ref({ person: null, applications: [], schools: [], })
const cases = ref([])

const V_TEXT = { unverified: '未核验', pending: '核验中', verified: '已核验',
                 disputed: '争议中', revoked: '已撤销' }
const V_TAG = { unverified: 'info', pending: 'warning', verified: 'success',
                disputed: 'danger', revoked: 'danger' }

const person = computed(() => status.value.person)
const verificationOpen = computed(() =>
  status.value.verification_enabled && status.value.ui_enabled)
const linkOpen = computed(() => status.value.ui_enabled)

const fetchAll = async () => {
  try {
    const [st, cs] = await Promise.all([
      api({ url: '/identity/status', method: 'get' }),
      api({ url: '/identity/link-cases', method: 'get' }),
    ])
    if (st.data.code === 200) status.value = st.data
    if (cs.data.code === 200) cases.value = cs.data.cases || []
  } catch (error) {
    // 状态页数据失败只提示一次，不打断布局
    ElMessage.error('身份信息加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
}
onMounted(fetchAll)
</script>

<template>
  <div class="identity-center">
    <!-- 人员档案状态 -->
    <DewCard no-hover class="person-card">
      <template #header>
        <div class="person-header">
          <span class="person-title">人员档案</span>
          <el-tag v-if="person" :type="V_TAG[person.verification_status] || 'info'"
                  effect="plain">
            {{ V_TEXT[person.verification_status] || person.verification_status }}
          </el-tag>
        </div>
      </template>
      <div v-if="loading" class="person-loading">加载中…</div>
      <div v-else-if="person" class="person-grid">
        <div class="person-item">
          <div class="person-label">人员编号</div>
          <div class="person-value mono">{{ person.public_id }}</div>
        </div>
        <div class="person-item">
          <div class="person-label">核验姓名</div>
          <div class="person-value">{{ person.verified_name || '—（核验通过后显示）' }}</div>
        </div>
        <div class="person-item">
          <div class="person-label">档案状态</div>
          <div class="person-value">{{ person.record_status === 'merged' ? '已并入其他档案' : '正常' }}</div>
        </div>
      </div>
      <p v-else class="person-empty">暂无人员档案信息。</p>
    </DewCard>

    <!-- 身份核验 -->
    <DewCard class="section-card">
      <template #header>
        <div class="section-header">
          <el-icon><CircleCheck /></el-icon>
          <span>身份核验</span>
          <span class="section-sub">证明「你是谁」——凭个人学生邮箱与负责人名册核对</span>
        </div>
      </template>
      <VerificationWizard :schools="status.schools"
                          :applications="status.applications"
                          :enabled="verificationOpen"
                          @refresh="fetchAll" />
    </DewCard>

    <!-- 账号认领 -->
    <DewCard class="section-card">
      <template #header>
        <div class="section-header">
          <el-icon><Connection /></el-icon>
          <span>账号认领</span>
          <span class="section-sub">把属于自己的另一个账号合并到当前人员档案</span>
        </div>
      </template>
      <LinkCasePanel :cases="cases" :enabled="linkOpen" @refresh="fetchAll" />
    </DewCard>
  </div>
</template>

<style scoped>
.identity-center { display: flex; flex-direction: column; gap: 16px; }
.person-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.person-title { font-size: 15px; }
.person-grid { display: flex; gap: 40px; flex-wrap: wrap; }
.person-label { color: var(--dew-text-muted, #94a3b8); font-size: 12px; margin-bottom: 4px; }
.person-value { font-weight: 600; }
.person-value.mono { font-family: var(--dew-font-mono, monospace); letter-spacing: .5px; }
.person-loading, .person-empty { color: var(--dew-text-muted, #94a3b8); }
.section-header { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
.section-sub { color: var(--dew-text-muted, #94a3b8); font-weight: 400; font-size: 12px; }
</style>
