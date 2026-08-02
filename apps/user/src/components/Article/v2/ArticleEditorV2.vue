<script setup>
/**
 * 文章编辑器 V2（发布 / 编辑合一，三栏写作工作台）
 * - 左 MdCatalog 目录 / 中 MdEditor（edit+preview）/ 右 DewCard 信息面板
 * - 无 articleId：发布模式 → POST /v2/article/public
 * - 有 articleId：编辑模式 → GET /v2/article/<id> 回填 → POST /v2/article/<id>/edit 保存
 * 正文存 Markdown（content_md），不写文件、不 JSON.stringify。
 *
 * 自托管红线（禁外网 CDN）：md-editor-v3 默认从 unpkg 拉 highlight.js / prettier / cropper /
 * screenfull / mermaid / katex。本组件：highlight.js 本地化到 public/md-ext/；prettier 用
 * noPrettier 关闭；mermaid/katex/github/htmlPreview/save/fullscreen 等从工具栏排除；
 * image 上传不接 handler（不触发 cropper）。previewTheme=default（内置，不走 CDN）。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Upload } from '@element-plus/icons-vue'
import api from '../../../api'
import { DewButton, DewCard, DewInput, DewMessage } from '../../ui'
import { MdEditor, MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import './md-setup' // 自托管 highlight.js（禁外网 CDN），与阅读页共享

const EDITOR_ID = 'article-v2-editor'
// 工具栏排除：mermaid/katex 走 CDN 且用不到；github/htmlPreview/save/sub/sup/catalog/fullscreen 按需去掉
const EXCLUDE = ['mermaid', 'katex', 'github', 'htmlPreview', 'save', 'sub', 'sup', 'catalog', 'fullscreen']

// 新建模式注入的引导模板（演示标题/引用/列表/加粗等；用户可直接改写）
const DEFAULT_CONTENT = `# 标题：用一句话概括这篇心得

> 写一段引言，交代背景或亮出核心观点。（本行是引用，删掉行首「>」即变普通段落）

## 一、背景

这里简单说明事情的时间、地点、参与的人和起因，例如：

- 关键时间节点……
- 主要参与者……
- 起因与目标……

## 二、过程与发现

正文段落。可以用 **加粗** 强调关键词，用 *斜体* 点缀语气，也可以插入 [链接](https://example.com)。

### 关键节点

1. 第一步做了什么……
2. 中间遇到的转折……
3. 最后如何收尾……

## 三、收获与反思

写下三点最深的体会：

1. ……
2. ……
3. ……

---

> 提示：写完后，在右侧填写标题与简介，再点右上角「发布文章」。
`

const props = defineProps({
  articleId: { type: [Number, String], default: null },
})

const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)
const editorTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

const content = ref('')
const title = ref('')
const introduction = ref('')
const submitting = ref(false)

// currentId：编辑模式由父传入 articleId；保存草稿新建后更新为草稿 id（避免再点又新建）
// articleStatus：null=新建 | 'draft' | 'published'，决定按钮组（草稿可发布，已发布只保存）
const currentId = ref(props.articleId)
const articleStatus = ref(null)
const isPublishedMode = computed(() => articleStatus.value === 'published')
const publishLabel = computed(() => (isPublishedMode.value ? '保存修改' : '发布文章'))

// 编辑模式：回填（md 是裸字符串，无需 JSON.parse）
const loadArticle = async () => {
  if (!props.articleId) return
  try {
    const res = await api({ method: 'get', url: `/v2/article/${props.articleId}` })
    const d = res.data.data || {}
    title.value = d.title || ''
    introduction.value = d.introduction || ''
    content.value = d.content_md || ''
    articleStatus.value = d.status || null
  } catch {
    DewMessage.error('文章加载失败')
  }
}

// 保存草稿（宽松校验：标题或正文有一个即可）。新建后持有 id，后续按更新走
const handleSaveDraft = async () => {
  if (!title.value.trim() && !content.value.trim()) {
    DewMessage.warning('写点标题或内容再保存')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = {
      title: title.value,
      introduction: introduction.value,
      content_md: content.value,
    }
    if (currentId.value && articleStatus.value === 'draft') {
      await api.post('/v2/article/draft', { id: currentId.value, ...payload })
      DewMessage.success('草稿已更新')
    } else if (!currentId.value) {
      const res = await api.post('/v2/article/draft', payload)
      currentId.value = res.data.id
      articleStatus.value = 'draft'
      DewMessage.success('已保存到草稿箱')
    }
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 发布 / 保存修改（按 currentId × articleStatus 分流）
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
      title: title.value,
      introduction: introduction.value,
      content_md: content.value, // 裸 md 字符串，不 JSON.stringify
    }
    if (currentId.value && articleStatus.value === 'draft') {
      // 草稿→发布（接口会把当前编辑内容一并写入，避免改动丢失）
      await api.post(`/v2/article/${currentId.value}/publish`, payload)
      DewMessage.success('文章发布成功')
      setTimeout(() => router.push({ path: '/article-v2', query: { id: currentId.value } }), 600)
    } else if (currentId.value && articleStatus.value === 'published') {
      // 更新已发布文章
      await api.post(`/v2/article/${currentId.value}/edit`, payload)
      DewMessage.success('文章更新成功')
    } else {
      // 新建并发布
      const res = await api.post('/v2/article/public', payload)
      const newId = res.data.id
      DewMessage.success('文章发布成功')
      // 发布后跳 V2 阅读页查看效果
      setTimeout(() => router.push({ path: '/article-v2', query: { id: newId } }), 600)
    }
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (props.articleId) {
    loadArticle()
  } else {
    content.value = DEFAULT_CONTENT // 新建模式：注入引导模板
  }
})
</script>

<template>
  <div class="article-editor-v2">
    <!-- 顶部工具条 -->
    <DewCard class="editor-toolbar">
      <div class="toolbar-row">
        <h2 class="editor-title">{{ currentId ? '编辑文章' : '写文章' }}</h2>
        <div class="toolbar-actions">
          <DewButton
            v-if="!isPublishedMode"
            type="ghost"
            size="sm"
            :disabled="submitting"
            @click="handleSaveDraft"
          >
            保存草稿
          </DewButton>
          <DewButton size="sm" :disabled="submitting" @click="handleSubmit">
            <Upload class="btn-icon" />
            {{ publishLabel }}
          </DewButton>
        </div>
      </div>
    </DewCard>

    <div class="editor-body">
      <!-- 左：目录（跟随编辑器 H1-H6，点击跳转 + 高亮当前章节） -->
      <aside class="col-catalog">
        <DewCard variant="flat" class="catalog-card">
          <h3 class="col-heading">目录</h3>
          <div class="catalog-scroll">
            <MdCatalog :editor-id="EDITOR_ID" :theme="editorTheme" :offset-top="20" />
          </div>
        </DewCard>
      </aside>

      <!-- 中：编辑器（edit + preview 分栏，目录默认同步预览区） -->
      <div class="col-editor">
        <MdEditor
          v-model="content"
          :id="EDITOR_ID"
          :theme="editorTheme"
          :toolbars-exclude="EXCLUDE"
          :no-prettier="true"
          preview-theme="default"
          code-theme="atom"
          show-code-row-number
          :style="{ height: 'calc(100vh - 200px)', minHeight: '480px' }"
        />
      </div>

      <!-- 右：信息面板 -->
      <aside class="col-info">
        <DewCard variant="flat" class="info-card">
          <h3 class="col-heading">文章信息</h3>
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
              placeholder="用简洁的语言介绍文章内容"
            />
          </div>
          <div class="form-field">
            <label class="form-label">标签</label>
            <div class="tags-hint">（预留：标签选择后续接入）</div>
          </div>
        </DewCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.article-editor-v2 {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  box-sizing: border-box; /* 项目无全局 border-box（Tailwind preflight 关闭）；不加则 100%+padding 溢出右侧被裁 → 右栏贴边 */
}

