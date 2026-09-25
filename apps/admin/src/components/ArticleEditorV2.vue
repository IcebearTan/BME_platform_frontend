<script setup>
/**
 * admin 文章编辑器 V2（md-editor-v3 Markdown + Jodit 官方富文本，双模式合一）
 * - 无 route.query.id：新建 → POST /v2/article/draft（存草稿）或 /public（发布）
 * - 有 id：编辑 → GET /v2/article/<id> 回填 → /draft 更新草稿 / /<id>/publish 草稿发布 / /<id>/edit 更新已发布
 * - Markdown 模式（默认）：正文 content_md；官方富文本（?type=html 新建或存量 html 文章）：
 *   content_type='html' + content_html，必须官方推文（标记锁定），粘贴走服务端导入清洗
 *   （方案 docs/计划/官方富文本推文-调整方案.md §8）。
 * 格式一经保存锁定（方案 §3.4）：编辑已有文章时不提供切换，新建时由入口选择。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload, Monitor, Iphone } from '@element-plus/icons-vue'
import api, { assetUrl } from '../api'
import { MdEditor, MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import '@bme/editor/md-setup' // 自托管 highlight.js（禁外网 CDN）
import OfficialHtmlEditor from './article/OfficialHtmlEditor.vue'
import HtmlImportReport from './article/HtmlImportReport.vue'

// 编辑器图床（09-19 社区重设计）：正文插图上传自家 /v2/article/upload_image，markdown 引用绝对 URL
const onUploadImage = async (files, callback) => {
  const urls = []
  for (const file of files) {
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/v2/article/upload_image', fd)
      if (res.data?.url) urls.push(assetUrl(res.data.url))
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || '图片上传失败')
    }
  }
  callback(urls)
}

const EDITOR_ID = 'admin-article-editor'
// 工具栏排除：mermaid/katex 走 CDN 且用不到；github/htmlPreview/save/sub/sup/catalog/fullscreen 按需去掉
const EXCLUDE = ['mermaid', 'katex', 'github', 'htmlPreview', 'save', 'sub', 'sup', 'catalog', 'fullscreen']

// 新建模式注入的引导模板（演示标题/引用/列表/加粗/代码等，可直接改写）
const DEFAULT_CONTENT = `# 在这里输入标题

> 一段简短的引言，概述这篇文章要讲什么。（这是引用，删掉行首「>」即变正文）

## 正文

正常段落。可用 **加粗** 强调、*斜体* 点缀，或插入 [链接](https://example.com)。

### 要点

- 第一点
- 第二点
- 第三点

代码示例：

\`\`\`python
def hello():
    print("Hello, BME")
\`\`\`

---
> 写完后在右侧填写标题与简介，再点「发布」或「保存草稿」。
`

const route = useRoute()
const router = useRouter()

const currentId = ref(route.query.id || null)
const articleStatus = ref(null)   // null=新建 | 'draft' | 'published'
const content = ref('')           // Markdown 正文
const contentHtml = ref('')       // HTML 正文（官方富文本模式）
// 正文格式：新建时由入口决定（?type=html），编辑存量按详情 content_type；保存后锁定
const contentType = ref(route.query.type === 'html' ? 'html' : 'markdown')
const formatLocked = ref(!!route.query.id)   // 编辑已有文章：格式不可切
const title = ref('')
const introduction = ref('')
const submitting = ref(false)
const importing = ref(false)
const importReport = ref(null)
const previewMode = ref('none')   // none | desktop | mobile（HTML 模式预览）
// Phase 2（09-20）：官方推文运营字段——封面（需先有 id）、is_official 标记、发布时可选群发通知
const isOfficial = ref(false)
const coverUrl = ref('')
const notifyAll = ref(false)
const coverUploading = ref(false)
const coverInput = ref(null)

const isHtmlMode = computed(() => contentType.value === 'html')
const isPublishedMode = computed(() => articleStatus.value === 'published')
const publishLabel = computed(() => (isPublishedMode.value ? '保存修改' : '发布文章'))
const failedImageCount = computed(() => importReport.value?.images_failed || 0)

// 官方富文本新建：先建空草稿拿 id（图片转存要挂归属，方案 §8.1）
const createEmptyHtmlDraft = async () => {
  try {
    const res = await api.post('/v2/article/draft', {
      content_type: 'html', title: '', introduction: '', content_html: '',
    })
    currentId.value = res.data.id
    articleStatus.value = 'draft'
    isOfficial.value = true
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '草稿创建失败，无法进入富文本编辑')
    router.push('/content/articles')
  }
}

// 编辑模式：回填（v2 详情返回 {code, data:{...}}）
const loadArticle = async () => {
  if (!currentId.value) return
  try {
    const res = await api({ method: 'get', url: `/v2/article/${currentId.value}` })
    const d = (res.data && res.data.data) || {}
    title.value = d.title || ''
    introduction.value = d.introduction || ''
    contentType.value = d.content_type || 'markdown'
    formatLocked.value = true
    content.value = d.content_md || ''
    contentHtml.value = d.content_html || ''
    articleStatus.value = d.status || null
    isOfficial.value = contentType.value === 'html' ? true : !!d.is_official
    coverUrl.value = d.cover || ''
  } catch {
    ElMessage.error('文章加载失败')
  }
}

// 封面上传/删除（挂文章 id：新建未保存时提示先存草稿）
const onCoverPick = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || coverUploading.value) return
  if (!currentId.value) { ElMessage.warning('请先保存草稿或发布，再上传封面'); return }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { ElMessage.warning('仅支持 jpg/png/webp'); return }
  if (file.size > 10 * 1024 * 1024) { ElMessage.warning('封面不能超过 10MB'); return }
  coverUploading.value = true
  try {
    const fd = new FormData()
    fd.append('cover', file)
    const res = await api.post(`/v2/article/${currentId.value}/cover`, fd)
    coverUrl.value = res.data.cover
    ElMessage.success('封面已上传')
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}
const removeCover = async () => {
  if (!currentId.value) { coverUrl.value = ''; return }
  try {
    await api.post(`/v2/article/${currentId.value}/cover/delete`)
    coverUrl.value = ''
    ElMessage.success('封面已删除')
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  }
}

// 推文发布后可选群发（community 通知，source 挂文章）
const broadcastArticle = async (articleId) => {
  try {
    await api.post('/notification/batch_create', {
      user_ids: [],
      title: `新推文：${title.value.trim().slice(0, 50)}`,
      content: (introduction.value || title.value || '').slice(0, 200),
      category: 'community',
      is_important: false,
      source_type: 'article_v2',
      source_id: articleId,
    })
    ElMessage.success('已群发社区通知')
  } catch (e) {
    ElMessage.warning(e?.response?.data?.message || '群发通知失败（推文已发布）')
  }
}

// 保存草稿：markdown 宽松校验（标题或正文其一）；html 允许全空（占位草稿）
const handleSaveDraft = async () => {
  if (!isHtmlMode.value && !title.value.trim() && !content.value.trim()) {
    ElMessage.warning('写点标题或内容再保存')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = isHtmlMode.value
      ? { content_type: 'html', title: title.value, introduction: introduction.value, content_html: contentHtml.value }
      : { title: title.value, introduction: introduction.value, content_md: content.value }
    if (currentId.value && articleStatus.value === 'draft') {
      await api.post('/v2/article/draft', { id: currentId.value, ...payload })
      ElMessage.success('草稿已更新')
    } else if (!currentId.value) {
      const res = await api.post('/v2/article/draft', payload)
      currentId.value = res.data.id
      articleStatus.value = 'draft'
      ElMessage.success('已保存为草稿')
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 发布 / 保存修改（按 currentId × articleStatus 分流），完成后回列表
const handleSubmit = async () => {
  if (!title.value.trim()) { ElMessage.warning('请填写标题'); return }
  if (!introduction.value.trim() && isHtmlMode.value) { ElMessage.warning('官方富文本推文需要填写简介'); return }
  if (isHtmlMode.value && !contentHtml.value.trim()) { ElMessage.warning('请填写正文'); return }
  if (!isHtmlMode.value && !content.value.trim()) { ElMessage.warning('请填写正文'); return }
  if (isHtmlMode.value && failedImageCount.value > 0) {
    ElMessage.warning('正文中仍有图片转存失败占位块，请删除或重新上传后再发布')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = isHtmlMode.value
      ? { content_type: 'html', title: title.value, introduction: introduction.value,
          content_html: contentHtml.value, is_official: true }
      : { title: title.value, introduction: introduction.value, content_md: content.value,
          is_official: isOfficial.value }
    let publishedId = null
    let wasPublished = false
    if (currentId.value && articleStatus.value === 'draft') {
      await api.post(`/v2/article/${currentId.value}/publish`, payload)
      publishedId = currentId.value; wasPublished = true
      ElMessage.success('发布成功')
    } else if (currentId.value && articleStatus.value === 'published') {
      await api.post(`/v2/article/${currentId.value}/edit`, payload)
      ElMessage.success('已更新')
    } else {
      const res = await api.post('/v2/article/public', payload)
      publishedId = res.data.id; wasPublished = true
      ElMessage.success('发布成功')
    }
    // 首次发布 + 官方推文 + 勾选群发 → 社区通知全体
    if (wasPublished && isOfficial.value && notifyAll.value && publishedId) {
      await broadcastArticle(publishedId)
    }
    router.push('/content/articles')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (currentId.value) {
    loadArticle()
  } else if (isHtmlMode.value) {
    createEmptyHtmlDraft()        // 官方富文本：先建空草稿再进编辑器
  } else {
    content.value = DEFAULT_CONTENT  // 新建 Markdown：注入引导模板
  }
})
</script>

<template>
  <div class="ae2">
    <!-- 顶部工具条 -->
    <div class="ae2-toolbar">
      <h2 class="ae2-title">
        {{ currentId ? '编辑文章' : (isHtmlMode ? '写官方推文' : '写文章') }}
        <el-tag v-if="isHtmlMode" size="small" type="warning" effect="plain">官方富文本</el-tag>
      </h2>
      <div class="ae2-actions">
        <template v-if="isHtmlMode">
          <el-button :type="previewMode === 'desktop' ? 'primary' : ''" plain size="small" :icon="Monitor"
                     @click="previewMode = previewMode === 'desktop' ? 'none' : 'desktop'">桌面预览</el-button>
          <el-button :type="previewMode === 'mobile' ? 'primary' : ''" plain size="small" :icon="Iphone"
                     @click="previewMode = previewMode === 'mobile' ? 'none' : 'mobile'">手机预览</el-button>
        </template>
        <el-button v-if="!isPublishedMode" :disabled="submitting || importing" @click="handleSaveDraft">保存草稿</el-button>
        <el-button type="primary" :disabled="submitting || importing" :icon="Upload" @click="handleSubmit">{{ publishLabel }}</el-button>
      </div>
    </div>

    <div class="ae2-body" :class="{ 'is-html': isHtmlMode }">
      <!-- 左：Markdown 目录 / HTML 导入报告 -->
      <aside class="ae2-catalog">
        <div class="ae2-panel">
          <h3>{{ isHtmlMode ? '导入报告' : '目录' }}</h3>
          <div v-if="!isHtmlMode" class="ae2-catalog-scroll">
            <MdCatalog :editor-id="EDITOR_ID" theme="light" :offset-top="20" />
          </div>
          <div v-else class="ae2-catalog-scroll">
            <HtmlImportReport :report="importReport" />
          </div>
        </div>
      </aside>

      <!-- 中：编辑器 / 预览 -->
      <div class="ae2-editor">
        <template v-if="isHtmlMode">
          <OfficialHtmlEditor
            v-show="previewMode === 'none'"
            v-model="contentHtml"
            :article-id="currentId ? Number(currentId) : null"
            @report="importReport = $event"
            @importing="importing = $event"
          />
          <div v-if="previewMode !== 'none'" class="ae2-preview" :class="{ 'is-mobile': previewMode === 'mobile' }">
            <div class="ae2-preview-frame"><!-- 服务端清洗后的正文，管理端预览 -->
              <div v-html="contentHtml" />
            </div>
          </div>
        </template>
        <MdEditor
          v-else
          v-model="content"
          :id="EDITOR_ID"
          theme="light"
          :toolbars-exclude="EXCLUDE"
          :no-prettier="true"
          preview-theme="default"
          code-theme="atom"
          show-code-row-number
          :on-upload-img="onUploadImage"
          :style="{ height: 'calc(100vh - 160px)', minHeight: '480px' }"
        />
      </div>

      <!-- 右：信息面板 -->
      <aside class="ae2-info">
        <div class="ae2-panel">
          <h3>文章信息</h3>
          <div class="ae2-field">
            <label>标题</label>
            <el-input v-model="title" clearable placeholder="文章标题" />
          </div>
          <div class="ae2-field">
            <label>简介</label>
            <el-input v-model="introduction" type="textarea" :rows="3" placeholder="一句话简介" />
          </div>
          <div class="ae2-field">
            <label>封面（16:9 自动裁切）</label>
            <div v-if="coverUrl" class="ae2-cover">
              <img :src="coverUrl" alt="封面预览" />
              <div class="ae2-cover-ops">
                <el-button size="small" :disabled="coverUploading" @click="coverInput?.click()">换图</el-button>
                <el-button size="small" type="danger" plain @click="removeCover">删除</el-button>
              </div>
            </div>
            <el-button v-else size="small" :disabled="coverUploading" @click="coverInput?.click()">
              {{ currentId ? '上传封面' : '上传封面（先保存后可用）' }}
            </el-button>
          </div>
          <div class="ae2-field">
            <el-checkbox v-model="isOfficial" :disabled="isHtmlMode">设为官方推文（社区精选带展示）</el-checkbox>
            <p v-if="isHtmlMode" class="ae2-hint">官方富文本推文必须为官方推文，标记锁定不可取消。</p>
          </div>
          <div v-if="isOfficial && !isPublishedMode" class="ae2-field">
            <el-checkbox v-model="notifyAll">发布时群发社区通知</el-checkbox>
          </div>
          <p v-if="formatLocked" class="ae2-hint">正文格式已锁定（{{ isHtmlMode ? '官方富文本' : 'Markdown' }}），如需另一种格式请复制为新文章。</p>
        </div>
      </aside>
    </div>
    <input ref="coverInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onCoverPick" />
  </div>
</template>

<style scoped>
.ae2 {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}
.ae2-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.ae2-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.ae2-actions { display: flex; gap: 8px; align-items: center; }

.ae2-body {
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 14px;
  align-items: start;
}
.ae2-body.is-html { grid-template-columns: 300px 1fr 280px; }
.ae2-cover img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; display: block; }
.ae2-cover-ops { display: flex; gap: 8px; margin-top: 8px; }
.ae2-panel {
  background: var(--surface-solid);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.ae2-panel h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }
.ae2-catalog-scroll { max-height: calc(100vh - 240px); overflow: auto; }
.ae2-field { margin-bottom: 14px; }
.ae2-field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.ae2-hint { margin: 6px 0 0; font-size: 12px; color: var(--text-faint); line-height: 1.6; }

/* HTML 预览（方案 §8.2 桌面/手机切换；正文为服务端清洗结果） */
.ae2-preview {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: #fff;
  min-height: 480px;
  max-height: calc(100vh - 200px);
  overflow: auto;
  display: flex;
  justify-content: center;
}
.ae2-preview-frame {
  width: 100%;
  max-width: 780px;
  padding: 24px 20px;
}
.ae2-preview.is-mobile .ae2-preview-frame {
  max-width: 400px;
  border-left: 1px dashed var(--border-light);
  border-right: 1px dashed var(--border-light);
}
.ae2-preview-frame :deep(img) { max-width: 100%; height: auto; }
.ae2-preview-frame :deep(table) { max-width: 100%; }

/* 窄屏：隐藏目录列 */
@media (max-width: 1100px) {
  .ae2-body, .ae2-body.is-html { grid-template-columns: 1fr 280px; }
  .ae2-catalog { display: none; }
}
@media (max-width: 768px) {
  .ae2-body, .ae2-body.is-html { grid-template-columns: 1fr; }
}
</style>
