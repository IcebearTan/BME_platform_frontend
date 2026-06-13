<template>
  <div :class="['dew-showcase', isDark ? 'dew-showcase--dark' : 'dew-showcase--light', isDark ? 'theme-dark' : 'theme-light']" style="min-height: 100vh;">
    <!-- 顶部菜单占位 -->
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div style="max-width: 960px; margin: 0 auto; padding: 32px 20px;">
      <!-- 页面标题 -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-block; width: 5px; height: 26px; border-radius: 3px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(255,255,255,0.35); border: 0.5px solid rgba(255,255,255,0.5); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset -1px 0 0 rgba(255,255,255,0.15), 0 0 6px rgba(255,255,255,0.2);"></span>
            <h1 class="dew-showcase__title">Dew UI 组件库</h1>
          </div>
          <!-- 明暗切换 -->
          <DewSwitch v-model="isDark" size="md" />
        </div>
        <p class="dew-showcase__subtitle" style="padding-left: 14px;">
          露珠 · 毛玻璃 · 柔和阴影 · 水滴弹性
        </p>
      </div>

      <!-- 组件导航 -->
      <div style="margin-bottom: 28px; display: flex; flex-wrap: wrap; gap: 10px;">
        <DewButtonBar :items="navItems" v-model="activeTab" size="sm" />
      </div>

      <!-- ━━━━ Button ━━━━ -->
      <section v-if="activeTab === 'button'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewButton 按钮</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton>默认玻璃</DewButton>
          <DewButton type="danger">危险按钮</DewButton>
          <DewButton type="ghost">幽灵按钮</DewButton>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">点亮状态</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton :active="lit1" @click="lit1 = !lit1">{{ lit1 ? '已点亮' : '点击点亮' }}</DewButton>
          <DewButton :active="lit2" @click="lit2 = !lit2">{{ lit2 ? '已点亮' : '点击点亮' }}</DewButton>
          <DewButton type="danger" :active="lit3" @click="lit3 = !lit3">{{ lit3 ? '已点亮' : '点击点亮' }}</DewButton>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px;">
          <DewButton size="sm">小号</DewButton>
          <DewButton size="md">中号</DewButton>
          <DewButton size="lg">大号</DewButton>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">禁用 / 块级</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <DewButton :disabled="true">禁用</DewButton>
          <DewButton type="danger" :disabled="true">禁用危险</DewButton>
          <div style="max-width: 200px;">
            <DewButton :block="true">撑满宽度</DewButton>
          </div>
        </div>
      </section>

      <!-- ━━━━ ButtonBar ━━━━ -->
      <section v-if="activeTab === 'bar'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewButtonBar 按钮栏</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 12px;">
          <DewButtonBar :items="barItems1" v-model="barValue1" />
          <DewButtonBar :items="barItems2" v-model="barValue2" size="sm" />
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint);">
          当前选中：{{ barValue1 }}
        </div>
      </section>

      <!-- ━━━━ Switch ━━━━ -->
      <section v-if="activeTab === 'switch'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewSwitch 开关</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 16px;">
          <DewSwitch v-model="switchVal1" />
          <DewSwitch v-model="switchVal2" />
          <DewSwitch :disabled="true" />
          <DewSwitch :disabled="true" :model-value="true" />
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 16px;">
          <DewSwitch v-model="switchVal3" size="sm" />
          <DewSwitch v-model="switchVal3" size="md" />
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint);">
          状态：{{ switchVal1 ? '开启' : '关闭' }} · {{ switchVal3 ? '同步开启' : '同步关闭' }}
        </div>
      </section>

      <!-- ━━━━ Input ━━━━ -->
      <section v-if="activeTab === 'input'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewInput 输入框</h2>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">基础</div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
          <div style="width: 220px;">
            <DewInput v-model="inputVal1" placeholder="请输入内容..." />
          </div>
          <div style="width: 220px;">
            <DewInput v-model="inputVal2" placeholder="带前缀图标" :prefix-icon="Search" />
          </div>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
          <div style="width: 180px;">
            <DewInput v-model="inputVal3" placeholder="小号" size="sm" />
          </div>
          <div style="width: 180px;">
            <DewInput v-model="inputVal3" placeholder="中号" size="md" />
          </div>
          <div style="width: 180px;">
            <DewInput v-model="inputVal3" placeholder="大号" size="lg" />
          </div>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">可清除 / 密码 / 错误态</div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
          <div style="width: 220px;">
            <DewInput v-model="inputVal4" placeholder="输入后可清除" clearable />
          </div>
          <div style="width: 220px;">
            <DewInput v-model="inputVal5" placeholder="请输入密码" type="password" :prefix-icon="Lock" />
          </div>
          <div style="width: 220px;">
            <DewInput model-value="错误的内容" placeholder="错误态" error />
          </div>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">禁用</div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px;">
          <div style="width: 220px;">
            <DewInput model-value="不可编辑" disabled />
          </div>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">后缀图标 / 全圆角 / 聚焦展开</div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
          <div style="width: 220px;">
            <DewInput v-model="inputVal1" placeholder="后缀图标" :suffix-icon="Search" />
          </div>
          <div style="width: 220px;">
            <DewInput v-model="inputVal2" placeholder="全圆角搜索..." :prefix-icon="Search" clearable round />
          </div>
          <div>
            <DewInput v-model="inputVal1" placeholder="点击展开..." :prefix-icon="Search" expand-on-focus />
          </div>
        </div>
      </section>

      <!-- ━━━━ Card 基础变体 ━━━━ -->
      <section v-if="activeTab === 'card'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewCard 卡片 · 基础变体</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <DewCard variant="default">
            <template #header>Default 默认</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              标准卡片，柔和阴影 + 圆角。悬停轻微上浮，折射光跟随光标。
            </p>
          </DewCard>
          <DewCard variant="elevated">
            <template #header>Elevated 浮起</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              更强阴影和上浮距离，适合对话框、弹层等场景。
            </p>
          </DewCard>
          <DewCard variant="inset">
            <template #header>Inset 凹陷</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              内凹效果，悬停不上浮。适合嵌入在已有容器内的内容区域。
            </p>
          </DewCard>
          <DewCard :glass="true">
            <template #header>Glass 毛玻璃</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              更强模糊 + 透明度，在渐变或图片背景上效果出众。
            </p>
          </DewCard>
        </div>
      </section>

      <!-- ━━━━ Card 尺寸 ━━━━ -->
      <section v-if="activeTab === 'card'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewCard 卡片 · 尺寸</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard size="sm">
            <template #header>Small</template>
            <p style="font-size: 12px; color: var(--dew-text-muted); margin: 0;">紧凑内边距，适合标签组、小面板。</p>
          </DewCard>
          <DewCard size="md">
            <template #header>Medium</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0;">默认尺寸，平衡可读性和紧凑度。</p>
          </DewCard>
          <DewCard size="lg">
            <template #header>Large</template>
            <p style="font-size: 14px; color: var(--dew-text-muted); margin: 0;">宽松内边距，适合大段文本或表单。</p>
          </DewCard>
        </div>
      </section>

      <!-- ━━━━ Card 色彩底色 ━━━━ -->
      <section v-if="activeTab === 'card'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewCard 卡片 · 色彩底色</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard :tinted="true" accent="primary" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #3b82f6; line-height: 1;">128</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">课程总数</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="success" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #22c55e; line-height: 1;">96</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">已完成</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="danger" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #ef4444; line-height: 1;">5</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">待处理</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="warning" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b; line-height: 1;">12</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">即将截止</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" accent="info" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #06b6d4; line-height: 1;">3</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">新通知</div>
            </div>
          </DewCard>
          <DewCard :tinted="true" :glass="true">
            <div style="text-align: center; padding: 8px 0;">
              <div style="font-size: 28px; font-weight: 700; color: #8b5cf6; line-height: 1;">A+</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); margin-top: 6px;">平均绩点</div>
            </div>
          </DewCard>
        </div>
      </section>

      <!-- ━━━━ Card 可交互 ━━━━ -->
      <section v-if="activeTab === 'card'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewCard 卡片 · 可交互</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <DewCard :interactive="true" @click="cardClicked('课程')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(59,130,246,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Document style="width: 20px; height: 20px; color: #3b82f6;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--dew-text-heading);">我的课程</div>
                <div style="font-size: 12px; color: var(--dew-text-faint);">本学期 6 门课程</div>
              </div>
            </div>
          </DewCard>
          <DewCard :interactive="true" @click="cardClicked('作业')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245,158,11,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Bell style="width: 20px; height: 20px; color: #f59e0b;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--dew-text-heading);">待交作业</div>
                <div style="font-size: 12px; color: var(--dew-text-faint);">3 份作业待提交</div>
              </div>
            </div>
          </DewCard>
          <DewCard :interactive="true" :tinted="true" accent="success" :glass="true" @click="cardClicked('成绩')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(34,197,94,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <Check style="width: 20px; height: 20px; color: #22c55e;" />
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--dew-text-heading);">成绩查询</div>
                <div style="font-size: 12px; color: var(--dew-text-faint);">查看本学期成绩</div>
              </div>
            </div>
          </DewCard>
        </div>
        <div v-if="clickedCard" style="margin-top: 12px; font-size: 13px; color: var(--dew-text-muted);">
          点击了：<strong style="color: #3b82f6;">{{ clickedCard }}</strong>
        </div>
      </section>

      <!-- ━━━━ Card 完整结构 ━━━━ -->
      <section v-if="activeTab === 'card'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewCard 卡片 · 完整结构</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <DewCard>
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>无分割线（默认）</span>
                <DewBadge :value="3" type="danger" />
              </div>
            </template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
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
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              设置 divided 后 Header 底部显示淡色分割线，层次更分明。
            </p>
            <template #footer>
              <DewButton size="sm">确认</DewButton>
              <DewButton type="ghost" size="sm">取消</DewButton>
            </template>
          </DewCard>
          <DewCard :glass="true">
            <template #header>毛玻璃 · 无分割线</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              毛玻璃模式 + 无分割线，内容浑然一体。
            </p>
            <template #footer>
              <DewButton type="danger" size="sm">删除</DewButton>
            </template>
          </DewCard>
          <DewCard :glass="true" :divided="true">
            <template #header>毛玻璃 · 带分割线</template>
            <p style="font-size: 13px; color: var(--dew-text-muted); margin: 0; line-height: 1.6;">
              毛玻璃 + 分割线，适合内容层级较多的场景。
            </p>
            <template #footer>
              <DewButton type="danger" size="sm">删除</DewButton>
            </template>
          </DewCard>
        </div>
      </section>

      <!-- ━━━━ Popover ━━━━ -->
      <section v-if="activeTab === 'popover'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewPopover 浮层</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
          <DewPopover v-model="popoverVisible" placement="bottom">
            <template #trigger>
              <DewButton>点击弹出 Popover</DewButton>
            </template>
            <div style="padding: 16px; min-width: 200px;">
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">用户信息</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); line-height: 1.6;">
                这是一个纯色 iOS 风格的浮层面板，支持箭头、点击外部关闭和视口翻转。
              </div>
            </div>
          </DewPopover>
        </div>
      </section>

      <hr v-if="activeTab === 'popover' || activeTab === 'dropdown'" style="border: none; height: 1px; margin: 0 0 36px;" />

      <!-- ━━━━ Dropdown ━━━━ -->
      <section v-if="activeTab === 'dropdown'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewDropdown 下拉菜单</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 16px;">
          <DewDropdown v-model="dropdownVisible1" :items="dropdownItems1" @select="dropdownSelected = $event">
            <template #trigger>
              <DewButton type="ghost" size="sm">
                <el-icon style="margin-right: 4px;"><MoreFilled /></el-icon>
                操作菜单
              </DewButton>
            </template>
          </DewDropdown>
          <DewDropdown v-model="dropdownVisible2" :items="dropdownItems2" @select="dropdownSelected = $event">
            <template #trigger>
              <DewButton type="ghost" size="sm">
                <el-icon style="margin-right: 4px;"><User /></el-icon>
                用户菜单
              </DewButton>
            </template>
          </DewDropdown>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint);">
          选中操作：{{ dropdownSelected || '无' }}
        </div>
      </section>

      <hr v-if="activeTab === 'dropdown'" style="border: none; height: 1px; margin: 0 0 36px;" />

      <!-- ━━━━ Island ━━━━ -->
      <section v-if="activeTab === 'island'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 6px;">DewIsland 浮岛</h2>
        <p style="font-size: 12px; color: var(--dew-text-faint); margin: 0 0 18px;">
          点击胶囊展开液态玻璃浮岛，水滴弹性向下绽放；点击空白处收起。
        </p>

        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 10px;">点亮胶囊触发器（学习中态）</div>
        <div style="text-align: center; padding: 36px 0; margin-bottom: 24px; background: rgba(127,127,127,0.06); border-radius: 14px;">
          <DewIsland v-model="islandOpen" :panel-width="320">
            <template #trigger>
              <DewButton :active="true" size="lg">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;animation:dew-island-pulse 2s infinite;"></span>
                学习中 02:15:33
              </DewButton>
            </template>
            <div style="padding: 16px;">
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--dew-text-heading);">106 自习室实况</div>
              <div style="font-size: 13px; color: var(--dew-text-muted); line-height: 1.6;">
                展开态内容。浮岛居中于触发器、向下绽放。点击面板内不会收起，点击外部空白才会收起。
              </div>
            </div>
          </DewIsland>
        </div>

        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 10px;">幽灵胶囊触发器 + 自定义宽度</div>
        <div style="text-align: center; padding: 36px 0; background: rgba(127,127,127,0.06); border-radius: 14px;">
          <DewIsland v-model="islandOpen2" :panel-width="'min(280px, calc(100vw - 48px))'">
            <template #trigger>
              <DewButton type="ghost" size="lg">未打卡</DewButton>
            </template>
            <div style="padding: 16px;">
              <div style="font-size: 13px; color: var(--dew-text-muted); line-height: 1.6;">
                这里可以放任意内容：通知详情、统计图表、快捷操作等。面板宽度支持数字（px）或字符串（响应式）。
              </div>
            </div>
          </DewIsland>
        </div>
      </section>

      <hr v-if="activeTab === 'island'" style="border: none; height: 1px; margin: 0 0 36px;" />

      <!-- ━━━━ Badge ━━━━ -->
      <section v-if="activeTab === 'badge'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewBadge 徽标</h2>
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
            <span style="font-size: 14px; color: var(--dew-text-heading);">消息</span>
            <DewBadge :value="6" type="danger" style="position: absolute; top: -8px; right: -20px;" />
          </div>
          <div style="position: relative; display: inline-flex;">
            <span style="font-size: 14px; color: var(--dew-text-heading);">通知</span>
            <DewBadge :value="23" type="warning" style="position: absolute; top: -8px; right: -24px;" />
          </div>
        </div>
      </section>

      <!-- ━━━━ Tag ━━━━ -->
      <section v-if="activeTab === 'tag'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">DewTag 标签</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px;">
          <DewTag type="primary">任务</DewTag>
          <DewTag type="success">已完成</DewTag>
          <DewTag type="warning">待审核</DewTag>
          <DewTag type="danger">紧急</DewTag>
          <DewTag type="info">信息</DewTag>
          <DewTag type="neutral">草稿</DewTag>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">圆角</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px;">
          <DewTag type="primary" :round="true">任务</DewTag>
          <DewTag type="success" :round="true">已完成</DewTag>
          <DewTag type="warning" :round="true">待审核</DewTag>
          <DewTag type="danger" :round="true">紧急</DewTag>
          <DewTag type="info" :round="true">信息</DewTag>
        </div>
        <div style="font-size: 12px; color: var(--dew-text-faint); margin-bottom: 8px;">尺寸</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <DewTag type="primary" size="sm">小号</DewTag>
          <DewTag type="primary" size="md">中号</DewTag>
          <DewTag type="success" size="sm" :round="true">小圆</DewTag>
          <DewTag type="success" size="md" :round="true">中圆</DewTag>
        </div>
      </section>

      <!-- ━━━━ 组合示例 ━━━━ -->
      <section v-if="activeTab === 'combo'" style="margin-bottom: 36px;">
        <h2 class="dew-showcase__heading" style="font-size: 15px; font-weight: 600; margin: 0 0 14px;">组合示例</h2>
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
                  <span style="font-size: 14px; font-weight: 600; color: var(--dew-text-heading);">新作业发布</span>
                  <DewTag type="primary" size="sm">作业</DewTag>
                </div>
                <span style="font-size: 13px; color: var(--dew-text-faint);">生物材料学 · 2 小时前</span>
              </div>
              <DewButton type="ghost" size="sm">查看</DewButton>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.3); border-radius: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center;">
                <Check style="width: 18px; height: 18px; color: #22c55e;" />
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px; font-weight: 600; color: var(--dew-text-heading);">作业已批改</span>
                  <DewTag type="success" size="sm">已批改</DewTag>
                </div>
                <span style="font-size: 13px; color: var(--dew-text-faint);">医学影像原理 · 昨天</span>
              </div>
              <DewButton type="ghost" size="sm">查看</DewButton>
            </div>
          </div>
        </DewCard>
      </section>

    </div>
  </div>
