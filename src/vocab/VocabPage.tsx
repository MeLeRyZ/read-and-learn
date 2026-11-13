import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar } from '../Bar'
import { Download, Trash, Upload } from '../icons'
import type { VocabEntry } from '../types'
import { download, toCsv, useVocab, vocab } from './store'

function Context({ e }: { e: VocabEntry }) {
  if (!e.context) return null
  const i = e.context.indexOf(e.front)
  if (i < 0) return <div className="entry-ctx" lang="de">{e.context}</div>
  return (
    <div className="entry-ctx" lang="de">
      {e.context.slice(0, i)}
      <mark>{e.front}</mark>
      {e.context.slice(i + e.front.length)}
    </div>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

export function VocabPage() {
  const entries = useVocab()
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Словарик'
  }, [])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? entries.filter((e) => (e.front + ' ' + e.back).toLowerCase().includes(s)) : entries
  }, [entries, q])

  async function restore(f: File) {
    try {
      const n = await vocab.restore(JSON.parse(await f.text()))
      setMsg(`Восстановлено записей: ${n}`)
    } catch {
      setMsg('Не удалось прочитать файл резервной копии')
    }
  }

  return (
    <>
      <Bar back="#/" title="Словарик" />
      <main className="page">
        <h1>Словарик</h1>
        <p className="lead">
          {entries.length ? `${entries.length} ${plural(entries.length)}` : 'Сохраняйте слова и фразы из текстов кнопкой с закладкой.'}
        </p>
        {entries.length > 0 && (
          <div className="toolbar">
            <input className="search" type="search" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по словарику" />
            <button className="btn primary" onClick={() => download(`anki-${today()}.csv`, toCsv(shown), 'text/csv;charset=utf-8')} title="Две колонки: немецкий — перевод">
              <Download /> CSV для Anki
            </button>
          </div>
        )}
        {shown.map((e) => (
          <div className="entry" key={e.id}>
            <div>
              <div className="entry-front" lang="de">{e.front}</div>
              <div className="entry-back">{e.back}</div>
              <Context e={e} />
              <div className="entry-src">
                <a href={`#/read/${encodeURIComponent(e.docId)}`} style={{ color: 'inherit' }}>{e.docTitle}</a>
              </div>
            </div>
            <button className="icon-btn" aria-label="Удалить" title="Удалить" onClick={() => vocab.remove(e.id)}>
              <Trash />
            </button>
          </div>
        ))}
        <div className="toolbar" style={{ marginTop: 32 }}>
          <button className="btn" onClick={() => download(`vocab-backup-${today()}.json`, JSON.stringify(entries), 'application/json')} disabled={!entries.length}>
            <Download /> Резервная копия
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload /> Восстановить
          </button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          {msg && <span style={{ color: 'var(--muted)', fontSize: 14 }}>{msg}</span>}
        </div>
      </main>
    </>
  )
}

function plural(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'запись'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'записи'
  return 'записей'
}
