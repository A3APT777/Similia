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
  canonicalKey: string
  rubric: string
  weight: 1 | 2 | 3
  category: 'mental' | 'general' | 'particular'
  modality?: { pairId: string; value: 'agg' | 'amel' }
}

export type DiscriminatorOption = {
  id: string
  labelRu: string
  effect: 'supports_a' | 'supports_b' | 'neutral'
  confidenceWeight: number
  mappedSymptoms: MappedSymptom[]
}

export type Discriminator = {
  id: string
  type: 'modality' | 'thermal' | 'thirst' | 'time' | 'symptom' | 'behavior' | 'sensation'
  labelRu: string
  labelInternal: string
  clinicalMeaning: string
  whyItMatters: string
  evidenceLevel: 'high' | 'medium'
  falsePositiveRisk: 'low' | 'medium' | 'high'
  options: DiscriminatorOption[]
}

export type DifferentialPairKB = {
  pairId: string
  remedyA: string
  remedyB: string
  status: 'verified' | 'draft'
  priority: number
  source: string
  discriminators: Discriminator[]
}

// =====================================================================
// Knowledge Base — 10 пар (эталонное качество)
// =====================================================================

export const DISCRIMINATOR_KB: DifferentialPairKB[] = [

  // ═══ 1. Ignatia vs Natrum muriaticum ═══
  {
    pairId: 'ign_nat-m', remedyA: 'ign', remedyB: 'nat-m',
    status: 'verified', priority: 1, source: 'Kent, Vithoulkas',
    discriminators: [
      {
        id: 'IGN_NATM_GRIEF', type: 'symptom',
        labelRu: 'Когда случилось горе?',
        labelInternal: 'grief acute vs chronic',
        clinicalMeaning: 'Ignatia — острое, свежее горе. Nat-m — давнее, годами носит в себе.',
        whyItMatters: 'Главное отличие: свежесть горя',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'grief_acute', labelRu: 'Недавно — недели или месяцы, эмоции на поверхности, то смех то слёзы',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_ACUTE', rubric: 'grief recent acute paradoxical', weight: 3, category: 'mental' }] },
          { id: 'grief_old', labelRu: 'Давно — годы, носит в себе, никому не показывает',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_SUPPRESSED', rubric: 'grief suppressed old silent', weight: 3, category: 'mental' }] },
          { id: 'grief_mixed', labelRu: 'Было давно, но до сих пор остро переживает',
            effect: 'neutral', confidenceWeight: 0.3, mappedSymptoms: [] },
        ],
      },
      {
        id: 'IGN_NATM_CONSOLATION', type: 'behavior',
        labelRu: 'Когда кто-то пытается утешить — как реагирует?',
        labelInternal: 'consolation response',
        clinicalMeaning: 'Ignatia может принять утешение. Nat-m — раздражается от утешения.',
        whyItMatters: 'Ключевой полярностный симптом',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'consol_accepts', labelRu: 'Может расплакаться от сочувствия, иногда принимает утешение',
            effect: 'supports_a', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'CONSOLATION_AMEL', rubric: 'consolation ameliorates', weight: 2, category: 'mental', modality: { pairId: 'consolation', value: 'amel' } }] },
          { id: 'consol_rejects', labelRu: 'Утешение раздражает, уходит, хочет побыть одна',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'CONSOLATION_AGG', rubric: 'consolation aggravates', weight: 3, category: 'mental', modality: { pairId: 'consolation', value: 'agg' } }] },
          { id: 'consol_neutral', labelRu: 'По-разному, зависит от ситуации',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 2. Apis vs Pulsatilla ═══
  {
    pairId: 'apis_puls', remedyA: 'apis', remedyB: 'puls',
    status: 'verified', priority: 2, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'APIS_PULS_PAIN', type: 'sensation',
        labelRu: 'Какой характер боли или дискомфорта?',
        labelInternal: 'stinging vs dull',
        clinicalMeaning: 'Apis — жалящие, колющие, как от пчелы. Puls — тянущие, давящие, переменчивые.',
        whyItMatters: 'Характер ощущения — главное отличие',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'stinging', labelRu: 'Жалящая, колющая, как от укуса — лучше от холодного',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'PAIN_STINGING', rubric: 'pain stinging burning better cold', weight: 3, category: 'particular' }] },
          { id: 'dull_changeable', labelRu: 'Тянущая или давящая, боль перемещается с места на место',
            effect: 'supports_b', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'PAIN_CHANGEABLE', rubric: 'pain wandering shifting changeable', weight: 2, category: 'particular' }] },
          { id: 'pain_unclear', labelRu: 'Трудно описать характер боли',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 3. Natrum mur vs Sepia ═══
  {
    pairId: 'nat-m_sep', remedyA: 'nat-m', remedyB: 'sep',
    status: 'verified', priority: 2, source: 'Vithoulkas, Kent',
    discriminators: [
      {
        id: 'NATM_SEP_FAMILY', type: 'behavior',
        labelRu: 'Как относится к близким людям (муж, дети)?',
        labelInternal: 'attachment vs indifference',
        clinicalMeaning: 'Nat-m любит семью, но замыкается. Sepia безразлична, не хочет видеть.',
        whyItMatters: 'Привязанность vs настоящее безразличие',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'loves_withdraws', labelRu: 'Любит близких, но закрывается в себе, не может выразить чувства',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'GRIEF_SILENT', rubric: 'grief suppressed old silent', weight: 3, category: 'mental' }] },
          { id: 'indifferent', labelRu: 'Настоящее безразличие — не хочет видеть мужа, детей, всё равно',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'INDIFFERENCE_FAMILY', rubric: 'indifference family husband children', weight: 3, category: 'mental' }] },
          { id: 'mixed_family', labelRu: 'Бывает по-разному — то тянется, то отталкивает',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
      {
        id: 'NATM_SEP_EXERCISE', type: 'modality',
        labelRu: 'Помогает ли интенсивная физическая активность?',
        labelInternal: 'exercise modality',
        clinicalMeaning: 'Sepia — значительно лучше от энергичных упражнений. Nat-m — без эффекта.',
        whyItMatters: 'Уникальная модальность Sepia',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'exercise_helps', labelRu: 'Да, после бега, танцев, фитнеса — заметно лучше и физически и эмоционально',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'BETTER_EXERCISE', rubric: 'better vigorous exercise dancing', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'amel' } }] },
          { id: 'exercise_no_effect', labelRu: 'Нет, физическая нагрузка не особо меняет состояние',
            effect: 'supports_a', confidenceWeight: 0.5,
            mappedSymptoms: [{ canonicalKey: 'EXERCISE_NEUTRAL', rubric: 'indifferent to exercise', weight: 1, category: 'general' }] },
          { id: 'exercise_worse', labelRu: 'Наоборот, от нагрузки хуже — устаёт',
            effect: 'neutral', confidenceWeight: 0.3,
            mappedSymptoms: [{ canonicalKey: 'WEAKNESS_EXERTION', rubric: 'weakness exertion', weight: 1, category: 'general' }] },
        ],
      },
    ],
  },

  // ═══ 4. Bryonia vs Rhus-tox ═══
  {
    pairId: 'bry_rhus-t', remedyA: 'bry', remedyB: 'rhus-t',
    status: 'verified', priority: 1, source: 'Kent, Vithoulkas, классика',
    discriminators: [
      {
        id: 'BRY_RHUST_MOTION', type: 'modality',
        labelRu: 'Когда у вас боль или плохое самочувствие, как вы реагируете на движение?',
        labelInternal: 'motion aggravation vs amelioration continued',
        clinicalMeaning: 'Bryonia — любое движение усиливает. Rhus-t — сначала тяжело, но если расходиться — легче.',
        whyItMatters: 'Главное противопоставление. Бинарный выбор.',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'a', labelRu: 'Любое движение усиливает боль, хочется лежать и не шевелиться',
            effect: 'supports_a', confidenceWeight: 1.0,
            mappedSymptoms: [
              { canonicalKey: 'MOTION_AGGRAVATION', rubric: 'worse motion any lies still', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'agg' } },
            ] },
          { id: 'b', labelRu: 'Сначала двигаться тяжело, но если расходиться — становится легче',
            effect: 'supports_b', confidenceWeight: 1.0,
            mappedSymptoms: [
              { canonicalKey: 'AMELIORATION_CONTINUED_MOTION', rubric: 'stiffness joints worse first motion better continued', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'amel' } },
            ] },
          { id: 'none', labelRu: 'Не могу сказать / не замечал(а)',
            effect: 'neutral', confidenceWeight: 0, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 5. Colocynthis vs Magnesia phosphorica ═══
  {
    pairId: 'coloc_mag-p', remedyA: 'coloc', remedyB: 'mag-p',
    status: 'verified', priority: 3, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'COLOC_MAGP_CAUSE', type: 'symptom',
        labelRu: 'Было ли что-то эмоциональное перед началом боли?',
        labelInternal: 'etiology emotional vs none',
        clinicalMeaning: 'Colocynthis — боль после гнева, обиды, унижения. Mag-p — без причины.',
        whyItMatters: 'Этиология — ключевое отличие этих препаратов',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'after_anger', labelRu: 'Да — боль возникла после ссоры, гнева, обиды или возмущения',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'AILMENTS_ANGER', rubric: 'ailments from anger indignation', weight: 3, category: 'mental' }] },
          { id: 'no_cause', labelRu: 'Нет — боль возникла без эмоциональной причины, просто спазмы',
            effect: 'supports_b', confidenceWeight: 0.7,
            mappedSymptoms: [{ canonicalKey: 'PAIN_SPASMODIC_NO_CAUSE', rubric: 'pain cramping spasmodic no emotional cause', weight: 2, category: 'particular' }] },
          { id: 'cause_unclear', labelRu: 'Не уверен / сложно сказать',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 6. Hepar vs Chamomilla ═══
  {
    pairId: 'cham_hep', remedyA: 'hep', remedyB: 'cham',
    status: 'verified', priority: 3, source: 'Kent',
    discriminators: [
      {
        id: 'HEP_CHAM_SITUATION', type: 'behavior',
        labelRu: 'Что больше описывает ситуацию?',
        labelInternal: 'cold sensitivity vs pain intolerance',
        clinicalMeaning: 'Hepar — хуже от малейшего холода и сквозняка. Cham — невыносимая боль, ребёнок успокаивается только на руках.',
        whyItMatters: 'Разный ведущий симптом при похожей раздражительности',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'cold_worse', labelRu: 'Главная проблема — крайняя чувствительность к холоду, любой сквозняк ухудшает',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'CHILLY_EXTREME', rubric: 'chilly extreme sensitive cold draft', weight: 3, category: 'general', modality: { pairId: 'heat_cold', value: 'amel' } }] },
          { id: 'pain_intolerable', labelRu: 'Главная проблема — невыносимая боль, кричит, ничего не помогает кроме ношения на руках',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'PAIN_INTOLERABLE', rubric: 'oversensitive pain intolerance screaming carried ameliorates', weight: 3, category: 'mental' }] },
          { id: 'both_present', labelRu: 'И холод хуже, и боль невыносимая — оба присутствуют',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 7. Dulcamara vs Natrum sulph ═══
  {
    pairId: 'dulc_nat-s', remedyA: 'dulc', remedyB: 'nat-s',
    status: 'verified', priority: 4, source: 'Kent, Boericke',
    discriminators: [
      {
        id: 'DULC_NATS_HEAD', type: 'symptom',
        labelRu: 'Были ли в прошлом серьёзные травмы головы?',
        labelInternal: 'head injury sequelae',
        clinicalMeaning: 'Nat-s — один из главных препаратов при последствиях ЧМТ. Dulc — нет такой связи.',
        whyItMatters: 'Уникальный keynote Nat-s',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'head_injury_yes', labelRu: 'Да, были травмы головы — и после них здоровье ухудшилось',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'HEAD_INJURY', rubric: 'ailments from head injury concussion', weight: 3, category: 'general' }] },
          { id: 'head_injury_no', labelRu: 'Нет, серьёзных травм головы не было',
            effect: 'supports_a', confidenceWeight: 0.4,
            mappedSymptoms: [{ canonicalKey: 'NO_HEAD_INJURY', rubric: 'worse damp cold weather', weight: 1, category: 'general' }] },
          { id: 'head_injury_unsure', labelRu: 'Были травмы, но не уверен что связаны с текущими жалобами',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 8. Phosphorus vs Pulsatilla ═══
  {
    pairId: 'phos_puls', remedyA: 'phos', remedyB: 'puls',
    status: 'verified', priority: 3, source: 'Kent',
    discriminators: [
      {
        id: 'PHOS_PULS_THIRST', type: 'thirst',
        labelRu: 'Как с жаждой?',
        labelInternal: 'thirst vs thirstless',
        clinicalMeaning: 'Phos — сильная жажда холодной воды. Puls — практически без жажды.',
        whyItMatters: 'Противоположные general симптомы — разводит надёжно',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'thirst_cold', labelRu: 'Пьёт много, особенно холодную воду — прямо тянет к холодному',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'THIRST_LARGE_COLD', rubric: 'thirst large quantities cold water', weight: 3, category: 'general' }] },
          { id: 'thirstless', labelRu: 'Почти не пьёт, жажды нет, приходится заставлять себя',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'THIRSTLESS', rubric: 'thirstless', weight: 2, category: 'general' }] },
          { id: 'thirst_moderate', labelRu: 'Пьёт умеренно, ничего особенного',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 9. Calcarea vs Sulphur ═══
  {
    pairId: 'calc_sulph', remedyA: 'calc', remedyB: 'sulph',
    status: 'verified', priority: 2, source: 'Kent, Vithoulkas',
    discriminators: [
      {
        id: 'CALC_SULPH_THERMAL', type: 'thermal',
        labelRu: 'Пациент мёрзнет или ему жарко?',
        labelInternal: 'chilly vs hot',
        clinicalMeaning: 'Calc — зябкий, мёрзнет. Sulph — жаркий, высовывает ноги из-под одеяла.',
        whyItMatters: 'Противоположная термика — один из самых надёжных discriminators',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'chilly', labelRu: 'Мёрзнет, зябкий, хуже от холода, кутается',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'CHILLY', rubric: 'chilly', weight: 2, category: 'general', modality: { pairId: 'heat_cold', value: 'amel' } }] },
          { id: 'hot', labelRu: 'Жаркий, не переносит тепло, раскрывается ночью, высовывает ноги',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'HOT_PATIENT', rubric: 'hot patient burning feet uncovers', weight: 3, category: 'general', modality: { pairId: 'heat_cold', value: 'agg' } }] },
          { id: 'thermal_mixed', labelRu: 'Ни то ни сё — иногда мёрзнет, иногда жарко',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 10. Carcinosinum vs Pulsatilla ═══
  {
    pairId: 'carc_puls', remedyA: 'carc', remedyB: 'puls',
    status: 'verified', priority: 3, source: 'Vithoulkas, NESH',
    discriminators: [
      {
        id: 'CARC_PULS_EMOTIONS', type: 'behavior',
        labelRu: 'Как выражает эмоции и недовольство?',
        labelInternal: 'suppression vs open expression',
        clinicalMeaning: 'Carc — подавляет, угождает, не показывает. Puls — открыто плачет, ищет внимания.',
        whyItMatters: 'Разный способ эмоциональной регуляции',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'suppresses', labelRu: 'Держит в себе, старается не расстраивать других, терпит',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'EMOTIONS_SUPPRESSED', rubric: 'emotions suppressed from childhood pleasing others', weight: 3, category: 'mental' }] },
          { id: 'open_cries', labelRu: 'Легко плачет, ищет утешения и внимания — хочет чтобы пожалели',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'WEEPING_EASILY', rubric: 'weeping easily consolation ameliorates', weight: 2, category: 'mental', modality: { pairId: 'consolation', value: 'amel' } }] },
          { id: 'emotions_mixed', labelRu: 'Бывает и то и другое — иногда терпит, иногда плачет',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },
]

