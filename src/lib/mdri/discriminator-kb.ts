/**
 * Discriminator Knowledge Base — structured differential pairs.
 *
 * Каждая пара содержит 1-3 конкретных discriminator с
 * детерминированным маппингом option → symptom.
 *
 * AI НЕ вызывается если пара найдена в KB.
 */

// =====================================================================
// Типы
// =====================================================================

export type MappedSymptom = {
  canonicalKey: string               // уникальный ключ: "THIRST_LARGE_COLD"
  rubric: string                     // "thirst large quantities cold water"
  weight: 1 | 2 | 3
  category: 'mental' | 'general' | 'particular'
  modality?: { pairId: string; value: 'agg' | 'amel' }
}

export type DiscriminatorOption = {
  id: string                         // "opt_a1"
  labelRu: string                    // "Пьёт много холодной воды залпом"
  effect: 'supports_a' | 'supports_b' | 'neutral'
  confidenceWeight: number           // 0.5-1.0 — насколько этот ответ информативен
  mappedSymptoms: MappedSymptom[]
}

export type Discriminator = {
  id: string                         // "IGN_NATM_GRIEF_TYPE"
  type: 'modality' | 'thermal' | 'thirst' | 'time' | 'symptom' | 'behavior' | 'sensation'
  labelRu: string                    // "Характер горя"
  labelInternal: string              // "grief acute vs chronic"
  clinicalMeaning: string            // "Ignatia — острое горе с парадоксами, Nat-m — давнее подавленное"
  whyItMatters: string               // "Главное отличие между Ign и Nat-m"
  evidenceLevel: 'high' | 'medium'   // high = классический keynote, medium = частый паттерн
  falsePositiveRisk: 'low' | 'medium' | 'high'
  options: DiscriminatorOption[]
}

export type DifferentialPairKB = {
  pairId: string                     // "ign_nat-m"
  remedyA: string                    // "ign"
  remedyB: string                    // "nat-m"
  status: 'verified' | 'draft'
  priority: number                   // 1 = самая частая пара
  source: string                     // "Kent, Vithoulkas, clinical"
  discriminators: Discriminator[]
}

// =====================================================================
// Knowledge Base — 10 частых пар
// =====================================================================

