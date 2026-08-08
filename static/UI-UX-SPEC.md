# DuMiMessager — UI/UX 设计规范

## 1. 设计理念

**Dark Glass** — 深色玻璃态是现代工具型应用的经典风格。DuMiMessager 采用深色背景 + 半透明玻璃面板 + 紫色点缀，营造专业、沉浸式的操作体验。

### 核心原则
- **克制**：减少装饰，让内容主导
- **通透**：玻璃态面板建立空间层次感
- **一致**：所有交互元素遵循统一的圆角、间距、色彩规则
- **可达**：保持键盘可访问性，提供清晰的焦点指示

---

## 2. 色彩系统

### 基础色板

| Token | 色值 | 用途 |
| --- | --- | --- |
| `bg-primary` | `#0f172a` | 页面背景 |
| `bg-glass` | `rgba(30, 41, 59, 0.55)` | 玻璃面板 |
| `bg-glass-strong` | `rgba(15, 23, 42, 0.8)` | 导航栏、模态框 |
| `bg-glass-subtle` | `rgba(30, 41, 59, 0.35)` | 次级面板、输入框背景 |
| `bg-input` | `rgba(255, 255, 255, 0.05)` | 输入框背景 |

### 文字色板

| Token | 色值 | 用途 |
| --- | --- | --- |
| `text-primary` | `#f1f5f9` (slate-100) | 标题、正文 |
| `text-secondary` | `#e2e8f0` (slate-200) | 次级文本 |
| `text-muted` | `#94a3b8` (slate-400) | 辅助文字、导航 |
| `text-placeholder` | `#475569` (slate-600) | 占位符 |

### 强调色（Accent）

| Token | 色值 | 用途 |
| --- | --- | --- |
| `accent-400` | `#c084fc` | 高亮文字、图标 |
| `accent-500` | `#a855f7` | 主按钮、焦点、选中态、强调 |
| `accent-600` | `#9333ea` | 按钮 hover |

### 语义色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `danger` | `#ef4444` (red-500) | 删除、错误 |
| `warning` | `#f59e0b` (amber-500) | 警告 |
| `info` | `#3b82f6` (blue-500) | 信息 |

### 边框色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `border-default` | `rgba(255, 255, 255, 0.1)` | 默认边框 |
| `border-subtle` | `rgba(255, 255, 255, 0.05)` | 细微边框 |
| `border-focus` | `rgba(168, 85, 247, 0.4)` | 聚焦边框 |

---

## 3. 间距系统

基于 4px 基准网格，Tailwind 默认间距：

| 尺寸 | 值 | 用途 |
| --- | --- | --- |
| `1` | 4px | 紧凑间距（图标与文字、标签内边距） |
| `1.5` | 6px | 按钮内 padding |
| `2` | 8px | 组件内部间距 |
| `3` | 12px | 卡片内间距 |
| `4` | 16px | 相邻元素间距 |
| `6` | 24px | 区块间距、页面 padding |

### 页面布局
- 最大宽度：`1366px` 居中
- 页面内边距：`24px` (p-6)
- 导航高度：`56px` (h-14)

---

## 4. 圆角系统

| Token | 值 | 用途 |
| --- | --- | --- |
| `rounded-lg` | 8px | 小型按钮、标签 |
| `rounded-xl` | 12px | 输入框、卡片 |
| `rounded-2xl` | 16px | 模态框、大型面板 |
| `rounded-full` | 9999px | 徽章、状态指示点 |

---

## 5. 玻璃态效果

