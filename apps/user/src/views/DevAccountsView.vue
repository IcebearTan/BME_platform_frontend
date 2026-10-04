<template>
  <div class="dev-page aurora-bg">
    <div class="dev-wrap">
      <!-- 页头 -->
      <header class="dev-head">
        <div class="dev-head-text">
          <h1 class="dev-title">测试账号面板</h1>
          <p class="dev-subtitle">
            开发专用（dev 构建限定）：按角色分组的本地测试账号，点击卡片一键登录，密码约定 12345678
          </p>
        </div>
        <div class="dev-head-actions">
          <input v-model="keyword" class="dev-search" type="text" placeholder="搜索昵称 / 邮箱" />
          <DewButton type="ghost" size="sm" @click="router.push('/login')">返回登录页</DewButton>
        </div>
      </header>

      <!-- 登录中横幅 -->
      <div v-if="loggingIn" class="dev-busy">
        正在登录 {{ loggingIn }} …
      </div>

      <!-- 分组卡片网格 -->
      <section v-for="g in visibleGroups" :key="g.key" class="dev-group">
        <h2 class="dev-group-title">
          <span class="dev-group-dot" :style="{ background: g.color }"></span>
          {{ g.label }}
          <span class="dev-group-count">{{ grouped[g.key].length }}</span>
        </h2>
        <div class="dev-grid">
          <button v-for="a in grouped[g.key]" :key="a.email" type="button" class="dev-card"
                  :disabled="!!loggingIn" @click="loginAs(a)">
            <span class="dev-card-accent" :style="{ background: g.color }"></span>
            <span class="dev-card-body">
              <span class="dev-card-name">{{ a.username }}</span>
              <span class="dev-card-email">{{ a.email }}</span>
            </span>
            <span class="dev-card-action">
              <span v-if="loggingIn === a.email" class="dev-card-spin"></span>
              <template v-else>{{ a.role === 'super_admin' ? '进入' : '登录' }}</template>
            </span>
          </button>
        </div>
      </section>

      <p v-if="!visibleGroups.length" class="dev-none">没有匹配「{{ keyword }}」的账号</p>
      <p v-else-if="!groups.length" class="dev-none">测试账号服务不可用（检查后端 5001 与 DEV_TEST_ACCOUNTS 配置）</p>
    </div>
  </div>
</template>

<script setup>
// 开发测试账号面板（方案 A·独立页）：数据源 GET /auth/dev_accounts（后端 debug/
// DEV_TEST_ACCOUNTS 门禁，生产 404）；路由仅 dev 构建注册，生产构建整页不存在。
// 账号约定见两仓 README 开发测试账号节。
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import api, { session } from '../api'
import md5 from 'js-md5'
import { ElMessage } from 'element-plus'
import DewButton from '@bme/dew-ui/DewButton.vue'

const store = useStore()
const router = useRouter()

const accounts = ref([])
const keyword = ref('')
const loggingIn = ref(null)

const GROUP_DEFS = [
  { key: 'admin', label: '超级管理员', color: 'var(--color-primary)' },
  { key: 'teacher', label: '老师', color: 'var(--color-success)' },
  { key: 'mentor', label: '导生', color: 'var(--color-warning)' },
  { key: 'student', label: '学员', color: 'var(--dew-text-muted)' },
]

function groupOf(a) {
  if (a.role === 'super_admin') return a.admin_tag === 'teacher' ? 'teacher' : 'admin'
  if (a.email.startsWith('mentor')) return 'mentor'
  return 'student'
}

const groups = computed(() => accounts.value.length > 0)
const grouped = computed(() => {
  const map = { admin: [], teacher: [], mentor: [], student: [] }
  const kw = keyword.value.trim().toLowerCase()
  for (const a of accounts.value) {
    if (kw && !a.email.toLowerCase().includes(kw) && !(a.username || '').toLowerCase().includes(kw)) continue
    map[groupOf(a)].push(a)
  }
  return map
})
const visibleGroups = computed(() => GROUP_DEFS.filter(g => grouped.value[g.key].length))

onMounted(async () => {
  try {
    const res = await api({ url: '/auth/dev_accounts', method: 'get' })
    accounts.value = res.data?.data?.accounts || []
  } catch {
    accounts.value = []
  }
})

async function loginAs(acc) {
  if (loggingIn.value) return
  loggingIn.value = acc.username
  try {
    const res = await api({
      url: '/auth/login',
      method: 'post',
      data: { User_Email: acc.email, User_Password: md5('12345678') },
    })
    if (res.data.code === 200) {
      session.save(res.data)
      store.commit('setUser', res.data)
      ElMessage.success(`已登录：${acc.username}`)
      router.push('/home')
      return
    }
    ElMessage.error('登录失败：账号或密码不符（dev 库密码约定 12345678）')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登录请求失败')
  } finally {
    loggingIn.value = null
  }
}
</script>

<style scoped>
.dev-page {
  min-height: 100vh;
  padding: 48px 20px 80px;
}

.dev-wrap {
  max-width: 960px;
  margin: 0 auto;
}

/* ── 页头 ── */
.dev-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.dev-title {
  margin: 0 0 6px;
  font-size: 30px;
  font-weight: 700;
  color: var(--dew-text-heading, var(--color-text));
  letter-spacing: 0.01em;
}

.dev-subtitle {
  margin: 0;
  max-width: 520px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--dew-text-muted);
}

.dev-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dev-search {
  width: 220px;
  padding: 8px 14px;
  font: inherit;
  font-size: 13.5px;
  color: inherit;
  background: var(--dew-card-flat-bg);
  border: 1px solid color-mix(in srgb, var(--dew-text-faint) 40%, transparent);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease;
}

.dev-search:focus {
  border-color: var(--color-primary);
}

.dev-busy {
  margin-bottom: 18px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 10px;
}

/* ── 分组 ── */
.dev-group {
  margin-bottom: 34px;
}

.dev-group-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 650;
  color: var(--dew-text-heading, var(--color-text));
}

.dev-group-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
}

.dev-group-count {
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dew-text-muted);
  background: color-mix(in srgb, var(--dew-text-faint) 16%, transparent);
  border-radius: 999px;
  line-height: 20px;
}

/* ── 卡片网格 ── */
.dev-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.dev-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 14px 18px;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  background: var(--dew-card-flat-bg);
  border: 1px solid color-mix(in srgb, var(--dew-text-faint) 30%, transparent);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.15s var(--dew-bounce, ease), border-color 0.15s ease, box-shadow 0.15s ease;
}

.dev-card:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--dew-text-faint) 55%, transparent);
  box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--dew-text-faint) 45%, transparent);
}

.dev-card:active:not(:disabled) {
  transform: translateY(-1px);
}

.dev-card:disabled {
  opacity: 0.55;
  cursor: default;
}

.dev-card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.dev-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.dev-card-name {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--dew-text-heading, var(--color-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dev-card-email {
  font-size: 12px;
  color: var(--dew-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dev-card-action {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
}

.dev-card-spin {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: dev-spin 0.7s linear infinite;
}

@keyframes dev-spin {
  to { transform: rotate(360deg); }
}

.dev-none {
  margin: 60px 0;
  font-size: 14px;
  text-align: center;
  color: var(--dew-text-faint);
}

@media (max-width: 560px) {
  .dev-head {
    align-items: stretch;
    flex-direction: column;
  }

  .dev-head-actions {
    justify-content: space-between;
  }

  .dev-search {
    flex: 1;
    width: auto;
  }
}
</style>
