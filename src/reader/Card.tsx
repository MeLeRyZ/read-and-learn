import { useLayoutEffect, useRef, useState } from 'react'
import { keyOf } from '../parse/tokenize'
import type { Doc, Gloss, VocabEntry } from '../types'
import { vocab, useVocab } from '../vocab/store'
import { Bookmark, BookmarkFilled } from '../icons'
import { genderOf, glossOf, isFunctionWord, phraseText, span, type Prepared } from './prepare'

export interface Sel {
  s: number
  t: number
  /** Выделение нескольких слов: индексы первого и последнего токена. */
  range?: [number, number]
}

type Draft = Omit<VocabEntry, 'id' | 'createdAt' | 'docId' | 'docTitle' | 'context'>

function SaveButton({ doc, p, sel, draft }: { doc: Doc; p: Prepared; sel: Sel; draft: Draft }) {
  const entries = useVocab()
  const saved = entries.find((e) => e.docId === doc.id && e.at.s === sel.s && e.front === draft.front)
  return (
    <button
      className="save"
      aria-pressed={!!saved}
      aria-label={saved ? 'Убрать из словарика' : 'Сохранить в словарик'}
      title={saved ? 'Убрать из словарика' : 'Сохранить в словарик'}
      onClick={() =>
        saved ? vocab.remove(saved.id) : vocab.add({ ...draft, docId: doc.id, docTitle: doc.title, context: p.sentence.de })
      }
    >
      {saved ? <BookmarkFilled /> : <Bookmark />}
    </button>
  )
}

function Lemma({ g }: { g: Gloss }) {
  const gender = genderOf(g.l)
  const [art, ...rest] = g.l?.split(' ') ?? []
  return (
    <div className="card-lemma">
      {g.l && (gender ? <><span className={'g-' + gender}>{art}</span> {rest.join(' ')}</> : g.l)}
      {g.l && g.p && ' · '}
      {g.p && <span className="card-pos">{g.p}</span>}
    </div>
  )
}

interface Props {
  doc: Doc
  p: Prepared
  sel: Sel
  anchor: DOMRect
  onClose: () => void
}

export function Card({ doc, p, sel, anchor, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>()
  const [showSentence, setShowSentence] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const h = el.offsetHeight
    const w = el.offsetWidth
    // На телефоне карточка выезжает снизу: прокручиваем, чтобы слово осталось видно над ней.
    if (window.matchMedia('(max-width: 640px)').matches) {
      const overlap = anchor.bottom - (window.innerHeight - h - 16)
      if (overlap > 0) window.scrollBy({ top: overlap, behavior: 'smooth' })
      return setPos({ top: 0, left: 0 }) // положение задаёт CSS
    }
    const below = anchor.bottom + 10 + h < window.innerHeight || anchor.top < h + 70
    setPos({
      top: window.scrollY + (below ? anchor.bottom + 10 : anchor.top - h - 10),
      left: Math.min(Math.max(12, anchor.left - 20), document.documentElement.clientWidth - w - 12),
    })
  }, [anchor, sel, showSentence])

  const sentence = p.sentence.ru && (
    <div className="card-sec">
      <div>
        {showSentence ? (
          <>
            <span className="card-label">Предложение</span>
            <div className="card-sentence">{p.sentence.ru}</div>
          </>
        ) : (
          <button className="link-btn" onClick={() => setShowSentence(true)}>
            Показать перевод предложения
          </button>
        )}
      </div>
    </div>
  )

  let body: React.ReactNode
  if (sel.range) {
    // Несколько слов: собираем куски, которые задевает выделение.
    const [a, b] = sel.range
    const cis = [...new Set(p.chunkOf.slice(a, b + 1).filter((c) => c >= 0))]
    const toks = cis.length ? cis.flatMap((c) => p.chunks[c].tokens) : p.tokens.map((_, i) => i).filter((i) => i >= a && i <= b && p.tokens[i].word)
    const from = Math.min(...toks)
    const to = Math.max(...toks)
    const front = span(p, from, to)
    const back = cis.length
      ? cis.map((c) => p.chunks[c].ru).join(' ')
      : toks.map((t) => glossOf(doc, p, t)?.ru).filter(Boolean).join('; ')
    body = (
      <div className="card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-word" style={{ fontSize: 19 }}>{front}</div>
          <div className="card-ru">{back}</div>
        </div>
        <SaveButton doc={doc} p={p} sel={sel} draft={{ front, back, forms: [], at: { s: sel.s, tokens: toks } }} />
      </div>
    )
  } else {
    const word = p.tokens[sel.t].text
    const g = glossOf(doc, p, sel.t)
    const ci = p.chunkOf[sel.t]
    const chunk = ci >= 0 ? p.chunks[ci] : undefined
    const forms = g && !isFunctionWord(g) ? [keyOf(word)] : []
    const orig = p.sentence.orig?.[keyOf(word)]
    const phrases = p.phrases.filter((ph) => ph.tokens.includes(sel.t))
    const lemmaNote = g?.l && keyOf(g.l) !== keyOf(word) ? ` (${g.l})` : ''

    // Кусок из одного слова — сохраняем само слово кнопкой в шапке.
    const single = !chunk || chunk.tokens.length === 1
    const wordDraft: Draft = { front: word, back: (chunk?.ru ?? g?.ru ?? '') + lemmaNote, forms, at: { s: sel.s, tokens: [sel.t] } }
    const chunkDe = chunk && span(p, chunk.tokens[0], chunk.tokens[chunk.tokens.length - 1])

    body = (
      <>
        <div className="card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-word">{word}</div>
            {g && (g.l || g.p) && <Lemma g={g} />}
          </div>
          {single && (g || chunk) && <SaveButton doc={doc} p={p} sel={sel} draft={wordDraft} />}
        </div>
        <div className="card-ru">{g?.ru ?? (single ? chunk?.ru : undefined) ?? <span className="card-pos">нет перевода</span>}</div>
        {g?.n && <div className="card-note">{g.n}</div>}
        {orig && <div className="card-note">В исходном тексте было «{orig}»</div>}

        {chunk && !single && (
          <div className="card-sec">
            <div>
              <span className="card-label">Фраза</span>
              <div className="card-de">{chunkDe}</div>
              <div>{chunk.ru}</div>
            </div>
            <SaveButton
              doc={doc}
              p={p}
              sel={sel}
              draft={{ front: chunkDe!, back: chunk.ru + (g ? ` (${g.l ?? word} — ${g.ru})` : ''), forms, at: { s: sel.s, tokens: chunk.tokens } }}
            />
          </div>
        )}

        {phrases.map(({ ph, tokens }) => {
          const front = phraseText(p, tokens)
          return (
            <div className="card-sec" key={front}>
              <div>
                <span className="card-label">Выражение</span>
                <div className="card-de">{front}</div>
                <div>{ph.ru}</div>
                {ph.l && <div className="card-lemma">{ph.l}</div>}
                {ph.n && <div className="card-note">{ph.n}</div>}
              </div>
              <SaveButton
                doc={doc}
                p={p}
                sel={sel}
                draft={{ front, back: ph.ru + (ph.l ? ` (${ph.l})` : ''), forms: [], at: { s: sel.s, tokens } }}
              />
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div
      ref={ref}
      className="card"
      role="dialog"
      aria-label="Перевод"
      style={pos ?? { top: window.scrollY + anchor.bottom + 10, left: 12, visibility: 'hidden' }}
      onClick={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="card-handle" onClick={onClose} />
      {body}
      {sentence}
    </div>
  )
}
