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
// Knowledge Base — 16 пар (10 эталонных + 6 новых по анализу ошибок)
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
        id: 'NATM_SEP_CONSOLATION', type: 'behavior',
        labelRu: 'Когда близкие пытаются вас поддержать или утешить, какая ваша первая реакция?',
        labelInternal: 'aversion consolation vs emotional indifference',
        clinicalMeaning: 'Nat-m — утешение активно ухудшает, хочет закрыться. Sep — нет отклика, безразличие, не включается.',
        whyItMatters: 'Активное отторжение vs отсутствие реакции. Разные механизмы.',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'a', labelRu: 'Становится хуже, хочется закрыться и чтобы меня оставили в покое',
            effect: 'supports_a', confidenceWeight: 1.0,
            mappedSymptoms: [
              { canonicalKey: 'AVERSION_CONSOLATION', rubric: 'consolation aggravates', weight: 3, category: 'mental', modality: { pairId: 'consolation', value: 'agg' } },
            ] },
          { id: 'b', labelRu: 'Просто нет отклика, как будто всё равно, не хочется включаться',
            effect: 'supports_b', confidenceWeight: 1.0,
            mappedSymptoms: [
              { canonicalKey: 'EMOTIONAL_INDIFFERENCE', rubric: 'indifference family husband children', weight: 3, category: 'mental' },
            ] },
          { id: 'none', labelRu: 'Не могу сказать / не замечал(а)',
            effect: 'neutral', confidenceWeight: 0, mappedSymptoms: [] },
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
              { canonicalKey: 'REST_AMELIORATION', rubric: 'better rest lying perfectly still', weight: 2, category: 'general' },
            ] },
          { id: 'b', labelRu: 'Сначала двигаться тяжело, но если расходиться — становится легче',
            effect: 'supports_b', confidenceWeight: 1.0,
            mappedSymptoms: [
              { canonicalKey: 'AMELIORATION_CONTINUED_MOTION', rubric: 'stiffness joints worse first motion better continued', weight: 3, category: 'general', modality: { pairId: 'motion_rest', value: 'amel' } },
              { canonicalKey: 'RESTLESSNESS_MUST_MOVE', rubric: 'restlessness cannot lie still must move', weight: 2, category: 'mental' },
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
      {
        id: 'COLOC_MAGP_SIDE', type: 'symptom',
        labelRu: 'С какой стороны боль сильнее?',
        labelInternal: 'laterality coloc right vs mag-p no side',
        clinicalMeaning: 'Colocynthis — правая сторона живота/яичника (Nash). Mag-p — блуждающие спазмы без определённой стороны.',
        whyItMatters: 'Правосторонность — характерный признак Coloc',
        evidenceLevel: 'medium', falsePositiveRisk: 'medium',
        options: [
          { id: 'pain_right', labelRu: 'Справа — боль в правом боку, правый яичник, правая сторона живота',
            effect: 'supports_a', confidenceWeight: 0.6,
            mappedSymptoms: [{ canonicalKey: 'RIGHT_SIDE', rubric: 'right side complaints abdomen', weight: 2, category: 'general' }] },
          { id: 'pain_no_side', labelRu: 'Без определённой стороны — спазмы блуждающие, то там то тут',
            effect: 'supports_b', confidenceWeight: 0.5,
            mappedSymptoms: [] },
          { id: 'pain_side_unclear', labelRu: 'Не обращал внимания на сторону',
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
      {
        id: 'DULC_NATS_ASTHMA', type: 'symptom',
        labelRu: 'Есть ли проблемы с дыханием, одышка или астма?',
        labelInternal: 'asthma damp weather nat-s keynote',
        clinicalMeaning: 'Nat-s — астма хуже в сырую погоду (Boericke keynote). Dulc — кожные/суставные без дыхательных.',
        whyItMatters: 'Астма от сырости — keynote Nat-s',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'asthma_damp', labelRu: 'Да — одышка или астма, хуже в сырую погоду',
            effect: 'supports_b', confidenceWeight: 0.8,
            mappedSymptoms: [{ canonicalKey: 'ASTHMA_DAMP', rubric: 'asthma worse damp weather', weight: 3, category: 'particular' }] },
          { id: 'no_respiratory', labelRu: 'Нет — только кожные или суставные проблемы от сырости',
            effect: 'supports_a', confidenceWeight: 0.5,
            mappedSymptoms: [] },
          { id: 'respiratory_unclear', labelRu: 'Не знаю / не связано с погодой',
            effect: 'neutral', confidenceWeight: 0.1, mappedSymptoms: [] },
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

  // ═══ 11. Carcinosinum vs Phosphorus ═══
  // Nash: Phos leading symptom №2 = "thirst for large quantities of cold water"
  {
    pairId: 'carc_phos', remedyA: 'carc', remedyB: 'phos',
    status: 'verified', priority: 1, source: 'Nash Leaders, Kent MM',
    discriminators: [
      {
        id: 'CARC_PHOS_THIRST', type: 'thirst',
        labelRu: 'Как пьёт воду?',
        labelInternal: 'thirst pattern carc vs phos',
        clinicalMeaning: 'Phosphorus — сильнейшая жажда холодной воды большими глотками. Carc — без keynote жажды.',
        whyItMatters: 'Жажда холодной воды — один из самых надёжных дифференциаторов Phos',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'thirst_large_cold', labelRu: 'Сильная жажда — пьёт много, холодную воду большими глотками',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'THIRST_LARGE_COLD', rubric: 'thirst large quantities cold water', weight: 3, category: 'general' }] },
          { id: 'thirst_moderate', labelRu: 'Пьёт умеренно, ничего особенного с жаждой',
            effect: 'supports_a', confidenceWeight: 0.5,
            mappedSymptoms: [] },
          { id: 'thirst_unknown', labelRu: 'Не знаю / не замечал',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
      {
        id: 'CARC_PHOS_BLEEDING', type: 'symptom',
        labelRu: 'Есть ли склонность к кровотечениям?',
        labelInternal: 'bleeding tendency phos',
        clinicalMeaning: 'Phosphorus — яркие красные кровотечения (нос, дёсны). Carc — нет такого keynote.',
        whyItMatters: 'Кровоточивость — важный конституционный признак Phos',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'bleeding_yes', labelRu: 'Да — легко кровоточит: нос, дёсны, порезы долго кровят',
            effect: 'supports_b', confidenceWeight: 0.7,
            mappedSymptoms: [{ canonicalKey: 'BLEEDING_EASY', rubric: 'hemorrhage bright red easy bleeding', weight: 2, category: 'general' }] },
          { id: 'bleeding_no', labelRu: 'Нет — обычная свёртываемость',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 12. Carcinosinum vs Aurum ═══
  // Kent: Aur = "thinks he has sinned away his day of grace"
  {
    pairId: 'carc_aur', remedyA: 'carc', remedyB: 'aur',
    status: 'verified', priority: 1, source: 'Kent Lectures, Tyler Drug Pictures',
    discriminators: [
      {
        id: 'CARC_AUR_GUILT', type: 'behavior',
        labelRu: 'Какое чувство вины преобладает?',
        labelInternal: 'guilt type carc vs aur',
        clinicalMeaning: 'Aurum — глубокая религиозная вина, ощущение греха. Carc — перфекционизм, "я недостаточно хорош".',
        whyItMatters: 'Тип вины определяет глубину патологии и средство',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'guilt_religious', labelRu: 'Религиозная — "я согрешил", "я заслуживаю наказания", "я подвёл Бога"',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'GUILT_RELIGIOUS', rubric: 'guilt religious feeling sinned', weight: 3, category: 'mental' }] },
          { id: 'guilt_perfectionism', labelRu: 'Перфекционизм — "я недостаточно стараюсь", "всё должно быть идеально"',
            effect: 'supports_a', confidenceWeight: 0.7,
            mappedSymptoms: [{ canonicalKey: 'PERFECTIONISM', rubric: 'perfectionist responsible self-critical', weight: 2, category: 'mental' }] },
          { id: 'guilt_mixed', labelRu: 'И то и другое или неясно',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
      {
        id: 'CARC_AUR_SUICIDAL', type: 'behavior',
        labelRu: 'Есть ли мысли что жизнь не имеет смысла?',
        labelInternal: 'suicidal ideation aur',
        clinicalMeaning: 'Aurum — суицидальные мысли как leading symptom. Carc — подавление но без суицидальности.',
        whyItMatters: 'Суицидальность — ключевой признак Aur (Kent)',
        evidenceLevel: 'high', falsePositiveRisk: 'medium',
        options: [
          { id: 'suicidal_yes', labelRu: 'Да — мысли о суициде, жизнь бессмысленна',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'SUICIDAL', rubric: 'suicidal disposition despair life', weight: 3, category: 'mental' }] },
          { id: 'suicidal_no', labelRu: 'Нет — таких мыслей нет',
            effect: 'supports_a', confidenceWeight: 0.4, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 13. Arsenicum vs Argentum nitricum ═══
  // Boericke: Ars = "fear of death, thinks it useless to take medicine"
  // Allen: Arg-n = "thinks he will fail, time passes too slowly"
  {
    pairId: 'ars_arg-n', remedyA: 'ars', remedyB: 'arg-n',
    status: 'verified', priority: 2, source: 'Boericke, Allen Keynotes',
    discriminators: [
      {
        id: 'ARS_ARGN_ANXIETY', type: 'behavior',
        labelRu: 'О чём именно тревога?',
        labelInternal: 'anxiety type ars vs arg-n',
        clinicalMeaning: 'Arsenicum — ипохондрия, тревога за здоровье. Arg-n — anticipation перед событиями.',
        whyItMatters: 'Тип тревоги — главный дифференциатор',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'anxiety_health', labelRu: 'За здоровье — боится серьёзной болезни, проверяет симптомы',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'ANXIETY_HEALTH', rubric: 'anxiety health hypochondria', weight: 3, category: 'mental' }] },
          { id: 'anxiety_anticipation', labelRu: 'Перед событием — экзамен, выступление, встреча, собеседование',
            effect: 'supports_b', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'ANTICIPATION', rubric: 'anticipation anxiety before events', weight: 3, category: 'mental' }] },
          { id: 'anxiety_both', labelRu: 'И то и другое — тревожится обо всём',
            effect: 'neutral', confidenceWeight: 0.3, mappedSymptoms: [] },
        ],
      },
      {
        id: 'ARS_ARGN_SWEETS', type: 'symptom',
        labelRu: 'Тянет ли на сладкое?',
        labelInternal: 'desire sweets arg-n keynote',
        clinicalMeaning: 'Arg-n — выраженное желание сладкого. Ars — нет такого keynote.',
        whyItMatters: 'Desire sweets — один из keynotes Arg-n (Allen)',
        evidenceLevel: 'medium', falsePositiveRisk: 'medium',
        options: [
          { id: 'sweets_yes', labelRu: 'Да — очень тянет на сладкое',
            effect: 'supports_b', confidenceWeight: 0.6,
            mappedSymptoms: [{ canonicalKey: 'DESIRE_SWEETS', rubric: 'desire sweets sugar', weight: 2, category: 'general' }] },
          { id: 'sweets_no', labelRu: 'Нет — обычное отношение к сладкому',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 14. Spongia vs Drosera ═══
  // Nash: Spong = "croup, dry barking cough, < before midnight"
  // Nash: Dros = "paroxysmal cough ending in gagging/vomiting"
  {
    pairId: 'spong_dros', remedyA: 'spong', remedyB: 'dros',
    status: 'verified', priority: 2, source: 'Nash Leaders',
    discriminators: [
      {
        id: 'SPONG_DROS_COUGH', type: 'symptom',
        labelRu: 'Какой кашель и когда хуже?',
        labelInternal: 'cough character and timing',
        clinicalMeaning: 'Spongia — лающий сухой кашель, хуже до полуночи. Drosera — приступообразный до рвоты, хуже после полуночи.',
        whyItMatters: 'Время и характер кашля — ключевое отличие',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'cough_barking_before', labelRu: 'Сухой лающий как тюлень — хуже вечером или до полуночи',
            effect: 'supports_a', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'COUGH_BARKING', rubric: 'cough dry barking croup worse before midnight', weight: 3, category: 'particular' }] },
          { id: 'cough_paroxysmal_after', labelRu: 'Приступами до рвоты — хуже ночью после полуночи, длинные серии',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'COUGH_PAROXYSMAL', rubric: 'cough paroxysmal gagging vomiting worse after midnight', weight: 3, category: 'particular' }] },
          { id: 'cough_other', labelRu: 'Другой характер кашля',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 15. Silicea vs Baryta carbonica ═══
  // Kent: Sil = "refined, yielding but obstinate". Nash: Bar-c = "mental weakness most prominent"
  {
    pairId: 'sil_bar-c', remedyA: 'sil', remedyB: 'bar-c',
    status: 'verified', priority: 2, source: 'Kent Lectures, Nash Leaders',
    discriminators: [
      {
        id: 'SIL_BARC_INTELLECT', type: 'behavior',
        labelRu: 'Каков интеллект ребёнка?',
        labelInternal: 'intellectual development sil vs bar-c',
        clinicalMeaning: 'Silicea — умный но хрупкий, робкий, не уверен в себе. Bar-c — реально отстаёт интеллектуально.',
        whyItMatters: 'Уровень интеллекта — главный дифференциатор (Nash)',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'intellect_normal', labelRu: 'Умный но робкий — хорошо учится, но боится отвечать, хрупкий, тонкий',
            effect: 'supports_a', confidenceWeight: 0.85,
            mappedSymptoms: [{ canonicalKey: 'REFINED_YIELDING', rubric: 'refined yielding sensitive intellectual', weight: 2, category: 'mental' }] },
          { id: 'intellect_slow', labelRu: 'Отстаёт — поздно пошёл, поздно заговорил, трудно учится',
            effect: 'supports_b', confidenceWeight: 0.9,
            mappedSymptoms: [{ canonicalKey: 'SLOW_DEV', rubric: 'slow development late walking talking', weight: 3, category: 'general' }] },
          { id: 'intellect_unclear', labelRu: 'Трудно оценить / средний уровень',
            effect: 'neutral', confidenceWeight: 0.2, mappedSymptoms: [] },
        ],
      },
    ],
  },

  // ═══ 16. Iodum vs Tuberculinum ═══
  // Allen: Tub = "desire to travel, constant change". Boericke: Iod = "great emaciation, eats well but loses flesh"
  {
    pairId: 'iod_tub', remedyA: 'iod', remedyB: 'tub',
    status: 'verified', priority: 3, source: 'Allen Keynotes, Boericke',
    discriminators: [
      {
        id: 'IOD_TUB_FAMILY', type: 'symptom',
        labelRu: 'Есть ли туберкулёз в семейном анамнезе?',
        labelInternal: 'family history TB',
        clinicalMeaning: 'Tub — нозод, семейная история ТБ критически важна. Iod — без привязки к ТБ.',
        whyItMatters: 'ТБ в семье — sine qua non для Tub',
        evidenceLevel: 'high', falsePositiveRisk: 'low',
        options: [
          { id: 'tb_family_yes', labelRu: 'Да — ТБ у родителей, бабушек, дедушек',
            effect: 'supports_b', confidenceWeight: 0.8,
            mappedSymptoms: [] },
          { id: 'tb_family_no', labelRu: 'Нет — нет ТБ в семье',
            effect: 'neutral', confidenceWeight: 0.3, mappedSymptoms: [] },
        ],
      },
      {
        id: 'IOD_TUB_TRAVEL', type: 'behavior',
        labelRu: 'Есть ли сильная тяга к путешествиям?',
        labelInternal: 'desire to travel tub keynote',
        clinicalMeaning: 'Tub — желание путешествовать, не сидит на месте. Iod — нет такого keynote.',
        whyItMatters: 'Desire travel — один из ключевых признаков Tub (Allen)',
        evidenceLevel: 'medium', falsePositiveRisk: 'medium',
        options: [
          { id: 'travel_strong', labelRu: 'Да — не может сидеть на месте, постоянно хочет куда-то ехать',
            effect: 'supports_b', confidenceWeight: 0.7,
            mappedSymptoms: [{ canonicalKey: 'DESIRE_TRAVEL', rubric: 'desire travel constant change', weight: 3, category: 'mental' }] },
          { id: 'travel_no', labelRu: 'Нет — обычное отношение к поездкам',
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
