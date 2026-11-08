#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_vocab_ts.py — content/3a-unit1-5.json → frontend/src/config/vocab3a.ts

用法：
    python tools/build_vocab.py && python tools/gen_vocab_ts.py

vocab3a.ts 是自动生成文件，勿手改：
    md → content/3a-unit1-5.json → vocab3a.ts
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content", "3a-unit1-5.json")
OUT = os.path.join(ROOT, "frontend", "src", "config", "vocab3a.ts")


def q(s):
    """TS 字符串字面量（双引号 + 转义）"""
    return json.dumps(s, ensure_ascii=False)


def main():
    with open(SRC, encoding="utf-8") as f:
        d = json.load(f)

    L = []
    L.append("/* vocab3a.ts — 3A 教材词库（自动生成，勿手改）")
    L.append(" *")
    L.append(" * 由 tools/build_vocab.py 从 content/3A英语知识点梳理（Unit1-5）.md 生成：")
    L.append(" *   md → content/3a-unit1-5.json → 本文件")
    L.append(" * 重新生成：python tools/build_vocab.py && python tools/gen_vocab_ts.py")
    L.append(" *")
    L.append(" * 保留 unit 字段：将来按单元编排关卡时无需重新导入资料。")
    L.append(" */")
    L.append("import type { VocabItem, SentenceBlank } from './gameConfig'")
    L.append("")
    L.append("export interface Vocab3aWord extends VocabItem {")
    L.append("  /** 所属单元（1-5） */")
    L.append("  unit: number")
    L.append("  /** core=核心词汇 · extra=扩展词汇 */")
    L.append("  section: 'core' | 'extra'")
    L.append("  /** 复数变体（资料标注或自动推导） */")
    L.append("  plural?: string")
    L.append("}")
    L.append("")
    L.append("export interface Vocab3aSentence extends VocabItem {")
    L.append("  unit: number")
    L.append("  /** 可挖空位置：答案取句中原词（tomatoes 而非 tomato） */")
    L.append("  blanks: SentenceBlank[]")
    L.append("}")
    L.append("")
    L.append("/* ── {n} 个词汇（{w} 单词 + {p} 短语） ── */".format(
        n=len(d["words"]),
        w=len([w for w in d["words"] if w["type"] == "word"]),
        p=len([w for w in d["words"] if w["type"] == "phrase"]),
    ))
    L.append("export const VOCAB_3A_WORDS: Vocab3aWord[] = [")
    for w in d["words"]:
        parts = [
            "id: {0}".format(w["seq"]),
            "en: {0}".format(q(w["en"])),
            "zh: {0}".format(q(w["zh"])),
            "type: '{0}'".format(w["type"]),
            "unit: {0}".format(w["unit"]),
            "section: '{0}'".format(w["section"]),
        ]
        if w.get("plural"):
            parts.append("plural: {0}".format(q(w["plural"])))
        L.append("  { " + ", ".join(parts) + " },")
    L.append("]")
    L.append("")
    L.append("/* ── {0} 个教材句子 ── */".format(len(d["sentences"])))
    L.append("export const VOCAB_3A_SENTENCES: Vocab3aSentence[] = [")
    for s in d["sentences"]:
        blanks = ", ".join(
            "{{ token: {0}, answer: {1}, wordEn: {2}, zh: {3}, display: {4} }}".format(
                q(b["token"]), q(b["answer"]), q(b["wordEn"]), q(b["zh"]), q(b["display"]))
            for b in s["blanks"]
        )
        parts = [
            # 句子 id 走独立空间（1000+）：词汇 id 是 1-66，句子若也用 1-50 会与词汇撞车
            # → 关卡按 id 取词时会拿到同 id 的单词，玩法判定整个错位
            "id: {0}".format(1000 + s["seq"]),
            "en: {0}".format(q(s["en"])),
            "zh: {0}".format(q(s["zh"])),
            "type: 'sentence'",
            "unit: {0}".format(s["unit"]),
            "blanks: [{0}]".format(blanks),
        ]
        L.append("  { " + ", ".join(parts) + " },")
    L.append("]")
    L.append("")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print("vocab3a.ts 已生成：{0} 词 + {1} 句".format(
        len(d["words"]), len(d["sentences"])))


if __name__ == "__main__":
    main()
