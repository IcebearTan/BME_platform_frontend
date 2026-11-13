import { computed, ref } from 'vue'
import { authSession } from '../api'
import { pointsService, formatPoints } from '../services/pointsService'

const summary = ref(null)
const loading = ref(false)
const failed = ref(false)
let owner = null
let pending = null
let refreshedAt = 0

function clear(token = null) {
  owner = token
  summary.value = null
  pending = null
  refreshedAt = 0
  failed.value = false
  loading.value = false
}
authSession.onChange(state => { if (state === 'anonymous') clear() })

export function usePoints() {
  if (owner !== authSession.getToken()) clear(authSession.getToken())
  function refresh(force = false) {
    const token = authSession.getToken()
    if (owner !== token) {
      clear(token)
    }
    if (!token) return Promise.resolve()
    if (pending) return pending
    if (!force && Date.now() - refreshedAt < 60000) return Promise.resolve()
    loading.value = true
    const request = pointsService.summary().then(({ data }) => {
      if (owner !== token) return
      summary.value = data
      failed.value = false
      refreshedAt = Date.now()
    }).catch(() => {
      if (owner === token) failed.value = true
    }).finally(() => {
      if (pending === request) { pending = null; loading.value = false }
    })
    pending = request
    return request
  }
  return { summary, loading, failed, refresh,
    balanceLabel: computed(() => formatPoints(summary.value?.balance)),
  }
}
