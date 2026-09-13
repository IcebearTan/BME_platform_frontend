<template>
  <!-- 非成员报名页（工作台内）：按营期类型分发表单（方案 §6「公共外壳+类型子视图」）。
       learning=承诺出勤日+理由（09-12 砍意向大组：组别随归属导生继承，导生组=名片 tags）；
       project=入营报名（v1.3：考勤能力未开时不收到岗日，仅理由；无大组概念——项目分组走申报+组队）。 -->
  <div class="camp-join">
    <!-- 已提交：安静态 + 撤回（审核前可反悔，撤回后回到表单重新提交） -->
    <DewCard v-if="pending" variant="inset" size="lg" :no-hover="true" class="join-card">
      <div class="join-title">申请待审核</div>
      <div class="join-hint">已提交入营申请，管理员审批通过后即可进入营期工作台。审核前可撤回后重新提交。</div>
      <DewButton type="ghost" :loading="cancelling" @click="cancel">撤回申请</DewButton>
    </DewCard>

    <!-- 项目营报名表单：入营（过审后参加组队/志愿） -->
    <DewCard v-else-if="isProject" variant="inset" size="lg" :no-hover="true" class="join-card">
      <div class="join-title">申请加入「{{ session.name }}」</div>
      <div class="join-hint">
        提交后由管理员审批入营。入营后可浏览本期项目并提交项目意向，最终由老师线下协调、负责人确认组队。
      </div>

      <!-- 承诺到岗日（仅当本营开启考勤能力；项目营默认关闭不出现此节） -->
      <template v-if="needDays">
        <div class="field-label">承诺到岗日 <span class="field-req">至少一天</span></div>
        <div class="day-wrap">
          <div v-if="!days.length" class="no-days">营期范围内已无可选的未来日期。</div>
          <div v-else class="day-grid">
            <button v-for="d in days" :key="d.value" type="button"
                    :class="['pick-chip', { picked: pickedDays.has(d.value) }]"
                    @click="toggleDay(d.value)">{{ d.label }}</button>
          </div>
        </div>
      </template>

      <!-- 理由 -->
      <div class="field-label">申请理由</div>
      <DewInput v-model="reason" type="textarea" :rows="2" placeholder="选填，给审批老师看（感兴趣的方向、能投入的时间等）" />

      <div class="join-actions">
        <DewButton size="lg" :loading="submitting" :disabled="!canSubmit"
          @click="submit">{{ submitText }}</DewButton>
      </div>
    </DewCard>

    <!-- 学习营报名表单 -->
    <DewCard v-else variant="inset" size="lg" :no-hover="true" class="join-card">
      <div class="join-title">申请加入「{{ session.name }}」</div>
      <div class="join-hint">
        提交后由管理员审批。<template v-if="needDays">请选择能到岗的日期（{{ session.weekdays_only ? '本营仅计工作日' : '含周末' }}，至少一天），通过后按到岗日生成考勤承诺；</template>组别随后续归属的导生确定，报名时无需选择。
      </div>

      <!-- 承诺出勤日（09-12 三模式：仅假期营·每日模式收取） -->
      <template v-if="needDays">
        <div class="field-label">承诺到岗日 <span class="field-req">至少一天</span></div>
        <div class="day-wrap">
          <div v-if="!days.length" class="no-days">营期范围内已无可选的未来日期。</div>
          <div v-else class="day-grid">
            <button v-for="d in days" :key="d.value" type="button"
                    :class="['pick-chip', { picked: pickedDays.has(d.value) }]"
                    @click="toggleDay(d.value)">{{ d.label }}</button>
          </div>
        </div>
      </template>

      <!-- 理由 -->
      <div class="field-label">申请理由</div>
      <DewInput v-model="reason" type="textarea" :rows="2" placeholder="选填，给审批老师看（想学的方向、可到岗情况等）" />

      <div class="join-actions">
        <DewButton size="lg" :loading="submitting" :disabled="!canSubmit"
          @click="submit">{{ submitText }}</DewButton>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewInput } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  session: { type: Object, required: true },   // 营期行（含 category/ms_tags/weekdays_only/起止日期）
  pending: { type: Boolean, default: false },  // 已有待审批申请（安静态，不再展示表单）
});
const emit = defineEmits(['submitted', 'cancelled']);
// submitted → CampView 记 pending、中心卡片身份行转「入营申请待审核」
// cancelled → 撤回成功，CampView 清 pending，本组件回到表单态

