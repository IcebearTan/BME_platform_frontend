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
import api from '../api'
import { MdEditor, MdCatalog } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import '../md-setup'   // 自托管 highlight.js（禁外网 CDN）

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
  } catch {
    ElMessage.error('文章加载失败')
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
    const payload = { title: title.value, introduction: introduction.value, content_md: content.value }
    if (currentId.value && articleStatus.value === 'draft') {
      await api.post(`/v2/article/${currentId.value}/publish`, payload)
      ElMessage.success('发布成功')
    } else if (currentId.value && articleStatus.value === 'published') {
      await api.post(`/v2/article/${currentId.value}/edit`, payload)
      ElMessage.success('已更新')
    } else {
      await api.post('/v2/article/public', payload)
      ElMessage.success('发布成功')
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
        </div>
      </aside>
    </div>
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
.ae2-title { margin: 0; font-size: 20px; font-weight: 700; color: #303133; }
.ae2-actions { display: flex; gap: 8px; }

.ae2-body {
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 14px;
  align-items: start;
}
.ae2-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 14px;
}
.ae2-panel h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #606266; }
.ae2-catalog-scroll { max-height: calc(100vh - 240px); overflow: auto; }
.ae2-field { margin-bottom: 14px; }
.ae2-field label { display: block; font-size: 13px; color: #606266; margin-bottom: 6px; }

/* 窄屏：隐藏目录列 */
@media (max-width: 1100px) {
  .ae2-body { grid-template-columns: 1fr 280px; }
  .ae2-catalog { display: none; }
}
@media (max-width: 768px) {
  .ae2-body { grid-template-columns: 1fr; }
}
</style>
