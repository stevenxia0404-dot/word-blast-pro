/* _audio_test.ts — 音频播放纪律静态回归（零依赖） */
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8')
let fail = 0
const ok = (c: any, l: string) => {
  if (c) console.log('  ✅', l)
  else { fail++; console.log('  ❌', l) }
}

const audio = read('frontend/src/hooks/useAudio.ts')
const app = read('frontend/src/App.tsx')
const repeat = read('frontend/src/components/RepeatModule.tsx')
const dialogue = read('frontend/src/components/DialogueModule.tsx')

console.log('\n[1] 统一抢占 / 不串音')
ok(audio.includes('function beginPlay()'), '所有播放走统一抢占入口')
ok(audio.includes("return 'aborted'"), '被抢占与真未命中分开处理')
ok(!/speakWord[\s\S]{0,400}tryPlayNeural/.test(audio.split('export function speakWord')[1] || ''),
  'speakWord 不再二次查询 manifest（不会双重播放）')
ok(audio.includes('function cancelSystem()') && audio.includes('speechSynthesis.cancel()'),
  '播报前统一掐掉系统 TTS')
ok((audio.match(/cancelSystem\(\)/g) || []).length >= 2, 'beginPlay 与 stopNeural 都掐系统音')

console.log('\n[2] 延迟')
ok(audio.includes('export function prefetchNeural('), '音频预热能力存在')
ok(app.includes('prefetchNeural(levelVocab.map(v => v.en))'), '闯关本关词条预热')
ok(repeat.includes('prefetchNeural(queue.map(v => v.en))'), '跟读队列预热')
ok(dialogue.includes("prefetchNeural(queue.flatMap(r => [r.cue, r.reply]), 'emma')"), '对话队列预热（Emma）')
ok(!audio.includes('ensureVoices'), '系统 TTS 兜底不再等最长 3 秒的 voices 列表')

console.log('\n[3] 偶发降级')
ok(audio.split('export function unlockAudio')[1]?.includes('new Audio()'),
  'iOS 解锁用独立 Audio 元素，不抢播报通道')
ok(audio.includes('prefetched.has(src)'), '预热去重，不会重复下载')
ok(audio.includes('prefetchEls.length > 80'), '预热元素有上限，不会长会话内存泄漏')

console.log(fail === 0 ? '\n音频纪律全部通过 ✅' : `\n${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
