# 回归测试脚本（开发期专用）

沙盒开发期间的回归验证，**不参与生产构建**（不在 frontend/ 内）。

| 脚本 | 覆盖 | 跑法 |
| --- | --- | --- |
| `_l1_test.ts` | 存档迁移（13→12 关）、脏数据兜底、称号双来源、玩法家族判定 | `npx esbuild _l1_test.ts --bundle --platform=node --format=cjs --outfile=_l1_test.js && node _l1_test.js` |
| `_l2_test.ts` | 存档写入策略（P0：welcome 态有进度必须写入） | 同上 |
| `_e2e_test.js` | 真实浏览器：首页三卡片、画布非空白、回首页、跟读模块、存档迁移、口语分展示 | `node _e2e_test.js`（需 dev server 在 127.0.0.1:5173） |
| `_l5_test.js` | 真实浏览器：v3.2 更新弹窗、说明页新章节 | `node _l5_test.js` |
| `_phase2_test.ts` | 二期 L1：教材原句约束、对话积分/防刷、三模块进度、Emma manifest | `npx esbuild _phase2_test.ts --bundle --platform=node --format=cjs --outfile=_phase2_test.js && node _phase2_test.js` |
| `_phase2_e2e.ts` | 二期浏览器：对话模块、勋章墙、`?grand` 金色大满贯证书（仅 dev） | `node _phase2_e2e.js`（需 dev server） |

前置：dev server 跑着（`cd frontend && npm run dev -- --host 127.0.0.1 --port 5173`）。
Playwright 找不到时设 `PLAYWRIGHT_PATH`；chromium 版本不匹配时设 `CHROME_PATH`。
