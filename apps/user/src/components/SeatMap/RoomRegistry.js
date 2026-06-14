import Room106Map from './rooms/Room106Map.vue'

/**
 * 房间注册表
 * - 每个房间：{ id, label, component, available }
 * - available:false（或 component 为空）的房间，由 SeatBoard 自动显示「暂未开发」占位
 * - 新增房间：写一个 rooms/RoomXXXMap.vue，在这里加一行即可
 */
export const rooms = [
  { id: '106', label: '106', component: Room106Map, available: true },
  { id: '112', label: '112', component: null, available: false },
  { id: 'B112', label: 'B112', component: null, available: false },
]

export const defaultRoomId = '106'
