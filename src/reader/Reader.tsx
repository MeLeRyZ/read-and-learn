import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar } from '../Bar'
import { db } from '../db'
import type { Doc } from '../types'
import { useVocab } from '../vocab/store'
import { Card, type Sel } from './Card'
import { prepare } from './prepare'
import { keyOf } from '../parse/tokenize'
import { chaptersOf } from '../parse/chapters'
import { Toc } from './Toc'
import { List } from '../icons'

const fmtTime = (t: number) => {
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(Math.floor(t % 60)).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const wordEl = (s: number, t: number) => document.querySelector<HTMLElement>(`.w[data-s="${s}"][data-t="${t}"]`)

const go = (id: string, ch: number) => location.replace(`#/read/${encodeURIComponent(id)}/${ch}`)

export function Reader({ id, chapter }: { id: string; chapter?: number }) {
  const [doc, setDoc] = useState<Doc | 'error'>()
  const [toc, setToc] = useState(false)
  const restoreTo = useRef<number>(undefined)
  const [sel, setSel] = useState<Sel | null>(null)
  const [anchor, setAnchor] = useState<DOMRect>()
  const [progress, setProgress] = useState(0)
  const article = useRef<HTMLElement>(null)
  const pointer = useRef('mouse')
  const entries = useVocab()

  useEffect(() => {
    fetch(`texts/${id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDoc, () => setDoc('error'))
  }, [id])

  const loaded = doc && doc !== 'error' ? doc : undefined
  // Предложения нумеруются сквозь весь текст.
  const { prepared, flat, offsets, chapters } = useMemo(() => {
    const ps = loaded?.paragraphs ?? []
    const prepared = ps.map((p) => p.s.map(prepare))
    const offsets: number[] = []
    prepared.reduce((n, p, i) => ((offsets[i] = n), n + p.length), 0)
    return { prepared, flat: prepared.flat(), offsets, chapters: chaptersOf(ps) }
  }, [loaded])

  // Без номера главы в адресе — открыть ту, где остановились.
  useEffect(() => {
    if (!loaded) return
    document.title = loaded.title
    if (chapter !== undefined) return
    db.progress.get(id).then((p) => {
      const ch = p ? Math.max(0, chapters.findIndex((c) => p.paragraph >= c.from && p.paragraph < c.to)) : 0
      restoreTo.current = p?.paragraph
      go(id, ch)
    })
  }, [loaded, id, chapter, chapters])

  // Новая глава: к месту чтения или в начало.
  const ch = chapter !== undefined ? Math.min(chapter, chapters.length - 1) : undefined
  useEffect(() => {
    if (ch === undefined) return
    setSel(null)
    setToc(false)
    const target = restoreTo.current
    restoreTo.current = undefined
    const el = target ? document.querySelector(`[data-p="${target}"]`) : null
    if (el) el.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [ch])

  // Прогресс и запоминание места.
  useEffect(() => {
    if (!loaded) return
    let raf = 0
    let timer = 0
    const save = () => {
      const ps = article.current?.querySelectorAll<HTMLElement>('[data-p]')
      if (!ps?.length) return
      let lo = 0
      let hi = ps.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (ps[mid].getBoundingClientRect().bottom < 70) lo = mid + 1
        else hi = mid
      }
      db.progress.put({ docId: id, paragraph: +ps[lo].dataset.p!, total: offsets.length, updatedAt: Date.now() })
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      })
      clearTimeout(timer)
      timer = window.setTimeout(save, 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [loaded, id, offsets])

  const open = useCallback((next: Sel | null, el?: Element | null) => {
    setSel(next)
    if (next && el) setAnchor(el.getBoundingClientRect())
  }, [])

  // Закрытие по клику мимо и по Esc; ← → — соседнее слово.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element
      if (!t.closest?.('.w, .card')) setSel(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setSel(null)
      if (!sel || sel.range || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      let { s, t } = sel
      for (;;) {
        t += dir
        if (t < 0 || t >= (flat[s]?.tokens.length ?? 0)) {
          s += dir
          if (s < 0 || s >= flat.length) return
          t = dir > 0 ? -1 : flat[s].tokens.length
          continue
        }
        if (flat[s].tokens[t].word) break
      }
      const el = wordEl(s, t)
      if (!el) return // слово в другой главе
      el.scrollIntoView({ block: 'nearest' })
      open({ s, t }, el)
    }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [sel, flat, open])

  // Выделение нескольких слов мышью или пальцем.
  const onSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !article.current) return
    const range = selection.getRangeAt(0)
    const words = [...article.current.querySelectorAll<HTMLElement>('.w')].filter((el) => range.intersectsNode(el))
    if (!words.length) return
    const s = +words[0].dataset.s!
    const inSentence = words.filter((el) => +el.dataset.s! === s)
    const a = +inSentence[0].dataset.t!
    const b = +inSentence[inSentence.length - 1].dataset.t!
    selection.removeAllRanges()
    open(a === b ? { s, t: a } : { s, t: a, range: [a, b] }, inSentence[0])
  }, [open])

  useEffect(() => {
    let timer = 0
    const onChange = () => {
      if (pointer.current !== 'touch') return
      clearTimeout(timer)
      timer = window.setTimeout(onSelection, 450)
    }
    const onDown = (e: PointerEvent) => (pointer.current = e.pointerType)
    document.addEventListener('selectionchange', onChange)
    window.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onSelection])

  // Что подсвечивать.
  const marks = useMemo(() => {
    const active = new Set<number>()
    const chunk = new Set<number>()
    const phrase = new Set<number>()
    const p = sel && flat[sel.s]
    if (sel && p) {
      if (sel.range) {
        // Выделение подсвечивается ровно, целыми кусками — как в карточке.
        for (let i = sel.range[0]; i <= sel.range[1]; i++) {
          const c = p.chunkOf[i]
          if (c >= 0) p.chunks[c].tokens.forEach((t) => chunk.add(t))
          else if (p.tokens[i].word) chunk.add(i)
        }
      } else {
        active.add(sel.t)
        const c = p.chunkOf[sel.t]
        if (c >= 0) p.chunks[c].tokens.forEach((t) => chunk.add(t))
        p.phrases.filter((ph) => ph.tokens.includes(sel.t)).forEach((ph) => ph.tokens.forEach((t) => phrase.add(t)))
      }
    }
    const saved = new Set(entries.filter((e) => e.docId === id).flatMap((e) => e.at.tokens.map((t) => `${e.at.s}:${t}`)))
    const known = new Set(entries.flatMap((e) => e.forms))
    return { active, chunk, phrase, saved, known }
  }, [sel, flat, entries, id])

  if (doc === 'error')
    return (
      <>
        <Bar back="#/" />
        <div className="page empty">Текст не найден.</div>
      </>
    )
  if (!loaded || ch === undefined) return <Bar back="#/" />

  const renderSentences = (pi: number) =>
    prepared[pi].map((p, si) => {
      const s = offsets[pi] + si
      const here = sel?.s === s
      return (
        <Fragment key={si}>
          {si > 0 && ' '}
          {p.tokens.map((tok, ti) => {
            if (!tok.word) {
              // Пробел внутри подсвеченного куска тоже подсвечиваем, чтобы фраза читалась целиком.
              const lit = (i: number) => marks.chunk.has(i) || marks.active.has(i)
              return here && lit(ti - 1) && lit(ti + 1) ? (
                <span key={ti} className="chunk">{tok.text}</span>
              ) : (
                tok.text
              )
            }
            let cls = 'w'
            if (here && marks.active.has(ti)) cls += ' active'
            else if (here && marks.phrase.has(ti)) cls += ' phrase'
            else if (here && marks.chunk.has(ti)) cls += ' chunk'
            if (marks.saved.has(`${s}:${ti}`)) cls += ' saved'
            else if (marks.known.has(keyOf(tok.text))) cls += ' known'
            return (
              <span key={ti} className={cls} data-s={s} data-t={ti}>
                {tok.text}
              </span>
            )
          })}
        </Fragment>
      )
    })

  const c = chapters[ch]
  const book = chapters.length > 1
  const title = (pi: number) => loaded.paragraphs[pi].s[0]
  const pending = loaded.paragraphs.slice(c.from, c.to).some((p) => p.s.some((s) => !s.ru))
  const nav = (i: number, label: string) =>
    chapters[i] && (
      <a className="chapter-nav" href={`#/read/${encodeURIComponent(id)}/${i}`} lang="de">
        <span lang="ru">{label}</span>
        {chapters[i].head >= 0 ? title(chapters[i].head).de : loaded.title}
      </a>
    )

  return (
    <>
      <Bar
        back="#/"
        title={book && c.head >= 0 ? title(c.head).de : loaded.title}
        progress={progress}
        extra={
          book && (
            <button
              className="icon-btn"
              aria-label="Оглавление"
              title="Оглавление"
              aria-pressed={toc}
              onClick={(e) => {
                e.stopPropagation()
                setToc(!toc)
              }}
            >
              <List />
            </button>
          )
        }
      />
      {toc && <Toc doc={loaded} chapters={chapters} current={ch} onClose={() => setToc(false)} />}
      <article
        className="reader"
        lang="de"
        ref={article}
        onMouseUp={() => pointer.current !== 'touch' && setTimeout(onSelection)}
        onClick={(e) => {
          if (!window.getSelection()?.isCollapsed) return
          const el = (e.target as Element).closest<HTMLElement>('.w')
          if (!el) return
          const s = +el.dataset.s!
          const t = +el.dataset.t!
          open(sel && !sel.range && sel.s === s && sel.t === t ? null : { s, t }, el)
        }}
      >
        {book ? (
          <p className="kicker" lang="de">
            {loaded.title}
            <span lang="ru"> · глава {ch + 1} из {chapters.length}</span>
          </p>
        ) : (
          <>
            <h1>{loaded.title}</h1>
            <p className="subtitle" lang="ru">
              {loaded.subtitle ? loaded.subtitle + ' · ' : ''}
              {loaded.words.toLocaleString('ru')} слов · ~{Math.round(loaded.words / 130)} мин
            </p>
          </>
        )}
        {pending && (
          <p className="notice" lang="ru">
            Перевод этой главы ещё готовится: у части слов пока нет справки.
          </p>
        )}
        {loaded.paragraphs.slice(c.from, c.to).map((para, i) => {
          const pi = c.from + i
          if (para.h === 1) return <h2 key={pi} className="part" data-p={pi}>{renderSentences(pi)}</h2>
          if (para.h === 2) return <h1 key={pi} data-p={pi}>{renderSentences(pi)}</h1>
          return (
            <p key={pi} data-p={pi}>
              {para.t !== undefined && <span className="time">{fmtTime(para.t)}</span>}
              {renderSentences(pi)}
            </p>
          )
        })}
        {book ? (
          <nav className="chapters-nav" lang="ru">
            {nav(ch - 1, '← Предыдущая глава')}
            {nav(ch + 1, 'Следующая глава →')}
          </nav>
        ) : (
          <div className="end">Ende</div>
        )}
      </article>
      {sel && anchor && flat[sel.s] && (
        <Card key={`${sel.s}:${sel.t}:${sel.range}`} doc={loaded} p={flat[sel.s]} sel={sel} anchor={anchor} onClose={() => setSel(null)} />
      )}
    </>
  )
}
