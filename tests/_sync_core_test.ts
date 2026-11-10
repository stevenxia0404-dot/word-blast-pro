/* _sync_core_test.ts — 同步核心端到端逻辑回归（memoryStore，零外部依赖） */
import {
  handleRequest, memoryStore, mergeSyncData, sanitizeSyncData,
  signJwt, verifyJwt, SCHEMA,
} from '../functions/api/sync/_core.js'

let fail = 0
const ok = (c: any, l: string, extra = '') => {
  if (c) console.log('  ✅', l)
  else { fail++; console.log('  ❌', l, extra) }
}
const NOW = 1770000000000
const env: any = { ALLOW_DEV_CODE: '1' }
const store: any = memoryStore()
const call = (path: string, method = 'POST', body: any = {}, headers: any = {}, now = NOW) =>
  handleRequest(env, { method, path, body, headers, store, now })

;(async () => {
  console.log('\n[1] 配置与建表')
  const cfg = await call('config', 'GET')
  ok(cfg.status === 200 && cfg.body.mailEnabled === false, '无 Resend 凭据时 mailEnabled=false')
  ok(cfg.body.devMode === true, 'dev 模式可读')
  ok(SCHEMA.length === 4 && SCHEMA.every((s: string) => s.includes('IF NOT EXISTS')), '自动建表 SQL 幂等')

  console.log('\n[2] 邮箱验证码：格式 / 送达才入库 / 限流 / 一次性')
  const bad = await call('code', 'POST', { email: 'not-an-email' })
  ok(bad.status === 400, '非法邮箱被拒')
  const c1 = await call('code', 'POST', { email: 'Parent@Example.com' }, {}, NOW)
  ok(c1.status === 200 && /^\d{6}$/.test(c1.body.devCode), 'dev 模式返回 6 位验证码')
  const savedCode: any = await store.getCode('parent@example.com')
  ok(!!savedCode && savedCode.code_hash !== c1.body.devCode, '库里只存摘要，不存明文')
  ok(savedCode.expires_at - NOW === 300000, '5 分钟有效')
  const c2 = await call('code', 'POST', { email: 'parent@example.com' }, {}, NOW + 1000)
  ok(c2.status === 429, '60 秒内重复发送被限流')
  const c3 = await call('code', 'POST', { email: 'parent@example.com' }, {}, NOW + 61000)
  ok(c3.status === 200, '超过 60 秒可重发')

  console.log('\n[3] 验码：错误次数 / 过期 / 一次性 / JWT')
  const v0 = await call('verify', 'POST', { email: 'parent@example.com', code: '000000' }, {}, NOW + 62000)
  ok(v0.status === 400, '错误验证码被拒')
  for (let i = 0; i < 4; i++) await call('verify', 'POST', { email: 'parent@example.com', code: '000000' }, {}, NOW + 62000)
  const vLock = await call('verify', 'POST', { email: 'parent@example.com', code: c3.body.devCode }, {}, NOW + 62000)
  ok(vLock.status === 429, '错 5 次锁定并销毁验证码')
  const T = NOW + 200000  // 跨过 60 秒限流窗口再重发
  const c4 = await call('code', 'POST', { email: 'parent@example.com' }, {}, T)
  const vOk = await call('verify', 'POST', { email: 'parent@example.com', code: c4.body.devCode }, {}, T + 1000)
  ok(vOk.status === 200 && !!vOk.body.token, '正确验证码换取 JWT')
  const vAgain = await call('verify', 'POST', { email: 'parent@example.com', code: c4.body.devCode }, {}, T + 2000)
  ok(vAgain.status === 400, '验证码一次性（用完即失效）')
  const cExp = await call('code', 'POST', { email: 'exp@example.com' }, {}, T + 3000)
  const vExp = await call('verify', 'POST', { email: 'exp@example.com', code: cExp.body.devCode }, {}, T + 3000 + 300001)
  ok(vExp.status === 400, '超过 5 分钟过期')

  const token = vOk.body.token
  const secret = await store.getConfig('jwt_secret')
  const payload = await verifyJwt(token, secret)
  ok(!!payload && !!payload.sub && payload.exp - payload.iat === 30 * 86400, 'JWT 自包含且 30 天有效')
  ok((await verifyJwt(token + 'x', secret)) === null, '篡改签名被拒')
  const expired = await signJwt({ sub: payload.sub, ver: 1, iat: 1, exp: 2 }, secret)
  ok((await call('data', 'GET', {}, { authorization: 'Bearer ' + expired })).status === 401, '过期令牌被拒')
  await store.setTokenVersion(payload.sub, 2)
  ok((await call('data', 'GET', {}, { authorization: 'Bearer ' + token })).status === 401, '服务端二次校验 token_version')
  await store.setTokenVersion(payload.sub, 1)
  const ghost = await signJwt({ sub: 'not-exist', ver: 1, iat: Math.floor(NOW / 1000), exp: Math.floor(NOW / 1000) + 9999 }, secret)
  ok((await call('data', 'GET', {}, { authorization: 'Bearer ' + ghost })).status === 401, '用户不存在时拒绝')

  console.log('\n[4] 同步合并：分数不丢 / 记录并集 / 词库后写覆盖')
  const A = {
    save: { version: 2, phase: 'playing', levelIndex: 3, totalScore: 500, levelResults: [{ stars: 3, accuracy: 95, score: 120 }] },
    spoken: { apple: 1000 }, dialogue: {},
    spokenScore: { score: 60, mastered: 1, reviewed: 0, updatedAt: 1000 },
    customVocab: { groups: [{ id: 'g1', name: 'U1', vocab: [{ id: 1, en: 'apple', zh: '苹果' }] }], cleared: false, updatedAt: 1 },
  }
  const B = {
    save: { version: 2, phase: 'playing', levelIndex: 1, totalScore: 720, levelResults: [{ stars: 2, accuracy: 80, score: 90 }] },
    spoken: { pear: 2000 }, dialogue: { 'how are you': 3000 },
    spokenScore: { score: 100, mastered: 1, reviewed: 1, updatedAt: 2000 },
    customVocab: null,
  }
  const m = mergeSyncData(sanitizeSyncData(A), sanitizeSyncData(B))
  ok(m.save.totalScore === 720 && m.save.levelIndex === 3, '闯关分与关卡取高，不回退')
  ok(m.save.levelResults[0].stars === 3 && m.save.levelResults[0].score === 120, '关卡成绩取 max，不重复加总')
  ok(m.spoken.apple === 1000 && m.spoken.pear === 2000, '跟读记录并集')
  ok(m.dialogue['how are you'] === 3000, '对话记录并集')
  ok(m.spokenScore.score === 100, '口语分取 max')
  ok(m.customVocab.groups[0].vocab[0].en === 'apple', '本机没词库时保留云端')
  const cleared = mergeSyncData(sanitizeSyncData(A), sanitizeSyncData({ customVocab: { groups: [], cleared: true } }))
  ok(cleared.customVocab.groups.length === 0, '明确清空才覆盖为空')
  const dirty = sanitizeSyncData({ save: { totalScore: 'NaN', phase: 'hack' }, spoken: { '<script>': 1 }, bogus: 1 })
  ok(dirty.save.totalScore === 0 && dirty.save.phase === 'welcome' && !(dirty as any).bogus, '字段级清洗：非法值归零、未知字段丢弃')
  ok(sanitizeSyncData({ spoken: { a: 1 }, pad: 'x'.repeat(300000) }) === null, '超 256KB 拒绝')

  console.log('\n[5] 上传 / 乐观锁 / 跨设备')
  const auth = { authorization: 'Bearer ' + token }
  const p1 = await call('data', 'POST', { data: A, baseVersion: 0 }, auth, NOW + 90000)
  ok(p1.status === 200 && p1.body.version === 1, '首次上传 version=1')
  const g1 = await call('data', 'GET', {}, auth, NOW + 91000)
  ok(g1.status === 200 && g1.body.data.spoken.apple === 1000, '云端可读回数据')
  const conflict = await call('data', 'POST', { data: B, baseVersion: 0 }, auth, NOW + 92000)
  ok(conflict.status === 409 && conflict.body.remote.version === 1, '版本不一致返回 409 + 云端快照')
  const p2 = await call('data', 'POST', { data: B, baseVersion: 1 }, auth, NOW + 93000)
  ok(p2.status === 200 && p2.body.version === 2 && p2.body.data.save.totalScore === 720, '重合并后成功写入 v2')
  const tooBig = await call('data', 'POST', { data: { pad: 'x'.repeat(300000) }, baseVersion: 2 }, auth, NOW + 94000)
  ok(tooBig.status === 413, '超大上传被拒（云端数据不被破坏）')

  console.log('\n[6] v3.4：同步码已下线 · 同一邮箱在两台设备登录同一账号')
  const gone1 = await call('space', 'POST', {}, { ip: '1.1.1.1' }, NOW + 95000)
  ok(gone1.status === 404, 'space 接口已删除（不能再建同步空间）')
  const gone2 = await call('claim', 'POST', { recoveryCode: 'ABCDEFGHJKLMN123456' }, { ip: '1.1.1.2' }, NOW + 95100)
  ok(gone2.status === 404, 'claim 接口已删除（同步码不再是旁路）')
  const T6 = NOW + 96000
  const mailA = await call('code', 'POST', { email: 'kid@example.com' }, {}, T6)
  const loginA = await call('verify', 'POST', { email: 'kid@example.com', code: mailA.body.devCode }, {}, T6 + 500)
  ok(loginA.status === 200 && !!loginA.body.token, '设备 A 用邮箱验证码登录')
  const mailB = await call('code', 'POST', { email: 'kid@example.com' }, {}, T6 + 61000)
  const loginB = await call('verify', 'POST', { email: 'kid@example.com', code: mailB.body.devCode }, {}, T6 + 61500)
  ok(loginB.status === 200 && loginB.body.userId === loginA.body.userId, '设备 B 输同一邮箱登录到同一 userId')
  const auth2 = { authorization: 'Bearer ' + loginA.body.token }
  await call('data', 'POST', { data: B, baseVersion: 0 }, auth2, T6 + 62000)
  const fromB = await call('data', 'GET', {}, { authorization: 'Bearer ' + loginB.body.token }, T6 + 62500)
  ok(fromB.status === 200 && fromB.body.data.spoken.pear === 2000, '两台设备读到同一份存档')
  const clearedCloud = await call('data', 'DELETE', {}, auth2, T6 + 63000)
  ok(clearedCloud.status === 200, '可清空云端数据')
  const afterClear = await call('data', 'GET', {}, auth2, T6 + 63500)
  ok(afterClear.body.data.spoken === null, '清空后云端为空（本机数据不受影响）')

  console.log('\n[7] 无邮件服务时验证码不入库（送达才入库）')
  const store2: any = memoryStore()
  const r = await handleRequest({ ALLOW_DEV_CODE: '0' } as any, {
    method: 'POST', path: 'code', body: { email: 'x@example.com' },
    headers: {}, store: store2, now: NOW + 110000,
  })
  ok(r.status === 501 && r.body.code === 'MAIL_NOT_CONFIGURED', '未配邮件时登录直接失败')
  ok(!r.body.devCode && !r.body.recoveryCode, '失败时不回传验证码、不给同步码旁路')
  ok((await store2.getCode('x@example.com')) === null, '没有发信就没有验证码记录')

  console.log('\n[7b] v3.3 同步码旧账号的 token 不再放行')
  await store.putUser({ id: 'legacy-space', email: null, recovery_hash: 'x', token_version: 1, created_at: NOW })
  const legacyToken = await signJwt({
    sub: 'legacy-space', ver: 1,
    iat: Math.floor(NOW / 1000), exp: Math.floor(NOW / 1000) + 9999,
  }, secret)
  ok((await call('data', 'GET', {}, { authorization: 'Bearer ' + legacyToken })).status === 401,
    '无邮箱的旧同步码账号被拒绝（同步码彻底下线）')

  console.log('\n[8] 照菠萝日程配置：只配 RESEND_API_KEY 即启用')
  const cfgKey = await handleRequest({ RESEND_API_KEY: 're_test' } as any, {
    method: 'GET', path: 'config', body: {}, headers: {}, store: memoryStore(), now: NOW,
  })
  ok(cfgKey.body.mailEnabled === true, '发信域名有默认值，不需再配 RESEND_FROM')

  console.log(fail === 0 ? '\n同步核心全部通过 ✅' : `\n${fail} 项失败 ❌`)
  process.exit(fail ? 1 : 0)
})().catch((e: any) => { console.error('异常:', e); process.exit(1) })
