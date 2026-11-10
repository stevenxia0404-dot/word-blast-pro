# Word Blast 同步后端（v3.3）

## 线上链路
- 前端（Pages）：`https://word.boluomate.com`
- 同步 API：**同源** `/api/sync/*`，由 `functions/api/sync/[[path]].js` 提供
- 存储：Pages 项目已绑定的 D1 `word-blast-db`（与「意见反馈」同一个库）
- 首次请求自动执行 `CREATE TABLE IF NOT EXISTS`，**不需要手工建表**

`backend/worker/index.js` 是早期的独立 Worker（反馈管理后台），保留兼容，
新功能不再往那里加。

## 接口
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/sync/config` | 返回邮件是否可用、dev 模式 |
| POST | `/api/sync/code` | 发邮箱验证码（60s 限流 / 5 分钟 / 一次性） |
| POST | `/api/sync/verify` | 验码换 JWT（30 天） |
| POST | `/api/sync/space` | 无邮件服务时创建「同步空间」，返回同步码 |
| POST | `/api/sync/claim` | 另一台设备用同步码加入 |
| GET/POST/DELETE | `/api/sync/data` | 拉取 / 合并上传 / 清空云端存档 |

## 安全设计
- JWT 原生 HS256（WebCrypto），payload 自包含 `sub/ver/iat/exp`，不建 session 表；
  每次请求仍回查用户存在 + `token_version`，即「服务端二次校验」。
- 签名密钥优先读 `JWT_SECRET`；未配置时首次请求生成随机值存 `sync_config`（D1），
  不需要在控制台手工配。
- 验证码只存 SHA-256 摘要，**送达才入库**（Resend 返回成功才写），
  一次性、5 分钟、60 秒限流、错 5 次销毁。
- 上传数据字段级清洗 + 256KB 上限；分数取 max、记录取并集、词库按最后同步覆盖。
- 服务端 `version` 乐观锁：版本不一致返回 409，客户端自动重合并再来一次。
- 录音不进同步白名单，永远只在本机内存里回放。

## 邮件（可选增强）
邮箱验证码需要两个环境变量（Pages 项目 → Settings → Environment variables）：

```
RESEND_API_KEY = re_xxx
RESEND_FROM   = Word Blast <word@boluomate.com>   # 必须是 Resend 已验证域名下的发件人
```

没配也不影响使用：前端自动切到「同步码」模式，创建空间后把 20 位同步码
抄到另一台设备即可加入同一个同步空间。域名验证属于账号侧 DNS 操作，
代码侧无法代办。

## 本地验证
```
cd tests
npx esbuild _sync_core_test.ts --bundle --platform=node --format=cjs --outfile=_sync_core_test.js
node _sync_core_test.js
```
核心逻辑用 `memoryStore` 跑，不需要 Cloudflare 账号、不需要网络。
浏览器端到端见 `_sync_e2e.ts`（Playwright 拦截 `/sync-api/*`，跑的是同一份核心代码）。
