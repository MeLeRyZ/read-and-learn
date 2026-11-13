import { useEffect } from 'react'
import type { Chapter } from '../parse/chapters'
import type { Doc } from '../types'

/** Оглавление книги: части, главы, перевод названий и готовность перевода. */
export function Toc({ doc, chapters, current, onClose }: { doc: Doc; chapters: Chapter[]; current: number; onClose: () => void }) {
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as Element).closest?.('.toc') && onClose()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const ps = doc.paragraphs
  return (
    <nav className="panel toc" aria-label="Оглавление">
      <div className="toc-title" lang="de">{doc.title}</div>
      {chapters.map((c, i) => {
        const ss = ps.slice(c.from, c.to).flatMap((p) => p.s)
        const done = ss.filter((s) => s.ru).length / ss.length
        const head = c.head >= 0 ? ps[c.head].s[0] : undefined
        const partStarts = c.part >= 0 && c.part >= c.from && c.part < c.to
        return (
          <div key={i}>
            {partStarts && <div className="toc-part" lang="de">{ps[c.part].s[0].de}</div>}
            <a className="toc-item" href={`#/read/${encodeURIComponent(doc.id)}/${i}`} aria-current={i === current ? 'page' : undefined}>
              <span lang="de">{head?.de ?? doc.title}</span>
              {head?.ru && <small>{head.ru}</small>}
              <small className="toc-state">{done === 1 ? 'переведено' : done > 0 ? `перевод: ${Math.round(done * 100)}%` : 'перевод готовится'}</small>
            </a>
          </div>
        )
      })}
    </nav>
  )
}
