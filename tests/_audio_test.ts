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
ok(audio.includes('PREFETCH_CONCURRENCY = 3'), '预热并发限流，不会 100 个请求抢带宽')
ok(audio.includes('MAX_PREFETCH_PER_ROUND'), '每轮预热有上限，慢网不拖垮正在点的播报')

console.log('\n[4] v3.4.5 线上滞后 / 降级 / 重叠回归')
ok(audio.includes("'missing' | 'failed' | 'aborted'"), '拆分 missing / failed / aborted')
ok(audio.includes("if (r === 'missing') speakSystem"), '只有确实没音频才降级系统 TTS')
ok(audio.includes("else if (r === 'failed') opts.onEnd?.()"), '网络失败静默清状态，绝不降机械音')
ok(audio.includes('lastSrc !== src'), '同 URL 复用缓冲，不重复 load/解码')
ok(!audio.includes('el.removeAttribute(\'src\')\n    el.load()'), 'stopNeural 不再制造 AbortError 风暴')
ok(audio.includes('PLAY_TIMEOUT_MS'), 'play() 有超时，慢网 UI 不会一直挂播放中')
const sysBody = (audio.split('function speakSystem')[1] || '').split('export async function speakNeural')[0]
ok(sysBody.includes('cancelSystem()'), '系统 TTS 降级前二次 cancel（iOS 队列）')
ok(audio.includes("await fetch(src)"), '预热改 fetch 全量 200，SW 能真正缓存')
const vite = read('frontend/vite.config.ts')
ok(vite.includes('[0, 200, 206]'), 'SW 音频缓存白名单收 206（Range 响应）')
ok(vite.includes("wb-audio-v2"), '缓存名升 v2，清掉旧脏缓存')

console.log(fail === 0 ? '\n音频纪律全部通过 ✅' : `\n${fail} 项失败 ❌`)
process.exit(fail ? 1 : 0)