/* ── 顶部工具条 ── */
.editor-toolbar {
  margin-bottom: 18px;
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

/* ── 三栏主体 ── */
.editor-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.col-catalog {
  width: 230px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}
.col-info {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}
.col-editor {
  flex: 1;
  min-width: 0;
}

/* ── 卡片通用 ── */
.col-heading {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dew-text-muted);
}

.catalog-card,
.info-card {
  max-height: calc(100vh - 120px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.catalog-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  font-size: 13px;
}

/* 目录条目排版（md-editor-v3 渲染 .md-editor-catalog） */
.catalog-scroll :deep(.md-editor-catalog) {
  color: var(--dew-text-muted);
}
.catalog-scroll :deep(.md-editor-catalog-active > span) {
  color: var(--dew-text-heading);
  font-weight: 600;
}

/* ── 信息面板表单 ── */
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
.tags-hint {
  font-size: 12px;
  color: var(--dew-text-faint);
  padding: 8px 10px;
  border: 1px dashed var(--dew-card-divider, rgba(0, 0, 0, 0.12));
  border-radius: 10px;
}

/* 编辑器圆角收边 */
.col-editor :deep(.md-editor) {
  border-radius: 16px;
  overflow: hidden;
  --md-color: var(--dew-text-heading);
}

/* ── 响应式：窄屏折叠左右栏 ── */
@media (max-width: 1024px) {
  .editor-body {
    flex-direction: column;
  }
  .col-catalog,
  .col-info {
    width: 100%;
    position: static;
    max-height: none;
  }
  .catalog-card {
    max-height: 240px;
  }
}
@media (max-width: 768px) {
  .article-editor-v2 {
    padding: 16px 14px 48px;
  }
  .col-catalog {
    display: none; /* 极窄屏隐藏目录，编辑器全宽 */
  }
}
</style>
