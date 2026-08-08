# DuMiMessager — 系统全景报告

## 1. 项目概览

**DuMiMessager** 是一个基于 SvelteKit 的 WebSocket 消息管理工具。它运行在单一 HTTP 端口上，同时提供 Web 管理界面和 WebSocket 实时通信服务。支持消息广播、定时推送、自动回复和 HTTP 上报接收。

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 框架 | SvelteKit 2.x (Svelte 5 runes) |
| 样式 | Tailwind CSS 3.x + 自定义玻璃态主题 |
| 数据库 | SQLite via better-sqlite3 (WAL 模式) |
| WebSocket | ws 库 |
| 运行时 | Node.js (ESM) |
| 构建 | Vite 6.x + @sveltejs/adapter-node |

### 端口模型

```
单一端口（默认 3000 / dev 5173）
├── HTTP: SvelteKit handler
│   ├── 页面路由（/, /admin, /timer, /reports, /login）
│   └── API 路由（/api/*）
└── WebSocket: /ws?token=xxx
```

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────┐
│                    浏览器                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 管理界面  │  │ WebSocket │  │ 外部 HTTP 上报 │  │
│  │ (Svelte) │  │ 客户端    │  │ (POST /report)│  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
└───────┼──────────────┼───────────────┼───────────┘
        │ HTTP          │ WS            │ HTTP
┌───────┼──────────────┼───────────────┼───────────┐
│       ▼              ▼               ▼           │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐      │
│  │SvelteKit│  │ WS Server │  │ API Routes│      │
│  │ Handler │  │  (/ws)    │  │           │      │
│  └────┬────┘  └─────┬─────┘  └─────┬─────┘      │
│       │              │              │             │
│       └──────────────┼──────────────┘             │
│                      ▼                            │
│              ┌──────────────┐                     │
│              │   SQLite DB  │                     │
│              │ (data/ws-    │                     │
│              │  server.db)  │                     │
│              └──────────────┘                     │
│                 Node.js Server                    │
└──────────────────────────────────────────────────┘
```

---

## 3. 路由与页面

### 3.1 页面路由

| 路径 | 页面 | 功能 |
| --- | --- | --- |
| `/login` | 登录页 | 用户名+密码登录，未登录用户自动重定向到此 |
| `/` | 首页 | 仪表盘/概览 |
| `/admin` | 广播页 | 向所有 WS 客户端广播消息，JSON 编辑器 |
| `/timer` | 推送页 | 创建/管理定时推送任务，支持分组开关 |
| `/reports` | 回复页 | HTTP 上报日志 + WS 消息日志双栏显示 |

### 3.2 API 路由

#### 认证 (/api/auth/*)

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| POST | `/api/auth/login` | 登录：验证用户名密码，返回 session cookie |
| POST | `/api/auth/logout` | 退出：清除 session |
| GET | `/api/auth/me` | 获取当前登录用户信息 |
| POST | `/api/auth/change-password` | 修改密码（需旧密码验证） |
| GET | `/api/auth/ws-token` | 获取 WebSocket 鉴权 token (8位 hex) |
| POST | `/api/auth/ws-token` | 轮换（刷新）WS token，旧 token 立即失效 |

#### WebSocket 管理

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| POST | `/api/broadcast` | 向所有 WS 客户端广播消息 |
| GET | `/api/clients` | 获取在线客户端数量 |
| GET | `/api/clients/detail` | 获取客户端详细信息列表 |
| POST | `/api/clients/kick/:id` | 踢出指定客户端 |
| POST | `/api/client/send/:id` | 向指定客户端发送消息 |
| POST | `/api/client/send-multi` | 向多个客户端发送消息 |
| GET | `/api/logs` | 获取 WS 消息日志 |

#### 定时器 (/api/timer/*)

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| POST | `/api/timer/start` | 创建并启动定时器 |
| POST | `/api/timer/stop` | 停止定时器 |
| POST | `/api/timer/remove` | 删除定时器 |
| GET | `/api/timer/status` | 获取所有定时器状态 |

#### 自动回复 (/api/auto-reply/*)

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/api/auto-reply/rules` | 列出所有自动回复规则 |
| POST | `/api/auto-reply/rules` | 创建规则 |
| PUT | `/api/auto-reply/rules/:id` | 更新规则 |
| DELETE | `/api/auto-reply/rules/:id` | 删除规则 |
| POST | `/api/auto-reply/rules/:id/toggle` | 切换规则启用/禁用 |

