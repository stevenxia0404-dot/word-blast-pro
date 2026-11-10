/* [[path]].js — 同域 Pages Functions 入口（/api/sync/*）
 * 底层就是 Cloudflare Workers + 项目已绑定的 D1，跟着 Pages 部署一起上线，
 * 同源免跨域。首次请求自动建表（CREATE TABLE IF NOT EXISTS），无需手工执行 SQL。
 */
import { handleRequest, d1Store, ensureSchema } from './_core.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=utf-8',
  'Cache-Control': 'no-store',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS })
}

export async function onRequest(ctx) {
  const { request, env } = ctx
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/sync\/?/, '').replace(/\/$/, '')
  let body = {}
  if (request.method === 'POST' || request.method === 'DELETE') {
    try { body = await request.json() } catch { body = {} }
  }

  let db = env && env.DB
  if (!db) return json({ error: '云端数据库未绑定，本机数据不受影响' }, 503)
  try {
    await ensureSchema(db)
  } catch {
    return json({ error: '云端数据库未就绪，本机数据不受影响' }, 503)
  }

  let out
  try {
    out = await handleRequest(env, {
      method: request.method,
      path,
      body,
      headers: {
        authorization: request.headers.get('Authorization') || '',
        ip: request.headers.get('CF-Connecting-IP') || '',
      },
      store: d1Store(db),
      now: Date.now(),
    })
  } catch {
    out = { status: 500, body: { error: '服务异常，本机数据不受影响' } }
  }
  return json(out.body, out.status)
}
