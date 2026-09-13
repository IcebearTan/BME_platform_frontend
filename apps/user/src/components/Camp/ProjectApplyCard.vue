<template>
  <!-- 项目营申报（09-13 复盘放宽：可同时申报/负责多个项目）。
       申报即资格（upcoming 人人可报、admin 审申报）；待审不阻塞继续申报；
       被拒的项目直接用表单重报（升版本）。参与总数受上限约束（负责的计入），
       在管理员批准时校验。
       双入口：非成员视图（CampView upcoming）+ 成员工作台（ProjectHub 申报 view）。
       普通学员报名在选择阶段开放（申报与入营窗口分离，09-12 拍板「仅 upcoming」）。 -->
  <div class="apply-card-wrap">
    <DewCard v-if="loading" variant="inset" size="lg" :no-hover="true" class="apply-card">
      <DewSkeleton variant="text" width="40%" />
      <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
    </DewCard>

    <template v-else>
      <!-- 待审列表：安静态，不阻塞继续申报 -->
      <DewCard v-if="pendingApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">{{ pendingApps.length }} 个申报待审核</div>
        <div class="pending-list">
          <div v-for="a in pendingApps" :key="a.id" class="pending-item">
            <span class="pending-name">「{{ a.name }}」</span>
            <span class="pending-date">{{ (a.created_at || '').slice(0, 10) }}</span>
          </div>
        </div>
        <div class="apply-hint" style="margin-bottom: 0;">
          管理员逐个审核：通过即创建项目、你自动入营成为该项目负责人。审核期间可继续申报其他项目。
        </div>
      </DewCard>

      <!-- 申报表单（upcoming 恒开；被拒项目直接重报即可） -->
      <DewCard v-if="mine.can_apply" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">申报一个新项目</div>
        <div class="apply-hint">
          管理员审核通过后项目创建并对全营展示，你自动入营开始组队；可同时申报多个项目，负责多少个不受限制。
        </div>

        <div class="field-label">项目名称 <span class="field-req">必填</span></div>
        <DewInput v-model="form.name" size="lg" placeholder="如：智能输液监护系统" :disabled="submitting" />

        <div class="field-label">项目背景</div>
        <DewInput v-model="form.background" type="textarea" :rows="2"
                  placeholder="为什么做这件事、面向什么场景" :disabled="submitting" />

        <div class="field-label">目标</div>
        <DewInput v-model="form.goal" type="textarea" :rows="2"
                  placeholder="预期达成什么（可验收的成果形态）" :disabled="submitting" />

        <div class="field-label">所需能力</div>
        <DewInput v-model="form.required_abilities" type="textarea" :rows="2"
                  placeholder="希望成员具备的技能（硬件/软件/机械/文档…）" :disabled="submitting" />

        <div class="field-label">招募说明</div>
        <DewInput v-model="form.recruit_note" type="textarea" :rows="2"
                  placeholder="打算招几个人、怎么分工" :disabled="submitting" />

        <div class="field-label">计划</div>
        <DewInput v-model="form.plan" type="textarea" :rows="2"
                  placeholder="阶段划分与时间安排" :disabled="submitting" />

        <div class="apply-actions">
          <DewButton size="lg" :loading="submitting" :disabled="!form.name.trim()" @click="submit">
            提交申报
          </DewButton>
        </div>
      </DewCard>

      <!-- 申报历史（被拒可见原因，重报走上方表单） -->
      <DewCard v-if="rejectedApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">被退回的申报</div>
        <div v-for="a in rejectedApps" :key="a.id" class="reject-note">
          「{{ a.name }}」：{{ a.reject_reason || '未填写原因' }}——可修改后用上方表单重新申报
        </div>
      </DewCard>

      <!-- 窗口已过且无待审：说明卡 -->
      <DewCard v-if="!mine.can_apply && !pendingApps.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">项目申报</div>
        <div class="apply-hint">申报期已结束（项目申报在「待开放」阶段进行）。</div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  session: { type: Object, required: true },   // 营期行（project 营）
});
const emit = defineEmits(['submitted']);

const loading = ref(true);
const mine = ref({});
const submitting = ref(false);
const form = ref({ name: '', background: '', goal: '', required_abilities: '', recruit_note: '', plan: '' });

const pendingApps = computed(() => mine.value.applications?.filter((a) => a.status === 'pending') || []);
const rejectedApps = computed(() => mine.value.applications?.filter((a) => a.status === 'rejected') || []);

async function load() {
  loading.value = true;
  try {
    mine.value = await campService.fetchProjectMine(props.session.id);
  } catch { /* 静默：卡在骨架态，用户刷新重试 */ }
  finally { loading.value = false; }
}
onMounted(load);

async function submit() {
  if (submitting.value || !form.value.name.trim()) return;
  submitting.value = true;
  try {
    const payload = Object.fromEntries(
      Object.entries(form.value).map(([k, v]) => [k, (v || '').trim() || null]));
    const r = await campService.submitProjectApplication(props.session.id, payload);
    ElMessage.success(r.message || '申报已提交，等待管理员审核');
    emit('submitted');
    form.value = { name: '', background: '', goal: '', required_abilities: '', recruit_note: '', plan: '' };
    await load();   // 刷新待审列表，表单留空可继续报下一个
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.apply-card { margin-top: 16px; }
.apply-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); margin-bottom: 8px; }
.apply-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-bottom: 14px; }
.pending-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.pending-item { display: flex; align-items: baseline; gap: 10px; font-size: 13.5px; }
.pending-name { font-weight: 600; color: var(--dew-text-heading); }
.pending-date { font-size: 12px; color: var(--dew-text-faint); }
.reject-note {
  font-size: 12.5px; color: var(--color-warning); line-height: 1.6; margin-bottom: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.reject-note:last-child { margin-bottom: 0; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); margin: 12px 0 6px; }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }
.apply-actions { margin-top: 16px; }
</style>
