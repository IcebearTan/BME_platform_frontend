<template>
  <section class="pwa"><p>结营冻结记录 · 只读</p><template v-if="section === 'members'"><div v-for="(member, i) in unit.members" :key="i" class="pwa-row"><span>{{ member.user }}</span><span>{{ member.role === 'leader' ? '负责人' : '成员' }}{{ member.status === 'ended' ? ' · 已退出' : '' }}</span></div></template><template v-else-if="section === 'outcomes'"><p v-if="!unit.verified_outcomes?.length">无已核验成果</p><article v-for="(outcome, i) in unit.verified_outcomes" :key="i"><h3>{{ outcome.title }}</h3><p>{{ outcome.description }}</p></article></template><template v-else><p v-if="!unit.milestones?.length">档案中没有交付节点记录</p><article v-for="(node, i) in unit.milestones" :key="i"><h3>{{ node.title }} · {{ node.node_complete || node.status === 'approved' ? '已完成' : '未完成' }}</h3><p>截止 {{ node.due_date || '未设置' }}</p><p v-for="(evaluation, index) in node.evaluations || []" :key="index">{{ evaluation.name || `成员 ${evaluation.member_user_id}` }} · {{ evaluation.score }}分 · {{ evaluation.comment }}</p></article></template></section>
</template>
<script setup>
defineProps({ unit: Object, section: String })
</script>
<style scoped>
.pwa { color: var(--dew-text); }.pwa > p { color: var(--dew-text-muted); font-size: 13px; }.pwa article { border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; }.pwa article h3 { font-size: 15px; }.pwa-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--dew-card-flat-border); }
</style>