</template>

<style>
@keyframes dew-island-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.dew-wallpaper {
  background:
    /* 顶层柔光 */
    radial-gradient(ellipse 120% 60% at 10% 90%, rgba(251,146,60,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 80% 80% at 90% 20%, rgba(56,189,248,0.15) 0%, transparent 50%),
    /* 高饱和流光色块 */
    radial-gradient(ellipse 70% 50% at 20% 20%, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 70%),
    radial-gradient(ellipse 60% 70% at 75% 65%, rgba(236,72,153,0.45) 0%, rgba(236,72,153,0) 65%),
    radial-gradient(ellipse 80% 40% at 50% 85%, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0) 55%),
    radial-gradient(ellipse 50% 60% at 85% 10%, rgba(14,165,233,0.5) 0%, rgba(14,165,233,0) 60%),
    radial-gradient(ellipse 90% 50% at 5% 50%, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0) 55%),
    /* 底层大色域 */
    radial-gradient(ellipse 140% 100% at 30% 100%, rgba(251,113,133,0.3) 0%, transparent 60%),
    radial-gradient(ellipse 120% 100% at 80% 0%, rgba(56,189,248,0.25) 0%, transparent 50%),
    /* 基底 */
    linear-gradient(160deg, #1e1b4b 0%, #0f172a 40%, #0c0a1d 100%);
  background-attachment: fixed;
}
</style>

