/* ============================================
   common.js — 信使项目全局共享脚本
   功能: 导航栏渲染、DOM 工具函数
   使用: 页面引入后调用 renderHeader(title, activeHref)
   ============================================ */

/**
 * 渲染顶部导航栏
 * @param {string} title  - 页面标题
 * @param {string} activeHref - 当前激活的导航项 href（如 '/'、'/admin'、'/timer'、'/reports'）
 */
function renderHeader(title, activeHref) {
  const navItems = [
    { href: '/',       label: '首页' },
    { href: '/admin',  label: '广播' },
    { href: '/timer',  label: '推送' },
    { href: '/reports', label: '回复' }
  ];

  const links = navItems.map(item => {
    const cls = item.href === activeHref ? 'active' : '';
    return `<a href="${item.href}" class="${cls}">${item.label}</a>`;
  }).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="header">
      <h1>${title}</h1>
      <div class="nav">${links}</div>
    </div>
  `);
}

/** 快捷获取 DOM 元素 */
function $(id) {
  return document.getElementById(id);
}

/** HTML 转义 */
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML 属性值转义 */
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 格式化字节 */
function fmtBytes(mb) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(0) + ' MB';
}

/** 格式化运行时长 */
function fmtUptime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
}
