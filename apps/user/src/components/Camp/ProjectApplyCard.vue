<template>
  <!-- 项目营申报期（upcoming）非成员视图：负责人申报入口（v1.3 阶段3）。
       状态机：可申报→表单 / 待审核→安静态 / 被退回→原因+重提表单（新版本）。
       普通学员提示报名在选择阶段开放（申报与入池窗口分离，09-12 拍板「仅 upcoming」）。 -->
  <div class="apply-card-wrap">
    <DewCard v-if="loading" variant="inset" size="lg" :no-hover="true" class="apply-card">
      <DewSkeleton variant="text" width="40%" />
      <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
    </DewCard>

    <template v-else>
      <!-- 已是某个项目的负责人（过审自动入池，正常不会走到非成员视图；兜底展示） -->
      <DewCard v-if="mine.leading?.length" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">你已是 {{ mine.leading.length }} 个项目的负责人</div>
        <div class="apply-hint">项目工作台已对你开放，请从营期成员视图进入。</div>
      </DewCard>

      <!-- 待审核：安静态（审核前管理员可退回，退回后回到表单态重提） -->
      <DewCard v-else-if="pendingApp" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">申报待审核</div>
        <div class="apply-hint">
          已提交项目「{{ pendingApp.name }}」（第 {{ pendingApp.version }} 版），管理员审核通过后项目即创建、你自动入池成为负责人。
        </div>
      </DewCard>

      <!-- 申报表单：可申报 or 被退回重提 -->
      <DewCard v-else-if="mine.can_apply || rejectedApp" variant="inset" size="lg" :no-hover="true" class="apply-card">
        <template v-if="rejectedApp">
          <div class="apply-title">上次申报被退回，可修改后重提</div>
          <div class="reject-note">退回原因：{{ rejectedApp.reject_reason || '未填写' }}</div>
        </template>
        <div v-else class="apply-title">申报一个新项目</div>
        <div class="apply-hint">
          项目负责人由老师线下沟通后在此申报（一人本期最多负责 1 个项目）；管理员审核通过后项目创建并对全营展示，你自动入池开始组队。
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
            {{ rejectedApp ? '重提申报（新版本）' : '提交申报' }}
          </DewButton>
        </div>
      </DewCard>

      <!-- 窗口已过（非 upcoming 或已负责/已申报完）：说明卡 -->
      <DewCard v-else variant="inset" size="lg" :no-hover="true" class="apply-card">
        <div class="apply-title">项目申报</div>
        <div class="apply-hint">{{ closedHint }}</div>
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

const pendingApp = computed(() => mine.value.applications?.find((a) => a.status === 'pending'));
const rejectedApp = computed(() => {
  const apps = mine.value.applications || [];
  return apps.length && apps[0].status === 'rejected' ? apps[0] : null;   // mine 按版本倒序
});
const closedHint = computed(() => {
  if (props.session.status !== 'upcoming') return '申报期已结束（项目申报在「待开放」阶段进行）。';
  return '你已申报或已负责项目，本期不能再申报。';
});

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
    await load();   // 回到待审核态
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
.reject-note {
  font-size: 12.5px; color: var(--color-warning); line-height: 1.6; margin-bottom: 12px;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); margin: 12px 0 6px; }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }
.apply-actions { margin-top: 16px; }
</style>
