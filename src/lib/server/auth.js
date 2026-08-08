/**
 * 认证工具库 — 密码哈希、会话管理。
 * 使用 Node.js 内置 crypto，不引入额外依赖。
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { setKV, getKV } from './db.js'

const SESSION_PREFIX = 'session:'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 小时

/**
 * 对明文密码进行哈希，返回 "salt:hash" 格式的字符串。
 * salt: 16 字节随机十六进制
 * hash: 64 字节 scrypt 结果十六进制
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

/**
 * 验证明文密码是否与存储的 "salt:hash" 匹配。
 * 使用 timingSafeEqual 防止时序攻击。
 */
export function verifyPassword(password, stored) {
  const idx = stored.indexOf(':')
  if (idx === -1) return false
  const salt = stored.slice(0, idx)
  const hash = stored.slice(idx + 1)
  try {
    const buf = scryptSync(password, salt, 64)
    return timingSafeEqual(buf, Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

/**
 * 为用户创建新会话，返回 session token。
 * 会话数据以 JSON 形式存储在 kv_store 中。
 */
export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const data = JSON.stringify({
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  })
  setKV(SESSION_PREFIX + token, data)
  return token
}

/**
 * 验证会话 token，有效则返回 { userId }，否则返回 null。
 */
export function validateSession(token) {
  if (!token) return null
  const raw = getKV(SESSION_PREFIX + token, null)
  if (raw === null) return null
  try {
    const data = JSON.parse(raw)
    // 检查是否过期
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      // 惰性清理过期会话
      setKV(SESSION_PREFIX + token, '')
      return null
    }
    return { userId: data.userId }
  } catch {
    return null
  }
}

/**
 * 删除指定会话。
 */
export function deleteSession(token) {
  setKV(SESSION_PREFIX + token, '')
}

// ---- WebSocket 鉴权令牌 ----

const WS_TOKEN_USER_PREFIX = 'ws_token_uid:'
const WS_TOKEN_LOOKUP_PREFIX = 'ws_token_val:'

/**
 * 获取或创建用户的 WebSocket 鉴权令牌。
 * 每个用户只有一个持久化的 WS token，不会过期。
 */
export function getOrCreateWSToken(userId) {
  const existing = getKV(WS_TOKEN_USER_PREFIX + userId, null)
  if (existing !== null && existing !== '') return existing
  const token = randomBytes(4).toString('hex')
  // 双向索引：userId → token，token → userId
  setKV(WS_TOKEN_USER_PREFIX + userId, token)
  setKV(WS_TOKEN_LOOKUP_PREFIX + token, String(userId))
  return token
}

/**
 * 轮换用户的 WebSocket 鉴权令牌，旧令牌立即失效。
 */
export function rotateWSToken(userId) {
  // 删除旧 token 的索引
  const oldToken = getKV(WS_TOKEN_USER_PREFIX + userId, null)
  if (oldToken !== null && oldToken !== '') {
    setKV(WS_TOKEN_LOOKUP_PREFIX + oldToken, '')
  }
  // 创建新 token
  const token = randomBytes(4).toString('hex')
  setKV(WS_TOKEN_USER_PREFIX + userId, token)
  setKV(WS_TOKEN_LOOKUP_PREFIX + token, String(userId))
  return token
}

/**
 * 验证 WebSocket 鉴权令牌，有效则返回 userId，否则返回 null。
 */
export function validateWSToken(token) {
  if (!token) return null
  const userId = getKV(WS_TOKEN_LOOKUP_PREFIX + token, null)
  if (userId === null || userId === '') return null
  return { userId: parseInt(userId, 10) }
}