<script setup>
import { ref } from 'vue'
import MenuComponent from '../components/MenuComponent.vue'
import DewButton from '../components/ui/DewButton.vue'
import DewButtonBar from '../components/ui/DewButtonBar.vue'
import DewCard from '../components/ui/DewCard.vue'
import DewBadge from '../components/ui/DewBadge.vue'
import DewTag from '../components/ui/DewTag.vue'
import DewInput from '../components/ui/DewInput.vue'
import DewSwitch from '../components/ui/DewSwitch.vue'
import DewPopover from '../components/ui/DewPopover.vue'
import DewDropdown from '../components/ui/DewDropdown.vue'
import DewIsland from '../components/ui/DewIsland.vue'
import { Document, Check, Bell, User, Setting, Search, Lock, MoreFilled, EditPen, Delete } from '@element-plus/icons-vue'

const isDark = ref(false)

// 导航 tab
const activeTab = ref('button')
const navItems = [
  { value: 'button', label: 'Button' },
  { value: 'bar', label: 'ButtonBar' },
  { value: 'switch', label: 'Switch' },
  { value: 'input', label: 'Input' },
  { value: 'card', label: 'Card' },
  { value: 'popover', label: 'Popover' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'island', label: 'Island' },
  { value: 'badge', label: 'Badge' },
  { value: 'tag', label: 'Tag' },
  { value: 'combo', label: '组合' },
]

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

