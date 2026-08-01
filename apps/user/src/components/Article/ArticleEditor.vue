<script setup>
/**
 * 文章编辑器（发布 / 编辑合一）
 * - 无 articleId：发布模式 → POST /article/public
 * - 有 articleId：编辑模式 → GET /article 回填 → POST /article/detail_json 保存
 * 蓝本：BME_backend/src/components/EditorCreateComponent.vue（TinyMCE 5 同款配置）
 * 主题：固定 oxide 皮肤，切换时不重建编辑器（重建会崩 → 旧版切换消失 bug）；
 *       暗色由 :deep(.tox-*) 工具栏覆盖 + iframe body.theme-dark class 接管。
 * 正文样式走共享 article-content.css（.rich-text 作用域，主题双轨）。
 */
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { View, EditPen, Upload } from '@element-plus/icons-vue'
import api from '../../api'
import { DewButton, DewCard, DewInput, DewMessage } from '../ui'

import Editor from '@tinymce/tinymce-vue'
import tinymce from 'tinymce/tinymce'
import 'tinymce/themes/silver'
import 'tinymce/icons/default/icons'
import 'tinymce/plugins/image'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/colorpicker'
import 'tinymce/plugins/textcolor'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/hr'
import 'tinymce/plugins/code'
import 'tinymce/plugins/link'
import 'tinymce/plugins/paste'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/autoresize'

const props = defineProps({
  articleId: { type: [Number, String], default: null },
})

const router = useRouter()
const store = useStore()
const BASE = import.meta.env.BASE_URL // '/AMEII/'

const content = ref('')
const title = ref('')
const introduction = ref('')
const mode = ref('edit') // 'edit' | 'preview'
const submitting = ref(false)
const isDarkMode = computed(() => store.getters.isDarkMode)

// 粘贴图片超宽压到 600px（与 admin 端一致）
const resizeImage = (img) => {
  const naturalWidth = img.naturalWidth
  const naturalHeight = img.naturalHeight
  if (naturalWidth > 600) {
    img.width = 600
    img.height = (600 / naturalWidth) * naturalHeight
  } else {
    img.width = naturalWidth
    img.height = naturalHeight
  }
}

const init = reactive({
  language_url: BASE + 'tinymce/langs/zh_CN.js',
  language: 'zh_CN',
  // 固定 oxide 皮肤：换 skin 必须重建编辑器，而 TinyMCE 5 重建会触发切换消失 bug。
  // 暗色交给 :deep(.tox-*) 工具栏覆盖（跟随 DewUI 变量）+ iframe body.theme-dark class。
  skin_url: BASE + 'tinymce/skins/ui/oxide',

  // 文章正文样式走共享 article-content.css（.rich-text 作用域，主题双轨）
  content_css: BASE + 'article-content.css',

  paste_data_images: true, // 允许粘贴图片（base64 内联）
  paste_word_valid_elements: 'img[src|width|height|alt|title|class]',
  paste_postprocess: function (plugin, args) {
    const div = args.node
    if (div.tagName === 'DIV') {
      const img = div.querySelector('img')
      if (img) {
        if (img.complete) {
          const imgSrc = img.src
          img.src = ''
          img.src = imgSrc
          resizeImage(img)
        } else {
          img.onload = () => resizeImage(img)
        }
      }
    }
  },

  menubar: false,
  width: '100%',
  height: 600,
  resize: true,
  plugins: 'lists image table wordcount link preview hr paste code fullscreen autoresize',
  // 精简工具栏：去 formatselect/fontsizeselect/code/wordcount/backcolor/alignjustify；
  // 字号统一由 .rich-text 接管，杜绝用户随意改字号导致正文杂乱。
  toolbar:
    'undo redo | bold italic underline strikethrough | h2 h3 blockquote | alignleft aligncenter alignright | bullist numlist | link image table | forecolor | hr fullscreen',
  branding: false,
  statusbar: true,
  elementpath: false,

  // 自动调整高度
  autoresize_bottom_margin: 20,
  autoresize_min_height: 400,
  autoresize_max_height: 800,

  // 画布底色跟随主题（iframe 内不读 DewUI 变量，用字面量；class 由 setup 挂上）
  content_style: `
    body {
      margin: 16px;
      background: #fff;
    }
    body.theme-dark {
      background: #1c1c1e;
    }
  `,

  toolbar_mode: 'sliding',

  setup: function (editor) {
    editor.on('init', function () {
      const body = editor.getBody()
      if (body) {
        body.classList.add('rich-text')
        body.classList.add(store.getters.isDarkMode ? 'theme-dark' : 'theme-light')
      }
    })
  },
})

