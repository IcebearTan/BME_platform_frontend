<script setup>
// 平台更新日志页（/changelog）：版本发布说明的正式载体——不占用「关于我们」（那是开发团队介绍页）。
// 入口：页脚「关于我们」栏「更新日志」链接。新版本发布时在 VERSIONS 数组头部续写一条。
// 公告正本（含治理与部署备注）在平台 docs/记录/更新公告-*.md，本页是面向用户的展示版。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import { DewCard, DewTag } from '@bme/dew-ui'
import { Expand } from '@element-plus/icons-vue'

const VERSIONS = [
  {
    version: 'v3.4.1', date: '2026-10-02', current: true,
    items: [
      '外校成员名册核验：外校同学按名册邀请（邮箱控制领取）完成实名核验，不再要求本校学生邮箱。',
      '新增账号恢复申诉入口：遇到账号异常或丢失时，可提交恢复申诉——邮箱验证、冷静期与人工多重复核保障安全。',
      '首次登录会收到一次性的「完成实名核验」提醒（已核验或已提醒过不再打扰），点击直达身份中心。',
      '认领已有内容的账号后，该账号不再立即冻结：保留 14 天续办宽限期，方便完成数据交接。',
      '身份核验体验优化：提交申请后固定展示所填信息与审核进度，核验通过后显示固定标识、不再重复发起；管理端用户列表新增核验状态查看与筛选。',
      '社团工作区上线：面向全社的公告与讨论空间，全体在任干事自动获得、随任职变更自动开通或失效，管理端可按社团开通。',
      '通知直达优化：社区回复与点赞通知点击直达原帖；同一帖子的未读互动自动合并，不再逐条刷屏。',
      '工作台附件支持现代 Office 文档（docx / xlsx / pptx）；细节优化与问题修复若干。',
    ],
  },
  {
    version: 'v3.4', date: '2026-10-02', current: false,
    items: [
      '账号安全全面加固：修改密码、封禁等安全操作后，旧登录状态即时失效；登录验证码按用途隔离并限次防刷；敏感操作支持动态口令（TOTP）与恢复码（管理端已启用，用户端将陆续开放）。',
      '新增「身份与账号」中心（个人中心内）：凭本校个人学生邮箱完成实名核验，核验通过后参与正式营期活动更有保障；全程由负责人名册核对，邮箱验证码只发到你自己的邮箱。',
      '账号认领：如果你有早期用校园邮箱或其他方式注册的账号，可以在身份中心发起认领——双方账号验证通过后，空壳账号自动并入当前档案，学校身份一并归属，无需再找管理员手工处理。',
      '人员档案体系（内部）：平台开始按「人」而非仅按「账号」记录参与关系，同一人在同一营期只占一个正式名额，杜绝重复报名与重复发奖（当前为观察模式，不影响任何现有操作）。',
      '细节优化与问题修复若干。',
    ],
  },
  {
    version: 'v3.3', date: '2026-10-01', current: false,
    items: [
      '全新「内部工作台」上线（面向社团工作人员）：话题讨论、任务闭环（派活、执行、提交、验收）、转交确认、私有附件与跨组交付；待办中心集中处理需要你行动的事，截止与受阻自动提醒。普通学员不受影响，未获授权不会看到入口。',
      '权限自动开通：组归属或干事任职录入后自动获得工作台权限（附通知），卸任、调组、退组自动失效。',
      '组织架构页全新改版：左侧组织树常驻、右侧详情面板；成员以大卡展示并预留信息位，新增小组介绍。',
      '工作台新增「成员」看板：全社成员名录与检索，派活、邀请前先认人。',
      '修复：无头像用户的默认首字过小的问题，全站按头像大小等比显示。',
      '细节优化与问题修复若干。',
    ],
  },
]

const store = useStore()
const router = useRouter()
const isDarkMode = computed(() => store.getters.isDarkMode)

const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) isMobileMenuOpen.value = false
}
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value }
onMounted(() => window.addEventListener('resize', checkScreenSize))
onUnmounted(() => window.removeEventListener('resize', checkScreenSize))
</script>

<template>
  <div :class="['update-log-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <div class="page-header">
            <div class="page-title-row">
              <span class="title-accent"></span>
              <h1 class="page-title">更新日志</h1>
            </div>
            <p class="sub-title">平台每个版本带来了什么，都在这里；新版本发布后第一时间更新</p>
          </div>

          <DewCard v-for="v in VERSIONS" :key="v.version" size="lg" variant="flat" class="version-card">
            <div class="version-head">
              <span class="version-no">{{ v.version }}</span>
              <span class="version-date">{{ v.date }}</span>
              <DewTag v-if="v.current" type="primary" size="sm" round>当前版本</DewTag>
            </div>
            <ul class="version-items">
              <li v-for="(item, i) in v.items" :key="i">{{ item }}</li>
            </ul>
          </DewCard>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 根容器：极光背景对齐 ServiceHallView/规范单源；flat 卡为阅读场景 */
.update-log-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-attachment: fixed;
  transition: background 0.4s ease, color 0.3s ease;
}

.theme-light.update-log-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
  color: #303133;
}

.theme-dark.update-log-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
  color: #E5EAF3;
}

.header-container {
  padding: 0;
  height: auto;
  z-index: 100;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
}

.main-content {
  flex: 1;
  padding: 100px 20px 40px;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

.page-footer { padding: 0; height: auto; }

.content-wrapper { width: 100%; max-width: 860px; }

.page-header { margin-bottom: 24px; }
.page-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.title-accent {
  display: inline-block; width: 4px; height: 26px; border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}
.page-title { font-size: 28px; font-weight: 700; margin: 0; color: var(--dew-text-heading); }
.sub-title { font-size: 15px; margin: 0; color: var(--dew-text-muted); }

.version-card { margin-bottom: 18px; }
.version-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.version-no { font-size: 18px; font-weight: 700; color: var(--dew-text-heading); }
.version-date { font-size: 12.5px; color: var(--dew-text-muted); font-variant-numeric: tabular-nums; }
.version-items { margin: 0; padding-left: 20px; }
.version-items li { margin-bottom: 8px; font-size: 14px; line-height: 1.8; color: var(--dew-text); }

.mobile-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}
.hamburger-icon { font-size: 24px; cursor: pointer; }

@media (max-width: 768px) {
  .main-content { padding: 84px 14px 32px; }
  .page-title { font-size: 22px; }
}
</style>
