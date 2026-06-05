<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';
import MenuComponent from '../components/MenuComponent.vue';
import PageFooterComponent from '../components/PageFooterComponent.vue';
import MobileMenuComponent from '../components/MobileMenuComponent.vue';
import { Menu as Expand } from '@element-plus/icons-vue';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) isMobileMenuOpen.value = false;
};
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value; };

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  refreshAll();
});
onUnmounted(() => window.removeEventListener('resize', checkScreenSize));

const activeTab = ref('keys');

// ---------- 用量与配额 ----------
const usage = reactive({ spend: null, max_budget: null, remaining: null, budget_duration: null });
const usagePercent = computed(() => {
  if (!usage.max_budget || usage.spend === null || usage.spend === undefined) return 0;
  return Math.min(100, Math.round((usage.spend / usage.max_budget) * 100));
});
const usageStatus = computed(() => {
  if (usagePercent.value >= 100) return 'exception';
  if (usagePercent.value >= 80) return 'warning';
  return 'success';
});
const fmtMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(4)}`);

const fetchUsage = async () => {
  try {
    const res = await api.get('/llm/usage');
    Object.assign(usage, res.data.data);
  } catch (e) { /* ignore */ }
};

// ---------- 我的 Key ----------
const keys = ref([]);
const keysLoading = ref(false);
const createKeyVisible = ref(false);
const newKeyAlias = ref('');
const plainKeyVisible = ref(false);
const plainKey = ref('');

const fetchKeys = async () => {
  keysLoading.value = true;
  try {
    const res = await api.get('/llm/keys');
    keys.value = res.data.data || [];
  } catch (e) {
    ElMessage.error('获取 Key 列表失败');
  } finally {
    keysLoading.value = false;
  }
};

const submitCreateKey = async () => {
  try {
    const res = await api.post('/llm/keys', { key_alias: newKeyAlias.value });
    plainKey.value = res.data.data.litellm_key;
    createKeyVisible.value = false;
    plainKeyVisible.value = true;
    newKeyAlias.value = '';
    fetchKeys();
    fetchUsage();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '创建失败');
  }
};

const deleteKey = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除 Key「${row.key_alias}」？删除后将立即失效。`, '提示', { type: 'warning' });
  } catch { return; }
  try {
    await api.delete(`/llm/keys/${row.id}`);
    ElMessage.success('已删除');
    fetchKeys();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '删除失败');
  }
};

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(plainKey.value);
    ElMessage.success('已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
};

// ---------- 申请增额 ----------
const requests = ref([]);
const requestVisible = ref(false);
const requestForm = reactive({ requested_budget: 0, reason: '' });
const statusText = (s) => ({ pending: '待审批', approved: '已通过', rejected: '已拒绝' }[s] || s);
const statusTag = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info');

const fetchRequests = async () => {
  try {
    const res = await api.get('/llm/quota-requests');
    requests.value = res.data.data || [];
  } catch (e) { /* ignore */ }
};

const openRequest = () => {
  requestForm.requested_budget = usage.max_budget ? Number(usage.max_budget) + 5 : 10;
  requestForm.reason = '';
  requestVisible.value = true;
};

const submitRequest = async () => {
  if (!requestForm.requested_budget || requestForm.requested_budget <= 0) {
    ElMessage.warning('请填写期望额度');
    return;
  }
  try {
    await api.post('/llm/quota-requests', { ...requestForm });
    ElMessage.success('申请已提交，等待管理员审批');
    requestVisible.value = false;
    fetchRequests();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '提交失败');
  }
};

const refreshAll = () => {
  fetchUsage();
  fetchKeys();
  fetchRequests();
};
</script>

