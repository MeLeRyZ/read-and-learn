import { useEffect, useState } from 'react'
import { Bar } from './Bar'
import { db } from './db'
import type { DocMeta, Progress } from './types'

export function Library() {
  const [docs, setDocs] = useState<DocMeta[]>()
  const [progress, setProgress] = useState<Record<string, Progress>>({})

  useEffect(() => {
    document.title = 'Read & Learn'
    fetch('texts/index.json')
      .then((r) => r.json())
      .then(setDocs, () => setDocs([]))
    db.progress.all().then((all) => setProgress(Object.fromEntries(all.map((p) => [p.docId, p]))))
  }, [])

  return (
    <>
      <Bar />
      <main className="page">
        <h1>Библиотека</h1>
        <p className="lead">Нажмите на слово, чтобы увидеть перевод. Выделите несколько слов, чтобы перевести фразу.</p>
        {docs?.length === 0 && <div className="empty">Пока нет текстов.</div>}
        {docs?.map((d) => {
          const p = progress[d.id]
          const share = p ? Math.min(1, (p.paragraph + 1) / p.total) : 0
          return (
            <a key={d.id} className="doc" href={`#/read/${encodeURIComponent(d.id)}`}>
              <div className="doc-title" lang="de">{d.title}</div>
              <div className="doc-meta">
                {d.subtitle ? d.subtitle + ' · ' : ''}
                {d.chapters ? `${d.chapters} глав · переведено ${d.ready ?? 0} · ` : ''}
                {d.words.toLocaleString('ru')} слов
                {p && share > 0.01 ? ` · прочитано ${Math.round(share * 100)}%` : ''}
              </div>
              {p && share > 0.01 && (
                <div className="meter">
                  <div style={{ width: share * 100 + '%' }} />
                </div>
              )}
            </a>
          )
        })}
      </main>
    </>
  )
}