// Input 数据
const inputVal1 = ref('')
const inputVal2 = ref('')
const inputVal3 = ref('')
const inputVal4 = ref('')
const inputVal5 = ref('')

// Switch 数据
const switchVal1 = ref(false)
const switchVal2 = ref(true)
const switchVal3 = ref(false)

// Popover / Dropdown 数据
const popoverVisible = ref(false)
const dropdownVisible1 = ref(false)
const dropdownVisible2 = ref(false)
const dropdownSelected = ref('')

// Island 数据
const islandOpen = ref(false)
const islandOpen2 = ref(false)
const dropdownItems1 = [
  { label: '编辑', icon: EditPen, command: 'edit' },
  { label: '复制', icon: Document, command: 'copy' },
  { label: '删除', icon: Delete, command: 'delete', danger: true },
]
const dropdownItems2 = [
  { label: '个人资料', command: 'profile' },
  { label: '系统设置', command: 'settings' },
  { label: '退出登录', command: 'logout', danger: true },
]
</script>

<style>
/* ━━━━ 亮色模式 ━━━━ */
.dew-showcase--light {
  background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}
.dew-showcase--light .dew-showcase__title {
  color: var(--dew-text-heading);
}
.dew-showcase--light .dew-showcase__subtitle { color: var(--dew-text-muted); }
.dew-showcase--light .dew-showcase__heading { color: var(--dew-text-heading); }
.dew-showcase--light hr { background: rgba(0,0,0,0.06); }

/* ━━━━ 暗色模式 ━━━━ */
.dew-showcase--dark {
  background: linear-gradient(135deg, #1c1c1e 0%, #111111 50%, #18181b 100%);
}
.dew-showcase--dark .dew-showcase__title { color: rgba(255,255,255,0.9); }
.dew-showcase--dark .dew-showcase__subtitle { color: rgba(255,255,255,0.45); }
.dew-showcase--dark .dew-showcase__heading { color: rgba(255,255,255,0.75); }
.dew-showcase--dark hr { background: rgba(255,255,255,0.08); }
</style>
