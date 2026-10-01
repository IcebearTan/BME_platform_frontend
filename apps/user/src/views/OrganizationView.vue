<script setup>
// 社团组织架构页 · 主从分栏重构（工作台 III 同期，同一设计思想）：
// 左=组织树常驻（el-tree 完整层级，替代钻入栈，进组仍见全社），
// 右=详情面板（全社总览 / 组态），选中态进 URL（?group=<id>，可深链；无效 id 回落全社）。
// API 一次已回全树（GET /organization → {president, management[], tree[]}），纯前端重构。
// 素底 flat 工作面（work-surface.css 与 /work 共用），展示性由内容承担。
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { Menu as Expand } from '@element-plus/icons-vue';
import MenuComponent from "../components/MenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import api from '../api';
import { DewCard, DewSkeleton } from '@bme/dew-ui';
import OrgTree from '../components/Organization/OrgTree.vue';
import OrgDetailPanel from '../components/Organization/OrgDetailPanel.vue';
import '../styles/work-surface.css';

const store = useStore();
const route = useRoute();
const router = useRouter();

const isDarkMode = computed(() => store.getters.isDarkMode);

const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  fetchOrg();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// ── 数据：真接口，三段式（loading / error / done）──
const org = ref(null);
const loading = ref(true);
const loadFailed = ref(false);

async function fetchOrg() {
  loading.value = true;
  loadFailed.value = false;
  try {
    const res = await api.get('/organization');
    org.value = res.data?.data || null;
  } catch {
    org.value = null;
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

const tree = computed(() => (org.value?.tree || []));

// ── 选中态：?group=<id>（树内校验，无效回落全社）──
// 平铺索引：id → node（含子孙任意层级）
const nodeIndex = computed(() => {
  const map = new Map();
  const walk = (list) => {
    for (const n of list) {
      map.set(n.id, n);
      walk(n.children || []);
    }
  };
  walk(tree.value);
  return map;
});
const selectedId = computed(() => {
  const id = Number(route.query.group) || null;
  return id && nodeIndex.value.has(id) ? id : null;
});
const selectedNode = computed(() =>
  selectedId.value ? nodeIndex.value.get(selectedId.value) : null);

function selectGroup(id) {
  const query = { ...route.query };
  if (id) query.group = String(id);
  else delete query.group;
  router.replace({ query });
}
</script>

<template>
  <div :class="['organization-container work-surface', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="$router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <!-- Page Header -->
          <div class="page-header">
            <div class="page-title-row">
              <span class="title-accent"></span>
              <h1 class="page-title">社团组织架构</h1>
            </div>
            <p class="sub-title">现任组织结构与干事名录；在左侧组织树中选择组别，点击人员可查看主页</p>
          </div>

          <!-- 加载骨架 -->
          <div v-if="loading" class="org-skeleton">
            <DewSkeleton variant="rect" :width="180" :height="28" />
            <div class="split-skeleton">
              <DewSkeleton variant="rect" :width="240" :height="280" />
              <DewSkeleton variant="rect" class="sk-flex" :height="280" />
            </div>
          </div>

          <!-- 拉取失败 -->
          <DewCard v-else-if="loadFailed" variant="flat" size="lg" class="org-empty">
            组织架构加载失败，请稍后刷新重试。
          </DewCard>

          <!-- 空库：接口通但尚未建组 -->
          <DewCard v-else-if="!tree.length" variant="flat" size="lg" class="org-empty">
            组织架构待发布：组别与干事配置后将在此展示。
          </DewCard>

          <!-- 主从分栏：树常驻 + 详情面板 -->
          <div v-else class="org-split">
            <!-- 移动端：树收为顶部下拉选择器（受控于 selectedId，清空=全社） -->
            <div v-if="isMobile" class="org-mobile-picker">
              <el-tree-select :model-value="selectedId" :data="tree" node-key="id" check-strictly
                              :props="{ label: 'name', children: 'children' }"
                              placeholder="全社总览" clearable style="width: 100%;"
                              @update:model-value="(id) => selectGroup(id || null)" />
            </div>
            <!-- 桌面：组织树常驻 -->
            <aside v-else class="org-side">
              <div class="org-side-inner">
                <OrgTree :tree="tree" :current-id="selectedId" @select="selectGroup($event?.id ?? null)" />
              </div>
            </aside>

            <!-- 详情面板 -->
            <main class="org-main">
              <OrgDetailPanel :org="org" :node="selectedNode" @select-group="selectGroup" />
            </main>
          </div>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 根容器：素底 flat 工作面（work-surface tokens），无极光无玻璃 */
.organization-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ws-bg);
  transition: background 0.4s ease, color 0.3s ease;
}

.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
}

.main-content {
  flex: 1;
  padding: 100px 20px 40px; /* top padding for fixed header */
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

.page-footer {
  padding: 0;
  height: auto;
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
}

/* Page Header */
.page-header {
  margin-bottom: 28px;
  text-align: left;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.title-accent {
  display: inline-block;
  width: 4px;
  height: 26px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--dew-text-heading);
}

.sub-title {
  font-size: 15px;
  margin: 0;
  color: var(--dew-text-muted);
}

/* 整页空态 */
.org-empty {
  color: var(--dew-text-muted);
  text-align: center;
  padding: 48px 24px;
  margin-bottom: 32px;
}

/* 加载骨架 */
.org-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.split-skeleton { display: flex; gap: 16px; }
.sk-flex { flex: 1; }

/* ── 主从分栏 ── */
.org-split { display: flex; gap: 22px; align-items: flex-start; }
.org-side {
  width: 252px; flex: none;
  position: sticky; top: 84px;
}
.org-side-inner {
  padding: 10px 8px; border-radius: 12px;
  border: 1px solid var(--ws-border);
  background: var(--ws-panel);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.org-main { flex: 1; min-width: 0; }
.org-mobile-picker { width: 100%; margin-bottom: 16px; }

/* Mobile Styles */
.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.hamburger-icon {
  font-size: 24px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .main-content {
    padding: 80px 16px 20px;
  }

  .page-title {
    font-size: 22px;
  }

  .page-header {
    margin-bottom: 20px;
  }

  .org-split { flex-direction: column; }
}
</style>