### Glass（标准面板）
```css
background: rgba(30, 41, 59, 0.55);
backdrop-filter: blur(20px) saturate(150%);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

### Glass Strong（导航/模态框）
```css
background: rgba(15, 23, 42, 0.8);
backdrop-filter: blur(24px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
```

### Glass Subtle（次级面板）
```css
background: rgba(30, 41, 59, 0.35);
backdrop-filter: blur(12px) saturate(150%);
border: 1px solid rgba(255, 255, 255, 0.05);
```

### Glass Hover（悬停增强）
```css
background: rgba(30, 41, 59, 0.7);
border-color: rgba(255, 255, 255, 0.12);
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
transition: all 0.2s ease;
```

---

## 6. 组件规范

### 6.1 按钮

#### 主按钮
```
bg-accent-500 text-white rounded-xl px-5 py-2.5
hover:bg-accent-600
shadow-glow (0 0 24px rgba(168,85,247,0.15))
active:scale-[0.97]
disabled:bg-slate-700 disabled:text-slate-500
```

#### 文字按钮（导航）
```
px-4 py-1.5 rounded-lg text-sm font-medium
默认: text-slate-400 hover:text-slate-200 hover:bg-white/5
激活: bg-white/10 text-white shadow-glass-sm border-white/10
```

#### 小按钮（操作）
```
px-2 py-1 rounded-lg text-[10px] font-medium
text-slate-400 border border-white/5
hover:text-accent-400 hover:bg-accent-500/10
```

#### 危险按钮
```
bg-red-500/10 text-red-400 border border-red-500/20
hover:bg-red-500/15 hover:border-red-500/40
```

### 6.2 输入框

```
w-full px-4 py-2.5
bg-white/5 border border-white/10 rounded-xl text-sm
text-slate-200 placeholder-slate-600
focus:outline-none focus:border-accent-500/40
focus:ring-2 focus:ring-accent-500/10
disabled:opacity-50
transition-all duration-200
```

> **重要**：全局 `outline: none !important` 覆盖 Tailwind 的 `focus:outline-none`（其 `outline: 2px solid transparent` 在 Chrome 中会短暂闪白）。

### 6.3 JsonEditor（CodeMirror）

- 容器：`glass-subtle rounded-xl overflow-hidden glow-ring`
- 主题：紫色暗色，代码字体 `JetBrains Mono` 13px/1.6
- 语法高亮：keyword `#c084fc`、string `#a5b4fc`、number `#f0abfc`、comment `#475569` italic
- 全屏按钮：右上角 28px 图标按钮，Escape/点击遮罩退出
- 全屏模式：`fixed inset-0 z-[200]`，深色遮罩 `rgba(2,6,23,0.85)`，编辑器最大宽度 1200px 居中

### 6.4 开关（Toggle）

```
w-9 h-5 rounded-full bg-slate-600 peer-checked:bg-accent-500
after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm
after:transition-transform peer-checked:after:translate-x-4
```

纯 CSS 实现，无 JS 交互逻辑。

### 6.5 模态框

```
glass-strong rounded-2xl p-6 w-full max-w-sm
背景遮罩: fixed inset-0 bg-black/60 backdrop-blur-sm
关闭: 点遮罩 / Escape 键
role="dialog" aria-label
```

### 6.6 徽章（Badge）

```
text-[10px] px-2 py-0.5 rounded-full font-medium border
success: bg-accent-500/15 text-accent-400 border-accent-500/20
warning: bg-amber-500/10 text-amber-400 border-amber-500/20
danger:  bg-red-500/10 text-red-400 border-red-500/20
info:    bg-blue-500/10 text-blue-400 border-blue-500/20
default: bg-slate-500/10 text-slate-400 border-slate-500/20
```

### 6.7 状态指示点

```
w-2 h-2 rounded-full
online:  bg-accent-500 shadow 0 0 6px rgba(168,85,247,0.5)
offline: bg-slate-600
```

### 6.8 StatCard（指标卡片）

```
glass rounded-2xl p-5
变体: accent(紫), blue(蓝), amber(琥珀), rose(玫红)
内容: label(小字辅助), value(大号), subtitle(底部说明)
装饰: 右上角彩色发光圆点
```

### 6.9 Panel（面板容器）

```
glass rounded-2xl p-6
可选: title(标题) + snippet(右上角文字/徽章)
```

### 6.10 ProgressBar（进度条）

```
高度: h-2
颜色: accent(<50%), amber(50-80%), red(>80%)
信息: label(左), detail(右百分比)
```

### 6.11 Empty（空状态）

```
居中布局: py-12
收件箱 SVG 图标(紫色, 48px) + 提示文字(text-slate-500)
```

---

## 7. 导航 Header

### 结构
```
┌──────────────────────────────────────────────────────┐
│ [Brand] [Nav: 首页 广播 推送 回复]  [WS Link] [用户] │
└──────────────────────────────────────────────────────┘
```
- 高度：56px (h-14)
- 布局：flex，左侧品牌+导航，右侧 WS 链接+用户
- 样式：`glass-strong sticky top-0 z-50`
- 品牌：「DuMiMessager」+ 「WS」紫色徽章
- 导航项：激活态白色半透明背景

### WS 链接区域
- 显示：8位短 token URL，等宽字体 `max-w-[320px] truncate`，小屏隐藏
- 复制按钮：点后显示「已复制」2秒
- 刷新按钮：调 POST `/api/auth/ws-token` 轮换 token，琥珀色 hover

---

## 8. 动效

| 场景 | 动效 |
| --- | --- |
| 按钮 hover | `transition-all duration-200` |
| 按钮 press | `active:scale-[0.97]` |
| 输入框聚焦 | `transition-all duration-200`，ring 渐入 |
| 模态框出现 | `animate-fade-in` |
| 开关切换 | `after:transition-transform duration-300` |
| 玻璃面板 hover | `transition-all duration-200 ease` |

### 减弱动效
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. 排版

### 字体
- 正文：`Inter`, system-ui, sans-serif
- 代码：`JetBrains Mono`, `Fira Code`, `SF Mono`, monospace

### 字号层级

| 用途 | 字号 | 行高 |
| --- | --- | --- |
| 页面标题 | `text-lg` (18px) | 28px |
| 正文 | `text-sm` (14px) | 20px |
| 辅助文字 | `text-xs` (12px) | 16px |
| 小按钮/徽章 | `text-[10px]` | — |
| 代码编辑 | 13px | 1.6 |

---

## 10. 响应式

| 断点 | 前缀 | 适配 |
| --- | --- | --- |
| 640px | `sm:` | — |
| 768px | `md:` | 网格从 1 列变为 2-3 列 |
| 1024px | `lg:` | 网格扩展到 2-4 列 |
| 1280px | `xl:` | WS 链接文字从隐藏变为显示 |

---

## 11. 可访问性

- **焦点指示**：输入框使用 `focus:ring-2`（box-shadow 实现），键盘 Tab 导航可见
- **全局 `outline: none !important`**：仅禁用浏览器默认 outline，ring 焦点环不受影响
- **动画尊重** `prefers-reduced-motion`
- **模态框**：Escape 关闭，点击遮罩关闭，role="dialog"
- **颜色对比度**：文字/背景符合 WCAG AA 标准

---

## 12. 图标

不使用图标库。所有图标为内联 SVG：
- 全屏：展开/收缩箭头
- 状态点：CSS 圆点
- 未来可集成 Lucide 或 Heroicons
