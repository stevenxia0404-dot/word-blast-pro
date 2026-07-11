function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const name = (body.name || '').slice(0, 50) || '匿名'
    const message = (body.message || '').slice(0, 2000)
    if (!message.trim()) return json({ error: '请输入反馈内容' }, 400)
    await env.DB.prepare('INSERT INTO feedback (name, message) VALUES (?, ?)').bind(name, message).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: '提交失败' }, 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
