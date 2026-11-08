/* vocab3a.ts — 3A 教材词库（自动生成，勿手改）
 *
 * 由 tools/build_vocab.py 从 content/3A英语知识点梳理（Unit1-5）.md 生成：
 *   md → content/3a-unit1-5.json → 本文件
 * 重新生成：python tools/build_vocab.py && python tools/gen_vocab_ts.py
 *
 * 保留 unit 字段：将来按单元编排关卡时无需重新导入资料。
 */
import type { VocabItem, SentenceBlank } from './gameConfig'

export interface Vocab3aWord extends VocabItem {
  /** 所属单元（1-5） */
  unit: number
  /** core=核心词汇 · extra=扩展词汇 */
  section: 'core' | 'extra'
  /** 复数变体（资料标注或自动推导） */
  plural?: string
}

export interface Vocab3aSentence extends VocabItem {
  unit: number
  /** 可挖空位置：答案取句中原词（tomatoes 而非 tomato） */
  blanks: SentenceBlank[]
}

/* ── 66 个词汇（50 单词 + 16 短语） ── */
export const VOCAB_3A_WORDS: Vocab3aWord[] = [
  { id: 1, en: "new", zh: "新的", type: 'word', unit: 1, section: 'core' },
  { id: 2, en: "school", zh: "学校", type: 'word', unit: 1, section: 'core' },
  { id: 3, en: "classmate", zh: "同班同学", type: 'word', unit: 1, section: 'core' },
  { id: 4, en: "teacher", zh: "教师", type: 'word', unit: 1, section: 'core' },
  { id: 5, en: "play sports", zh: "运动", type: 'phrase', unit: 1, section: 'core' },
  { id: 6, en: "read", zh: "阅读", type: 'word', unit: 1, section: 'core' },
  { id: 7, en: "book", zh: "书", type: 'word', unit: 1, section: 'core' },
  { id: 8, en: "study", zh: "学习", type: 'word', unit: 1, section: 'core' },
  { id: 9, en: "hard", zh: "努力地", type: 'word', unit: 1, section: 'core' },
  { id: 10, en: "goal", zh: "目标；目的", type: 'word', unit: 1, section: 'core' },
  { id: 11, en: "want", zh: "想要", type: 'word', unit: 1, section: 'core' },
  { id: 12, en: "friend", zh: "朋友", type: 'word', unit: 1, section: 'core' },
  { id: 13, en: "plan", zh: "计划；打算", type: 'word', unit: 1, section: 'core' },
  { id: 14, en: "follow", zh: "跟随", type: 'word', unit: 1, section: 'core' },
  { id: 15, en: "start", zh: "开始；起点", type: 'word', unit: 1, section: 'core' },
  { id: 16, en: "draw", zh: "绘画", type: 'word', unit: 2, section: 'core' },
  { id: 17, en: "dance", zh: "跳舞", type: 'word', unit: 2, section: 'core' },
  { id: 18, en: "sing", zh: "唱歌", type: 'word', unit: 2, section: 'core' },
  { id: 19, en: "run", zh: "跑步", type: 'word', unit: 2, section: 'core' },
  { id: 20, en: "tell a story", zh: "讲故事", type: 'phrase', unit: 2, section: 'core' },
  { id: 21, en: "use the computer", zh: "使用电脑", type: 'phrase', unit: 2, section: 'core' },
  { id: 22, en: "be good at", zh: "擅长", type: 'phrase', unit: 2, section: 'core' },
  { id: 23, en: "jump", zh: "跳跃", type: 'word', unit: 2, section: 'core' },
  { id: 24, en: "umbrella", zh: "雨伞", type: 'word', unit: 2, section: 'core' },
  { id: 25, en: "proud", zh: "自豪的", type: 'word', unit: 2, section: 'core' },
  { id: 26, en: "riddle", zh: "谜语", type: 'word', unit: 2, section: 'extra' },
  { id: 27, en: "predict", zh: "预测", type: 'word', unit: 2, section: 'extra' },
  { id: 28, en: "expression", zh: "表达", type: 'word', unit: 2, section: 'extra' },
  { id: 29, en: "special", zh: "特别的", type: 'word', unit: 2, section: 'extra' },
  { id: 30, en: "act out", zh: "表演", type: 'phrase', unit: 2, section: 'extra' },
  { id: 31, en: "garden", zh: "花园", type: 'word', unit: 3, section: 'core' },
  { id: 32, en: "tomato", zh: "番茄", type: 'word', unit: 3, section: 'core', plural: "tomatoes" },
  { id: 33, en: "flower", zh: "花", type: 'word', unit: 3, section: 'core' },
  { id: 34, en: "strawberry", zh: "草莓", type: 'word', unit: 3, section: 'core', plural: "strawberries" },
  { id: 35, en: "vegetable", zh: "蔬菜", type: 'word', unit: 3, section: 'core' },
  { id: 36, en: "leaf", zh: "叶子", type: 'word', unit: 3, section: 'core', plural: "leaves" },
  { id: 37, en: "plant", zh: "植物", type: 'word', unit: 3, section: 'core' },
  { id: 38, en: "grow", zh: "种植", type: 'word', unit: 3, section: 'core' },
  { id: 39, en: "carrot", zh: "胡萝卜", type: 'word', unit: 3, section: 'core' },
  { id: 40, en: "tea", zh: "茶", type: 'word', unit: 3, section: 'core' },
  { id: 41, en: "orange tree", zh: "橘子树", type: 'phrase', unit: 3, section: 'core' },
  { id: 42, en: "school garden report", zh: "校园花园报告", type: 'phrase', unit: 3, section: 'core' },
  { id: 43, en: "cloud", zh: "云", type: 'word', unit: 4, section: 'core' },
  { id: 44, en: "water vapour", zh: "水蒸气", type: 'phrase', unit: 4, section: 'core' },
  { id: 45, en: "rain", zh: "雨", type: 'word', unit: 4, section: 'core' },
  { id: 46, en: "snow", zh: "雪", type: 'word', unit: 4, section: 'core' },
  { id: 47, en: "lake", zh: "湖", type: 'word', unit: 4, section: 'core' },
  { id: 48, en: "river", zh: "河", type: 'word', unit: 4, section: 'core' },
  { id: 49, en: "sea", zh: "海", type: 'word', unit: 4, section: 'core' },
  { id: 50, en: "water drop", zh: "水滴", type: 'phrase', unit: 4, section: 'core' },
  { id: 51, en: "ice", zh: "冰", type: 'word', unit: 4, section: 'core' },
  { id: 52, en: "air", zh: "空气", type: 'word', unit: 4, section: 'core' },
  { id: 53, en: "sky", zh: "天空", type: 'word', unit: 4, section: 'core' },
  { id: 54, en: "lab report", zh: "实验报告", type: 'phrase', unit: 4, section: 'core' },
  { id: 55, en: "help", zh: "帮助", type: 'word', unit: 5, section: 'core' },
  { id: 56, en: "cook", zh: "烹饪；烹调", type: 'word', unit: 5, section: 'core' },
  { id: 57, en: "do the dishes", zh: "洗碗碟", type: 'phrase', unit: 5, section: 'core' },
  { id: 58, en: "clean the table", zh: "擦桌子", type: 'phrase', unit: 5, section: 'core' },
  { id: 59, en: "walk the dog", zh: "遛狗", type: 'phrase', unit: 5, section: 'core' },
  { id: 60, en: "chore", zh: "日常事务；家务活", type: 'word', unit: 5, section: 'core' },
  { id: 61, en: "helper", zh: "助手；帮手", type: 'word', unit: 5, section: 'core' },
  { id: 62, en: "give your seat", zh: "让座", type: 'phrase', unit: 5, section: 'core' },
  { id: 63, en: "help with cooking", zh: "帮忙做饭", type: 'phrase', unit: 5, section: 'core' },
  { id: 64, en: "take my seat", zh: "坐我的座位", type: 'phrase', unit: 5, section: 'core' },
  { id: 65, en: "ant", zh: "蚂蚁", type: 'word', unit: 5, section: 'core' },
  { id: 66, en: "fox", zh: "狐狸", type: 'word', unit: 5, section: 'core' },
]

