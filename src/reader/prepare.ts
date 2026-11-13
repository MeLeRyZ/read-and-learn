import { keyOf, matchPhrase, tokenize, type Token } from '../parse/tokenize'
import type { Doc, Gloss, Phrase, Sentence } from '../types'

export interface Prepared {
  sentence: Sentence
  tokens: Token[]
  /** Для каждого токена — индекс куска (или -1). */
  chunkOf: number[]
  chunks: { tokens: number[]; ru: string }[]
  phrases: { tokens: number[]; ph: Phrase }[]
}

export function prepare(s: Sentence): Prepared {
  const tokens = tokenize(s.de)
  const chunkOf = tokens.map(() => -1)
  const chunks: Prepared['chunks'] = []
  let ci = 0
  let left = s.c?.[0]?.n ?? 0
  tokens.forEach((t, i) => {
    if (!t.word || !s.c) return
    while (left === 0 && ci < s.c.length - 1) left = s.c[++ci].n
    if (left === 0) return
    ;(chunks[ci] ??= { tokens: [], ru: s.c[ci].ru }).tokens.push(i)
    chunkOf[i] = ci
    left--
  })
  const phrases = (s.ph ?? [])
    .map((ph) => ({ ph, tokens: matchPhrase(tokens, ph.w) ?? [] }))
    .filter((p) => p.tokens.length)
  return { sentence: s, tokens, chunkOf, chunks, phrases }
}

export const glossOf = (doc: Doc, p: Prepared, t: number): Gloss | undefined => {
  const k = keyOf(p.tokens[t].text)
  return p.sentence.w?.[k] ?? doc.glossary[k]
}

/** Текст предложения от токена a до токена b включительно. */
export const span = (p: Prepared, a: number, b: number) =>
  p.tokens.slice(a, b + 1).map((t) => t.text).join('')

/** Слова фразы; если между ними есть другие слова — « … ». */
export function phraseText(p: Prepared, idx: number[]): string {
  let out = p.tokens[idx[0]].text
  for (let k = 1; k < idx.length; k++) {
    const gap = p.tokens.slice(idx[k - 1] + 1, idx[k])
    out += gap.some((t) => t.word) ? ' … ' : gap.map((t) => t.text).join('')
    out += p.tokens[idx[k]].text
  }
  return out
}

/** Род по артиклю в начальной форме. */
export const genderOf = (lemma?: string) =>
  ({ der: 'm', die: 'f', das: 'n' })[lemma?.split(' ')[0] ?? ''] as 'm' | 'f' | 'n' | undefined

const FUNCTION = /артикль|предлог|местоим|союз|частица/
export const isFunctionWord = (g?: Gloss) => !!g?.p && FUNCTION.test(g.p)
