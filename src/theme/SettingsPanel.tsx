import { setSettings, useSettings, type Settings } from './settings'

function Seg<K extends keyof Settings>({ k, options }: { k: K; options: [Settings[K], React.ReactNode][] }) {
  const s = useSettings()
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={String(v)} aria-pressed={s[k] === v} onClick={() => setSettings({ [k]: v } as Partial<Settings>)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ k, label }: { k: 'articleColors' | 'timecodes' | 'highlightSaved'; label: string }) {
  const s = useSettings()
  return (
    <label className="toggle">
      {label}
      <input type="checkbox" checked={s[k]} onChange={(e) => setSettings({ [k]: e.target.checked })} />
    </label>
  )
}

const sw = (c: string) => <span className="swatch" style={{ background: c }} />

export function SettingsPanel() {
  const s = useSettings()
  return (
    <div className="panel" role="dialog" aria-label="Настройки чтения" onClick={(e) => e.stopPropagation()}>
      <div className="panel-row">
        <span className="panel-label">Тема</span>
        <Seg k="theme" options={[['auto', 'Авто'], ['paper', <>{sw('#f8f4ec')}Бумага</>], ['sepia', <>{sw('#f1e7d3')}Сепия</>], ['night', <>{sw('#1c1b19')}Ночь</>]]} />
      </div>
      <div className="panel-row">
        <span className="panel-label">Размер шрифта: {s.fontSize}px</span>
        <div className="seg">
          <button aria-label="Меньше" onClick={() => setSettings({ fontSize: Math.max(16, s.fontSize - 1) })}>A−</button>
          <button aria-label="Больше" onClick={() => setSettings({ fontSize: Math.min(28, s.fontSize + 1) })} style={{ fontSize: 16 }}>A+</button>
        </div>
      </div>
      <div className="panel-row">
        <span className="panel-label">Межстрочный интервал</span>
        <Seg k="leading" options={[['tight', 'Плотнее'], ['normal', 'Обычный'], ['loose', 'Свободнее']]} />
      </div>
      <div className="panel-row">
        <span className="panel-label">Ширина строки</span>
        <Seg k="width" options={[['narrow', 'Узкая'], ['medium', 'Средняя'], ['wide', 'Широкая']]} />
      </div>
      <div className="panel-row">
        <Toggle k="articleColors" label="Цвет артиклей: der · die · das" />
        <Toggle k="highlightSaved" label="Подчёркивать сохранённое" />
        <Toggle k="timecodes" label="Тайм-коды" />
      </div>
    </div>
  )
}
