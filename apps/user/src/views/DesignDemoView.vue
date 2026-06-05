<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const isDark = computed(() => store.getters.isDarkMode)
const toggleTheme = () => store.commit('toggleTheme')

const stats = ref([
  { label: '在线课程', value: '128', trend: '+12' },
  { label: '学习时长', value: '86h', trend: '+5.2h' },
  { label: '已完成', value: '47', trend: '+3' },
  { label: '学习排名', value: 'Top 8%', trend: '↑3' },
])

const courses = ref([
  { title: '生物医学信号处理', tag: '核心', type: 'core', progress: 72, students: 156 },
  { title: '医学影像技术基础', tag: '选修', type: 'elective', progress: 45, students: 98 },
  { title: '生物材料学导论', tag: '核心', type: 'core', progress: 90, students: 203 },
  { title: '医疗仪器原理', tag: '实验', type: 'lab', progress: 30, students: 67 },
])

const schedule = ref([
  { time: '08:30', name: '生物医学信号处理', room: 'BME-301', status: 'ongoing' },
  { time: '10:15', name: '医学影像技术基础', room: 'Lab-205', status: 'upcoming' },
  { time: '14:00', name: '生物材料学实验', room: 'Lab-102', status: 'later' },
  { time: '16:30', name: '学术研讨会', room: 'Aud-A', status: 'later' },
])

const quickActions = ref([
  { label: '作业提交', char: '作', type: 'blue' },
  { label: '成绩查询', char: '绩', type: 'green' },
  { label: '实验预约', char: '验', type: 'purple' },
  { label: '图书馆', char: '书', type: 'amber' },
  { label: '3D 打印', char: '3D', type: 'red' },
  { label: '讨论区', char: '论', type: 'cyan' },
])
</script>

<template>
  <div class="demo-page" :class="isDark ? 'theme-dark' : 'theme-light'">
    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="header-left">
          <div class="logo">
            <div class="logo-mark">B</div>
            <span class="logo-name">BME Academy</span>
          </div>
          <nav class="nav">
            <a class="nav-link is-active">首页</a>
            <a class="nav-link">学习中心</a>
            <a class="nav-link">社区</a>
            <a class="nav-link">题库</a>
          </nav>
        </div>
        <div class="header-actions">
          <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
            <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <div class="user-avatar">李</div>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <!-- Welcome -->
      <section class="welcome">
        <div class="welcome-body">
          <h1 class="welcome-title">早上好，李小明</h1>
          <p class="welcome-desc">今天有 4 节课 · 2 项待交作业 · 1 场考试</p>
        </div>
        <div class="welcome-side">
          <span class="welcome-weekday">周三</span>
          <span class="welcome-date">5月28日</span>
        </div>
      </section>

      <!-- Metrics -->
      <section class="metrics">
        <div v-for="(s, i) in stats" :key="s.label" class="metric" :class="{ 'has-border': i > 0 }">
          <span class="metric-label">{{ s.label }}</span>
          <div class="metric-row">
            <span class="metric-value">{{ s.value }}</span>
            <span class="metric-trend">{{ s.trend }}</span>
          </div>
        </div>
      </section>

      <!-- Content -->
      <div class="content">
        <!-- Courses -->
        <section class="panel">
          <div class="panel-head">
            <h2>我的课程</h2>
            <a class="panel-link">查看全部</a>
          </div>
          <div class="course-list">
            <div v-for="c in courses" :key="c.title" class="course-item">
              <span class="course-tag" :class="'tag-' + c.type">{{ c.tag }}</span>
              <div class="course-body">
                <h3>{{ c.title }}</h3>
                <div class="course-progress">
                  <div class="progress-track">
                    <div class="progress-fill" :class="'fill-' + c.type"
                      :style="{ width: c.progress + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ c.progress }}%</span>
                </div>
                <span class="course-meta">{{ c.students }} 人在学</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Schedule -->
        <section class="panel">
          <div class="panel-head">
            <h2>今日日程</h2>
            <a class="panel-link">完整日历</a>
          </div>
          <div class="schedule-list">
            <div v-for="s in schedule" :key="s.time" class="schedule-item" :class="'is-' + s.status">
              <span class="schedule-time">{{ s.time }}</span>
              <div class="schedule-body">
                <h4>{{ s.name }}</h4>
                <span class="schedule-room">{{ s.room }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Quick Actions -->
      <section class="panel">
        <div class="panel-head">
          <h2>快捷入口</h2>
        </div>
        <div class="quick-grid">
          <a v-for="q in quickActions" :key="q.label" class="quick-item">
            <div class="quick-icon" :class="'icon-' + q.type">{{ q.char }}</div>
            <span class="quick-label">{{ q.label }}</span>
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:color';
@use '../styles/variables' as *;

// ── Page ──

.demo-page {
  min-height: 100vh;
  background: $light-bg;
  color: $light-title;
  transition: background $dur-base, color $dur-base;

  &.theme-dark {
    background: $dark-bg;
    color: $dark-title;
  }
}

// ── Header ──

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: $header-h;
  background: $light-surface;
  border-bottom: 1px solid $light-rule;
  transition: background $dur-base, border-color $dur-base;

  .theme-dark & {
    background: $dark-surface;
    border-bottom-color: $dark-rule;
  }
}

