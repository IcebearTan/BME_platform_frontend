<template>
  <div class="xlab-root lab-home" :class="{ ready: introDone, 'galaxy-on': galaxyOpen }">
    <div
      class="lab-navdock"
      :class="{ 'nav-open': navOpen }"
      :inert="!introDone"
      @mouseenter="navEnter"
      @mouseleave="navLeave"
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
    >
      <MenuComponent />
      <button v-if="introDone && !navOpen" type="button" class="nav-cue" title="上滑唤起导航" aria-label="上滑唤起导航" @click="pinNav">
        <el-icon><ArrowUp /></el-icon>
      </button>
    </div>

    <main class="lab-scene">
      <button v-if="!introDone" type="button" class="lab-skip" @click="finishIntro">跳过动画</button>
      <div class="lab-layout">
        <section class="lab-visual" aria-label="XLAB 首页视觉">
          <div ref="labImage" class="lab-image" aria-hidden="true"></div>
          <div ref="labShade" class="lab-shade" aria-hidden="true"></div>
          <div class="lab-scan" aria-hidden="true"></div>
          <div class="lab-brand">
            <span class="brand-rule" :class="{ revealed: introDone }"></span>
            <h1 ref="brandWord" class="lab-wordmark" :class="{ interactive: introDone }" aria-label="XLAB" tabindex="0">
              <span class="lab-x" aria-hidden="true">
                <i class="x-blade blade-nw"></i>
                <i class="x-blade blade-ne"></i>
                <i class="x-blade blade-sw"></i>
                <i class="x-blade blade-se"></i>
              </span>
              <span class="lab-letters" aria-hidden="true">LAB</span>
            </h1>
            <p class="brand-network" :class="{ revealed: introDone }">CAMPUS PROJECT NETWORK</p>
            <p class="brand-copy" :class="{ revealed: introDone }">SMALL IDEAS. BRIGHTER WORLDS.<br />FROM CAMPUS TO BEYOND.</p>
          </div>
        </section>

        <aside class="lab-console" :class="{ revealed: introDone }" :inert="!introDone">
          <nav class="lab-actions" aria-label="XLAB 入口">
            <router-link class="console-action plaza" to="/lab/projects" aria-label="项目广场">
              <span class="action-icon"><el-icon><Grid /></el-icon></span>
              <span class="action-copy"><small>01 / EXPLORE</small><strong>PROJECT PLAZA</strong><em>浏览正在发生的项目</em></span>
              <el-icon class="action-arrow"><ArrowRight /></el-icon>
            </router-link>
            <router-link class="console-action publish" to="/lab/projects/new" aria-label="发布项目">
              <span class="action-icon"><el-icon><Plus /></el-icon></span>
              <span class="action-copy"><small>02 / CREATE</small><strong>PUBLISH PROJECT</strong><em>分享我的项目</em></span>
              <el-icon class="action-arrow"><ArrowRight /></el-icon>
            </router-link>
            <button type="button" class="console-action archive pending" aria-label="待开发" disabled>
              <span class="action-icon"><el-icon><Clock /></el-icon></span>
              <span class="action-copy"><small>03 / PENDING</small><strong>待开发</strong><em>功能正在准备中</em></span>
              <span class="action-pending">SOON</span>
            </button>
          </nav>
          <footer class="console-foot"><span>XLAB // BME_PLATFORM</span><span class="console-online"><i></i> NETWORK ONLINE</span></footer>
        </aside>
      </div>
    </main>

    <div v-if="galaxyOpen" class="galaxy-layer" role="dialog" aria-modal="true" aria-label="往届营期项目高光星系">
      <button ref="galaxyCloseButton" type="button" class="galaxy-close" aria-label="关闭高光星系" @click="closeGalaxy">
        <el-icon><Close /></el-icon>
      </button>
      <header class="galaxy-head">
        <span>// ARCHIVE GALAXY · 往届营期高光</span>
        <b>{{ highlights.length }} PROJECTS</b>
      </header>

      <div v-if="galaxyLoading" class="galaxy-state">正在连接往届项目星系</div>
      <div v-else-if="archiveError" class="galaxy-state">往届项目暂未接入，稍后再试</div>
      <div v-else-if="!highlights.length" class="galaxy-state">暂无已完成营期项目</div>
      <template v-else>
        <svg class="galaxy-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line
            v-for="(point, index) in starPoints"
            :key="`line-${highlights[index].id}`"
            x1="84"
            y1="50"
            :x2="point.x"
            :y2="point.y"
            pathLength="1"
            :style="{ '--wire-delay': `${index * 90}ms` }"
          />
        </svg>
        <span class="galaxy-origin" aria-hidden="true"></span>
        <button
          v-for="(point, index) in starPoints"
          :key="highlights[index].id"
          type="button"
          class="star-node"
          :class="{ selected: open === index }"
          :style="{ left: `${point.x}%`, top: `${point.y}%`, '--node-delay': `${index * 90 + 220}ms` }"
          :aria-label="`查看${highlights[index].title}高光`"
          @click="open = index"
        >
          <i></i>
          <span>{{ highlights[index].title }}</span>
        </button>
      </template>

      <section v-if="open !== null" class="galaxy-detail" :aria-label="highlights[open].title">
        <button ref="detailCloseButton" type="button" class="galaxy-detail-close" aria-label="关闭项目高光" @click="open = null">
          <el-icon><Close /></el-icon>
        </button>
        <div class="galaxy-detail-media">
          <img v-if="highlights[open].cover" :src="assetUrl(highlights[open].cover)" alt="" />
          <span v-else>{{ highlights[open].title.charAt(0) }}</span>
        </div>
        <div class="galaxy-detail-body">
          <span>// {{ highlights[open].campName || '营期项目' }}{{ highlights[open].campCycle ? ` · ${highlights[open].campCycle}` : '' }}</span>
          <h2>{{ highlights[open].title }}</h2>
          <p>{{ highlights[open].story }}</p>
          <div class="galaxy-detail-meta">
            <span v-for="tag in highlights[open].tags" :key="tag"># {{ tag }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowRight, ArrowUp, Clock, Close, Grid, Plus } from '@element-plus/icons-vue';
