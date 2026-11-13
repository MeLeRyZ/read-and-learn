/**
 * Подготовка текстов для приложения.
 *
 *   node scripts/text.ts init <файл.srt|.txt> <id> ["Заголовок"]
 *     В .txt строки «# …» — части книги, «## …» — главы (оглавление и постраничное чтение).
 *     → texts-src/<id>/source.json  (абзацы и пронумерованные предложения)
 *     → texts-src/<id>/source.txt   (то же для чтения: [N] предложение)
 *
 *   node scripts/text.ts build <id>
 *     source.json + annot.txt → public/texts/<id>.json, обновляет public/texts/index.json,
 *     сообщает о словах без перевода и о фразах, которые не нашлись в предложении.
 *
 * Формат annot*.txt (и glossary.txt):
 *   # title: …            # subtitle: …
 *   [N] = перевод предложения N
 *   - кусок предложения = перевод   (куски подряд покрывают все слова предложения)
 *   + w1 w2 … = перевод фразы ~ начальная форма ~ пояснение   (слова фразы по порядку)
 *   * форма = перевод | начальная форма | часть речи | пояснение  (только для этого предложения)
 *   ! исправлено < как было в записи
 *   @glossary
 *   форма = перевод | начальная форма | часть речи | пояснение
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { cuesToParagraphs, parseSrt } from '../src/parse/srt.ts'
import { chaptersOf } from '../src/parse/chapters.ts'
import { countWords, keyOf, matchPhrase, splitSentences, tokenize } from '../src/parse/tokenize.ts'
import type { Doc, DocMeta, Gloss, Paragraph, Phrase, Sentence } from '../src/types.ts'

interface Source {
  title: string
  paragraphs: { t?: number; h?: 1 | 2; s: string[] }[]
}

const [cmd, a1, a2, a3] = process.argv.slice(2)
const dir = (id: string) => `texts-src/${id}`

function init(file: string, id: string, title?: string) {
  const raw = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r/g, '')
  const paras = /\.srt$/i.test(file)
    ? cuesToParagraphs(parseSrt(raw)).map((p) => ({ t: Math.round(p.start), text: p.text }))
    : (/\n\s*\n/.test(raw) ? raw.split(/\n\s*\n/) : raw.split('\n')).map((text) => ({ t: undefined, text }))
  const paragraphs = paras
    .map(({ t, text }) => {
      const h = /^(#{1,2})\s+/.exec(text)?.[1].length as 1 | 2 | undefined
      const clean = text.replace(/^#{1,2}\s+/, '').replace(/\s+/g, ' ').trim()
      // Заголовок — одно «предложение», его не режем.
      return h ? { h, s: [clean] } : { t, s: mergeFragments(splitSentences(clean)) }
    })
    .filter((p) => p.s.length && p.s[0])
  const src: Source = {
    title: title ?? basename(file).replace(/\.\w+$/, '').replace(/\s*\(transcribed[^)]*\)/, '').replace(/_+/g, ' '),
    paragraphs,
  }
  mkdirSync(dir(id), { recursive: true })
  writeFileSync(`${dir(id)}/source.json`, JSON.stringify(src, null, 1))
  let n = 0
  const lines = paragraphs.flatMap((p) => ['', ...p.s.map((s) => `[${++n}] ${p.h ? '#'.repeat(p.h) + ' ' : ''}${s}`)])
  writeFileSync(`${dir(id)}/source.txt`, lines.join('\n').trim() + '\n')
  console.log(`${id}: ${paragraphs.length} абзацев, ${n} предложений`)
}

// Обрывки вроде «%.», «82.», «M.» — не предложения: приклеиваем к соседнему.
function mergeFragments(ss: string[]): string[] {
  const out: string[] = []
  for (const s of ss) {
    const tiny = s.length <= 4 && !/\p{L}{2}/u.test(s)
    if (tiny && out.length) out[out.length - 1] += ' ' + s
    else if (out.length && /^.{0,4}$/.test(out[out.length - 1]) && !/\p{L}{2}/u.test(out[out.length - 1])) out[out.length - 1] += ' ' + s
    else out.push(s)
  }
  return out
}

function gloss(rest: string): [string, Gloss] {
  const [form, body] = rest.split(/\s=\s/, 2)
  if (body === undefined) throw new Error('Нет « = » в строке: ' + rest)
  const [ru, l, p, n] = body.split('|').map((x) => x.trim())
  const g: Gloss = { ru }
  if (l) g.l = l
  if (p) g.p = p
  if (n) g.n = n
  return [keyOf(form.trim()), g]
}

function build(id: string) {
  const src: Source = JSON.parse(readFileSync(`${dir(id)}/source.json`, 'utf8'))
  // Разметку можно разбить на несколько файлов: annot-1.txt, annot-2.txt, glossary.txt …
  const files = readdirSync(dir(id)).filter((f) => /^(annot|glossary).*\.txt$/.test(f)).sort()
  const lines = files.flatMap((f) => readFileSync(`${dir(id)}/${f}`, 'utf8').split('\n').map((l, i) => [`${f}:${i + 1}`, l] as const))
  const sentences: Sentence[] = src.paragraphs.flatMap((p) => p.s.map((de) => ({ de })))
  const glossary: Record<string, Gloss> = {}
  const meta: Record<string, string> = {}
  const problems: string[] = []
  const chunks: { de: string; ru: string }[][] = []
  let cur: Sentence | undefined
  let inGlossary = false

  for (const [where, line] of lines) {
    const l = line.trim()
    if (!l) continue
    try {
      let m: RegExpExecArray | null
      if ((m = /^#\s*(\w+):\s*(.*)$/.exec(l))) meta[m[1]] = m[2]
      else if (l === '@glossary') inGlossary = true
      else if (inGlossary) {
        const [k, g] = gloss(l)
        glossary[k] = g
      } else if ((m = /^\[(\d+)\]\s*=\s*(.*)$/.exec(l))) {
        cur = sentences[+m[1] - 1]
        if (!cur) throw new Error('Нет предложения ' + m[1])
        cur.ru = m[2]
      } else if (!cur) throw new Error('Строка до первого [N]')
      else if (l.startsWith('- ')) {
        const [de, ru] = l.slice(2).split(/\s=\s/, 2).map((x) => x.trim())
        if (!ru) throw new Error('Нет перевода куска')
        ;(chunks[sentences.indexOf(cur)] ??= []).push({ de, ru })
      } else if (l.startsWith('+ ')) {
        const [words, ru, lemma, note] = l.slice(2).split(/\s[=~]\s/).map((x) => x.trim())
        const ph: Phrase = { w: words.split(/\s+/), ru }
        if (lemma) ph.l = lemma
        if (note) ph.n = note
        ;(cur.ph ??= []).push(ph)
      } else if (l.startsWith('* ')) {
        const [k, g] = gloss(l.slice(2))
        ;(cur.w ??= {})[k] = g
      } else if (l.startsWith('! ')) {
        const [fixed, was] = l.slice(2).split(' < ').map((x) => x.trim())
        if (!cur.de.includes(was)) throw new Error(`«${was}» нет в предложении`)
        cur.de = cur.de.replace(was, fixed)
        ;(cur.orig ??= {})[keyOf(fixed)] = was
      } else throw new Error('Непонятная строка')
    } catch (e) {
      problems.push(`${where}: ${(e as Error).message}`)
    }
  }

  const missing = new Map<string, number>()
  sentences.forEach((s, i) => {
    const tokens = tokenize(s.de)
    // Непереведённые предложения (главы в работе) не проверяем.
    if (!s.ru) return
    // Куски должны идти подряд и покрывать все слова предложения.
    const words = tokens.filter((t) => t.word).map((t) => keyOf(t.text))
    let pos = 0
    s.c = (chunks[i] ?? []).map((c) => {
      const cw = tokenize(c.de).filter((t) => t.word).map((t) => keyOf(t.text))
      if (cw.join(' ') !== words.slice(pos, pos + cw.length).join(' '))
        problems.push(`[${i + 1}] кусок не совпадает с текстом: «${c.de}» (ожидалось «${words.slice(pos, pos + cw.length).join(' ')}»)`)
      pos += cw.length
      return { n: cw.length, ru: c.ru }
    })
    if (pos !== words.length) problems.push(`[${i + 1}] куски покрывают ${pos} из ${words.length} слов`)
    if (!s.c.length) delete s.c
    for (const ph of s.ph ?? [])
      if (!matchPhrase(tokens, ph.w)) problems.push(`[${i + 1}] фраза не найдена: ${ph.w.join(' ')}`)
    for (const t of tokens) {
      const k = keyOf(t.text)
      if (t.word && !/^\d+$/.test(k) && !s.w?.[k] && !glossary[k]) missing.set(k, (missing.get(k) ?? 0) + 1)
    }
  })

  let n = 0
  const paragraphs: Paragraph[] = src.paragraphs.map((p) => ({
    ...(p.t !== undefined && { t: p.t }),
    ...(p.h && { h: p.h }),
    s: p.s.map(() => sentences[n++]),
  }))
  const words = sentences.reduce((sum, s) => sum + countWords(s.de), 0)
  // Готовность по главам.
  const chapters = chaptersOf(paragraphs).map((c) => {
    const ss = paragraphs.slice(c.from, c.to).flatMap((p) => p.s)
    const done = ss.filter((s) => s.ru).length
    return { title: c.head >= 0 ? paragraphs[c.head].s[0].de : (meta.title ?? src.title), done, total: ss.length }
  })
  const ready = chapters.filter((c) => c.done === c.total).length
  const doc: Doc = { id, title: meta.title ?? src.title, subtitle: meta.subtitle, words, paragraphs, glossary }
  writeFileSync(`public/texts/${id}.json`, JSON.stringify(doc))

  const indexPath = 'public/texts/index.json'
  const index: DocMeta[] = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : []
  const entry: DocMeta = { id, title: doc.title, subtitle: doc.subtitle, words, ...(chapters.length > 1 && { chapters: chapters.length, ready }) }
  const at = index.findIndex((d) => d.id === id)
  if (at >= 0) index[at] = entry
  else index.push(entry)
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')

  console.log(`${id}: ${sentences.length} предложений, ${words} слов, глоссарий ${Object.keys(glossary).length}`)
  if (chapters.length > 1)
    for (const c of chapters) console.log(`  ${c.done === c.total ? '✓' : ' '} ${c.title}: ${c.done}/${c.total}`)
  writeFileSync(`${dir(id)}/missing.txt`, [...missing.keys()].join('\n') + '\n')
  if (missing.size) problems.push(`Без перевода: ${missing.size} (список в ${dir(id)}/missing.txt)`)
  if (problems.length) {
    console.log(problems.slice(0, 60).join('\n'))
    process.exitCode = 1
  }
}

if (cmd === 'init' && a1 && a2) init(a1, a2, a3)
else if (cmd === 'build' && a1) build(a1)
else console.log('node scripts/text.ts init <файл> <id> ["Заголовок"]  |  build <id>')
