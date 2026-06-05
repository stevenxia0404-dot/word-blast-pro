import { useState, useCallback } from 'react'
import type { VocabItem, SubsectionType } from '../config/gameConfig'

export interface SlotState {
  index: number
  char: string | null
  shaking: boolean
}

export interface SpellState {
  prompt: string
  slots: SlotState[]
  candidates: string[]
  answerTokens: string[]
  filledCount: number
  isComplete: boolean
  isCorrect: boolean | null
  displaySentence: string
  blankWord: string
  enWord: string
}

const LETTER_POOL = 'abcdefghijklmnopqrstuvwxyz'

function randomLetters(count: number, exclude: string[]): string[] {
  const available = LETTER_POOL.split('').filter(c => !exclude.includes(c))
  const result: string[] = []
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    result.push(available.splice(idx, 1)[0])
  }
  return result
}

function randomDistractorWords(count: number, exclude: string[], allWords: string[]): string[] {
  const available = allWords.filter(w => !exclude.includes(w.toLowerCase()))
  const result: string[] = []
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    result.push(available.splice(idx, 1)[0])
  }
  return result
}

export function useSpellEngine() {
  const [state, setState] = useState<SpellState | null>(null)

  const initSpell = useCallback((
    item: VocabItem,
    mode: SubsectionType,
    allVocab: VocabItem[],
    helpLevel: number,
  ) => {
    const en = item.en.toLowerCase()
    let answerTokens: string[]
    let candidates: string[]
    let displaySentence = ''
    let blankWord = ''

    if (mode === 'spell') {
      answerTokens = en.replace(/\s/g, '').split('')
      const distractors = randomLetters(Math.max(3, Math.min(6, answerTokens.length)), answerTokens)
      candidates = [...answerTokens, ...distractors].sort(() => Math.random() - 0.5)
    } else if (mode === 'wordSelect' || mode === 'wordOrder') {
      answerTokens = en.split(' ')
      const allWords = allVocab.flatMap(v => v.en.toLowerCase().split(' '))
      if (mode === 'wordSelect') {
        const distractors = randomDistractorWords(answerTokens.length + 2, answerTokens, allWords)
        candidates = [...answerTokens, ...distractors].sort(() => Math.random() - 0.5)
      } else {
        candidates = [...answerTokens].sort(() => Math.random() - 0.5)
      }
    } else if (mode === 'cloze') {
      const words = en.split(' ')
      const blankIdx = words.length > 1 ? Math.floor(Math.random() * words.length) : 0
      blankWord = words[blankIdx]
      answerTokens = [blankWord]
      const pre = words.slice(0, blankIdx).join(' ')
      const post = words.slice(blankIdx + 1).join(' ')
      displaySentence = `${pre} ___ ${post}`.trim()
      if (words.length === 1) displaySentence = '___'
      const allWords = allVocab.flatMap(v => v.en.toLowerCase().split(' '))
      const distractors = randomDistractorWords(3, [blankWord.toLowerCase()], allWords)
      candidates = [blankWord, ...distractors].sort(() => Math.random() - 0.5)
    } else {
      answerTokens = []
      candidates = []
    }

    const slots: SlotState[] = answerTokens.map((token, i) => {
      let revealed = false
      if (helpLevel >= 3) revealed = true
      else if (helpLevel >= 2 && i < Math.ceil(answerTokens.length / 2)) revealed = true
      else if (helpLevel >= 1 && i === 0) revealed = true
      return { index: i, char: revealed ? token : null, shaking: false }
    })

    setState({
      prompt: item.zh,
      slots,
      candidates,
      answerTokens,
      filledCount: slots.filter(s => s.char !== null).length,
      isComplete: false,
      isCorrect: null,
      displaySentence,
      blankWord,
      enWord: en,
    })
  }, [])

  const tapCandidate = useCallback((candidate: string) => {
    setState(prev => {
      if (!prev || prev.isComplete) return prev
      const newSlots = prev.slots.map(s => ({ ...s }))
      const emptyIdx = newSlots.findIndex(s => s.char === null)
      if (emptyIdx === -1) return prev

      newSlots[emptyIdx] = { ...newSlots[emptyIdx], char: candidate }
      const newFilled = prev.filledCount + 1
      const allFilled = newFilled >= newSlots.length

      let correct: boolean | null = null
      if (allFilled) {
        const userAnswer = newSlots.map(s => (s.char ?? '').toLowerCase()).join(' ')
        const expected = prev.answerTokens.join(' ').toLowerCase()
        correct = userAnswer === expected
        if (!correct) {
          setTimeout(() => {
            setState(s => {
              if (!s) return s
              return {
                ...s,
                slots: s.slots.map(slot => ({ ...slot, char: null, shaking: false })),
                filledCount: 0,
                isComplete: false,
                isCorrect: null,
              }
            })
          }, 500)
        }
      }

      return {
        ...prev,
        slots: newSlots,
        filledCount: newFilled,
        isComplete: allFilled,
        isCorrect: correct,
      }
    })
  }, [])

  const clearSlots = useCallback(() => {
    setState(prev => {
      if (!prev) return prev
      const cleared = prev.slots.map(s => ({ ...s, char: null, shaking: false }))
      return { ...prev, slots: cleared, filledCount: cleared.filter(s => s.char !== null).length, isComplete: false, isCorrect: null }
    })
  }, [])

  const revealHelp = useCallback((helpLevel: number) => {
    setState(prev => {
      if (!prev) return prev
      const newSlots = prev.slots.map(s => ({ ...s }))
      if (helpLevel >= 3) {
        newSlots.forEach((s, i) => { s.char = prev.answerTokens[i] })
      } else if (helpLevel >= 2) {
        const half = Math.ceil(prev.answerTokens.length / 2)
        newSlots.forEach((s, i) => { if (i < half) s.char = prev.answerTokens[i] })
      } else if (helpLevel >= 1) {
        if (newSlots.length > 0) newSlots[0].char = prev.answerTokens[0]
      }
      const filled = newSlots.filter(s => s.char !== null).length
      const allDone = filled >= newSlots.length
      return {
        ...prev,
        slots: newSlots,
        filledCount: filled,
        isComplete: allDone,
        isCorrect: allDone ? true : null,
      }
    })
  }, [])

  return { state, initSpell, tapCandidate, clearSlots, revealHelp }
}
