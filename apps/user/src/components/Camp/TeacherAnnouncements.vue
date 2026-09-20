<template>
  <div class="teacher-announcements">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <div class="card-title-row">
          <h3>营期公告（{{ visible.length }}）</h3>
          <DewButton size="sm" type="glass" @click="openEdit(null)">发布公告</DewButton>
        </div>
      </template>

      <div v-if="loading" style="display: flex; flex-direction: column; gap: 8px;">
        <DewSkeleton v-for="n in 3" :key="n" variant="text" :width="n % 2 ? '55%' : '85%'" />
      </div>
      <div v-else-if="!rows.length" class="empty">
        暂无公告——开营仪式、调课、组会安排等持续展示的内容用公告发布
      </div>
      <div v-else class="ann-list">
        <DewCard v-for="a in rows" :key="a.id" variant="inset" size="sm" style="margin: 8px 0;"
          :class="{ 'ann-ended': a.status !== 'active' }">
          <div class="ann-row">
            <DewTag v-if="a.is_pinned && a.status === 'active'" type="warning" size="sm" :round="true">置顶</DewTag>
            <DewTag v-else-if="a.status !== 'active'" type="info" size="sm" :round="true">已撤下</DewTag>
            <span class="ann-title">{{ a.title }}</span>
            <DewTag type="neutral" size="sm" :round="true">{{ audienceLabel(a.audience) }}</DewTag>
            <span class="ann-time">{{ (a.published_at || '').slice(0, 10) }}</span>
            <div class="ann-actions">
              <DewButton v-if="a.status === 'active'" size="sm" type="ghost"
                @click="togglePin(a)">{{ a.is_pinned ? '取消置顶' : '置顶' }}</DewButton>
              <DewButton size="sm" type="ghost" @click="openEdit(a)">编辑</DewButton>
              <DewButton v-if="a.status === 'active'" size="sm" type="ghost" @click="unpublish(a)">撤下</DewButton>
            </div>
          </div>
          <p class="ann-content">{{ a.content }}</p>
        </DewCard>
      </div>
    </DewCard>

    <!-- 发布/编辑弹窗 -->
    <DewDialog v-model="dlg.visible" :title="dlg.id ? '编辑公告' : '发布公告'" :width="560">
      <div class="form-field">
        <label class="field-label">标题</label>
        <DewInput v-model="dlg.title" placeholder="公告标题（≤200 字）" maxlength="200"
          style="width: 100%;" />
      </div>
      <div class="form-field">
        <label class="field-label">内容</label>
        <DewInput v-model="dlg.content" type="textarea" :rows="5"
          placeholder="公告正文——营期成员按受众可见，可持续查看" style="width: 100%;" />
      </div>
      <div class="form-field form-inline">
        <div>
          <label class="field-label">受众</label>
          <DewSelect v-model="dlg.audience" size="sm" style="width: 150px;"
            :options="[{ label: '全体成员', value: 'all' }, { label: '仅导生', value: 'mentors' }, { label: '仅学员', value: 'students' }]" />
        </div>
        <div>
          <label class="field-label">置顶</label>
          <DewSwitch v-model="dlg.isPinned" />
        </div>
      </div>
      <div v-if="!dlg.id" class="form-field form-inline">
        <div>
          <label class="field-label">同步通知</label>
          <DewSwitch v-model="dlg.notify" />
        </div>
        <span class="field-hint">开启后向受众成员发一条站内通知（公告本身持续可见，通知只提醒一次）</span>
      </div>
      <template #footer>
        <DewButton size="sm" type="ghost" @click="dlg.visible = false">取消</DewButton>
        <DewButton size="sm" type="glass" :loading="dlg.submitting" @click="submit">发布</DewButton>
      </template>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { DewButton, DewCard, DewDialog, DewInput, DewSelect, DewSkeleton, DewSwitch, DewTag } from '@bme/dew-ui';
import { ElMessage, ElMessageBox } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});

const rows = ref([]);
const loading = ref(true);
const visible = computed(() => rows.value.filter((a) => a.status === 'active'));

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchAnnouncements(props.sid);
    rows.value = d.announcements || [];
  } catch {
    ElMessage.error('加载公告失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

const audienceLabel = (a) => ({ all: '全体', mentors: '导生', students: '学员' }[a] || a);

const dlg = reactive({
  visible: false, id: null, title: '', content: '',
  audience: 'all', isPinned: false, notify: false, submitting: false,
});

function openEdit(a) {
  dlg.id = a?.id || null;
  dlg.title = a?.title || '';
  dlg.content = a?.content || '';
  dlg.audience = a?.audience || 'all';
  dlg.isPinned = !!a?.is_pinned;
  dlg.notify = false;
  dlg.visible = true;
}

async function submit() {
  if (!dlg.title.trim() || !dlg.content.trim()) {
    ElMessage.warning('请填写公告标题与内容');
    return;
  }
  dlg.submitting = true;
  try {
    if (dlg.id) {
      await campService.updateAnnouncement(props.sid, dlg.id, {
        title: dlg.title, content: dlg.content,
        audience: dlg.audience, is_pinned: dlg.isPinned,
      });
      ElMessage.success('公告已更新');
    } else {
      await campService.createAnnouncement(props.sid, {
        title: dlg.title, content: dlg.content,
        audience: dlg.audience, is_pinned: dlg.isPinned, notify: dlg.notify,
      });
      ElMessage.success(dlg.notify ? '公告已发布，并已通知受众成员' : '公告已发布');
    }
    dlg.visible = false;
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败');
  } finally { dlg.submitting = false; }
}

async function togglePin(a) {
  try {
    await campService.updateAnnouncement(props.sid, a.id, { is_pinned: !a.is_pinned });
    a.is_pinned = !a.is_pinned;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function unpublish(a) {
  try {
    await ElMessageBox.confirm(
      `撤下后「${a.title}」不再对营期成员展示（记录保留可追溯）。确定撤下吗？`, '撤下公告',
      { confirmButtonText: '撤下', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    await campService.unpublishAnnouncement(props.sid, a.id);
    ElMessage.success('已撤下');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}
</script>

<style scoped>
.card-title-row { display: flex; align-items: center; justify-content: space-between; }
.empty { padding: 20px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }

.ann-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ann-title { font-weight: 600; color: var(--dew-text-heading); }
.ann-time { font-size: 12px; color: var(--dew-text-faint); }
.ann-actions { margin-left: auto; display: flex; gap: 6px; }
.ann-content {
  font-size: 13px; color: var(--dew-text-muted); line-height: 1.6;
  margin: 6px 0 0; white-space: pre-wrap; word-break: break-word;
}
.ann-ended { opacity: 0.6; }

.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--dew-text-muted); }
.form-inline { flex-direction: row; align-items: center; gap: 16px; }
.form-inline > div { display: flex; flex-direction: column; gap: 6px; }
.field-hint { font-size: 12px; color: var(--dew-text-faint); line-height: 1.5; align-self: flex-end; }
</style>
