export interface Token {
  text: string
  word: boolean
}

// Слово: буквы/цифры, внутри допускаются дефис и апостроф (WLAN-Router, geht’s).
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu

export function tokenize(sentence: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of sentence.matchAll(WORD)) {
    const i = m.index!
    if (i > last) out.push({ text: sentence.slice(last, i), word: false })
    out.push({ text: m[0], word: true })
    last = i + m[0].length
  }
  if (last < sentence.length) out.push({ text: sentence.slice(last), word: false })
  return out
}

export function countWords(text: string): number {
  return [...text.matchAll(WORD)].length
}

/** Нормализованный ключ словоформы. */
export const keyOf = (word: string) => word.toLowerCase().replace(/’/g, "'")

/**
 * Находит в предложении токены фразы: слова ищутся по порядку, между ними могут быть другие
 * (отделяемые глаголы: «fängt … an»). Возвращает индексы токенов или null.
 */
export function matchPhrase(tokens: Token[], words: string[]): number[] | null {
  const found: number[] = []
  let wi = 0
  for (let i = 0; i < tokens.length && wi < words.length; i++) {
    if (tokens[i].word && keyOf(tokens[i].text) === keyOf(words[wi])) {
      found.push(i)
      wi++
    }
  }
  return wi === words.length ? found : null
}

const segmenter = new Intl.Segmenter('de', { granularity: 'sentence' })
// Сокращения, после которых Segmenter ошибочно режет предложение.
const ABBR = /(?:\b(?:z|d|u|o|s|v|bzw|ca|usw|etc|Dr|Prof|Nr|Hr|Fr|St|vgl|evtl|ggf|inkl|bspw|Mio|Mrd)\.|\b\d+\.)\s*$/

export function splitSentences(text: string): string[] {
  const parts = [...segmenter.segment(text)].map((s) => s.segment)
  const out: string[] = []
  for (const part of parts) {
    if (out.length && ABBR.test(out[out.length - 1])) out[out.length - 1] += part
    else out.push(part)
  }
  return out.map((s) => s.trim()).filter(Boolean)
}
