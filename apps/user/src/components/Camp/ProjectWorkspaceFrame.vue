<template>
  <div class="project-workspace pws-frame">
    <header class="pws-header">
      <div class="pws-title">
        <DewButton v-if="showBack" type="ghost" size="sm" @click="$emit('back')">
          <el-icon><ArrowLeft /></el-icon>{{ backLabel }}
        </DewButton>
        <h1>{{ title }}</h1>
        <DewTag v-if="statusLabel" size="sm">{{ statusLabel }}</DewTag>
      </div>
      <div class="pws-top-controls">
        <span v-if="subtitle">{{ subtitle }}</span>
        <slot name="header-actions" />
        <label v-if="perspectives.length > 1">
          当前视角
          <DewSelect :model-value="perspective" :options="perspectives" size="sm"
            @update:model-value="value => $emit('perspective-change', value)" />
        </label>
      </div>
    </header>

    <div class="pws-layout">
      <aside class="pws-sidebar">
        <div class="pws-mobile">
          <span>工作区导航</span>
          <DewButton size="sm" type="ghost" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            {{ menuOpen ? '收起菜单' : '展开菜单' }}
          </DewButton>
        </div>
        <template v-if="scopeOptions.length">
          <label class="pws-scope-label">{{ scopeLabel }}</label>
          <DewSelect :model-value="scopeValue" :options="scopeOptions" size="sm"
            class="pws-scope" :disabled="loading" @update:model-value="changeScope" />
        </template>
        <nav :class="['pws-nav', { 'is-open': menuOpen }]" :aria-label="navLabel">
          <template v-for="(item, index) in tabs" :key="item.key">
            <div v-if="groupOf(item) && groupOf(item) !== groupOf(tabs[index - 1])" class="pws-nav-group">
              {{ groupOf(item) }}
            </div>
            <button type="button" :aria-current="activeTab === item.key ? 'page' : undefined"
              @click="navigate(item.key)">
              <el-icon><component :is="icons[item.icon] || Grid" /></el-icon>
              <span>{{ item.label }}</span>
            </button>
          </template>
        </nav>
        <p v-if="identity" class="pws-identity">{{ identity }}</p>
        <slot name="sidebar-footer" />
      </aside>

      <main class="pws-main" :aria-busy="loading">
        <div v-if="breadcrumb" class="pws-breadcrumb">{{ breadcrumb }}</div>
        <div v-if="sectionTitle || status === 'archived'" class="pws-page-heading">
          <div>
            <h2 v-if="sectionTitle">{{ sectionTitle }}</h2>
            <p v-if="sectionSubtitle">{{ sectionSubtitle }}</p>
          </div>
          <DewTag v-if="status === 'archived'" size="sm">已结营 · 只读</DewTag>
        </div>
        <slot name="notice" />
        <div v-if="loading" class="pws-loading" role="status" aria-label="正在加载工作区">
          <DewSkeleton variant="rect" width="100%" height="220" />
        </div>
        <div v-else-if="error" role="alert" class="pws-error">
          <p>{{ error }}</p>
          <DewButton size="sm" @click="$emit('retry')">重试</DewButton>
        </div>
        <div v-else class="pws-page"><slot /></div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  ArrowLeft, House, DocumentChecked, ChatDotRound, User, Collection, Grid,
  Bell, Present, Calendar, DataLine, Edit, Setting, Clock, Link, FolderOpened,
  Files, Tickets, View, InfoFilled, Promotion,
} from '@element-plus/icons-vue'
import { DewButton, DewSelect, DewTag, DewSkeleton } from '@bme/dew-ui'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  statusLabel: { type: String, default: '' },
  status: { type: String, default: '' },
  backLabel: { type: String, default: '营期中心' },
  showBack: { type: Boolean, default: true },
  scopeValue: { type: [String, Number], default: '' },
  scopeOptions: { type: Array, default: () => [] },
  scopeLabel: { type: String, default: '工作范围' },
  tabs: { type: Array, default: () => [] },
  activeTab: { type: String, default: '' },
  navLabel: { type: String, default: '项目营功能' },
  identity: { type: String, default: '' },
  breadcrumb: { type: String, default: '' },
  sectionTitle: { type: String, default: '' },
  sectionSubtitle: { type: String, default: '' },
  loading: Boolean,
  error: { type: String, default: '' },
  perspectives: { type: Array, default: () => [] },
  perspective: { type: String, default: '' },
})
const emit = defineEmits(['back', 'navigate', 'scope-change', 'perspective-change', 'retry'])
const menuOpen = ref(false)
const icons = {
  House, DocumentChecked, ChatDotRound, User, Collection, Grid, Bell, Present,
  Calendar, DataLine, Edit, Setting, Clock, Link, FolderOpened, Files, Tickets,
  View, InfoFilled, Promotion,
}

