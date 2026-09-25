// 侧栏导航分区定义：一级只放业务域（P-01 同层同类）。
// icon 为 ICONS 注册表键名（路由 meta.icon 同用此表），组件在此处一次性 markRaw 收口。
import { markRaw } from 'vue'
import {
  Monitor, Clock, Document, OfficeBuilding, Setting, Cpu, SetUp,
  User, Grid, Tickets, DataLine, Folder, Key, Collection, FolderOpened,
  Picture, Bell, Trophy, ChatDotRound, ChatLineRound, List, Plus,
} from '@element-plus/icons-vue'

export const ICONS = {
  Monitor: markRaw(Monitor),
  Clock: markRaw(Clock),
  Document: markRaw(Document),
  OfficeBuilding: markRaw(OfficeBuilding),
  Setting: markRaw(Setting),
  Cpu: markRaw(Cpu),
  SetUp: markRaw(SetUp),
  User: markRaw(User),
  Grid: markRaw(Grid),
  Tickets: markRaw(Tickets),
  DataLine: markRaw(DataLine),
  Folder: markRaw(Folder),
  Key: markRaw(Key),
  Collection: markRaw(Collection),
  FolderOpened: markRaw(FolderOpened),
  Picture: markRaw(Picture),
  Bell: markRaw(Bell),
  Trophy: markRaw(Trophy),
  ChatDotRound: markRaw(ChatDotRound),
  ChatLineRound: markRaw(ChatLineRound),
  List: markRaw(List),
  Plus: markRaw(Plus),
}

// type=item 的分区是直达菜单项（工作台；只有一个子项的域不再折叠，如社团组织）
export const NAV_SECTIONS = [
  { type: 'item', key: 'workbench', path: '/', label: '工作台', icon: 'Monitor', order: 5 },
  { type: 'group', key: 'camps', label: '营期运营', icon: 'Clock', order: 10 },
  { type: 'group', key: 'content', label: '教学与内容', icon: 'Document', order: 20 },
  { type: 'item', key: 'organization', path: '/organization', label: '社团组织', icon: 'OfficeBuilding', order: 30 },
  { type: 'group', key: 'operations', label: '平台运营', icon: 'Setting', order: 40 },
  { type: 'group', key: 'apiPlatform', label: 'API 平台', icon: 'Cpu', order: 50 },
  { type: 'group', key: 'system', label: '系统与基础设施', icon: 'SetUp', order: 60 },
]

export const GROUP_LABELS = Object.fromEntries(
  NAV_SECTIONS.filter((s) => s.type === 'group').map((s) => [s.key, s.label])
)
