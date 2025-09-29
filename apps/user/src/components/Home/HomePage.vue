<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';

import UpdateAnnouncement from './UpdateAnnouncement.vue';
import HeroSection from './HeroSection.vue';
import MainContent from './MainContent.vue';
import SidebarContent from './SidebarContent.vue';
import DailyAttendence from '../Attendence/DailyAttendence.vue';
import LivePanel from './LivePanel.vue';

// 定义响应式数据
const articles = ref([]);

// 路由实例
const router = useRouter();

// 获取文章列表的方法
const fetchArticles = async () => {
  try {
    const response = await api({
      url: '/article/list',
      method: 'get',
    });
    const articleList = response.data;
    // 并发请求每篇文章的统计数据
    const statsPromises = articleList.map(article =>
      api({
        url: '/article/statistic',
        method: 'get',
        params: { Article_Id: article.Article_Id }
      }).then(statRes => {
        const merged = {
          ...article,
          viewCount: statRes.data?.view_count ?? 0,
          likeCount: statRes.data?.like_count ?? 0,
        };
        return merged;
      }).catch((err) => {
        console.warn(`获取文章ID: ${article.Article_Id} 统计数据失败`, err);
        return {
          ...article,
          viewCount: 0,
          likeCount: 0,
        };
      })
    );
    articles.value = await Promise.all(statsPromises);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  }
};

// 跳转到文章详情的方法
const goToArticle = (articleId) => {
  router.push({ path: '/article', query: { Article_Id: articleId } });
};

const dialogVisible = ref(true);

// Logo 点击处理函数
const handleLogoClick = () => {
  // 可以添加 logo 点击后的逻辑，比如页面滚动到顶部或触发动画
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 侧边栏快捷操作处理函数
const handleSidebarAction = (action) => {
  if (action.route) {
    router.push(action.route);
  }
};

// 在组件挂载时调用获取文章的方法
onMounted(() => {
  fetchArticles();
});
</script>

<template>
  <UpdateAnnouncement />
  <LivePanel />
  
  <div class="content-container">
    <div class="main-content">
      <!-- <MainContent 
        :articles="articles"
        @article-click="goToArticle"
      /> -->
    </div>
    <div class="side-content">
      <SidebarContent @action-click="handleSidebarAction" />
    </div>
  </div>
</template>

<style scoped>
/* 全局标题字体设置 */
h1, h2 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.content-container {
  width: 100%;
  max-width: 100vw;
  display: flex;
  padding: 20px 0;
  overflow-x: hidden;
}

/* 移动端专用签到模块 - 默认隐藏 */
.mobile-attendance-section {
  display: none;
  width: 100%;
  padding: 0 16px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

/* 在移动端时，给签到模块添加一些视觉增强 */
@media (max-width: 900px) {
  .mobile-attendance-section {
    display: block;
    background: rgba(255, 255, 255, 0.95);
    /* border-radius: 12px; */
    /* padding: 16px; */
    /* padding: 0; */
    /* margin: 16px; */
    /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); */
    /* border: 1px solid rgba(0, 0, 0, 0.05); */
    backdrop-filter: blur(10px);
  }
}

.main-content {
  flex: 1;
  /* 取消flex布局，防止内容超出时出现滚动条 */
  display: block;
  min-width: 0;
  overflow-y: hidden;
}

.side-content {
  width: 20%;
  min-width: 240px;
  max-width: 300px;
  margin: 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

@media (max-width: 900px) {
  .content-container { 
    flex-direction: column; 
    padding: 10px 0;
  }
  
  .side-content { 
    width: 100%; 
    margin: 0; 
  }
  
  .main-content {
    /* align-items: center; */
    margin: auto;
    width: 95%;
  }
}
</style>

<style>
body, html {
  overflow-x: hidden;
}

.box-card {
  margin-bottom: 20px !important;
  width: 880px;
  border-radius: 10px !important;

  cursor: pointer;
}

.el-card :deep(.el-card__body) {
  padding: 10px !important;
}

.article-card {
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  margin: 15px;
  width: 880px;
  /* min-height: 100px; */

  cursor: pointer;
}

.article-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 3px 15px rgba(255, 255, 255, 0.509);
}

.article-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}

.article-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.article-body {
  padding: 10px 0;
}

.article-summary {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.publish-time {
  font-style: italic;
}

.article-stats {
  display: flex;
  gap: 10px;
}

.like-count,
.view-count {
  display: flex;
  align-items: center;
}

.like-count::before {
  content: '👍';
  margin-right: 5px;
}

.view-count::before {
  content: '👀';
  margin-right: 5px;
}
</style>

<style scoped>
</style>