import { gsap } from 'gsap';
import MenuComponent from '../components/MenuComponent.vue';
import { assetUrl } from '../services/campService';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';

const introDone = ref(false);
const brandWord = ref(null);
const labImage = ref(null);
const labShade = ref(null);
const galaxyCloseButton = ref(null);
const detailCloseButton = ref(null);
const galaxyOpen = ref(false);
const galaxyLoading = ref(true);
const archiveError = ref(false);
const projects = ref([]);
const open = ref(null);
let timeline;
let previousGalaxyFocus;
let previousDetailFocus;
let navCloseTimer = null;
let touchStartY = 0;

const navOpen = ref(false);
const navPinned = ref(false);

const highlights = computed(() => projects.value.map((project) => ({
  id: project.id,
  title: project.title,
  story: project.summary || project.description || '这个团队已经完成交付，高光素材待补充。',
  cover: project.cover_thumb || project.cover || (project.images || [])[0],
  campName: project.camp_name,
  campCycle: project.camp_cycle,
  tags: (project.tags || []).slice(0, 4),
})));

const basePoints = [
  { x: 69, y: 15 }, { x: 54, y: 26 }, { x: 47, y: 46 }, { x: 53, y: 68 },
  { x: 66, y: 85 }, { x: 34, y: 15 }, { x: 25, y: 37 }, { x: 28, y: 63 },
  { x: 37, y: 85 }, { x: 13, y: 50 }, { x: 42, y: 74 }, { x: 30, y: 27 },
];

const starPoints = computed(() => highlights.value.map((_, index) => {
  if (index < basePoints.length) return basePoints[index];
  const ring = Math.floor((index - basePoints.length) / 8) + 1;
  const angle = ((index * 47) % 140) + 100;
  const radian = (angle * Math.PI) / 180;
  return {
    x: Math.min(91, Math.max(8, 84 + Math.cos(radian) * (18 + ring * 8))),
    y: Math.min(91, Math.max(9, 50 + Math.sin(radian) * (22 + ring * 7))),
  };
}));

function finishIntro() {
  timeline?.kill();
  if (brandWord.value) gsap.set(brandWord.value, { clearProps: 'transform,opacity,visibility' });
  if (labImage.value) gsap.set(labImage.value, { opacity: 1, scale: 1 });
  if (labShade.value) gsap.set(labShade.value, { opacity: 1 });
  introDone.value = true;
}