function groupOf(item) { return item?.group || (item?.camp ? '营期事务' : '') }
function navigate(key) { menuOpen.value = false; emit('navigate', key) }
function changeScope(value) { menuOpen.value = false; emit('scope-change', value) }
watch(() => [props.activeTab, props.scopeValue], () => { menuOpen.value = false })
</script>

<style scoped>
.project-workspace {
  --pws-line: var(--dew-card-flat-border);
  color: var(--dew-text);
  background: var(--dew-card-flat-bg);
  border: 1px solid var(--pws-line);
  border-radius: 12px;
  overflow: clip;
  min-width: 0;
}
.pws-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--pws-line); flex-wrap: wrap; }
.pws-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-width: 0; }
.pws-title h1 { margin: 0; font-size: 20px; color: var(--dew-text-heading); overflow-wrap: anywhere; }
.pws-top-controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--dew-text-muted); }
.pws-top-controls label { display: flex; align-items: center; gap: 8px; }
.pws-top-controls label :deep(.dew-select) { width: 140px; }
.pws-layout { display: grid; grid-template-columns: 218px minmax(0, 1fr); min-height: 600px; }
.pws-sidebar { padding: 20px 12px; border-right: 1px solid var(--pws-line); background: var(--dew-card-flat-bg-hover); min-width: 0; }
.pws-scope-label { display: block; padding: 0 8px; margin-bottom: 8px; font-size: 12px; color: var(--dew-text-muted); }
.pws-scope { width: 100%; }
.pws-nav { display: flex; flex-direction: column; gap: 4px; margin-top: 22px; }
.pws-nav button { display: flex; align-items: center; gap: 10px; padding: 12px; border: 0; border-radius: 8px; background: transparent; color: var(--dew-text); font: inherit; text-align: left; cursor: pointer; }
.pws-nav button .el-icon { flex-shrink: 0; }
.pws-nav button:hover, .pws-nav button[aria-current=page] { background: var(--color-primary-light); color: var(--color-primary); }
.pws-nav button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.pws-nav-group { color: var(--dew-text-muted); border-top: 1px solid var(--pws-line); padding: 14px 10px 4px; margin-top: 12px; font-size: 12px; }
.pws-nav-group:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.pws-identity { font-size: 12px; color: var(--dew-text-muted); padding: 18px 10px; }
.pws-main { min-width: 0; padding: 24px; }
.pws-breadcrumb { color: var(--dew-text-muted); font-size: 12px; overflow-wrap: anywhere; margin-bottom: 14px; }
.pws-page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; }
.pws-page-heading h2 { margin: 0; font-size: 21px; color: var(--dew-text-heading); }
.pws-page-heading p { color: var(--dew-text-muted); font-size: 12px; }
.pws-page { min-width: 0; }
.pws-page :deep(.sec-title:first-child) { margin-top: 0; }
.pws-page :deep(.sec-card) { border: 0; box-shadow: none; background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }
/* 玻璃特效层一并关闭：仅清透背景会残留折射光晕与高光线，整片右栏像蒙了一层渲染错误（10-21 修） */
.pws-page :deep(.sec-card > .dew-card__refraction),
.pws-page :deep(.sec-card > .dew-card__chromatic),
.pws-page :deep(.sec-card > .dew-card__highlight),
.pws-page :deep(.sec-card > .dew-card__tint) { display: none; }
.pws-page :deep(.sec-card > .dew-card__body) { padding: 0; }
.pws-main :deep(.pws-notice), .pws-main :deep(.pws-muted) { color: var(--dew-text-muted); font-size: 13px; line-height: 1.7; }
.pws-main :deep(.pws-notice) { margin-bottom: 20px; }
.pws-mobile { display: none; }
@media (max-width: 760px) {
  .pws-layout { grid-template-columns: 180px minmax(0, 1fr); }
  .pws-main { padding: 18px; }
}
@media (max-width: 540px) {
  .pws-layout { display: block; }
  .pws-sidebar { border-right: 0; border-bottom: 1px solid var(--pws-line); padding: 12px; }
  .pws-mobile { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .pws-nav { display: none; }
  .pws-nav.is-open { display: flex; }
  .pws-scope-label, .pws-identity { display: none; }
  .pws-header { padding: 14px; }
  .pws-title h1 { font-size: 18px; }
  .pws-main { padding: 18px 14px; }
}
</style>
