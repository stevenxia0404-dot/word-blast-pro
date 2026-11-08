#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_audio.py — Word Blast Pro 音频生成脚本

从 frontend/src/config/gameConfig.ts 提取 ALL_ITEMS（词汇 + 教材句子），用 edge-tts 批量合成 mp3
到 frontend/public/audio/，并生成 manifest.json（文本 → 文件名映射）。

设计沿袭公务英语 AI 陪练的 gen_audio.py：
  - 文件名按文本 md5 前 7 位 → 同一句永远同名，增量生成、去重、好排查
  - 应用只认 manifest，不认句子本身；换词库重跑本脚本即可

音色（Steven 2026-11-07 试听拍板）：
  - en-US-AnaNeural（童声）：消消乐播报 + 跟读示范（正常 + 慢速两版）
  - en-US-EmmaNeural（女声）：对话模块（二期接入，先占位不生成）

用法：
    python gen_audio.py            增量生成（已存在的跳过）
    python gen_audio.py --clean    生成后删除 manifest 未引用的孤儿 mp3
    python gen_audio.py --dry-run  只列出待生成项

依赖：pip install edge-tts（本机装在 Python314）
      frontend/node_modules（esbuild 提取 TS 词库用）
"""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # word-blast-pro/
FRONTEND = os.path.join(ROOT, "frontend")
AUDIO_DIR = os.path.join(FRONTEND, "public", "audio")
MANIFEST = os.path.join(AUDIO_DIR, "manifest.json")
TMP_CJS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_gameconfig.cjs")

VOICE_ANA = "en-US-AnaNeural"
SLOW_RATE = "-50%"
CONCURRENCY = 5

PY314 = r"C:/Users/86139/AppData/Local/Programs/Python/Python314/python.exe"


def extract_vocab():
    """用 esbuild 把 gameConfig.ts 编成 CJS，再由 node 输出 JSON 词库"""
    r = subprocess.run(
        ["npx", "esbuild",
         os.path.join("src", "config", "gameConfig.ts"),
         "--bundle", "--format=cjs", "--outfile=" + TMP_CJS.replace('\\', '/')],
        cwd=FRONTEND, capture_output=True, text=True, timeout=120, shell=True,
    )
    if r.returncode != 0:
        sys.exit(f"[错误] esbuild 编译 gameConfig.ts 失败：{r.stderr.strip()}")
    js = "const g = require(" + json.dumps(TMP_CJS.replace('\\', '/')) + ");" \
         "process.stdout.write(JSON.stringify(g.ALL_ITEMS))"
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        sys.exit(f"[错误] node 提取词库失败：{r.stderr.strip()}")
    return json.loads(r.stdout)


def filename(text, prefix):
    h = hashlib.md5(text.encode("utf-8")).hexdigest()[:7]
    return f"{prefix}_{h}.mp3"


async def synth(sem, text, voice, rate, out, made, skipped):
    if os.path.exists(out):
        skipped[0] += 1
        return
    import edge_tts
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(out)
                made[0] += 1
                print(f"[生成] {os.path.basename(out)}  <-  {text[:40]}")
                return
            except Exception as e:
                if attempt == 2:
                    print(f"[失败] {os.path.basename(out)}: {e}")
                    return
                await asyncio.sleep(1.5)


async def run(dry_run):
    vocab = extract_vocab()
    print(f"词库提取成功：{len(vocab)} 条")

    sem = asyncio.Semaphore(CONCURRENCY)
    made, skipped = [0], [0]
    manifest = {"ana": {}}
    tasks = []

    for item in vocab:
        text = item["en"]
        f_n = filename(text, "a_n")
        f_s = filename(text, "a_s")
        # key 统一小写：useAudio 查询侧已做 lowercase 归一（"My mum..." → "my mum..."）
        manifest["ana"][text.strip().lower()] = {"n": f_n, "s": f_s}
        if dry_run:
            print(f"[dry-run] {text[:40]}  →  {f_n} / {f_s}")
            continue
        tasks.append(synth(sem, text, VOICE_ANA, "+0%", os.path.join(AUDIO_DIR, f_n), made, skipped))
        tasks.append(synth(sem, text, VOICE_ANA, SLOW_RATE, os.path.join(AUDIO_DIR, f_s), made, skipped))

    if not dry_run:
        await asyncio.gather(*tasks)

    if dry_run:
        return

    os.makedirs(AUDIO_DIR, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"manifest 已写入（{len(manifest['ana'])} 条）")
    print(f"本次生成 {made[0]} 个，跳过已有 {skipped[0]} 个")


def main():
    ap = argparse.ArgumentParser(description="Word Blast Pro 音频生成")
    ap.add_argument("--clean", action="store_true", help="删除 manifest 未引用的孤儿 mp3")
    ap.add_argument("--dry-run", action="store_true", help="只列出待生成项")
    args = ap.parse_args()

    os.makedirs(AUDIO_DIR, exist_ok=True)
    asyncio.run(run(args.dry_run))

    # 清理必须在 manifest 写入之后 —— 否则读的是旧 manifest，
    # 会把「刚生成但还没写进新 manifest」的文件当成孤儿删掉
    if args.clean and os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            keep = set()
            man = json.load(f)
            for entry in man["ana"].values():
                keep.add(entry["n"]); keep.add(entry["s"])
        removed = 0
        for name in os.listdir(AUDIO_DIR):
            if name.endswith(".mp3") and name not in keep:
                os.remove(os.path.join(AUDIO_DIR, name))
                removed += 1
        print(f"孤儿清理：删除 {removed} 个")


if __name__ == "__main__":
    main()
