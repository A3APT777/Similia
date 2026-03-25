# MDRI v5 — Полная документация системы AI-анализа

> Этот документ содержит полное описание системы MDRI v5, достаточное для воссоздания с нуля.
> Версия: v5, зафиксирована 23.03.2026, git tag: `mdri-v5-final`
> Результаты: Top-1 76%, Top-3 92%, Top-5 94%, Top-10 96% (50 кейсов)

---

## Оглавление

1. [Архитектура](#1-архитектура)
2. [Типы данных](#2-типы-данных)
3. [Engine Core — Pipeline](#3-engine-core)
4. [Scoring — 6 линз](#4-scoring)
5. [findRubrics — поиск рубрик](#5-findrubrics)
6. [symMatch — сопоставление симптомов](#6-symmatch)
7. [Product Safety Layer](#7-product-safety-layer)
8. [AI Integration (Sonnet/Opus)](#8-ai-integration)
9. [Profile Inference](#9-profile-inference)
10. [UI Layer](#10-ui-layer)
11. [Данные](#11-данные)
12. [Полный Flow](#12-полный-flow)
13. [Константы и пороги](#13-константы-и-пороги)
14. [Известные ограничения](#14-известные-ограничения)
15. [Файловая структура](#15-файловая-структура)

---

## 1. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    ВХОД: Русский текст                  │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
     ┌────────▼────────┐        ┌────────▼────────┐
     │  Sonnet Parsing  │        │ Keyword Fallback │
     │  (claude-sonnet)  │        │  (27 правил)     │
     └────────┬────────┘        └────────┬────────┘
              │                           │
         ┌────▼───────────────────────────▼────┐
         │           MERGE + Validation         │
         │   (конфликты → warning, не override) │
         └─────────────────┬───────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Profile Inference │
                  │  (acute/chronic,   │
                  │   vitality, age)   │
                  └────────┬────────┘
                           │
              ┌────────────▼────────────┐
              │      MDRI ENGINE v5      │
              │                          │
              │  Filter → Selection →    │
              │  Constellation Override → │
              │  Ranking (6 линз)        │
              └────────────┬────────────┘
                           │
                  ┌────────▼────────┐
                  │ Confidence Layer │
                  │ (HIGH/GOOD/      │
                  │  CLARIFY/INSUFF) │
                  └────────┬────────┘
                           │
              ┌────────────▼────────────┐
              │    ВЫХОД: Top-10 + UI    │
              │  (remedy, score, explain) │
              └─────────────────────────┘
```

---

## 2. Типы данных

### Вход

```typescript
// Симптом с весом
type MDRISymptom = {
  rubric: string           // английский: "mind anxiety anticipation"
  category: 'mental' | 'general' | 'particular'
  present: boolean         // true=есть, false=отсутствует
  weight: 1 | 2 | 3       // 1=обычный, 2=выраженный, 3=peculiar
}

// Модальность (что ухудшает/улучшает)
type MDRIModality = {
  pairId: string           // 'heat_cold', 'motion_rest', 'consolation'...
  value: 'agg' | 'amel'   // agg=хуже, amel=лучше
}

// Профиль пациента (определяется автоматически)
type MDRIPatientProfile = {
  acuteOrChronic: 'acute' | 'chronic'
  vitality: 'high' | 'medium' | 'low'
  sensitivity: 'high' | 'medium' | 'low'
  age: 'child' | 'adult' | 'elderly'
}
```

### Выход

```typescript
type MDRIResult = {
  remedy: string              // 'sulph', 'nat-m', 'lyc'
  remedyName: string          // 'Sulphur'
  totalScore: number          // 0-100
  confidence: 'high' | 'medium' | 'low' | 'insufficient'
  lenses: MDRILensResult[]    // 6 линз анализа
  potency: { potency: string; frequency: string; reasoning: string } | null
  miasm: string | null        // 'psoric', 'sycotic', 'syphilitic', 'tubercular'
  relationships: { follows_well?, complementary?, antidotes?, inimical? } | null
  differential: { rivalRemedy, rivalScore, differentiatingQuestion } | null
  matchedRubrics?: string[]   // совпавшие рубрики из реперторий
}

type ConsensusResult = {
  method: 'consensus' | 'sonnet_priority' | 'opus_arbiter'
  finalRemedy: string
  mdriResults: MDRIResult[]
  productConfidence?: { level, label, color, showDiff, showAsEqual }
  warnings?: { type, message, hint }[]
  inferredProfile?: InferredProfile
  usedSymptoms?: { label, type }[]
  cost: number                // ~$0.01 (Sonnet) или ~$0.06 (+Opus)
}
```

---

## 3. Engine Core

### Главная функция: `analyzePipeline()`

```
analyzePipeline(data, symptoms, modalities, familyHistory, profile) → MDRIResult[]
```

### Stage 1: FILTER — бинарное отсечение

Убирает препараты, которые ТОЧНО не подходят:
- **Термика**: chilly пациент → exclude hot препараты, и наоборот
- **Consolation**: agg → exclude amel препараты
- **Motion**: agg → exclude amel
- **Excluders**: из constellation data

### Stage 2: SELECTION v4 — 3 правила входа в candidates

Каждый симптом классифицируется:
- **CHARACTERISTIC** (charWeight > 0): модальности, термика, жажда, mental weight≥2, peculiar weight=3
- **COMMON** (charWeight = 0): headache, cough, weakness...

```
charWeight(symptom):
  weight >= 3           → 3 (peculiar)
  mental && weight >= 2 → 2 (strong mental)
  agg/amel/worse/better → 1 (модальность)
  chilly/hot/thirst     → 1 (термика)
  consolat/company      → 1 (полярные)
  desire/aversion       → 1 (пищевые)
  иначе                 → 0 (common)
```

**3 правила:**
1. **charHits ≥ 1 + commonHits ≥ 1** → candidate (если charHits≥2 или подтверждён general рубрикой)
2. **charHits ≥ 2** → candidate (2+ характеристики без common)
3. **commonHits ≥ 4 + domains ≥ 2** → candidate (широкое покрытие без характеристик)

### Stage 2.5: CONSTELLATION OVERRIDE

Если препарат имеет strong constellation match (cs ≥ 0.3) но НЕ прошёл Selection → inject в candidates.
Решает разрыв: constellation знает что подходит, findRubrics не находит.

### Stage 3: RANKING v5

```
kfSoft = pow(kentScore, 0.8)        // soft cap на kent
hsSoft = pow(hierarchyScore, 0.8)
baseScore = 0.5 * kfSoft + 0.5 * hsSoft

total = baseScore * (1 + 0.6 * cs) * (0.94 + pol * 0.12)
```

- **Constellation УСИЛИВАЕТ** score (mult 1.0..1.6), не перераспределяет
- **Polarity**: мягкий mult 0.94..1.06
- **pow(0.8)**: сужает преимущество полихрестов без потери дифференциации

**cs penalty (необходим):**
Если есть кандидат с cs>40%, препараты с cs<15% получают penalty 0.65..0.88.
Без penalty: kent gap 2.5x > constellation mult 1.6x → cs=0 побеждает.

---

## 4. Scoring — 6 линз

### 4.1 Kent Score (реперториум)

```
Для каждого present симптома:
  rubrics = findRubrics(symptom.rubric)
  Для каждой рубрики:
    idf = pow(log2(2432 / rubricSize), 1.8)
    Для каждого remedy:
      effectiveIdf = grade >= 2 ? idf : min(idf, 30)  // Grade 1 cap
      scores[remedy] += grade * symptomWeight * effectiveIdf

Anti-domination:
  Для каждого remedy с count > 100:
    penalty = 1 / (1 + pow(count / 3000, 0.8))
    scores[remedy] *= penalty

Нормализация: scores[remedy] /= maxScore
```

**Anti-domination значения:**
| Препарат | Рубрик | Penalty |
|----------|--------|---------|
| Sulph | 12000 | 0.23 |
| Phos | 10000 | 0.27 |
| Lyc | 9700 | 0.28 |
| Calc | 8800 | 0.30 |
| Cham | 4600 | 0.45 |
| Gels | 2700 | 0.52 |
| Carc | 1200 | 0.72 |

### 4.2 Hierarchy Score

Та же формула что Kent, но с весами категорий:
```
categoryWeight = { mental: 3, general: 2, particular: 1 }
symptomWeight = categoryWeight[category] * weight
```

### 4.3 Constellation Score (характерные паттерны)

```
Для каждого remedy с constellation data:
  Для каждого cluster:
    Для каждого симптома в cluster:
      rarity = 1.0 + min(wordCount - 1, 3) * 0.2
      w = symWeight * rarity * cluster.importance

      если full match:   weightedMatch += w
      если partial match: weightedMatch += w * 0.3

  score = weightedMatch / weightedTotal

  // SQN (sine qua non) бонус
  score += (sqnMatched / sqnTotal) * 0.15
```

### 4.4 Polarity Score (модальности)

```
Для каждого remedy:
  matches = 0, conflicts = 0, total = 0

  Для каждой модальности пациента:
    if remedy has this polarity:
      total++
      if совпадает → matches++
      if противоречит → conflicts++

  if total == 0: score = 0.35 (нет данных, лёгкий штраф)
  else: score = (matches - conflicts) / total → [0..1]
```

### 4.5 Negative Score (отсутствие)

- Штрафует если absent симптом = sine_qua_non для remedy (−0.5)
- Штрафует если absent = excluder (−0.3)
- Поощряет если absent подтверждает отрицание (thirst absent → thirstless +0.1)

### 4.6 Miasm Score (наследственность)

```
Семейный анамнез → определить доминантный миазм
  tuberculosis → tubercular
  cancer → carcinosinum
  psoriasis → psoric

Доминантный миазм:
  nosode = 0.95, key remedies = 0.70
Другие:
  bonus пропорционально count
```

### Веса линз

```
kent:          0.30  (реперториум — основа)
constellation: 0.25  (паттерны — дифференциация)
hierarchy:     0.20  (иерархия Геринга)
polarity:      0.15  (модальности)
negative:      0.05  (отсутствие)
miasm:         0.05  (наследственность, если есть)
```

---

## 5. findRubrics — поиск рубрик

4 слоя (recall-first):

### Слой 1: SEMANTIC_MAP (приоритет)
270 маппингов: `"grief suppressed" → ["mind, grief, silent"]`

### Слой 2: Union word search
Каждое слово → candidates через wordIndex. Score by overlap (сколько слов совпало).

### Слой 3: Synonym expansion
Через SYNONYM_WORD_INDEX → дополнительные рубрики.

### Слой 4: Taxonomy Parser
`parseSymptom() → buildRubricPaths() → search`

**Размер рубрики bonus:** 3-15 remedies = +20, 200+ = +2
Возвращает **top-10 рубрик**.

---

## 6. symMatch — сопоставление симптомов

Phrase-level matching с защитой от false positives:

1. **Phrase-level:** 2-word target нужно ≥1 specific (≥5 chars) match
2. **Stem:** common prefix ≥5 chars. "violent"~"violence" ✓, "head"≠"headache" ✗
3. **Antonym protection:** suffix "-less" блокирует. "thirst"≠"thirstless"
4. **Synonym:** только через ПОЛНЫЙ ключ SYNONYM_MAP, не по одному слову
5. **Фильтр:** ≥1 слово ≥5 chars. "cold agg" (3+3) не триггерит

Результат: 53/55 тестов (0 false positives).

---

## 7. Product Safety Layer

### Keyword Fallback (27 правил)

Параллельно Sonnet-парсингу сканирует ИСХОДНЫЙ русский текст:

```
'зябк'              → chilly, general, weight=2, heat_cold:amel
'жарк'              → hot patient, general, weight=2, heat_cold:agg
'утешение хуже'     → consolation aggravates, mental, weight=3
'движение хуже'     → motion_rest:agg
'раздражител'       → irritability, mental, weight=2
'тревог'            → anxiety, mental, weight=2
'мелкими глотк'     → thirst small sips, weight=3
'нет жажды'         → thirstless, weight=2
'на море лучше'     → better at sea, weight=3
'потеет голова'     → perspiration head night, weight=3
```

**Merge логика:**
- Sonnet rubric найден → keyword не добавляем
- Конфликт модальности → warning "uncertain_parse", НЕ override

### Confidence Layer

```
HIGH (зелёный):
  gap top1-top2 ≥ 15%
  charStrength ≥ 2 (mental w≥2 или peculiar w=3)
  есть модальности
  покрыто ≥ 3 категории
  warnings ≤ 1
  нет конфликта парсинга

GOOD (синий):
  gap ≥ 10% ИЛИ charStrength ≥ 1
  warnings ≤ 2

CLARIFY (жёлтый):
  gap < 10% ИЛИ charStrength = 0 ИЛИ warnings ≥ 3

INSUFFICIENT (серый):
  symptoms < 3 ИЛИ нет mental+general
```

**Правило:** при конфликте парсинга HIGH невозможен, максимум GOOD.

### Soft Validation (warnings)

```
few_symptoms:     < 3 симптомов
no_modalities:    нет модальностей
no_mental:        нет mental симптомов
no_general:       нет general симптомов
uncertain_parse:  конфликт Sonnet vs keyword
```

---

## 8. AI Integration

### АКТУАЛЬНЫЙ pipeline (на сервисе сейчас)

**Основной flow (analyzeText + analyzeConfirmed):**
- Используется ТОЛЬКО Sonnet для ПАРСИНГА текста
- Engine v5 считает результат
- Sonnet-гомеопат и Opus арбитр НЕ ВЫЗЫВАЮТСЯ
- Cost: ~$0.01 за анализ (1 вызов Sonnet)
- Method всегда: `'consensus'`

**Старый flow (analyzeCase + buildConsensus):**
- Используется только из старого ConsultationEditor "по карточке"
- Вызывает Sonnet-гомеопата параллельно MDRI
- При разногласии — вызывает Opus арбитра ($0.06)
- Постепенно заменяется новым flow

### Sonnet Parsing (`parseTextWithSonnet`)

- Model: `claude-sonnet-4-20250514`
- max_tokens: 2000, temperature: 0.2
- Входит: русский текст пациента
- Выходит: `{ symptoms[], modalities[], familyHistory[] }`

### Два flow на сервисе

```
НОВЫЙ (актуальный):
  текст → Sonnet parsing → keyword fallback → merge →
  → suggestions → врач подтверждает →
  → MDRI engine v5 → confidence → результат
  Cost: $0.01, 1 API call

СТАРЫЙ (legacy):
  структурированные данные → MDRI engine v5 →
  → параллельно Sonnet гомеопат →
  → consensus / Opus arbiter
  Cost: $0.01-0.06, 1-2 API calls
```

---

## 9. Profile Inference

Автоматическое определение из текста (заменяет ручной выбор):

```
ACUTE маркеры: 'внезапн', 'резк', 'травм', 'температур', 'приступ'
CHRONIC маркеры: 'давно', 'годами', 'рецидив', 'постоянн'
confidence = min(0.9, 0.5 + hits * 0.15)

Возраст: regex /(\d+)\s*(лет|года)/ → child(<12), adult, elderly(≥65)

Витальность: LOW маркеры ('слаб', 'истощ'), HIGH ('сильн', 'энергичн')
Чувствительность: HIGH ('чувствительн', 'аллерги', 'непереносим')

Порог доверия = 0.4: если ниже → default (chronic, medium, medium, adult)
```

---

## 10. UI Layer

### SuggestionReview — подтверждение симптомов врачом

```
HIGH priority (🔥 Ключевые):
  - weight ≥ 3, mental weight ≥ 2
  - auto-confirmed = true
  - всегда видны

MEDIUM priority (🟡 Важные):
  - weight = 2, general, modality из Sonnet
  - confirmed = false
  - видны первые 3, остальные под "Ещё"

LOW priority (⚪ Остальное):
  - weight = 1, keyword-only
  - confirmed = false

Ограничения: MAX_HIGH=5, MAX_MEDIUM=7, MAX_MENTAL_HIGH=3
Если конфликт: все high → medium
```

### AIResultPanel — экран принятия решения

1. **CaseUnderstanding** — тип/витальность/чувствительность/возраст с confidence dots
2. **HeroRemedy** — TOP-1 крупно + факторы "Выбран, потому что:" + совпавшие рубрики
3. **AlternativesBlock** — TOP 2-4 с причинами "почему не подходит"
4. **DetailedComparison** — раскрываемое сравнение всех линз
5. **ClarifyBlock** — если confidence < GOOD, конкретный список что уточнить
6. **Мини-контроль** — кнопки "Изменить симптомы" и "Пересчитать"

Все объяснения на клиническом языке без процентов и чисел.

### Potency Selection

```
acute              → 30C, каждые 2-4 часа
nosode             → 200C, однократно
high sensitivity   → 12C, ежедневно 2 недели
low vitality/elderly → 30C, через день
child              → 30C, однократно
confidence ≥ 80%   → 200C, однократно
default            → 30C, однократно, наблюдение 3-4 недели
```

---

## 11. Данные

### Реперторий: `repertory.json`
- 74,482 рубрик из OpenHomeopath (Publicum)
- Carc: 1177 рубрик добавлены из Materia Medica
- Формат: `{ fullpath, chapter, remedies: [{ abbrev, grade }] }`

### Constellations: `constellations.json`
- 3096 кластеров (96 ручных + 3000 авто)
- Формат:
```json
{
  "sulph": {
    "name": "Sulphur",
    "clusters": [{
      "id": "s1", "name": "Heat and itch",
      "importance": 0.8,
      "symptoms": [{ "rubric": "skin burning itching worse warmth", "weight": 3 }]
    }],
    "sine_qua_non": ["burning heat"],
    "excluders": ["chilly"]
  }
}
```

### Polarities: `polarities.json`
- 890 препаратов, 12 полярных пар
```json
{
  "sulph": {
    "heat_cold": "agg_heat",
    "motion_rest": "amel",
    "consolation": "amel"
  }
}
```

### Clinical: `clinical.json`
- Consistency groups (core + optional conditions)
- Thermal contradictions

**КРИТИЧЕСКОЕ:** ключи в constellations/polarities = lowercase без точки (`staph`, `nat-m`).
Ключи в repertory = Capitalized с точкой (`Staph.`, `Nat-m.`).
Нормализация: `rem.toLowerCase().replace(/\.$/, '')`

---

## 12. Полный Flow (актуальный, на сервисе)

### Flow 1: AI-консультация (свободный текст) — `analyzeText()`

```
1. Врач вводит описание на русском (свободный текст)

2. ПАРАЛЛЕЛЬНО:
   ├─ Sonnet парсит текст → symptoms, modalities, familyHistory
   └─ MDRI data загружается из edge cache

3. Keyword fallback (27 правил) → merge с Sonnet
   ├─ Если Sonnet нашёл rubric → keyword не добавляем
   └─ Если конфликт модальности → warning, НЕ override

4. inferPatientProfile() → автоопределение профиля из текста
   (acute/chronic, vitality, sensitivity, age)

5. MDRI Engine v5:
   Filter → Selection → Constellation Override → Ranking

6. Confidence Layer → HIGH/GOOD/CLARIFY/INSUFFICIENT

7. Результат → UI (AIResultPanel)

Cost: ~$0.01 (1 Sonnet call)
Время: ~3-5 сек
```

### Flow 2: Двухшаговый (parse → suggest → confirm) — `parseAndSuggest()` + `analyzeConfirmed()`

```
1. Врач вводит текст

2. parseAndSuggest():
   ├─ Sonnet парсит → symptoms, modalities, familyHistory
   ├─ Keyword fallback → merge
   ├─ Validation → warnings
   ├─ Приоритизация:
   │   HIGH (weight≥3, mental w≥2) → auto-confirmed
   │   MEDIUM (weight=2, general, modality)
   │   LOW (weight=1, keyword-only)
   ├─ Post-processing:
   │   Weak filter (однословные → max medium)
   │   Cap: MAX_HIGH=5, MAX_MEDIUM=7, MAX_MENTAL_HIGH=3
   │   Conflict → all high → medium
   └─ Minimal set warnings (no general/particular/modality)

3. Врач видит SuggestionReview
   ├─ 🔥 Ключевые (HIGH) — auto-checked, всегда видны
   ├─ 🟡 Добавить к анализу (MEDIUM+LOW) — первые 3, остальные "Ещё"
   └─ Врач toggle'ит + нажимает "Анализировать"

4. analyzeConfirmed():
   ├─ Корректировка весов: high=1.0, medium=0.5, low=0.2
   ├─ MDRI Engine v5
   ├─ Confidence Layer
   └─ Логирование в ai_analysis_log:
       confirmed_input, engine_top3, confidence, warnings,
       symptom_count, modality_count, has_conflict

5. AIResultPanel:
   ├─ CaseUnderstanding (профиль + confidence dots)
   ├─ HeroRemedy (TOP-1 + совпавшие рубрики + факторы)
   ├─ Alternatives (TOP 2-4 + ✗ "почему не")
   ├─ DetailedComparison (раскрываемое по "Сравнить")
   ├─ ClarifyBlock (если confidence ≤ CLARIFY)
   └─ Мини-контроль: "Изменить симптомы и пересчитать"

6. Врач нажимает "Назначить"
   └─ logDoctorChoice(consultationId, remedy) → ai_analysis_log

Cost: ~$0.01 (1 Sonnet call для парсинга, engine бесплатен)
Время: ~3-5 сек (парсинг) + мгновенно (engine)
```

### Flow 3: Старый "по карточке" (legacy) — `analyzeCase()` + `buildConsensus()`

```
1. Структурированные данные из UI (symptoms, modalities, profile)
2. MDRI Engine v5 → top-10
3. ПАРАЛЛЕЛЬНО: Sonnet-гомеопат даёт свой выбор
4. Consensus:
   ├─ Совпали → 'consensus' ($0.01)
   ├─ Sonnet в top-3 → 'sonnet_priority' ($0.01)
   └─ Разногласие → Opus арбитр ($0.06)

Постепенно заменяется Flow 2.
```

---

## 13. Константы и пороги

```typescript
// Scoring weights
KENT_WEIGHT           = 0.30
CONSTELLATION_WEIGHT  = 0.25
HIERARCHY_WEIGHT      = 0.20
POLARITY_WEIGHT       = 0.15
NEGATIVE_WEIGHT       = 0.05
MIASM_WEIGHT          = 0.05

// Kent
TOTAL_REMEDIES        = 2432
IDF_EXPONENT          = 1.8
KENT_SOFT_CAP         = 0.8    // pow(kent, 0.8)
GRADE1_IDF_CAP        = 30
AD_MEDIAN             = 3000   // anti-domination
AD_EXPONENT           = 0.8

// Constellation
CS_BOOST_K            = 0.6    // (1 + 0.6 * cs)
PARTIAL_MATCH_WEIGHT  = 0.3
SQN_BONUS             = 0.15
RARITY_STEP           = 0.2    // per extra word

// Polarity
POL_RANGE             = 0.12   // 0.94..1.06
POL_NO_DATA           = 0.35

// cs penalty
CS_PENALTY_THRESHOLD  = 40     // maxCs > 40% triggers
CS_PENALTY_LOW        = 15     // cs < 15% gets penalty
CS_PENALTY_FACTOR     = 0.65   // minimum penalty

// Selection
MIN_COMMON_HITS       = 4      // Rule 3
MIN_COMMON_DOMAINS    = 2      // Rule 3
CS_OVERRIDE_THRESHOLD = 0.3    // constellation override

// Confidence
GAP_HIGH              = 15
GAP_GOOD              = 10
MIN_SYMPTOMS          = 3

// Priority
MAX_HIGH              = 5
MAX_MEDIUM            = 7
MAX_MENTAL_HIGH       = 3
PRIORITY_WEIGHT_HIGH  = 1.0
PRIORITY_WEIGHT_MED   = 0.5
PRIORITY_WEIGHT_LOW   = 0.2

// Profile inference
CONFIDENCE_THRESHOLD  = 0.4
```

---

## 14. AI Differential Layer

Файл: `src/lib/mdri/differential.ts`

AI вызывается ТОЛЬКО когда `shouldClarify() == true`. AI НЕ выбирает препарат — только генерирует вопросы для различения top-1 vs top-2 vs top-3.

### 14.1 shouldClarify()

```
shouldClarify(confidence, results, conflict, clarifyUsed) → boolean

true если:
  - clarifyUsed == false (максимум 1 цикл)
  И хотя бы одно:
    - conflict.level == 'hard'
    - conflict.level == 'differential'
    - confidence.level != 'high'
    - gap top1-top2 < 8
```

### 14.2 Conflict Check (3 уровня)

Файл: `src/lib/mdri/product-layer.ts` → `checkHypothesisConflict()`

```
HARD contradiction (→ confidence max CLARIFY):
  - альтернатива cs ≥ 50% при top-1 cs < 20%
  - ИЛИ top-1 Negative score < 30%

DIFFERENTIAL (→ confidence max GOOD):
  - альтернатива ≥ 2 линзы сильнее на ≥ 15 пунктов
  - ИЛИ альтернатива cs ≥ 40% при top-1 cs < 30%

NONE — обычная логика
```

Порядок в confidence: INSUFFICIENT → CLARIFY(tie) → CLARIFY(weak) → **CONFLICT CHECK** → HIGH → GOOD

### 14.3 Differential Questions

**Промпт для Sonnet:**
```
"Ты помогаешь различить гомеопатические препараты, а не подтвердить лидера."

Контекст: top1/top2/top3 + симптомы + модальности + конфликт + differentialLenses

Правила:
1. Различают top1, top2, top3
2. Могут изменить итоговый выбор
3. Не являются общими
4. Не подтверждают автоматически текущий top-1
5. Имеют варианты ответа с rubric маппингом
```

**Формат ответа AI:**
```json
[{
  "question": "Раздражительность проявляется вспышками или подавлением?",
  "why_it_matters": "Вспышки → Nux-v, подавление → Staph",
  "supports": ["nux-v"],
  "weakens": ["staph"],
  "options": [
    { "label": "Вспышки гнева", "rubric": "mind anger violent", "category": "mental", "weight": 2 },
    { "label": "Подавляет обиду", "rubric": "mind ailments anger suppressed", "category": "mental", "weight": 3 }
  ]
}]
```

### 14.4 validateQuestions()

Фильтрация мусора от AI:
- Удаляет без supports/weakens
- Удаляет без options (< 2)
- Удаляет слишком общие (6 паттернов: "как вы себя чувствуете" и т.д.)
- Удаляет нерелевантные (не упоминают top remedies)
- Удаляет дубли
- Min 3, max 5. Если < 3 → fallback

### 14.5 OptionWithMapping (детерминированный маппинг)

```typescript
type OptionWithMapping = {
  label: string               // "Вспышки гнева" — для UI
  rubric: string              // "mind anger violent" — для engine
  category: 'mental' | 'general' | 'particular'
  weight: 1 | 2 | 3
  modality?: { pairId: string; value: 'agg' | 'amel' }
}
```

AI НЕ интерпретирует ответы. Каждый option → symptom детерминированно.

### 14.6 Fallback Questions

5 готовых вопросов по differentialLenses:
- **Constellation** → "Как проявляется раздражительность?"
- **Polarity** → "Как реагирует на тепло и холод?"
- **Kent** → "Что происходит ночью?"
- **Hierarchy** → "Как реагирует на утешение?"
- **Negative** → "Есть ли жажда?"

Каждый option = rubric + category + weight + modality.

### 14.7 Rerun Flow

```
shouldClarify → AI генерирует вопросы → validateQuestions →
→ DifferentialClarify (UI: chips) → врач отвечает →
→ convertAnswersToSymptoms (option → symptom) →
→ merge с исходными (не затирая) →
→ rerun Engine v5 → пересчёт Confidence →
→ measureClarifyEffectiveness → финальный результат
```

Максимум 1 clarify цикл. `clarifyUsed` flag блокирует повторный вызов.

### 14.8 measureClarifyEffectiveness (v5)

**improvementScore** — взвешенная сумма:
```
score = 0.5 × norm(maxPressureDelta / 0.10)
      + 0.3 × norm(gapDelta / 10)
      + 0.2 × norm(avgPressureDelta / 0.10)

Где:
  maxPressureDelta = max(top2,top3,top4)/top1 before − after   (>0 = лучше)
  gapDelta = gap_after − gap_before                           (>0 = лучше)
  avgPressureDelta = avg(top2..4)/top1 before − after          (>0 = лучше)

Защита от противоречий:
  если gap↑ НО maxPressure↑ → score *= 0.5

conflictResolved → бонус +0.15
```

**3 уровня:**

| Уровень | Score | Условие |
|---------|-------|---------|
| strong_effective | ≥ 0.6 | + top1 не ослаб |
| weak_effective | ≥ 0.25 | + top1 не ослаб |
| not_effective | < 0.25 | или top1 ослаб |

**confidence_improved** — дополнительный сигнал: повышает weak → strong, но не самостоятельный критерий.

### 14.9 Логирование

В `ai_analysis_log.warnings` (JSONB) записывается `clarify_effectiveness`:
```json
{
  "clarify_effectiveness": {
    "level": "strong_effective",
    "top1_before": "nux-v", "top1_after": "nux-v",
    "gap_before": 5, "gap_after": 12, "delta_gap": 7,
    "alt_pressure_before": 0.85, "alt_pressure_after": 0.72,
    "max_alt_pressure_before": 0.92, "max_alt_pressure_after": 0.78,
    "ai_used": true, "fallback_used": false,
    "valid_questions_count": 4, "selected_answers_count": 3,
    "clarify_effective": true,
    "reason": "gap +7%, макс. давление −14%"
  }
}
```

### 14.10 Стоимость

```
Обычный анализ: ~$0.01 (1 Sonnet call для парсинга)
С дифференциацией: ~$0.02 (+1 Sonnet call для вопросов)
```

---

## 15. Известные ограничения (обновлено)

| Проблема | Причина | Статус |
|----------|---------|--------|
| Gels не в candidates | findRubrics не находит, cs override не помогает (ни один symptom не нашёл Gels) | Открыто |
| Med слабый | 1/4 constellation, kent=0 | Открыто |
| Carc false positives | cs=20-57% на чужих mental через "sympathetic", "suppressed" | Частично решено penalty |
| Kent bias | max всегда у полихреста, penalty необходим | Решено cs penalty |
| ДД пары | Calc/Hep, Sil/Bar-c, Spong/Dros — клинически близкие, разница 0-5% | By design |

---

## 16. Файловая структура

```
src/lib/mdri/
├── engine.ts              # Ядро (~2200 строк) — ЗАБЛОКИРОВАН
├── synonyms.ts            # symMatch + SYNONYM_MAP (136 entries)
├── types.ts               # Все типы
├── data-loader.ts         # Загрузка данных (edge cache → Supabase fallback)
├── product-layer.ts       # Keyword fallback + confidence + validation + conflict check
├── differential.ts        # AI differential layer + measureClarifyEffectiveness
├── infer-profile.ts       # Автоопределение профиля
├── parsing-prompt.ts      # Промпт для Sonnet парсера
├── homeopath-prompt.ts    # Промпт для Sonnet гомеопата
└── data/
    ├── repertory.json     # 74,482 рубрик
    ├── constellations.json # 3096 кластеров
    ├── polarities.json    # 890 препаратов, 12 пар
    └── clinical.json      # Consistency groups

src/lib/actions/
└── ai-consultation.ts     # Pipeline: analyzeText, analyzeConfirmed, parseAndSuggest,
                           # generateDifferentialClarifying, rerunWithClarifications

src/app/.../right-panel/
├── AIResultPanel.tsx       # Экран принятия решения
├── SuggestionReview.tsx    # Подтверждение симптомов
└── DifferentialClarify.tsx # UI для уточняющих вопросов

scripts/
├── test-50-cases.ts       # 50 тестовых кейсов
├── debug-symMatch.ts      # 55 тестов symMatch
└── debug-constellation.ts # Дебаг constellation
```

### Git tags
- `mdri-v5-final` — финальная версия engine
- `baseline-v5-76pct` — baseline на коммите c7aff75

### Pre-commit hook
Файлы `engine.ts` и `synonyms.ts` защищены. Для коммита: `MDRI=1 git commit -m "..."`

---

## Как воссоздать систему

1. Реализовать типы из раздела 2
2. Загрузить данные (repertory, constellations, polarities, clinical)
3. Реализовать findRubrics (4 слоя) и symMatch
4. Реализовать 6 scoring функций с формулами из раздела 4
5. Реализовать Pipeline (Filter → Selection → Override → Ranking)
6. Добавить Product Layer (keyword fallback, confidence, validation)
7. Добавить Conflict Check (3 уровня: hard/differential/none)
8. Подключить Sonnet для парсинга русского текста
9. Реализовать AI Differential Layer (раздел 14):
   - shouldClarify() → generateDifferentialQuestions → validateQuestions
   - OptionWithMapping (детерминированный маппинг)
   - Fallback вопросы по differentialLenses
   - rerunWithClarifications (merge + rerun + effectiveness)
   - measureClarifyEffectiveness (improvementScore v5)
10. Реализовать UI (SuggestionReview → AIResultPanel → DifferentialClarify)
11. Прогнать 50 тестовых кейсов, проверить Top-1 ≥ 76%
