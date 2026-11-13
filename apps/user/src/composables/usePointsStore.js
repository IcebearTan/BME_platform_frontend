import { ref } from 'vue';
import { DewMessageBox } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import api from '../api';

// 积分商城 SSO：后端换 90 秒一次性 ticket → 顶层表单 POST 到商城 /sso/callback。
// ticket 不缓存、不进 URL/localStorage；失败由用户重新点击换新票。401 交由共享
// 客户端统一处理（跳登录/续期），此处不重复弹错。
const pointsStoreLoading = ref(false);

const openPointsStore = async () => {
  if (pointsStoreLoading.value) return;
  pointsStoreLoading.value = true;
  let form = null;
  const restrictedMessage = '请先到「个人中心 → 身份中心」完成中大教育邮箱验证及审核，再进入积分商城。';
  try {
    // 普通登录邮箱也可能已完成教育邮箱核验，资格统一由后端实时判断。
    const { data } = await api({ url: '/points-sso/ticket', method: 'post' });
    if (data?.code !== 200 || typeof data.ticket !== 'string' || !data.ticket.trim()) {
      throw new Error('积分商城返回异常，请稍后重试');
    }
    // 商城地址来自后端受控配置；此处只挡格式异常（协议/凭据/查询串/路径）
    if (typeof data.store_callback_url !== 'string') {
      throw new Error('积分商城地址配置异常');
    }
    const callback = new URL(data.store_callback_url);
    if (!['http:', 'https:'].includes(callback.protocol) || callback.username || callback.password ||
        callback.pathname !== '/sso/callback' || callback.search || callback.hash) {
      throw new Error('积分商城地址配置异常');
    }
    form = document.createElement('form');
    form.method = 'POST';
    form.action = callback.href;
    form.target = '_self';
    form.hidden = true;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'ticket';
    input.value = data.ticket;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  } catch (e) {
    if (e?.response?.data?.error_code === 'EMAIL_DOMAIN') {
      await DewMessageBox.alert(restrictedMessage, '积分商城', { confirmText: '我知道了' });
    } else if (['POINTS_ACCOUNT_UNAVAILABLE', 'POINTS_IDENTITY_UNAVAILABLE',
      'POINTS_IDENTITY_AMBIGUOUS', 'POINTS_BINDING_CONFLICT'].includes(e?.response?.data?.error_code)) {
      await DewMessageBox.alert(e.response.data.message || '账号关联异常，请联系管理员核对。', '积分商城', { confirmText: '我知道了' });
    } else if (e?.response?.data?.error_code === 'POINTS_DISABLED') {
      await DewMessageBox.alert('积分商城暂未开放，请稍后再试。', '积分商城', { confirmText: '我知道了' });
    } else if (e?.response?.status !== 401) {
      ElMessage.error(e?.response?.data?.message || e.message || '跳转积分商城失败，请稍后重试');
    }
  } finally {
    form?.remove();
    pointsStoreLoading.value = false;
  }
};


export function usePointsStore() { return { pointsStoreLoading, openPointsStore }; }