function navEnter() {
  clearTimeout(navCloseTimer);
  navOpen.value = true;
}

function navLeave() {
  clearTimeout(navCloseTimer);
  navCloseTimer = setTimeout(() => {
    if (!navPinned.value) navOpen.value = !!document.querySelector('.dew-popover');
  }, 220);
}

function pinNav() {
  clearTimeout(navCloseTimer);
  navOpen.value = true;
  navPinned.value = true;
}

function touchStart(event) {
  touchStartY = event.touches[0].clientY;
}

function touchEnd(event) {
  const delta = touchStartY - event.changedTouches[0].clientY;
  if (delta > 18) pinNav();
  else if (delta < -18) {
    navOpen.value = false;
    navPinned.value = false;
  }
}

function openGalaxy() {
  previousGalaxyFocus = document.activeElement;
  open.value = null;
  galaxyOpen.value = true;
}

function closeGalaxy() {
  open.value = null;
  galaxyOpen.value = false;
}

function onKey(event) {
  if (event.key !== 'Escape') return;
  if (open.value !== null) open.value = null;
  else if (galaxyOpen.value) closeGalaxy();
}

watch(galaxyOpen, async (value) => {
  if (value) {
    await nextTick();
    galaxyCloseButton.value?.focus();
  } else {
    open.value = null;
    previousGalaxyFocus?.focus?.();
  }
});

watch(open, async (value) => {
  if (value !== null) {
    previousDetailFocus = document.activeElement;
    await nextTick();
    detailCloseButton.value?.focus();
  } else previousDetailFocus?.focus?.();
});

async function loadHighlights() {
  galaxyLoading.value = true;
  archiveError.value = false;
  try {
    const data = await showcaseService.fetchProjects({ source: 'camp', project_status: 'done' });
    projects.value = data.projects || [];
  } catch {
    archiveError.value = true;
  } finally {
    galaxyLoading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  loadHighlights();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishIntro();
    return;
  }
  const rect = brandWord.value.getBoundingClientRect();
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const dy = (window.innerHeight + 60) / 2 - (rect.top + rect.height / 2);
  gsap.set(labImage.value, { opacity: 0, scale: 1.06 });
  gsap.set(labShade.value, { opacity: 0 });
  timeline = gsap.timeline({ onComplete: finishIntro });
  timeline
    .fromTo(brandWord.value, { x: dx, y: dy, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.65, ease: 'power2.out' })
    .to(brandWord.value, { x: 0, y: 0, duration: 1.15, delay: 0.45, ease: 'power2.inOut' })
    .to(labImage.value, { opacity: 1, scale: 1, duration: 1.15, ease: 'power1.inOut' }, '<')
    .to(labShade.value, { opacity: 1, duration: 1.05, ease: 'power1.inOut' }, '<0.1')
    .call(() => { introDone.value = true; }, [], '+=0.25');
});

onBeforeUnmount(() => {
  timeline?.kill();
  window.removeEventListener('keydown', onKey);
  clearTimeout(navCloseTimer);
});
</script>

<style scoped>
.lab-home {
  --lab-blue: #56bdff;
  --lab-blue-soft: #bde8ff;
  --lab-gold: #ffd98b;
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #020711;
}
.lab-scene { height: 100%; background: #020711; }
.lab-layout { display: grid; height: 100%; grid-template-columns: minmax(0, 1fr) minmax(310px, 24vw); }
.lab-visual { position: relative; min-width: 0; height: 100%; overflow: hidden; isolation: isolate; border-right: 1px solid rgba(122, 194, 237, 0.24); }
.lab-image { position: absolute; inset: 0; z-index: -3; opacity: 0; background-image: url('../assets/xlab-space-hero.png'); background-position: 45% center; background-size: cover; will-change: opacity, transform; }
.lab-shade { position: absolute; inset: 0; z-index: -2; opacity: 0; pointer-events: none; background: linear-gradient(90deg, rgba(2, 7, 17, 0.05) 45%, rgba(2, 7, 17, 0.6) 100%), linear-gradient(0deg, rgba(2, 7, 17, 0.82) 0%, transparent 38%); will-change: opacity; }
.lab-scan { position: absolute; inset: 0; z-index: 8; opacity: 0.18; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(188, 228, 255, 0.08) 3px 4px); }

