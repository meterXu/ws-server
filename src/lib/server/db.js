import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// src/lib/server/db.js → 向上 2 级到达项目根目录
const webRoot = resolve(__dirname, '..', '..')
const DB_DIR = join(webRoot, 'data')
mkdirSync(DB_DIR, { recursive: true })

const dbPath = join(DB_DIR, 'ws-server.db')
const isNewDb = !existsSync(dbPath)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS auto_reply_rules (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    pattern     TEXT    NOT NULL,
    reply       TEXT    NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    match_count INTEGER NOT NULL DEFAULT 0,
    last_match  TEXT,
    created_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS report_logs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    time    TEXT    NOT NULL,
    ip      TEXT    NOT NULL,
    method  TEXT    NOT NULL,
    body    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS message_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_json  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS timer_configs (
    id           INTEGER PRIMARY KEY,
    name         TEXT    NOT NULL DEFAULT '',
    message      TEXT    NOT NULL,
    interval_ms  INTEGER NOT NULL,
    start_at     INTEGER NOT NULL,
    send_count   INTEGER NOT NULL DEFAULT 0
  );

  -- 兼容旧表：如果 name 列不存在则添加

  CREATE TABLE IF NOT EXISTS kv_store (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

if (isNewDb) {
  db.prepare(`
    INSERT INTO auto_reply_rules (id, name, pattern, reply, enabled, match_count, last_match, created_at)
    VALUES (1, '默认规则: Ping', '^ping$', '{"type":"pong","message":"pong"}', 1, 0, NULL, ?)
  `).run(new Date().toISOString())
}

// 兼容旧表：为已存在的 timer_configs 添加 name 列
try { db.exec('ALTER TABLE timer_configs ADD COLUMN name TEXT NOT NULL DEFAULT \'\'') } catch (_) { /* 列已存在 */ }

// ---- auto-reply rules ----

function normalizeRule(row) {
  return {
    id: row.id,
    name: row.name,
    pattern: row.pattern,
    reply: row.reply,
    enabled: Boolean(row.enabled),
    matchCount: row.match_count,
    lastMatch: row.last_match,
    createdAt: row.created_at
  }
}

export function loadAutoReplyRules() {
  return db.prepare('SELECT * FROM auto_reply_rules ORDER BY id ASC').all().map(normalizeRule)
}

export function insertAutoReplyRule(rule) {
  db.prepare(`
    INSERT INTO auto_reply_rules (id, name, pattern, reply, enabled, match_count, last_match, created_at)
    VALUES (@id, @name, @pattern, @reply, @enabled, @matchCount, @lastMatch, @createdAt)
  `).run({
    id: rule.id,
    name: rule.name,
    pattern: rule.pattern,
    reply: rule.reply,
    enabled: rule.enabled ? 1 : 0,
    matchCount: rule.matchCount,
    lastMatch: rule.lastMatch,
    createdAt: rule.createdAt
  })
}

export function updateAutoReplyRule(id, fields) {
  const setClauses = []
  const params = { id }
  if (fields.name !== undefined)       { setClauses.push('name = @name');             params.name = fields.name }
  if (fields.pattern !== undefined)    { setClauses.push('pattern = @pattern');       params.pattern = fields.pattern }
  if (fields.reply !== undefined)      { setClauses.push('reply = @reply');           params.reply = fields.reply }
  if (fields.enabled !== undefined)    { setClauses.push('enabled = @enabled');       params.enabled = fields.enabled ? 1 : 0 }
  if (fields.matchCount !== undefined) { setClauses.push('match_count = @matchCount'); params.matchCount = fields.matchCount }
  if (fields.lastMatch !== undefined)  { setClauses.push('last_match = @lastMatch');   params.lastMatch = fields.lastMatch }
  if (setClauses.length === 0) return
  db.prepare(`UPDATE auto_reply_rules SET ${setClauses.join(', ')} WHERE id = @id`).run(params)
}

export function deleteAutoReplyRule(id) {
  db.prepare('DELETE FROM auto_reply_rules WHERE id = ?').run(id)
}

// ---- report logs ----

export function loadReportLogs(maxCount = 200) {
  // 启动时裁剪历史数据，防止 DB 无限增长
  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM report_logs').get()
  if (cnt > maxCount) {
    db.prepare('DELETE FROM report_logs WHERE id IN (SELECT id FROM report_logs ORDER BY id ASC LIMIT ?)').run(cnt - maxCount)
  }
  return db.prepare('SELECT * FROM report_logs ORDER BY id ASC').all().map(row => ({
    time: row.time,
    ip: row.ip,
    method: row.method,
    body: safeParse(row.body)
  }))
}

export function insertReportLog(entry) {
  db.prepare(`
    INSERT INTO report_logs (time, ip, method, body) VALUES (@time, @ip, @method, @body)
  `).run({
    time: entry.time,
    ip: entry.ip,
    method: entry.method,
    body: typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body)
  })
}

export function trimReportLogs(keepCount) {
  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM report_logs').get()
  if (cnt > keepCount) {
    db.prepare('DELETE FROM report_logs WHERE id IN (SELECT id FROM report_logs ORDER BY id ASC LIMIT ?)').run(cnt - keepCount)
  }
}

// ---- message logs ----

export function loadMessageLogs(maxCount = 200) {
  // 只加载最近 N 条，防止 DB 有历史残留时 OOM
  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM message_logs').get()
  if (cnt > maxCount) {
    const excess = cnt - maxCount
    db.prepare('DELETE FROM message_logs WHERE id IN (SELECT id FROM message_logs ORDER BY id ASC LIMIT ?)').run(excess)
  }
  return db.prepare('SELECT entry_json FROM message_logs ORDER BY id ASC').all().map(row => JSON.parse(row.entry_json))
}

export function insertMessageLog(entry) {
  db.prepare('INSERT INTO message_logs (entry_json) VALUES (?)').run(JSON.stringify(entry))
}

export function trimMessageLogs(keepCount) {
  const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM message_logs').get()
  if (cnt > keepCount) {
    db.prepare('DELETE FROM message_logs WHERE id IN (SELECT id FROM message_logs ORDER BY id ASC LIMIT ?)').run(cnt - keepCount)
  }
}

// ---- timer configs ----

export function loadTimerConfigs() {
  return db.prepare('SELECT * FROM timer_configs ORDER BY id ASC').all().map(row => ({
    id: row.id,
    name: row.name || '',
    message: safeParse(row.message),
    intervalMs: row.interval_ms,
    startAt: row.start_at,
    sendCount: row.send_count,
    handle: null
  }))
}

export function insertTimerConfig(entry) {
  db.prepare(`
    INSERT INTO timer_configs (id, name, message, interval_ms, start_at, send_count)
    VALUES (@id, @name, @message, @intervalMs, @startAt, @sendCount)
  `).run({
    id: entry.id,
    name: entry.name || '',
    message: JSON.stringify(entry.message),
    intervalMs: entry.intervalMs,
    startAt: entry.startAt,
    sendCount: entry.sendCount
  })
}

export function updateTimerSendCount(id, sendCount) {
  db.prepare('UPDATE timer_configs SET send_count = ? WHERE id = ?').run(sendCount, id)
}

export function deleteTimerConfig(id) {
  db.prepare('DELETE FROM timer_configs WHERE id = ?').run(id)
}

// ---- kv store ----

export function getKV(key, defaultValue = '0') {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key)
  return row ? row.value : defaultValue
}

export function setKV(key, value) {
  db.prepare('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)').run(key, String(value))
}

export function loadStats() {
  return {
    totalBytesSent: parseInt(getKV('_totalBytesSent', '0'), 10),
    totalSendCount: parseInt(getKV('_totalSendCount', '0'), 10)
  }
}

export function saveStats(totalBytesSent, totalSendCount) {
  setKV('_totalBytesSent', totalBytesSent)
  setKV('_totalSendCount', totalSendCount)
}

// ---- helpers ----

function safeParse(str) {
  try { return JSON.parse(str) } catch (_) { return str }
}
