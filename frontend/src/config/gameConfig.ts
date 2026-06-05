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

/* ── 词库 108 条 ── */

export const VOCABULARY: VocabItem[] = [
  // #1-10  Level 1  动物
  { id: 1, en: 'cat', zh: '猫' },
  { id: 2, en: 'dog', zh: '狗' },
  { id: 3, en: 'bird', zh: '鸟' },
  { id: 4, en: 'fish', zh: '鱼' },
  { id: 5, en: 'rabbit', zh: '兔子' },
  { id: 6, en: 'bear', zh: '熊' },
  { id: 7, en: 'pig', zh: '猪' },
  { id: 8, en: 'duck', zh: '鸭子' },
  { id: 9, en: 'hen', zh: '母鸡' },
  { id: 10, en: 'cow', zh: '奶牛' },
  // #11-20  Level 2  野生动物
  { id: 11, en: 'tiger', zh: '老虎' },
  { id: 12, en: 'lion', zh: '狮子' },
  { id: 13, en: 'monkey', zh: '猴子' },
  { id: 14, en: 'elephant', zh: '大象' },
  { id: 15, en: 'panda', zh: '熊猫' },
  { id: 16, en: 'snake', zh: '蛇' },
  { id: 17, en: 'horse', zh: '马' },
  { id: 18, en: 'sheep', zh: '绵羊' },
  { id: 19, en: 'frog', zh: '青蛙' },
  { id: 20, en: 'fox', zh: '狐狸' },
  // #21-30  Level 3  人物
  { id: 21, en: 'teacher', zh: '老师' },
  { id: 22, en: 'student', zh: '学生' },
  { id: 23, en: 'mother', zh: '妈妈' },
  { id: 24, en: 'father', zh: '爸爸' },
  { id: 25, en: 'sister', zh: '姐妹' },
  { id: 26, en: 'brother', zh: '兄弟' },
  { id: 27, en: 'friend', zh: '朋友' },
  { id: 28, en: 'baby', zh: '宝宝' },
  { id: 29, en: 'girl', zh: '女孩' },
  { id: 30, en: 'boy', zh: '男孩' },
  // #31-40  Level 4  身体
  { id: 31, en: 'head', zh: '头' },
  { id: 32, en: 'eye', zh: '眼睛' },
  { id: 33, en: 'ear', zh: '耳朵' },
  { id: 34, en: 'nose', zh: '鼻子' },
  { id: 35, en: 'mouth', zh: '嘴巴' },
  { id: 36, en: 'hand', zh: '手' },
  { id: 37, en: 'foot', zh: '脚' },
  { id: 38, en: 'arm', zh: '手臂' },
  { id: 39, en: 'leg', zh: '腿' },
  { id: 40, en: 'face', zh: '脸' },
  // #41-50  Level 5  食物
  { id: 41, en: 'apple', zh: '苹果' },
  { id: 42, en: 'banana', zh: '香蕉' },
  { id: 43, en: 'cake', zh: '蛋糕' },
  { id: 44, en: 'bread', zh: '面包' },
  { id: 45, en: 'milk', zh: '牛奶' },
  { id: 46, en: 'egg', zh: '鸡蛋' },
  { id: 47, en: 'rice', zh: '米饭' },
  { id: 48, en: 'water', zh: '水' },
  { id: 49, en: 'juice', zh: '果汁' },
  { id: 50, en: 'candy', zh: '糖果' },
  // #51-60  Level 6  颜色与自然
  { id: 51, en: 'red', zh: '红色' },
  { id: 52, en: 'blue', zh: '蓝色' },
  { id: 53, en: 'green', zh: '绿色' },
  { id: 54, en: 'yellow', zh: '黄色' },
  { id: 55, en: 'white', zh: '白色' },
  { id: 56, en: 'black', zh: '黑色' },
  { id: 57, en: 'sun', zh: '太阳' },
  { id: 58, en: 'moon', zh: '月亮' },
  { id: 59, en: 'star', zh: '星星' },
  { id: 60, en: 'tree', zh: '树' },
  // #61-70  Level 7  学校
  { id: 61, en: 'book', zh: '书' },
  { id: 62, en: 'pen', zh: '钢笔' },
  { id: 63, en: 'desk', zh: '课桌' },
  { id: 64, en: 'chair', zh: '椅子' },
  { id: 65, en: 'bag', zh: '书包' },
  { id: 66, en: 'ruler', zh: '尺子' },
  { id: 67, en: 'pencil', zh: '铅笔' },
  { id: 68, en: 'paper', zh: '纸' },
  { id: 69, en: 'clock', zh: '时钟' },
  { id: 70, en: 'door', zh: '门' },
  // #71-80  Level 8  动作
  { id: 71, en: 'run', zh: '跑' },
  { id: 72, en: 'jump', zh: '跳' },
  { id: 73, en: 'swim', zh: '游泳' },
  { id: 74, en: 'fly', zh: '飞' },
  { id: 75, en: 'sing', zh: '唱歌' },
  { id: 76, en: 'dance', zh: '跳舞' },
  { id: 77, en: 'read', zh: '阅读' },
  { id: 78, en: 'write', zh: '写' },
  { id: 79, en: 'draw', zh: '画画' },
  { id: 80, en: 'eat', zh: '吃' },
  // #81-90  Level 9  家庭与物品
  { id: 81, en: 'bed', zh: '床' },
  { id: 82, en: 'table', zh: '桌子' },
  { id: 83, en: 'phone', zh: '电话' },
  { id: 84, en: 'hat', zh: '帽子' },
  { id: 85, en: 'shirt', zh: '衬衫' },
  { id: 86, en: 'shoes', zh: '鞋子' },
  { id: 87, en: 'dress', zh: '裙子' },
  { id: 88, en: 'ball', zh: '球' },
  { id: 89, en: 'bike', zh: '自行车' },
  { id: 90, en: 'bus', zh: '公交车' },
  // #91-102  短语 (Level 10-11)
  { id: 91, en: 'feed the cows', zh: '喂奶牛' },
  { id: 92, en: 'see a film', zh: '看电影' },
  { id: 93, en: 'watch TV', zh: '看电视' },
  { id: 94, en: 'go home', zh: '回家' },
  { id: 95, en: 'get up', zh: '起床' },
  { id: 96, en: 'go to bed', zh: '上床睡觉' },
  { id: 97, en: 'play football', zh: '踢足球' },
  { id: 98, en: 'read a book', zh: '读书' },
  { id: 99, en: 'ride a bike', zh: '骑自行车' },
  { id: 100, en: 'fly a kite', zh: '放风筝' },
  { id: 101, en: 'have breakfast', zh: '吃早餐' },
  { id: 102, en: 'do homework', zh: '做作业' },
  // #103-108  句子 (Level 12)
  { id: 103, en: 'My mum is a great cook.', zh: '我的妈妈是一位超棒的厨师。' },
  { id: 104, en: 'I like to play with my dog.', zh: '我喜欢和我的狗一起玩。' },
  { id: 105, en: 'The sun rises in the east.', zh: '太阳从东方升起。' },
  { id: 106, en: 'She can sing and dance.', zh: '她会唱歌和跳舞。' },
  { id: 107, en: 'There is a big tree in the park.', zh: '公园里有一棵大树。' },
  { id: 108, en: 'He goes to school by bus.', zh: '他坐公交车去上学。' },
]

