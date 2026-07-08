CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '匿名',
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now','+8 hours'))
);
