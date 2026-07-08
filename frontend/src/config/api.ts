const API_BASE = import.meta.env.VITE_API_BASE || 'https://word-blast-api.boluomate.com'
const API_KEY = import.meta.env.VITE_API_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
}

export async function submitFeedback(name: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || '匿名', message }),
    })
    const data = await res.json()
    return data.ok === true
  } catch {
    return false
  }
}

export async function fetchFeedback(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API_BASE}/api/feedback?key=${encodeURIComponent(API_KEY)}`)
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export async function downloadFeedbackCsv(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/feedback/export?key=${encodeURIComponent(API_KEY)}`)
  if (!res.ok) throw new Error('Unauthorized')
  const text = await res.text()
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'feedback.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