/* ── 关卡定义 ── */

export const LEVELS: LevelConfig[] = [
  { id: 1, name: '动物', cols: 3, rows: 4, wordIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 2, name: '野生动物', cols: 3, rows: 4, wordIds: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: 3, name: '人物', cols: 3, rows: 4, wordIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
  { id: 4, name: '身体', cols: 3, rows: 4, wordIds: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
  { id: 5, name: '食物', cols: 3, rows: 4, wordIds: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
  { id: 6, name: '颜色与自然', cols: 3, rows: 4, wordIds: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
  { id: 7, name: '学校', cols: 3, rows: 4, wordIds: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70] },
  { id: 8, name: '动作', cols: 3, rows: 4, wordIds: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80] },
  { id: 9, name: '家庭与物品', cols: 3, rows: 4, wordIds: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90] },
  { id: 10, name: '短语①', cols: 2, rows: 3, wordIds: [91, 92, 93, 94, 95, 96] },
  { id: 11, name: '短语②', cols: 2, rows: 3, wordIds: [97, 98, 99, 100, 101, 102] },
  { id: 12, name: '句子', cols: 2, rows: 2, wordIds: [103, 104, 105, 106, 107, 108] },
]

/* ── 小节类型 ── */

export type SubsectionType = 'match' | 'spell' | 'cloze' | 'wordSelect' | 'wordOrder'

export interface SubsectionDef {
  type: SubsectionType
  label: string
}

export function getSubsections(levelId: number): SubsectionDef[] {
  if (levelId <= 9) {
    return [
      { type: 'match', label: '配对消消' },
      { type: 'spell', label: '字母拼写' },
      { type: 'cloze', label: '完形填空' },
    ]
  }
  if (levelId <= 11) {
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
