<template>
  <div style="min-height: 100vh; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 25%, #fce7f3 55%, #d1fae5 100%);">
    <!-- 顶部菜单占位 -->
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div style="max-width: 960px; margin: 0 auto; padding: 32px 20px;">
      <!-- 页面标题 -->
      <div style="margin-bottom: 36px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="display: inline-block; width: 5px; height: 26px; border-radius: 3px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(255,255,255,0.35); border: 0.5px solid rgba(255,255,255,0.5); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset -1px 0 0 rgba(255,255,255,0.15), 0 0 6px rgba(255,255,255,0.2);"></span>
          <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;">Dew UI 组件库</h1>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin: 0; padding-left: 14px;">
          露珠 · 毛玻璃 · 柔和阴影 · 水滴弹性
        </p>
      </div>

      <!-- ━━━━ Button ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewButton 按钮</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton>默认玻璃</DewButton>
          <DewButton type="danger">危险按钮</DewButton>
          <DewButton type="ghost">幽灵按钮</DewButton>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">点亮状态</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton :active="lit1" @click="lit1 = !lit1">{{ lit1 ? '已点亮' : '点击点亮' }}</DewButton>
          <DewButton :active="lit2" @click="lit2 = !lit2">{{ lit2 ? '已点亮' : '点击点亮' }}</DewButton>
          <DewButton type="danger" :active="lit3" @click="lit3 = !lit3">{{ lit3 ? '已点亮' : '点击点亮' }}</DewButton>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton size="sm">小号</DewButton>
          <DewButton size="md">中号</DewButton>
          <DewButton size="lg">大号</DewButton>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">禁用 / 块级</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <DewButton :disabled="true">禁用</DewButton>
          <DewButton type="danger" :disabled="true">禁用危险</DewButton>
          <div style="max-width: 200px;">
            <DewButton :block="true">撑满宽度</DewButton>
          </div>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ ButtonBar ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewButtonBar 按钮栏</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 12px;">
          <DewButtonBar :items="barItems1" v-model="barValue1" />
          <DewButtonBar :items="barItems2" v-model="barValue2" size="sm" />
        </div>
        <div style="font-size: 12px; color: #9ca3af;">
          当前选中：{{ barValue1 }}
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Card 基础变体 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewCard 卡片 · 基础变体</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <DewCard variant="default">
            <template #header>Default 默认</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              标准卡片，柔和阴影 + 圆角。悬停轻微上浮，折射光跟随光标。
            </p>
          </DewCard>
          <DewCard variant="elevated">
            <template #header>Elevated 浮起</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              更强阴影和上浮距离，适合对话框、弹层等场景。
            </p>
          </DewCard>
          <DewCard variant="inset">
            <template #header>Inset 凹陷</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              内凹效果，悬停不上浮。适合嵌入在已有容器内的内容区域。
            </p>
          </DewCard>
          <DewCard :glass="true">
            <template #header>Glass 毛玻璃</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              更强模糊 + 透明度，在渐变或图片背景上效果出众。
            </p>
          </DewCard>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Card 尺寸 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewCard 卡片 · 尺寸</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard size="sm">
            <template #header>Small</template>
            <p style="font-size: 12px; color: #6b7280; margin: 0;">紧凑内边距，适合标签组、小面板。</p>
          </DewCard>
          <DewCard size="md">
            <template #header>Medium</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0;">默认尺寸，平衡可读性和紧凑度。</p>
          </DewCard>
          <DewCard size="lg">
            <template #header>Large</template>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">宽松内边距，适合大段文本或表单。</p>
          </DewCard>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Card 色彩底色 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewCard 卡片 · 色彩底色</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard :tinted="true" accent="primary" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #3b82f6; line-height: 1;">128</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">课程总数</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="success" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #22c55e; line-height: 1;">96</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">已完成</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="danger" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #ef4444; line-height: 1;">5</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">待处理</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="warning" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b; line-height: 1;">12</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">即将截止</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="info" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #06b6d4; line-height: 1;">3</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">新通知</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #8b5cf6; line-height: 1;">A+</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">平均绩点</div>
            </div>
          </DewCard>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Card 可交互 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewCard 卡片 · 可交互</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard :interactive="true" @click="cardClicked('课程')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(59,130,246,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Document style="width: 20px; height: 20px; color: #3b82f6;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">我的课程</div>
                <div style="font-size: 12px; color: #9ca3af;">本学期 6 门课程</div>
              </div>
            </div>
          </DewCard>
          <DewCard :interactive="true" @click="cardClicked('作业')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245,158,11,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Bell style="width: 20px; height: 20px; color: #f59e0b;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">待交作业</div>
                <div style="font-size: 12px; color: #9ca3af;">3 份作业待提交</div>
              </div>
            </div>
          </DewCard>
          <DewCard :interactive="true" :tinted="true" accent="success" :glass="true" @click="cardClicked('成绩')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(34,197,94,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Check style="width: 20px; height: 20px; color: #22c55e;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">成绩查询</div>
                <div style="font-size: 12px; color: #9ca3af;">查看本学期成绩</div>
              </div>
            </div>
          </DewCard>
        </div>
        <div v-if="clickedCard" style="margin-top: 12px; font-size: 13px; color: #6b7280;">
          点击了：<strong style="color: #3b82f6;">{{ clickedCard }}</strong>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Card 完整结构 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewCard 卡片 · 完整结构</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <DewCard>
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>无分割线（默认）</span>
                <DewBadge :value="3" type="danger" />
              </div>
            </template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              Header 下方没有分割线，更通透清爽。
            </p>
            <template #footer>
              <DewButton size="sm">确认</DewButton>
              <DewButton type="ghost" size="sm">取消</DewButton>
            </template>
          </DewCard>
          <DewCard :divided="true">
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>带分割线（divided）</span>
                <DewBadge :value="3" type="danger" />
              </div>
            </template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              设置 divided 后 Header 底部显示淡色分割线，层次更分明。
            </p>
            <template #footer>
              <DewButton size="sm">确认</DewButton>
              <DewButton type="ghost" size="sm">取消</DewButton>
            </template>
          </DewCard>
          <DewCard :glass="true">
            <template #header>毛玻璃 · 无分割线</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              毛玻璃模式 + 无分割线，内容浑然一体。
            </p>
            <template #footer>
              <DewButton type="danger" size="sm">删除</DewButton>
            </template>
          </DewCard>
          <DewCard :glass="true" :divided="true">
            <template #header>毛玻璃 · 带分割线</template>
            <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
              毛玻璃 + 分割线，适合内容层级较多的场景。
            </p>
            <template #footer>
              <DewButton type="danger" size="sm">删除</DewButton>
            </template>
          </DewCard>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Badge ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewBadge 徽标</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
          <DewBadge :value="3" type="primary" />
          <DewBadge :value="12" type="success" />
          <DewBadge :value="99" type="warning" />
          <DewBadge :value="5" type="danger" />
          <DewBadge :value="new" type="info" />
          <DewBadge type="neutral">已读</DewBadge>
        </div>
        <div style="display: flex; gap: 16px; align-items: center;">
          <div style="position: relative; display: inline-flex;">
            <span style="font-size: 14px; color: #374151;">消息</span>
            <DewBadge :value="6" type="danger" style="position: absolute; top: -8px; right: -20px;" />
          </div>
          <div style="position: relative; display: inline-flex;">
            <span style="font-size: 14px; color: #374151;">通知</span>
            <DewBadge :value="23" type="warning" style="position: absolute; top: -8px; right: -24px;" />
          </div>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ Tag ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">DewTag 标签</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px;">
          <DewTag type="primary">任务</DewTag>
          <DewTag type="success">已完成</DewTag>
          <DewTag type="warning">待审核</DewTag>
          <DewTag type="danger">紧急</DewTag>
          <DewTag type="info">信息</DewTag>
          <DewTag type="neutral">草稿</DewTag>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">圆角</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px;">
          <DewTag type="primary" :round="true">任务</DewTag>
          <DewTag type="success" :round="true">已完成</DewTag>
          <DewTag type="warning" :round="true">待审核</DewTag>
          <DewTag type="danger" :round="true">紧急</DewTag>
          <DewTag type="info" :round="true">信息</DewTag>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <DewTag type="primary" size="sm">小号</DewTag>
          <DewTag type="primary" size="md">中号</DewTag>
          <DewTag type="success" size="sm" :round="true">小圆</DewTag>
          <DewTag type="success" size="md" :round="true">中圆</DewTag>
        </div>
      </section>

      <hr style="border: none; height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 36px;" />

      <!-- ━━━━ 组合示例 ━━━━ -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 14px;">组合示例</h2>
        <DewCard>
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>课程通知</span>
              <DewBadge :value="5" type="danger" />
            </div>
          </template>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.3); border-radius: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center;">
                <Document style="width: 18px; height: 18px; color: #3b82f6;" />
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px; font-weight: 600; color: #1f2937;">新作业发布</span>
                  <DewTag type="primary" size="sm">作业</DewTag>
                </div>
                <span style="font-size: 13px; color: #9ca3af;">生物材料学 · 2 小时前</span>
              </div>
              <DewButton type="ghost" size="sm">查看</DewButton>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.3); border-radius: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center;">
                <Check style="width: 18px; height: 18px; color: #22c55e;" />
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px; font-weight: 600; color: #1f2937;">作业已批改</span>
                  <DewTag type="success" size="sm">已批改</DewTag>
                </div>
                <span style="font-size: 13px; color: #9ca3af;">医学影像原理 · 昨天</span>
              </div>
              <DewButton type="ghost" size="sm">查看</DewButton>
            </div>
          </div>
        </DewCard>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MenuComponent from '../components/MenuComponent.vue'
import DewButton from '../components/ui/DewButton.vue'
import DewButtonBar from '../components/ui/DewButtonBar.vue'
import DewCard from '../components/ui/DewCard.vue'
import DewBadge from '../components/ui/DewBadge.vue'
import DewTag from '../components/ui/DewTag.vue'
import { Document, Check, Bell, User, Setting } from '@element-plus/icons-vue'

const lit1 = ref(false)
const lit2 = ref(true)
const lit3 = ref(false)

// ButtonBar 数据
const barValue1 = ref('all')
const barItems1 = [
  { value: 'all', label: '全部', icon: Bell },
  { value: 'group', label: '小组', icon: User, badge: 5 },
  { value: 'system', label: '系统', icon: Setting },
]

const barValue2 = ref('task')
const barItems2 = [
  { value: 'task', label: '任务' },
  { value: 'homework', label: '作业', badge: 3 },
  { value: 'leave', label: '请假' },
]

// Card 交互
const clickedCard = ref(null)
function cardClicked(name) {
  clickedCard.value = name
}
</script>
