# 🌾☠️信使 — 项目全景文档

> **WebSocket 管理与模拟工具** — 支持消息上报、推送、定时广播、消息日志、自动回复规则

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [架构设计](#4-架构设计)
5. [功能模块](#5-功能模块)
6. [API 接口文档](#6-api-接口文档)
7. [前端页面](#7-前端页面)
8. [部署说明](#8-部署说明)
9. [数据库设计](#9-数据库设计)
10. [已知问题与待改进](#10-已知问题与待改进)

---

## 1. 项目概述

**信使**是一个轻量级的 WebSocket 服务管理平台，基于 Koa 框架构建。它可用于：

- 模拟 WebSocket / MQTT 服务端，供客户端联调
- 向已连接的客户端推送或广播消息
- 配置定时广播任务，周期性推送数据
- 接收 HTTP 上报数据并转发至 WebSocket 客户端
- 通过正则自动回复规则自动响应匹配的消息
- 记录和管理消息日志

### 基础信息

| 项目 | 详情 |
|---|---|
| **仓库** | `ws-server` |
| **主分支** | `main` |
| **入口文件** | `src/index.js` |
| **默认端口** | `3000` |
| **模块规范** | ES Module (`"type": "module"`) |
| **Docker 镜像** | `meterxu/ws-server:latest` |
| **许可证** | ISC |

---

## 2. 技术栈

### 后端

| 组件 | 技术 | 版本 |
|---|---|---|
| 运行时 | Node.js | 22 |
| HTTP 框架 | Koa | ^2.11.0 |
| 路由 | koa-router | ^7.4.0 |
| 跨域 | koa2-cors | ^2.0.6 |
| 请求体解析 | koa-body | ^4.1.1 |
| WebSocket | ws | ^8.18.0 |
| 数据库 | better-sqlite3 (SQLite) | ^11.0.0 |
| HTTP 客户端 | axios | ^1.12.2 |
| Swagger 装饰器 | koa-swagger-decorator | ^1.8.6（未使用） |

### 前端

| 组件 | 技术 |
|---|---|
| 页面 | 原生 HTML5 + CSS3 + JavaScript（零构建） |
| 编辑器 | CodeMirror 5.65（CDN 引入） |
| WebSocket | 浏览器原生 `WebSocket` API |

### DevOps

| 组件 | 技术 |
|---|---|
| 容器化 | Docker（`node:22-bullseye-slim`） |
| 测试 | Playwright ^1.61.1（未编写用例） |
| 包管理 | npm / yarn |

---

## 3. 项目结构

```
ws-server/
├── assets/                          # 静态资源（截图 + 本文档）
├── src/
│   ├── index.js                     # 🚀 应用入口
│   │   · 创建 Koa 实例，注册中间件
│   │   · 创建 HTTP Server 监听 3000
│   │   · 初始化全局 WebSocket 服务
│   │
│   ├── middleware/
│   │   └── webSocket.js             # 🔌 WebSocket 核心模块 (239行)
│   │       · WS 类：连接管理 / 消息收发 / 定时广播
│   │       · 自动回复规则匹配 / 流量统计 / 消息日志
│   │
│   ├── controller/
│   │   └── demoController.js        # 🎮 路由控制器 (384行)
│   │       · 全部 REST API + 页面渲染
│   │       · 上报数据处理 / 系统监控
│   │
│   ├── router/
│   │   └── index.js                 # 📦 路由导出（仅 2 行）
│   │
│   ├── views/                       # 🖥️ 前端页面（共 2236 行）
│   │   ├── index.html               # 首页：连接概览 + 消息日志 (313行)
│   │   ├── admin.html               # 管理：消息推送 + 客户端管理 (451行)
│   │   ├── timer.html               # 定时广播配置与管理 (719行)
│   │   └── reports.html             # 上报日志 + 自动回复规则管理 (753行)
│   │
│   ├── client.js                    # 🛠️ 独立工具：分片上传客户端 (47行)
│   └── db/
│       └── database.js              # ⚠️ 缺失：SQLite 持久化层
│
├── data/                            # SQLite 数据库文件（volume 挂载）
├── Dockerfile                       # Docker 构建
├── .dockerignore
├── .gitignore
├── package.json
└── README.md
```

---

## 4. 架构设计

### 4.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                        浏览器客户端                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │index.html│  │admin.html│  │timer.html│  │reports.html  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       │             │             │               │          │
│       │   HTTP REST API (fetch)    │   WebSocket (ws://)     │
└───────┼─────────────┼─────────────┼───────────────┼──────────┘
        │             │             │               │
        ▼             ▼             ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│                   Koa HTTP Server (:3000)                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  中间件: cors → koa-body → 自定义头 → router         │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                     │
│  ┌──────────────────────▼──────────────────────────────┐     │
│  │             demoController (路由处理)                 │     │
│  │  /api/*  REST API    │  /admin, /timer 等  页面渲染   │     │
│  └──────────┬───────────────────────┬──────────────────┘     │
│             │                       │                         │
│             │  global.webSocket     │                         │
└─────────────┼───────────────────────┼─────────────────────────┘
              │                       │
              ▼                       ▼
┌──────────────────────────────────────────────────────────────┐
│                WebSocket Server (/ws)                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  WS 类 (middleware/webSocket.js)                     │     │
│  │  · clients Map      客户端连接池（上限 1000）         │     │
│  │  · timers Map       定时器管理                       │     │
│  │  · _messageLogs[]   消息日志（上限 200）              │     │
│  │  · 自动回复规则匹配                                   │     │
│  │  · 流量统计（发送次数/累计字节）                       │     │
│  └──────────────────┬──────────────────────────────────┘     │
│                     │                                         │
│  ┌──────────────────▼──────────────────────────────────┐     │
│  │              SQLite 持久化层 (⚠️ 文件缺失)             │     │
│  │  message_logs / timer_configs / auto_reply_rules     │     │
│  │  report_logs   / stats          / kv_store           │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘

         ▲                              │
         │  HTTP POST /api/report       │  WebSocket
         │                              ▼
┌────────────────┐          ┌──────────────────────┐
│   外部系统      │          │   WebSocket 客户端     │
│  (如知眸AI)    │          │  (调试工具/模拟设备)    │
└────────────────┘          └──────────────────────┘
```

### 4.2 核心数据流

```
消息广播:
  POST /api/broadcast → global.webSocket.sendToClient(data)
    → 遍历 clients Map → ws.send(JSON.stringify(data))
    → 记录日志 + 更新统计

消息接收:
  客户端 ws.send(msg) → WS 接收
    → 记录日志
    → 遍历自动回复规则（正则匹配）
      → 命中: 发送规则预设回复
      → 未命中: 回显给所有客户端

消息上报:
  POST /api/report (body) → demoController
    → 记录 reportLog
    → 自动回复规则匹配 → 广播/回复

定时广播:
  POST /api/timer/start → global.webSocket.startTimer(msg, intervalMs)
    → setInterval → sendToClient → updateTimerSendCount
```

### 4.3 关键设计决策

| 决策 | 说明 |
|---|---|
| `global.webSocket` | Node.js 全局对象共享 WebSocket 实例，路由层直接访问 |
| 内存 + SQLite 双写 | 热数据在内存（低延迟），冷数据持久化（重启恢复） |
| 零构建前端 | 原生 HTML，CDN 引入 CodeMirror，无 webpack/vite |
| ES Module | `import/export` 语法，符合现代 Node.js 规范 |
| 单体控制器 | 所有路由集中在 `demoController.js`，适合小型项目 |

---

## 5. 功能模块

### 5.1 WebSocket 连接管理

- 最大 **1000** 并发连接，超限返回状态码 1013
- 记录每客户端：ID、IP、连接时间、就绪状态
- 新连接自动发送欢迎消息 `{type: 'welcome', clientId, message}`
- 管理员可查看详情、踢出指定客户端、向单个客户端发送消息

### 5.2 消息广播

- 全量广播：遍历所有 OPEN 客户端发送
- 定向发送：`sendToClientById(id, data)`
- 消息大小限制：**64KB**
- 流量统计：累计发送次数和字节数（每 100 次输出日志）

### 5.3 定时广播

- 多定时器独立管理（启动/停止/删除）
- 最小间隔：**1 秒**
- 持久化到 SQLite，重启后自动恢复
- 支持 CodeMirror 编辑 JSON 消息体

### 5.4 自动回复规则

- 正则匹配收到的消息内容
- 匹配后自动发送预设回复
- 完整 CRUD + 启用/禁用切换
- 匹配计数和最近匹配时间追踪
- 上限：**50 条**规则

### 5.5 消息上报

- `POST /api/report` 接收外部系统数据
- 自动广播给所有 WebSocket 客户端
- 同时触发自动回复规则匹配
- 日志记录到内存 + SQLite

### 5.6 消息日志

- 类型：`receive`（接收）、`send`（发送）
- 保留最近 **200 条**（内存 + SQLite 自动清理）
- 查询 API 支持指定条数（默认 50，最大 200）

### 5.7 系统监控

- **CPU**：使用率、核心数、型号、1/5/15 分钟负载
- **内存**：堆使用/总量、RSS、外部内存、系统内存使用率
- **Uptime**：进程运行秒数
- 首页每 2 秒自动刷新

---

## 6. API 接口文档

### 6.1 服务信息

```
GET /api
→ { success: true, message: "用于知眸AI数据上报" }
```

### 6.2 消息上报

```
POST /api/report
Body: <any JSON>
→ { code: 0, success: true, message: "数据接收成功" }
```
收到后自动：记录日志 → 匹配自动回复规则 → 广播所有客户端。

### 6.3 消息广播

```
POST /api/broadcast
Body: <any JSON>
→ { success: true, clientCount: N, message: "广播成功" }
```

### 6.4 客户端管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/clients` | 获取连接数 |
| GET | `/api/clients/detail` | 获取客户端详情列表 `[{id, ip, connectedAt, isOpen}]` |
| POST | `/api/clients/kick/:id` | 踢出指定客户端 |
| POST | `/api/client/send/:id` | 向指定客户端发消息 |

### 6.5 定时广播

| 方法 | 路径 | 请求体 | 说明 |
|---|---|---|---|
| POST | `/api/timer/start` | `{message, interval}` | 启动定时器 |
| POST | `/api/timer/stop` | `{id}` | 停止定时器 |
| POST | `/api/timer/remove` | `{id}` | 删除定时器 |
| GET | `/api/timer/status` | - | 获取所有定时器状态 |

### 6.6 消息日志

```
GET /api/logs?limit=50
→ { success: true, logs: [{ time, type, clientId, ip, data, bytes }] }
```

### 6.7 上报日志

```
GET /api/reports?limit=50
→ { success: true, total: N, reports: [{ time, ip, method, body }] }
```

### 6.8 自动回复规则

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auto-reply/rules` | 获取所有规则 |
| POST | `/api/auto-reply/rules` | 创建 `{name, pattern, reply, enabled?}` |
| PUT | `/api/auto-reply/rules/:id` | 更新规则（部分更新） |
| DELETE | `/api/auto-reply/rules/:id` | 删除规则 |
| POST | `/api/auto-reply/rules/:id/toggle` | 切换启用状态 |

### 6.9 系统监控

```
GET /api/system/stats
→ {
  success: true,
  stats: {
    cpu: { usagePercent, cores, model, loadAvg1m, loadAvg5m, loadAvg15m },
    memory: { heapUsedMB, heapTotalMB, rssMB, externalMB,
              systemTotalMB, systemFreeMB, systemUsedPercent },
    uptime: 3600
  }
}
```

### 6.10 页面路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | index.html | 首页 — 连接概览 + 系统监控 + 日志 |
| `/admin` | admin.html | 管理 — 消息推送 + 客户端管理 |
| `/timer` | timer.html | 定时广播配置与管理 |
| `/reports` | reports.html | 上报日志 + 自动回复规则管理 |

---

## 7. 前端页面

### 7.1 首页 `/`

- 4 个统计卡片：WebSocket 连接数、CPU 使用率、堆内存、运行时间
- 连接状态指示器（WebSocket 实时连接）
- CPU 和内存进度条
- 消息日志实时列表
- 每 2 秒轮询刷新

### 7.2 消息推送 `/admin`

- 统计卡片：客户端数、累计发送次数、累计流量(MB)、运行时间
- CodeMirror JSON 编辑器 + 格式化按钮
- 一键广播 JSON 消息
- 客户端列表：ID、IP、连接时间、状态、操作（踢出/发送）

### 7.3 定时广播 `/timer`

- 定时器卡片列表：ID、消息预览、间隔、发送次数、状态标签
- 新建定时器：CodeMirror 编辑消息体 + 间隔输入
- 每个定时器：暂停/启动/编辑/删除
- 已停止的定时器可编辑消息和间隔

### 7.4 上报日志 `/reports`

- 上报记录列表：时间、来源 IP、方法、消息体
- 自动回复规则管理面板
- CodeMirror 编辑规则回复内容
- WebSocket 实时连接，接收实时消息
- 测试消息发送功能

---

## 8. 部署说明

### 8.1 Docker（推荐）

```bash
docker volume create ws_data
docker run -d --name ws-server \
  -p 3000:3000 \
  -v ws_data:/app/data \
  meterxu/ws-server:latest
```

### 8.2 Docker Compose

```yaml
services:
  ws-server:
    image: meterxu/ws-server:latest
    ports:
      - "3000:3000"
    volumes:
      - ws_data:/app/data

volumes:
  ws_data:
```

### 8.3 本地开发

```bash
npm install
npm start
# → 访问 http://localhost:3000
```

### 8.4 环境要求

- Node.js >= 22
- `better-sqlite3` 需要 C++ 编译工具链（本地开发时）
- 数据目录 `./data/` 需可写

---

## 9. 数据库设计

使用 SQLite（`better-sqlite3`），数据库文件 `data/database.sqlite`。

> ⚠️ **`src/db/database.js` 文件缺失**。下表根据源码中的导入语句推断。

### 9.1 表结构（推断）

| 表名 | 用途 | 关键字段 |
|---|---|---|
| `message_logs` | WebSocket 消息日志 | time, type, clientId, ip, data, bytes, clientCount |
| `timer_configs` | 定时器配置（持久化） | id, message, intervalMs, startAt, sendCount |
| `auto_reply_rules` | 自动回复规则 | id, name, pattern, reply, enabled, matchCount, lastMatch, createdAt |
| `report_logs` | HTTP 上报日志 | time, ip, method, body |
| `stats` | 流量统计 | totalBytesSent, totalSendCount |
| `kv_store` | 通用键值存储 | key, value |

### 9.2 导出函数（需实现）

```javascript
// 消息日志
loadMessageLogs()          → Array
insertMessageLog(entry)
trimMessageLogs(maxEntries)

// 定时器
loadTimerConfigs()        → Array
insertTimerConfig(entry)
updateTimerSendCount(id, count)
deleteTimerConfig(id)

// 自动回复规则
loadAutoReplyRules()      → Array
insertAutoReplyRule(rule)
updateAutoReplyRule(id, fields)
deleteAutoReplyRule(id)

// 上报日志
loadReportLogs()            → Array
insertReportLog(entry)
trimReportLogs(maxEntries)

// 统计
loadStats()                 → { totalBytesSent, totalSendCount }
saveStats(totalBytesSent, totalSendCount)

// KV 存储
getKV(key, defaultValue)    → string
setKV(key, value)
```

---

## 10. 已知问题与待改进

### 🔴 严重

| 问题 | 说明 |
|---|---|
| **缺失 `src/db/database.js`** | 被 `demoController.js` 和 `webSocket.js` 大量导入（14 个函数），文件不存在。项目启动直接报错 `ERR_MODULE_NOT_FOUND`。需创建约 200 行代码：建表 + 全部 CRUD 操作。 |

### 🟡 改进建议

| 项目 | 说明 |
|---|---|
| **路由拆分** | `demoController.js` 承担全部职责（API + 页面 + 自动回复逻辑），建议按领域拆分 |
| **前端复用** | 4 个 HTML 文件大量重复 CSS/JS，可抽取公共布局和组件 |
| **认证机制** | 无任何鉴权，任意客户端可连接和调用 API |
| **HTTPS/WSS** | 仅支持 HTTP/WS 明文传输 |
| **自动化测试** | `test` 脚本为空，无测试覆盖 |
| **结构化日志** | 使用 `console.log`，无日志级别/轮转/聚合 |
| **Swagger 文档** | `koa-swagger-decorator` 已安装但未使用 |
| **WebSocket 心跳** | 无 ping/pong 机制，连接假死无法检测 |
| **消息确认** | 无发送确认和重试机制 |

### 🟢 完成度评估

| 维度 | 评分 | 说明 |
|---|---|---|
| 核心功能 | ⭐⭐⭐⭐ | WebSocket 管理、广播、定时器完善 |
| 数据持久化 | ⭐⭐⭐ | SQLite 方案合理，但关键文件缺失 |
| 前端体验 | ⭐⭐⭐ | 界面整洁实用，代码重复较多 |
| 文档 | ⭐⭐ | README 简略，无 API 文档 |
| 测试 | ⭐ | 无测试覆盖 |
| 安全性 | ⭐⭐ | 无鉴权，CORS 全开 |
| 可运维性 | ⭐⭐⭐⭐ | Docker 支持完善，一键部署 |

---

## 附录

### A. WebSocket 消息格式

```json
// 服务器 → 客户端（连接欢迎）
{ "type": "welcome", "clientId": 1, "message": "欢迎连接到 Koa WebSocket 服务器！" }

// 服务器 → 客户端（消息回显）
{ "type": "ws-message", "clientId": 1, "data": "..." }

// 客户端 → 服务器
"任意文本"  // 服务端接收后尝试正则匹配自动回复规则
```

### B. 安全限制

| 限制项 | 值 |
|---|---|
| 最大并发连接 | 1000 |
| 消息最大长度 | 64 KB |
| 定时器最小间隔 | 1 秒 |
| 日志保留条数 | 200 |
| 上报日志保留 | 200 |
| 自动回复规则上限 | 50 |

### C. 最近提交记录

| 提交 | 说明 |
|---|---|
| `0152282` | build: 优化Docker构建，添加.dockerignore，过滤WebSocket消息 |
| `32dfa4d` | feat: 添加数据持久化卷支持并更新安装文档 |
| `c513c05` | feat(core): 使用 SQLite 持久化数据，升级前端 CodeMirror 编辑器 |
| `897c909` | fix: 移除统计卡片中多余的 API 请求提示文字 |
| `fcced92` | feat: 添加自动回复规则功能 |

---

> 📅 生成日期：2026-07-15
> 🤖 由 Claude Code 分析生成
