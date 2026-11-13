export interface Cue {
  start: number
  end: number
  text: string
}

const TIME = /(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/

function seconds(stamp: string): number {
  const m = TIME.exec(stamp)
  if (!m) return 0
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, '0') / 1000
}

export function parseSrt(raw: string): Cue[] {
  const blocks = raw.replace(/^﻿/, '').replace(/\r/g, '').split(/\n\s*\n/)
  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    const ti = lines.findIndex((l) => l.includes('-->'))
    if (ti < 0) continue
    const [a, b] = lines[ti].split('-->')
    const text = lines
      .slice(ti + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue
    const prev = cues[cues.length - 1]
    // Повтор той же реплики подряд (частая ошибка распознавания в конце записи).
    if (prev && prev.text === text) {
      prev.end = Math.max(prev.end, seconds(b))
      continue
    }
    cues.push({ start: seconds(a), end: seconds(b), text })
  }
  return cues
}

/**
 * Склеивает реплики в абзацы: новая реплика начинает абзац, если предыдущая закончила
 * предложение. Так в разговорных записях каждая реплика собеседника — свой абзац,
 * а фраза, разорванная субтитрами, остаётся целой.
 */
export function cuesToParagraphs(cues: Cue[]): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = []
  for (const cue of cues) {
    const prev = out[out.length - 1]
    if (prev && !/[.!?…»"“]$/.test(prev.text)) prev.text += ' ' + cue.text
    else out.push({ text: cue.text, start: cue.start })
  }
  return out
}
