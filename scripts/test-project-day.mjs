import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectDayLabel, projectDayStatus, projectToday } from '../apps/user/src/domains/projects/projectDayStatus.js'

const project = { zero_date: '2026-10-16', status: 'active' }
const node = (fields = {}) => ({ title: '样机评审', source: 'milestone', kind: 'milestone', due_on: '2026-10-17', status: 'planned', ...fields })

test('仅从D0开始显示无正负号日数，启动前及未确认时不显示', () => {
  assert.equal(projectDayStatus(project, '2026-10-17').display, 'D1')
  assert.equal(projectDayStatus(project, '2026-10-17').tone, 'default')
  assert.equal(projectDayStatus(project, '2026-10-16').tone, 'launch')
  assert.equal(projectDayStatus(project, '2026-10-15').display, '')
  assert.equal(projectDayStatus(project, '2026-10-15').caption, '')
  assert.equal(projectDayStatus({}, '2026-10-17').display, '')
  assert.equal(projectDayLabel(0), 'D0')
  assert.equal(projectDayLabel(21), 'D21')
  assert.equal(projectDayLabel(-1), '')
  assert.equal(projectDayLabel(null), '')
})
test('只有当天有效关键节点触发强调色，普通记录和已取消节点不触发', () => {
  assert.equal(projectDayStatus(project, '2026-10-17', [node()]).tone, 'milestone')
  const ignored = [node({ status: 'cancelled' }), node({ due_on: '2026-10-18' }), node({ source: 'record', kind: 'record' })]
  assert.equal(projectDayStatus(project, '2026-10-17', ignored).tone, 'default')
})
test('本期考核使用橙色，结束关联和其他营期不触发本期提醒', () => {
  const assessment = node({ source: 'assessment', kind: 'assessment', binding_id: 7 })
  assert.equal(projectDayStatus(project, '2026-10-17', [node(), assessment], { id: 7, status: 'active' }).tone, 'assessment')
  assert.equal(projectDayStatus(project, '2026-10-17', [assessment], { id: 7, status: 'ended' }).tone, 'default')
  assert.equal(projectDayStatus(project, '2026-10-17', [assessment], { id: 8, status: 'active' }).tone, 'default')
})
test('完成日使用绿色，但有未完成的同日节点时保留节点提醒', () => {
  const completed = node({ due_on: '2026-10-15', actual_on: '2026-10-17', status: 'done' })
  assert.equal(projectDayStatus(project, '2026-10-17', [completed]).tone, 'complete')
  assert.equal(projectDayStatus(project, '2026-10-17', [completed, node()]).tone, 'milestone')
})
test('按项目时区识别跨午夜日期', () => {
  const timestamp = Date.parse('2026-10-16T16:01:00Z')
  assert.equal(projectToday('Asia/Shanghai', timestamp), '2026-10-17')
  assert.equal(projectToday('UTC', timestamp), '2026-10-16')
})
