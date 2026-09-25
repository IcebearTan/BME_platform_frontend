// 营期工作区上下文（设计方案 §11.2）：壳加载一次，16 个叶子共享——
// campId / 基本信息 / category / policy 能力开关 / 管理权限 / 选项数据。
// 叶子只取自己的业务数据，不重复拉营期基本信息（§11.3 数据加载原则）。
//
// provide/inject 而非模块 store：上下文必须随工作区实例创建与销毁（营→营跳转不残留）；
// useCampContext() 在壳外调用即 throw——错误的路由嵌套会立即在 e2e pageerror 现形。
import { computed, inject, ref } from 'vue'
import { useStore } from 'vuex'
import api from '../../../api'
import { setCampLabel } from './campLabel'
import { recordCampSnapshot } from './campCategoryCache'
import { statusLabel, statusType } from '../shared/statusText'

export const CAMP_CONTEXT = Symbol('camp-workspace-context')

// 选项数据（原 fetchOptions）：权限不足回空数组不阻断；in-flight 去重，整工作区只拉一次
function createCampOptions() {
  const allCourses = ref([])
  const medals = ref([])
  const physicalSeats = ref([])
  let inflight = { courses: null, medals: null, seats: null }

  async function ensureCourses() {
    if (!inflight.courses) {
      inflight.courses = api.get('/course/admin_list')
        .then((r) => { allCourses.value = r.data || [] })
        .catch(() => { allCourses.value = [] })
    }
    await inflight.courses
    return allCourses.value
  }

  async function ensureMedals() {
    if (!inflight.medals) {
      inflight.medals = api.get('/camp/medals')
        .then((r) => { medals.value = r.data?.medals || [] })
        .catch(() => { medals.value = [] })
    }
    await inflight.medals
    return medals.value
  }

  async function ensureSeats() {
    if (!inflight.seats) {
      inflight.seats = api.get('/seat/rooms/106/seats')
        .then((r) => { physicalSeats.value = r.data?.seats || [] })
        .catch(() => { physicalSeats.value = [] })
    }
    await inflight.seats
    return physicalSeats.value
  }

  function reset() {
    allCourses.value = []
    medals.value = []
    physicalSeats.value = []
    inflight = { courses: null, medals: null, seats: null }
  }

  return { allCourses, medals, physicalSeats, ensureCourses, ensureMedals, ensureSeats, reset }
}

export function createCampContext(campIdRef) {
  const store = useStore()

  const session = ref({})
  const loading = ref(false)
  const loadError = ref(null)
  const loaded = ref(false)
  let loadSeq = 0

  async function load() {
    const seq = ++loadSeq
    const id = campIdRef.value
    loading.value = true
    loadError.value = null
    try {
      const res = await api.get(`/camp/sessions/${id}`)
      if (seq !== loadSeq) return
      // 整体替换（非合并）：CampSettingsTab watch props.session 依赖引用替换重触发回填
      session.value = res.data?.session || {}
      loaded.value = true
      recordCampSnapshot(id, session.value.category, session.value.policy)
      setCampLabel(id, session.value.name || `营期 #${id}`)
    } catch (e) {
      if (seq !== loadSeq) return
      loadError.value = e
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  const campId = computed(() => Number(campIdRef.value))
  const status = computed(() => session.value.status)
  const category = computed(() => session.value.category)

  // 营期管理写操作 = 超管 且 营期未归档（管理端 staffOnly 已挡非管理员，归档营自动只读）
  const canManage = computed(() => store.getters.role === 'super_admin')
  const manageWritable = computed(() => canManage.value && status.value !== 'archived')
  const isSuperAdmin = canManage

  const isProject = computed(() => session.value.category === 'project')
  const isLearning = computed(() => session.value.category === 'learning')

  // 能力开关（v1.3）：旧数据无 policy 时回退开（与原 CampSessionDetail 口径一致）
  const capOn = (k) => session.value?.policy?.capabilities?.[k] ?? true
  // 等级门槛（回退值与类型默认一致：mentor 默认开、leader 默认关）
  const gateOn = (k) => {
    if (k === 'leader_level_gate') return session.value?.policy?.capabilities?.[k] ?? false
    return session.value?.policy?.capabilities?.[k] ?? true
  }
  // 考勤模式保存态只读派生（编辑器在设置叶，运行叶只读此口径）
  const attModeSaved = computed(() => {
    const caps = session.value.policy?.capabilities
    if (caps && caps.attendance === false) return 'off'
    return session.value.policy?.attendance_mode || 'daily'
  })

  return {
    campId, session, status, category, isProject, isLearning,
    canManage, manageWritable, isSuperAdmin,
    capOn, gateOn, attModeSaved,
    statusLabel, statusType,
    loading, loadError, loaded, load,
    options: createCampOptions(),
  }
}

export function useCampContext() {
  const ctx = inject(CAMP_CONTEXT)
  if (!ctx) {
    throw new Error('useCampContext() 必须在 CampWorkspaceShell 内使用——该页面应挂为 /camps/:campId 的子路由')
  }
  return ctx
}
