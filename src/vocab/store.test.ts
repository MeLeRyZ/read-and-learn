import { describe, expect, it, vi } from 'vitest'
vi.mock('../db', () => ({ db: { vocab: { all: async () => [] } } }))
import { toCsv } from './store'
import type { VocabEntry } from '../types'

const e = (front: string, back: string) => ({ front, back }) as VocabEntry

describe('toCsv', () => {
  it('две колонки, кавычки экранируются', () => {
    expect(toCsv([e('auf einem riesigen Konzert', 'на огромном концерте'), e('„Na“, sagte er', '«Ну», сказал он, "да"')])).toBe(
      '"auf einem riesigen Konzert","на огромном концерте"\n"„Na“, sagte er","«Ну», сказал он, ""да"""\n',
    )
  })
})