const reason = ref('');
const submitting = ref(false);

// ── 考勤模式分支（09-12 三模式）：承诺到岗日仅模式 A（假期营·每日）收集；
// 按周累计（学期校区）/不考勤（学期远程）不收——learning/project 同一口径 ──
const isProject = computed(() => props.session.category === 'project');
const caps = computed(() => props.session.policy?.capabilities || {});
const needDays = computed(() =>
  !!caps.value.attendance && (props.session.policy?.attendance_mode || 'daily') === 'daily');

// 承诺到岗日候选：今天起、营期范围内；工作日营剔除周末（后端同口径兜底校验）
const days = computed(() => {
  const out = [];
  const s = props.session;
  if (!s?.start_date || !s?.end_date) return out;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(s.start_date), end = new Date(s.end_date);
  start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
  const from = today > start ? today : start;
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  for (let d = new Date(from); d <= end; d.setDate(d.getDate() + 1)) {
    if (s.weekdays_only && (d.getDay() === 0 || d.getDay() === 6)) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ value: iso, label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} 周${WEEK[d.getDay()]}` });
  }
  return out;
});

const pickedDays = ref(new Set());
function toggleDay(v) {
  const s = pickedDays.value;
  s.has(v) ? s.delete(v) : s.add(v);
  pickedDays.value = new Set(s);   // 换引用确保响应式更新
}

const canSubmit = computed(() => (needDays.value ? pickedDays.value.size > 0 : true));
const submitText = computed(() => {
  if (needDays.value && !pickedDays.value.size) return '请先选择到岗日';
  if (!needDays.value) return isProject.value ? '提交入营申请' : '提交申请';
  return `提交申请（${pickedDays.value.size} 天）`;
});

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    const r = await campService.requestJoin(
      props.session.id,
      needDays.value ? [...pickedDays.value].sort() : [],
      reason.value.trim());
    ElMessage.success(r.message || '申请已提交，等待审批');
    emit('submitted', props.session.id);
  } catch (e) {
    // 409 已有待审批 / 402 已是成员 / 400 未开放：后端 message 面向用户，直接展示
    ElMessage.error(e.response?.data?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

// 撤回待审核申请（本人 pending 行；404=已无待审行，同样回表单态由用户重看）
const cancelling = ref(false);
async function cancel() {
  if (cancelling.value) return;
  cancelling.value = true;
  try {
    const r = await campService.cancelJoin(props.session.id);
    ElMessage.success(r.message || '已撤回申请');
    emit('cancelled', props.session.id);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '撤回失败，请稍后重试');
  } finally {
    cancelling.value = false;
  }
}
</script>

<style scoped>
.join-card { margin-top: 16px; }
.join-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); margin-bottom: 8px; }
.join-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-bottom: 16px; }

.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); margin: 14px 0 8px; }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }

/* 通用选择 chip（日期多选） */
.day-wrap { max-height: 220px; overflow-y: auto; padding: 2px; }
.day-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.no-days { font-size: 12.5px; color: var(--dew-text-faint); padding: 4px 0; }
.pick-chip {
  border: 1px solid var(--dew-card-border); border-radius: 6px; background: transparent;
  padding: 5px 12px; font-size: 12.5px; color: var(--dew-text-muted); cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.pick-chip:hover { border-color: var(--dew-text-faint); }
.pick-chip.picked {
  color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-weight: 600;
}

.join-actions { margin-top: 18px; }
</style>