// =====================================================================
// Функции поиска
// =====================================================================

function normRemedy(s: string): string {
  return s.toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-')
}

export function findKnownDiscriminators(top1: string, alt: string): DifferentialPairKB | null {
  const a = normRemedy(top1)
  const b = normRemedy(alt)
  for (const pair of DISCRIMINATOR_KB) {
    if ((pair.remedyA === a && pair.remedyB === b) || (pair.remedyA === b && pair.remedyB === a)) {
      return pair
    }
  }
  return null
}

export function selectFromKB(
  pair: DifferentialPairKB,
  existingSymptoms: { rubric: string }[],
  existingModalities: { pairId: string }[],
): Discriminator | null {
  const available = pair.discriminators.filter(d => {
    for (const opt of d.options) {
      if (opt.effect === 'neutral') continue
      for (const ms of opt.mappedSymptoms) {
        if (ms.modality && existingModalities.some(m => m.pairId === ms.modality!.pairId)) return false
        const firstWord = ms.rubric.split(' ')[0]
        if (existingSymptoms.some(s => s.rubric.toLowerCase().includes(firstWord))) return false
      }
    }
    return true
  })

  if (available.length === 0) return null

  available.sort((a, b) => {
    if (a.evidenceLevel !== b.evidenceLevel) return a.evidenceLevel === 'high' ? -1 : 1
    if (a.falsePositiveRisk !== b.falsePositiveRisk) return a.falsePositiveRisk === 'low' ? -1 : 1
    return 0
  })

  return available[0]
}