// 主题切换：只切 iframe body 的 theme class（不重建编辑器 → 不再消失）
const syncEditorTheme = (isDark) => {
  const add = isDark ? 'theme-dark' : 'theme-light'
  const rem = isDark ? 'theme-light' : 'theme-dark'
  Object.values(tinymce.editors).forEach((ed) => {
    const body = ed.getBody()
    if (!body) return
    body.classList.add('rich-text')
    body.classList.remove(rem)
    body.classList.add(add)
  })
}

watch(isDarkMode, (dark) => {
  syncEditorTheme(dark)
})

// 编辑模式：加载既有文章（GET /article 公开接口，与阅读端同口径）
const loadArticle = async () => {
  if (!props.articleId) return
  try {
    const res = await api({ method: 'get', url: '/article', params: { Article_Id: props.articleId } })
    const data = res.data
    title.value = data.Article_Title || ''
    introduction.value = data.Article_Introduction || ''
    content.value = JSON.parse(data.html_content)
  } catch {
    DewMessage.error('文章加载失败')
  }
}

const handleSubmit = async () => {
  if (!title.value.trim()) {
    DewMessage.warning('请填写文章标题')
    return
  }
  if (!content.value.trim()) {
    DewMessage.warning('请填写文章内容')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = {
      Article_Title: title.value,
      Article_Introduction: introduction.value,
      Html: JSON.stringify(content.value),
    }
    let articleId = props.articleId
    if (articleId) {
      await api.post('/article/detail_json', { ...payload, Article_Id: articleId })
      DewMessage.success('文章更新成功')
    } else {
      const res = await api.post('/article/public', payload)
      articleId = res.data.Article_Id
      DewMessage.success('文章发布成功')
    }
    setTimeout(() => {
      router.push({ path: '/article', query: { Article_Id: articleId } })
    }, 800)
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

const togglePreview = () => {
  mode.value = mode.value === 'edit' ? 'preview' : 'edit'
}

onMounted(() => {
  loadArticle()
  // 预初始化 tinymce 库（admin 蓝本同款）
  tinymce.init({})
})

onBeforeUnmount(() => {
  tinymce.remove()
})
</script>

<template>
  <div class="article-editor">
    <!-- 顶部工具条：标题 + 操作（一行两端对齐） -->
    <DewCard class="editor-toolbar">
      <div class="toolbar-row">
        <h2 class="editor-title">
          {{ mode === 'preview' ? '预览' : (props.articleId ? '编辑文章' : '写文章') }}
        </h2>
        <div class="toolbar-actions">
          <DewButton :type="mode === 'preview' ? 'glass' : 'ghost'" size="sm" @click="togglePreview">
            <View v-if="mode === 'edit'" class="btn-icon" />
            <EditPen v-else class="btn-icon" />
            {{ mode === 'edit' ? '预览' : '继续编辑' }}
          </DewButton>
          <DewButton size="sm" :disabled="submitting" @click="handleSubmit">
            <Upload class="btn-icon" />
            {{ props.articleId ? '保存修改' : '发布文章' }}
          </DewButton>
        </div>
      </div>
    </DewCard>

    <div class="editor-main">
      <!-- 编辑态：信息卡 + 编辑器（单栏全宽） -->
      <div v-if="mode === 'edit'" class="editor-edit">
        <DewCard variant="flat" class="info-card">
          <h3 class="card-heading">文章信息</h3>
          <div class="form-field">
            <label class="form-label">标题</label>
            <DewInput v-model="title" clearable placeholder="给文章起个引人注目的标题" />
          </div>
          <div class="form-field">
            <label class="form-label">简介</label>
            <DewInput
              v-model="introduction"
              type="textarea"
              :rows="2"
              clearable
              placeholder="用简洁的语言介绍文章内容，让读者一目了然"
            />
          </div>
        </DewCard>

        <div class="editor-box">
          <Editor v-model="content" :init="init" />
        </div>
      </div>

      <!-- 预览态：720px 居中真实预览（对齐文章详情页正文阅读宽度） -->
      <div v-else class="editor-preview">
        <DewCard variant="flat" class="preview-card">
          <h1 class="preview-title">{{ title || '文章标题将在此显示' }}</h1>
          <p v-if="introduction" class="preview-intro">{{ introduction }}</p>
          <div class="preview-divider"></div>
          <div v-if="content" class="preview-body rich-text" v-html="content"></div>
          <div v-else class="preview-empty">
            <span>还没有内容，回到编辑继续创作</span>
          </div>
        </DewCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-editor {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

/* ── 顶部工具条 ── */
.editor-toolbar {
  margin-bottom: 20px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.btn-icon {
  width: 15px;
  height: 15px;
  margin-right: 4px;
  vertical-align: -2px;
}

/* ── 主体（单栏） ── */
.editor-main {
  width: 100%;
}

.editor-edit {
  width: 100%;
}

/* ── 文章信息卡 ── */
.info-card {
  margin-bottom: 16px;
}

.card-heading {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dew-text-muted);
}

.form-field {
  margin-bottom: 14px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dew-text-muted);
}

/* ── 编辑器容器 ── */
.editor-box {
  border-radius: 16px;
  overflow: hidden;
  background: var(--dew-card-bg, #ffffff);
  box-shadow: var(--dew-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.06));
}

.editor-box :deep(.tox-tinymce) {
  border: none;
  border-radius: 16px;
}

/* 工具栏 / 状态栏配色统一到 DewUI 变量（亮暗自动跟随 .theme-dark） */
.editor-box :deep(.tox .tox-toolbar-overlord),
.editor-box :deep(.tox .tox-toolbar__primary),
.editor-box :deep(.tox .tox-toolbar) {
  background: var(--dew-card-bg, #ffffff);
  border-bottom: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.06));
}

.editor-box :deep(.tox .tox-tbtn),
.editor-box :deep(.tox .tox-tbtn--select) {
  color: var(--dew-text-muted, #6b7280);
}

.editor-box :deep(.tox .tox-tbtn svg) {
  fill: var(--dew-text-muted, #6b7280);
}

.editor-box :deep(.tox .tox-tbtn:hover),
.editor-box :deep(.tox .tox-tbtn--enabled),
.editor-box :deep(.tox .tox-tbtn--bespoke) {
  background: var(--dew-card-bg-hover, rgba(255, 255, 255, 0.5));
  color: var(--dew-text-heading, #1f2937);
}

.editor-box :deep(.tox .tox-tbtn:hover svg),
.editor-box :deep(.tox .tox-tbtn--enabled svg) {
  fill: var(--dew-text-heading, #1f2937);
}

.editor-box :deep(.tox .tox-statusbar) {
  background: var(--dew-card-bg, #ffffff);
  border-top: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.06));
  color: var(--dew-text-faint, #9ca3af);
}

.editor-box :deep(.tox .tox-statusbar__wordcount) {
  color: var(--dew-text-faint, #9ca3af);
}

.editor-box :deep(.tox .tox-edit-area) {
  border-top: none;
}

/* ── 预览态（720px 居中，对齐文章详情页正文阅读宽度） ── */
.editor-preview {
  width: 100%;
}

.preview-card {
  max-width: 720px;
  margin: 0 auto;
}

.preview-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--dew-text-heading);
}

.preview-intro {
  margin: 0;
  font-size: 13px;
  color: var(--dew-text-faint);
}

.preview-divider {
  height: 1px;
  margin: 12px 0 16px;
  background: var(--dew-card-divider, rgba(0, 0, 0, 0.08));
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--dew-text-faint);
  font-size: 13px;
  text-align: center;
  border: 1px dashed var(--dew-card-divider, rgba(0, 0, 0, 0.12));
  border-radius: 12px;
}

@media (max-width: 768px) {
  .article-editor {
    padding: 16px 14px 48px;
  }
  .toolbar-row {
    flex-wrap: wrap;
  }
  .editor-title {
    font-size: 16px;
  }
}
</style>
