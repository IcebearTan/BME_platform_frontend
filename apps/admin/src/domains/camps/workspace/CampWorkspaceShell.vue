<template>
  <div class="camp-workspace">
    <!-- 顶部：营期身份条（聚合根对象头） -->
    <div class="ws-header">
      <div class="ws-header-main">
        <el-button size="small" @click="goList">返回列表</el-button>
        <span class="ws-name">{{ session.name || `营期 #${campId}` }}</span>
        <el-tag size="small" effect="plain">{{ session.category === 'project' ? '项目营' : '培训营' }}</el-tag>
        <el-tag v-if="session.cycle_name" size="small" type="info" effect="plain">{{ session.cycle_name }}</el-tag>
        <el-tag v-if="status" size="small" :type="statusType(status)">{{ statusLabel(status) }}</el-tag>
        <span class="ws-dates" v-if="session.start_date">{{ session.start_date }} ~ {{ session.end_date }}</span>
      </div>
      <div class="ws-header-actions">
        <el-button v-if="canManage" size="small" @click="go('camp.settings')">营期设置</el-button>
      </div>
    </div>

    <el-alert v-if="loadError" type="error" :closable="false" title="营期信息加载失败"
      description="请确认营期存在且你有访问权限" class="ws-error">
      <el-button size="small" type="primary" @click="ctx.load()">重试</el-button>
    </el-alert>

    <div v-else class="ws-body" v-loading="loading">
      <!-- 左侧局部导航：六个稳定分组（P-05 稳定外壳） -->
      <div class="ws-nav-wrap">
        <el-menu class="ws-nav" :default-active="activeNav">
          <template v-for="g in visibleGroups" :key="g.key">
            <div class="ws-group-title">{{ g.label }}</div>
            <el-menu-item v-for="item in g.items" :key="item.name" :index="item.name"
              @click="go(item.name)">
              <span>{{ item.label }}</span>
              <span v-if="item.manageOnly && !canManage" class="ws-lock">只读</span>
            </el-menu-item>
          </template>
        </el-menu>
      </div>

      <!-- 主区：叶子路由（无 keep-alive——上山即取数，无跨页脏状态） -->
      <div class="ws-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CAMP_CONTEXT, createCampContext } from '../context/campContext'
import { WORKSPACE_GROUPS, isRouteApplicable, blockedReason } from './workspaceNav'

const route = useRoute()
const router = useRouter()

// campIdParam 用 computed 读：营→营跳转（列表直达另一营）时上下文正确重载
const campIdParam = computed(() => route.params.campId)
const ctx = createCampContext(campIdParam)
provide(CAMP_CONTEXT, ctx)

// 解构到顶层让模板自动解包（嵌在对象里的 ref 模板不自动 unwrap）
const { session, status, loading, loadError, canManage, campId, statusLabel, statusType } = ctx

onMounted(() => {
  ctx.load()
})

// 营切换：选项缓存清空 + 基本信息重载（修掉旧页 campId 非响应式的残留 bug）
watch(campIdParam, () => {
  if (!campIdParam.value) return
  ctx.options.reset()
  ctx.load()
})

const activeNav = computed(() => route.name)

// 谓词吃的标准化上下文（ref 解包；与 routes.js 暖门禁的 shim 同构）
const navCtx = computed(() => ({
  isProject: ctx.isProject.value,
  isLearning: ctx.isLearning.value,
  capOn: ctx.capOn,
}))

const visibleGroups = computed(() => WORKSPACE_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => isRouteApplicable(i.name, navCtx.value)) }))
  .filter((g) => g.items.length))

// 权威门禁（暖快路径在路由 beforeEnter，见 routes.js）：session 到达后复核当前叶子，
// 不适用 → 带原因重定向概览（替代旧 watch(visibleTabs) 深链校正）
watch(() => ctx.loaded.value, (done) => {
  if (!done) return
  const name = route.name
  if (name === 'camp.overview') return
  if (!isRouteApplicable(name, navCtx.value)) {
    ElMessage.warning(blockedReason(name, ctx))
    router.replace({ name: 'camp.overview', query: { blocked: name } })
  }
})

function go(name) {
  router.push({ name })
}

function goList() {
  router.push('/camps')
}
</script>

<style scoped>
.camp-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ws-header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ws-name {
  font-size: var(--text-xl, 18px);
  font-weight: 700;
  color: var(--text-primary);
}

.ws-dates {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.ws-error {
  margin-top: 12px;
}

.ws-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-height: 400px;
}

.ws-nav-wrap {
  flex: none;
  width: 200px;
  position: sticky;
  top: 80px;
}

.ws-nav {
  border-right: none;
  background: transparent;
}

.ws-group-title {
  padding: 10px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.ws-nav :deep(.el-menu-item) {
  height: 38px;
  line-height: 38px;
  border-radius: var(--radius-md);
  margin: 2px 0;
  padding: 0 12px !important;
}

.ws-nav :deep(.el-menu-item.is-active) {
  background: rgba(var(--primary-color-rgb), 0.12);
  color: var(--primary-color);
  font-weight: 600;
}

.ws-lock {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  border: 1px solid var(--dew-card-border, var(--border-color));
  border-radius: 4px;
  padding: 0 4px;
}

.ws-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 1024px) {
  .ws-body {
    flex-direction: column;
  }
  .ws-nav-wrap {
    width: 100%;
    position: static;
  }
}
</style>
