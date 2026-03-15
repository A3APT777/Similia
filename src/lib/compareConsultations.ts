// Алгоритм сравнения двух консультаций по симптомам и наблюдениям.
//
// Как работает:
// 1. Разбиваем каждый текст на отдельные "наблюдения" (по строкам и запятым)
// 2. Для каждой пары считаем сходство через пересечение ключевых слов (Жаккар)
// 3. Если сходство выше порога — это "без изменений", иначе — "новое" или "исчезло"

export type ComparisonResult = {
  newItems: string[]       // появились в текущей, не было в прошлой
  goneItems: string[]      // были в прошлой, нет в текущей
  sameItems: {             // есть в обеих (возможно с разными формулировками)
    current: string
    previous: string
    changed: boolean       // формулировка немного изменилась
  }[]
}

// Проверяет, является ли строка структурным элементом шаблона (не симптомом)
function isTemplateArtifact(text: string): boolean {
  const t = text.trim()

  // Заголовки разделов: ЖАЛОБЫ, МОДАЛЬНОСТИ, ОЩУЩЕНИЯ и т.д.
  // Признак: строка целиком заглавными буквами (и есть хотя бы одна буква)
  if (t === t.toUpperCase() && /[А-ЯЁA-Z]/.test(t) && !/\d/.test(t)) return true

  // Пустые поля шаблона: "Хуже от:", "Препарат:", "Жажда:" — заканчиваются на двоеточие без значения
  if (/:\s*$/.test(t)) return true

  // Разделители-заглушки: —, -, ---, ···
  if (/^[—\-–·\s]+$/.test(t)) return true

  return false
}

// Разбить текст консультации на отдельные наблюдения
function extractItems(text: string): string[] {
  if (!text.trim()) return []

  return text
    .split(/\n+/)
    .flatMap(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.length < 3) return []

      // Пропускаем заголовки и пустые поля шаблона
      if (isTemplateArtifact(trimmed)) return []

      // Если строка — "Ключ: значение" (например "Хуже от: холод, ночью")
      // → берём только значение после двоеточия
      const colonIdx = trimmed.indexOf(':')
      const content = colonIdx !== -1
        ? trimmed.slice(colonIdx + 1).trim()
        : trimmed

      // Пустое значение после двоеточия — уже отфильтровано isTemplateArtifact,
      // но на всякий случай проверяем ещё раз
      if (!content || content.length < 2) return []

      // Если значение — короткий список через запятую, разбиваем
      const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 1)
      const isShortList = parts.length > 1 && parts.every(p => p.split(/\s+/).length <= 6)

      const items = isShortList ? parts : [content]
      return items.filter(s => !isTemplateArtifact(s) && s.length >= 2)
    })
    .filter(s => s.length >= 2)
}

// Стоп-слова русского и частично медицинского языка
const STOP_WORDS = new Set([
  'в', 'на', 'от', 'по', 'за', 'и', 'а', 'но', 'или', 'с', 'к', 'у', 'до',
  'из', 'не', 'при', 'что', 'как', 'это', 'есть', 'нет', 'ещё', 'уже',
  'очень', 'более', 'менее', 'много', 'мало', 'так', 'же', 'всё', 'все',
])

// Простой стемминг для русских слов — обрезаем окончания до корня.
// Это позволяет сопоставить «болит» и «боль», «нога» и «ноге» и т.д.
function stem(word: string): string {
  if (word.length <= 3) return word                           // короткое — не трогаем
  if (word.length <= 5) return word.slice(0, 3)              // 4–5 букв → берём 3
  return word.slice(0, Math.min(5, word.length - 2))         // длинные → убираем 2 последних, не больше 5
}

// Извлечь ключевые слова из строки (убираем стоп-слова, нормализуем, стеммируем)
function getKeyWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w))
      .map(stem)
  )
}

// Сходство Жаккара: |пересечение| / |объединение|
function jaccard(a: string, b: string): number {
  const wa = getKeyWords(a)
  const wb = getKeyWords(b)

  if (wa.size === 0 && wb.size === 0) return 1
  if (wa.size === 0 || wb.size === 0) return 0

  let intersect = 0
  for (const w of wa) if (wb.has(w)) intersect++

  return intersect / (wa.size + wb.size - intersect)
}

// Порог сходства: 25% общих ключевых слов = "то же самое"
const MATCH_THRESHOLD = 0.25
// Порог точного совпадения: 85%+ = формулировка не изменилась
const EXACT_THRESHOLD = 0.85

export function compareConsultations(
  currentText: string,
  previousText: string
): ComparisonResult {
  const currentItems = extractItems(currentText)
  const previousItems = extractItems(previousText)

  if (currentItems.length === 0 && previousItems.length === 0) {
    return { newItems: [], goneItems: [], sameItems: [] }
  }
  if (currentItems.length === 0) {
    return { newItems: [], goneItems: previousItems, sameItems: [] }
  }
  if (previousItems.length === 0) {
    return { newItems: currentItems, goneItems: [], sameItems: [] }
  }

  const usedPrev = new Set<number>()
  const newItems: string[] = []
  const sameItems: ComparisonResult['sameItems'] = []

  for (const cItem of currentItems) {
    // Ищем наилучшее совпадение в предыдущей консультации
    let bestIdx = -1
    let bestScore = MATCH_THRESHOLD

    for (let i = 0; i < previousItems.length; i++) {
      if (usedPrev.has(i)) continue
      const score = jaccard(cItem, previousItems[i])
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    if (bestIdx >= 0) {
      usedPrev.add(bestIdx)
      sameItems.push({
        current: cItem,
        previous: previousItems[bestIdx],
        changed: bestScore < EXACT_THRESHOLD,
      })
    } else {
      newItems.push(cItem)
    }
  }

  const goneItems = previousItems.filter((_, i) => !usedPrev.has(i))

  return { newItems, goneItems, sameItems }
}
