#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_vocab.py — 3A 教材 md → 结构化 JSON + 校验报告

用法：
    python tools/build_vocab.py [--src <md 路径>] [--out content/3a-unit1-5.json]

产出：
    content/3a-unit1-5.json   结构化词库（保留 unit 字段，将来按单元编排不用重新导入）
    stdout                   校验报告：重复项 / 类型判定 / 语境覆盖率 / 挖空候选统计

设计原则（第一性）：
  1. 只从「核心词汇」「扩展词汇」「句子」三个小节取词；「语音」小节整节跳过
     —— 语音板块的词若已在别处出现，仍正常收录（不因出现在语音行而剔除）
  2. 不做任何杜撰：没有真实例句的词，sentence 字段留空，不编造
  3. 挖空答案取句子里的原词（tomatoes 而非 tomato），复数变体单独记进词库
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(ROOT, "content", "3A英语知识点梳理（Unit1-5）.md")
DEFAULT_OUT = os.path.join(ROOT, "content", "3a-unit1-5.json")

# ── 停用词：不作为挖空候选（挖了孩子靠语法猜，测不出词义） ──
STOPWORDS = {
    "the", "a", "an", "is", "am", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "of", "for", "with", "and", "or", "but", "if",
    "so", "that", "this", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "its", "our", "their", "do", "does", "did", "can", "could", "will",
    "would", "shall", "should", "may", "might", "must", "have", "has",
    "had", "not", "no", "yes", "up", "down", "out", "off", "over", "under",
    "then", "than", "there", "here", "what", "who", "when", "where", "why",
    "how", "all", "any", "some", "each", "every", "both", "few", "more",
    "most", "other", "another", "such", "own", "same", "too", "very",
    "just", "now", "also", "from", "as", "by", "about", "into", "through",
    "i'm", "we're", "it's", "he's", "she's", "let's", "don't", "doesn't",
    "isn't", "aren't", "you're", "they're", "that's", "there's", "i'll",
    "we'll", "he'll", "she'll", "you'll", "they'll",
}

# 括号注释：英文（复数 xxx）/ 中文（xxx）
PAREN_RE = re.compile(r"^(.+?)\s*[（(](.+?)[)）]\s*$")
PLURAL_RE = re.compile(r"复数\s*([A-Za-z']+)")
TOKEN_RE = re.compile(r"[A-Za-z']+")


def parse_unit_header(line):
    """## Unit 1 A new start 知识点梳理 → (1, 'A new start')"""
    m = re.match(r"^##\s*Unit\s*(\d+)\s*(.*)$", line.strip())
    if not m:
        return None
    num = int(m.group(1))
    title = re.sub(r"知识点梳理.*$", "", m.group(2)).strip()
    return num, title


def parse_section_header(line):
    """### 一、核心词汇 → ('word','core')；### 二、句子 → ('sentence','sentence')；
       ### 四、语音 → None（整节跳过）"""
    title = line.strip().lstrip("#").strip()
    if "语音" in title:
        return None
    if "句子" in title:
        return ("sentence", "sentence")
    if "词汇" in title:
        kind = "extra" if "扩展" in title else "core"
        return ("word", kind)
    return None


def split_row(line):
    """| a | b | → ['a', 'b']"""
    s = line.strip()
    if not (s.startswith("|") and s.endswith("|")):
        return None
    return [c.strip() for c in s[1:-1].split("|")]


def is_separator(cells):
    return bool(cells) and all(re.match(r"^:?-{2,}:?$", c) for c in cells if c)


def is_header(cells):
    return bool(cells) and any(c in ("英文", "中文", "英文单词", "中文翻译") for c in cells)


def split_paren(en, zh):
    """拆括号注释：英文侧提取复数变体，中文侧剥掉括号"""
    plural = None
    m = PAREN_RE.match(en)
    if m:
        en = m.group(1).strip()
        pm = PLURAL_RE.search(m.group(2))
        if pm:
            plural = pm.group(1)
    m2 = PAREN_RE.match(zh)
    if m2:
        zh = m2.group(1).strip()
    return en, zh, plural


def classify(en):
    """短语（含空格）→ phrase；否则 word"""
    return "phrase" if re.search(r"\s", en) else "word"


