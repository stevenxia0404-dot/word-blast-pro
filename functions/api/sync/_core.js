/* _core.js — 跨设备同步核心（纯逻辑 + 数据访问适配层）
 *
 * 设计约束（Steven 定稿的六条）：
 *  1. 邮箱验证码激活：验证码一次性、5 分钟有效、60 秒限流、错 5 次锁定
 *  2. JWT 自包含：payload 带 sub/ver/exp，不建 session 表
 *  3. 送达才入库：邮件发送成功（或本地 dev 模式）才写 auth_codes
 *  4. 服务端二次校验：验签 + exp + 用户存在 + token_version 一致 + 字段级清洗
 *  5. 降级不丢数据：邮件不可用时登录暂停、失败无旁路；断网时本机照常用
 *  6. 录音不上传：同步白名单里根本没有录音/audio 字段
 *
 * 这一层不碰 Request/Response，方便 Node 里用 memoryStore 直接跑端到端逻辑回归。
 * d1Store 是 Cloudflare D1 适配层；两者接口一致。
 */

const CODE_TTL = 5 * 60 * 1000
const RESEND_LIMIT = 60 * 1000
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000
const MAX_PAYLOAD = 256 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const SCHEMA = [
  /* recovery_hash 是 v3.3 同步码遗留列，保留只为兼容线上已建 D1 表；v3.4 起不再读写 */
  `CREATE TABLE IF NOT EXISTS sync_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    recovery_hash TEXT,
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_saves (
    user_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
]

let schemaReady = false
export async function ensureSchema(db) {
  if (schemaReady) return
  for (const sql of SCHEMA) await db.prepare(sql).run()
  schemaReady = true
}

/* ── 数据访问层 ───────────────────────────────────────────── */

export function memoryStore() {
  const users = new Map(), byEmail = new Map()
  const codes = new Map(), saves = new Map(), config = new Map()
  const clone = o => (o ? JSON.parse(JSON.stringify(o)) : null)
  return {
    async ensure() {},
    async getUser(id) { return clone(users.get(id)) },
    async getUserByEmail(e) { return clone(byEmail.get(e)) },
    async putUser(u) {
      const row = { ...u }
      users.set(row.id, row)
      if (row.email) byEmail.set(row.email, row)
    },
    async setTokenVersion(id, v) {
      const row = users.get(id)
      if (!row) return
      row.token_version = v
      users.set(id, row)
      if (row.email) byEmail.set(row.email, row)
    },
    async getCode(e) { return clone(codes.get(e)) },
    async putCode(c) { codes.set(c.email, { ...c }) },
    async delCode(e) { codes.delete(e) },
    async bumpCodeAttempts(e, n) {
      const c = codes.get(e)
      if (c) { c.attempts = n; codes.set(e, c) }
    },
    async getSave(uid) { return clone(saves.get(uid)) },
    async putSaveIfVersion(uid, data, version, expected, now) {
      const cur = saves.get(uid)
      if (!cur) {
        if (expected !== 0) return false
        saves.set(uid, { user_id: uid, data, version, updated_at: now })
        return true
      }
      if (Number(cur.version) !== Number(expected)) return false
      saves.set(uid, { user_id: uid, data, version, updated_at: now })
      return true
    },
    async clearSave(uid) { saves.delete(uid) },
    async getConfig(k) { return config.get(k) ?? null },
    async putConfigIfAbsent(k, v) {
      if (!config.has(k)) config.set(k, v)
      return config.get(k)
    },
    _dump() { return { users: [...users.values()], codes: [...codes.values()], saves: [...saves.values()] } },
  }
}

export function d1Store(db) {
  return {
    async getUser(id) {
      return await db.prepare('SELECT * FROM sync_users WHERE id = ?').bind(id).first()
    },
    async getUserByEmail(e) {
      return await db.prepare('SELECT * FROM sync_users WHERE email = ?').bind(e).first()
    },
    async putUser(u) {
      await db.prepare(
        'INSERT INTO sync_users (id,email,token_version,created_at) VALUES (?,?,?,?) ' +
        'ON CONFLICT(id) DO UPDATE SET email=excluded.email'
      ).bind(u.id, u.email, u.token_version, u.created_at).run()
    },
    async setTokenVersion(id, v) {
      await db.prepare('UPDATE sync_users SET token_version = ? WHERE id = ?').bind(v, id).run()
    },
    async getCode(e) {
      return await db.prepare('SELECT * FROM sync_codes WHERE email = ?').bind(e).first()
    },
    async putCode(c) {
      await db.prepare(
        'INSERT INTO sync_codes (email,code_hash,expires_at,attempts,created_at) VALUES (?,?,?,?,?) ' +
        'ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, ' +
        'attempts=excluded.attempts, created_at=excluded.created_at'
      ).bind(c.email, c.code_hash, c.expires_at, c.attempts, c.created_at).run()
    },
    async delCode(e) {
      await db.prepare('DELETE FROM sync_codes WHERE email = ?').bind(e).run()
    },
    async bumpCodeAttempts(e, n) {
      await db.prepare('UPDATE sync_codes SET attempts = ? WHERE email = ?').bind(n, e).run()
    },
    async getSave(uid) {
      const row = await db.prepare('SELECT * FROM sync_saves WHERE user_id = ?').bind(uid).first()
      if (!row) return null
      let data = null
      try { data = JSON.parse(row.data_json) } catch { data = null }
      return { user_id: uid, data, version: Number(row.version) || 0, updated_at: Number(row.updated_at) || 0 }
    },
    async putSaveIfVersion(uid, data, version, expected, now) {
      const json = JSON.stringify(data)
      const cur = await this.getSave(uid)
      if (!cur) {
        if (Number(expected) !== 0) return false
        await db.prepare('INSERT INTO sync_saves (user_id,data_json,version,updated_at) VALUES (?,?,?,?)')
          .bind(uid, json, version, now).run()
        return true
      }
      const r = await db.prepare(
        'UPDATE sync_saves SET data_json=?, version=?, updated_at=? WHERE user_id=? AND version=?'
      ).bind(json, version, now, uid, expected).run()
      if (r && r.meta && r.meta.changes === 1) return true
      return false
    },
    async clearSave(uid) {
      await db.prepare('UPDATE sync_saves SET data_json=?, version=version+1, updated_at=? WHERE user_id=?')
        .bind(JSON.stringify(emptyData()), Date.now(), uid).run()
    },
    async getConfig(k) {
      const row = await db.prepare('SELECT value FROM sync_config WHERE key = ?').bind(k).first()
      return row ? row.value : null
    },
    async putConfigIfAbsent(k, v) {
      await db.prepare('INSERT OR IGNORE INTO sync_config (key,value) VALUES (?,?)').bind(k, v).run()
      const row = await db.prepare('SELECT value FROM sync_config WHERE key = ?').bind(k).first()
      return row ? row.value : v
    },
  }
}

/* ── 加密 / JWT（WebCrypto，Workers 与 Node20+ 通用） ─────────── */

const te = new TextEncoder()

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function toB64Url(str) { return b64url(te.encode(str)) }
function fromB64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
}
async function digest(text) {
  const buf = await crypto.subtle.digest('SHA-256', te.encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signJwt(payload, secret) {
  const h = toB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const p = toB64Url(JSON.stringify(payload))
  const key = await hmacKey(secret)
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(h + '.' + p)))
  return h + '.' + p + '.' + b64url(sig)
}

export async function verifyJwt(token, secret) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  try {
    if (JSON.parse(fromB64Url(h)).alg !== 'HS256') return null
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const key = await hmacKey(secret)
    const okSig = await crypto.subtle.verify('HMAC', key, sig, te.encode(h + '.' + p))
    if (!okSig) return null
    return JSON.parse(fromB64Url(p))
  } catch { return null }
}

function randomBytes(n) {
  const a = new Uint8Array(n)
  crypto.getRandomValues(a)
  return a
}
function uid() { return b64url(randomBytes(16)) }
function sixDigit() {
  const a = randomBytes(4)
  const n = ((a[0] << 24) | (a[1] << 16) | (a[2] << 8) | a[3]) >>> 0
  return String(100000 + (n % 900000))
}
async function codeHash(email, code, secret) {
  return await digest('v1|' + email + '|' + code + '|' + secret)
}
async function getSecret(env, store) {
  if (env.JWT_SECRET) return env.JWT_SECRET
  const candidate = b64url(randomBytes(32))
  return await store.putConfigIfAbsent('jwt_secret', candidate)
}

/* ── 字段级清洗：服务端不信任任何客户端字段 ─────────────────── */

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const pos = v => Math.max(0, num(v))
const cap = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')

export function emptyData() {
  return { save: null, spoken: null, dialogue: null, spokenScore: null, customVocab: null }
}

function cleanSave(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const d = v
  const phases = ['welcome', 'playing', 'levelComplete', 'allComplete']
  const results = Array.isArray(d.levelResults) ? d.levelResults.slice(0, 100).map(r => {
    const x = r && typeof r === 'object' ? r : {}
    return {
      stars: Math.min(3, Math.max(0, Math.round(num(x.stars)))),
      accuracy: Math.min(100, Math.max(0, num(x.accuracy))),
      score: pos(x.score),
    }
  }) : []
  return {
    version: 2,
    phase: phases.includes(d.phase) ? d.phase : 'welcome',
    levelIndex: Math.min(200, Math.round(pos(d.levelIndex))),
    subsectionIndex: Math.min(2, Math.round(pos(d.subsectionIndex))),
    totalScore: pos(d.totalScore),
    combo: pos(d.combo),
    levelResults: results,
    subsectionScore: pos(d.subsectionScore),
    subsectionCorrect: pos(d.subsectionCorrect),
    subsectionAttempts: pos(d.subsectionAttempts),
  }
}
function cleanRecords(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out = {}
  let i = 0
  for (const [k, val] of Object.entries(v)) {
    if (i++ >= 2000) break
    const key = cap(k, 200).trim().toLowerCase()
    if (!key) continue
    const t = num(val)
    if (t > 0) out[key] = t
  }
  return Object.keys(out).length ? out : null
}
function cleanScore(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return {
    score: pos(v.score),
    mastered: pos(v.mastered),
    reviewed: pos(v.reviewed),
    updatedAt: pos(v.updatedAt),
  }
}
function cleanVocab(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  if (!Array.isArray(v.groups)) return null
  const groups = v.groups.slice(0, 50).map((g, gi) => {
    const x = g && typeof g === 'object' ? g : {}
    const vocab = Array.isArray(x.vocab) ? x.vocab.slice(0, 500).map((w, wi) => {
      const y = w && typeof w === 'object' ? w : {}
      return {
        id: Math.round(num(y.id, wi + 1)),
        en: cap(y.en, 200),
        zh: cap(y.zh, 200),
        sentence: cap(y.sentence, 400),
        type: cap(y.type, 20),
        seq: Math.round(num(y.seq, 0)),
      }
    }).filter(w => w.en.trim()) : []
    return {
      id: cap(x.id, 64) || 'g' + gi,
      name: cap(x.name, 80) || '词库 ' + (gi + 1),
      vocab,
      importedAt: pos(x.importedAt),
      source: cap(x.source, 20),
      sourceName: cap(x.sourceName, 120),
    }
  })
  return { groups, cleared: !!v.cleared, updatedAt: pos(v.updatedAt) }
}

/** 返回 null 表示整体超限（调用方回 413），否则返回字段全部清洗过的对象 */
export function sanitizeSyncData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return emptyData()
  if (JSON.stringify(input).length > MAX_PAYLOAD) return null
  return {
    save: cleanSave(input.save),
    spoken: cleanRecords(input.spoken),
    dialogue: cleanRecords(input.dialogue),
    spokenScore: cleanScore(input.spokenScore),
    customVocab: cleanVocab(input.customVocab),
  }
}

/* ── 服务端权威合并：分数不丢、记录并集、词库后写覆盖 ─────────── */

const PHASE_RANK = { welcome: 0, playing: 1, levelComplete: 2, allComplete: 3 }

function mergeRecords(a, b) {
  if (!a && !b) return null
  const out = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = out[k] ? Math.min(out[k], v) : v  // 首次完成时间取更早
  }
  return out
}
function mergeResults(a = [], b = []) {
  const out = []
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i]
    if (!x) { out.push(y); continue }
    if (!y) { out.push(x); continue }
    out.push({
      stars: Math.max(num(x.stars), num(y.stars)),
      accuracy: Math.max(num(x.accuracy), num(y.accuracy)),
      score: Math.max(num(x.score), num(y.score)),  // 取 max 而非求和：防重复同步刷分
    })
  }
  return out
}

export function mergeSyncData(remoteRaw, incomingRaw) {
  const a = remoteRaw || emptyData()
  const b = incomingRaw || emptyData()
  const out = {}

  out.spoken = mergeRecords(a.spoken, b.spoken)
  out.dialogue = mergeRecords(a.dialogue, b.dialogue)

  const sa = a.spokenScore || { score: 0, mastered: 0, reviewed: 0, updatedAt: 0 }
  const sb = b.spokenScore || { score: 0, mastered: 0, reviewed: 0, updatedAt: 0 }
  out.spokenScore = {
    score: Math.max(pos(sa.score), pos(sb.score)),
    mastered: Math.max(pos(sa.mastered), pos(sb.mastered)),
    reviewed: Math.max(pos(sa.reviewed), pos(sb.reviewed)),
    updatedAt: Math.max(pos(sa.updatedAt), pos(sb.updatedAt)),
  }
  if (!a.spokenScore && !b.spokenScore) out.spokenScore = null

  const va = a.save, vb = b.save
  if (!va && !vb) out.save = null
  else if (!va) out.save = vb
  else if (!vb) out.save = va
  else {
    out.save = {
      ...vb,  // 小节内瞬时状态以本次提交的设备为准
      phase: (PHASE_RANK[vb.phase] ?? 0) >= (PHASE_RANK[va.phase] ?? 0) ? vb.phase : va.phase,
      levelIndex: Math.max(num(va.levelIndex), num(vb.levelIndex)),
      totalScore: Math.max(pos(va.totalScore), pos(vb.totalScore)),
      levelResults: mergeResults(va.levelResults, vb.levelResults),
      combo: 0,
      subsectionScore: 0,
      subsectionCorrect: 0,
      subsectionAttempts: 0,
    }
  }

  // 词库：最后一次同步的设备为准（这样「删掉整组」也能同步，不会被并集复活）
  // 本机从未导入过（null）则保留云端；明确清空（cleared）才覆盖为空
  const cv = b.customVocab
  if (cv && (cv.cleared || (Array.isArray(cv.groups) && cv.groups.length > 0))) out.customVocab = cv
  else out.customVocab = a.customVocab || cv || null

  return out
}

/* ── 限流（isolate 级内存；跨 isolate 由 D1 的 60s 时间戳兜底） ── */

const rateBuckets = new Map()
function rateHit(key, max, windowMs, now) {
  const b = rateBuckets.get(key)
  if (!b || now - b.start > windowMs) {
    rateBuckets.set(key, { start: now, count: 1 })
    return true
  }
  if (b.count >= max) return false
  b.count += 1
  return true
}

/* ── Resend 发信（送达才入库） ─────────────────────────────── */

async function sendMail(env, email, code) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 照菠萝日程：域名 boluomate.com 已在 Resend 验证，只需 API Key
        from: `Word Blast <${env.RESEND_FROM || env.SENDER_EMAIL || 'noreply@boluomate.com'}>`,
        to: [email],
        subject: 'Word Blast 登录验证码',
        text: '你的 Word Blast 登录验证码是 ' + code + '\n5 分钟内有效，用完即失效。若不是你本人操作，请忽略本邮件。',
      }),
    })
    return { ok: r.ok }
  } catch { return { ok: false } }
}

function isDev(env) { return env.ALLOW_DEV_CODE === '1' || env.ALLOW_DEV_CODE === 'true' }
function mailReady(env) { return !!env.RESEND_API_KEY }
function normEmail(v) { return String(v || '').trim().toLowerCase().slice(0, 120) }

const ok = body => ({ status: 200, body: { ok: true, ...body } })
const err = (status, error, code) => ({ status, body: { error, ...(code ? { code } : {}) } })

async function requireUser(env, headers, store, now) {
  const token = String(headers.authorization || '').replace(/^Bearer\s+/i, '')
  const secret = await getSecret(env, store)
  const payload = await verifyJwt(token, secret)
  if (!payload || !payload.sub || !payload.exp || payload.exp * 1000 <= now) return null
  const user = await store.getUser(payload.sub)
  // v3.4：同步码账号（email 为空）一律不再放行，旧 token 不能变成隐形旁路
  if (!user || !user.email) return null
  if (Number(payload.ver) !== Number(user.token_version)) return null
  return user
}

/* ── 统一入口：返回 {status, body}，不碰 Request/Response ─────── */

export async function handleRequest(env, req) {
  const { method, path, body = {}, headers = {}, now = Date.now(), store } = req
  if (!store) return err(500, '服务未就绪，本机数据不受影响')

  try {
    if (path === 'config' && method === 'GET') {
      return ok({ mailEnabled: mailReady(env), devMode: isDev(env), maxBytes: MAX_PAYLOAD, tokenDays: 30 })
    }

    if (path === 'code' && method === 'POST') {
      const email = normEmail(body.email)
      if (!EMAIL_RE.test(email)) return err(400, '请输入有效的邮箱地址')
      if (!rateHit('code:' + email, 1, RESEND_LIMIT, now)) return err(429, '60 秒内只能发送一次验证码')
      if (!mailReady(env) && !isDev(env)) {
        return err(501, '邮件服务未配置，请稍后再试或联系管理员', 'MAIL_NOT_CONFIGURED')
      }
      const code = sixDigit()
      const secret = await getSecret(env, store)
      const hash = await codeHash(email, code, secret)
      if (mailReady(env)) {
        const sent = await sendMail(env, email, code)
        // 送达才入库：发信失败不写验证码，用户不会拿到「永远验不过」的码
        if (!sent.ok) return err(502, '验证码邮件发送失败，请稍后重试', 'MAIL_FAILED')
      }
      await store.putCode({ email, code_hash: hash, expires_at: now + CODE_TTL, attempts: 0, created_at: now })
      return ok({ sent: mailReady(env), devCode: isDev(env) && !mailReady(env) ? code : undefined, expiresIn: 300 })
    }

    if (path === 'verify' && method === 'POST') {
      const email = normEmail(body.email)
      const code = String(body.code || '').trim()
      const rec = await store.getCode(email)
      if (!rec) return err(400, '请先获取验证码')
      if (Number(rec.expires_at) <= now) {
        await store.delCode(email)
        return err(400, '验证码已过期，请重新获取')
      }
      if (Number(rec.attempts) >= 5) {
        await store.delCode(email)
        return err(429, '错误次数过多，请重新获取验证码')
      }
      const secret = await getSecret(env, store)
      const hash = await codeHash(email, code, secret)
      if (hash !== rec.code_hash) {
        await store.bumpCodeAttempts(email, Number(rec.attempts) + 1)
        return err(400, '验证码不正确')
      }
      await store.delCode(email)  // 一次性
      let user = await store.getUserByEmail(email)
      if (!user) {
        user = { id: uid(), email, token_version: 1, created_at: now }
        await store.putUser(user)
      }
      const token = await signJwt({
        sub: user.id, email, ver: user.token_version,
        iat: Math.floor(now / 1000), exp: Math.floor((now + TOKEN_TTL) / 1000),
      }, secret)
      return ok({ token, email, userId: user.id, expiresAt: now + TOKEN_TTL })
    }

    /* ── 以下需要登录 ── */
    if (path === 'data' && (method === 'GET' || method === 'POST' || method === 'DELETE')) {
      const user = await requireUser(env, headers, store, now)
      if (!user) return err(401, '登录已过期，请重新登录', 'AUTH_EXPIRED')

      if (method === 'DELETE') {
        await store.clearSave(user.id)
        return ok({ cleared: true })
      }

      if (method === 'GET') {
        const row = await store.getSave(user.id)
        return ok({
          data: row ? row.data : emptyData(),
          version: row ? Number(row.version) : 0,
          updatedAt: row ? Number(row.updated_at) : 0,
          userId: user.id,
          email: user.email,
        })
      }

      const incoming = sanitizeSyncData(body.data)
      if (!incoming) return err(413, '数据过大，请到家长区清理词库后再同步')
      const row = await store.getSave(user.id)
      const remoteVersion = row ? Number(row.version) : 0
      const base = Number(body.baseVersion)
      if (Number.isFinite(base) && base !== remoteVersion) {
        return { status: 409, body: {
          error: '云端有更新，正在自动合并', code: 'CONFLICT',
          remote: { data: row ? row.data : emptyData(), version: remoteVersion },
        } }
      }
      const merged = mergeSyncData(row ? row.data : null, incoming)
      const nextVersion = remoteVersion + 1
      const written = await store.putSaveIfVersion(user.id, merged, nextVersion, remoteVersion, now)
      if (!written) {
        return { status: 409, body: {
          error: '云端有更新，正在自动合并', code: 'CONFLICT',
          remote: { data: row ? row.data : emptyData(), version: remoteVersion },
        } }
      }
      return ok({ data: merged, version: nextVersion, updatedAt: now })
    }

    return err(404, '接口不存在')
  } catch (e) {
    return err(500, '服务异常，本机数据不受影响')
  }
}
