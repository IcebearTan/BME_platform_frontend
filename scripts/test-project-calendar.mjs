import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarKindText, editableCalendarKinds, calendarEntryStatus, calendarEntriesOnDate } from '../apps/user/src/domains/projects/projectCalendarEntries.js'

test('组会、启动日和已有记录分类可识别，派生事件不进入手动新增类型', () => {
  assert.equal(calendarKindText.meeting, '项目组会')
  assert.equal(calendarKindText.project_start, '项目启动')
  assert.ok(editableCalendarKinds.some(item => item.value === 'meeting'))
  assert.ok(!editableCalendarKinds.some(item => ['assessment', 'project_start'].includes(item.value)))
})

test('按业务状态显示组会与成果，不把待核验成果显示为计划节点', () => {
  assert.equal(calendarEntryStatus({ status: 'planned', status_label: '待核验' }), '待核验')
  assert.equal(calendarEntryStatus({ status: 'done', status_label: '冻结组会' }), '冻结组会')
  assert.equal(calendarEntryStatus({ status: 'planned' }), '计划中')
})

test('会议与节点按日期进入月历，同日计划和实际只显示一次', () => {
  const entries = [
    { key: 'camp_meeting:4', due_on: '2026-10-03', actual_on: null },
    { key: 'record:5', due_on: '2026-10-03', actual_on: '2026-10-03' },
    { key: 'event:6', due_on: '2026-10-02', actual_on: '2026-10-03' },
    { key: 'record:7', due_on: '2026-11-01', actual_on: null },
  ]
  assert.deepEqual(calendarEntriesOnDate(entries, '2026-10-03').map(item => item.key), ['camp_meeting:4', 'record:5', 'event:6'])
})
