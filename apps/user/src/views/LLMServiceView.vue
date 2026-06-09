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

// ---------- 服务接入信息 ----------
const serviceInfo = reactive({ base_url: '', chat_url: '', messages_url: '', models: [] });
const serviceInfoLoading = ref(false);
const modelsOpen = ref([]);
// Anthropic SDK 的 base_url 是 messages_url 去掉 /v1/messages 后缀
const anthropicBaseUrl = computed(() =>
  serviceInfo.messages_url ? serviceInfo.messages_url.replace(/\/v1\/messages$/, '') : ''
);

const fetchServiceInfo = async () => {
  serviceInfoLoading.value = true;
  try {
    const res = await api.get('/llm/service-info');
    Object.assign(serviceInfo, res.data.data);
  } catch (e) { /* ignore */ } finally {
    serviceInfoLoading.value = false;
  }
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
};

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

const usageRefreshing = ref(false);

const fetchUsage = async (forceRefresh = false) => {
  if (forceRefresh) usageRefreshing.value = true;
  try {
    const res = await api.get('/llm/usage', { params: forceRefresh ? { refresh: 1 } : {} });
    Object.assign(usage, res.data.data);
  } catch (e) { /* ignore */ } finally {
    if (forceRefresh) usageRefreshing.value = false;
  }
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

const copyingKeyId = ref(null);
const copyExistingKey = async (row) => {
  copyingKeyId.value = row.id;
  try {
    const res = await api.get(`/llm/keys/${row.id}/reveal`);
    await navigator.clipboard.writeText(res.data.data.litellm_key);
    ElMessage.success('Key 已复制');
  } catch {
    ElMessage.warning('复制失败，请重试');
  } finally {
    copyingKeyId.value = null;
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
  fetchServiceInfo();
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

          <!-- 页面标题 -->
          <div class="page-header">
            <div class="page-header-inner">
              <div class="header-eyebrow">
                <span class="eyebrow-dot"></span>
                <span>AI 大模型服务</span>
              </div>
              <h1 class="main-title">服务控制台</h1>
              <p class="sub-title">创建 API Key，接入平台大模型，轻松管理调用额度与权限</p>
            </div>
            <div class="header-deco" aria-hidden="true">
              <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="160" cy="40" r="60" fill="url(#g1)" opacity="0.15"/>
                <circle cx="100" cy="120" r="40" fill="url(#g2)" opacity="0.1"/>
                <defs>
                  <radialGradient id="g1"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
                  <radialGradient id="g2"><stop stop-color="#10b981"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
                </defs>
              </svg>
            </div>
          </div>

          <!-- 用量概览 -->
          <div class="usage-panel">
            <div class="usage-stats">
              <div class="stat-card">
                <div class="stat-icon-wrap stat-icon-amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div class="stat-body">
                  <div class="stat-label">已用额度</div>
                  <div class="stat-value stat-val-amber">{{ fmtMoney(usage.spend) }}</div>
                </div>
                <div class="stat-bg-deco stat-deco-amber"></div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap stat-icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div class="stat-body">
                  <div class="stat-label">总额度</div>
                  <div class="stat-value stat-val-blue">{{ fmtMoney(usage.max_budget) }}</div>
                </div>
                <div class="stat-bg-deco stat-deco-blue"></div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap stat-icon-emerald">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div class="stat-body">
                  <div class="stat-label">剩余额度</div>
                  <div class="stat-value stat-val-emerald">{{ fmtMoney(usage.remaining) }}</div>
                </div>
                <div class="stat-bg-deco stat-deco-emerald"></div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap stat-icon-violet">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </div>
                <div class="stat-body">
                  <div class="stat-label">重置周期</div>
                  <div class="stat-value stat-val-violet">{{ usage.budget_duration || '—' }}</div>
                </div>
                <div class="stat-bg-deco stat-deco-violet"></div>
              </div>
            </div>

            <div class="usage-progress-row">
              <div class="progress-meta">
                <span class="progress-label">额度使用率</span>
                <span class="progress-pct">{{ usagePercent }}%</span>
              </div>
              <el-progress
                :percentage="usagePercent"
                :status="usageStatus"
                :stroke-width="10"
                :show-text="false"
                class="usage-bar"
              />
              <div class="progress-actions">
                <el-button :loading="usageRefreshing" size="small" class="btn-ghost" @click="fetchUsage(true)">
                  刷新用量
                </el-button>
                <el-button type="primary" size="small" @click="openRequest">申请更多额度</el-button>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <el-tabs v-model="activeTab" class="llm-tabs">
            <!-- 我的 Key -->
            <el-tab-pane label="我的 API Key" name="keys">
              <div class="tab-toolbar">
                <div class="toolbar-left">
                  <span class="toolbar-hint">共 {{ keys.length }} 个 Key</span>
                </div>
                <el-button type="primary" @click="createKeyVisible = true">+ 创建新 Key</el-button>
              </div>
              <div class="table-card">
                <el-table :data="keys" v-loading="keysLoading" style="width: 100%">
                  <el-table-column prop="key_alias" label="别名" min-width="140" />
                  <el-table-column prop="litellm_key" label="Key（已脱敏）" min-width="200">
                    <template #default="{ row }">
                      <code class="key-masked">{{ row.litellm_key }}</code>
                    </template>
                  </el-table-column>
                  <el-table-column prop="created_at" label="创建时间" width="180" />
                  <el-table-column label="操作" width="160" fixed="right">
                    <template #default="{ row }">
                      <el-button size="small" :loading="copyingKeyId === row.id" @click="copyExistingKey(row)">复制</el-button>
                      <el-button size="small" type="danger" @click="deleteKey(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <el-empty v-if="!keysLoading && keys.length === 0" description="还没有 Key，点击上方创建" class="empty-state" />
            </el-tab-pane>

            <!-- 申请记录 -->
            <el-tab-pane label="增额申请记录" name="requests">
              <div class="tab-toolbar">
                <div class="toolbar-left">
                  <span class="toolbar-hint">共 {{ requests.length }} 条记录</span>
                </div>
                <el-button type="primary" plain @click="openRequest">申请更多额度</el-button>
              </div>
              <div class="table-card">
                <el-table :data="requests" style="width: 100%">
                  <el-table-column label="申请额度" width="120">
                    <template #default="{ row }">
                      <span class="amount-cell">${{ Number(row.requested_budget).toFixed(2) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="申请理由" min-width="180" show-overflow-tooltip />
                  <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                      <el-tag :type="statusTag(row.status)" effect="light">{{ statusText(row.status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="review_comment" label="审批意见" min-width="140" show-overflow-tooltip />
                  <el-table-column label="额度到期" width="180">
                    <template #default="{ row }">
                      <template v-if="row.status === 'approved'">
                        <el-tag v-if="row.reverted_at" size="small" type="info">已回滚</el-tag>
                        <span v-else-if="row.override_expires_at" class="date-cell">{{ row.override_expires_at }}</span>
                        <span v-else class="muted">—</span>
                      </template>
                      <span v-else class="muted">—</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="created_at" label="申请时间" width="180" />
                </el-table>
              </div>
              <el-empty v-if="requests.length === 0" description="暂无申请记录" class="empty-state" />
            </el-tab-pane>

            <!-- 接入说明 -->
            <el-tab-pane label="接入说明" name="guide">
              <div v-loading="serviceInfoLoading" class="guide-section">

                <div class="guide-block">
                  <div class="guide-label">
                    <span class="guide-label-icon">
                      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zm1.5-.5a.5.5 0 0 0-.5.5v.5h14v-.5a.5.5 0 0 0-.5-.5h-13zm13.5 2h-14v7a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-7z"/></svg>
                    </span>
                    接口地址
                  </div>
                  <div class="url-list">
                    <div class="url-row">
                      <span class="url-badge">Base URL</span>
                      <code class="url-code">{{ serviceInfo.base_url || '—' }}</code>
                      <el-button v-if="serviceInfo.base_url" size="small" plain @click="copyText(serviceInfo.base_url)">复制</el-button>
                    </div>
                    <div class="url-row">
                      <div class="url-badge-wrap">
                        <span class="url-badge url-badge-openai">OpenAI 兼容</span>
                        <span class="url-badge-sub">POST /chat/completions</span>
                      </div>
                      <code class="url-code">{{ serviceInfo.chat_url || '—' }}</code>
                      <el-button v-if="serviceInfo.chat_url" size="small" plain @click="copyText(serviceInfo.chat_url)">复制</el-button>
                    </div>
                    <div class="url-row">
                      <div class="url-badge-wrap">
                        <span class="url-badge url-badge-claude">Claude API 兼容</span>
                        <span class="url-badge-sub">POST /v1/messages</span>
                      </div>
                      <code class="url-code">{{ serviceInfo.messages_url || '—' }}</code>
                      <el-button v-if="serviceInfo.messages_url" size="small" plain @click="copyText(serviceInfo.messages_url)">复制</el-button>
                    </div>
                  </div>
                </div>

                <div class="guide-block">
                  <el-collapse v-model="modelsOpen" class="models-collapse">
                    <el-collapse-item name="models">
                      <template #title>
                        <div class="guide-label" style="margin:0; display:flex; align-items:center; gap:8px;">
                          <span class="guide-label-icon">
                            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM6 6.883a.5.5 0 0 1 .757-.429l3.528 2.117a.5.5 0 0 1 0 .858l-3.528 2.117a.5.5 0 0 1-.757-.43V6.884z"/></svg>
                          </span>
                          可用模型
                          <el-tag v-if="serviceInfo.models.length" size="small" type="primary" effect="light">{{ serviceInfo.models.length }} 个</el-tag>
                        </div>
                      </template>
                      <el-empty v-if="!serviceInfo.models.length" description="暂未配置可用模型" />
                      <template v-else>
                        <el-table :data="serviceInfo.models" style="width:100%;margin-top:8px;">
                          <el-table-column prop="id" label="模型 ID" min-width="220">
                            <template #default="{ row }">
                              <code class="model-id">{{ row.id }}</code>
                            </template>
                          </el-table-column>
                          <el-table-column label="兼容格式" width="200">
                            <template #default>
                              <div class="model-compat-tags">
                                <span class="compat-tag compat-openai">OpenAI 兼容</span>
                                <span class="compat-tag compat-claude">Claude API 兼容</span>
                              </div>
                            </template>
                          </el-table-column>
                          <el-table-column label="操作" width="88">
                            <template #default="{ row }">
                              <el-button size="small" plain @click="copyText(row.id)">复制 ID</el-button>
                            </template>
                          </el-table-column>
                        </el-table>
                        <p class="models-note">以上模型均同时兼容 OpenAI 与 Claude API 两种调用格式，请求时使用对应端点地址即可。</p>
                      </template>
                    </el-collapse-item>
                  </el-collapse>
                </div>

                <div class="guide-block">
                  <div class="guide-label">
                    <span class="guide-label-icon">
                      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/></svg>
                    </span>
                    调用示例
                  </div>
                  <div class="examples-grid">
                    <!-- OpenAI SDK -->
                    <div>
                      <div class="example-label">
                        <span class="example-badge example-badge-openai">OpenAI 兼容</span>
                        <span class="example-badge-tip">使用 openai 库</span>
                      </div>
                      <div class="code-block">
                        <div class="code-header">
                          <div class="code-dots">
                            <span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
                          </div>
                          <span class="code-filename">openai_example.py</span>
                        </div>
                        <pre class="guide-pre"><span class="syn-kw">from</span> openai <span class="syn-kw">import</span> <span class="syn-cls">OpenAI</span>

client <span class="syn-op">=</span> <span class="syn-cls">OpenAI</span>(
    api_key<span class="syn-op">=</span><span class="syn-str">"你的 API Key"</span>,
    base_url<span class="syn-op">=</span><span class="syn-str">"{{ serviceInfo.base_url || 'http://...' }}"</span>
)

response <span class="syn-op">=</span> client.chat.completions.create(
    model<span class="syn-op">=</span><span class="syn-str">"{{ serviceInfo.models[0]?.id || 'model-name' }}"</span>,
    messages<span class="syn-op">=</span>[{<span class="syn-str">"role"</span>: <span class="syn-str">"user"</span>, <span class="syn-str">"content"</span>: <span class="syn-str">"你好"</span>}]
)
<span class="syn-fn">print</span>(response.choices[<span class="syn-num">0</span>].message.content)</pre>
                      </div>
                    </div>

                    <!-- Anthropic SDK -->
                    <div>
                      <div class="example-label">
                        <span class="example-badge example-badge-claude">Claude API 兼容</span>
                        <span class="example-badge-tip">使用 anthropic 库</span>
                      </div>
                      <div class="code-block">
                        <div class="code-header">
                          <div class="code-dots">
                            <span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
                          </div>
                          <span class="code-filename">anthropic_example.py</span>
                        </div>
                        <pre class="guide-pre"><span class="syn-kw">import</span> anthropic

client <span class="syn-op">=</span> anthropic.<span class="syn-cls">Anthropic</span>(
    api_key<span class="syn-op">=</span><span class="syn-str">"你的 API Key"</span>,
    base_url<span class="syn-op">=</span><span class="syn-str">"{{ anthropicBaseUrl || 'http://...' }}"</span>
)

message <span class="syn-op">=</span> client.messages.create(
    model<span class="syn-op">=</span><span class="syn-str">"{{ serviceInfo.models[0]?.id || 'model-name' }}"</span>,
    max_tokens<span class="syn-op">=</span><span class="syn-num">1024</span>,
    messages<span class="syn-op">=</span>[{<span class="syn-str">"role"</span>: <span class="syn-str">"user"</span>, <span class="syn-str">"content"</span>: <span class="syn-str">"你好"</span>}]
)
<span class="syn-fn">print</span>(message.content[<span class="syn-num">0</span>].text)</pre>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap');

/* ===== CSS Variables ===== */
.theme-light {
  --bg-page:        #f0f2f7;
  --bg-card:        #ffffff;
  --bg-card-hover:  #f8faff;
  --bg-code:        #1a1e2e;
  --border:         #e4e7ef;
  --text-primary:   #0f172a;
  --text-secondary: #64748b;
  --text-muted:     #94a3b8;
  --shadow-sm:      0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md:      0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
  --header-bg:      rgba(255,255,255,0.92);
  --header-hero:    linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #faf5ff 100%);
}
.theme-dark {
  --bg-page:        #0d1117;
  --bg-card:        #161b27;
  --bg-card-hover:  #1e2535;
  --bg-code:        #0d1117;
  --border:         #21283a;
  --text-primary:   #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted:     #475569;
  --shadow-sm:      0 1px 3px rgba(0,0,0,.3);
  --shadow-md:      0 4px 16px rgba(0,0,0,.4);
  --header-bg:      rgba(13,17,23,0.92);
  --header-hero:    linear-gradient(135deg, #0f1829 0%, #0d1f1a 50%, #130f1f 100%);
}

/* ===== Layout ===== */
.llm-service-container {
  min-height: 100vh;
  background: var(--bg-page);
  font-family: 'Sora', system-ui, -apple-system, sans-serif;
  transition: background-color 0.3s, color 0.3s;
  color: var(--text-primary);
}
.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  position: fixed;
  width: 100%;
  top: 0;
  background: var(--header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.main-content {
  margin-top: 64px;
  padding: 0 16px 60px;
}
.content-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Hero Header ===== */
.page-header {
  position: relative;
  background: var(--header-hero);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 40px;
  margin: 28px 0 24px;
  overflow: hidden;
}
.page-header-inner { position: relative; z-index: 1; }
.header-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
  margin-bottom: 10px;
}
.eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
.main-title {
  font-size: 34px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #1e40af, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}
.theme-dark .main-title {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
}
.sub-title {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}
.header-deco {
  position: absolute;
  right: 20px; top: 0;
  width: 200px; height: 160px;
  pointer-events: none;
}

/* ===== Usage Panel ===== */
.usage-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}
.usage-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-page);
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: var(--shadow-md); }

.stat-icon-wrap {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon-wrap svg { width: 18px; height: 18px; }

.stat-icon-amber  { background: #fef3c7; color: #d97706; }
.stat-icon-blue   { background: #dbeafe; color: #2563eb; }
.stat-icon-emerald{ background: #d1fae5; color: #059669; }
.stat-icon-violet { background: #ede9fe; color: #7c3aed; }
.theme-dark .stat-icon-amber  { background: rgba(251,191,36,.15); color: #fbbf24; }
.theme-dark .stat-icon-blue   { background: rgba(59,130,246,.15); color: #60a5fa; }
.theme-dark .stat-icon-emerald{ background: rgba(16,185,129,.15); color: #34d399; }
.theme-dark .stat-icon-violet { background: rgba(139,92,246,.15); color: #a78bfa; }

.stat-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; font-family: 'Sora', monospace; letter-spacing: -0.02em; }
.stat-val-amber  { color: #d97706; }
.stat-val-blue   { color: #2563eb; }
.stat-val-emerald{ color: #059669; }
.stat-val-violet { color: #7c3aed; }
.theme-dark .stat-val-amber  { color: #fbbf24; }
.theme-dark .stat-val-blue   { color: #60a5fa; }
.theme-dark .stat-val-emerald{ color: #34d399; }
.theme-dark .stat-val-violet { color: #a78bfa; }

.stat-bg-deco {
  position: absolute;
  right: -12px; bottom: -12px;
  width: 60px; height: 60px;
  border-radius: 50%;
  opacity: 0.08;
}
.stat-deco-amber  { background: #f59e0b; }
.stat-deco-blue   { background: #3b82f6; }
.stat-deco-emerald{ background: #10b981; }
.stat-deco-violet { background: #8b5cf6; }

/* Progress */
.usage-progress-row {
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.progress-label { font-size: 13px; color: var(--text-secondary); }
.progress-pct { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.usage-bar { width: 100%; }
.usage-bar :deep(.el-progress-bar__outer) { background: var(--border); }
.progress-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}
.btn-ghost {
  border-color: var(--border) !important;
  color: var(--text-secondary) !important;
  background: transparent !important;
}
.btn-ghost:hover { border-color: #3b82f6 !important; color: #3b82f6 !important; }

/* ===== Tabs ===== */
.llm-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: var(--border); }
.llm-tabs :deep(.el-tabs__item) {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 0 20px;
  height: 44px;
  line-height: 44px;
  transition: color 0.2s;
}
.llm-tabs :deep(.el-tabs__item.is-active) { color: #3b82f6; font-weight: 600; }
.llm-tabs :deep(.el-tabs__active-bar) { background: #3b82f6; height: 2px; border-radius: 2px; }
.llm-tabs :deep(.el-tabs__content) { padding-top: 20px; }

/* ===== Tab toolbar ===== */
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar-left { display: flex; align-items: center; }
.toolbar-hint { font-size: 13px; color: var(--text-muted); }

/* ===== Table card ===== */
.table-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.table-card :deep(.el-table) {
  background: transparent;
  color: var(--text-primary);
}
.table-card :deep(.el-table th) {
  background: var(--bg-page) !important;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}
.table-card :deep(.el-table td) {
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}
.table-card :deep(.el-table--border) { border: none; }
.table-card :deep(.el-table--border::after),
.table-card :deep(.el-table--border::before),
.table-card :deep(.el-table__inner-wrapper::before) { display: none; }
.table-card :deep(.el-table tr:last-child td) { border-bottom: none; }
.table-card :deep(.el-table__body tr:hover td) { background: var(--bg-card-hover) !important; }

.key-masked {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-page);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}
.model-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #3b82f6;
}
.amount-cell { font-weight: 600; color: var(--text-primary); }
.date-cell { font-size: 12px; color: var(--text-secondary); }
.muted { color: var(--text-muted); }

.empty-state { padding: 40px 0; }

/* ===== Guide Section ===== */
.guide-section { display: flex; flex-direction: column; gap: 20px; }

.guide-block {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
}

.guide-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.guide-label-icon {
  width: 20px; height: 20px;
  color: #3b82f6;
  display: flex; align-items: center; justify-content: center;
}
.guide-label-icon svg { width: 14px; height: 14px; }

.url-list { display: flex; flex-direction: column; gap: 10px; }
.url-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--bg-page);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.url-badge-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}
.url-badge-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}
.url-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: #3b82f6;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.url-badge-openai { background: #10b981; }
.url-badge-claude { background: #d97706; }
.url-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  flex: 1;
  word-break: break-all;
}

/* Models collapse */
.models-collapse :deep(.el-collapse) { border: none; }
.models-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  height: auto;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
}
.models-collapse :deep(.el-collapse-item__wrap) { border: none; }
.models-collapse :deep(.el-collapse-item__content) { padding: 12px 0 0; }

/* Model compat tags */
.model-compat-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.compat-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
}
.compat-openai { background: rgba(16,185,129,.12); color: #059669; border: 1px solid rgba(16,185,129,.3); }
.compat-claude { background: rgba(217,119,6,.12); color: #d97706; border: 1px solid rgba(217,119,6,.3); }
.theme-dark .compat-openai { background: rgba(52,211,153,.1); color: #34d399; border-color: rgba(52,211,153,.25); }
.theme-dark .compat-claude { background: rgba(251,191,36,.1); color: #fbbf24; border-color: rgba(251,191,36,.25); }
.models-note {
  font-size: 12px;
  color: var(--text-muted);
  margin: 10px 0 0;
  padding: 0 4px;
  line-height: 1.6;
}

/* Examples grid */
.examples-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.example-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.example-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
}
.example-badge-openai { background: #10b981; }
.example-badge-claude { background: #d97706; }
.example-badge-tip { font-size: 12px; color: var(--text-muted); }

@media (max-width: 768px) {
  .examples-grid { grid-template-columns: 1fr; }
}

/* Code block */
.code-block {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.code-header {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #252d3f;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.code-dots { display: flex; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot-r { background: #ff5f57; }
.dot-y { background: #febc2e; }
.dot-g { background: #28c840; }
.code-filename {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  margin-left: 4px;
}
.guide-pre {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--bg-code);
  color: #abb2bf;
  padding: 20px 20px;
  margin: 0;
  overflow-x: auto;
  white-space: pre;
  line-height: 1.75;
}
.syn-kw  { color: #c678dd; }
.syn-cls { color: #e5c07b; }
.syn-str { color: #98c379; }
.syn-fn  { color: #61afef; }
.syn-num { color: #d19a66; }
.syn-op  { color: #56b6c2; }

/* ===== Mobile ===== */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-card);
}

@media (max-width: 768px) {
  .page-header { padding: 24px 20px; margin: 16px 0 16px; }
  .main-title { font-size: 26px; }
  .header-deco { display: none; }
  .usage-stats { grid-template-columns: repeat(2, 1fr); }
  .usage-panel { padding: 16px; }
  .guide-block { padding: 16px; }
  .url-row { gap: 8px; }
  .url-code { font-size: 11px; }
  .main-content { padding: 0 12px 48px; }
}
@media (max-width: 480px) {
  .usage-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat-card { padding: 12px; }
  .stat-value { font-size: 16px; }
}
</style>