# ── 复数推导 ──
# 资料只在 tomato/strawberry/leaf 三处标了「（复数 xxx）」，
# 但句子里大量出现未标注的复数形态（classmates/teachers/books…）。
# 不推导这些词就永远匹配不上 → 语境覆盖率被严重低估。
# 规则：常规变形 + 不规则表。
IRREGULAR_PLURAL = {
    "leaf": "leaves", "knife": "knives", "life": "lives", "wife": "wives",
    "foot": "feet", "tooth": "teeth", "child": "children", "man": "men",
    "woman": "women", "person": "people", "goose": "geese", "mouse": "mice",
    "sheep": "sheep", "fish": "fish", "potato": "potatoes", "tomato": "tomatoes",
    "strawberry": "strawberries", "leaf": "leaves",
}


def guess_plural(en):
    """推导英文复数形态；无法推导返回 None"""
    if " " in en or not en:
        return None
    low = en.lower()
    if low in IRREGULAR_PLURAL:
        return IRREGULAR_PLURAL[low]
    if low.endswith(("s", "x", "z", "ch", "sh")):
        return low + "es"
    if low.endswith("y") and len(low) > 1 and low[-2] not in "aeiou":
        return low[:-1] + "ies"
    return low + "s"


IRREGULAR_ING = {
    "draw": "drawing", "swim": "swimming", "run": "running",
    "sit": "sitting", "write": "writing", "lie": "lying",
    "die": "dying", "tie": "tying", "fly": "flying",
}


def guess_ing(en):
    """推导动名词/现在分词形态：draw→drawing, jump→jumping, play→playing"""
    if " " in en or not en:
        return None
    low = en.lower()
    if low in IRREGULAR_ING:
        return IRREGULAR_ING[low]
    if low.endswith("ie"):
        return low[:-2] + "ying"
    if low.endswith("e") and not low.endswith(("ee", "ye", "oe")):
        return low[:-1] + "ing"
    return low + "ing"


def guess_plural_of_phrase(en):
    """短语复数：只变最后一个词 —— water drop → water drops"""
    if " " not in en:
        return None
    parts = en.split(" ")
    last = guess_plural(parts[-1])
    if not last:
        return None
    return " ".join(parts[:-1] + [last])


def build_blank_candidates(sentence_en, word_index, phrase_words):
    """算一个句子的挖空候选。

    word_index: {小写英文形态 → 词条}，含原形 / 复数 / 动名词变体
    phrase_words: 短语类词条（整体挖，不拆词）
    返回 [{token, answer, wordEn, zh, display}]

    执行顺序：短语优先 → 再单词。
      · 短语必须先跑，否则 "water drops" 里的 drops 会先被单词逻辑吃掉，
        挖完只剩个孤零零的 s，答案还对不上词条。
      · 形态按长度降序尝试，避免 "water drop" 先于 "water drops" 命中。
    """
    spans = [(m.group(0), m.start(), m.end()) for m in TOKEN_RE.finditer(sentence_en)]
    # 统计每个 token 形态在句中的出现次数（挖空后答案要唯一）
    counts = {}
    for tok, _, _ in spans:
        counts[tok.lower()] = counts.get(tok.lower(), 0) + 1

    seen_words = set()   # 已占用的词条（en 小写）
    used_spans = []      # 已占用的字符区间，避免挖空位置重叠
    out = []

    def overlaps(a, b):
        return any(not (b <= s or a >= e) for s, e in used_spans)

    def word_bound_ok(lower, idx, length):
        if idx > 0 and lower[idx - 1].isalpha():
            return False
        end_idx = idx + length
        if end_idx < len(lower) and lower[end_idx].isalpha():
            return False
        return True

    # ── ① 短语挖空（整段） ──
    lower = sentence_en.lower()
    for w in phrase_words:
        forms = [w["en"].lower()]
        gp = guess_plural_of_phrase(w["en"])
        if gp:
            forms.append(gp)
        forms.sort(key=len, reverse=True)
        for form in forms:
            if w["en"].lower() in seen_words:
                continue
            idx = lower.find(form)
            if idx < 0:
                continue
            if not word_bound_ok(lower, idx, len(form)):
                continue
            if lower.find(form, idx + 1) >= 0:
                continue  # 出现多次，挖了有歧义
            # 还原原文大小写
            m = re.search(re.escape(form), sentence_en[idx:idx + len(form)], re.IGNORECASE)
            token = m.group(0) if m else form
            out.append({
                "token": token,
                "answer": token,
                "wordEn": w["en"],
                "zh": w["zh"],
                "display": sentence_en[:idx] + "___" + sentence_en[idx + len(form):],
            })
            seen_words.add(w["en"].lower())
            used_spans.append((idx, idx + len(form)))
            break

    # ── ② 单词挖空 ──
    for tok, start, end in spans:
        low = tok.lower()
        if low in STOPWORDS or len(low) < 2 or len(low) > 14:
            continue
        entry = word_index.get(low)
        if not entry:
            continue
        # 命中的形态属于某个短语（water drops → water drop）：
        # 单 token 挖会只挖掉 drops，答案不是完整词条 → 交给短语整段挖
        if entry["type"] == "phrase" and entry["en"].lower() != low:
            continue
        if entry["en"].lower() in seen_words:
            continue
        if counts[low] > 1:
            continue  # 形态在句中出现多次 → 有歧义
        if overlaps(start, end):
            continue  # 与已挖的短语位置重叠
        out.append({
            "token": tok,
            "answer": tok,          # 答案取句中原词（tomatoes 而非 tomato）
            "wordEn": entry["en"],  # 对应到词库里的词条
            "zh": entry["zh"],
            "display": sentence_en[:start] + "___" + sentence_en[end:],
        })
        seen_words.add(entry["en"].lower())
        used_spans.append((start, end))

    out.sort(key=lambda c: c["display"])
    return out


