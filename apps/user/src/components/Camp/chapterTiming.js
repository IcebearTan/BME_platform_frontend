const labels = {
  pending_submission: '待提交',
  pending_certification: '待认证',
  overdue_pending_submission: '已逾期·未提交',
  overdue_pending_certification: '已逾期·待认证',
  certified_on_time: '按时认证',
  certified_late: '逾期补认证',
  certified: '已认证',
  historical_certified: '历史已认证',
  not_required: '不要求本次认证',
};
const submissionLabels = {
  submitted_on_time: '材料按时提交',
  submitted_late: '材料逾期提交',
  submitted: '材料已提交',
  no_material: '认证时无留存材料',
};
export function timingLabel(timing, cert, materialCount = 0) {
  return labels[timing?.status] || (cert ? '已认证' : materialCount ? '已提交' : '未认证');
}
export function submissionLabel(timing) {
  return submissionLabels[timing?.submission_status] || '';
}
export function timingTitle(timing) {
  if (!timing) return '';
  const time = (value) => value?.slice(0, 19).replace('T', ' ');
  return [
    timing.due_at && `判定截止：${time(timing.due_at)}`,
    timing.first_submitted_at && `留存材料首次提交：${time(timing.first_submitted_at)}`,
    timing.certified_at && `认证时间：${time(timing.certified_at)}`,
    timing.status === 'historical_certified' && '缺少认证当时的截止记录，不判定是否逾期',
    submissionLabel(timing),
  ].filter(Boolean).join('\n');
}
