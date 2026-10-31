<template>
  <article class="comment" :data-reply-id="comment.id">
    <el-avatar :size="child ? 28 : 36" :src="assetUrl(comment.author_avatar || '')">{{ comment.author_name?.charAt(0) }}</el-avatar>
    <div class="body">
      <div class="meta"><button class="name" @click="$emit('profile', comment.author_id)">{{ comment.author_name }}</button><span>{{ comment.created_at }}</span></div>
      <p v-if="comment.reply_to_name" class="target">回复 {{ comment.reply_to_name }}</p>
      <p class="text">{{ visibleText }}</p>
      <button v-if="comment.content?.length > 650" class="link" @click="expanded = !expanded">{{ expanded ? '收起' : '展开全文' }}</button>
      <div v-if="comment.status === 'normal'" class="actions">
        <span>{{ comment.word_count }} 字</span>
        <button class="link" :disabled="liking" @click="like">{{ comment.liked ? '已赞' : '点赞' }} {{ comment.like_count || '' }}</button>
        <button v-if="writable" class="link" @click="$emit('reply', comment)">回复</button>
        <template v-if="own">
          <button class="link" @click="$emit('edit', comment)">编辑</button>
          <button class="link" @click="$emit('delete', comment)">删除</button>
        </template>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import api from '../../api'
import { assetUrl } from '../../services/campService'
const props = defineProps({ comment: { type: Object, required: true }, child: Boolean, writable: Boolean })
defineEmits(['reply', 'edit', 'delete', 'profile'])
const store = useStore()
const expanded = ref(false)
const liking = ref(false)
const own = computed(() => Number(store.state.user?.User_Id) === props.comment.author_id)
const visibleText = computed(() => props.comment.status !== 'normal' ? '此评论已删除，后续讨论保留。' :
  (!expanded.value && props.comment.content?.length > 650 ? props.comment.content.slice(0, 650) + '…' : props.comment.content))
async function like() {
  if (liking.value) return
  liking.value = true
  try {
    const { data } = await api.post('/discussions/reactions', { target_type: 'reply', target_id: props.comment.id, reaction_type: 'like' })
    const liked = !!data.data.liked
    props.comment.like_count += liked === props.comment.liked ? 0 : liked ? 1 : -1
    props.comment.liked = liked
  } catch (e) { ElMessage.error(e.response?.data?.message || '点赞失败，请重试') }
  finally { liking.value = false }
}
</script>

<style scoped>
.comment { display: flex; gap: 12px; padding: 20px 0; }
.body { flex: 1; min-width: 0; }
.meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; color: var(--dew-text-muted); font-size: 12px; }
.name { font-weight: 650; color: var(--dew-text-heading); border: 0; background: transparent; padding: 0; cursor: pointer; }
.target { margin: 6px 0 0; color: var(--dew-text-muted); font-size: 12px; }
.text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; font-size: 14px; margin: 10px 0; color: var(--dew-text); }
.actions { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; color: var(--dew-text-muted); font-size: 12px; }
.link { border: 0; background: transparent; padding: 2px 0; color: var(--dew-text-muted); cursor: pointer; font: inherit; }
.link:hover { color: var(--color-primary); }
</style>
