import { openDB, type DBSchema } from 'idb'
import type { Progress, VocabEntry } from './types'

interface Schema extends DBSchema {
  vocab: { key: string; value: VocabEntry }
  progress: { key: string; value: Progress }
}

const dbp = openDB<Schema>('read-and-learn', 1, {
  upgrade(db) {
    db.createObjectStore('vocab', { keyPath: 'id' })
    db.createObjectStore('progress', { keyPath: 'docId' })
  },
})

export const db = {
  vocab: {
    all: async () => (await dbp).getAll('vocab'),
    put: async (e: VocabEntry) => (await dbp).put('vocab', e),
    delete: async (id: string) => (await dbp).delete('vocab', id),
  },
  progress: {
    all: async () => (await dbp).getAll('progress'),
    get: async (id: string) => (await dbp).get('progress', id),
    put: async (p: Progress) => (await dbp).put('progress', p),
  },
}
