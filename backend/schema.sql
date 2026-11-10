CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '匿名',
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now','+8 hours'))
);


/* ── 跨设备同步（v3.3）：Pages Functions 首次请求会自动建表，
 *    这里保留一份同等定义，便于在 Cloudflare 控制台手工核对 / 重建。 ── */
CREATE TABLE IF NOT EXISTS sync_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  recovery_hash TEXT,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_saves (
  user_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
