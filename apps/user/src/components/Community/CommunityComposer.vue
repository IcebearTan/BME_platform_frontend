<template>
  <DewDialog v-model="visible" :title="editing ? '编辑分享' : '发布新帖'" width="min(640px, 94vw)" :close-on-click-modal="false">
    <form class="community-composer" @submit.prevent="submit(false)"><fieldset :disabled="submitting" class="composer-fields">
      <div v-if="availableTags.length" class="composer-field"><label>标签 <span>选择分享所属的话题</span></label>
        <div class="composer-chips"><button v-for="tag in recommendedTags" :key="tag.id" type="button" :class="{ selected: draft.tag_ids.includes(tag.id) }" @click="toggleTag(tag)"># {{ tag.name }}{{ tag.is_active === false ? '（已停用）' : '' }}</button><CommunityTagPicker :tags="availableTags" :model-value="draft.tag_ids" multiple @update:model-value="setTags" /></div>
      </div>
      <section v-if="readingTag" class="composer-book">
        <label>书名 <span class="required">必填</span></label>
        <DewInput ref="bookInput" v-model="bookSearchModel" placeholder="搜索书名，或填写书单外的书籍" clearable @focus="bookSuggestionsOpen = true" @keydown.esc="bookSuggestionsOpen = false" />
        <div v-if="bookSuggestionsOpen && bookOptions.length" class="composer-book-options" role="listbox" aria-label="书名联想"><button v-for="book in bookOptions" :key="book.id" type="button" role="option" :aria-selected="draft.book_id === book.id" @click="chooseBook(book)"><strong>{{ book.title }}</strong><span>{{ book.author }}</span></button></div>
        <DewInput v-if="!draft.book_id" v-model="draft.book_author" placeholder="作者（选填）" />
        <div v-if="bookThreads.length" class="composer-book-topics"><span>这本书已有讨论，可以直接去评论：</span><a v-for="topic in bookThreads.slice(0, 2)" :key="topic.id" :href="router.resolve(`/community/thread/${topic.id}`).href" target="_blank" rel="noopener">{{ topic.title }}<el-icon><ArrowRight /></el-icon></a></div>
        <span class="composer-hint">首帖需要书名和至少一张图片。已经读过这本书的同学可以直接在帖下评论。</span>
      </section>
      <div class="composer-field"><label>分享标题</label><DewInput v-model="draft.title" placeholder="用一句话说说，你想分享什么（至少 4 字）" /></div>
      <div class="composer-field"><label>{{ readingTag ? '我的阅读心得' : '正文' }}</label><DewInput ref="contentInput" v-model="draft.content" type="textarea" :rows="7" :placeholder="readingTag ? '哪一段让你停下来思考？它让你想起了什么？' : '分享你的想法（至少 10 字）'" />
        <div class="composer-tools"><CommunityEmojiPicker :disabled="submitting" @select="contentInput?.insertText($event)" /><div class="composer-counter" aria-live="polite"><span>已输入 {{ countWords(draft.content) }} 字<span v-if="readingTag"> · 建议约 {{ readingTag.suggested_words }} 字</span></span><span :class="{ over: contentLength(draft.content) > 10000 }">{{ contentLength(draft.content) }} / 10000 字符</span></div></div>
        <small class="composer-hint">字数不含空白和标点<span v-if="readingTag">；不足建议字数也可以发布</span>。</small>
      </div>
      <div class="composer-field"><label>图片 <span>{{ readingTag ? '至少 1 张，可用书籍封面或阅读照片' : '选填，最多 4 张' }}</span></label>
        <div class="composer-images"><div v-for="(url, i) in draft.images" :key="url" class="composer-image"><img :src="assetUrl(url)" alt="待发布图片" /><button type="button" :disabled="submitting" :aria-label="`移除第 ${i+1} 张图片`" @click="draft.images.splice(i,1)"><el-icon><Close /></el-icon></button></div>
          <button v-if="draft.images.length < 4" class="composer-add" type="button" :disabled="uploading || submitting" @click="fileInput.click()"><el-icon><Plus /></el-icon>{{ uploading ? '上传中' : '添加图片' }}</button>
        </div><input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="upload" /><small class="composer-hint">jpg / png / webp，每张不超过 10MB</small>
      </div>
      <div class="composer-field"><label>分类 <span>选填</span></label><div class="composer-chips"><button v-for="item in categories" :key="item.value" type="button" :class="{ selected: draft.category === item.value }" @click="draft.category = draft.category === item.value ? '' : item.value">{{ item.label }}</button></div></div>
      <div v-if="draft.category === 'recruit'" class="composer-field"><label>关联项目</label><select v-model="draft.project_id"><option :value="null">不关联</option><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.title }}</option></select></div>
      <section v-if="duplicates.length" class="composer-duplicates" role="status"><strong>这本书已经有人分享过了</strong><p>可以加入现有讨论。如果是不同的分享，也可以继续发布。</p><a v-for="item in duplicates" :key="item.id" :href="router.resolve(`/community/thread/${item.id}`).href" target="_blank" rel="noopener">{{ item.title }} · 去参与讨论</a><DewButton size="sm" :disabled="submitting" @click="submit(true)">我仍要发布</DewButton></section>
      <p v-if="error" class="composer-error" role="alert">{{ error }}</p>
    </fieldset></form>
    <template #footer><DewButton type="ghost" :disabled="submitting" @click="visible=false">稍后再写</DewButton><DewButton :disabled="!canSubmit || submitting || uploading" @click="submit(false)">{{ submitting ? '发布中…' : editing ? '保存修改' : '发布' }}</DewButton></template>
  </DewDialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Close, ArrowRight } from '@element-plus/icons-vue'
