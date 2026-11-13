/** Словарная справка для одной словоформы. */
export interface Gloss {
  /** Начальная форма, у существительных с артиклем: «die Zeitung». */
  l?: string
  /** Часть речи по-русски: «сущ.», «гл.», … */
  p?: string
  /** Перевод в контексте. */
  ru: string
  /** Короткое пояснение (термин, грамматика). */
  n?: string
}

/** Устойчивое выражение или отделяемый глагол: слова перечислены в порядке появления в предложении. */
export interface Phrase {
  w: string[]
  ru: string
  l?: string
  n?: string
}

/** Смысловой кусок предложения: n слов подряд и их перевод в контексте. */
export interface Chunk {
  n: number
  ru: string
}

export interface Sentence {
  de: string
  ru?: string
  /** Куски, покрывающие все слова предложения по порядку. */
  c?: Chunk[]
  ph?: Phrase[]
  /** Переопределения справки для этого предложения (ключ — словоформа в нижнем регистре). */
  w?: Record<string, Gloss>
  /** Исправленные ошибки распознавания: исправленное слово → как было в оригинале. */
  orig?: Record<string, string>
}

export interface Paragraph {
  s: Sentence[]
  /** Начало в секундах (для субтитров). */
  t?: number
  /** Заголовок: 1 — часть книги, 2 — глава (с неё начинается новая страница чтения). */
  h?: 1 | 2
}

export interface DocMeta {
  id: string
  title: string
  subtitle?: string
  words: number
  /** Глав всего и сколько из них переведено. */
  chapters?: number
  ready?: number
}

export interface Doc extends DocMeta {
  paragraphs: Paragraph[]
  /** Общий глоссарий текста (ключ — словоформа в нижнем регистре). */
  glossary: Record<string, Gloss>
}

export interface VocabEntry {
  id: string
  /** Лицевая сторона карточки: немецкий кусок фразы. */
  front: string
  /** Оборот: перевод, при сохранении от слова — плюс «лемма — перевод». */
  back: string
  /** Словоформы для подсветки в текстах (нижний регистр). */
  forms: string[]
  context?: string
  docId: string
  docTitle: string
  /** Где сохранено: номер предложения в тексте и индексы токенов. */
  at: { s: number; tokens: number[] }
  createdAt: number
}

export interface Progress {
  docId: string
  paragraph: number
  total: number
  updatedAt: number
}