#### 系统

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/api/system/stats` | 获取系统统计（连接数、发送量等） |
| POST | `/api/report` | 外部 HTTP 上报（无需认证） |

---

## 4. WebSocket 协议

### 连接

```
ws://host/ws?token=<8位hex>
```

### 鉴权流程

1. 用户登录 → 创建 HTTP session (64位 hex, 24h 有效期)
2. 页面加载 → 调用 `getOrCreateWSToken(userId)` 生成 WS token (8位 hex)
3. WS token 双向索引存储：`ws_token_uid:{userId}` ↔ `ws_token_val:{token}`
4. WS 连接时在 `verifyClient` 回调中校验 token
5. 无效 token → HTTP 401 拒绝握手（客户端收到 error 事件）
6. 点击「刷新」→ `rotateWSToken()` 轮换，旧 token 立即失效

### 服务器 → 客户端消息

| Type | 说明 |
| --- | --- |
| `welcome` | 连接成功后首条消息，含 clientId |
| `ws-message` | 来自其他客户端的消息 |

---

## 5. 数据库 Schema

### 表结构

**users** — 管理员用户
| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 用户ID |
| username | TEXT UNIQUE | 用户名 |
| password | TEXT | scrypt 哈希 (salt:hash) |
| created_at | TEXT | 创建时间 |

**kv_store** — 键值存储（会话、WS token、统计）
| 列 | 类型 | 说明 |
| --- | --- | --- |
| key | TEXT PK | 键 |
| value | TEXT | 值 |

键前缀约定：
- `session:` — HTTP 会话
- `ws_token_uid:` — 用户ID → WS token 映射
- `ws_token_val:` — WS token → 用户ID 映射
- `_totalBytesSent` / `_totalSendCount` — 统计

**message_logs** — WS 消息日志
| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 自增ID |
| entry_json | TEXT | JSON 消息体 |

**timer_configs** — 定时器配置
| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 定时器ID |
| name | TEXT | 名称 |
| group_name | TEXT | 分组 |
| message | TEXT | 广播消息 JSON |
| interval_ms | INTEGER | 间隔(毫秒) |
| start_at | INTEGER | 启动时间戳 |
| send_count | INTEGER | 已发送次数 |

**auto_reply_rules** — 自动回复规则
| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 规则ID |
| name | TEXT | 规则名称 |
| pattern | TEXT | 正则表达式 |
| reply | TEXT | 回复消息 JSON |
| enabled | INTEGER | 是否启用 |
| match_count | INTEGER | 匹配次数 |
| last_match | TEXT | 最后匹配时间 |

**report_logs** — HTTP 上报日志
| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 自增ID |
| time | TEXT | 时间 |
| ip | TEXT | 来源IP |
| method | TEXT | HTTP 方法 |
| body | TEXT | 请求体 JSON |

### 默认数据
- 管理员：admin / admin123
- 默认自动回复规则：「Ping」→ `^ping$` → `{"type":"pong","message":"pong"}`

---

## 6. 认证系统

### 双 Token 体系

| Token 类型 | 用途 | 长度 | 有效期 | 存储 |
| --- | --- | --- | --- |---|
| Session Token | HTTP 登录态 (cookie) | 64位 hex | 24小时 | kv_store |
| WS Token | WebSocket 鉴权 (URL参数) | 8位 hex | 永久(手动刷新) | kv_store 双向索引 |

### 密码安全
- 算法：scrypt (N=16384, r=8, p=1)
- 格式：`salt:hash` (各16/64字节 hex)
- 验证：timingSafeEqual 防时序攻击

### 中间件 (hooks.server.js)
- 公开路径：`/login`、`/api/auth/login`
- 未登录访问受保护页面 → 302 → `/login`
- 未登录访问 API → 401 JSON
- 已登录访问登录页 → 302 → `/`
- API 路由自动添加 CORS 头

---

## 7. 组件库

| 组件 | 文件 | 用途 |
| --- | --- | --- |
| Badge | `src/lib/components/Badge.svelte` | 行内标签，支持 success/warning/danger/info/default 变体 |
| ChangePasswordModal | `src/lib/components/ChangePasswordModal.svelte` | 修改密码模态框 |
| Empty | `src/lib/components/Empty.svelte` | 空状态占位（收件箱 SVG 图标 + 提示文字） |
| JsonEditor | `src/lib/components/JsonEditor.svelte` | CodeMirror 6 JSON 编辑器，全屏模式 |
| Panel | `src/lib/components/Panel.svelte` | 玻璃态卡片容器，可选标题和徽章 |
| ProgressBar | `src/lib/components/ProgressBar.svelte` | 水平进度条，带标签和颜色编码 |
| StatCard | `src/lib/components/StatCard.svelte` | 指标卡片，支持 accent/blue/amber/rose 变体 |
| Toggle | `src/lib/components/Toggle.svelte` | CSS 开关组件（accent-500 激活态） |

### JsonEditor 详细

基于 CodeMirror 6 的 JSON 编辑器，特性：
- 紫色暗色主题（caret、selection、gutter、bracket matching 均为紫色系）
- JSON 语法高亮（keyword 紫色、string 靛蓝、number 粉色、comment 斜体灰色）
- 自动补全、代码折叠、括号匹配
- 全屏编辑模式（右上角 SVG 按钮、Escape 退出、点击遮罩退出）
- `$effect` 监听全屏状态自动触发 `requestMeasure()` 重绘
- 对外暴露 `setValue(newValue)` / `getValue()` 方法

### ChangePasswordModal 详细

修改密码模态框：
- 旧密码 + 新密码（≥4位）+ 确认新密码
- 表单验证（非空、长度、一致性）
- 点击遮罩/Escape 关闭（`onkeydown` + `onclick`）
- 成功提示后 1.5s 自动关闭并 reset

### 工具函数

| 文件 | 导出 | 用途 |
| --- | --- | --- |
| `src/lib/utils/helpers.js` | `fmtBytes`, `fmtUptime`, `elapsed`, `timePart`, `datePart`, `escHtml`, `escAttr`, `barColor` | 格式化与转义 |
| `src/lib/utils/cn.js` | `cn()` | clsx + tailwind-merge 合并类名 |

---

## 8. 启动方式

### 开发模式
```bash
npm run dev        # Vite dev server on port 5173
```
WS 通过自定义 Vite 插件挂载到 dev server。

### 生产模式
```bash
npm run build      # 构建到 .svelte-kit/output/
npm run start      # node server.js on port 3000
```
`server.js` 创建 HTTP server，SvelteKit 处理页面/API，WS 挂载到同一 server。

---

## 9. 关键约束

| 项目 | 限制值 |
| --- | --- |
| 最大 WS 客户端数 | 1000 |
| 单条消息最大 | 64KB |
| 消息日志保留 | 200条 |
| 上报日志保留 | 200条 |
| 自动回复规则上限 | 50条 |
| Session 有效期 | 24小时 |
| DB 文件位置 | `data/ws-server.db` |
