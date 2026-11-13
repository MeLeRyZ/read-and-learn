import { useEffect, useState } from 'react'

export type Theme = 'auto' | 'paper' | 'sepia' | 'night'

export interface Settings {
  theme: Theme
  fontSize: number
  leading: 'tight' | 'normal' | 'loose'
  width: 'narrow' | 'medium' | 'wide'
  articleColors: boolean
  timecodes: boolean
  highlightSaved: boolean
}

export const DEFAULTS: Settings = {
  theme: 'auto',
  fontSize: 20,
  leading: 'normal',
  width: 'medium',
  articleColors: true,
  timecodes: false,
  highlightSaved: true,
}

const KEY = 'ral.settings'
const LEADING = { tight: 1.5, normal: 1.65, loose: 1.85 }
const WIDTH = { narrow: '34em', medium: '38em', wide: '44em' }

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

const listeners = new Set<(s: Settings) => void>()
let current = load()

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* приватный режим — настройки живут до перезагрузки */
  }
  apply(current)
  listeners.forEach((l) => l(current))
}

const dark = window.matchMedia('(prefers-color-scheme: dark)')

export function apply(s: Settings) {
  const root = document.documentElement
  const theme = s.theme === 'auto' ? (dark.matches ? 'night' : 'paper') : s.theme
  root.dataset.theme = theme
  root.style.setProperty('--read-size', s.fontSize + 'px')
  root.style.setProperty('--read-leading', String(LEADING[s.leading]))
  root.style.setProperty('--read-measure', WIDTH[s.width])
  root.classList.toggle('article-colors', s.articleColors)
  root.classList.toggle('show-time', s.timecodes)
  root.classList.toggle('highlight-saved', s.highlightSaved)
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

dark.addEventListener('change', () => apply(current))
apply(current)

export function useSettings(): Settings {
  const [s, set] = useState(current)
  useEffect(() => {
    listeners.add(set)
    return () => void listeners.delete(set)
  }, [])
  return s
}
