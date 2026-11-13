import { useEffect, useState } from 'react'
import { Back, Book, Type } from './icons'
import { SettingsPanel } from './theme/SettingsPanel'
import { useVocab } from './vocab/store'

/** Верхняя панель: назад, заголовок, словарик, настройки чтения. */
export function Bar({ back, title, progress, extra }: { back?: string; title?: string; progress?: number; extra?: React.ReactNode }) {
  const [panel, setPanel] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const count = useVocab().length

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    const close = (e: MouseEvent) => !(e.target as Element).closest?.('.panel') && setPanel(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <header className={'bar' + (scrolled ? ' scrolled' : '')}>
      {back ? (
        <a className="icon-btn" href={back} aria-label="Назад">
          <Back />
        </a>
      ) : (
        <span style={{ width: 40 }} />
      )}
      <div className="bar-title">{scrolled ? title : ''}</div>
      {extra}
      <a className="icon-btn" href="#/vocab" aria-label="Словарик" title="Словарик">
        <Book />
        {count > 0 && <span className="badge">{count}</span>}
      </a>
      <button
        className="icon-btn"
        aria-label="Настройки чтения"
        title="Настройки чтения"
        aria-pressed={panel}
        onClick={(e) => {
          e.stopPropagation()
          setPanel(!panel)
        }}
      >
        <Type />
      </button>
      {progress !== undefined && <div className="bar-progress" style={{ width: progress * 100 + '%' }} />}
      {panel && <SettingsPanel />}
    </header>
  )
}
