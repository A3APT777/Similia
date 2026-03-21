'use client'

import { useState, useEffect } from 'react'

type Lang = 'ru' | 'en'

export type MiniTutorialStep = number  // 0..7

type Props = {
  step: MiniTutorialStep
  lang: Lang
  addedCount: number
  onNext: () => void
  onExit: () => void
}

type StepConfig = {
  emoji: string
  title: string
  body: string
  action: string | null
  btnLabel: string | null
  autoAdvance?: boolean
}

const STEPS_RU: StepConfig[] = [
  // 0 ─ Введение
  {
    emoji: '📖',
    title: 'Мини-реперторий Кента',
    body: 'Перед вами встроенный реперториум — классический справочник Джеймса Тайлера Кента (1897) прямо внутри консультации.\n\n74 482 рубрики: от «Голова, боль» до «Психика, страх перед людьми». Каждая рубрика — симптом с перечнем препаратов, которые его лечат по гомеопатическому принципу.\n\nСейчас пройдём весь путь — от поиска симптома до назначения препарата.',
    action: null,
    btnLabel: 'Начать →',
  },
  // 1 ─ Поиск
  {
    emoji: '🔍',
    title: '① Поиск симптома',
    body: 'Введите симптом пациента в подсвеченную строку поиска.\n\nНапример, пациент говорит «болит голова ночью» — введите «голова ночью». Или на латинском: «head night».\n\nЕщё примеры:\n• «хуже от холода» → модальности\n• «страх темноты» → психика\n• «жажда холодного» → общие симптомы\n\nРезультаты появятся мгновенно.',
    action: '↑ Введите симптом в строку поиска',
    btnLabel: null,
    autoAdvance: true,
  },
  // 2 ─ Рубрики
  {
    emoji: '📋',
    title: '② Рубрики — симптомы реперториума',
    body: 'Каждая строка — одна рубрика Кента:\n\n• Зелёный значок слева — раздел (Голова, Психика, Сон...)\n• Название симптома — текст рубрики\n• Цифра справа — количество препаратов\n\nПрепараты уже отсортированы по силе соответствия:\n• ЖИРНЫЙ — грейд 3, наибольшее соответствие\n• Курсив — грейд 2, среднее\n• Обычный — грейд 1, слабое\n\nНажмите на строку — увидите полный список.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 3 ─ Кнопка [+] — первая рубрика
  {
    emoji: '➕',
    title: '③ Добавьте первую рубрику',
    body: 'Кнопка [+] слева от рубрики добавляет её в кентовский анализ.\n\nПример: пациент жалуется на «мигрень ночью» — находим рубрику и нажимаем [+].\n\nСистема начнёт собирать пересечения: какие препараты встречаются в добавленных рубриках.\n\nНажмите [+] у любой рубрики.',
    action: '→ Нажмите [+] у любой рубрики',
    btnLabel: null,
    autoAdvance: true,
  },
  // 4 ─ Добавить ещё
  {
    emoji: '📌',
    title: '④ Добавьте ещё рубрики',
    body: 'Один симптом — ненадёжный критерий. Кент рекомендовал строить анализ на 3–7 хорошо выраженных симптомах.\n\nЧто искать:\n— модальности: «хуже от холода», «лучше от движения»\n— психику: «тревога вечером», «раздражительность»\n— общие: «жажда холодной воды», «зябкость»\n— характерные: необычные, яркие, «странные» симптомы\n\nДобавьте ещё хотя бы одну рубрику.',
    action: null,
    btnLabel: null,  // появляется при addedCount >= 2
  },
  // 5 ─ Панель анализа — обзор
  {
    emoji: '📊',
    title: '⑤ Панель анализа',
    body: 'Посмотрите на подсвеченную панель вверху. Система подсчитала, какие препараты встречаются в добавленных рубриках и отсортировала по сумме баллов.\n\nДля каждой рубрики показано:\n• Кнопки 1 · 2 · 3 — вес рубрики (расскажем подробнее)\n• Кнопка E — элиминация (тоже объясним)\n• Кнопка ✕ — удалить рубрику\n\nНиже — топ препаратов, отсортированных по баллу.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 6 ─ Веса 1/2/3
  {
    emoji: '⚡',
    title: '⑥ Вес рубрики: 1 · 2 · 3',
    body: 'Подсвеченные кнопки 1 / 2 / 3 рядом с каждой рубрикой — её вес в анализе:\n\n• 1 = обычный симптом\nВстречается у многих пациентов, ничего особенного.\n\n• 2 = важная жалоба\nПациент сам подчёркивает, чётко выражен.\n\n• 3 = редкий, характерный симптом\nПо Ганеману: «странный, выдающийся» — давать вес 3.\n\nФормула подсчёта: балл = грейд препарата × вес рубрики. Суммируем по всем рубрикам — получаем итоговый рейтинг.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 7 ─ Элиминация [E]
  {
    emoji: '⊘',
    title: '⑦ Кнопка [E] — Элиминация',
    body: 'Подсвеченная кнопка E — мощный фильтр. Нажмите её на рубрике — в рейтинге останутся ТОЛЬКО препараты, которые присутствуют в этой рубрике. Остальные исчезнут.\n\nПример: пациенту однозначно хуже от тепла. Ставите [E] на «хуже от тепла» — все препараты без этого симптома мгновенно выпадают.\n\nИспользуйте для симптомов, которые ОБЯЗАНЫ быть у верного препарата. Можно включить [E] на нескольких рубриках — фильтр станет строже.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 8 ─ Топ препаратов — как читать
  {
    emoji: '🏆',
    title: '⑧ Топ препаратов — как читать',
    body: 'Результат кентовского анализа:\n\n• Название — аббревиатура препарата по Кенту (Sulph, Nat-m, Puls...)\n• Полоска — относительный балл (чем длиннее — тем лучше)\n• Число — точный балл по формуле (грейд × вес)\n\nПервый в списке — наиболее вероятный симилимум. Добавляйте больше рубрик — случайные препараты вылетают, верный поднимается.\n\nПопробуйте изменить веса рубрик (1→2→3) — порядок препаратов изменится!',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 9 ─ Назначить
  {
    emoji: '💊',
    title: '⑨ Назначить препарат',
    body: 'Нажмите «Назначить» рядом с нужным препаратом — он автоматически перенесётся в поле назначения консультации.\n\nРеперторий закроется, и вы вернётесь к консультации с уже выбранным препаратом.\n\nДалее останется только указать потенцию, схему и длительность.',
    action: '→ Нажмите «Назначить» у любого препарата',
    btnLabel: 'Понятно →',
  },
  // 10 ─ Финал
  {
    emoji: '✅',
    title: 'Обучение завершено!',
    body: 'Теперь вы умеете работать с мини-реперториумом:\n\n✓ Искать симптомы по базе из 74 482 рубрик\n✓ Читать рубрики: раздел, название, грейды (1, 2, 3)\n✓ Добавлять рубрики в анализ кнопкой [+]\n✓ Выставлять вес рубрики (1 · 2 · 3) — по Ганеману\n✓ Отсекать неподходящие через элиминацию [E]\n✓ Понимать рейтинг: грейд × вес = балл\n✓ Назначать препарат из топа\n\nВсё автоматически сохраняется в консультацию — не нужно ничего копировать.',
    action: null,
    btnLabel: 'Закрыть обучение',
  },
]

const STEPS_EN: StepConfig[] = [
  { emoji: '📖', title: "Mini Repertory — Kent's Reference", body: "This is an embedded repertory — James Tyler Kent's classic reference (1897) right inside the consultation.\n\n74,482 rubrics: from 'Head, pain' to 'Mind, fear of people'. Each rubric is a symptom with a list of remedies that cure it.\n\nLet's walk through the complete workflow — from symptom search to prescription.", action: null, btnLabel: 'Start →' },
  { emoji: '🔍', title: '① Search for a symptom', body: "Type a patient symptom in the highlighted search bar.\n\nFor example, patient says 'headache at night' — type 'head night'.\n\nMore examples:\n• 'worse from cold' → modalities\n• 'fear of dark' → mental\n• 'thirst for cold' → generals\n\nResults appear instantly.", action: '↑ Type a symptom in the search bar', btnLabel: null, autoAdvance: true },
  { emoji: '📋', title: '② Rubrics — repertory symptoms', body: "Each row is one Kent rubric:\n\n• Green badge — chapter (Head, Mind, Sleep...)\n• Symptom name — rubric text\n• Number — remedy count\n\nRemedies sorted by confidence:\n• BOLD — grade 3, highest\n• Italic — grade 2, moderate\n• Plain — grade 1, low\n\nClick a row to see the full remedy list.", action: null, btnLabel: 'Got it →' },
  { emoji: '➕', title: '③ Add first rubric', body: "The [+] button next to a rubric adds it to Kent analysis.\n\nExample: patient complains of 'migraine at night' — find the rubric and click [+].\n\nThe system starts collecting intersections: which remedies appear across added rubrics.\n\nClick [+] on any rubric.", action: '→ Click [+] on any rubric', btnLabel: null, autoAdvance: true },
  { emoji: '📌', title: '④ Add more rubrics', body: "One symptom is unreliable. Kent recommended 3–7 well-expressed symptoms.\n\nWhat to search:\n— Modalities: 'worse from cold', 'better from motion'\n— Mental: 'anxiety evening', 'irritability'\n— Generals: 'thirst cold water', 'chilliness'\n— Characteristic: unusual, striking, 'strange' symptoms\n\nAdd at least one more rubric.", action: null, btnLabel: null },
  { emoji: '📊', title: '⑤ Analysis Panel', body: "The highlighted panel above shows your analysis. The system counted which remedies appear in added rubrics and sorted by total score.\n\nFor each rubric:\n• Buttons 1 · 2 · 3 — rubric weight (more on this next)\n• Button E — elimination (we'll explain)\n• Button ✕ — remove rubric\n\nBelow — top remedies sorted by score.", action: null, btnLabel: 'Got it →' },
  { emoji: '⚡', title: '⑥ Rubric weight: 1 · 2 · 3', body: "Highlighted buttons 1 / 2 / 3 next to each rubric — its weight in the analysis:\n\n• 1 = ordinary symptom\nCommon, nothing special.\n\n• 2 = important complaint\nPatient emphasizes it, clearly expressed.\n\n• 3 = key, characteristic symptom\nPer Hahnemann: 'strange, prominent' — give weight 3.\n\nScoring formula: score = remedy grade × rubric weight. Sum across all rubrics = final ranking.", action: null, btnLabel: 'Got it →' },
  { emoji: '⊘', title: '⑦ Button [E] — Elimination', body: "Highlighted button E is a powerful filter. Press it — only remedies PRESENT in this rubric stay in the ranking. The rest disappear.\n\nExample: patient is clearly worse from heat. Set [E] on 'worse from heat' — all remedies without this symptom are instantly removed.\n\nUse for symptoms that MUST be in the correct remedy. Can enable [E] on multiple rubrics — filter gets stricter.", action: null, btnLabel: 'Got it →' },
  { emoji: '🏆', title: '⑧ Top remedies — how to read', body: "Kent analysis result:\n\n• Name — Kent abbreviation (Sulph, Nat-m, Puls...)\n• Bar — relative score (longer = better)\n• Number — exact score (grade × weight)\n\nFirst in the list = most likely simillimum. Add more rubrics — random remedies drop out, the right one rises.\n\nTry changing rubric weights (1→2→3) — the order will change!", action: null, btnLabel: 'Got it →' },
  { emoji: '💊', title: '⑨ Prescribe a remedy', body: "Click 'Assign' next to a remedy — it transfers to the prescription field automatically.\n\nThe repertory closes and you return to the consultation with the remedy already selected.\n\nThen just set the potency, schedule, and duration.", action: "→ Click 'Assign' on any remedy", btnLabel: 'Got it →' },
  { emoji: '✅', title: 'Tutorial complete!', body: "You now know how to use the mini-repertory:\n\n✓ Search symptoms in 74,482 rubrics\n✓ Read rubrics: chapter, name, grades (1, 2, 3)\n✓ Add rubrics to analysis with [+]\n✓ Set rubric weights (1 · 2 · 3) — per Hahnemann\n✓ Filter with elimination [E]\n✓ Understand ranking: grade × weight = score\n✓ Prescribe from the top remedies\n\nEverything auto-saves to the consultation.", action: null, btnLabel: 'Close tutorial' },
]

const TOTAL_STEPS = 11

const pulseStyle = `
  @keyframes mini-tut-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(45,106,79,0.45), 0 0 20px rgba(45,106,79,0.3); }
    50% { box-shadow: 0 0 0 6px rgba(45,106,79,0.25), 0 0 30px rgba(45,106,79,0.4); }
  }
  .mini-tut-glow {
    outline: 2px solid #2d6a4f !important;
    outline-offset: 3px;
    border-radius: 8px;
    animation: mini-tut-pulse 1.8s ease-in-out infinite;
    position: relative;
    z-index: 9995 !important;
    background: white;
  }
  .mini-tut-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 9990;
    pointer-events: none;
  }
`

export default function MiniRepertoryTutorial({ step, lang, addedCount, onNext, onExit }: Props) {
  const steps = lang === 'en' ? STEPS_EN : STEPS_RU
  const cfg = steps[Math.min(step, TOTAL_STEPS - 1)]

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit])

  // Fallback: если авто-шаг не переключился за 8 сек — показать кнопку «Пропустить»
  const [showSkip, setShowSkip] = useState(false)
  useEffect(() => {
    if (cfg.autoAdvance) {
      setShowSkip(false)
      const timer = setTimeout(() => setShowSkip(true), 8000)
      return () => clearTimeout(timer)
    } else {
      setShowSkip(false)
    }
  }, [step, cfg.autoAdvance])

  // Шаг 4: кнопка появляется при addedCount >= 2
  const step4Ready = addedCount >= 2
  const effectiveBtnLabel = step === 4
    ? (step4Ready ? (lang === 'ru' ? 'Смотреть анализ →' : 'View analysis →') : null)
    : cfg.btnLabel

  const effectiveAction = step === 4
    ? (addedCount === 0
        ? (lang === 'ru' ? '→ Нажмите [+] у любой рубрики (нужно ещё 2)' : '→ Click [+] on a rubric (need 2 more)')
        : addedCount === 1
          ? (lang === 'ru' ? '✓ Одна добавлена. Добавьте ещё одну' : '✓ One added. Add one more')
          : (lang === 'ru' ? '✓✓ Отлично! Нажмите кнопку ниже' : '✓✓ Great! Click the button below'))
    : cfg.action

  const isAutoStep = cfg.autoAdvance && !effectiveBtnLabel
  const showFooter = !isAutoStep && (!!effectiveBtnLabel || step === 4)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pulseStyle }} />
      <div className="mini-tut-overlay" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-tut-title"
        className="fixed top-1/2 -translate-y-1/2 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          zIndex: 9999,
          left: 'max(16px, calc(50% - 400px))',
          border: '1px solid rgba(45,106,79,0.25)',
          backgroundColor: '#fff',
          width: 'min(310px, calc(100vw - 32px))',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ backgroundColor: 'var(--sim-forest)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{cfg.emoji}</span>
            <span className="text-xs font-bold text-white opacity-90">
              {lang === 'ru' ? 'Обучение' : 'Tutorial'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 10 : 4,
                  height: 4,
                  backgroundColor: i < step
                    ? 'rgba(110,231,183,0.7)'
                    : i === step
                      ? '#6ee7b7'
                      : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs text-white opacity-70">{step + 1}/{TOTAL_STEPS}</span>
            <button
              onClick={onExit}
              aria-label={lang === 'ru' ? 'Закрыть обучение' : 'Close tutorial'}
              className="text-sm p-1 opacity-60 hover:opacity-100 transition-opacity text-white"
            >✕</button>
          </div>
        </div>

        {/* Контент */}
        <div className="px-4 py-3 overflow-y-auto flex-1">
          <h3 id="mini-tut-title" className="text-sm font-bold mb-2 leading-snug" style={{ color: 'var(--sim-forest)' }}>
            {cfg.title}
          </h3>
          <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--sim-text-sec)' }}>
            {cfg.body}
          </p>

          {effectiveAction && (
            <div
              className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: 'rgba(45,106,79,0.08)',
                color: 'var(--sim-green)',
                border: '1px solid rgba(45,106,79,0.2)',
              }}
            >
              {effectiveAction}
            </div>
          )}

          {isAutoStep && !showSkip && (
            <p className="mt-2 text-xs text-center" style={{ color: 'var(--sim-text-hint)' }}>
              {lang === 'ru' ? '— перейдём автоматически —' : '— will advance automatically —'}
            </p>
          )}
          {isAutoStep && showSkip && (
            <button
              onClick={onNext}
              className="mt-3 w-full py-2 rounded-xl text-[13px] font-medium transition-all"
              style={{ color: 'var(--sim-text-sec)', border: '1px solid var(--sim-border)' }}
            >
              {lang === 'ru' ? 'Пропустить →' : 'Skip →'}
            </button>
          )}
        </div>

        {/* Кнопка */}
        {showFooter && (
          <div className="px-4 pb-3 shrink-0">
            <button
              onClick={effectiveBtnLabel ? onNext : undefined}
              disabled={!effectiveBtnLabel}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--sim-green)' }}
              onMouseEnter={e => { if (effectiveBtnLabel) e.currentTarget.style.backgroundColor = '#245c42' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2d6a4f' }}
            >
              {effectiveBtnLabel ?? (lang === 'ru' ? `Добавьте рубрики (${addedCount}/2)` : `Add rubrics (${addedCount}/2)`)}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
