#!/usr/bin/env node

/**
 * 版本发布脚本
 * 用于自动更新版本号和生成更新日志
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const packageJsonPath = path.join(__dirname, 'package.json');
const versionConfigPath = path.join(__dirname, 'src/config/version.js');

/**
 * 读取 package.json
 */
function readPackageJson() {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(content);
}

/**
 * 更新 package.json 版本号
 */
function updatePackageVersion(newVersion) {
  const packageJson = readPackageJson();
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ 已更新 package.json 版本号为: ${newVersion}`);
}

/**
 * 生成新的版本配置
 */
function generateVersionConfig(version, features, notice) {
  const today = new Date().toLocaleDateString('zh-CN');
  const announcementId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-v${version}`;

  return `// 版本配置文件
// 这个文件用于统一管理版本号和更新信息

// 当前版本号（会在构建时被 vite.config.js 读取）
export const APP_VERSION = '${version}'

// 构建日期（会在构建时自动生成）
export const BUILD_DATE = new Date().toLocaleDateString('zh-CN')

// 更新日期（手动设置）
export const UPDATE_DATE = '${today}'

// 更新公告的唯一标识（基于更新日期和版本号）
export const ANNOUNCEMENT_ID = \`${announcementId}\`

// 版本更新日志
export const VERSION_CHANGELOG = {
    '${version}': {
        date: '${today}',
        features: [
${features.map(f => `            '${f}'`).join(',\n')}
        ],
        importantNotice: '${notice}'
    }
}

// 获取当前版本的更新信息
export const getCurrentVersionInfo = () => {
    return VERSION_CHANGELOG[APP_VERSION] || {
        date: UPDATE_DATE,
        features: [],
        importantNotice: ''
    }
}

// 获取完整版本信息
export const getVersionInfo = () => {
    return {
        version: APP_VERSION,
        buildDate: BUILD_DATE,
        updateDate: UPDATE_DATE,
        announcementId: ANNOUNCEMENT_ID,
        changelog: getCurrentVersionInfo()
    }
}
`;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
使用方法: node release.js <版本号> [功能描述...]

示例:
  node release.js 2.1.3 "修复了登录问题" "优化了性能" "添加了新功能"
  
注意: 功能描述可以包含 emoji，建议使用以下格式：
  🚀 重大更新   📚 新功能   🔧 功能改进   🐛 Bug修复
  📝 文档更新   🌟 亮点功能  ⏰ 时间相关   📊 数据相关
        `);
    return;
  }

  const newVersion = args[0];
  const features = args.slice(1);
  const notice = '如有问题请及时反馈！';

  try {
    // 更新 package.json
    updatePackageVersion(newVersion);

    // 生成新的版本配置
    const newConfig = generateVersionConfig(newVersion, features, notice);
    fs.writeFileSync(versionConfigPath, newConfig);
    console.log(`✅ 已更新版本配置文件: ${newVersion}`);

    console.log('\n🎉 版本发布完成！');
    console.log(`📦 新版本: ${newVersion}`);
    console.log('📋 更新内容:');
    features.forEach((feature, index) => {
      console.log(`   ${index + 1}. ${feature}`);
    });

    console.log('\n💡 接下来可以执行：');
    console.log('   1. npm run build    # 构建项目');
    console.log('   2. git add .        # 添加更改');
    console.log(`   3. git commit -m "release: v${newVersion}"  # 提交更改`);
    console.log(`   4. git tag v${newVersion}    # 创建标签`);
    console.log('   5. git push --tags  # 推送标签');

  } catch (error) {
    console.error('❌ 发布失败:', error.message);
  }
}

// 检查是否直接运行此脚本
if (process.argv[1].endsWith('release.js')) {
  main();
}

export {
  updatePackageVersion,
  generateVersionConfig
};
