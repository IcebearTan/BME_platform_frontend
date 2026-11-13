let sequence = 0

// 请求去重标识，不作为认证凭据；普通HTTP页面不依赖randomUUID。
export function createRequestKey() {
  const provider = globalThis.crypto
  if (typeof provider?.getRandomValues === 'function') {
    const bytes = provider.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  sequence += 1
  return `req-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2)}`
}
