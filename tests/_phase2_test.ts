// 二期第一批 L1 纯函数验证（esbuild bundle 后 node 直跑）
// 覆盖：教材原句约束、积分口径、对话独立防刷、三模块进度判定、manifest 双音色
import { DIALOGUES, DIALOGUE_LINES, DIALOGUE_COUNT } from '../frontend/src/config/dialogues'
import { SCORE, SENTENCES } from '../frontend/src/config/gameConfig'
import {
  recordDialogue, loadDialogue, loadSpokenScore, loadModuleProgress, spokenTotal,
} from '../frontend/src/hooks/useSpokenRecords'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
}

let fail = 0
const ok = (c: unknown, label: string) => {
  if (c) console.log('  ✅', label)
  else { fail++; console.log('  ❌', label) }
}

console.log('\n[1] 对话内容：全部取自 3A 教材原句，不编造')
const sentenceSet = new Set(SENTENCES.map(s => s.en))
ok(DIALOGUES.length === 8 && DIALOGUE_COUNT === 8, '8 组情景对话')
ok(DIALOGUES.every(d => sentenceSet.has(d.cue)), '每句 cue 都是教材原句')
ok(DIALOGUES.every(d => sentenceSet.has(d.reply)), '每句 reply 都是教材原句')
ok(DIALOGUES.every(d => d.scene && d.cueZh && d.replyZh), '每组都有中文情景与原译')
ok(new Set(DIALOGUES.map(d => d.id)).size === 8, 'id 不重复')
ok(new Set(DIALOGUES.map(d => d.reply)).size === 8, 'reply 不重复（防刷 key 唯一）')
ok(DIALOGUE_LINES.length === new Set(DIALOGUE_LINES).size, '音频文本清单无重复')

console.log('\n[2] 积分口径（定稿：对话 +100 / +15，称号门槛不动）')
ok(SCORE.dialogueFirst === 100, '对话首次 +100')
ok(SCORE.dialogueReview === 15, '对话复习 +15')
ok(SCORE.repeatFirst === 60 && SCORE.repeatReview === 10, '跟读 +60 / +10 未改')
ok(SCORE.repeatSentenceFirst === 100 && SCORE.repeatSentenceReview === 15, '整句跟读 +100 / +15 未改')

console.log('\n[3] 对话独立防刷 + 共用口语分池')
const r1 = recordDialogue(DIALOGUES[0].reply)
ok(r1.isFirst === true && r1.points === 100, '首次答对 +100')
const r2 = recordDialogue(DIALOGUES[0].reply)
ok(r2.isFirst === false && r2.points === 15, '同句再答只给 +15')
ok(spokenTotal() === 115 && loadSpokenScore().score === 115, '两次都进同一个口语分池')
ok(Object.keys(loadDialogue()).length === 1, '对话记录只记 1 条')
const p0 = loadModuleProgress(false)
ok(p0.dialogueDone === false && p0.grandSlam === false, '只答 1 组不点亮勋章')

console.log('\n[4] 三模块进度 / 大满贯')
DIALOGUES.slice(1).forEach(d => recordDialogue(d.reply))
const p1 = loadModuleProgress(true)
ok(p1.dialogueDone === true, '8 组全答 → 对话勋章点亮')
ok(p1.repeatDone === false, '跟读没练完不误判点亮')
ok(p1.grandSlam === false, '跟读未完成时不是大满贯')
const p2 = loadModuleProgress(true, true)
ok(p2.grandSlam === true && p2.blastDone && p2.repeatDone && p2.dialogueDone, 'demo 强制全亮（不写存档）')
ok(loadModuleProgress(true).grandSlam === false, 'demo 不污染真实进度')

console.log('\n[5] Emma 音频清单（构建期产物）')
const man = JSON.parse(readFileSync(join(__dirname, '../frontend/public/audio/manifest.json'), 'utf8'))
ok(Array.isArray(Object.keys(man.emma)) && Object.keys(man.emma).length === DIALOGUE_LINES.length,
  `manifest.emma 覆盖全部 ${DIALOGUE_LINES.length} 条对话文本`)
ok(DIALOGUE_LINES.every(t => man.emma[t.trim().toLowerCase()]), '每条文本都有 Emma 映射')
ok(DIALOGUE_LINES.every(t => {
  const e = man.emma[t.trim().toLowerCase()]
  return e && e.n.startsWith('e_n_') && e.s.startsWith('e_s_')
}), 'Emma 文件名前缀与 Ana 不冲突')
ok(Object.keys(man.ana).length > 100, 'Ana 老清单未被覆盖')
const audioDir = join(__dirname, '../frontend/public/audio')
ok(DIALOGUE_LINES.every(t => {
  const e = man.emma[t.trim().toLowerCase()]
  try {
    readFileSync(join(audioDir, e.n)); readFileSync(join(audioDir, e.s))
    return true
  } catch { return false }
}), '全部 Emma mp3 文件存在')

console.log('\n[6] 生产构建：演示入口 0 痕迹')
const distAssets = join(__dirname, '../frontend/dist/assets')
const distBundle = readdirSync(distAssets)
  .filter(f => f.endsWith('.js'))
  .map(f => readFileSync(join(distAssets, f), 'utf8'))
  .join('')
ok(!distBundle.includes('演示：查看大满贯证书'), '生产 bundle 不含 dev 演示按钮文案')
ok(distBundle.includes('大满贯证书'), '生产 bundle 含正式大满贯证书')

console.log(fail === 0 ? '\n二期 L1 全部通过 ✅' : `\n${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
