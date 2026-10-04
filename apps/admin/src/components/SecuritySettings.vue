<template>
  <div class="selectable security-page">
    <div class="page-header">
      <div class="page-title">安全设置</div>
      <div class="header-actions">
        <el-button v-if="status.enabled" @click="openDisable">停用动态口令</el-button>
        <el-button type="primary" v-if="!status.enabled" @click="startEnroll">绑定动态口令</el-button>
      </div>
    </div>

    <!-- 绑定状态 -->
    <DewCard no-hover class="table-card status-card">
      <div class="status-row">
        <div class="status-item">
          <div class="status-label">动态口令（TOTP）</div>
          <div class="status-value">
            <el-tag :type="status.enabled ? 'success' : 'info'" effect="plain">
              {{ status.enabled ? '已启用' : '未启用' }}
            </el-tag>
            <span v-if="status.enforced" class="status-note">平台已要求管理员启用</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-label">剩余恢复码</div>
          <div class="status-value">
            {{ status.recoveryCodesRemaining }} 个
            <el-button v-if="status.enabled" link type="primary" @click="regenerate">
              重新生成
            </el-button>
          </div>
        </div>
      </div>
      <p class="status-desc">
        启用后登录需输入验证器应用（Google Authenticator / Microsoft Authenticator 等）中的
        6 位动态验证码；密码泄露时账号仍受动态口令保护。停用与恢复码重发需要近期登录认证。
      </p>
    </DewCard>

    <!-- 绑定向导 -->
    <DewCard v-if="enroll.started && !status.enabled" class="enroll-card">
      <template #header>
        <div class="enroll-title">第一步：将密钥加入验证器</div>
      </template>
      <div class="enroll-body">
        <div class="secret-line">
          <span class="secret-label">手动输入密钥</span>
          <code class="secret-value">{{ enroll.secret }}</code>
          <el-button size="small" @click="copy(enroll.secret)">复制</el-button>
        </div>
        <div class="secret-line">
          <span class="secret-label">otpauth 链接（扫码导入）</span>
          <code class="secret-value small">{{ enroll.uri }}</code>
          <el-button size="small" @click="copy(enroll.uri)">复制</el-button>
        </div>
        <el-divider />
        <div class="enroll-title">第二步：输入验证器当前显示的 6 位验证码完成绑定</div>
        <div class="confirm-line">
          <el-input
            v-model="enroll.code" placeholder="6 位动态验证码" maxlength="6"
            class="code-input" @keyup.enter="confirmEnroll"
          />
          <el-button type="primary" :loading="enroll.submitting" @click="confirmEnroll">
            确认绑定
          </el-button>
        </div>
      </div>
    </DewCard>

    <!-- 恢复码一次性展示 -->
    <DewCard v-if="recovery.visible" class="recovery-card">
      <template #header>
        <div class="enroll-title">恢复码（仅本次展示，请离线保存）</div>
      </template>
      <div class="recovery-grid">
        <code v-for="c in recovery.codes" :key="c">{{ c }}</code>
      </div>
      <div class="recovery-actions">
        <el-button size="small" @click="copy(recovery.codes.join('\n'))">复制全部</el-button>
        <el-button size="small" @click="downloadRecovery">下载 txt</el-button>
        <el-button size="small" type="primary" @click="recovery.visible = false">
          我已保存
        </el-button>
      </div>
      <p class="status-desc">
        每个恢复码只能使用一次，用于验证器不可用时登录或停用动态口令；重新生成会使旧码全部作废。
      </p>
    </DewCard>

    <!-- 停用弹窗 -->
    <el-dialog v-model="disable.visible" title="停用动态口令" width="460px">
      <el-form label-width="90px" @submit.prevent>
        <el-form-item label="动态验证码">
          <el-input v-model="disable.code" placeholder="当前 6 位验证码" maxlength="6" />
        </el-form-item>
        <el-form-item label="或恢复码">
          <el-input v-model="disable.recoveryCode" placeholder="任一未使用的恢复码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="disable.visible = false">取消</el-button>
          <el-button type="danger" :loading="disable.submitting" @click="submitDisable">
            确认停用
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard } from '@bme/dew-ui';
import api from '../api';

const status = reactive({
  enabled: false, pending: false, recoveryCodesRemaining: 0, enforced: false,
});

const enroll = reactive({
  started: false, secret: '', uri: '', code: '', submitting: false,
});

const recovery = reactive({ visible: false, codes: [] });

const disable = reactive({ visible: false, code: '', recoveryCode: '', submitting: false });

async function loadStatus() {
  try {
    const res = await api({ url: '/auth/mfa/status', method: 'get' });
    if (res.data.code === 200) {
      Object.assign(status, res.data);
    }
  } catch (e) {
    ElMessage.error('安全状态加载失败，请刷新重试');
  }
}

