import { previewParse } from 'C:/Users/86139/Desktop/steven/（在线）word-blast-pro/frontend/src/config/_old_parser'

const CASES: Array<[string, string]> = [
  ['空格自由文本', 'apple 苹果\ncat 猫'],
  ['空格+例句', 'dog 狗 The dog can run fast.'],
  ['旧三列 英文,中文,例句', 'apple,苹果,I eat an apple every day.'],
  ['旧两列', 'apple,苹果'],
  ['中文在前', '苹果 apple'],
  ['带括号词性标注', 'robot (n.) 机器人'],
  ['带音标', 'apple /ˈæpəl/ 苹果'],
  ['斜杠多拼', 'color/colour 颜色'],
  ['行首编号', '1. robot 机器人'],
  ['单词+句子混排', 'apple 苹果\nI pack my schoolbag. 我整理书包。'],
  ['多空格', 'apple    苹果'],
  ['带句号的单词条目', 'apple. 苹果'],
  ['短语', 'feed the cows 喂奶牛'],
  ['中文带括号', '苹果（水果）apple'],
]

const out: any[] = []
for (const [label, text] of CASES) {
  const r = previewParse(text)
  out.push({
    label,
    items: r.items.map(i => ({ en: i.en, zh: i.zh, type: i.type, sentence: i.sentence })),
    errors: r.errors,
  })
}
console.log(JSON.stringify(out, null, 2))
