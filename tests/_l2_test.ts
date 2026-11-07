import { shouldPersistSave } from '../frontend/src/config/saveSchema'
let fail = 0
const ok = (c: boolean, l: string) => { if (!c) { fail++; console.log('FAIL:', l) } }
// P0 核心：welcome 态但有进度 → 必须写存档（旧逻辑在这里删档）
ok(shouldPersistSave({ phase: 'welcome', levelIndex: 0, levelResults: [], totalScore: 0 }) === false, '全新用户不留空档')
ok(shouldPersistSave({ phase: 'welcome', levelIndex: 0, levelResults: [], totalScore: 120 }) === true, 'welcome + 有分数 → 写入')
ok(shouldPersistSave({ phase: 'welcome', levelIndex: 0, levelResults: [{ stars: 2, accuracy: 80, score: 100 }], totalScore: 0 }) === true, 'welcome + 有星 → 写入')
ok(shouldPersistSave({ phase: 'welcome', levelIndex: 3, levelResults: [], totalScore: 0 }) === true, 'welcome + 关卡前进 → 写入')
ok(shouldPersistSave({ phase: 'playing', levelIndex: 0, levelResults: [], totalScore: 0 }) === true, 'playing → 写入')
ok(shouldPersistSave({ phase: 'allComplete', levelIndex: 11, levelResults: [], totalScore: 5000 }) === true, 'allComplete → 写入')
console.log(fail === 0 ? 'L2 存档策略全部通过 ✅' : `${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
