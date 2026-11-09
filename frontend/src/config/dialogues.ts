/* dialogues.ts — 对话练习内容库（二期第一批）
 * 单一来源：对话组 + 音频文本清单（tools/gen_audio.py 从这里取 Emma 要合成的句子）
 * 内容约束：cue / reply 全部取自 3A 教材 Unit 1-5 的 50 个原句，不编造英文。
 *   中文只做情景提示与教材原译，方便孩子知道「什么时候该说这句」。
 * 音色：cue 与 reply 示范都是 en-US-EmmaNeural（Steven 2026-11-07 拍板）。
 */
export interface DialogueRound {
  id: number
  unit: number
  /** 中文情景：这一轮对话发生在什么时候 */
  scene: string
  /** Emma 说的那句（教材原句） */
  cue: string
  cueZh: string
  /** 孩子要开口说的那句（教材原句）—— 也是计分与防刷的 key */
  reply: string
  replyZh: string
}

export const DIALOGUES: DialogueRound[] = [
  {
    id: 1, unit: 1, scene: '开学第一天，老师带来一位新同学',
    cue: "Children, this is James. He's from New Zealand.",
    cueZh: '孩子们，这位是詹姆斯，他来自新西兰。',
    reply: 'Welcome, James!', replyZh: '欢迎你，詹姆斯！',
  },
  {
    id: 2, unit: 1, scene: '回到校园，和同学说说心情',
    cue: "We're back at school.", cueZh: '我们回到校园。',
    reply: "We're back to school. I'm so happy.", replyZh: '返校啦，我特别开心。',
  },
  {
    id: 3, unit: 2, scene: '同学看起来不太舒服，你关心一下',
    cue: "What's wrong?", cueZh: '发生什么事儿了？',
    reply: "It doesn't matter.", replyZh: '没关系。',
  },
  {
    id: 4, unit: 2, scene: '聊聊自己和好朋友的本领',
    cue: "I'm good at drawing.", cueZh: '我擅长绘画。',
    reply: 'My friend Frog is good at jumping.', replyZh: '我的朋友青蛙擅长跳跃。',
  },
  {
    id: 5, unit: 3, scene: '在菜园里，指着一块地问',
    cue: "What's this?", cueZh: '这是什么？',
    reply: 'This place is for vegetables.', replyZh: '这个地方是种蔬菜的。',
  },
  {
    id: 6, unit: 3, scene: '看到一株植物，问问是不是番茄',
    cue: 'Is it a tomato plant?', cueZh: '它是一株番茄吗？',
    reply: 'I grow many tomatoes in my garden.', replyZh: '我在花园里种了许多番茄。',
  },
  {
    id: 7, unit: 4, scene: '科学课上，问水滴去哪儿了',
    cue: 'Where do the water drops go?', cueZh: '水滴去哪儿了？',
    reply: 'They become water vapour and go up and become the clouds in the sky.',
    replyZh: '它们变成水蒸气升起来，变成天上的云。',
  },
  {
    id: 8, unit: 5, scene: '路上有人向你问路',
    cue: 'Excuse me, where is Shanghai No.1 School?', cueZh: '打扰一下，上海第一学校在哪里？',
    reply: "Oh, it's just over there.", replyZh: '哦，就在那边。',
  },
]

/** Emma 需要预生成音频的文本（去重，cue 与 reply 都在内） */
export const DIALOGUE_LINES: string[] = Array.from(
  new Set(DIALOGUES.flatMap(d => [d.cue, d.reply])),
)
export const DIALOGUE_COUNT = DIALOGUES.length
