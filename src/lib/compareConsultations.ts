import { StructuredSymptom, SymptomDynamics } from '@/types'

export type ComparedSymptom = {
  id: string
  label: string
  section: string
  status: SymptomDynamics
  prevLabel?: string  // if label changed
}

export type ComparisonResult = {
  appeared: ComparedSymptom[]    // new symptoms not in previous
  resolved: ComparedSymptom[]    // were in previous, gone now
  changed: ComparedSymptom[]     // same id, different label
  persists: ComparedSymptom[]    // same id, same label
}

// Generate stable ID from label text
export function symptomId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
}

// Compare two arrays of structured symptoms by ID
export function compareStructured(
  current: StructuredSymptom[],
  previous: StructuredSymptom[]
): ComparisonResult {
  const prevMap = new Map(previous.map(s => [s.id, s]))
  const currMap = new Map(current.map(s => [s.id, s]))

  const appeared: ComparedSymptom[] = []
  const resolved: ComparedSymptom[] = []
  const changed: ComparedSymptom[] = []
  const persists: ComparedSymptom[] = []

  // Check current symptoms against previous
  for (const sym of current) {
    const prev = prevMap.get(sym.id)
    if (!prev) {
      appeared.push({ id: sym.id, label: sym.label, section: sym.category || sym.section || 'other', status: 'new' })
    } else if (prev.label !== sym.label) {
      changed.push({ id: sym.id, label: sym.label, section: sym.category || sym.section || 'other', status: 'same', prevLabel: prev.label })
    } else {
      persists.push({ id: sym.id, label: sym.label, section: sym.category || sym.section || 'other', status: 'same' })
    }
  }

  // Check previous symptoms not in current
  for (const sym of previous) {
    if (!currMap.has(sym.id)) {
      resolved.push({ id: sym.id, label: sym.label, section: sym.category || sym.section || 'other', status: 'resolved' })
    }
  }

  return { appeared, resolved, changed, persists }
}

// KEEP the old text-based comparison for backward compatibility
// (used when structured_symptoms is empty)

function isTemplateArtifact(text: string): boolean {
  const t = text.trim()
  if (t === t.toUpperCase() && /[А-ЯЁA-Z]/.test(t) && !/\d/.test(t)) return true
  if (/:\s*$/.test(t)) return true
  if (/^[—\-–·\s]+$/.test(t)) return true
  return false
}

function extractItems(text: string): string[] {
  if (!text.trim()) return []
  return text
    .split(/\n+/)
    .flatMap(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.length < 3) return []
      if (isTemplateArtifact(trimmed)) return []
      const colonIdx = trimmed.indexOf(':')
      const content = colonIdx !== -1 ? trimmed.slice(colonIdx + 1).trim() : trimmed
      if (!content || content.length < 2) return []
      const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 1)
      const isShortList = parts.length > 1 && parts.every(p => p.split(/\s+/).length <= 6)
      return (isShortList ? parts : [content]).filter(s => !isTemplateArtifact(s) && s.length >= 2)
    })
    .filter(s => s.length >= 2)
}

const STOP_WORDS = new Set(['в','на','от','по','за','и','а','но','или','с','к','у','до','из','не','при','что','как','это','есть','нет','ещё','уже','очень','более','менее','много','мало','так','же','всё','все'])

function stem(word: string): string {
  if (word.length <= 3) return word
  if (word.length <= 5) return word.slice(0, 3)
  return word.slice(0, Math.min(5, word.length - 2))
}

function getKeyWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^а-яёa-z0-9\s]/gi, ' ').split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w)).map(stem)
  )
}

function jaccard(a: string, b: string): number {
  const wa = getKeyWords(a), wb = getKeyWords(b)
  if (wa.size === 0 && wb.size === 0) return 1
  if (wa.size === 0 || wb.size === 0) return 0
  let intersect = 0
  for (const w of wa) if (wb.has(w)) intersect++
  return intersect / (wa.size + wb.size - intersect)
}

export type LegacyComparisonResult = {
  newItems: string[]
  goneItems: string[]
  sameItems: { current: string; previous: string; changed: boolean }[]
}

export function compareConsultations(currentText: string, previousText: string): LegacyComparisonResult {
  const currentItems = extractItems(currentText)
  const previousItems = extractItems(previousText)
  if (currentItems.length === 0 && previousItems.length === 0) return { newItems: [], goneItems: [], sameItems: [] }
  if (currentItems.length === 0) return { newItems: [], goneItems: previousItems, sameItems: [] }
  if (previousItems.length === 0) return { newItems: currentItems, goneItems: [], sameItems: [] }

  const usedPrev = new Set<number>()
  const newItems: string[] = []
  const sameItems: LegacyComparisonResult['sameItems'] = []

  for (const cItem of currentItems) {
    let bestIdx = -1, bestScore = 0.25
    for (let i = 0; i < previousItems.length; i++) {
      if (usedPrev.has(i)) continue
      const score = jaccard(cItem, previousItems[i])
      if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    if (bestIdx >= 0) {
      usedPrev.add(bestIdx)
      sameItems.push({ current: cItem, previous: previousItems[bestIdx], changed: bestScore < 0.85 })
    } else {
      newItems.push(cItem)
    }
  }

  return { newItems, goneItems: previousItems.filter((_, i) => !usedPrev.has(i)), sameItems }
}
