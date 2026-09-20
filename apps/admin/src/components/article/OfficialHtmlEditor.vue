<script setup>
/**
 * 官方富文本编辑器（Jodit 4 封装，方案 §9）。
 *
 * 职责边界（方案 §9.2）：Jodit 只负责 WYSIWYG 编辑/光标/基础排版/源码/撤销；
 * XSS 清洗、图片转存、权限全部在服务端（services/article_html.py）。
 *
 * 粘贴流（方案 §10.1）：capture 阶段拦截 paste——
 *   有 text/html -> 阻止默认插入 -> 调导入接口 -> 光标处插入清洗结果 -> 报报告；
 *   无 text/html -> 放行，按普通纯文本交给编辑器。
 * 未经服务端处理的 HTML 不进入编辑画布。
 *
 * 生命周期（方案 §9.4）：挂载创建、卸载 destruct、change 防抖同步、
 * 不因 articleId/正文变化重复初始化、主题首版固定浅色（与 md-editor 一致）。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Jodit } from 'jodit'
import 'jodit/es2021/jodit.min.css'   // 自托管样式（禁外网 CDN）
import { ElMessage } from 'element-plus'
import { importHtml, uploadEditorImage, detectSource } from '../../services/articleHtmlImport'

const props = defineProps({
  modelValue: { type: String, default: '' },
  articleId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue', 'report', 'importing'])

const rootEl = ref(null)
const containerEl = ref(null)
const importing = ref(false)
let editor = null
let syncTimer = null
let lastSynced = ''

// 工具栏（方案 §9.3）：基础排版 + 颜色 + 表格/链接/图片 + 源码/全屏；
// 不开放 iframe/脚本/表单/外部插件（clean-html 关闭——清洗职责在服务端）
const TOOLBAR = [
  'undo', 'redo', '|',
  'bold', 'italic', 'underline', 'strikethrough', '|',
  'brush', 'font', 'fontsize', '|',
  'paragraph', 'align', 'indent', 'outdent', '|',
  'ul', 'ol', '|',
  'link', 'image', 'table', 'hr', '|',
  'source', 'fullsize',
]

function makeEditor() {
  editor = Jodit.make(containerEl.value, {
    language: 'zh_cn',
    theme: 'default',
    height: 620,
    allowResizeY: true,
    allowResizeX: false,
    statusbar: true,
    buttons: TOOLBAR,
    disablePlugins: ['clean-html', 'ai-assistant', 'media', 'file'],
    uploader: { enable: false },          // 上传统一走导入接口/图床，不走 Jodit uploader
    askBeforePasteHTML: false,
    showCharsCounter: false,
    showWordsCounter: false,
  })
  editor.value = props.modelValue || ''
  lastSynced = props.modelValue || ''
  editor.events.on('change', () => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      const v = editor.value
      if (v !== lastSynced) {
        lastSynced = v
        emit('update:modelValue', v)
      }
    }, 300)
  })
}

// ── 粘贴拦截 ──────────────────────────────────────────────
function clipboardImageFiles(dataTransfer) {
  if (!dataTransfer) return []
  return Array.from(dataTransfer.items || [])
    .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
    .map((it) => it.getAsFile())
    .filter(Boolean)
}

async function runImport(html, files) {
  if (!props.articleId) {
    ElMessage.warning('请等待草稿创建完成后再粘贴内容')
    return
  }
  importing.value = true
  emit('importing', true)
  try {
    const { html: cleaned, report } = await importHtml(
      props.articleId, html, files, detectSource(html)
    )
    editor.s.focus()
    editor.s.insertHTML(cleaned || '')
    // 剪贴板里带独立图片文件且 HTML 内本就没有图时，把文件图补插到光标处
    if (files.length && !/<img/i.test(html) && report) {
      for (const f of files) {
        try {
          const url = await uploadEditorImage(f)
          editor.s.insertHTML(`<img src="${url}" alt="">`)
        } catch { /* 单张失败不阻塞整体导入 */ }
      }
    }
    emit('report', report || null)
  } catch (e) {
    ElMessage.error(e?.message || '导入失败，请重试或改用图片上传')
  } finally {
    importing.value = false
    emit('importing', false)
  }
}

const onPaste = (e) => {
  const html = e.clipboardData?.getData('text/html')
  if (!html) return                        // 纯文本：默认行为
  e.preventDefault()
  e.stopImmediatePropagation()
  runImport(html, clipboardImageFiles(e.clipboardData))
}

// 拖拽：网页富文本拖入走导入；图片文件走图床直传
const onDrop = (e) => {
  const html = e.dataTransfer?.getData('text/html')
  const files = clipboardImageFiles(e.dataTransfer)
  if (!html && !files.length) return
  e.preventDefault()
  e.stopImmediatePropagation()
  if (html) runImport(html, files)
  else {
    importing.value = true
    emit('importing', true)
    ;(async () => {
      for (const f of files) {
        try {
          const url = await uploadEditorImage(f)
          editor.s.focus()
          editor.s.insertHTML(`<img src="${url}" alt="">`)
        } catch (err) {
          ElMessage.error(err?.message || '图片上传失败')
        }
      }
      importing.value = false
      emit('importing', false)
    })()
  }
}
const onDragover = (e) => {
  if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.types?.includes('text/html')) {
    e.preventDefault()
  }
}

onMounted(() => {
  makeEditor()
  // 注意：Jodit 初始化后会把编辑器 DOM 插成 .ohe-canvas 的兄弟节点（源元素被旁置），
  // 监听必须挂在组件根元素上才在事件冒泡/捕获路径里
  rootEl.value.addEventListener('paste', onPaste, true)
  rootEl.value.addEventListener('drop', onDrop, true)
  rootEl.value.addEventListener('dragover', onDragover, true)
})

onBeforeUnmount(() => {
  if (syncTimer) clearTimeout(syncTimer)
  rootEl.value?.removeEventListener('paste', onPaste, true)
  rootEl.value?.removeEventListener('drop', onDrop, true)
  rootEl.value?.removeEventListener('dragover', onDragover, true)
  if (editor) {
    try { editor.destruct() } catch { /* 已销毁则忽略 */ }
    editor = null
  }
})

defineExpose({ focus: () => editor?.s?.focus() })
</script>

<template>
  <div ref="rootEl" class="ohe" :class="{ 'is-importing': importing }">
    <div ref="containerEl" class="ohe-canvas" />
    <div v-if="importing" class="ohe-mask">正在导入并清洗内容</div>
  </div>
</template>

<style scoped>
.ohe { position: relative; }
.ohe-canvas :deep(.jodit-toolbar__box) {
  border-radius: 8px 8px 0 0;
}
.ohe-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(2px);
  color: var(--text-primary, #303133);
  font-size: 14px;
  letter-spacing: 1px;
  border-radius: 8px;
}
</style>
