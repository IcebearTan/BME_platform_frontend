<template>
  <div class="mentor-reward">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>发放奖励</h3></template>
      <el-form label-width="70px" style="max-width: 480px;">
        <el-form-item label="学员">
          <DewSelect v-model="form.user_id" :options="memberOptions" placeholder="选择本团队学员" />
        </el-form-item>
        <el-form-item label="勋章">
          <DewSelect v-model="form.medal_id" :options="medalOptions" placeholder="选择勋章" filterable />
        </el-form-item>
        <el-form-item label="描述">
          <DewInput v-model="form.description" type="textarea" :rows="2" placeholder="奖励说明（可选）" />
        </el-form-item>
        <el-form-item>
          <DewButton type="glass" :disabled="submitting" @click="submit">发放奖励</DewButton>
        </el-form-item>
      </el-form>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { DewCard, DewButton, DewInput, DewSelect } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const members = ref([]);
const medals = ref([]);
const submitting = ref(false);
const form = reactive({ user_id: null, medal_id: null, description: '' });

const memberOptions = computed(() =>
  members.value.filter((m) => m.role === 'student').map((m) => ({ label: m.username, value: m.user_id })));
const medalOptions = computed(() => medals.value.map((m) => ({ label: m.name, value: m.id })));

async function load() {
  try {
    const [mem, md] = await Promise.all([campService.fetchMembers(props.sid), campService.fetchCampMedals()]);
    members.value = mem.members || [];
    medals.value = md.medals || [];
  } catch { ElMessage.error('加载失败'); }
}

async function submit() {
  if (!form.user_id || !form.medal_id) { ElMessage.warning('请选择学员和勋章'); return; }
  submitting.value = true;
  try {
    await campService.issueReward(props.sid, form.user_id, form.medal_id, form.description);
    ElMessage.success('奖励已发放');
    form.description = '';
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发放失败');
  } finally {
    submitting.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>
