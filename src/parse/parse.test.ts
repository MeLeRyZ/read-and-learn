import { describe, expect, it } from 'vitest'
import { cuesToParagraphs, parseSrt } from './srt'
import { matchPhrase, splitSentences, tokenize } from './tokenize'

const SRT = `1
00:00:00,000 --> 00:00:03,680
Also stell dir mal vor, du bist auf einem riesigen Konzert.

2
00:00:04,180 --> 00:00:06,620
Jedes Smartphone in jeder Hosentasche,

3
00:00:06,700 --> 00:00:08,000
jeder WLAN-Router.

4
00:00:08,000 --> 00:00:09,000
Bis zum nächsten Mal.

5
00:00:09,000 --> 00:00:12,000
Bis zum nächsten Mal.
`

describe('srt', () => {
  it('разбирает реплики и время', () => {
    const cues = parseSrt(SRT)
    expect(cues).toHaveLength(4)
    expect(cues[0].end).toBeCloseTo(3.68)
    expect(cues[3].end).toBe(12)
  })
  it('склеивает незаконченные фразы в абзац', () => {
    const ps = cuesToParagraphs(parseSrt(SRT))
    expect(ps.map((p) => p.text)).toEqual([
      'Also stell dir mal vor, du bist auf einem riesigen Konzert.',
      'Jedes Smartphone in jeder Hosentasche, jeder WLAN-Router.',
      'Bis zum nächsten Mal.',
    ])
    expect(ps[1].start).toBeCloseTo(4.18)
  })
  it('понимает CRLF и BOM', () => {
    expect(parseSrt('﻿' + SRT.replace(/\n/g, '\r\n'))).toHaveLength(4)
  })
})

describe('tokenize', () => {
  it('держит дефисы и апострофы внутри слова', () => {
    const words = tokenize('Wie geht’s dem WLAN-Router? 3 Mio.').filter((t) => t.word).map((t) => t.text)
    expect(words).toEqual(['Wie', 'geht’s', 'dem', 'WLAN-Router', '3', 'Mio'])
  })
  it('собирает токены обратно в исходную строку', () => {
    const s = '„Na ja“, sagte er – und ging.'
    expect(tokenize(s).map((t) => t.text).join('')).toBe(s)
  })
  it('находит отделяемый глагол', () => {
    const t = tokenize('Der Film fängt um acht Uhr an.')
    const idx = matchPhrase(t, ['fängt', 'an'])!
    expect(idx.map((i) => t[i].text)).toEqual(['fängt', 'an'])
    expect(matchPhrase(t, ['an', 'fängt'])).toBeNull()
  })
  it('не режет предложение на сокращениях', () => {
    expect(splitSentences('Das ist z. B. ein Test. Und Dr. Müller kommt am 3. Mai.')).toEqual([
      'Das ist z. B. ein Test.',
      'Und Dr. Müller kommt am 3. Mai.',
    ])
  })
})


import { chaptersOf } from './chapters'

describe('chaptersOf', () => {
  it('глава начинается с заголовка, часть книги прилипает к своей главе', () => {
    const ps = [{ h: 2 as const }, {}, { h: 1 as const }, { h: 2 as const }, {}, { h: 2 as const }, {}]
    expect(chaptersOf(ps).map((c) => [c.from, c.to, c.head, c.part])).toEqual([
      [0, 2, 0, -1],
      [2, 5, 3, 2],
      [5, 7, 5, 2],
    ])
  })
  it('без заголовков — одна глава', () => {
    expect(chaptersOf([{}, {}])).toEqual([{ from: 0, to: 2, head: -1, part: -1 }])
  })
})
