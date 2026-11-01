<template>
  <div class="selectable">
    <div class="page-header"><div><div class="page-title">社区标签与书单</div><p class="hint">普通标签用于归类讨论；阅读活动可配置书单，学生发帖时选择。</p></div><el-button type="primary" @click="open()">新建标签</el-button></div>
    <p v-if="error" role="alert">{{ error }} <el-button text @click="load">重试</el-button></p>
    <DewCard no-hover class="table-card">
      <el-table :data="tags" v-loading="loading">
        <el-table-column prop="name" label="标签名称" min-width="180" />
        <el-table-column label="类型" width="120"><template #default="{ row }">{{ row.is_reading ? '阅读活动' : '普通标签' }}</template></el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="post_count" label="帖子" width="80" />
        <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.is_active ? '启用' : '停用' }}</template></el-table-column>
        <el-table-column label="操作" width="250"><template #default="{ row }"><el-button text @click="open(row)">编辑</el-button><el-button v-if="row.is_reading" text @click="openBooks(row)">书单</el-button><el-button text type="danger" :loading="deletingId === row.id" :disabled="deletingId !== null" @click="removeTag(row)">删除</el-button></template></el-table-column>
      </el-table>
    </DewCard>
    <el-dialog v-model="visible" :title="draft.id ? '编辑标签' : '新建标签'" width="min(540px, 94vw)" :close-on-click-modal="false">
      <el-form label-position="top" :disabled="saving">
        <el-form-item label="标签名称"><el-input v-model="draft.name" maxlength="50" show-word-limit /></el-form-item>
        <el-form-item label="标签说明"><el-input v-model="draft.description" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="标签类型">
          <el-radio-group v-model="draft.is_reading" aria-label="标签类型"><el-radio-button :value="false">普通标签</el-radio-button><el-radio-button :value="true">阅读活动</el-radio-button></el-radio-group>
          <p class="hint type-hint">{{ draft.is_reading ? '可导入书单；发帖需选择书籍并配图，建议字数仅作提示。' : '适用于项目实践、学习交流等主题，不要求书名或配图。' }}</p>
          <p v-if="draft.id" class="hint type-hint">未关联帖子或书单时可修改类型；已有内容的标签可停用。</p>
        </el-form-item>
        <el-form-item v-if="draft.is_reading" label="建议字数（仅提示，不限制发布）"><el-input-number v-model="draft.suggested_words" :min="1" :max="10000" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="draft.is_active" /><span class="hint">停用后不能新选，既有帖子与历史入口保留</span></el-form-item>
      </el-form>
      <p v-if="saveError" role="alert">{{ saveError }}</p>
      <template #footer><el-button :disabled="saving" @click="visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="booksVisible" :title="`${bookTag?.name || ''} · 书单`" width="min(700px, 94vw)" :close-on-click-modal="false">
      <p class="hint">每行一本书：书名和作者用制表符分隔，可直接从表格粘贴。作者选填；同名书自动去重，每次最多 500 本。</p>
      <el-input v-model="importText" type="textarea" :rows="6" placeholder="乡土中国&#9;费孝通&#10;活着&#9;余华" :disabled="importing" aria-label="待导入书单" />
      <p v-if="bookError" role="alert">{{ bookError }}</p>
      <el-button type="primary" :loading="importing" :disabled="!importText.trim()" @click="importBooks">导入书单</el-button>
      <el-table :data="books" max-height="300"><el-table-column prop="title" label="书名" /><el-table-column prop="author" label="作者" /></el-table>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewMessageBox } from '@bme/dew-ui'
import api from '../api'
const tags = ref([]), loading = ref(false), error = ref(''), visible = ref(false), draft = ref({}), saving = ref(false), saveError = ref('')
const booksVisible = ref(false), bookTag = ref(null), books = ref([]), importText = ref(''), importing = ref(false), bookError = ref('')
const deletingId = ref(null)
async function load() { loading.value = true; error.value = ''; try { tags.value = (await api.get('/community/tags', { params: { all: 'true' } })).data.data } catch (e) { error.value = e.response?.data?.message || '标签加载失败' } finally { loading.value = false } }
function open(tag) { draft.value = tag ? { ...tag } : { name: '', description: '', is_reading: false, is_active: true, suggested_words: 500 }; saveError.value = ''; visible.value = true }
async function removeTag(tag) {
  if (deletingId.value !== null) return
  deletingId.value = tag.id
  try {
    try { await DewMessageBox.confirm(`确定删除「${tag.name}」？未使用的书单也会一并删除。已有帖子关联的标签不能删除，可在编辑中停用。`, '删除标签', { confirmText: '删除标签' }) }
    catch { return }
    await api.delete(`/community/tags/${tag.id}`)
    await load()
    ElMessage.success('标签已删除')
  } catch (e) { error.value = e.response?.data?.message || '删除失败，请重试' }
  finally { deletingId.value = null }
}
async function save() {
  if (saving.value) return
  if (!draft.value.name.trim()) { saveError.value = '请填写标签名称'; return }
  saving.value = true; saveError.value = ''
  try { if (draft.value.id) await api.put(`/community/tags/${draft.value.id}`, draft.value); else await api.post('/community/tags', draft.value); visible.value = false; await load(); ElMessage.success('标签已保存') }
  catch (e) { saveError.value = e.response?.data?.message || '保存失败，内容已保留' }
  finally { saving.value = false }
}
async function openBooks(tag) { bookTag.value = tag; books.value = []; importText.value = ''; bookError.value = ''; booksVisible.value = true; try { books.value = (await api.get(`/community/tags/${tag.id}/books`)).data.data } catch (e) { bookError.value = e.response?.data?.message || '书单加载失败，可关闭后重试' } }
async function importBooks() {
  if (importing.value) return
  const rows = importText.value.split(/\r?\n/).filter(s => s.trim()).map(s => { const [title, author = ''] = s.split('\t'); return { title: title.trim(), author: author.trim() } })
  importing.value = true; bookError.value = ''
  try { const { data } = await api.post(`/community/tags/${bookTag.value.id}/books`, { books: rows }); books.value = (await api.get(`/community/tags/${bookTag.value.id}/books`)).data.data; importText.value = ''; ElMessage.success(`已新增 ${data.created} 本书`) }
  catch (e) { bookError.value = e.response?.data?.message || '导入失败，内容已保留' }
  finally { importing.value = false }
}
onMounted(load)
</script>
<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }
.hint { font-size: 12px; color: var(--dew-text-muted); line-height: 1.8; margin: 8px 0; }
.el-switch + .hint { margin-left: 12px; }
.type-hint { width: 100%; margin: 6px 0 0; }
</style>
