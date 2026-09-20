<script setup>
/**
 * 导入报告面板（方案 §7.2/§8.2）：展示服务端导入/清洗计数与警告。
 * 有失败图片时醒目提示（发布会被服务端阻止）。
 */
import { computed } from 'vue'
import { WarningFilled, CircleCheck } from '@element-plus/icons-vue'

const props = defineProps({
  report: { type: Object, default: null },
})

const SOURCE_TEXT = { xiumi: '秀米', wechat: '微信公众号', web: '网页', unknown: '未知来源', save: '保存清洗' }

const sourceText = computed(() => SOURCE_TEXT[props.report?.source] || props.report?.source || '-')
const hasFailure = computed(() => (props.report?.images_failed || 0) > 0)

const rows = computed(() => {
  const r = props.report
  if (!r) return []
  return [
    { label: '节点数', value: r.node_count ?? 0 },
    { label: '发现图片', value: r.images_found ?? 0 },
    { label: '转存成功', value: r.images_imported ?? 0 },
    { label: '转存失败', value: r.images_failed ?? 0, danger: (r.images_failed || 0) > 0 },
    { label: '移除内容块', value: r.removed_tags ?? 0 },
    { label: '移除属性', value: r.removed_attributes ?? 0 },
    { label: '清理样式', value: r.removed_styles ?? 0 },
  ]
})
</script>

<template>
  <div class="hir">
    <template v-if="report">
      <div class="hir-head" :class="{ 'is-warn': hasFailure }">
        <el-icon :color="hasFailure ? '#f56c6c' : 'var(--el-color-success)'">
          <WarningFilled v-if="hasFailure" />
          <CircleCheck v-else />
        </el-icon>
        <span>{{ hasFailure ? '导入完成，有需要处理的问题' : '导入完成' }}</span>
        <span class="hir-source">来源：{{ sourceText }}</span>
      </div>
      <dl class="hir-grid">
        <template v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd :class="{ 'is-danger': row.danger }">{{ row.value }}</dd>
        </template>
      </dl>
      <ul v-if="report.warnings?.length" class="hir-warnings">
        <li v-for="(w, i) in report.warnings" :key="i">{{ w.message }}</li>
      </ul>
      <p class="hir-tip">可直接从秀米或公众号复制排版内容粘贴；不支持的脚本/表单/背景图会被自动清理。</p>
    </template>
    <template v-else>
      <p class="hir-empty">尚无导入报告。<br>粘贴富文本后这里会显示兼容性结果。</p>
      <p class="hir-tip">可直接从秀米或公众号复制排版内容粘贴到右侧编辑器。</p>
    </template>
  </div>
</template>

<style scoped>
.hir { font-size: 13px; color: var(--text-secondary, #606266); }
.hir-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  margin-bottom: 10px;
}
.hir-head.is-warn { color: #f56c6c; }
.hir-source { margin-left: auto; font-weight: 400; font-size: 12px; color: var(--text-secondary, #909399); }
.hir-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  margin: 0 0 10px;
}
.hir-grid dt { color: var(--text-secondary, #909399); }
.hir-grid dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #303133);
  text-align: right;
}
.hir-grid dd.is-danger { color: #f56c6c; font-weight: 700; }
.hir-warnings {
  margin: 0 0 10px;
  padding: 8px 10px;
  list-style: none;
  background: var(--el-color-danger-light-9, #fef0f0);
  border-radius: 6px;
  color: #c45656;
  line-height: 1.6;
}
.hir-tip, .hir-empty { line-height: 1.7; }
.hir-empty { margin: 0 0 8px; color: var(--text-secondary, #909399); }
.hir-tip { margin: 0; font-size: 12px; color: var(--text-faint, #a8abb2); }
</style>