export const DISCRIMINATOR_KB: DifferentialPairKB[] = [
  // 1. Ignatia vs Natrum muriaticum
  {
    pairId: 'ign_nat-m', remedyA: 'ign', remedyB: 'nat-m',
    status: 'verified', priority: 1, source: 'Kent, Vithoulkas',
    discriminators: [
      {
        id: 'IGN_NATM_GRIEF', type: 'symptom',
        labelRu: 'Характер горя', labelInternal: 'grief acute vs chronic suppressed',
        clinicalMeaning: 'Ignatia — острое горе с парадоксальными реакциями. Nat-m — давнее горе, замкнутость.',
        whyItMatters: 'Главное отличие: свежесть горя и способ переживания',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'grief_acute', labelRu: 'Горе свежее, резкие перепады настроения — то смех, то слёзы',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_ACUTE', rubric: 'grief recent acute paradoxical', weight: 3, category: 'mental' }] },
          { id: 'grief_old', labelRu: 'Горе давнее, носит в себе, не показывает чувств',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_SUPPRESSED', rubric: 'grief suppressed old silent', weight: 3, category: 'mental' }] },
          { id: 'grief_neutral', labelRu: 'Не могу определить',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
      {
        id: 'IGN_NATM_CONSOLATION', type: 'behavior',
        labelRu: 'Реакция на утешение', labelInternal: 'consolation response',
        clinicalMeaning: 'Ign может принять утешение. Nat-m — утешение раздражает.',
        whyItMatters: 'Ключевой полярностный симптом',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'consol_accepts', labelRu: 'Иногда принимает утешение, может заплакать от сочувствия',
            effect: 'supports_a', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'CONSOLATION_AMEL', rubric: 'consolation ameliorates', weight: 2, category: 'mental', modality: { pairId: 'consolation', value: 'amel' } }] },
          { id: 'consol_rejects', labelRu: 'Утешение раздражает, хочет побыть одна',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'CONSOLATION_AGG', rubric: 'consolation aggravates', weight: 3, category: 'mental', modality: { pairId: 'consolation', value: 'agg' } }] },
          { id: 'consol_neutral', labelRu: 'Безразлично',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // 2. Apis vs Pulsatilla
  {
    pairId: 'apis_puls', remedyA: 'apis', remedyB: 'puls',
    status: 'verified', priority: 2, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'APIS_PULS_THERMAL', type: 'thermal',
        labelRu: 'Реакция на тепло', labelInternal: 'thermal modality',
        clinicalMeaning: 'Оба хуже от тепла, но Apis — жалящие боли лучше от холода. Puls — мягкие выделения.',
        whyItMatters: 'Характер боли и выделений',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'stinging_cold', labelRu: 'Жалящие, колющие боли, значительно лучше от холодных компрессов',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'PAIN_STINGING', rubric: 'pain stinging burning better cold', weight: 3, category: 'particular' }] },
          { id: 'bland_discharges', labelRu: 'Мягкие выделения, переменчивые симптомы, плаксивость',
            effect: 'supports_b', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'DISCHARGES_BLAND', rubric: 'discharges bland mild changeable', weight: 2, category: 'general' }] },
        ],
      },
    ],
  },

  // 3. Natrum mur vs Sepia
  {
    pairId: 'nat-m_sep', remedyA: 'nat-m', remedyB: 'sep',
    status: 'verified', priority: 2, source: 'Vithoulkas, Kent',
    discriminators: [
      {
        id: 'NATM_SEP_INDIFFERENCE', type: 'behavior',
        labelRu: 'Отношение к близким', labelInternal: 'indifference vs grief',
        clinicalMeaning: 'Nat-m страдает от горя но любит семью. Sepia безразлична к семье.',
        whyItMatters: 'Эмоциональная привязанность vs безразличие',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'loves_family', labelRu: 'Любит близких, но замыкается в горе',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_SILENT', rubric: 'grief suppressed old silent', weight: 3, category: 'mental' }] },
          { id: 'indifferent_family', labelRu: 'Безразличие к семье, не хочет видеть мужа/детей',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'INDIFFERENCE_FAMILY', rubric: 'indifference family husband children', weight: 3, category: 'mental' }] },
        ],
      },
      {
        id: 'NATM_SEP_EXERCISE', type: 'modality',
        labelRu: 'Реакция на физическую активность', labelInternal: 'exercise modality',
        clinicalMeaning: 'Sepia значительно лучше от энергичных упражнений. Nat-m — нейтрально.',
        whyItMatters: 'Характерная модальность Sepia',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'exercise_better', labelRu: 'Значительно лучше от энергичных упражнений, танцев',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'BETTER_EXERCISE', rubric: 'better vigorous exercise dancing', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'amel' } }] },
          { id: 'exercise_neutral', labelRu: 'Физическая активность не особо влияет',
            effect: 'supports_a', confidenceWeight: 0.5,
            mappedSymptoms: [] },
        ],
      },
    ],
  },

  // 4. Bryonia vs Rhus-tox
  {
    pairId: 'bry_rhus-t', remedyA: 'bry', remedyB: 'rhus-t',
    status: 'verified', priority: 1, source: 'Kent, классика',
    discriminators: [
      {
        id: 'BRY_RHUST_MOTION', type: 'modality',
        labelRu: 'Реакция на движение', labelInternal: 'motion modality',
        clinicalMeaning: 'Bryonia — любое движение хуже, лежит неподвижно. Rhus-t — первое движение хуже, потом расходится.',
        whyItMatters: 'Главное противопоставление в гомеопатии',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'motion_worse_always', labelRu: 'Любое движение ухудшает, лежит абсолютно неподвижно',
            effect: 'supports_a', confidenceWeight: 0.95,
            mappedSymptoms: [{ canonicalKey: 'MOTION_AGG', rubric: 'worse motion any lies still', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'agg' } }] },
          { id: 'motion_first_worse', labelRu: 'Первое движение болезненно, но потом расходится и становится лучше',
            effect: 'supports_b', confidenceWeight: 0.95,
            mappedSymptoms: [{ canonicalKey: 'FIRST_MOTION_AGG', rubric: 'stiffness joints worse first motion better continued', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'amel' } }] },
        ],
      },
    ],
  },

  // 5. Colocynthis vs Magnesia phosphorica
  {
    pairId: 'coloc_mag-p', remedyA: 'coloc', remedyB: 'mag-p',
    status: 'verified', priority: 3, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'COLOC_MAGP_CAUSE', type: 'symptom',
        labelRu: 'Причина боли', labelInternal: 'etiology anger vs none',
        clinicalMeaning: 'Colocynthis — боль после гнева/обиды. Mag-p — без эмоциональной причины.',
        whyItMatters: 'Этиология — ключевое отличие',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'after_anger', labelRu: 'Боль возникла после гнева, обиды или возмущения',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'AILMENTS_ANGER', rubric: 'ailments from anger indignation', weight: 3, category: 'mental' }] },
          { id: 'no_emotional_cause', labelRu: 'Боль без видимой эмоциональной причины',
            effect: 'supports_b', confidenceWeight: 0.7,
            mappedSymptoms: [{ canonicalKey: 'PAIN_SPASMODIC', rubric: 'pain cramping spasmodic', weight: 2, category: 'particular' }] },
        ],
      },
      {
        id: 'COLOC_MAGP_SIDE', type: 'symptom',
        labelRu: 'Сторона боли', labelInternal: 'laterality',
        clinicalMeaning: 'Colocynthis — чаще левая. Mag-p — чаще правая.',
        whyItMatters: 'Латеральность как дополнительный сигнал',
        evidenceLevel: 'medium', falsePositiveRisk: 'medium',
        options: [
          { id: 'left_side', labelRu: 'Боль преимущественно слева',
            effect: 'supports_a', confidenceWeight: 0.6,
            mappedSymptoms: [{ canonicalKey: 'LEFT_SIDE', rubric: 'left side complaints', weight: 2, category: 'general' }] },
          { id: 'right_side', labelRu: 'Боль преимущественно справа',
            effect: 'supports_b', confidenceWeight: 0.6,
            mappedSymptoms: [{ canonicalKey: 'RIGHT_SIDE', rubric: 'right side complaints', weight: 2, category: 'general' }] },
        ],
      },
    ],
  },

  // 6. Hepar vs Chamomilla
  {
    pairId: 'cham_hep', remedyA: 'hep', remedyB: 'cham',
    status: 'verified', priority: 3, source: 'Kent',
    discriminators: [
      {
        id: 'HEP_CHAM_COLD', type: 'thermal',
        labelRu: 'Чувствительность к холоду', labelInternal: 'cold sensitivity',
        clinicalMeaning: 'Hepar — крайняя чувствительность к холоду и сквознякам. Cham — менее выражена.',
        whyItMatters: 'Степень зябкости различает',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'extreme_cold', labelRu: 'Крайне чувствителен к холоду, любому сквозняку — хуже от малейшего дуновения',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'CHILLY_EXTREME', rubric: 'chilly extreme sensitive cold draft', weight: 3, category: 'general', modality: { pairId: 'heat_cold', value: 'amel' } }] },
          { id: 'irritable_pain', labelRu: 'Главное — невыносимая боль и гневливость, холод не главное',
            effect: 'supports_b', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'PAIN_INTOLERABLE', rubric: 'oversensitive pain intolerance screaming', weight: 3, category: 'mental' }] },
        ],
      },
    ],
  },

  // 7. Dulcamara vs Natrum sulph
  {
    pairId: 'dulc_nat-s', remedyA: 'dulc', remedyB: 'nat-s',
    status: 'verified', priority: 4, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'DULC_NATS_HEAD', type: 'symptom',
        labelRu: 'Последствия травмы головы', labelInternal: 'head injury sequelae',
        clinicalMeaning: 'Nat-s — классический препарат после черепно-мозговых травм. Dulc — нет.',
        whyItMatters: 'Уникальный keynote Nat-s',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'head_injury', labelRu: 'Были травмы головы, после которых ухудшилось здоровье',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'HEAD_INJURY', rubric: 'ailments from head injury concussion', weight: 3, category: 'general' }] },
          { id: 'no_head_injury', labelRu: 'Травм головы не было',
            effect: 'supports_a', confidenceWeight: 0.5,
            mappedSymptoms: [] },
        ],
      },
    ],
  },

  // 8. Phosphorus vs Pulsatilla
  {
    pairId: 'phos_puls', remedyA: 'phos', remedyB: 'puls',
    status: 'verified', priority: 3, source: 'Kent',
    discriminators: [
      {
        id: 'PHOS_PULS_THIRST', type: 'thirst',
        labelRu: 'Жажда', labelInternal: 'thirst vs thirstless',
        clinicalMeaning: 'Phos — сильная жажда холодной воды. Puls — нет жажды.',
        whyItMatters: 'Противоположные general симптомы',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'thirst_cold', labelRu: 'Сильная жажда, пьёт много холодной воды',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'THIRST_LARGE_COLD', rubric: 'thirst large quantities cold water', weight: 3, category: 'general' }] },
          { id: 'thirstless', labelRu: 'Жажды почти нет',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'THIRSTLESS', rubric: 'thirstless', weight: 2, category: 'general' }] },
        ],
      },
    ],
  },

  // 9. Calcarea vs Sulphur
  {
    pairId: 'calc_sulph', remedyA: 'calc', remedyB: 'sulph',
    status: 'verified', priority: 2, source: 'Kent, Vithoulkas',
    discriminators: [
      {
        id: 'CALC_SULPH_THERMAL', type: 'thermal',
        labelRu: 'Термика', labelInternal: 'chilly vs hot',
        clinicalMeaning: 'Calc — зябкий. Sulph — жаркий.',
        whyItMatters: 'Противоположная термика',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'chilly', labelRu: 'Зябкий, мёрзнет, хуже от холода',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'CHILLY', rubric: 'chilly', weight: 2, category: 'general', modality: { pairId: 'heat_cold', value: 'amel' } }] },
          { id: 'hot', labelRu: 'Жаркий, не переносит тепло, высовывает ноги из-под одеяла',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'HOT_PATIENT', rubric: 'hot patient burning feet uncovers', weight: 3, category: 'general', modality: { pairId: 'heat_cold', value: 'agg' } }] },
        ],
      },
    ],
  },

  // 10. Carcinosinum vs Pulsatilla
  {
    pairId: 'carc_puls', remedyA: 'carc', remedyB: 'puls',
    status: 'verified', priority: 3, source: 'Vithoulkas, NESH',
    discriminators: [
      {
        id: 'CARC_PULS_SUPPRESSION', type: 'behavior',
        labelRu: 'Подавление vs открытость', labelInternal: 'suppression vs open emotions',
        clinicalMeaning: 'Carc подавляет эмоции с детства, угождает. Puls открыто плачет, ищет утешения.',
        whyItMatters: 'Способ проявления эмоций',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'suppresses', labelRu: 'Подавляет эмоции, старается угодить, не показывает недовольство',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'EMOTIONS_SUPPRESSED', rubric: 'emotions suppressed from childhood pleasing others', weight: 3, category: 'mental' }] },
          { id: 'open_weeping', labelRu: 'Открыто плачет, ищет утешения и внимания',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'WEEPING_EASILY', rubric: 'weeping easily consolation ameliorates', weight: 2, category: 'mental', modality: { pairId: 'consolation', value: 'amel' } }] },
        ],
      },
    ],
  },
]