def main():
    ap = argparse.ArgumentParser(description="3A 教材 md → 结构化 JSON")
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    if not os.path.exists(args.src):
        sys.exit(f"[错误] 找不到源文件：{args.src}")

    with open(args.src, encoding="utf-8") as f:
        lines = f.read().split("\n")

    units = []          # [{num, title}]
    words = []
    sentences = []
    current_unit = None
    current_section = None
    in_table = False
    table_rows = []
    dup_items = []
    skipped_phonics = 0

    def flush_table():
        """把收集到的表格行按当前小节归类"""
        nonlocal table_rows
        if not table_rows or current_section is None:
            table_rows = []
            return
        kind, sec = current_section
        for cells in table_rows:
            if len(cells) < 2:
                continue
            en_raw, zh_raw = cells[0], cells[1]
            if not en_raw:
                continue
            en, zh, plural = split_paren(en_raw, zh_raw)
            if not en or not zh:
                continue
            if kind == "sentence":
                sentences.append({
                    "en": en, "zh": zh, "type": "sentence",
                    "unit": current_unit, "section": sec,
                })
            else:
                words.append({
                    "en": en, "zh": zh, "type": classify(en),
                    "unit": current_unit, "section": sec, "plural": plural,
                })
        table_rows = []

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()

        if stripped.startswith("## ") and "Unit" in stripped:
            flush_table()
            in_table = False
            parsed = parse_unit_header(stripped)
            if parsed:
                current_unit, utitle = parsed
                units.append({"num": current_unit, "title": utitle})
            continue

        if stripped.startswith("###"):
            flush_table()
            in_table = False
            sec = parse_section_header(stripped)
            if sec is None:
                current_section = None
                skipped_phonics += 1
            else:
                current_section = sec
            continue

        if stripped.startswith("|"):
            cells = split_row(stripped)
            if cells is None:
                continue
            if is_separator(cells):
                in_table = True
                continue
            if is_header(cells):
                continue
            if in_table and current_section is not None:
                table_rows.append(cells)
            continue

        # 非表格行 → 结束当前表格
        if stripped:
            flush_table()
            in_table = False

    flush_table()

    # ── 去重（英文小写相同） ──
    def dedupe(items, label):
        seen = {}
        dups = []
        for it in items:
            key = it["en"].lower().strip()
            if key in seen:
                dups.append((it, seen[key]))
                continue
            seen[key] = it
        for it, first in dups:
            dup_items.append(f"{label}「{it['en']}」（U{it['unit']} 与 U{first['unit']} 重复，保留前者）")
        return list(seen.values())

    words = dedupe(words, "词汇")
    sentences = dedupe(sentences, "句子")

    # ── 序号 ──
    for i, w in enumerate(words, 1):
        w["seq"] = i
    for i, s in enumerate(sentences, 1):
        s["seq"] = i

    # ── 索引 + 挖空候选 ──
    # 索引三向：原形 / 显式复数 / 推导复数
    word_index = {}
    for w in words:
        word_index[w["en"].lower()] = w
        if w.get("plural"):
            word_index[w["plural"].lower()] = w
        else:
            # 复数变体：单词推复数，短语推「末词复数」
            g = guess_plural(w["en"]) if w["type"] == "word" else guess_plural_of_phrase(w["en"])
            if g:
                word_index.setdefault(g, w)
                w["pluralGuessed"] = g
        # 动名词变体（教材句子里大量出现 drawing / jumping）
        if w["type"] == "word":
            gi = guess_ing(w["en"])
            if gi:
                word_index.setdefault(gi, w)
                w["ingGuessed"] = gi
        # 短语的复数形态也要能当「一个整体」命中
        # （water drops 必须整段挖掉，不能只挖 drops —— 那样答案就不是词库里的词条了）
        if w["type"] == "phrase":
            for form in (guess_plural_of_phrase(w["en"]),):
                if form:
                    word_index.setdefault(form, w)

    phrase_words = [w for w in words if w["type"] == "phrase"]
    total_cand = 0
    for s in sentences:
        cands = build_blank_candidates(s["en"], word_index, phrase_words)
        s["blanks"] = cands
        total_cand += len(cands)

    # ── 覆盖率统计 ──
    covered = set()
    for s in sentences:
        for c in s["blanks"]:
            covered.add(c["wordEn"].lower())
    uncovered = [w for w in words if w["en"].lower() not in covered]

    # ── 输出 JSON ──
    out = {
        "meta": {
            "source": os.path.basename(args.src),
            "grade": "3A",
            "unitRange": [units[0]["num"], units[-1]["num"]] if units else [],
            "units": units,
            "counts": {"words": len(words), "sentences": len(sentences)},
        },
        "words": words,
        "sentences": sentences,
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # ── 校验报告 ──
    print("=" * 62)
    print("3A 教材资料转换校验报告")
    print("=" * 62)
    print(f"源文件  {os.path.basename(args.src)}")
    print(f"输出    {os.path.relpath(args.out, ROOT)}")
    print(f"单元    {out['meta']['unitRange']} · {len(units)} 个 · 语音小节跳过 {skipped_phonics} 个")
    print()
    print(f"词汇 {len(words)} 条 · 句子 {len(sentences)} 条 · 合计 {len(words)+len(sentences)} 条")

    # 类型分布
    dist = {}
    for w in words:
        dist[w["type"]] = dist.get(w["type"], 0) + 1
    print(f"  词汇类型：单词 {dist.get('word',0)} · 短语 {dist.get('phrase',0)}")
    print(f"  短语清单：{'、'.join(w['en'] for w in words if w['type']=='phrase')}")

    # 每单元
    print()
    print("按单元：")
    for u in units:
        uw = [w for w in words if w["unit"] == u["num"]]
        us = [s for s in sentences if s["unit"] == u["num"]]
        uw_c = len([w for w in uw if w["en"].lower() in covered])
        print(f"  U{u['num']} {u['title'][:24]:<26} 词 {len(uw):>2}（语境覆盖 {uw_c:>2}） · 句 {len(us):>2} · 挖空候选 {sum(len(s['blanks']) for s in us):>2}")

    # 重复
    print()
    if dup_items:
        print(f"⚠️ 重复项 {len(dup_items)} 条：")
        for d in dup_items:
            print(f"   - {d}")
    else:
        print("✅ 无重复词条")

    # 复数变体
    plurals = [w for w in words if w.get("plural")]
    guessed = [w for w in words if w.get("pluralGuessed")]
    if plurals or guessed:
        print()
        if plurals:
            print(f"资料标注的复数 {len(plurals)} 个：" + "、".join(f"{w['en']}→{w['plural']}" for w in plurals))
        if guessed:
            print(f"自动推导的复数 {len(guessed)} 个（资料未标注）")

    # 挖空候选
    print()
    print(f"挖空候选总计 {total_cand} 个（可挖的句子 {len([s for s in sentences if s['blanks']])}/{len(sentences)}）")
    no_blank = [s for s in sentences if not s["blanks"]]
    if no_blank:
        print(f"  无候选的句子 {len(no_blank)} 条：" + "、".join(s["en"] for s in no_blank[:6]) + ("…" if len(no_blank) > 6 else ""))

    # 覆盖率
    print()
    pct = round(len(covered) / len(words) * 100) if words else 0
    print(f"语境覆盖率：{len(covered)}/{len(words)} 词（{pct}%）有真实句子可挖空")
    if uncovered:
        print(f"  无语境词 {len(uncovered)} 个：" + "、".join(w["en"] for w in uncovered))

    print()
    print("=" * 62)


if __name__ == "__main__":
    main()
