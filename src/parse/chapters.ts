export interface Chapter {
  /** Первый и следующий за последним абзацы главы. */
  from: number
  to: number
  /** Индекс абзаца-заголовка главы (или -1) и заголовка части книги над ней (или -1). */
  head: number
  part: number
}

/**
 * Глава начинается с заголовка уровня 2; заголовок части (уровень 1) прямо над ней
 * открывает ту же страницу. Текст без глав — одна глава.
 */
export function chaptersOf(paragraphs: { h?: 1 | 2 }[]): Chapter[] {
  const out: Chapter[] = []
  let part = -1
  paragraphs.forEach((p, i) => {
    if (p.h === 1) part = i
    if (p.h !== 2) return
    const from = paragraphs[i - 1]?.h === 1 ? i - 1 : i
    if (out.length) out[out.length - 1].to = from
    out.push({ from: out.length ? from : 0, to: paragraphs.length, head: i, part })
  })
  return out.length ? out : [{ from: 0, to: paragraphs.length, head: -1, part: -1 }]
}