.header-inner {
  max-width: $content-w;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $sp-6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $sp-10;
}

.logo {
  display: flex;
  align-items: center;
  gap: $sp-2;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: $r-md;
  background: $brand;
  color: white;
  font-size: $text-lg;
  font-weight: $weight-bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-name {
  font-size: $text-lg;
  font-weight: $weight-semibold;

  .theme-dark & { color: $dark-title; }
}

.nav {
  display: flex;
  gap: $sp-1;

  @include respond-to(md) { display: none; }
}

.nav-link {
  padding: $sp-2 $sp-3;
  border-radius: $r-sm;
  font-size: $text-sm;
  font-weight: $weight-medium;
  color: $light-caption;
  cursor: pointer;
  transition: all $dur-fast $ease;

  &:hover {
    color: $light-title;
    background: $light-hover;
  }

  &.is-active {
    color: $brand;
    background: rgba($brand, 0.06);
  }

  .theme-dark & {
    color: $dark-caption;

    &:hover {
      color: $dark-title;
      background: $dark-hover;
    }

    &.is-active {
      color: color.adjust($brand, $lightness: 8%);
      background: rgba($brand, 0.12);
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $sp-3;
}

.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid $light-rule;
  background: transparent;
  color: $light-caption;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $dur-fast $ease;

  .theme-dark & {
    border-color: $dark-rule-strong;
    color: $dark-caption;
  }

  &:hover {
    border-color: $brand;
    color: $brand;
  }

  svg { display: block; }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $brand;
  color: white;
  font-size: $text-sm;
  font-weight: $weight-semibold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow $dur-fast $ease;

  &:hover {
    box-shadow: 0 0 0 3px rgba($brand, 0.2);
  }
}

// ── Main ──

.main {
  max-width: $content-w;
  margin: 0 auto;
  padding: $sp-6;
  display: flex;
  flex-direction: column;
  gap: $sp-6;

  @include respond-to(sm) { padding: $sp-4; gap: $sp-4; }
}

// ── Welcome ──

.welcome {
  background: $brand;
  border-radius: $r-xl;
  padding: $sp-8 $sp-10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  position: relative;
  overflow: hidden;

  .theme-dark & { background: $brand-dark; }

  &::after {
    content: '';
    position: absolute;
    right: -40px;
    top: -40px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }

  @include respond-to(sm) {
    padding: $sp-6;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
  }
}

.welcome-title {
  font-size: $text-3xl;
  font-weight: $weight-bold;
  margin-bottom: $sp-1;
  line-height: $leading-tight;

  @include respond-to(sm) { font-size: $text-2xl; }
}

.welcome-desc {
  font-size: $text-base;
  opacity: 0.8;
}

.welcome-side {
  text-align: right;
  position: relative;
  z-index: 1;

  @include respond-to(sm) { text-align: left; }
}

.welcome-weekday {
  display: block;
  font-size: $text-xl;
  font-weight: $weight-semibold;
}

.welcome-date {
  font-size: $text-sm;
  opacity: 0.7;
}

// ── Metrics ──

.metrics {
  @include card;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: $sp-5 $sp-6;

  @include respond-to(md) {
    grid-template-columns: repeat(2, 1fr);
    gap: $sp-4;

    .has-border { border-left: none; padding-left: 0; }
  }

  @include respond-to(sm) { padding: $sp-4 $sp-5; }
}

.metric {
  display: flex;
  flex-direction: column;
  gap: $sp-1;

  &.has-border {
    padding-left: $sp-6;
    border-left: 1px solid $light-rule;

    .theme-dark & { border-left-color: $dark-rule-strong; }
  }
}

.metric-label {
  font-size: $text-xs;
  color: $light-caption;

  .theme-dark & { color: $dark-caption; }
}

.metric-row {
  display: flex;
  align-items: baseline;
  gap: $sp-2;
}

.metric-value {
  font-size: $text-2xl;
  font-weight: $weight-bold;
  line-height: $leading-tight;
}

.metric-trend {
  font-size: $text-xs;
  font-weight: $weight-medium;
  color: $color-success;
  background: rgba($color-success, 0.08);
  padding: 1px 6px;
  border-radius: $r-full;

  .theme-dark & { background: rgba($color-success, 0.15); }
}

// ── Content Grid ──

.content {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: $sp-6;

  @include respond-to(lg) { grid-template-columns: 1fr; }
}

// ── Panel (shared) ──

.panel {
  @include card;
  padding: $sp-6;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $sp-5;

  h2 {
    font-size: $text-lg;
    font-weight: $weight-semibold;
  }
}

.panel-link {
  font-size: $text-sm;
  color: $brand;
  cursor: pointer;
  transition: opacity $dur-fast;

  &:hover { opacity: 0.75; }

  .theme-dark & { color: color.adjust($brand, $lightness: 10%); }
}

// ── Courses ──

.course-list {
  display: flex;
  flex-direction: column;
}

.course-item {
  display: flex;
  gap: $sp-4;
  padding: $sp-4 0;

  & + .course-item {
    border-top: 1px solid $light-rule;
    .theme-dark & { border-top-color: $dark-rule; }
  }

  &:first-child { padding-top: 0; }
  &:last-child  { padding-bottom: 0; }
}

.course-tag {
  display: inline-flex;
  align-items: center;
  font-size: $text-xs;
  font-weight: $weight-medium;
  padding: 2px 10px;
  border-radius: $r-full;
  white-space: nowrap;
  height: fit-content;
  margin-top: 2px;

  &.tag-core {
    color: #3459E6;
    background: rgba(52, 89, 230, 0.08);
    .theme-dark & { background: rgba(52, 89, 230, 0.15); }
  }

  &.tag-elective {
    color: #8B5CF6;
    background: rgba(139, 92, 246, 0.08);
    .theme-dark & { background: rgba(139, 92, 246, 0.15); }
  }

  &.tag-lab {
    color: #D97706;
    background: rgba(217, 119, 6, 0.08);
    .theme-dark & { background: rgba(217, 119, 6, 0.15); }
  }
}

.course-body {
  flex: 1;
  min-width: 0;

  h3 {
    font-size: $text-base;
    font-weight: $weight-medium;
    margin-bottom: $sp-2;
  }
}

.course-progress {
  display: flex;
  align-items: center;
  gap: $sp-2;
  margin-bottom: $sp-1;
}

.progress-track {
  flex: 1;
  height: 4px;
  border-radius: $r-full;
  background: $light-rule;
  overflow: hidden;

  .theme-dark & { background: $dark-rule-strong; }
}

.progress-fill {
  height: 100%;
  border-radius: $r-full;
  transition: width 500ms $ease;

  &.fill-core     { background: #3459E6; }
  &.fill-elective  { background: #8B5CF6; }
  &.fill-lab       { background: #D97706; }
}

.progress-pct {
  font-size: $text-xs;
  font-weight: $weight-semibold;
  color: $light-caption;
  min-width: 32px;
  text-align: right;

  .theme-dark & { color: $dark-caption; }
}

.course-meta {
  font-size: $text-xs;
  color: $light-muted;

  .theme-dark & { color: $dark-muted; }
}

// ── Schedule ──

.schedule-list {
  display: flex;
  flex-direction: column;
}

.schedule-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: $sp-3;
  padding: $sp-3 $sp-4;
  padding-left: $sp-10;
  border-radius: $r-md;
  transition: background $dur-fast $ease;

  // Timeline line
  &::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: $light-rule;
    .theme-dark & { background: $dark-rule; }
  }

  // Timeline dot
  &::after {
    content: '';
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid $light-rule;
    background: $light-surface;
    z-index: 1;
    transition: all $dur-fast $ease;

    .theme-dark & {
      border-color: $dark-rule-strong;
      background: $dark-surface;
    }
  }

  &:first-child::before { top: 50%; }
  &:last-child::before  { bottom: 50%; }

  &:only-child::before { display: none; }

  // States
  &.is-ongoing {
    background: rgba($brand, 0.04);
    .theme-dark & { background: rgba($brand, 0.08); }

    &::after {
      border-color: $brand;
      background: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    .schedule-time { color: $brand; }
    .schedule-room { color: $brand; font-weight: $weight-medium; }
  }

  &.is-upcoming::after {
    border-color: $color-success;
    background: $color-success;
  }

  &:hover {
    background: $light-hover;
    .theme-dark & { background: $dark-hover; }

    &.is-ongoing {
      background: rgba($brand, 0.07);
      .theme-dark & { background: rgba($brand, 0.12); }
    }
  }
}

.schedule-time {
  font-size: $text-sm;
  font-weight: $weight-semibold;
  font-family: $font-mono;
  color: $light-caption;
  min-width: 44px;
  transition: color $dur-fast;

  .theme-dark & { color: $dark-caption; }
}

.schedule-body {
  flex: 1;
  min-width: 0;

  h4 {
    font-size: $text-sm;
    font-weight: $weight-medium;
    @include truncate;
  }
}

.schedule-room {
  font-size: $text-xs;
  color: $light-muted;
  transition: color $dur-fast;

  .theme-dark & { color: $dark-muted; }
}

// ── Quick Actions ──

.quick-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: $sp-4;

  @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-2;
  padding: $sp-4 $sp-2;
  border-radius: $r-md;
  cursor: pointer;
  transition: all $dur-fast $ease;

  &:hover {
    background: $light-hover;
    transform: translateY(-1px);

    .theme-dark & { background: $dark-hover; }

    .quick-icon { transform: scale(1.08); }
  }
}

.quick-icon {
  width: 44px;
  height: 44px;
  border-radius: $r-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $text-lg;
  font-weight: $weight-semibold;
  background: $light-hover;
  transition: transform $dur-base $ease;

  .theme-dark & { background: $dark-hover; }

  &.icon-blue   { color: #3459E6; }
  &.icon-green  { color: #10B981; }
  &.icon-purple { color: #8B5CF6; }
  &.icon-amber  { color: #D97706; }
  &.icon-red    { color: #EF4444; }
  &.icon-cyan   { color: #06B6D4; }
}

.quick-label {
  font-size: $text-sm;
  color: $light-caption;
  transition: color $dur-fast;

  .theme-dark & { color: $dark-caption; }

  .quick-item:hover & {
    color: $light-title;
    .theme-dark & { color: $dark-title; }
  }
}
</style>
