/**
 * Распознавание этиологии (Causa) в симптомах пациента.
 *
 * По Ганеману (Organon §5) причина болезни иерархически выше отдельных
 * симптомов. Engine.ts уже использует etiology для бонусов в ranking;
 * этот модуль выносит распознавание ОТДЕЛЬНО от engine (без правки
 * заблокированного файла), чтобы вернуть в UI явное «распознали такую
 * этиологию → вот ведущие препараты».
 *
 * Логика та же что в engine.ts:1098 / 1206 — копия таблицы для
 * независимости от блокировки.
 */
import type { MDRISymptom } from './types'

export type DetectedEtiology = {
  key: string             // ключ, по которому матчили (grief, anger, …)
  labelRu: string         // что показывать врачу
  matchedRubrics: string[] // какие рубрики пациента сматчились
  topRemedies: string[]   // 4-6 ведущих препаратов (выше иерархически)
  secondaryRemedies: string[] // 2-4 вторичных
}

// Локальная копия из engine.ts (не импортируем чтобы не цеплять блокированный файл)
const ETIOLOGY_REMEDIES: Record<string, { top: string[]; secondary: string[]; labelRu: string }> = {
  'grief':              { labelRu: 'горе', top: ['nat-m', 'ign', 'ph-ac', 'staph', 'aur', 'carc'], secondary: ['lach', 'op', 'calc'] },
  'anger':              { labelRu: 'гнев', top: ['staph', 'nux-v', 'cham', 'bry', 'coloc'], secondary: ['lyc', 'ign', 'ip'] },
  'fright':             { labelRu: 'испуг', top: ['acon', 'op', 'gels', 'ign', 'stram'], secondary: ['arg-n', 'phos', 'lyc'] },
  'humiliation':        { labelRu: 'унижение', top: ['staph', 'nat-m', 'coloc', 'ign', 'aur'], secondary: ['lyc'] },
  'mortification':      { labelRu: 'оскорбление, обида', top: ['staph', 'nat-m', 'coloc', 'ign'], secondary: ['lyc', 'aur'] },
  'disappointed love':  { labelRu: 'несчастная любовь', top: ['nat-m', 'ign', 'ph-ac', 'hyos', 'aur'], secondary: ['staph', 'lach'] },
  'suppressed':         { labelRu: 'подавленные эмоции', top: ['staph', 'nat-m', 'ign', 'carc', 'aur'], secondary: ['sep', 'nux-v'] },
  'vaccination':        { labelRu: 'после прививки', top: ['thuj', 'sil', 'sulph', 'merc'], secondary: ['ant-t', 'apis'] },
  'head injury':        { labelRu: 'травма головы', top: ['nat-s', 'arn', 'hell', 'cic'], secondary: ['hyper', 'op'] },
  'sexual excess':      { labelRu: 'половые излишества', top: ['staph', 'calc', 'ph-ac', 'nux-v', 'sep'], secondary: ['chin', 'lyc'] },
  'loss of fluids':     { labelRu: 'потеря жидкостей', top: ['chin', 'ph-ac', 'calc'], secondary: ['carb-v', 'ferr'] },
  'sun':                { labelRu: 'воздействие солнца', top: ['nat-m', 'bell', 'glon', 'lach'], secondary: ['gels', 'nat-c'] },
  'cold':               { labelRu: 'переохлаждение', top: ['acon', 'dulc', 'rhus-t', 'nux-v'], secondary: ['bell', 'bry', 'hep'] },
  'wet':                { labelRu: 'сырость', top: ['dulc', 'rhus-t', 'nat-s', 'calc'], secondary: ['ars', 'nux-m'] },
}

export function detectEtiologies(symptoms: MDRISymptom[]): DetectedEtiology[] {
  const present = symptoms.filter(s => s.present)
  const detected: DetectedEtiology[] = []

  for (const [key, info] of Object.entries(ETIOLOGY_REMEDIES)) {
    const matched = present
      .filter(s => s.rubric.toLowerCase().includes(key))
      .map(s => s.rubric)
    if (matched.length === 0) continue
    detected.push({
      key,
      labelRu: info.labelRu,
      matchedRubrics: matched,
      topRemedies: info.top,
      secondaryRemedies: info.secondary,
    })
  }

  return detected
}