.lab-brand { position: absolute; left: 5.5%; bottom: 7%; z-index: 12; width: min(590px, 62%); }
.lab-wordmark {
  position: relative;
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  margin: 0;
  align-items: center;
  color: #f7fbff;
  font-family: Arial Black, Arial, sans-serif;
  font-size: clamp(88px, 12.5vw, 168px);
  font-weight: 900;
  line-height: 0.82;
  letter-spacing: 0;
  white-space: nowrap;
  user-select: none;
  outline: none;
  filter: drop-shadow(0 0 8px rgba(179, 228, 255, 0.5)) drop-shadow(0 0 28px rgba(31, 139, 241, 0.28));
}
.lab-wordmark.interactive:hover, .lab-wordmark.interactive:focus-visible { filter: drop-shadow(0 0 12px rgba(215, 243, 255, 0.72)) drop-shadow(0 0 34px rgba(52, 160, 255, 0.38)); }
.lab-x { position: relative; display: inline-block; width: 0.73em; height: 0.78em; flex: 0 0 auto; transform: skewX(-7deg); }
.x-blade {
  position: absolute;
  display: block;
  width: 58%;
  height: 51%;
  overflow: hidden;
  background: linear-gradient(118deg, #4e8fd3 0%, #b9e4ff 18%, #fff 38%, #c8eaff 58%, #3978bf 100%);
  background-size: 220% 100%;
  animation: wordmark-sheen 3s linear infinite;
}
.blade-nw { top: 0; left: 0; clip-path: polygon(0 0, 50% 0, 100% 100%, 56% 100%); }
.blade-ne { top: 0; right: 0; clip-path: polygon(50% 0, 100% 0, 44% 100%, 0 100%); }
.blade-sw { bottom: 0; left: 0; clip-path: polygon(56% 0, 100% 0, 50% 100%, 0 100%); }
.blade-se { right: 0; bottom: 0; clip-path: polygon(0 0, 44% 0, 100% 100%, 50% 100%); }
.lab-letters {
  display: inline-block;
  color: transparent;
  background: linear-gradient(118deg, #4687ce 0%, #b9e4ff 18%, #fff 38%, #c8eaff 58%, #3978bf 100%);
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  transform: skewX(-7deg);
  animation: wordmark-sheen 3s linear infinite;
}
@keyframes wordmark-sheen {
  0%, 64% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
.brand-rule { display: block; width: 68px; height: 2px; margin: 0 0 22px 7px; background: var(--lab-blue); box-shadow: 0 0 12px var(--lab-blue); }
.brand-network { margin: 17px 0 0 8px; color: #cdeaff; font: 11px var(--xl-mono); letter-spacing: 0; }
.brand-copy { margin: 24px 0 0 8px; color: rgba(225, 239, 250, 0.68); font: 9px/1.8 var(--xl-mono); letter-spacing: 0; }

.lab-navdock { position: fixed; top: 0; left: 0; right: 0; height: 30px; z-index: 999; }
.lab-navdock :deep(.el-menu-demo) {
  transform: translateY(-102%);
  transition: transform 0.3s cubic-bezier(0.2, 0.85, 0.25, 1);
}
.lab-navdock.nav-open :deep(.el-menu-demo) { transform: translateY(0); }
.nav-cue {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 1001;
  display: grid;
  width: 48px;
  height: 20px;
  place-items: center;
  color: var(--lab-blue-soft);
  background: rgba(3, 13, 25, 0.9);
  border: 1px solid rgba(121, 202, 250, 0.62);
  box-shadow: 0 0 14px rgba(55, 172, 247, 0.2);
  animation: cue-float 2.2s ease-in-out infinite;
}
.nav-cue:hover, .nav-cue:focus-visible { color: #fff; border-color: #d7f3ff; outline: none; }
@keyframes cue-float { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -2px); } }

.lab-console {
  position: relative;
  z-index: 15;
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  height: 100%;
  padding: clamp(20px, 4vh, 36px) clamp(18px, 1.6vw, 28px) 52px;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(180deg, rgba(3, 10, 20, 0.98), rgba(2, 7, 14, 0.99));
}
.lab-console::before { position: absolute; inset: 10px; z-index: -1; content: ''; border: 1px solid rgba(114, 169, 205, 0.18); pointer-events: none; }
.lab-actions { display: grid; gap: 12px; }
.console-action {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 36px;
  min-height: clamp(72px, 11.5vh, 94px);
  align-items: center;
  color: #fff;
  text-align: left;
  text-decoration: none;
  background: rgba(8, 23, 39, 0.72);
  border: 1px solid rgba(108, 192, 246, 0.48);
  box-shadow: inset 0 0 20px rgba(52, 151, 220, 0.1);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;
}
.console-action:hover, .console-action:focus-visible { border-color: #b8e7ff; background: rgba(12, 34, 56, 0.92); box-shadow: inset 0 0 25px rgba(58, 171, 244, 0.18), 0 0 18px rgba(57, 165, 238, 0.2); transform: translateX(-3px); outline: none; }
.console-action.publish { background: rgba(35, 29, 17, 0.74); border-color: rgba(255, 217, 139, 0.48); box-shadow: inset 0 0 20px rgba(255, 199, 93, 0.07); }
.console-action.publish:hover, .console-action.publish:focus-visible { border-color: #fff0c8; background: rgba(48, 39, 22, 0.9); box-shadow: inset 0 0 25px rgba(255, 209, 115, 0.12), 0 0 18px rgba(255, 201, 93, 0.12); }
.console-action.archive { background: rgba(6, 26, 34, 0.78); border-color: rgba(126, 241, 226, 0.46); box-shadow: inset 0 0 20px rgba(53, 240, 208, 0.08); }
.console-action.archive:hover, .console-action.archive:focus-visible { border-color: #c9fff7; background: rgba(9, 43, 52, 0.94); box-shadow: inset 0 0 25px rgba(53, 240, 208, 0.13), 0 0 18px rgba(53, 240, 208, 0.16); }
.console-action.pending { opacity: 0.58; cursor: not-allowed; filter: saturate(0.55); }
.console-action.pending:hover, .console-action.pending:focus-visible { border-color: rgba(126, 241, 226, 0.46); background: rgba(6, 26, 34, 0.78); box-shadow: inset 0 0 20px rgba(53, 240, 208, 0.08); transform: none; }
.action-icon { display: grid; width: 38px; height: 38px; margin-left: 14px; place-items: center; color: var(--lab-blue-soft); font-size: 20px; border: 1px solid rgba(121, 202, 250, 0.58); box-shadow: inset 0 0 14px rgba(63, 176, 245, 0.2); }
.publish .action-icon { color: var(--lab-gold); border-color: rgba(255, 217, 139, 0.54); }
.archive .action-icon { color: #8ff6e7; border-color: rgba(126, 241, 226, 0.56); }
.action-copy { display: flex; min-width: 0; padding: 12px 10px; flex-direction: column; }
.action-copy small { color: #79cfff; font: 8px var(--xl-mono); }
.publish .action-copy small { color: var(--lab-gold); }
.archive .action-copy small { color: #74e9d8; }
.action-copy strong { margin-top: 4px; overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.action-copy em { margin-top: 4px; overflow: hidden; color: rgba(218, 232, 242, 0.62); font-size: 10px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.action-arrow { display: grid; width: 28px; height: 28px; place-items: center; color: var(--lab-blue-soft); border: 1px solid rgba(121, 202, 250, 0.55); border-radius: 50%; }
.publish .action-arrow { color: var(--lab-gold); border-color: rgba(255, 217, 139, 0.54); }
.archive .action-arrow { color: #8ff6e7; border-color: rgba(126, 241, 226, 0.54); }
.action-pending { margin-right: 12px; padding: 5px 7px; color: rgba(178, 226, 221, 0.74); border: 1px solid rgba(126, 241, 226, 0.28); font: 7px var(--xl-mono); letter-spacing: 0.08em; }
.console-foot { position: absolute; right: 22px; bottom: 20px; left: 22px; display: flex; align-items: center; justify-content: space-between; color: rgba(164, 196, 215, 0.42); font: 8px var(--xl-mono); }
.console-online { color: rgba(111, 218, 202, 0.7); }
.console-online i { display: inline-block; width: 6px; height: 6px; margin-right: 6px; background: #35f0d0; box-shadow: 0 0 8px #35f0d0; }

.lab-skip { position: fixed; right: 28px; bottom: 24px; z-index: 50; padding: 9px 14px; color: #dff5ff; font: 10px var(--xl-mono); background: rgba(3, 13, 25, 0.88); border: 1px solid rgba(121, 202, 250, 0.55); cursor: pointer; }
.brand-rule, .brand-network, .brand-copy, .lab-console { opacity: 0; visibility: hidden; transition: opacity 0.7s ease, visibility 0.7s; }
.revealed { opacity: 1; visibility: visible; }

.galaxy-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
  overflow: hidden;
  background: rgba(1, 5, 12, 0.88);
  backdrop-filter: brightness(0.32) blur(2px);
}
.galaxy-head { position: absolute; top: 28px; left: clamp(22px, 4vw, 56px); display: flex; gap: 18px; align-items: baseline; color: rgba(210, 234, 246, 0.68); font: 10px var(--xl-mono); }
.galaxy-head b { color: #fff; }
.galaxy-close { position: absolute; top: 22px; right: 26px; z-index: 4; display: grid; width: 40px; height: 40px; place-items: center; color: #fff; background: rgba(3, 13, 25, 0.88); border: 1px solid rgba(121, 202, 250, 0.6); cursor: pointer; }
.galaxy-close:hover, .galaxy-close:focus-visible { border-color: #d7f3ff; outline: none; }
.galaxy-state { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(210, 234, 246, 0.68); font: 11px var(--xl-mono); }
.galaxy-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
.galaxy-lines line {
  stroke: rgba(255, 255, 255, 0.86);
  stroke-width: 1;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  vector-effect: non-scaling-stroke;
  animation: wire-draw 0.55s ease-out both;
  animation-delay: var(--wire-delay, 0ms);
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.62));
}
@keyframes wire-draw { to { stroke-dashoffset: 0; } }
.galaxy-origin { position: absolute; top: 50%; left: 84%; width: 14px; height: 14px; background: #fff; border-radius: 50%; box-shadow: 0 0 18px rgba(255, 255, 255, 0.82), 0 0 44px rgba(86, 189, 255, 0.38); transform: translate(-50%, -50%); }
.star-node {
  position: absolute;
  z-index: 3;
  display: grid;
  justify-items: start;
  padding: 0;
  color: rgba(228, 241, 249, 0.76);
  background: none;
  border: 0;
  cursor: pointer;
  transform: translate(-50%, -50%);
  opacity: 0;
  animation: node-in 0.3s ease-out both;
  animation-delay: var(--node-delay, 0ms);
}
.star-node i { position: relative; display: block; width: 12px; height: 12px; justify-self: start; background: #fff; border-radius: 50%; box-shadow: 0 0 12px rgba(255, 255, 255, 0.88); transition: transform 0.2s; }
.star-node span { max-width: 190px; margin: 7px 0 0 2px; overflow: hidden; font: 10px/1.35 var(--xl-mono); text-overflow: ellipsis; white-space: nowrap; }
.star-node:hover i, .star-node:focus-visible i, .star-node.selected i { transform: scale(1.35); outline: none; }
.star-node:hover, .star-node:focus-visible, .star-node.selected { color: #fff; outline: none; }
.star-node.selected i::after { position: absolute; inset: -7px; content: ''; border: 1px solid rgba(255, 255, 255, 0.76); border-radius: 50%; }
@keyframes node-in { from { opacity: 0; transform: translate(-50%, -38%); } to { opacity: 1; transform: translate(-50%, -50%); } }

.galaxy-detail {
  position: absolute;
  z-index: 5;
  left: clamp(22px, 5vw, 72px);
  bottom: clamp(24px, 7vh, 66px);
  display: grid;
  width: min(620px, calc(100vw - 44px));
  max-height: min(390px, calc(100dvh - 130px));
  overflow: auto;
  grid-template-columns: 180px minmax(0, 1fr);
  color: #fff;
  background: rgba(3, 12, 23, 0.94);
  border: 1px solid rgba(126, 241, 226, 0.42);
  box-shadow: inset 0 0 30px rgba(40, 139, 204, 0.12), 0 0 40px rgba(0, 0, 0, 0.55);
}
.galaxy-detail-close { position: absolute; top: 8px; right: 9px; z-index: 2; display: grid; width: 30px; height: 30px; place-items: center; color: #fff; background: rgba(1, 5, 12, 0.8); border: 1px solid rgba(126, 241, 226, 0.4); cursor: pointer; }
.galaxy-detail-media { position: relative; min-height: 190px; background: rgba(1, 8, 16, 0.9); }
.galaxy-detail-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.galaxy-detail-media span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: transparent; font: 800 56px var(--xl-mono); -webkit-text-stroke: 1px rgba(255, 255, 255, 0.48); }
.galaxy-detail-body { min-width: 0; padding: 24px 52px 24px 20px; }
.galaxy-detail-body > span { color: #74e9d8; font: 9px var(--xl-mono); }
.galaxy-detail-body h2 { margin: 12px 0 10px; font-size: clamp(22px, 3vw, 32px); line-height: 1.12; overflow-wrap: anywhere; }
.galaxy-detail-body p { margin: 0; color: rgba(222, 236, 244, 0.76); font-size: 12px; line-height: 1.75; }
.galaxy-detail-meta { display: flex; margin-top: 16px; flex-wrap: wrap; gap: 6px; }
.galaxy-detail-meta span { padding: 3px 6px; color: rgba(210, 233, 246, 0.72); font: 8px var(--xl-mono); border: 1px solid rgba(126, 241, 226, 0.28); }

@media (max-width: 1180px) {
  .lab-layout { grid-template-columns: minmax(0, 1fr) minmax(300px, 32vw); }
  .lab-wordmark { font-size: clamp(82px, 11vw, 128px); }
  .action-copy strong { font-size: 14px; }
}

@media (max-width: 820px) {
  .lab-layout { grid-template-rows: minmax(0, 56fr) minmax(0, 44fr); grid-template-columns: none; }
  .lab-visual { border-right: 0; border-bottom: 1px solid rgba(122, 194, 237, 0.24); }
  .lab-image { background-position: 38% center; }
  .lab-brand { left: 20px; bottom: 22px; width: calc(100% - 40px); }
  .lab-wordmark { font-size: clamp(56px, 15vw, 92px); }
  .brand-copy { display: none; }
  .lab-console { justify-content: flex-start; padding: 12px 16px 44px; }
  .lab-actions { gap: 8px; }
  .console-action { grid-template-columns: 40px minmax(0, 1fr); min-height: 0; }
  .console-action:hover { transform: none; }
  .action-icon { width: 26px; height: 26px; margin-left: 9px; font-size: 14px; }
  .action-copy { padding: 9px 7px; }
  .action-copy strong { font-size: 11px; }
  .action-copy em { font-size: 9px; white-space: normal; }
  .action-arrow { display: none; }
  .console-foot { right: 16px; bottom: 15px; left: 16px; }
  .galaxy-detail { grid-template-columns: 110px minmax(0, 1fr); max-height: calc(100dvh - 104px); }
  .galaxy-detail-media { min-height: 140px; }
  .star-node span { max-width: 118px; }
}

@media (max-width: 520px) {
  .lab-brand { left: 14px; bottom: 14px; }
  .brand-rule { width: 44px; margin-bottom: 12px; }
  .brand-network { margin-top: 9px; font-size: 9px; }
  .lab-console { padding: 10px 12px 38px; }
  .action-copy em { display: none; }
  .galaxy-head { top: 76px; right: 20px; left: 20px; flex-direction: column; gap: 5px; }
  .galaxy-close { top: 20px; right: 18px; }
  .galaxy-detail { left: 14px; right: 14px; bottom: 20px; width: auto; grid-template-columns: 1fr; }
  .galaxy-detail-media { height: 120px; min-height: 0; }
  .galaxy-detail-body { padding: 18px 44px 18px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .x-blade, .lab-letters, .nav-cue, .galaxy-lines line, .star-node { animation: none; }
  .brand-rule, .brand-network, .brand-copy, .lab-console { transition: none; }
  .galaxy-lines line { stroke-dashoffset: 0; }
  .star-node { opacity: 1; }
}
</style>
