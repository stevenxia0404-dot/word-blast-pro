export interface VocabItem {
  id: number
  en: string
  zh: string
}

export interface LevelConfig {
  id: number
  name: string
  cols: number
  rows: number
  wordIds: number[]
}

export interface TitleDef {
  name: string
  emoji: string
  minScore: number
}

/* ── 词库 125 条 ── */

export const VOCABULARY: VocabItem[] = [
  // #1-10  Level 1  日常动作与动物
  { id: 1, en: 'robot', zh: '机器人' },
  { id: 2, en: 'music', zh: '音乐' },
  { id: 3, en: 'talk', zh: '谈话/聊天' },
  { id: 4, en: 'sing', zh: '唱歌' },
  { id: 5, en: 'dance', zh: '跳舞' },
  { id: 6, en: 'he', zh: '他' },
  { id: 7, en: 'go', zh: '去/走' },
  { id: 8, en: 'lion', zh: '狮子' },
  { id: 9, en: 'mouse', zh: '老鼠' },
  { id: 10, en: 'share', zh: '分享' },
  // #11-20  Level 2  人物与自然
  { id: 11, en: 'mother', zh: '妈妈' },
  { id: 12, en: 'mum', zh: '妈妈' },
  { id: 13, en: 'nice', zh: '令人愉快的/美好的' },
  { id: 14, en: 'cook', zh: '厨师/烹饪' },
  { id: 15, en: 'great', zh: '超棒的' },
  { id: 16, en: 'teacher', zh: '老师' },
  { id: 17, en: 'good', zh: '好的' },
  { id: 18, en: 'super', zh: '超级棒的' },
  { id: 19, en: 'plant', zh: '植物/种植' },
  { id: 20, en: 'tree', zh: '树' },
  // #21-30  Level 3  植物与自然
  { id: 21, en: 'root', zh: '根' },
  { id: 22, en: 'roots', zh: '根（复数）' },
  { id: 23, en: 'trunk', zh: '树干' },
  { id: 24, en: 'branch', zh: '树枝' },
  { id: 25, en: 'branches', zh: '树枝（复数）' },
  { id: 26, en: 'leaf', zh: '树叶' },
  { id: 27, en: 'leaves', zh: '树叶（复数）' },
  { id: 28, en: 'flower', zh: '花' },
  { id: 29, en: 'grass', zh: '草地' },
  { id: 30, en: 'pond', zh: '水池' },
  // #31-40  Level 4  水世界与场所
  { id: 31, en: 'lake', zh: '湖' },
  { id: 32, en: 'river', zh: '河' },
  { id: 33, en: 'sea', zh: '海' },
  { id: 34, en: 'duck', zh: '鸭子' },
  { id: 35, en: 'frog', zh: '青蛙' },
  { id: 36, en: 'fish', zh: '鱼' },
  { id: 37, en: 'shark', zh: '鲨鱼' },
  { id: 38, en: 'canteen', zh: '餐厅' },
  { id: 39, en: 'toilet', zh: '厕所/洗手间' },
  { id: 40, en: 'classroom', zh: '教室' },
  // #41-50  Level 5  状态与情感
  { id: 41, en: 'dirty', zh: '脏的' },
  { id: 42, en: 'clean', zh: '干净的' },
  { id: 43, en: 'use', zh: '使用' },
  { id: 44, en: 'dish', zh: '盘子' },
  { id: 45, en: 'dishes', zh: '盘子（复数）' },
  { id: 46, en: 'happy', zh: '高兴的' },
  { id: 47, en: 'excited', zh: '激动地/兴奋的' },
  { id: 48, en: 'upset', zh: '难过的/沮丧的' },
  { id: 49, en: 'angry', zh: '生气的' },
  { id: 50, en: 'face', zh: '脸' },
  // #51-60  Level 6  动作与家庭
  { id: 51, en: 'eating', zh: '吃饭/吃（动名词形式）' },
  { id: 52, en: 'using', zh: '使用（动名词形式）' },
  { id: 53, en: 'feed', zh: '喂养/喂食' },
  { id: 54, en: 'cow', zh: '奶牛' },
  { id: 55, en: 'cows', zh: '奶牛（复数）' },
  { id: 56, en: 'see', zh: '看见' },
  { id: 57, en: 'film', zh: '电影' },
  { id: 58, en: 'visit', zh: '看望/参观' },
  { id: 59, en: 'grandma', zh: '奶奶/外婆' },
  { id: 60, en: 'grandpa', zh: '爷爷/外公' },
  // #61-70  Level 7  日常家务
  { id: 61, en: 'and', zh: '和' },
  { id: 62, en: 'time', zh: '时间/时光' },
  { id: 63, en: 'do', zh: '做' },
  { id: 64, en: 'housework', zh: '家务' },
  { id: 65, en: 'tidy', zh: '整理' },
  { id: 66, en: 'room', zh: '房间' },
  { id: 67, en: 'make', zh: '铺（床）/制作' },
  { id: 68, en: 'bed', zh: '床' },
  { id: 69, en: 'clap', zh: '拍打' },
  { id: 70, en: 'hands', zh: '手（复数）' },
  // #71-80  Level 8  运动与时间
  { id: 71, en: 'play', zh: '玩/玩耍' },
  { id: 72, en: 'game', zh: '游戏' },
  { id: 73, en: 'have', zh: '有/进行' },
  { id: 74, en: 'sports', zh: '体育的/运动的' },
  { id: 75, en: 'field', zh: '场地/田野' },
  { id: 76, en: 'wash', zh: '洗' },
  { id: 77, en: 'my', zh: '我的' },
  { id: 78, en: 'I', zh: '我' },
  { id: 79, en: 'after', zh: '在...之后' },
  { id: 80, en: 'before', zh: '在...之前' },
  // #81-90  Level 9  基础词汇
  { id: 81, en: 'eat', zh: '吃' },
  { id: 82, en: 'the', zh: '这/这些（定冠词）' },
  { id: 83, en: 'are', zh: '是（复数/第二人称）' },
  { id: 84, en: 'green', zh: '绿色的' },
  { id: 85, en: 'it', zh: '它' },
  { id: 86, en: 'has', zh: '有（第三人称单数）' },
  { id: 87, en: 'a', zh: '一个（不定冠词）' },
  { id: 88, en: 'yellow', zh: '黄色的' },
  { id: 89, en: 'by', zh: '在...旁边' },
  { id: 90, en: 'is', zh: '是（单数）' },
  // #91-102  Level 10  日常生活
  { id: 91, en: 'drink', zh: '喝' },
  { id: 92, en: 'some', zh: '一些' },
  { id: 93, en: 'milk', zh: '牛奶' },
  { id: 94, en: 'read', zh: '读' },
  { id: 95, en: 'story', zh: '故事' },
  { id: 96, en: 'say', zh: '说' },
  { id: 97, en: 'night', zh: '夜晚/晚' },
  { id: 98, en: 'sleep', zh: '睡觉' },
  { id: 99, en: "It's", zh: '它是' },
  { id: 100, en: 'for', zh: '为/给/对于' },
  { id: 101, en: 'pack', zh: '整理/收拾' },
  { id: 102, en: 'schoolbag', zh: '书包' },
  // #103-117  短语 (Level 11-12)
  { id: 103, en: 'feed the cows', zh: '喂奶牛' },
  { id: 104, en: 'see a film', zh: '看电影' },
  { id: 105, en: 'visit Grandma and Grandpa', zh: '看望爷爷奶奶' },
  { id: 106, en: 'have a good time', zh: '过得愉快' },
  { id: 107, en: 'do the housework', zh: '做家务' },
  { id: 108, en: 'tidy my room', zh: '整理我的房间' },
  { id: 109, en: 'make the bed', zh: '铺床' },
  { id: 110, en: 'clap hands', zh: '拍手' },
  { id: 111, en: 'play a game', zh: '玩游戏' },
  { id: 112, en: 'have a go', zh: '试一试' },
  { id: 113, en: 'sports field', zh: '运动场' },
  { id: 114, en: 'wash my hands', zh: '洗手' },
  { id: 115, en: 'drink some milk', zh: '喝牛奶' },
  { id: 116, en: 'read a story', zh: '读故事' },
  { id: 117, en: 'say good night', zh: '说晚安' },
  // #118-125  句子 (Level 13)
  { id: 118, en: 'My mum is a great cook.', zh: '我的妈妈是一位超棒的厨师。' },
  { id: 119, en: 'I wash my hands after using the toilet.', zh: '我在上完厕所后洗手。' },
  { id: 120, en: 'I wash my hands before eating.', zh: '我在吃饭前洗手。' },
  { id: 121, en: 'The leaves are green.', zh: '这些叶子是绿色的。' },
  { id: 122, en: 'It has a yellow flower.', zh: '它有一朵黄色的花。' },
  { id: 123, en: 'I see a frog by the lake.', zh: '我在湖边看到一只青蛙。' },
  { id: 124, en: "It's time for bed.", zh: '睡觉时间到了。' },
  { id: 125, en: 'I pack my schoolbag.', zh: '我整理书包。' },
]

