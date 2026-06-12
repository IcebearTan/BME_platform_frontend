<template>
  <div class="admin-llm-page selectable">

    <!-- 页面标题 -->
    <div class="page-hero">
      <div class="hero-left">
        <div class="hero-eyebrow">
          <span class="eyebrow-dot"></span>
          <span>大模型服务 · 管理后台</span>
        </div>
        <h2 class="hero-title">项目管理</h2>
        <p class="hero-sub">管理接入大模型服务的各个项目，分配独立 API Key 与用量配额</p>
      </div>
      <el-button type="primary" class="hero-btn" @click="openCreate">
        <svg style="width:14px;height:14px;margin-right:6px;vertical-align:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建项目
      </el-button>
    </div>

    <!-- 服务接入信息 -->
    <div class="section-card" v-loading="serviceLoading">
      <div class="section-header" @click="infoExpanded = !infoExpanded" style="cursor:pointer;user-select:none;">
        <div class="section-title-row">
          <span class="section-icon section-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </span>
          <span class="section-title">服务接入信息</span>
          <el-tag size="small" type="info" effect="light" style="margin-left:8px;">Base URL &amp; 可用模型</el-tag>
        </div>
        <svg class="collapse-arrow" :class="{ rotated: infoExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>

      <div v-show="infoExpanded" class="section-body">
        <div class="url-grid">
          <div class="url-item">
            <span class="url-badge url-badge-default">Base URL</span>
            <code class="url-code">{{ serviceInfo.base_url || '—' }}</code>
            <el-button v-if="serviceInfo.base_url" size="small" plain @click="copyText(serviceInfo.base_url)">复制</el-button>
          </div>
          <div class="url-item">
            <div class="url-badge-stack">
              <span class="url-badge url-badge-openai">OpenAI 兼容</span>
              <span class="url-badge-path">POST /chat/completions</span>
            </div>
            <code class="url-code">{{ serviceInfo.chat_url || '—' }}</code>
            <el-button v-if="serviceInfo.chat_url" size="small" plain @click="copyText(serviceInfo.chat_url)">复制</el-button>
          </div>
          <div class="url-item">
            <div class="url-badge-stack">
              <span class="url-badge url-badge-claude">Claude API 兼容</span>
              <span class="url-badge-path">POST /v1/messages</span>
            </div>
            <code class="url-code">{{ serviceInfo.messages_url || '—' }}</code>
            <el-button v-if="serviceInfo.messages_url" size="small" plain @click="copyText(serviceInfo.messages_url)">复制</el-button>
          </div>
        </div>

        <!-- 可用模型 -->
        <div class="models-section">
          <div class="models-header" @click="modelsExpanded = !modelsExpanded" style="cursor:pointer;user-select:none;">
            <span class="models-title">
              <svg style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;color:#6366f1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 22 22 7 12 2"/></svg>
              可用模型
              <el-tag v-if="serviceInfo.models.length" size="small" type="primary" effect="light" style="margin-left:6px;">{{ serviceInfo.models.length }} 个</el-tag>
            </span>
            <svg class="collapse-arrow" :class="{ rotated: modelsExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div v-show="modelsExpanded">
            <el-empty v-if="!serviceInfo.models.length" description="暂无可用模型" :image-size="48" style="padding:20px 0;" />
            <el-table v-else :data="serviceInfo.models" size="small" style="width:100%;margin-top:10px;" class="inner-table">
              <el-table-column prop="id" label="模型 ID" min-width="220">
                <template #default="{ row }">
                  <code class="model-id-code">{{ row.id }}</code>
                </template>
              </el-table-column>
              <el-table-column label="兼容格式" width="260">
                <template #default="{ row }">
                  <div class="compat-tags">
                    <span v-if="modelCompat(row.id).openai" class="compat-tag compat-openai">OpenAI 兼容</span>
                    <span v-if="modelCompat(row.id).claude" class="compat-tag compat-claude">Claude API 兼容</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="request_url" label="请求 URL" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="muted-text">{{ row.request_url || '—' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="" width="88">
                <template #default="{ row }">
                  <el-button size="small" plain @click="copyText(row.id)">复制 ID</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title-row">
          <span class="section-icon section-icon-violet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
          <span class="section-title">项目列表</span>
          <span class="count-badge">{{ projects.length }}</span>
        </div>
      </div>
      <el-table :data="projects" v-loading="loading" style="width:100%" class="main-table">
        <el-table-column prop="name" label="项目名" min-width="140">
          <template #default="{ row }">
            <span class="project-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="muted-text">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="models" label="可用模型" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.models" class="model-tag">{{ row.models }}</span>
            <el-tag v-else size="small" type="success" effect="light">全部</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="litellm_key" label="API Key" min-width="180">
          <template #default="{ row }">
            <code class="key-masked">{{ row.litellm_key }}</code>
          </template>
        </el-table-column>
        <el-table-column label="已用额度" width="120">
          <template #default="{ row }">
            <span class="spend-value">{{ formatMoney(row.spend) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">
            <span class="muted-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <button class="abtn abtn-activity" @click="openProjectActivity(row)">趋势</button>
              <button class="abtn abtn-default" @click="viewUsage(row)">用量</button>
              <button class="abtn abtn-default" :disabled="copyingProjectId === row.id" @click="copyProjectKey(row)">复制 Key</button>
              <button class="abtn abtn-warning" @click="regenerateKey(row)">重置 Key</button>
              <button class="abtn abtn-danger" @click="removeProject(row)">删除</button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && projects.length === 0" description="暂无项目，点击右上角新建" style="padding: 40px 0;" />
    </div>

    <!-- 新建项目 -->
    <el-dialog v-model="createVisible" title="新建大模型项目" width="520" class="admin-dialog">
      <el-form :model="form" label-width="100px">
        <el-form-item label="项目名">
          <el-input v-model="form.name" placeholder="唯一项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="简要描述项目用途" />
        </el-form-item>
        <el-form-item label="可用模型">
          <el-input v-model="form.models" placeholder="逗号分隔，留空表示全部，如 deepseek-chat,qwen3.6-plus" />
          <div class="form-hint">留空则该项目可使用所有模型</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新 Key 展示 -->
    <el-dialog v-model="keyVisible" title="API Key（仅显示一次，请妥善保存）" width="560" class="admin-dialog">
      <el-alert type="warning" :closable="false" show-icon
        title="该 Key 仅在此显示一次，关闭后将无法再次查看完整内容" style="margin-bottom: 14px;" />
      <el-input v-model="plainKey" readonly>
        <template #append><el-button @click="copyKey">复制</el-button></template>
      </el-input>
      <template #footer>
        <el-button type="primary" @click="keyVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 项目活动趋势 Drawer -->
    <el-drawer v-model="projActivityVisible" :title="`活动趋势 · ${projActivityProject.name || ''}`" size="720px" direction="rtl" destroy-on-close>
      <div class="activity-drawer">
        <div class="activity-toolbar">
          <el-date-picker
            v-model="projActivityDateRange"
            type="daterange"
            range-separator="→"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            size="small"
          />
          <el-button size="small" type="primary" :loading="projActivityLoading" @click="fetchProjectActivity">查询</el-button>
        </div>

        <div v-if="projActivityLoading"><el-skeleton :rows="6" animated /></div>

        <template v-else-if="projActivityMetadata">
          <div class="act-stat-row">
            <div class="act-stat-card">
              <div class="act-stat-label">总消耗</div>
              <div class="act-stat-val act-blue">${{ fmtNum(projActivityMetadata.total_spend, 4) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">总请求数</div>
              <div class="act-stat-val act-violet">{{ projActivityMetadata.total_api_requests ?? '—' }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">成功率</div>
              <div class="act-stat-val" :class="projSuccessRateClass">{{ projSuccessRateText }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">总 Token</div>
              <div class="act-stat-val act-emerald">{{ fmtTokens(projActivityMetadata.total_tokens) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">缓存命中 Token</div>
              <div class="act-stat-val act-slate">{{ fmtTokens(projActivityMetadata.total_cache_read_input_tokens) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">缓存命中率</div>
              <div class="act-stat-val" :class="projCacheHitRate === '—' ? 'act-slate' : 'act-emerald'">{{ projCacheHitRate }}</div>
            </div>
          </div>

          <div class="act-section">
            <div class="act-section-header">
              <span class="act-section-title">每日趋势</span>
              <div class="chart-type-tabs">
                <button :class="['chart-tab', projChartMetric === 'spend' && 'active']" @click="projChartMetric = 'spend'">消耗($)</button>
                <button :class="['chart-tab', projChartMetric === 'requests' && 'active']" @click="projChartMetric = 'requests'">请求数</button>
                <button :class="['chart-tab', projChartMetric === 'tokens' && 'active']" @click="projChartMetric = 'tokens'">Token</button>
              </div>
            </div>
            <div class="chart-wrap" v-if="projDailyData.length > 0">
              <svg viewBox="0 0 600 110" class="trend-svg" preserveAspectRatio="none">
                <path :d="projCurrentChart.area" fill="#8b5cf618" />
                <path :d="projCurrentChart.line" fill="none" :stroke="projChartColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                <circle v-for="(pt, i) in projCurrentChart.pts" :key="i" :cx="pt.x" :cy="pt.y" r="3" :fill="projChartColor" />
              </svg>
              <div class="chart-x-labels">
                <span>{{ projDailyData[0]?.date }}</span>
                <span>{{ projDailyData[Math.floor(projDailyData.length/2)]?.date }}</span>
                <span>{{ projDailyData[projDailyData.length-1]?.date }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无趋势数据" :image-size="60" />
          </div>

          <div class="act-section" v-if="projModelBreakdown.length > 0">
            <div class="act-section-header">
              <span class="act-section-title">按模型分布</span>
              <span class="act-section-sub">{{ projModelBreakdown.length }} 个模型</span>
            </div>
            <table class="model-table">
              <thead><tr><th>模型</th><th class="num-col">消耗($)</th><th class="num-col">Token</th><th class="num-col">请求数</th><th class="num-col">成功率</th></tr></thead>
              <tbody>
                <tr v-for="m in projModelBreakdown" :key="m.model">
                  <td><code class="model-name">{{ m.model }}</code></td>
                  <td class="num-col spend-col">${{ fmtNum(m.spend, 4) }}</td>
                  <td class="num-col">{{ fmtTokens(m.total_tokens) }}</td>
                  <td class="num-col">{{ m.api_requests }}</td>
                  <td class="num-col">
                    <span :class="['rate-badge', m.api_requests ? (m.successful_requests/m.api_requests >= 0.95 ? 'rate-good' : 'rate-warn') : 'rate-na']">
                      {{ m.api_requests ? Math.round(m.successful_requests / m.api_requests * 100) + '%' : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <el-empty v-else-if="!projActivityLoading" description="暂无活动数据" />
      </div>
    </el-drawer>

    <!-- 用量详情 -->
    <el-dialog v-model="usageVisible" title="项目用量详情" width="660" class="admin-dialog">
      <pre class="usage-json">{{ usageDetail }}</pre>
      <template #footer>
        <el-button type="primary" @click="usageVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const projects = ref([]);
const loading = ref(false);
const createVisible = ref(false);
const submitting = ref(false);
const keyVisible = ref(false);
const plainKey = ref('');
const usageVisible = ref(false);
const usageDetail = ref('');

const infoExpanded = ref(true);
const modelsExpanded = ref(true);
const serviceLoading = ref(false);
const serviceInfo = reactive({ base_url: '', chat_url: '', messages_url: '', models: [] });

const fetchServiceInfo = async () => {
  serviceLoading.value = true;
  try {
    const res = await api.get('/llm/service-info');
    Object.assign(serviceInfo, res.data.data);
  } catch (e) { /* ignore */ } finally {
    serviceLoading.value = false;
  }
};

const modelCompat = (id) => {
  const lower = (id || '').toLowerCase();
  if (lower.includes('deepseek')) {
    return lower.includes('anthropic')
      ? { openai: false, claude: true }
      : { openai: true,  claude: false };
  }
  if (lower.startsWith('qwen')) {
    return { openai: true, claude: false };
  }
  return { openai: true, claude: true };
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
};

const form = reactive({ name: '', description: '', models: '' });
const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(4)}`);

const fetchProjects = async () => {
  loading.value = true;
  try {
    const res = await api.get('/llm/admin/projects');
    projects.value = res.data.data || [];
  } catch (e) {
    ElMessage.error('获取项目列表失败');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  form.name = '';
  form.description = '';
  form.models = '';
  createVisible.value = true;
};

const submitCreate = async () => {
  if (!form.name.trim()) { ElMessage.warning('请填写项目名'); return; }
  submitting.value = true;
  try {
    const res = await api.post('/llm/admin/projects', { ...form });
    plainKey.value = res.data.data.litellm_key;
    createVisible.value = false;
    keyVisible.value = true;
    ElMessage.success('项目创建成功');
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '创建失败');
  } finally {
    submitting.value = false;
  }
};

const regenerateKey = async (row) => {
  try {
    await ElMessageBox.confirm(`确认重置项目「${row.name}」的 API Key？旧 Key 将立即失效。`, '提示', { type: 'warning' });
  } catch { return; }
  try {
    const res = await api.post(`/llm/admin/projects/${row.id}/regenerate-key`);
    plainKey.value = res.data.data.litellm_key;
    keyVisible.value = true;
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '重置失败');
  }
};

const removeProject = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除项目「${row.name}」？`, '提示', { type: 'warning' });
  } catch { return; }
  try {
    await api.delete(`/llm/admin/projects/${row.id}`);
    ElMessage.success('已删除');
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '删除失败');
  }
};

const viewUsage = async (row) => {
  try {
    const res = await api.get(`/llm/admin/projects/${row.id}`);
    usageDetail.value = JSON.stringify(res.data.data.usage, null, 2);
    usageVisible.value = true;
  } catch (e) {
    ElMessage.error('获取用量失败');
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

const copyingProjectId = ref(null);
const copyProjectKey = async (row) => {
  copyingProjectId.value = row.id;
  try {
    const res = await api.get(`/llm/admin/projects/${row.id}/reveal-key`);
    await navigator.clipboard.writeText(res.data.data.litellm_key);
    ElMessage.success('Key 已复制');
  } catch {
    ElMessage.warning('复制失败，请重试');
  } finally {
    copyingProjectId.value = null;
  }
};

// ==================== 项目活动趋势 ====================

const projActivityVisible = ref(false);
const projActivityProject = reactive({ id: null, name: '' });
const projActivityLoading = ref(false);
const projActivityMetadata = ref(null);
const projActivityResults = ref([]);
const projChartMetric = ref('spend');

const _today = new Date();
const _30ago = new Date(_today); _30ago.setDate(_today.getDate() - 29);
const _fmt = (d) => d.toISOString().slice(0, 10);
const projActivityDateRange = ref([_fmt(_30ago), _fmt(_today)]);

const dateShortcuts = [
  { text: '最近7天',  value: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate()-6); return [s, e]; } },
  { text: '最近30天', value: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate()-29); return [s, e]; } },
  { text: '最近90天', value: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate()-89); return [s, e]; } },
];

const fmtNum = (v, dec = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(dec));
const fmtTokens = (v) => {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};

const buildChart = (values, W = 600, H = 100) => {
  if (!values || values.length === 0) return { line: '', area: '', pts: [] };
  const n = values.length;
  const maxV = Math.max(...values, 0.0001);
  const pad = H * 0.1;
  const pts = values.map((v, i) => ({
    x: n === 1 ? W / 2 : Math.round((i / (n - 1)) * W),
    y: Math.round(H - pad - (v / maxV) * (H - 2 * pad))
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H}Z`;
  return { line, area, pts };
};

const projDailyData = computed(() =>
  (projActivityResults.value || []).slice().sort((a, b) => a.date > b.date ? 1 : -1)
);

const projChartColor = computed(() => ({ spend: '#8b5cf6', requests: '#3b82f6', tokens: '#10b981' }[projChartMetric.value]));

const projCurrentChart = computed(() => {
  const key = { spend: 'spend', requests: 'api_requests', tokens: 'total_tokens' }[projChartMetric.value];
  return buildChart(projDailyData.value.map(d => Number(d.metrics?.[key] || 0)));
});

const projSuccessRateText = computed(() => {
  const m = projActivityMetadata.value;
  if (!m || !m.total_api_requests) return '—';
  return Math.round((m.total_successful_requests / m.total_api_requests) * 100) + '%';
});
const projSuccessRateClass = computed(() => {
  const m = projActivityMetadata.value;
  if (!m || !m.total_api_requests) return 'act-slate';
  const r = m.total_successful_requests / m.total_api_requests;
  return r >= 0.95 ? 'act-emerald' : r >= 0.8 ? 'act-amber' : 'act-red';
});

const projCacheHitRate = computed(() => {
  const m = projActivityMetadata.value;
  if (!m) return '—';
  const cacheRead = m.total_cache_read_input_tokens || 0;
  const prompt = m.total_prompt_tokens || 0;
  const total = cacheRead + prompt;
  if (!total) return '—';
  return Math.round(cacheRead / total * 100) + '%';
});

const projModelBreakdown = computed(() => {
  const map = {};
  for (const day of projActivityResults.value || []) {
    for (const [model, stats] of Object.entries(day.breakdown?.models || {})) {
      if (!map[model]) map[model] = { model, spend: 0, total_tokens: 0, api_requests: 0, successful_requests: 0 };
      map[model].spend += Number(stats.spend || 0);
      map[model].total_tokens += Number(stats.total_tokens || 0);
      map[model].api_requests += Number(stats.api_requests || 0);
      map[model].successful_requests += Number(stats.successful_requests || 0);
    }
  }
  return Object.values(map).sort((a, b) => b.spend - a.spend);
});

const openProjectActivity = (row) => {
  projActivityProject.id = row.id;
  projActivityProject.name = row.name;
  projActivityMetadata.value = null;
  projActivityResults.value = [];
  projActivityVisible.value = true;
  fetchProjectActivity();
};

const fetchProjectActivity = async () => {
  if (!projActivityProject.id) return;
  projActivityLoading.value = true;
  projActivityMetadata.value = null;
  projActivityResults.value = [];
  try {
    const [start, end] = projActivityDateRange.value || [];
    const res = await api.get(`/llm/admin/projects/${projActivityProject.id}/activity`, {
      params: { start_date: start, end_date: end }
    });
    const data = res.data.data || {};
    projActivityMetadata.value = data.metadata || null;
    projActivityResults.value = data.results || [];
  } catch (e) {
    ElMessage.error('获取项目活动数据失败');
  } finally {
    projActivityLoading.value = false;
  }
};

onMounted(() => {
  fetchProjects();
  fetchServiceInfo();
});
</script>

<style scoped>
/* ===== Layout ===== */
.admin-llm-page {
  padding: 24px 28px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #f5f7fb;
  min-height: 100%;
}

/* ===== Hero ===== */
.page-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 60%, #faf5ff 100%);
  border: 1px solid #e4e7ef;
  border-radius: 14px;
  padding: 22px 28px;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
  margin-bottom: 6px;
}
.eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #3b82f6;
}
.hero-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #1e40af, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
.hero-btn { align-self: center; flex-shrink: 0; }

/* ===== Section Card ===== */
.section-card {
  background: #fff;
  border: 1px solid #e4e7ef;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f2f7;
  background: #fafbff;
}
.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
}
.section-icon svg { width: 14px; height: 14px; }
.section-icon-blue  { background: #dbeafe; color: #2563eb; }
.section-icon-violet{ background: #ede9fe; color: #7c3aed; }
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.count-badge {
  font-size: 11px;
  font-weight: 600;
  background: #ede9fe;
  color: #7c3aed;
  padding: 1px 8px;
  border-radius: 10px;
}

.collapse-arrow {
  width: 16px; height: 16px;
  color: #94a3b8;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.collapse-arrow.rotated { transform: rotate(180deg); }

/* ===== Service Info Body ===== */
.section-body {
  padding: 16px 20px 20px;
}
.url-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.url-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #f8faff;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e8eef8;
}
.url-badge-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}
.url-badge-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #94a3b8;
}
.url-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.url-badge-default { background: #3b82f6; }
.url-badge-openai  { background: #10b981; }
.url-badge-claude  { background: #d97706; }
.url-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #334155;
  flex: 1;
  word-break: break-all;
}

/* ===== Models Section ===== */
.models-section {
  margin-top: 14px;
  border: 1px solid #e8eef8;
  border-radius: 8px;
  overflow: hidden;
}
.models-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8faff;
  border-bottom: 1px solid transparent;
}
.models-header:hover { background: #f0f6ff; }
.models-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
}

/* ===== Inner Table ===== */
.inner-table { margin: 0 !important; }
.inner-table :deep(.el-table__header-wrapper th) {
  background: #f8faff !important;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.model-id-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #3b82f6;
}
.compat-tags { display: flex; gap: 5px; align-items: center; flex-wrap: nowrap; }
.compat-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
}
.compat-openai { background: rgba(16,185,129,.1); color: #059669; border: 1px solid rgba(16,185,129,.3); }
.compat-claude { background: rgba(217,119,6,.1);  color: #d97706; border: 1px solid rgba(217,119,6,.3); }

/* ===== Main Table ===== */
.main-table :deep(.el-table__header-wrapper th) {
  background: #fafbff !important;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.project-name {
  font-weight: 600;
  color: #0f172a;
}
.muted-text { color: #94a3b8; font-size: 13px; }
.model-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 7px;
  border-radius: 4px;
}
.key-masked {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #64748b;
  background: #f8faff;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e4e7ef;
}
.spend-value {
  font-weight: 600;
  color: #d97706;
  font-size: 13px;
}
.action-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.abtn {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.abtn:disabled { opacity: 0.6; cursor: not-allowed; }
.abtn-default { border: 1px solid #d1d5db; background: #fff;    color: #374151; }
.abtn-default:hover { background: #f9fafb; }
.abtn-warning { border: 1px solid #f59e0b; background: #fff;    color: #b45309; }
.abtn-warning:hover { background: #fffbeb; }
.abtn-danger  { border: 1px solid #ef4444; background: #fff;    color: #dc2626; }
.abtn-danger:hover  { background: #fef2f2; }
.abtn-activity { border: 1px solid #8b5cf6; background: #fff; color: #7c3aed; }
.abtn-activity:hover { background: #f5f3ff; }

/* ===== Activity Drawer ===== */
.activity-drawer { display: flex; flex-direction: column; gap: 20px; padding: 4px 0; }
.activity-toolbar { display: flex; align-items: center; gap: 10px; }
.act-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.act-stat-card { background: #f8faff; border: 1px solid #e4e7ef; border-radius: 8px; padding: 12px 14px; }
.act-stat-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.act-stat-val { font-size: 18px; font-weight: 700; }
.act-blue   { color: #2563eb; }
.act-violet { color: #7c3aed; }
.act-emerald{ color: #059669; }
.act-amber  { color: #d97706; }
.act-red    { color: #dc2626; }
.act-slate  { color: #475569; }
.act-section { display: flex; flex-direction: column; gap: 12px; }
.act-section-header { display: flex; align-items: center; justify-content: space-between; }
.act-section-title { font-size: 14px; font-weight: 600; color: #0f172a; }
.act-section-sub { font-size: 12px; color: #94a3b8; }
.chart-type-tabs { display: flex; gap: 4px; }
.chart-tab { padding: 4px 10px; border-radius: 5px; border: 1px solid #e4e7ef; background: #fff; font-size: 12px; color: #64748b; cursor: pointer; transition: all 0.15s; }
.chart-tab.active { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
.chart-wrap { background: #f8faff; border: 1px solid #e4e7ef; border-radius: 8px; padding: 12px 12px 4px; }
.trend-svg { width: 100%; height: 110px; display: block; }
.chart-x-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; padding: 2px 0 0; }
.model-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.model-table th { text-align: left; font-size: 11px; font-weight: 600; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #e4e7ef; background: #f8faff; }
.model-table td { padding: 8px; border-bottom: 1px solid #f0f2f7; color: #0f172a; vertical-align: middle; }
.model-table tr:last-child td { border-bottom: none; }
.num-col { text-align: right; }
.model-name { font-family: monospace; font-size: 12px; color: #8b5cf6; }
.spend-col { color: #d97706; font-weight: 600; }
.rate-badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.rate-good { background: #d1fae5; color: #059669; }
.rate-warn { background: #fef3c7; color: #d97706; }
.rate-na   { background: #f1f5f9; color: #94a3b8; }

/* ===== Form ===== */
.form-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

/* ===== Usage JSON ===== */
.usage-json {
  max-height: 420px;
  overflow: auto;
  background: #1a1e2e;
  color: #abb2bf;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.7;
  margin: 0;
}
</style>
