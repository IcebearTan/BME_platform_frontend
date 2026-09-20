<script setup>
/**
 * 官方富文本正文渲染（方案 §13.2）：Shadow DOM 渲染服务端清洗后的 HTML。
 *
 * - 样式隔离双向成立：平台全局文章 CSS 不覆盖秀米内联排版，富文本内容也不影响页面其他区域。
 * - Shadow Root 内注入最小基础样式（盒模型/图片表格响应式兜底）。
 * - 正文内 /media/... 相对地址由 resolver（assetUrl）改写为带 API 前缀的绝对地址——
 *   dev 跨源时图片才可达；仅改写 src/href 的属性值，不动结构。
 * - 服务端清洗（services/article_html.py）是安全边界，Shadow DOM 只负责样式隔离。
 * - 深色模式：官方排版自带白底，不随全站反转（方案 §13.3），阅读页外壳仍跟随主题。
 */
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  html: { type: String, default: '' },
  // (src) => 绝对地址；缺省不改写
  resolver: { type: Function, default: null },
})

const hostEl = ref(null)
let shadowRoot = null

const BASE_STYLES = `
  :host { display: block; width: 100%; color: inherit; }
  *, *::before, *::after { box-sizing: border-box; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  section, div, p { max-width: 100%; }
  a { color: inherit; }
`

// 只改写 src="/media/..." 与 href="/media/..." 的属性值（正则锚定属性前缀，不碰正文文本）
function rewriteMediaUrls(html) {
  if (!props.resolver) return html
  return html
    .replace(/(\ssrc=)"(\/media\/[^"]*)"/g, (_, p, path) => `${p}"${props.resolver(path)}"`)
    .replace(/(\ssrc=)'(\/media\/[^']*)'/g, (_, p, path) => `${p}'${props.resolver(path)}'`)
    .replace(/(\shref=)"(\/media\/[^"]*)"/g, (_, p, path) => `${p}"${props.resolver(path)}"`)
}

function render() {
  if (!shadowRoot || !hostEl.value) return
  const styles = document.createElement('style')
  styles.textContent = BASE_STYLES
  const body = document.createElement('div')
  body.className = 'official-html-body'
  body.innerHTML = rewriteMediaUrls(props.html || '')
  shadowRoot.innerHTML = ''
  shadowRoot.appendChild(styles)
  shadowRoot.appendChild(body)
}

onMounted(() => {
  shadowRoot = hostEl.value.attachShadow({ mode: 'open' })
  render()
})

watch(() => props.html, render)
</script>

<template>
  <div ref="hostEl" class="official-html-content" />
</template>

<style scoped>
.official-html-content {
  width: 100%;
  /* 官方排版常自带浅色底与留白：外壳只给白底画布，不套任何全局排版样式 */
  background: #fff;
  border-radius: 10px;
}
</style>