import { DewDialog, DewInput, DewButton } from '@bme/dew-ui'
import { ElMessage } from 'element-plus'
import api from '../../api'
import { assetUrl } from '../../services/campService'
import { countWords, contentLength, newRequestId, communityService } from '../../services/communityService'
import { showcaseService } from '../../services/showcaseService'
import CommunityTagPicker from './CommunityTagPicker.vue'
import CommunityEmojiPicker from './CommunityEmojiPicker.vue'
const contentInput = ref()
const props = defineProps({ modelValue: Boolean, tags: { type: Array, default: () => [] }, initialTagId: { type: [String, Number], default: '' }, thread: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue','published'])
const visible = computed({ get: () => props.modelValue, set: v => emit('update:modelValue',v) })
const router = useRouter(), draft = ref({ tag_ids: [], title:'', content:'', images:[], category:'', project_id:null, book_id:null, book_title:'', book_author:'' })
const availableTags = computed(() => [...props.tags, ...(props.thread?.tags || []).filter(t => !props.tags.some(a => a.id === t.id))])
const recommendedTags = computed(() => availableTags.value.filter((t, i) => i < 3 || draft.value.tag_ids.includes(t.id)))
const editing = computed(() => !!props.thread), readingTag = computed(() => availableTags.value.find(t => t.is_reading && draft.value.tag_ids.includes(t.id)))
const fileInput = ref(), books = ref([]), projects = ref([]), duplicates = ref([]), submitting = ref(false), uploading = ref(false), error = ref('')
const bookQuery = ref(''), bookInput = ref(), bookSuggestionsOpen = ref(false), bookThreads = ref([])
const bookOptions = computed(() => books.value.filter(b => b.title.toLocaleLowerCase().includes(bookQuery.value.trim().toLocaleLowerCase())).slice(0, 6))
const bookSearchModel = computed({ get: () => bookQuery.value, set: value => { bookQuery.value = value; draft.value.book_id = null; draft.value.book_title = value; bookSuggestionsOpen.value = true } })
function chooseBook(book) { draft.value.book_id = book.id; draft.value.book_title = ''; draft.value.book_author = ''; bookQuery.value = book.title; bookSuggestionsOpen.value = false }
const categories = [{ value:'chat',label:'闲聊' },{ value:'ask',label:'提问' },{ value:'share',label:'分享' },{ value:'recruit',label:'招人' }]
let requestId = newRequestId(), bookSequence = 0
const canSubmit = computed(() => contentLength(draft.value.title) >= 4 && contentLength(draft.value.title) <= 200 && contentLength(draft.value.content) >= 10 && contentLength(draft.value.content) <= 10000 && (!readingTag.value || ((draft.value.book_id || draft.value.book_title.trim()) && draft.value.images.length > 0)))
function toggleTag(tag) {
  if (submitting.value) return
  setTags(draft.value.tag_ids.includes(tag.id) ? draft.value.tag_ids.filter(id => id !== tag.id) : [...draft.value.tag_ids, tag.id])
}
function setTags(ids) {
  if (submitting.value) return
  const newReading = availableTags.value.find(t => t.is_reading && ids.includes(t.id) && !draft.value.tag_ids.includes(t.id))
  const selected = newReading ? ids.filter(id => id === newReading.id || !availableTags.value.find(t => t.id === id)?.is_reading) : ids
  if (selected.length <= 5) draft.value.tag_ids = selected
}
watch(visible, async value => {
  if (!value) return
  if (props.thread) draft.value = { tag_ids:(props.thread.tags || []).map(t => t.id), title:props.thread.title, content:props.thread.content, images:[...(props.thread.images || [])], category:props.thread.category || '', project_id:props.thread.project_id || null, book_id:props.thread.book_id || null, book_title:'', book_author:'' }
  else if (!draft.value.title && !draft.value.content) draft.value.tag_ids = props.initialTagId ? [Number(props.initialTagId)] : []
  error.value=''
  if (props.thread?.book) bookQuery.value = props.thread.book.title
})
watch(() => readingTag.value?.id, async (id, old) => {
  const current = ++bookSequence
  if (!editing.value || old) { draft.value.book_id=null; draft.value.book_title=''; draft.value.book_author=''; bookQuery.value='' }
  books.value=[]; duplicates.value=[]
  if (id) {
    bookSuggestionsOpen.value = true
    if (!editing.value && visible.value) { await nextTick(); bookInput.value?.$el.querySelector('input')?.focus() }
    try { const result = await communityService.books(id); if (current === bookSequence) books.value=result } catch { if (current === bookSequence) error.value='书单暂未加载，可以自行填写书名。' }
  }
})
let topicSequence = 0
watch(() => draft.value.book_id, async id => {
  const sequence = ++topicSequence
  bookThreads.value = []
  if (!id) return
  try { const rows = await communityService.bookThreads(id); if (sequence === topicSequence) bookThreads.value = rows.filter(t => t.id !== props.thread?.id) } catch { /* Publication still validates duplicate books. */ }
})
watch(() => draft.value.category, async value => {
  if (value !== 'recruit') { draft.value.project_id=null; return }
  try { const result=await showcaseService.fetchProjects({}); projects.value=(result.projects || []).filter(p => p.status === 'visible') } catch { error.value='项目列表暂时无法加载' }
})
watch(() => JSON.stringify(draft.value), () => { duplicates.value=[]; requestId=newRequestId() })
async function upload(event) {
  const file=event.target.files?.[0]; event.target.value=''
  if (!file) return
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10*1024*1024) { error.value='请选择不超过 10MB 的 jpg、png 或 webp 图片'; return }
  uploading.value=true; error.value=''
  try { const form=new FormData(); form.append('image',file); const response=await api.post('/discussions/upload_image',form); draft.value.images.push(response.data.url) }
  catch(e) { error.value=e.response?.data?.message || '图片上传失败，请重试' }
  finally { uploading.value=false }
}
async function submit(allowDuplicate) {
  if (!canSubmit.value || submitting.value || uploading.value) return
  submitting.value=true; error.value=''
  try {
    const body={ ...draft.value, title:draft.value.title.trim(), content:draft.value.content.trim(), category:draft.value.category || null, project_id:draft.value.category === 'recruit' ? draft.value.project_id : null, scope_type:'global', scope_id:null, client_request_id:requestId, allow_duplicate:allowDuplicate }
    if (!readingTag.value) { body.book_id=null; body.book_title=''; body.book_author='' }
    const response=editing.value ? await api.put(`/discussions/threads/${props.thread.id}`,body) : await api.post('/discussions/threads',body)
    visible.value=false; emit('published',response.data.data); ElMessage.success(editing.value ? '修改已保存' : '发布成功')
    draft.value={ tag_ids:[],title:'',content:'',images:[],category:'',project_id:null,book_id:null,book_title:'',book_author:'' }; requestId=newRequestId(); duplicates.value=[]
  } catch(e) {
    if (e.response?.data?.machine === 'DUPLICATE_BOOK') duplicates.value=e.response.data.existing_threads || []
    else error.value=e.response?.data?.message || '发布失败，内容已保留，请重试'
  } finally { submitting.value=false }
}
</script>

<style scoped>
.composer-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.composer-tools .composer-counter{flex:1;min-width:180px}
.composer-fields{border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:21px}.community-composer{display:flex;flex-direction:column;gap:21px}.composer-field{display:flex;flex-direction:column;gap:9px}.composer-field label,.composer-book label{font-size:13px;font-weight:650;color:var(--dew-text-heading)}label span{margin-left:7px;font-weight:400;font-size:11px;color:var(--dew-text-faint)}.required{color:var(--dew-text-muted)}
.composer-chips{display:flex;gap:8px;flex-wrap:wrap}.composer-chips button{display:flex;gap:5px;align-items:center;border:1px solid var(--dew-card-flat-border);border-radius:20px;padding:7px 13px;font-size:12px;cursor:pointer;color:var(--dew-text-muted);background:var(--dew-card-flat-bg)}.composer-chips button.selected{background:var(--dew-text-heading);color:var(--dew-card-flat-bg);border-color:var(--dew-text-heading)}
.composer-book{display:flex;flex-direction:column;gap:11px;padding:18px;border:1px solid var(--dew-card-flat-border);border-radius:12px;background:var(--dew-bg-subtle,var(--dew-card-bg))}.composer-book p{display:flex;align-items:center;gap:6px;margin:0 0 3px;font-size:13px;color:var(--dew-text-heading)}
select{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--dew-card-flat-border);border-radius:8px;font:inherit;color:var(--dew-text-heading);background:var(--dew-card-flat-bg)}.composer-hint{font-size:11px;color:var(--dew-text-faint);line-height:1.7}.composer-counter{display:flex;justify-content:space-between;gap:12px;font-size:11px;color:var(--dew-text-muted);flex-wrap:wrap}.over,.composer-error{color:var(--color-danger,#b84444)}
.composer-images{display:flex;gap:10px;flex-wrap:wrap}.composer-image{position:relative;width:88px;height:88px}.composer-image img{width:100%;height:100%;object-fit:cover;border-radius:8px}.composer-image button{position:absolute;right:3px;top:3px;width:24px;height:24px;border:0;border-radius:50%;cursor:pointer;color:var(--dew-text-heading);background:var(--dew-card-flat-bg)}.composer-add{width:88px;height:88px;border:1px dashed var(--dew-card-flat-border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--dew-text-muted);background:none;cursor:pointer;font-size:12px}
.composer-duplicates{padding:17px;border:1px solid var(--dew-card-flat-border);border-radius:10px;display:flex;flex-direction:column;gap:10px;color:var(--dew-text-heading)}.composer-duplicates p{font-size:12px;line-height:1.7;margin:0;color:var(--dew-text-muted)}.composer-duplicates a{font-size:13px;color:inherit;text-decoration:underline;text-underline-offset:4px}.composer-error{font-size:12px;line-height:1.6;margin:0}
.composer-book-options { display: flex; flex-direction: column; max-height: 190px; overflow-y: auto; border-radius: var(--radius-md); background: var(--dew-card-flat-bg); border: 1px solid var(--dew-card-flat-border); }
.composer-book-options button { display: flex; justify-content: space-between; gap: 12px; border: 0; background: none; padding: 12px; font: inherit; font-size: 13px; color: var(--dew-text-heading); cursor: pointer; text-align: left; }
.composer-book-options button:hover, .composer-book-options button:focus-visible { background: var(--dew-ghost-hover-bg); }
.composer-book-options span { color: var(--dew-text-muted); font-size: 12px; }
.composer-book-topics { display: flex; flex-direction: column; gap: 7px; font-size: 12px; color: var(--dew-text-muted); }
.composer-book-topics a { display: flex; align-items: center; gap: 6px; color: var(--dew-text-heading); text-decoration: none; line-height: 1.7; }
</style>
