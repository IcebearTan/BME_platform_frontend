<script setup>
// 课时内容区（方案 §4.3/§5.5）：视频（16:9，可突破文字行宽）→ 附件/外链 → 富文本正文。
// 正文复用共享 .rich-text 样式（@bme/styles/article-content.css，全局已引入），
// 此处只补课程场景约束：宽表格横向滚动、嵌入媒体不溢出、文字行宽 760-820px。
import { computed } from 'vue'
import { ArrowRight, Document, Link as LinkIcon } from '@element-plus/icons-vue'
import { DewButton } from '@bme/dew-ui'
import { resolveMediaUrl } from '../../../composables/useCourseLearningData'

const props = defineProps({
  lesson: { type: Object, required: true }
})

// 视频课：resource_url 即视频源
const videoSrc = computed(() =>
  props.lesson.type === 'video' && props.lesson.resourceUrl
    ? resolveMediaUrl(props.lesson.resourceUrl)
    : ''
)

// 非视频课带 resource_url：按「本课附件」行展示（新窗口打开/下载）
const attachment = computed(() => {
  if (props.lesson.type === 'video' || !props.lesson.resourceUrl) return null
  const url = resolveMediaUrl(props.lesson.resourceUrl)
  const name = props.lesson.resourceUrl.split('/').pop() || '附件'
  return { url, name }
})

// 外链课：content 存外链 URL，用统一资源容器呈现
const linkUrl = computed(() =>
  props.lesson.type === 'link' && /^https?:\/\//i.test(props.lesson.content || '')
    ? props.lesson.content
    : ''
)

// 富文本正文（外链课的 content 是 URL，不作正文渲染）
const bodyHtml = computed(() =>
  props.lesson.type === 'link' ? '' : (props.lesson.content || '')
)
</script>

<template>
  <div class="lesson-content">
    <div v-if="videoSrc" class="video-frame">
      <video :src="videoSrc" controls preload="metadata">您的浏览器不支持视频播放</video>
    </div>

    <a v-if="linkUrl" class="link-card" :href="linkUrl" target="_blank" rel="noopener">
      <el-icon class="link-card-icon"><LinkIcon /></el-icon>
      <span class="link-card-url">{{ linkUrl }}</span>
      <DewButton size="sm">打开链接</DewButton>
    </a>

    <a v-else-if="attachment" class="attachment-row" :href="attachment.url" target="_blank" rel="noopener">
      <el-icon class="attachment-icon"><Document /></el-icon>
      <span class="attachment-name">本课附件 · {{ attachment.name }}</span>
      <el-icon class="attachment-arrow"><ArrowRight /></el-icon>
    </a>

    <!-- 正文行宽收窄，视频/宽表等重媒体不受限（见样式） -->
    <div v-if="bodyHtml" class="rich-text lesson-body" v-html="bodyHtml"></div>
  </div>
</template>

<style scoped>
.lesson-content {
  padding: 28px 48px 8px;
}

/* ── 视频：16:9，占满纸张宽度（可宽于文字行宽） ── */
.video-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  margin-bottom: 24px;
}
.video-frame video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* ── 外链：统一资源容器 ── */
.link-card {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 800px;
  margin: 4px 0 24px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  text-decoration: none;
  transition: background 0.15s ease;
}
.link-card:hover { background: var(--dew-card-inset-bg-hover); }

.link-card-icon {
  font-size: 18px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.link-card-url {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--dew-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 附件行 ── */
.attachment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 800px;
  margin: 4px 0 24px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  text-decoration: none;
  color: var(--dew-text);
  font-size: 13px;
  transition: background 0.15s ease;
}
.attachment-row:hover { background: var(--dew-card-inset-bg-hover); }

.attachment-icon { color: var(--dew-text-muted); flex-shrink: 0; }
.attachment-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attachment-arrow { color: var(--dew-text-faint); flex-shrink: 0; }

/* ── 正文：纯文字行宽 760-820px，长文阅读舒适 ── */
.lesson-body {
  max-width: 800px;
}

/* 课程场景补充约束（.rich-text 未覆盖的部分）：
   宽表格进横向滚动容器；嵌入 iframe/video 与图片一样不溢出 */
.lesson-body :deep(table) {
  display: block;
  overflow-x: auto;
  max-width: 100%;
}
.lesson-body :deep(iframe),
.lesson-body :deep(video) {
  max-width: 100%;
  border-radius: 8px;
}
</style>
