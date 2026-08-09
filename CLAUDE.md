# Claude Code 项目配置说明

本文档记录了 DuMiMessager 项目中 Claude Code 的完整配置规则、启用的 Skills、插件和工作模式，方便团队成员复现相同的 AI 辅助开发体验。

---

## 目录

1. [环境配置](#1-环境配置)
2. [全局 Marketplace](#2-全局-marketplace)
3. [全局插件](#3-全局插件)
4. [全局 Skills](#4-全局-skills)
5. [项目级 Skills](#5-项目级-skills)
6. [权限配置](#6-权限配置)
7. [MCP 集成](#7-mcp-集成)
8. [工作模式](#8-工作模式)
9. [一键设置脚本](#9-一键设置脚本)
10. [手动设置步骤](#10-手动设置步骤)
11. [项目文档](#11-项目文档)

---

## 1. 环境配置

### API 后端
使用 DeepSeek API 作为 Anthropic 兼容后端，模型为 `deepseek-v4-pro`，上下文窗口 1M tokens。

### 完整 `~/.claude/settings.json` 配置

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<your-api-key>",
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "deepseek-v4-pro",
    "AUTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-pro",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "0.5",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "1000000",
    "DISABLE_COMPACT": "1"
  },
  "model": "deepseek-v4-pro"
}
```

### 关键参数说明

| 参数 | 值 | 说明 |
| --- | --- | --- |
| `ANTHROPIC_BASE_URL` | `https://api.deepseek.com/anthropic` | DeepSeek 的 Anthropic 兼容 API 端点 |
| `ANTHROPIC_MODEL` | `deepseek-v4-pro` | 默认使用的模型 |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `0.5` | 上下文压缩阈值（50% 时触发） |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `1000000` | 自动压缩窗口大小 |
| `DISABLE_COMPACT` | `1` | 禁用自动压缩（1M 上下文足够，不需要压缩） |

---

## 2. 全局 Marketplace

Marketplace 是 Skills/Plugins 的安装来源，配置在 `~/.claude/settings.json` 中。

| Marketplace | GitHub 仓库 | 说明 |
| --- | --- | --- |
| **claude-plugins-official** | `anthropics/claude-plugins-official` | Claude 官方插件市场 |
| **claude-hud** | `jarrodwatts/claude-hud` | HUD 状态栏插件 |
| **anthropic-agent-skills** | `anthropics/skills` | Anthropic 官方技能集 |
| **superpowers-marketplace** | `obra/superpowers-marketplace` | 社区超级技能市场 |

### 注册 Marketplace 的命令

```bash
claude mcp add marketplace claude-plugins-official --github anthropics/claude-plugins-official
claude mcp add marketplace claude-hud --github jarrodwatts/claude-hud
claude mcp add marketplace anthropic-agent-skills --github anthropics/skills
claude mcp add marketplace superpowers-marketplace --github obra/superpowers-marketplace
```

或者直接在 `~/.claude/settings.json` 中配置：

```json
{
  "extraKnownMarketplaces": {
    "anthropic-agent-skills": {
      "source": { "repo": "anthropics/skills", "source": "github" }
    },
    "claude-hud": {
      "source": { "repo": "jarrodwatts/claude-hud", "source": "github" }
    }
  }
}
```

---

## 3. 全局插件

安装在 `~/.claude/settings.json` → `enabledPlugins`，插件文件在 `~/.claude/plugins/cache/`。

| 插件 | 来源 Marketplace | 用途 | 安装命令 |
| --- | --- | --- | --- |
| **claude-hud** | `claude-hud` | 终端状态栏/仪表盘，显示会话信息 | `/plugin install claude-hud@claude-hud` |
| **document-skills** | `anthropic-agent-skills` | 文档处理（xlsx, docx, pptx, pdf） | `/plugin install document-skills@anthropic-agent-skills` |
| **example-skills** | `anthropic-agent-skills` | 示例技能集（算法艺术、品牌指南、Canvas 设计、MCP 构建器、Slack GIF 等） | `/plugin install example-skills@anthropic-agent-skills` |

### 在 settings.json 中的配置

```json
{
  "enabledPlugins": {
    "claude-hud@claude-hud": true,
    "document-skills@anthropic-agent-skills": true,
    "example-skills@anthropic-agent-skills": true
  }
}
```

---

## 4. 全局 Skills

这些 Skills 安装在 `~/.claude/skills/`，对所有项目生效。在对话中使用 `/skill-name` 即可调用。

### Web 前端类

| Skill | 用途 |
| --- | --- |
| **frontend-design** | 独特、有意图的视觉设计指导 |
| **ui-animation** | UI 动画设计（GSAP、CSS 动效） |
| **ui-ux-pro-max** | UI/UX 设计智能库（84 风格、192 调色板、74 字体配对、22 技术栈） |
| **web-design-guidelines** | Web 界面设计规范审查 |

### Vue 生态类

| Skill | 用途 |
| --- | --- |
| **vue** | Vue.js 渐进式框架（Composition API、响应式） |
| **vue-best-practices** | Vue 3 + TypeScript + Volar 最佳实践 |
| **vueuse-functions** | VueUse 组合式函数库应用 |
| **nuxt** | Nuxt 全栈框架（SSR、auto-imports、文件路由） |
| **pinia** | Pinia 状态管理库 |
| **vite** | Vite 构建工具（HMR、插件、构建优化） |
| **vitest** | Vitest 单元测试框架 |
| **vitepress** | VitePress 静态站点生成器 |

### 工具类

| Skill | 用途 |
| --- | --- |
| **antfu** | Anthony Fu 的 Web 开发偏好与最佳实践 |
| **find-skills** | 帮助发现和安装新 Skills |
| **pnpm** | pnpm 包管理器 |
| **tsdown** | TypeScript 库打包工具（Rolldown + Oxc） |
| **turborepo** | Monorepo 管理工具 |
| **unocss** | UnoCSS 原子化 CSS 引擎 |
| **slidev** | 开发者幻灯片（Markdown + Vue） |

---

## 5. 项目级 Skills

项目本地 Skills 安装在 `.claude/skills/`，随 Git 仓库一起分发，克隆即用。

### 5.1 Skills 总览

| Skill | 用途 | 核心数据 |
| --- | --- | --- |
| **banner-design** | 社交媒体/广告/网站 Banner 设计，支持 22+ 风格 | 尺寸规范、风格参考 |
| **brand** | 品牌语音、视觉识别、信息框架、资产管理 | 品牌指南模板、色彩管理、语音框架 |
| **design** | 综合设计：品牌识别、设计令牌、Logo（55 风格）、CIP 模型、Banner、图标 | CIP 数据、图标数据、Logo 数据 |
| **design-system** | 设计令牌架构（三层：原始→语义→组件）、组件规范、CSS 变量 | 7 个 CSV 数据表、Token 生成脚本 |
| **slides** | HTML 演示文稿（Chart.js）、响应式布局、文案公式 | 文案公式、布局模式、HTML 模板 |
| **ui-styling** | shadcn/ui 组件、Tailwind CSS 样式、无障碍设计、暗色模式 | Tailwind 配置、shadcn 组件参考 |
| **ui-ux-pro-max** | UI/UX 设计智能库（67 样式、161 调色板、57 字体配对、25 图表） | 12 个 CSV 数据库、Python 搜索脚本 |

### 5.2 Skills 目录结构

```
.claude/skills/
├── banner-design/
│   ├── SKILL.md
│   └── references/
│       └── banner-sizes-and-styles.md
├── brand/
│   ├── SKILL.md
│   ├── references/       (10 个品牌参考文档)
│   ├── scripts/          (4 个工具脚本)
│   └── templates/
├── design/
│   ├── SKILL.md
│   ├── data/             (CIP + Icon + Logo 数据)
│   ├── references/       (16 个设计参考文档)
│   └── scripts/
├── design-system/
│   ├── SKILL.md
│   ├── data/             (7 个 CSV 数据表)
│   ├── references/       (7 个 Token 架构文档)
│   ├── scripts/          (9 个生成器/验证器脚本)
│   └── templates/
├── slides/
│   ├── SKILL.md
│   └── references/       (5 个幻灯片参考文档)
├── ui-styling/
│   ├── SKILL.md
│   ├── references/       (7 个样式参考文档)
│   └── scripts/
└── ui-ux-pro-max/
    ├── SKILL.md
    ├── data/             (12 个 CSV 数据库)
    └── scripts/          (3 个 Python 搜索脚本)
```

### 5.3 启用方式

在对话中直接使用 `/skill-name`（如 `/ui-styling`），Claude Code 会自动加载对应 Skill 的指令。

### 5.4 Skills 安装来源

这些项目级 Skills 来自 [superpowers-marketplace](https://github.com/obra/superpowers-marketplace)（`obra/superpowers-marketplace`），通过以下方式安装到项目中：

```bash
# 在项目根目录下，通过 /skill-name 调用时选择安装到项目
# 或者手动复制 marketplace 中的 skill 目录到 .claude/skills/
```

---

## 6. 权限配置

项目本地权限配置在 `.claude/settings.local.json`，授权了以下操作无需每次确认：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Bash(pkill -f \"vite dev\")",
      "Bash(pkill -f \"node.*server\")",
      "Bash(sqlite3 *)",
      "Bash(node *)",
      "mcp__webstorm__read_file",
      "mcp__webstorm__search_in_files_by_text",
      "mcp__webstorm__find_files_by_name_keyword",
      "mcp__webstorm__list_directory_tree",
      "mcp__webstorm__replace_text_in_file",
      "mcp__webstorm__find_files_by_glob",
      "mcp__webstorm__search_file",
      "mcp__webstorm__search_text"
    ]
  }
}
```

> **注意**：`settings.local.json` 不会被 Git 追踪（在 `.gitignore` 中）。新成员克隆项目后需要手动创建此文件，或运行 `scripts/setup-claude.sh` 自动生成。

---

## 7. MCP 集成

项目通过 JetBrains WebStorm MCP 服务器连接 IDE，提供以下能力：

| 功能分类 | 可用工具 |
| --- | --- |
| **文件操作** | `read_file`、`replace_text_in_file`、`create_new_file`、`open_file_in_editor` |
| **文件搜索** | `find_files_by_name_keyword`、`find_files_by_glob`、`search_file` |
| **文本搜索** | `search_in_files_by_text`、`search_in_files_by_regex`、`search_text` |
| **目录浏览** | `list_directory_tree` |
| **代码分析** | `get_file_problems`（IntelliJ inspections）、`get_symbol_info`（类型/签名查看）、`build_project`（编译） |
| **数据库** | SQLite 直连查询、Schema 浏览、表数据预览 |
| **终端** | 在 IDE 内置终端执行命令 |
| **重构** | `rename_refactoring`、`reformat_file` |

### WebStorm MCP 安装
安装 WebStorm 的 **Claude Code MCP** 插件，使 Claude Code 可以直接读写 IDE 中的文件和搜索结果。

---

## 8. 工作模式

### 8.1 开发流程

```
1. 用户提出需求
2. Explore Agent 探索代码库 → 理解现有架构
3. 主 Agent 设计方案 → 用户确认
4. 编写/修改代码
5. npm run build 验证编译
6. npm run dev + curl/Node 脚本端到端测试
7. pkill 清理服务器进程
```

### 8.2 使用的 Agent 类型

| Agent | 用途 | 何时使用 |
| --- | --- | --- |
| **Explore** | 只读搜索，多文件扫查，快速定位代码位置 | 理解代码库结构、搜索多文件 |
| **Plan** | 软件架构设计，实现方案规划 | 复杂功能的前期设计 |
| **General-purpose** | 复杂多步骤任务 | 需要读写文件的综合任务 |

### 8.3 测试方式

| 方法 | 用途 |
| --- | --- |
| `npm run build` | 编译验证（每次修改后） |
| `npm run dev &` + `curl` | API 端到端测试 |
| Node.js 内联脚本 | WebSocket 连接测试 |
| `pkill -f "vite dev"` | 测试后清理 |
| `sqlite3 data/ws-server.db "SELECT ..."` | 数据库状态验证 |

---

## 9. 一键设置脚本

项目提供了 `scripts/setup-claude.sh` 自动化脚本，一键完成所有配置：

```bash
chmod +x scripts/setup-claude.sh
./scripts/setup-claude.sh
```

脚本会自动：
1. 检查 Node.js 和 npm 环境
2. 安装/更新 Claude Code CLI
3. 配置 DeepSeek API 后端
4. 注册 Marketplace
5. 安装全局插件（claude-hud、document-skills、example-skills）
6. 安装项目 npm 依赖
7. 创建 `.claude/settings.local.json` 权限配置
8. 输出验证步骤

详细的运行说明见脚本注释。

---

## 10. 手动设置步骤

如果不想使用自动化脚本，按以下步骤手动配置：

### 步骤 1：安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 步骤 2：克隆项目

```bash
git clone <repo-url>
cd ws-server
```

### 步骤 3：安装项目依赖

```bash
npm install
```

### 步骤 4：配置 API 后端

编辑 `~/.claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<your-api-key>",
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "deepseek-v4-pro",
    "AUTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-pro",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "0.5",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "1000000",
    "DISABLE_COMPACT": "1"
  },
  "model": "deepseek-v4-pro"
}
```

### 步骤 5：注册 Marketplace（在 Claude Code 交互界面中）

```
/plugin marketplace add claude-hud --github jarrodwatts/claude-hud
/plugin marketplace add anthropic-agent-skills --github anthropics/skills
```

### 步骤 6：安装全局插件

```
/plugin install claude-hud@claude-hud
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

### 步骤 7：创建权限配置

创建 `.claude/settings.local.json`：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Bash(pkill -f \"vite dev\")",
      "Bash(pkill -f \"node.*server\")",
      "Bash(sqlite3 *)",
      "Bash(node *)",
      "mcp__webstorm__read_file",
      "mcp__webstorm__search_in_files_by_text",
      "mcp__webstorm__find_files_by_name_keyword",
      "mcp__webstorm__list_directory_tree",
      "mcp__webstorm__replace_text_in_file",
      "mcp__webstorm__find_files_by_glob",
      "mcp__webstorm__search_file",
      "mcp__webstorm__search_text"
    ]
  }
}
```

### 步骤 8：验证

```bash
cd ws-server
claude
```

进入交互界面后，CLI 会自动加载项目 `.claude/` 目录下的配置。输入 `/ui-styling` 测试项目级 Skill 是否正常加载。

---

## 11. 项目文档

| 文档 | 说明 |
| --- | --- |
| `CLAUDE.md` | 本文档 — Claude Code 完整配置说明 |
| `static/SYSTEM-OVERVIEW.md` | 系统全景报告（架构、API、DB Schema、组件） |
| `static/UI-UX-SPEC.md` | UI/UX 设计规范（色彩、间距、组件、动效） |
| `scripts/setup-claude.sh` | 一键设置脚本 |