<template>
  <div :class="['llm-service-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu"><Expand /></el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <div class="page-header">
            <h1 class="main-title">AI 大模型服务</h1>
            <p class="sub-title">创建 API Key，调用平台大模型并管理你的额度</p>
          </div>

          <!-- 用量概览 -->
          <div class="usage-card">
            <div class="usage-item">
              <div class="label">已用额度</div>
              <div class="value">{{ fmtMoney(usage.spend) }}</div>
            </div>
            <div class="usage-item">
              <div class="label">总额度</div>
              <div class="value">{{ fmtMoney(usage.max_budget) }}</div>
            </div>
            <div class="usage-item">
              <div class="label">剩余额度</div>
              <div class="value">{{ fmtMoney(usage.remaining) }}</div>
            </div>
            <div class="usage-item">
              <div class="label">重置周期</div>
              <div class="value">{{ usage.budget_duration || '-' }}</div>
            </div>
            <div class="usage-progress">
              <el-progress :percentage="usagePercent" :status="usageStatus" :stroke-width="14" />
              <el-button type="primary" plain size="small" class="apply-btn" @click="openRequest">申请更多额度</el-button>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="llm-tabs">
            <!-- 我的 Key -->
            <el-tab-pane label="我的 API Key" name="keys">
              <div class="tab-toolbar">
                <el-button type="primary" @click="createKeyVisible = true">创建新 Key</el-button>
              </div>
              <el-table :data="keys" v-loading="keysLoading" border style="width: 100%">
                <el-table-column prop="key_alias" label="别名" min-width="140" />
                <el-table-column prop="litellm_key" label="Key" min-width="180" />
                <el-table-column prop="created_at" label="创建时间" width="180" />
                <el-table-column label="操作" width="100" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="danger" @click="deleteKey(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!keysLoading && keys.length === 0" description="还没有 Key，点击上方创建" />
            </el-tab-pane>

            <!-- 申请记录 -->
            <el-tab-pane label="增额申请记录" name="requests">
              <div class="tab-toolbar">
                <el-button type="primary" plain @click="openRequest">申请更多额度</el-button>
              </div>
              <el-table :data="requests" border style="width: 100%">
                <el-table-column label="申请额度($)" width="130">
                  <template #default="{ row }">{{ Number(row.requested_budget).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column prop="reason" label="理由" min-width="180" show-overflow-tooltip />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="review_comment" label="审批意见" min-width="140" show-overflow-tooltip />
                <el-table-column prop="created_at" label="申请时间" width="180" />
              </el-table>
              <el-empty v-if="requests.length === 0" description="暂无申请记录" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>

    <!-- 创建 Key -->
    <el-dialog v-model="createKeyVisible" title="创建 API Key" width="440">
      <el-form label-width="80">
        <el-form-item label="别名">
          <el-input v-model="newKeyAlias" placeholder="便于识别，如 我的测试Key" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createKeyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreateKey">创建</el-button>
      </template>
    </el-dialog>

    <!-- 明文 Key -->
    <el-dialog v-model="plainKeyVisible" title="API Key（仅显示一次）" width="520">
      <el-alert type="warning" :closable="false" show-icon
        title="该 Key 仅在此显示一次，请立即复制并妥善保存" style="margin-bottom: 12px;" />
      <el-input v-model="plainKey" readonly>
        <template #append><el-button @click="copyKey">复制</el-button></template>
      </el-input>
      <template #footer>
        <el-button type="primary" @click="plainKeyVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 申请额度 -->
    <el-dialog v-model="requestVisible" title="申请更多额度" width="440">
      <el-form label-width="100">
        <el-form-item label="期望总额度($)">
          <el-input-number v-model="requestForm.requested_budget" :min="0" :step="5" />
        </el-form-item>
        <el-form-item label="申请理由">
          <el-input v-model="requestForm.reason" type="textarea" :rows="3" placeholder="请说明用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requestVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRequest">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.llm-service-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s ease, color 0.3s ease;
}
.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  position: fixed;
  width: 100%;
  top: 0;
}
.main-content {
  margin-top: 80px;
  padding: 24px 16px 40px;
}
.content-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
}
.page-header { margin-bottom: 20px; }
.main-title { font-size: 28px; font-weight: 700; margin: 0 0 6px; }
.sub-title { color: #909399; margin: 0; }

.usage-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px 24px;
  padding: 20px 24px;
  border-radius: 12px;
  background: var(--usage-bg, #f5f7fa);
  margin-bottom: 24px;
}
.usage-item .label { color: #909399; font-size: 13px; margin-bottom: 6px; }
.usage-item .value { font-size: 20px; font-weight: 600; }
.usage-progress {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 16px;
}
.usage-progress :deep(.el-progress) { flex: 1; }
.apply-btn { flex-shrink: 0; }

.tab-toolbar { margin-bottom: 12px; }

.theme-dark .usage-card { background: #1f1f1f; }
.theme-dark .main-title { color: #e5e5e5; }

@media (max-width: 768px) {
  .usage-card { grid-template-columns: repeat(2, 1fr); }
  .mobile-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 16px; background: #fff;
  }
}
</style>