async function startEnroll() {
  enroll.submitting = true;
  try {
    const res = await api({ url: '/auth/mfa/totp/enroll/start', method: 'post', data: {} });
    if (res.data.code === 200) {
      enroll.secret = res.data.secret;
      enroll.uri = res.data.otpauth_uri;
      enroll.started = true;
      enroll.code = '';
    } else {
      ElMessage.error(res.data.message || '无法开始绑定');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '无法开始绑定');
  } finally {
    enroll.submitting = false;
  }
}

async function confirmEnroll() {
  if (!enroll.code) return;
  enroll.submitting = true;
  try {
    const res = await api({
      url: '/auth/mfa/totp/enroll/confirm', method: 'post', data: { code: enroll.code },
    });
    if (res.data.code === 200) {
      // 绑定即安全变更：随响应换发的新 access 已由门面落会话
      if (res.data.token) {
        // facade 兼容层已随 saveLogin 处理；此处直接使用响应中的 token 恢复会话
        const { authSession } = await import('../api');
        authSession.saveLogin({ token: res.data.token });
      }
      recovery.codes = res.data.recovery_codes || [];
      recovery.visible = true;
      enroll.started = false;
      ElMessage.success('动态口令绑定成功');
      await loadStatus();
    } else {
      ElMessage.error(res.data.message || '验证码错误');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '绑定失败，请重试');
  } finally {
    enroll.submitting = false;
  }
}

async function regenerate() {
  try {
    const res = await api({ url: '/auth/mfa/recovery-code/regenerate', method: 'post', data: {} });
    if (res.data.code === 200) {
      recovery.codes = res.data.recovery_codes || [];
      recovery.visible = true;
      await loadStatus();
    } else {
      ElMessage.error(res.data.message || '需要先重新登录再操作（近期认证）');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '重发失败');
  }
}

function openDisable() {
  disable.code = '';
  disable.recoveryCode = '';
  disable.visible = true;
}

async function submitDisable() {
  if (!disable.code && !disable.recoveryCode) {
    ElMessage.warning('请输入当前验证码或一个恢复码');
    return;
  }
  disable.submitting = true;
  try {
    const data = {};
    if (disable.code) data.code = disable.code;
    if (disable.recoveryCode) data.recovery_code = disable.recoveryCode;
    const res = await api({ url: '/auth/mfa/totp/disable', method: 'post', data });
    if (res.data.code === 200) {
      if (res.data.token) {
        const { authSession } = await import('../api');
        authSession.saveLogin({ token: res.data.token });
      }
      disable.visible = false;
      ElMessage.success('动态口令已停用');
      await loadStatus();
    } else {
      ElMessage.error(res.data.message || '需要当前验证码或恢复码');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '停用失败');
  } finally {
    disable.submitting = false;
  }
}

function copy(text) {
  navigator.clipboard?.writeText(text).then(
    () => ElMessage.success('已复制'),
    () => ElMessage.warning('复制失败，请手动选择复制'),
  );
}

function downloadRecovery() {
  const blob = new Blob(
    [recovery.codes.join('\n')], { type: 'text/plain;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bme-admin-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(loadStatus);
</script>

<style scoped>
.status-card :deep(.dew-card__body) { padding: 20px 24px; }
.status-row { display: flex; gap: 48px; }
.status-item { min-width: 220px; }
.status-label { font-size: 13px; color: var(--dew-text-faint); margin-bottom: 8px; }
.status-value { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--dew-text-heading); }
.status-note { font-size: 12px; color: var(--dew-text-faint); }
.status-desc { margin: 18px 0 0; font-size: 13px; line-height: 1.7; color: var(--dew-text-faint); }

.enroll-card { margin-top: 16px; }
.enroll-title { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.enroll-body { display: flex; flex-direction: column; gap: 12px; }
.secret-line { display: flex; align-items: center; gap: 12px; }
.secret-label { flex: 0 0 170px; font-size: 13px; color: var(--dew-text-faint); }
.secret-value {
  flex: 1; padding: 6px 10px; border-radius: var(--radius-md, 8px);
  background: var(--dew-card-flat-bg, rgba(127, 127, 127, 0.08));
  font-family: var(--font-mono, monospace); font-size: 13px;
  overflow-wrap: anywhere;
}
.secret-value.small { font-size: 11px; }
.confirm-line { display: flex; gap: 12px; }
.code-input { width: 200px; }

.recovery-card { margin-top: 16px; }
.recovery-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 4px 0 14px;
}
.recovery-grid code {
  text-align: center; padding: 8px 0; border-radius: var(--radius-md, 8px);
  background: var(--dew-card-flat-bg, rgba(127, 127, 127, 0.08));
  font-family: var(--font-mono, monospace); font-size: 13px;
}
.recovery-actions { display: flex; gap: 8px; }
</style>
