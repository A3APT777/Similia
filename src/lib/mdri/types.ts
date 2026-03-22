// Типы данных MDRI Engine
// Внутренние типы движка — НЕ дублируют @/types, а дополняют
// Категории MDRI (mental/general/particular) НЕ совпадают с SymptomCategory из @/types —
// это осознанно: MDRI работает по классификации Геринга, а UI — по структуре ввода

// === Категоризация для MDRI-анализа ===

export type MDRISymptomCategory = 'mental' | 'general' | 'particular'
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'
export type ModalityValue = 'agg' | 'amel'

// === Входные данные движка ===

export type MDRISymptom = {
  rubric: string
  category: MDRISymptomCategory
  present: boolean
  weight: number // 1-3
}

export type MDRIModality = {
  pairId: string // 'heat_cold', 'motion_rest' и т.д.
  value: ModalityValue
}

export type MDRIPatientProfile = {
  acuteOrChronic: 'acute' | 'chronic'
  vitality: 'high' | 'medium' | 'low'
  sensitivity: 'high' | 'medium' | 'low'
  age: 'child' | 'adult' | 'elderly'
}

export const DEFAULT_PROFILE: MDRIPatientProfile = {
  acuteOrChronic: 'chronic',
  vitality: 'medium',
  sensitivity: 'medium',
  age: 'adult',
}

// === Результат анализа ===

export type MDRILensResult = {
  name: string
  score: number // 0-100
  details: string
}

export type MDRIPotencyRecommendation = {
  potency: string // '6C', '30C', '200C', '1M'
  frequency: string
  reasoning: string
}

export type MDRIDifferentialNote = {
  rivalRemedy: string
  rivalScore: number
  differentiatingQuestion: string
}

export type MDRIResult = {
  remedy: string
  remedyName: string
  totalScore: number // 0-100
  confidence: ConfidenceLevel
  lenses: MDRILensResult[]
  potency: MDRIPotencyRecommendation | null
  miasm: string | null
  relationships: MDRIRemedyRelationships | null
  differential: MDRIDifferentialNote | null
}

export type MDRIRemedyRelationships = {
  follows_well?: string[]
  complementary?: string[]
  antidotes?: string[]
  inimical?: string[]
}

// === Данные из Supabase ===

export type MDRIRepertoryRubric = {
  rubric: string
  chapter: string
  remedies: { abbrev: string; grade: number }[]
}

export type MDRIConstellationData = {
  name: string
  clusters: {
    id: string
    name: string
    importance: number
    symptoms: { rubric: string; weight: number }[]
  }[]
  sine_qua_non?: string[]
  excluders?: string[]
}

export type MDRIPolarityData = {
  [pairId: string]: string // 'agg' | 'amel' | 'agg_heat' | 'agg_cold' и т.д.
}

// === Клинические данные для фильтрации и consistency ===

// Условие consistency — проверяется по данным кейса, НЕ по строкам
export type ConsistencyCondition = {
  type: 'thermal'    // chilly | hot
    | 'modality'     // motion_agg | motion_amel | rest_agg | open_air_amel | pressure_amel и т.д.
    | 'mental'       // grief | anxiety | irritability | jealousy | indifference и т.д.
    | 'desire'       // salt | sweets | sour | fat | stimulants | eggs | cold_drinks | warm_drinks
    | 'aversion'     // fat | milk | fish | meat
    | 'thirst'       // large | small_sips | thirstless
    | 'time'         // worse_morning | worse_evening | worse_night | worse_2_4am | worse_4_8pm
    | 'side'         // right | left
    | 'sleep'        // on_abdomen | after_sleep_worse
    | 'consolation'  // agg | amel
    | 'company'      // desire | aversion
    | 'onset'        // sudden | gradual
    | 'perspiration' // profuse | absent | feet | head
    | 'keynote'      // специфичный клинический ключ (строковое сравнение)
  value: string
}

export type ConsistencyGroup = {
  remedy: string
  name: string
  core: ConsistencyCondition[]       // обязательные — все должны совпасть
  optional: ConsistencyCondition[]   // усиливающие — каждое совпадение = бонус
}

export type MDRIClinicalData = {
  thermal_contradictions: Record<string, 'chilly' | 'hot' | 'neutral'>
  consistency_groups: ConsistencyGroup[]
}

// === Результат AI-гомеопата (Sonnet) ===

export type AIHomeopathResult = {
  remedy: string
  confidence: number
  reasoning: string
  miasm: string | null
  potency: string
  differential: string
}

// === Consensus (Sonnet + MDRI + Opus) ===

export type ConsensusResult = {
  method: 'consensus' | 'sonnet_priority' | 'opus_arbiter'
  finalRemedy: string
  sonnetRemedy: string
  mdriRemedy: string
  mdriResults: MDRIResult[]
  aiResult: AIHomeopathResult | null
  cost: number
}
