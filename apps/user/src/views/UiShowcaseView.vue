<template>
  <div style="min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);">
    <!-- 顶部菜单占位 -->
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div style="max-width: 960px; margin: 0 auto; padding: 32px 20px;">
      <!-- 页面标题 -->
      <div style="margin-bottom: 40px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="display: inline-block; width: 4px; height: 24px; border-radius: 2px; background: linear-gradient(180deg, #3b82f6, #8b5cf6);"></span>
          <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;">BME UI 组件库</h1>
        </div>
        <p style="font-size: 14px; color: #9ca3af; margin: 0; padding-left: 14px;">
          圆润 · 毛玻璃 · 柔和阴影 · 现代控件风格
        </p>
      </div>

      <!-- ━━━━ Button ━━━━ -->
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 16px;">BmeButton 按钮</h2>

        <!-- 类型 -->
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 30%, #fce7f3 60%, #d1fae5 100%); border-radius: 16px; padding: 28px 24px;">
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">类型变体</div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <BmeButton>默认玻璃</BmeButton>
            <BmeButton type="danger">危险按钮</BmeButton>
            <BmeButton type="ghost">幽灵按钮</BmeButton>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">点亮状态（可交互）</div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <BmeButton :active="lit1" @click="lit1 = !lit1">{{ lit1 ? '已点亮' : '点击点亮' }}</BmeButton>
            <BmeButton :active="lit2" @click="lit2 = !lit2">{{ lit2 ? '已点亮' : '点击点亮' }}</BmeButton>
            <BmeButton type="danger" :active="lit3" @click="lit3 = !lit3">{{ lit3 ? '已点亮' : '点击点亮' }}</BmeButton>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">尺寸</div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <BmeButton size="sm">小号</BmeButton>
            <BmeButton size="md">中号</BmeButton>
            <BmeButton size="lg">大号</BmeButton>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">禁用</div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <BmeButton :disabled="true">禁用默认</BmeButton>
            <BmeButton type="active" :disabled="true">禁用点亮</BmeButton>
            <BmeButton type="danger" :disabled="true">禁用危险</BmeButton>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">块级按钮</div>
          <div style="max-width: 320px;">
            <BmeButton :block="true">撑满宽度</BmeButton>
          </div>
        </div>
      </div>

      <!-- ━━━━ Card ━━━━ -->
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 16px;">BmeCard 卡片</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <!-- 基础卡片 -->
          <BmeCard>
            <template #header>基础卡片</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              这是默认的卡片样式，带有柔和阴影和圆角，适合大多数内容展示场景。
            </p>
          </BmeCard>

          <!-- 毛玻璃卡片 -->
          <BmeCard :glass="true">
            <template #header>毛玻璃卡片</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              半透明背景 + 高斯模糊效果，在有渐变或图片的背景上效果最佳。
            </p>
          </BmeCard>

          <!-- 带底部 -->
          <BmeCard>
            <template #header>完整结构</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              卡片支持 header、body、footer 三个插槽，灵活组织内容。
            </p>
            <template #footer>
              <div style="display: flex; gap: 8px;">
                <BmeButton type="primary" size="sm">确认</BmeButton>
                <BmeButton type="ghost" size="sm">取消</BmeButton>
              </div>
            </template>
          </BmeCard>

          <!-- 纯内容卡片 -->
          <BmeCard>
            <div style="text-align: center; padding: 12px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #3b82f6; line-height: 1;">128</div>
              <div style="font-size: 13px; color: #9ca3af; margin-top: 6px;">今日活跃用户</div>
            </div>
          </BmeCard>
        </div>
      </div>

      <!-- ━━━━ Badge ━━━━ -->
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 16px;">BmeBadge 徽标</h2>
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 30%, #fce7f3 60%, #d1fae5 100%); border-radius: 16px; padding: 28px 24px;">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
            <BmeBadge :value="3" type="primary" />
            <BmeBadge :value="12" type="success" />
            <BmeBadge :value="99" type="warning" />
            <BmeBadge :value="5" type="danger" />
            <BmeBadge :value="new" type="info" />
            <BmeBadge type="neutral">已读</BmeBadge>
          </div>
          <div style="font-size: 13px; color: #9ca3af; margin-top: 16px;">搭配卡片使用</div>
          <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
            <div style="position: relative; display: inline-flex;">
              <span style="font-size: 14px; color: #374151;">消息</span>
              <BmeBadge :value="6" type="danger" style="position: absolute; top: -8px; right: -20px;" />
            </div>
            <div style="position: relative; display: inline-flex;">
              <span style="font-size: 14px; color: #374151;">通知</span>
              <BmeBadge :value="23" type="warning" style="position: absolute; top: -8px; right: -24px;" />
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━━ Tag ━━━━ -->
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 16px;">BmeTag 标签</h2>
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 30%, #fce7f3 60%, #d1fae5 100%); border-radius: 16px; padding: 28px 24px;">
          <div style="font-size: 13px; color: #9ca3af; margin-bottom: 14px;">类型</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <BmeTag type="primary">任务</BmeTag>
            <BmeTag type="success">已完成</BmeTag>
            <BmeTag type="warning">待审核</BmeTag>
            <BmeTag type="danger">紧急</BmeTag>
            <BmeTag type="info">信息</BmeTag>
            <BmeTag type="neutral">草稿</BmeTag>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">圆角标签</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <BmeTag type="primary" :round="true">任务</BmeTag>
            <BmeTag type="success" :round="true">已完成</BmeTag>
            <BmeTag type="warning" :round="true">待审核</BmeTag>
            <BmeTag type="danger" :round="true">紧急</BmeTag>
            <BmeTag type="info" :round="true">信息</BmeTag>
          </div>

          <div style="font-size: 13px; color: #9ca3af; margin: 20px 0 14px;">尺寸</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <BmeTag type="primary" size="sm">小号</BmeTag>
            <BmeTag type="primary" size="md">中号</BmeTag>
            <BmeTag type="success" size="sm" :round="true">小圆</BmeTag>
            <BmeTag type="success" size="md" :round="true">中圆</BmeTag>
          </div>
        </div>
      </div>

      <!-- ━━━━ 组合示例 ━━━━ -->
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 16px;">组合示例</h2>
        <BmeCard>
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>课程通知</span>
              <BmeBadge :value="5" type="danger" />
            </div>
          </template>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--color-bg-soft); border-radius: var(--radius-sm);">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--color-primary-light); display: flex; align-items: center; justify-content: center;">
                <Document style="width: 18px; height: 18px; color: var(--color-primary);" />
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px; font-weight: 600; color: #1f2937;">新作业发布</span>
                  <BmeTag type="primary" size="sm">作业</BmeTag>
                </div>
                <span style="font-size: 13px; color: #9ca3af;">生物材料学 · 2 小时前</span>
              </div>
              <BmeButton type="ghost" size="sm">查看</BmeButton>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--color-bg-soft); border-radius: var(--radius-sm);">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--color-success-light); display: flex; align-items: center; justify-content: center;">
                <Check style="width: 18px; height: 18px; color: var(--color-success);" />
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px; font-weight: 600; color: #1f2937;">作业已批改</span>
                  <BmeTag type="success" size="sm">已批改</BmeTag>
                </div>
                <span style="font-size: 13px; color: #9ca3af;">医学影像原理 · 昨天</span>
              </div>
              <BmeButton type="ghost" size="sm">查看</BmeButton>
            </div>
          </div>
        </BmeCard>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MenuComponent from '../components/MenuComponent.vue'
import BmeButton from '../components/ui/BmeButton.vue'
import BmeCard from '../components/ui/BmeCard.vue'
import BmeBadge from '../components/ui/BmeBadge.vue'
import BmeTag from '../components/ui/BmeTag.vue'
import { Document, Check } from '@element-plus/icons-vue'

const lit1 = ref(false)
const lit2 = ref(true)
const lit3 = ref(false)
</script>
