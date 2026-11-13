import { useEffect, useState } from 'react'
import { db } from '../db'
import type { VocabEntry } from '../types'

let entries: VocabEntry[] = []
const listeners = new Set<(e: VocabEntry[]) => void>()

function set(next: VocabEntry[]) {
  entries = next.sort((a, b) => b.createdAt - a.createdAt)
  listeners.forEach((l) => l(entries))
}

db.vocab.all().then(set)

export const vocab = {
  async add(e: Omit<VocabEntry, 'id' | 'createdAt'>) {
    const entry = { ...e, id: crypto.randomUUID(), createdAt: Date.now() }
    await db.vocab.put(entry)
    set([entry, ...entries])
  },
  async remove(id: string) {
    await db.vocab.delete(id)
    set(entries.filter((e) => e.id !== id))
  },
  /** Восстановление из резервной копии: записи с теми же id перезаписываются. */
  async restore(list: VocabEntry[]) {
    const valid = list.filter((e) => e && typeof e.id === 'string' && typeof e.front === 'string' && typeof e.back === 'string')
    for (const e of valid) await db.vocab.put(e)
    set([...entries.filter((e) => !valid.some((v) => v.id === e.id)), ...valid])
    return valid.length
  },
}

export function useVocab(): VocabEntry[] {
  const [list, setList] = useState(entries)
  useEffect(() => {
    listeners.add(setList)
    setList(entries)
    return () => void listeners.delete(setList)
  }, [])
  return list
}

const csvCell = (s: string) => '"' + s.replace(/"/g, '""') + '"'

/** Две колонки для Anki: немецкий кусок фразы, перевод. */
export const toCsv = (list: VocabEntry[]) =>
  list.map((e) => csvCell(e.front) + ',' + csvCell(e.back)).join('\n') + '\n'

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