/* ── 关卡定义 ── */

export const LEVELS: LevelConfig[] = [
  { id: 1, name: '日常动作与动物', cols: 3, rows: 4, wordIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 2, name: '人物与自然', cols: 3, rows: 4, wordIds: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: 3, name: '植物与自然', cols: 3, rows: 4, wordIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
  { id: 4, name: '水世界与场所', cols: 3, rows: 4, wordIds: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
  { id: 5, name: '状态与情感', cols: 3, rows: 4, wordIds: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
  { id: 6, name: '动作与家庭', cols: 3, rows: 4, wordIds: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
  { id: 7, name: '日常家务', cols: 3, rows: 4, wordIds: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70] },
  { id: 8, name: '运动与时间', cols: 3, rows: 4, wordIds: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80] },
  { id: 9, name: '基础词汇', cols: 3, rows: 4, wordIds: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90] },
  { id: 10, name: '日常生活', cols: 3, rows: 4, wordIds: [91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102] },
  { id: 11, name: '核心短语①', cols: 2, rows: 3, wordIds: [103, 104, 105, 106, 107, 108, 109] },
  { id: 12, name: '核心短语②', cols: 2, rows: 3, wordIds: [110, 111, 112, 113, 114, 115, 116, 117] },
  { id: 13, name: '完整句子', cols: 2, rows: 3, wordIds: [118, 119, 120, 121, 122, 123, 124, 125] },
]

/* ── 小节类型 ── */

export type SubsectionType = 'match' | 'spell' | 'cloze' | 'wordSelect' | 'wordOrder'

export interface SubsectionDef {
  type: SubsectionType
  label: string
}

export function getSubsections(levelId: number): SubsectionDef[] {
  if (levelId <= 10) {
    return [
      { type: 'match', label: '配对消消' },
      { type: 'spell', label: '字母拼写' },
      { type: 'cloze', label: '完形填空' },
    ]
  }
  if (levelId <= 12) {
    return [
      { type: 'match', label: '短语配对' },
      { type: 'wordSelect', label: '选词拼短语' },
      { type: 'wordOrder', label: '单词拼写' },
    ]
  }
  return [
    { type: 'match', label: '句子配对' },
    { type: 'cloze', label: '完形填空' },
    { type: 'wordOrder', label: '连词成句' },
  ]
}

/* ── 颜色主题 ── */

export const COLOR_THEMES = {
  enBg: '#eff6ff',
  enBorder: '#bfdbfe',
  enText: '#1e40af',
  zhBg: '#fff7ed',
  zhBorder: '#fed7aa',
  zhText: '#9a3412',
  selectedBg: '#84cc16',
  selectedBorder: '#a3e635',
  selectedText: '#ffffff',
  matchedBg: '#22c55e',
}

/* ── 积分规则 ── */

export const SCORE = {
  match: 100,
  spell: 100,
  cloze: 100,
  comboBonus: 50,
  helpCost: [0, 300, 500, 800] as const,
  helpScore: [0, 30, 10, 0] as const,
}

/* ── 称号 ── */

export const TITLES: TitleDef[] = [
  { name: '英语小芽', emoji: '🌱', minScore: 0 },
  { name: '英语小苗', emoji: '🌿', minScore: 500 },
  { name: '英语小树', emoji: '🌳', minScore: 1500 },
  { name: '英语学霸', emoji: '🔥', minScore: 3000 },
  { name: '单词大王', emoji: '👑', minScore: 5000 },
]

export function getTitle(score: number): TitleDef {
  let t = TITLES[0]
  for (const title of TITLES) {
    if (score >= title.minScore) t = title
  }
  return t
}

/* ── 星级评定 ── */

export function getStars(accuracy: number): number {
  if (accuracy >= 90) return 3
  if (accuracy >= 70) return 2
  return 1
}