// =====================================================================
// Функция поиска
// =====================================================================

function normRemedy(s: string): string {
  return s.toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-')
}

export function findKnownDiscriminators(top1: string, alt: string): DifferentialPairKB | null {
  const a = normRemedy(top1)
  const b = normRemedy(alt)

  // Ищем по обоим направлениям (a_b и b_a)
  for (const pair of DISCRIMINATOR_KB) {
    if ((pair.remedyA === a && pair.remedyB === b) || (pair.remedyA === b && pair.remedyB === a)) {
      return pair
    }
  }
  return null
}

/**
 * Выбрать лучший discriminator из KB, учитывая что уже известно.
 * Фильтрует: модальности/симптомы которые уже есть.
 */
export function selectFromKB(
  pair: DifferentialPairKB,
  existingSymptoms: { rubric: string }[],
  existingModalities: { pairId: string }[],
): Discriminator | null {
  const available = pair.discriminators.filter(d => {
    // Проверяем что ответ ещё не известен
    for (const opt of d.options) {
      if (opt.effect === 'neutral') continue
      for (const ms of opt.mappedSymptoms) {
        // Модальность уже есть?
        if (ms.modality && existingModalities.some(m => m.pairId === ms.modality!.pairId)) return false
        // Rubric уже есть?
        const firstWord = ms.rubric.split(' ')[0]
        if (existingSymptoms.some(s => s.rubric.toLowerCase().includes(firstWord))) return false
      }
    }
    return true
  })

  if (available.length === 0) return null

  // Сортировка: high evidence → low false positive → высокий priority
  available.sort((a, b) => {
    if (a.evidenceLevel !== b.evidenceLevel) return a.evidenceLevel === 'high' ? -1 : 1
    if (a.falsePositiveRisk !== b.falsePositiveRisk) return a.falsePositiveRisk === 'low' ? -1 : 1
    return 0
  })

  return available[0]
}
