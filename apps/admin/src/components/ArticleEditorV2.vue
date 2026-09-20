<script setup>
/**
 * admin 文章编辑器 V2（md-editor-v3，编辑/新建合一）
 * - 无 route.query.id：新建 → POST /v2/article/draft（存草稿）或 /public（发布）
 * - 有 id：编辑 → GET /v2/article/<id> 回填 → /draft 更新草稿 / /<id>/publish 草稿发布 / /<id>/edit 更新已发布
 * 正文存 Markdown（content_md 裸字符串），接口全 v2。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import api, { assetUrl } from '../api'
import { MdEditor, MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import '@bme/editor/md-setup' // 自托管 highlight.js（禁外网 CDN）

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
const content = ref('')
const title = ref('')
const introduction = ref('')
const submitting = ref(false)
// Phase 2（09-20）：官方推文运营字段——封面（需先有 id）、is_official 标记、发布时可选群发通知
const isOfficial = ref(false)
const coverUrl = ref('')
const notifyAll = ref(false)
const coverUploading = ref(false)
const coverInput = ref(null)

const isPublishedMode = computed(() => articleStatus.value === 'published')
const publishLabel = computed(() => (isPublishedMode.value ? '保存修改' : '发布文章'))

// 编辑模式：回填（v2 详情返回 {code, data:{...}}）
const loadArticle = async () => {
  if (!currentId.value) return
  try {
    const res = await api({ method: 'get', url: `/v2/article/${currentId.value}` })
    const d = (res.data && res.data.data) || {}
    title.value = d.title || ''
    introduction.value = d.introduction || ''
    content.value = d.content_md || ''
    articleStatus.value = d.status || null
    isOfficial.value = !!d.is_official
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

// 保存草稿（宽松校验：标题或正文有一个即可）；新建后持 id，后续按更新走
const handleSaveDraft = async () => {
  if (!title.value.trim() && !content.value.trim()) {
    ElMessage.warning('写点标题或内容再保存')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = { title: title.value, introduction: introduction.value, content_md: content.value }
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
  if (!content.value.trim()) { ElMessage.warning('请填写正文'); return }
  if (submitting.value) return
  submitting.value = true
  try {
    const payload = { title: title.value, introduction: introduction.value, content_md: content.value,
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
    router.push('/article/manage')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (currentId.value) loadArticle()
  else content.value = DEFAULT_CONTENT  // 新建模式：注入引导模板
})
</script>

<template>
  <div class="ae2">
    <!-- 顶部工具条 -->
    <div class="ae2-toolbar">
      <h2 class="ae2-title">{{ currentId ? '编辑文章' : '写文章' }}</h2>
      <div class="ae2-actions">
        <el-button v-if="!isPublishedMode" :disabled="submitting" @click="handleSaveDraft">保存草稿</el-button>
        <el-button type="primary" :disabled="submitting" :icon="Upload" @click="handleSubmit">{{ publishLabel }}</el-button>
      </div>
    </div>

    <div class="ae2-body">
      <!-- 左：目录 -->
      <aside class="ae2-catalog">
        <div class="ae2-panel">
          <h3>目录</h3>
          <div class="ae2-catalog-scroll">
            <MdCatalog :editor-id="EDITOR_ID" theme="light" :offset-top="20" />
          </div>
        </div>
      </aside>

      <!-- 中：编辑器 -->
      <div class="ae2-editor">
        <MdEditor
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
            <el-checkbox v-model="isOfficial">设为官方推文（社区精选带展示）</el-checkbox>
          </div>
          <div v-if="isOfficial && !isPublishedMode" class="ae2-field">
            <el-checkbox v-model="notifyAll">发布时群发社区通知</el-checkbox>
          </div>
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
.ae2-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ae2-actions { display: flex; gap: 8px; }

.ae2-body {
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 14px;
  align-items: start;
}
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

/* 窄屏：隐藏目录列 */
@media (max-width: 1100px) {
  .ae2-body { grid-template-columns: 1fr 280px; }
  .ae2-catalog { display: none; }
}
@media (max-width: 768px) {
  .ae2-body { grid-template-columns: 1fr; }
}
</style>
