const API_KEY = 'ZVqDj5EhGLNiBtR9X7QOwfJyYP4Iukap'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function adminHtml(results, key) {
  return `<!DOCTYPE html><html lang="zh">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Blast 反馈</title>
<style>body{font-family:system-ui,sans-serif;background:#f0fdf4;margin:0;padding:1rem}
h1{color:#166534}.bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
button{padding:.5rem 1rem;background:#22c55e;color:#fff;border:none;border-radius:.75rem;font-weight:700;cursor:pointer}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:1rem;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}
th{background:#f0fdf4;padding:.75rem;text-align:left;font-size:.85rem;color:#166534}
td{padding:.75rem;border-top:1px solid #e5e7eb;font-size:.9rem;max-width:320px;word-break:break-word}
.count{color:#6b7280;font-size:.9rem}
</style></head><body>
<h1>Word Blast 用户反馈</h1>
<div class="bar"><span class="count">共 ${results.length} 条</span>
<button onclick="location.href='?format=csv&key=${key}'">下载 CSV</button></div>
<table><thead><tr><th>ID</th><th>姓名</th><th>内容</th><th>时间</th></tr></thead><tbody>
${results.map(r => `<tr><td>${r.id}</td><td>${esc(r.name)}</td><td>${esc(r.message)}</td><td>${r.created_at}</td></tr>`).join('')}
</tbody></table></body></html>`
}

function loginHtml() {
  return `<!DOCTYPE html><html lang="zh">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Blast Admin</title>
<style>body{font-family:system-ui,sans-serif;background:#f0fdf4;display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0}
form{background:#fff;padding:2rem;border-radius:1.5rem;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
input{padding:.75rem 1rem;border:2px solid #d4d4d4;border-radius:1rem;font-size:1rem;width:260px;text-align:center}
button{margin-top:.75rem;padding:.75rem 2rem;background:#22c55e;color:#fff;border:none;border-radius:1rem;font-size:1rem;font-weight:700;cursor:pointer}
</style></head><body><form method="get"><h2>Word Blast Admin</h2>
<input name="key" type="password" placeholder="输入 API Key" autofocus><br>
<button type="submit">进入</button></form></body></html>`
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-API-Key' } })
  }

  // POST /api/feedback — submit (public)
  if (request.method === 'POST') {
    try {
      const body = await request.json()
      const name = (body.name || '').slice(0, 50) || '匿名'
      const message = (body.message || '').slice(0, 2000)
      if (!message.trim()) return json({ error: 'empty' }, 400)
      await env.DB.prepare('INSERT INTO feedback (name, message) VALUES (?, ?)').bind(name, message).run()
      return json({ ok: true })
    } catch (e) {
      return json({ error: '提交失败' }, 500)
    }
  }

  // GET /api/feedback — admin page
  const key = url.searchParams.get('key') || ''
  if (!key || key !== API_KEY) {
    return new Response(loginHtml(), { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
  }

  const { results } = await env.DB.prepare('SELECT id, name, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 500').all()

  if (url.searchParams.get('format') === 'csv') {
    const bom = '﻿'
    const rows = results.map(r => `${r.id},"${(r.name||'').replace(/"/g,'""')}","${(r.message||'').replace(/"/g,'""')}","${r.created_at}"`)
    return new Response(bom + 'id,name,message,created_at\n' + rows.join('\n'), { headers: { 'Content-Type': 'text/csv;charset=utf-8' } })
  }

  return new Response(adminHtml(results, key), { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}
