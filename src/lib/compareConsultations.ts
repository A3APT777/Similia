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

