<template>
  <div class="dashboard-container">
    <!-- 欢迎横幅（克制极光 hero） -->
    <div class="welcome-banner">
      <div class="banner-content">
        <div class="welcome-text">
          <h1 class="welcome-title">欢迎回来，{{ userName }}</h1>
          <p class="welcome-subtitle">{{ todayLabel }} · 今日新增 {{ stats.user_new_today }} 人 · 今日打卡 {{ stats.checkin_today }} 人</p>
        </div>
        <div class="banner-meta">
          <div class="meta-value">{{ stats.pending_quota }}</div>
          <div class="meta-label">待审批配额</div>
        </div>
      </div>
    </div>

    <!-- 统计卡片（真实数据） -->
    <div class="stats-grid">
      <div class="stat-card glass-surface" v-for="stat in statCards" :key="stat.key">
        <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
          <el-icon :size="22"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stat.value }}</div>
          <div class="stat-title">{{ stat.title }}</div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 最近操作（真实审计日志） -->
      <div class="panel-card glass-surface">
        <div class="card-header">
          <h3>最近操作</h3>
          <el-icon class="header-icon"><Clock /></el-icon>
        </div>
        <div class="activity-list">
          <div v-if="recentActivities.length === 0" class="empty-tip">暂无近期操作记录</div>
          <div class="activity-item" v-for="activity in recentActivities" :key="activity.id">
            <span class="activity-dot" :class="activity.result === 'success' ? 'ok' : 'fail'"></span>
            <div class="activity-content">
              <div class="activity-title">{{ activity.username }} · {{ activity.operation }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="panel-card glass-surface">
        <div class="card-header">
          <h3>快速操作</h3>
          <el-icon class="header-icon"><Lightning /></el-icon>
        </div>
        <div class="actions-grid">
          <div
            class="action-item"
            v-for="action in quickActions"
            :key="action.title"
            @click="handleQuickAction(action.route)"
          >
            <div class="action-icon" :style="{ background: action.bg, color: action.color }">
              <el-icon><component :is="action.icon" /></el-icon>
            </div>
            <div class="action-content">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-description">{{ action.description }}</div>
            </div>
            <el-icon class="action-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api';
import {
  User, Document, Trophy, ChatLineRound, Clock, Lightning,
  ArrowRight, Edit, Reading
} from '@element-plus/icons-vue';

export default {
  name: 'DashboardComponent',
  data() {
    return {
      stats: {
        user_total: 0,
        user_new_today: 0,
        checkin_today: 0,
        article_count: 0,
        course_count: 0,
        medal_granted: 0,
        group_count: 0,
        camp_count: 0,
        pending_quota: 0,
      },
      recentActivities: [],
      quickActions: [
        { title: '发布文章', description: '撰写新的学习内容', icon: Edit, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', route: '/editor' },
        { title: '用户管理', description: '管理系统用户', icon: User, color: '#10b981', bg: 'rgba(16,185,129,0.12)', route: '/user-manage/users' },
        { title: '课程管理', description: '管理课程内容', icon: Reading, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', route: '/course/manage' },
        { title: '勋章管理', description: '设置与发放勋章', icon: Trophy, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', route: '/medal/manage' },
      ],
    };
  },
  computed: {
    userName() {
      return this.$store?.state?.user?.name || '管理员';
    },
    todayLabel() {
      const d = new Date();
      const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${week}`;
    },
    statCards() {
      const s = this.stats;
      return [
        { key: 'user',    title: '总用户数', value: s.user_total,    icon: User,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
        { key: 'checkin', title: '今日打卡', value: s.checkin_today, icon: Clock,         color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { key: 'article', title: '文章数',   value: s.article_count, icon: Document,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        { key: 'course',  title: '课程数',   value: s.course_count,  icon: Reading,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
        { key: 'medal',   title: '勋章发放', value: s.medal_granted, icon: Trophy,        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        { key: 'group',   title: '小组数',   value: s.group_count,   icon: ChatLineRound,color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
      ];
    },
  },
  methods: {
    handleQuickAction(route) {
      if (route) this.$router.push(route);
    },
    formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return '刚刚';
      if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
      return d.toLocaleDateString('zh-CN');
    },
    async fetchOverview() {
      try {
        const res = await api({ url: '/admin/overview', method: 'get' });
        if (res.data.code === 200 && res.data.data) {
          this.stats = { ...this.stats, ...res.data.data };
        }
      } catch (e) {
        /* 权限不足或未登录时静默，登录态由 HomeView 处理 */
      }
    },
    async fetchActivities() {
      try {
        const res = await api({ url: '/auth/audit_records', method: 'get', params: { page: 1, per_page: 6 } });
        if (res.data.code === 200) {
          const data = res.data.data;
          this.recentActivities = data?.records || data?.list || data || [];
        }
      } catch (e) {
        /* 静默 */
      }
    },
  },
  mounted() {
    this.fetchOverview();
    this.fetchActivities();
  },
};
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 欢迎横幅 —— 克制极光 hero */
.welcome-banner {
  border-radius: var(--radius-xl);
  padding: 28px 32px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  color: #ffffff;
  background:
    radial-gradient(ellipse 60% 90% at 8% 20%, rgba(59, 130, 246, 0.85), transparent 60%),
    radial-gradient(ellipse 70% 90% at 92% 90%, rgba(16, 185, 129, 0.7), transparent 60%),
    linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%);
  box-shadow: var(--shadow-md);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.welcome-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.welcome-subtitle {
  font-size: var(--text-base);
  opacity: 0.85;
  margin: 0;
}

.banner-meta {
  text-align: right;
}

.banner-meta .meta-value {
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1;
}

.banner-meta .meta-label {
  font-size: var(--text-sm);
  opacity: 0.8;
  margin-top: 4px;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-number {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-title {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel-card {
  border-radius: var(--radius-lg);
  padding: 22px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.card-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-icon {
  color: var(--text-tertiary);
  font-size: 18px;
}

/* 最近操作 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: var(--text-tertiary);
}

.activity-dot.ok {
  background: var(--success-color);
}

.activity-dot.fail {
  background: var(--error-color);
}

.activity-title {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.activity-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.empty-tip {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  padding: 24px 0;
}

/* 快速操作 */
.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-solid);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.action-item:hover {
  transform: translateX(4px);
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.action-description {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

.action-arrow {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.action-item:hover .action-arrow {
  color: var(--primary-color);
  transform: translateX(2px);
}

/* 响应式 */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .banner-meta {
    text-align: left;
  }

  .welcome-title {
    font-size: var(--text-2xl);
  }
}
</style>
