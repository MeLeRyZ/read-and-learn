import { useEffect, useState } from 'react'
import { Library } from './Library'
import { Reader } from './reader/Reader'
import { VocabPage } from './vocab/VocabPage'

export function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => setHash(location.hash)
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const read = /^#\/read\/([^/]+)(?:\/(\d+))?$/.exec(hash)
  const page = read ? 'read:' + read[1] : hash
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  // Смена главы не пересоздаёт читалку: прокрутку внутри книги ведёт она сама.
  if (read) return <Reader key={read[1]} id={decodeURIComponent(read[1])} chapter={read[2] ? +read[2] : undefined} />
  if (hash === '#/vocab') return <VocabPage />
  return <Library />
}