/* ── 50 个教材句子 ── */
export const VOCAB_3A_SENTENCES: Vocab3aSentence[] = [
  { id: 1001, en: "A new start.", zh: "新的开始。", type: 'sentence', unit: 1, blanks: [{ token: "new", answer: "new", wordEn: "new", zh: "新的", display: "A ___ start." }, { token: "start", answer: "start", wordEn: "start", zh: "开始；起点", display: "A new ___." }] },
  { id: 1002, en: "It's time for school.", zh: "开学啦。", type: 'sentence', unit: 1, blanks: [{ token: "school", answer: "school", wordEn: "school", zh: "学校", display: "It's time for ___." }] },
  { id: 1003, en: "We're back at school.", zh: "我们回到校园。", type: 'sentence', unit: 1, blanks: [{ token: "school", answer: "school", wordEn: "school", zh: "学校", display: "We're back at ___." }] },
  { id: 1004, en: "Meet my classmates.", zh: "见到同学们。", type: 'sentence', unit: 1, blanks: [{ token: "classmates", answer: "classmates", wordEn: "classmate", zh: "同班同学", display: "Meet my ___." }] },
  { id: 1005, en: "Meet my teachers.", zh: "见到老师们。", type: 'sentence', unit: 1, blanks: [{ token: "teachers", answer: "teachers", wordEn: "teacher", zh: "教师", display: "Meet my ___." }] },
  { id: 1006, en: "Play new sports.", zh: "开展新运动。", type: 'sentence', unit: 1, blanks: [{ token: "new", answer: "new", wordEn: "new", zh: "新的", display: "Play ___ sports." }] },
  { id: 1007, en: "Read new books.", zh: "阅读新书。", type: 'sentence', unit: 1, blanks: [{ token: "new", answer: "new", wordEn: "new", zh: "新的", display: "Read ___ books." }, { token: "books", answer: "books", wordEn: "book", zh: "书", display: "Read new ___." }, { token: "Read", answer: "Read", wordEn: "read", zh: "阅读", display: "___ new books." }] },
  { id: 1008, en: "Let's study hard.", zh: "我们努力学习。", type: 'sentence', unit: 1, blanks: [{ token: "study", answer: "study", wordEn: "study", zh: "学习", display: "Let's ___ hard." }, { token: "hard", answer: "hard", wordEn: "hard", zh: "努力地", display: "Let's study ___." }] },
  { id: 1009, en: "Let's play hard.", zh: "我们尽情玩耍。", type: 'sentence', unit: 1, blanks: [{ token: "hard", answer: "hard", wordEn: "hard", zh: "努力地", display: "Let's play ___." }] },
  { id: 1010, en: "We're back to school. I'm so happy.", zh: "返校啦，我特别开心。", type: 'sentence', unit: 1, blanks: [{ token: "school", answer: "school", wordEn: "school", zh: "学校", display: "We're back to ___. I'm so happy." }] },
  { id: 1011, en: "I want to meet my teachers and classmates.", zh: "我想见老师和同学们。", type: 'sentence', unit: 1, blanks: [{ token: "want", answer: "want", wordEn: "want", zh: "想要", display: "I ___ to meet my teachers and classmates." }, { token: "teachers", answer: "teachers", wordEn: "teacher", zh: "教师", display: "I want to meet my ___ and classmates." }, { token: "classmates", answer: "classmates", wordEn: "classmate", zh: "同班同学", display: "I want to meet my teachers and ___." }] },
  { id: 1012, en: "Children, this is James. He's from New Zealand.", zh: "孩子们，这位是詹姆斯，他来自新西兰。", type: 'sentence', unit: 1, blanks: [{ token: "New", answer: "New", wordEn: "new", zh: "新的", display: "Children, this is James. He's from ___ Zealand." }] },
  { id: 1013, en: "Welcome, James!", zh: "欢迎你，詹姆斯！", type: 'sentence', unit: 1, blanks: [] },
  { id: 1014, en: "I'm good at drawing.", zh: "我擅长绘画。", type: 'sentence', unit: 2, blanks: [{ token: "drawing", answer: "drawing", wordEn: "draw", zh: "绘画", display: "I'm good at ___." }] },
  { id: 1015, en: "What's wrong?", zh: "发生什么事儿了？", type: 'sentence', unit: 2, blanks: [] },
  { id: 1016, en: "It doesn't matter.", zh: "没关系。", type: 'sentence', unit: 2, blanks: [] },
  { id: 1017, en: "Xiaopu, you have a new friend.", zh: "小浦，你有了一个新朋友。", type: 'sentence', unit: 2, blanks: [{ token: "new", answer: "new", wordEn: "new", zh: "新的", display: "Xiaopu, you have a ___ friend." }, { token: "friend", answer: "friend", wordEn: "friend", zh: "朋友", display: "Xiaopu, you have a new ___." }] },
  { id: 1018, en: "I feel better now.", zh: "我现在感觉好多了。", type: 'sentence', unit: 2, blanks: [] },
  { id: 1019, en: "My friend Frog is good at jumping.", zh: "我的朋友青蛙擅长跳跃。", type: 'sentence', unit: 2, blanks: [{ token: "friend", answer: "friend", wordEn: "friend", zh: "朋友", display: "My ___ Frog is good at jumping." }, { token: "jumping", answer: "jumping", wordEn: "jump", zh: "跳跃", display: "My friend Frog is good at ___." }] },
  { id: 1020, en: "Look, you can walk in the rain.", zh: "看！你可以在雨中行走。", type: 'sentence', unit: 2, blanks: [{ token: "rain", answer: "rain", wordEn: "rain", zh: "雨", display: "Look, you can walk in the ___." }] },
  { id: 1021, en: "You don't need an umbrella.", zh: "你不需要雨伞。", type: 'sentence', unit: 2, blanks: [{ token: "umbrella", answer: "umbrella", wordEn: "umbrella", zh: "雨伞", display: "You don't need an ___." }] },
  { id: 1022, en: "My little house is great!", zh: "我的小屋太棒了！", type: 'sentence', unit: 2, blanks: [] },
  { id: 1023, en: "I'm proud of myself too.", zh: "我也为自己而骄傲。", type: 'sentence', unit: 2, blanks: [{ token: "proud", answer: "proud", wordEn: "proud", zh: "自豪的", display: "I'm ___ of myself too." }] },
  { id: 1024, en: "You can see some trees, flowers and vegetables in it.", zh: "你可以在里面看到一些树、花和蔬菜。", type: 'sentence', unit: 3, blanks: [{ token: "flowers", answer: "flowers", wordEn: "flower", zh: "花", display: "You can see some trees, ___ and vegetables in it." }, { token: "vegetables", answer: "vegetables", wordEn: "vegetable", zh: "蔬菜", display: "You can see some trees, flowers and ___ in it." }] },
  { id: 1025, en: "What's this?", zh: "这是什么？", type: 'sentence', unit: 3, blanks: [] },
  { id: 1026, en: "What's that?", zh: "那是什么？", type: 'sentence', unit: 3, blanks: [] },
  { id: 1027, en: "This place is for vegetables.", zh: "这个地方是种蔬菜的。", type: 'sentence', unit: 3, blanks: [{ token: "vegetables", answer: "vegetables", wordEn: "vegetable", zh: "蔬菜", display: "This place is for ___." }] },
  { id: 1028, en: "Bees help the plants.", zh: "蜜蜂帮助植物生长。", type: 'sentence', unit: 3, blanks: [{ token: "help", answer: "help", wordEn: "help", zh: "帮助", display: "Bees ___ the plants." }, { token: "plants", answer: "plants", wordEn: "plant", zh: "植物", display: "Bees help the ___." }] },
  { id: 1029, en: "We can water the plants.", zh: "我们可以给植物浇水。", type: 'sentence', unit: 3, blanks: [{ token: "plants", answer: "plants", wordEn: "plant", zh: "植物", display: "We can water the ___." }] },
  { id: 1030, en: "Is it a tomato plant?", zh: "它是一株番茄吗？", type: 'sentence', unit: 3, blanks: [{ token: "tomato", answer: "tomato", wordEn: "tomato", zh: "番茄", display: "Is it a ___ plant?" }, { token: "plant", answer: "plant", wordEn: "plant", zh: "植物", display: "Is it a tomato ___?" }] },
  { id: 1031, en: "I grow many tomatoes in my garden.", zh: "我在花园里种了许多番茄。", type: 'sentence', unit: 3, blanks: [{ token: "grow", answer: "grow", wordEn: "grow", zh: "种植", display: "I ___ many tomatoes in my garden." }, { token: "tomatoes", answer: "tomatoes", wordEn: "tomato", zh: "番茄", display: "I grow many ___ in my garden." }, { token: "garden", answer: "garden", wordEn: "garden", zh: "花园", display: "I grow many tomatoes in my ___." }] },
  { id: 1032, en: "Grandpa grows lots of strawberries for you.", zh: "爷爷为你们种了许多草莓。", type: 'sentence', unit: 3, blanks: [{ token: "grows", answer: "grows", wordEn: "grow", zh: "种植", display: "Grandpa ___ lots of strawberries for you." }, { token: "strawberries", answer: "strawberries", wordEn: "strawberry", zh: "草莓", display: "Grandpa grows lots of ___ for you." }] },
  { id: 1033, en: "In the air, I'm water vapour.", zh: "在空气中，我是水蒸气。", type: 'sentence', unit: 4, blanks: [{ token: "air", answer: "air", wordEn: "air", zh: "空气", display: "In the ___, I'm water vapour." }, { token: "water vapour", answer: "water vapour", wordEn: "water vapour", zh: "水蒸气", display: "In the air, I'm ___." }] },
  { id: 1034, en: "Little by little, I become clouds.", zh: "渐渐地，我变成了云。", type: 'sentence', unit: 4, blanks: [{ token: "clouds", answer: "clouds", wordEn: "cloud", zh: "云", display: "Little by little, I become ___." }] },
  { id: 1035, en: "I can be ice, to keep food nice.", zh: "我可以成为冰，让食物保持美味。", type: 'sentence', unit: 4, blanks: [{ token: "ice", answer: "ice", wordEn: "ice", zh: "冰", display: "I can be ___, to keep food nice." }] },
  { id: 1036, en: "There are some water drops on the leaves.", zh: "叶子上有一些水滴。", type: 'sentence', unit: 4, blanks: [{ token: "water drops", answer: "water drops", wordEn: "water drop", zh: "水滴", display: "There are some ___ on the leaves." }, { token: "leaves", answer: "leaves", wordEn: "leaf", zh: "叶子", display: "There are some water drops on the ___." }] },
  { id: 1037, en: "Where do the water drops go?", zh: "水滴去哪儿了？", type: 'sentence', unit: 4, blanks: [{ token: "water drops", answer: "water drops", wordEn: "water drop", zh: "水滴", display: "Where do the ___ go?" }] },
  { id: 1038, en: "They become water vapour and go up and become the clouds in the sky.", zh: "它们变成水蒸气升起来，变成天上的云。", type: 'sentence', unit: 4, blanks: [{ token: "water vapour", answer: "water vapour", wordEn: "water vapour", zh: "水蒸气", display: "They become ___ and go up and become the clouds in the sky." }, { token: "clouds", answer: "clouds", wordEn: "cloud", zh: "云", display: "They become water vapour and go up and become the ___ in the sky." }, { token: "sky", answer: "sky", wordEn: "sky", zh: "天空", display: "They become water vapour and go up and become the clouds in the ___." }] },
  { id: 1039, en: "When it is hot, water becomes water vapour.", zh: "天气炎热时，水会变成水蒸气。", type: 'sentence', unit: 4, blanks: [{ token: "water vapour", answer: "water vapour", wordEn: "water vapour", zh: "水蒸气", display: "When it is hot, water becomes ___." }] },
  { id: 1040, en: "When it is cold, water vapour becomes water.", zh: "天气寒冷时，水蒸气会凝结成水。", type: 'sentence', unit: 4, blanks: [{ token: "water vapour", answer: "water vapour", wordEn: "water vapour", zh: "水蒸气", display: "When it is cold, ___ becomes water." }] },
  { id: 1041, en: "When it is very cold, water becomes ice.", zh: "天气非常寒冷时，水会结冰。", type: 'sentence', unit: 4, blanks: [{ token: "ice", answer: "ice", wordEn: "ice", zh: "冰", display: "When it is very cold, water becomes ___." }] },
  { id: 1042, en: "We see water everywhere.", zh: "我们随处可以见到水。", type: 'sentence', unit: 4, blanks: [] },
  { id: 1043, en: "When Mum and Dad are busy, I'm ready to help!", zh: "当爸爸妈妈忙的时候，我愿意帮忙！", type: 'sentence', unit: 5, blanks: [{ token: "help", answer: "help", wordEn: "help", zh: "帮助", display: "When Mum and Dad are busy, I'm ready to ___!" }] },
  { id: 1044, en: "You're welcome.", zh: "不客气。", type: 'sentence', unit: 5, blanks: [] },
  { id: 1045, en: "Excuse me, where is Shanghai No.1 School?", zh: "打扰一下，上海第一学校在哪里？", type: 'sentence', unit: 5, blanks: [{ token: "School", answer: "School", wordEn: "school", zh: "学校", display: "Excuse me, where is Shanghai No.1 ___?" }] },
  { id: 1046, en: "Oh, it's just over there.", zh: "哦，就在那边。", type: 'sentence', unit: 5, blanks: [] },
  { id: 1047, en: "I give my old clothes to people in need.", zh: "我把旧衣服送给有需要的人。", type: 'sentence', unit: 5, blanks: [] },
  { id: 1048, en: "She drops a leaf into the river.", zh: "她把一片叶子掉进河里。", type: 'sentence', unit: 5, blanks: [{ token: "leaf", answer: "leaf", wordEn: "leaf", zh: "叶子", display: "She drops a ___ into the river." }, { token: "river", answer: "river", wordEn: "river", zh: "河", display: "She drops a leaf into the ___." }] },
  { id: 1049, en: "The ant sees that and bites the fox.", zh: "蚂蚁看到了，咬了狐狸。", type: 'sentence', unit: 5, blanks: [{ token: "ant", answer: "ant", wordEn: "ant", zh: "蚂蚁", display: "The ___ sees that and bites the fox." }, { token: "fox", answer: "fox", wordEn: "fox", zh: "狐狸", display: "The ant sees that and bites the ___." }] },
  { id: 1050, en: "This time, the ant helps the bird.", zh: "这一次，蚂蚁帮助了鸟。", type: 'sentence', unit: 5, blanks: [{ token: "ant", answer: "ant", wordEn: "ant", zh: "蚂蚁", display: "This time, the ___ helps the bird." }, { token: "helps", answer: "helps", wordEn: "help", zh: "帮助", display: "This time, the ant ___ the bird." }] },
]
