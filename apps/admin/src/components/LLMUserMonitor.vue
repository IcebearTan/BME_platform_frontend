<template>
  <div class="admin-llm-page selectable">

    <!-- 页面标题 -->
    <div class="page-hero">
      <div class="hero-eyebrow">
        <span class="eyebrow-dot"></span>
        <span>大模型服务 · 管理后台</span>
      </div>
      <div class="hero-body">
        <div class="hero-left">
          <h2 class="hero-title">用户用量看板</h2>
          <p class="hero-sub">查看所有用户的 API Key 数量、消耗情况，并调整配额</p>
        </div>
        <el-button class="hero-btn" @click="openConfig">
          <svg style="width:14px;height:14px;margin-right:6px;vertical-align:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          默认配额配置
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-label">用户总数</div>
          <div class="stat-val stat-val-blue">{{ pagination.total }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-label">本页总消耗</div>
          <div class="stat-val stat-val-amber">{{ pageTotalSpend }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-emerald">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-label">有活跃 Key 用户</div>
          <div class="stat-val stat-val-emerald">{{ activeKeyUsers }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-label">额度告急 ≥80%</div>
          <div class="stat-val stat-val-red">{{ warnUsers }}</div>
        </div>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title-row">
          <span class="section-icon section-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
          </span>
          <span class="section-title">用户列表</span>
        </div>
        <el-button size="small" plain @click="fetchUsers">
          <svg style="width:13px;height:13px;margin-right:4px;vertical-align:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          刷新
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" style="width:100%" class="main-table">
        <el-table-column prop="user_id" label="ID" width="70">
          <template #default="{ row }">
            <span class="uid-text">{{ row.user_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar">{{ (row.username || '?')[0].toUpperCase() }}</div>
              <div>
                <div class="user-name">{{ row.username }}</div>
                <div class="user-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Key 数" width="80" align="center">
          <template #default="{ row }">
            <span class="key-count-chip" :class="row.key_count > 0 ? 'chip-active' : 'chip-empty'">
              {{ row.key_count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="已用额度" width="120">
          <template #default="{ row }">
            <span class="spend-value">{{ formatMoney(row.spend) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="总额度" width="110">
          <template #default="{ row }">
            <span class="budget-value">{{ formatMoney(row.max_budget) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="使用率" min-width="180">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress :percentage="usagePercent(row)" :status="usageStatus(row)" :stroke-width="8" :show-text="false" style="flex:1;" />
              <span class="progress-pct" :class="progressPctClass(row)">{{ usagePercent(row) }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="budget_duration" label="周期" width="90">
          <template #default="{ row }">
            <span class="duration-tag">{{ row.budget_duration || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <button class="action-btn-detail" @click="openActivity(row)">查看趋势</button>
            <button class="action-btn-quota" @click="openQuota(row)">调整额度</button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-if="pagination.total > pagination.per_page"
          layout="prev, pager, next, total"
          :total="pagination.total"
          :page-size="pagination.per_page"
          :current-page="pagination.page"
          @current-change="onPageChange" />
      </div>
    </div>

    <!-- 用户活动趋势 Drawer -->
    <el-drawer v-model="activityDrawerVisible" :title="`活动趋势 · ${activityUser.username || ''}`" size="720px" direction="rtl" destroy-on-close>
      <div class="activity-drawer">

        <!-- 日期选择 -->
        <div class="activity-toolbar">
          <el-date-picker
            v-model="activityDateRange"
            type="daterange"
            range-separator="→"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            size="small"
          />
          <el-button size="small" type="primary" :loading="activityLoading" @click="fetchActivity">查询</el-button>
        </div>

        <div v-if="activityLoading" class="activity-loading">
          <el-skeleton :rows="6" animated />
        </div>

        <template v-else-if="activityMetadata">
          <!-- 汇总指标卡 -->
          <div class="act-stat-row">
            <div class="act-stat-card">
              <div class="act-stat-label">总消耗</div>
              <div class="act-stat-val act-blue">${{ fmtNum(activityMetadata.total_spend, 4) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">总请求数</div>
              <div class="act-stat-val act-violet">{{ activityMetadata.total_api_requests ?? '—' }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">成功率</div>
              <div class="act-stat-val" :class="successRateClass">{{ successRateText }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">总 Token</div>
              <div class="act-stat-val act-emerald">{{ fmtTokens(activityMetadata.total_tokens) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">缓存命中 Token</div>
              <div class="act-stat-val act-slate">{{ fmtTokens(activityMetadata.total_cache_read_input_tokens) }}</div>
            </div>
            <div class="act-stat-card">
              <div class="act-stat-label">缓存命中率</div>
              <div class="act-stat-val" :class="cacheHitRate === '—' ? 'act-slate' : 'act-emerald'">{{ cacheHitRate }}</div>
            </div>
          </div>

          <!-- 趋势图切换 -->
          <div class="act-section">
            <div class="act-section-header">
              <span class="act-section-title">每日趋势</span>
              <div class="chart-type-tabs">
                <button :class="['chart-tab', chartMetric === 'spend' && 'active']" @click="chartMetric = 'spend'">消耗($)</button>
                <button :class="['chart-tab', chartMetric === 'requests' && 'active']" @click="chartMetric = 'requests'">请求数</button>
                <button :class="['chart-tab', chartMetric === 'tokens' && 'active']" @click="chartMetric = 'tokens'">Token</button>
              </div>
            </div>
            <div class="chart-wrap" v-if="dailyData.length > 0">
              <svg :viewBox="`0 0 600 110`" class="trend-svg" preserveAspectRatio="none">
                <path :d="currentChart.area" fill="#3b82f618" />
                <path :d="currentChart.line" fill="none" :stroke="chartColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                <circle v-for="(pt, i) in currentChart.pts" :key="i" :cx="pt.x" :cy="pt.y" r="3" :fill="chartColor" />
              </svg>
              <div class="chart-x-labels">
                <span>{{ dailyData[0]?.date }}</span>
                <span>{{ dailyData[Math.floor(dailyData.length/2)]?.date }}</span>
                <span>{{ dailyData[dailyData.length-1]?.date }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无趋势数据" :image-size="60" />
          </div>

          <!-- 模型分布 -->
          <div class="act-section" v-if="modelBreakdown.length > 0">
            <div class="act-section-header">
              <span class="act-section-title">按模型分布</span>
              <span class="act-section-sub">{{ modelBreakdown.length }} 个模型</span>
            </div>
            <table class="model-table">
              <thead>
                <tr>
                  <th>模型</th>
                  <th class="num-col">消耗($)</th>
                  <th class="num-col">Token</th>
                  <th class="num-col">请求数</th>
                  <th class="num-col">成功率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in modelBreakdown" :key="m.model">
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

        <el-empty v-else-if="!activityLoading" description="暂无活动数据" />
      </div>
    </el-drawer>

    <!-- 默认配额配置 -->
    <el-dialog v-model="configVisible" title="平台用户默认配额" width="480" class="admin-dialog">
      <el-form :model="config" label-width="120px">
        <el-form-item label="默认额度($)">
          <el-input-number v-model="config.default_max_budget" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="重置周期">
          <el-input v-model="config.budget_duration" placeholder="如 30d / 7d / 1mo" />
        </el-form-item>
        <el-form-item label="允许模型">
          <el-input v-model="config.allowed_models" placeholder="逗号分隔，留空表示全部" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingConfig" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 调整单用户额度 -->
    <el-dialog v-model="quotaVisible" title="调整用户额度" width="440" class="admin-dialog">
      <div class="quota-user-info">
        <div class="quota-avatar">{{ (quotaForm.username || '?')[0].toUpperCase() }}</div>
        <div>
          <div class="quota-username">{{ quotaForm.username }}</div>
          <div class="quota-hint">修改后立即生效</div>
        </div>
      </div>
      <el-form label-width="120px" style="margin-top:16px;">
        <el-form-item label="新额度($)">
          <el-input-number v-model="quotaForm.max_budget" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="重置周期">
          <el-input v-model="quotaForm.budget_duration" placeholder="留空保持不变" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingQuota" @click="saveQuota">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const users = ref([]);
const loading = ref(false);
const pagination = reactive({ page: 1, per_page: 20, total: 0 });

const configVisible = ref(false);
const savingConfig = ref(false);
const config = reactive({ default_max_budget: 5, budget_duration: '30d', allowed_models: '' });

const quotaVisible = ref(false);
const savingQuota = ref(false);
const quotaForm = reactive({ user_id: null, username: '', max_budget: 0, budget_duration: '' });

const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(4)}`);

const usagePercent = (row) => {
  if (!row.max_budget || row.spend === null || row.spend === undefined) return 0;
  return Math.min(100, Math.round((row.spend / row.max_budget) * 100));
};
const usageStatus = (row) => {
  const p = usagePercent(row);
  if (p >= 100) return 'exception';
  if (p >= 80) return 'warning';
  return 'success';
};
const progressPctClass = (row) => {
  const p = usagePercent(row);
  if (p >= 100) return 'pct-red';
  if (p >= 80) return 'pct-amber';
  return 'pct-green';
};

const pageTotalSpend = computed(() => {
  const sum = users.value.reduce((acc, u) => acc + (Number(u.spend) || 0), 0);
  return `$${sum.toFixed(4)}`;
});
const activeKeyUsers = computed(() => users.value.filter(u => u.key_count > 0).length);
const warnUsers = computed(() => users.value.filter(u => usagePercent(u) >= 80).length);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get('/llm/admin/users', { params: { page: pagination.page, per_page: pagination.per_page } });
    const data = res.data.data;
    users.value = data.users || [];
    Object.assign(pagination, data.pagination);
  } catch (e) {
    ElMessage.error('获取用户用量失败');
  } finally {
    loading.value = false;
  }
};

const onPageChange = (p) => { pagination.page = p; fetchUsers(); };

const openConfig = async () => {
  try {
    const res = await api.get('/llm/admin/quota-config');
    Object.assign(config, res.data.data);
    config.allowed_models = config.allowed_models || '';
    configVisible.value = true;
  } catch (e) {
    ElMessage.error('获取配额配置失败');
  }
};

const saveConfig = async () => {
  savingConfig.value = true;
  try {
    await api.put('/llm/admin/quota-config', { ...config });
    ElMessage.success('已保存');
    configVisible.value = false;
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败');
  } finally {
    savingConfig.value = false;
  }
};

const openQuota = (row) => {
  quotaForm.user_id = row.user_id;
  quotaForm.username = row.username;
  quotaForm.max_budget = row.max_budget || 0;
  quotaForm.budget_duration = '';
  quotaVisible.value = true;
};

const saveQuota = async () => {
  savingQuota.value = true;
  try {
    const payload = { max_budget: quotaForm.max_budget };
    if (quotaForm.budget_duration) payload.budget_duration = quotaForm.budget_duration;
    await api.put(`/llm/admin/users/${quotaForm.user_id}/quota`, payload);
    ElMessage.success('额度已更新');
    quotaVisible.value = false;
    fetchUsers();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '更新失败');
  } finally {
    savingQuota.value = false;
  }
};

// ==================== 活动趋势 Drawer ====================

const activityDrawerVisible = ref(false);
const activityUser = reactive({ user_id: null, username: '' });
const activityLoading = ref(false);
const activityMetadata = ref(null);
const activityResults = ref([]);
const chartMetric = ref('spend');

const today = new Date();
const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 29);
const fmt = (d) => d.toISOString().slice(0, 10);
const activityDateRange = ref([fmt(thirtyDaysAgo), fmt(today)]);

const dateShortcuts = [
  { text: '最近7天', value: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate()-6); return [s, e]; } },
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

const dailyData = computed(() =>
  (activityResults.value || []).slice().sort((a, b) => a.date > b.date ? 1 : -1)
);

const successRateText = computed(() => {
  const m = activityMetadata.value;
  if (!m || !m.total_api_requests) return '—';
  return Math.round((m.total_successful_requests / m.total_api_requests) * 100) + '%';
});
const successRateClass = computed(() => {
  const m = activityMetadata.value;
  if (!m || !m.total_api_requests) return 'act-slate';
  const r = m.total_successful_requests / m.total_api_requests;
  return r >= 0.95 ? 'act-emerald' : r >= 0.8 ? 'act-amber' : 'act-red';
});

const cacheHitRate = computed(() => {
  const m = activityMetadata.value;
  if (!m) return '—';
  const cacheRead = m.total_cache_read_input_tokens || 0;
  const prompt = m.total_prompt_tokens || 0;
  const total = cacheRead + prompt;
  if (!total) return '—';
  return Math.round(cacheRead / total * 100) + '%';
});

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

const chartColor = computed(() => ({ spend: '#3b82f6', requests: '#8b5cf6', tokens: '#10b981' }[chartMetric.value]));

const currentChart = computed(() => {
  const key = { spend: 'spend', requests: 'api_requests', tokens: 'total_tokens' }[chartMetric.value];
  const vals = dailyData.value.map(d => Number(d.metrics?.[key] || 0));
  return buildChart(vals);
});

const modelBreakdown = computed(() => {
  const map = {};
  for (const day of activityResults.value || []) {
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

const openActivity = (row) => {
  activityUser.user_id = row.user_id;
  activityUser.username = row.username;
  activityMetadata.value = null;
  activityResults.value = [];
  activityDrawerVisible.value = true;
  fetchActivity();
};

const fetchActivity = async () => {
  if (!activityUser.user_id) return;
  activityLoading.value = true;
  activityMetadata.value = null;
  activityResults.value = [];
  try {
    const [start, end] = activityDateRange.value || [];
    const res = await api.get(`/llm/admin/users/${activityUser.user_id}/activity`, {
      params: { start_date: start, end_date: end }
    });
    const data = res.data.data || {};
    activityMetadata.value = data.metadata || null;
    activityResults.value = data.results || [];
  } catch (e) {
    ElMessage.error('获取活动数据失败');
  } finally {
    activityLoading.value = false;
  }
};

onMounted(fetchUsers);
</script>

<style scoped>
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
  margin-bottom: 10px;
}
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }
.hero-body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
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
.hero-sub { font-size: 13px; color: #64748b; margin: 0; }
.hero-btn { flex-shrink: 0; }

/* ===== Stat Row ===== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e4e7ef;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.stat-icon {
  width: 38px; height: 38px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon svg { width: 17px; height: 17px; }
.stat-icon-blue   { background: #dbeafe; color: #2563eb; }
.stat-icon-amber  { background: #fef3c7; color: #d97706; }
.stat-icon-emerald{ background: #d1fae5; color: #059669; }
.stat-icon-red    { background: #fee2e2; color: #dc2626; }
.stat-label { font-size: 12px; color: #64748b; margin-bottom: 3px; }
.stat-val { font-size: 20px; font-weight: 700; }
.stat-val-blue   { color: #2563eb; }
.stat-val-amber  { color: #d97706; }
.stat-val-emerald{ color: #059669; }
.stat-val-red    { color: #dc2626; }

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
.section-title-row { display: flex; align-items: center; gap: 8px; }
.section-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
}
.section-icon svg { width: 14px; height: 14px; }
.section-icon-blue { background: #dbeafe; color: #2563eb; }
.section-title { font-size: 14px; font-weight: 600; color: #0f172a; }

/* ===== Main Table ===== */
.main-table :deep(.el-table__header-wrapper th) {
  background: #fafbff !important;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.uid-text { font-size: 12px; color: #94a3b8; font-family: monospace; }
.user-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #7c3aed);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.user-email { font-size: 11px; color: #94a3b8; }
.key-count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
}
.chip-active { background: #dbeafe; color: #1d4ed8; }
.chip-empty  { background: #f1f5f9; color: #94a3b8; }

.action-btn-quota,
.action-btn-detail {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.action-btn-detail {
  border: 1px solid #8b5cf6;
  background: #fff;
  color: #7c3aed;
  margin-right: 6px;
}
.action-btn-detail:hover { background: #f5f3ff; }
.action-btn-quota {
  border: 1px solid #3b82f6;
  background: #fff;
  color: #2563eb;
}
.action-btn-quota:hover { background: #eff6ff; }

/* ===== Activity Drawer ===== */
.activity-drawer { display: flex; flex-direction: column; gap: 20px; padding: 4px 0; }
.activity-toolbar { display: flex; align-items: center; gap: 10px; }
.activity-loading { padding: 20px 0; }

.act-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.act-stat-card {
  background: #f8faff;
  border: 1px solid #e4e7ef;
  border-radius: 8px;
  padding: 12px 14px;
}
.act-stat-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.act-stat-val { font-size: 18px; font-weight: 700; }
.act-blue   { color: #2563eb; }
.act-violet { color: #7c3aed; }
.act-emerald{ color: #059669; }
.act-amber  { color: #d97706; }
.act-red    { color: #dc2626; }
.act-slate  { color: #475569; }

.act-section { display: flex; flex-direction: column; gap: 12px; }
.act-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.act-section-title { font-size: 14px; font-weight: 600; color: #0f172a; }
.act-section-sub { font-size: 12px; color: #94a3b8; }

.chart-type-tabs { display: flex; gap: 4px; }
.chart-tab {
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid #e4e7ef;
  background: #fff;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.chart-tab.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

.chart-wrap {
  background: #f8faff;
  border: 1px solid #e4e7ef;
  border-radius: 8px;
  padding: 12px 12px 4px;
}
.trend-svg { width: 100%; height: 110px; display: block; }
.chart-x-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
  padding: 2px 0 0;
}

.model-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.model-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  padding: 6px 8px;
  border-bottom: 1px solid #e4e7ef;
  background: #f8faff;
}
.model-table td {
  padding: 8px 8px;
  border-bottom: 1px solid #f0f2f7;
  color: #0f172a;
  vertical-align: middle;
}
.model-table tr:last-child td { border-bottom: none; }
.num-col { text-align: right; }
.model-name { font-family: monospace; font-size: 12px; color: #3b82f6; }
.spend-col { color: #d97706; font-weight: 600; }
.rate-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.rate-good { background: #d1fae5; color: #059669; }
.rate-warn { background: #fef3c7; color: #d97706; }
.rate-na   { background: #f1f5f9; color: #94a3b8; }

.spend-value { font-weight: 600; color: #d97706; font-size: 13px; }
.budget-value { font-size: 13px; color: #2563eb; font-weight: 600; }
.progress-cell { display: flex; align-items: center; gap: 8px; }
.progress-pct { font-size: 12px; font-weight: 600; width: 38px; text-align: right; flex-shrink: 0; }
.pct-green { color: #059669; }
.pct-amber { color: #d97706; }
.pct-red   { color: #dc2626; }
.duration-tag {
  font-size: 12px;
  background: #f0f6ff;
  color: #3b82f6;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 500;
}

.table-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f2f7;
}

/* ===== Quota Dialog ===== */
.quota-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8faff;
  border-radius: 8px;
  border: 1px solid #e4e7ef;
}
.quota-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #7c3aed);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.quota-username { font-size: 14px; font-weight: 600; color: #0f172a; }
.quota-hint { font-size: 12px; color: #94a3b8; margin-top: 2px; }
</style>
