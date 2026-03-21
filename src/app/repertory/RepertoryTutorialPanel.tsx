'use client'

import { useState, useEffect } from 'react'

type Lang = 'ru' | 'en'

export type TutorialStep = number  // 0..12

type Props = {
  step: TutorialStep
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
  autoAdvance?: boolean  // шаги где кнопки нет — переход только по действию
}

const STEPS_RU: StepConfig[] = [
  // 0 ─ Введение
  {
    emoji: '📖',
    title: 'Реперторий Кента — 74 482 симптома',
    body: 'Перед вами оцифрованный Repertorium Publicum — классический реперторий Джеймса Тайлера Кента (1897).\n\n74 482 рубрики: от «Голова, боль» до «Психика, страх перед людьми». Каждая рубрика — симптом с перечнем препаратов, которые его лечат по гомеопатическому принципу.\n\nСейчас пройдём весь путь вместе — от поиска симптома до назначения препарата.',
    action: null,
    btnLabel: 'Начать практику →',
  },
  // 1 ─ Строка поиска
  {
    emoji: '🔍',
    title: '① Поиск симптома',
    body: 'Введите симптом пациента в подсвеченную строку поиска.\n\nНапример, пациент говорит «болит голова ночью» — введите «голова ночью». Или на латинском: «head night».\n\nЕщё примеры:\n• «хуже от холода» → модальности\n• «страх темноты» → психика\n• «жажда холодного» → общие симптомы\n\nСистема ищет по всем 74 482 рубрикам мгновенно.',
    action: '↑ Введите симптом в строку поиска',
    btnLabel: null,
    autoAdvance: true,
  },
  // 2 ─ Список рубрик: структура строки
  {
    emoji: '📋',
    title: '② Рубрики — симптомы реперторийа',
    body: 'Каждая строка — одна рубрика Кента. Вот как её читать:\n\n• Название симптома — жирный текст (ГОЛОВНАЯ БОЛЬ, НОЧЬЮ...)\n• Значок справа — раздел (Голова, Психика, Сон...)\n• Цифра — количество препаратов в этой рубрике\n\nПод названием — превью препаратов. Они уже отсортированы по степени подтверждённости:\n• ЖИРНЫЙ — грейд 3, высокая подтверждённость\n• Курсив — грейд 2, среднее\n• Обычный — грейд 1, слабое\n\nНажмите на строку — увидите полный список.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 3 ─ Раскрытие рубрики
  {
    emoji: '🔎',
    title: '③ Раскрываем рубрику',
    body: 'Нажмите на любую строку — она раскроется и покажет все препараты этого симптома.\n\nПопробуйте прямо сейчас — нажмите на подсвеченную строку.',
    action: '↓ Нажмите на строку рубрики',
    btnLabel: null,
    autoAdvance: true,
  },
  // 4 ─ Грейды препаратов
  {
    emoji: '🎓',
    title: '④ Грейды препаратов: 1, 2, 3',
    body: 'Перед вами список препаратов внутри рубрики. Обратите внимание — они выглядят по-разному:\n\n● SULPH, NAT-M — крупный жирный текст\nЭто грейд 3: препарат очень сильно и часто проявлял этот симптом в прувингах и клинике.\n\n● Puls, Sep — курсив\nГрейд 2: средняя подтверждённость, клинически подтверждён.\n\n● acon, bell — мелкий серый текст\nГрейд 1: слабая подтверждённость. Единичные данные.\n\nПростое правило: чем крупнее шрифт — тем важнее препарат для этого симптома.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 5 ─ Кнопка [+]
  {
    emoji: '➕',
    title: '⑤ Добавить рубрику в анализ',
    body: 'Кнопка [+] справа от рубрики добавляет её в кентовский анализ.\n\nДобавьте 2–5 характерных симптомов пациента — система автоматически найдёт пересечение: какие препараты встречаются во ВСЕХ добавленных рубриках.\n\nПример: пациент жалуется на «мигрень ночью» + «улучшение от давления на голову» — добавьте обе рубрики и посмотрите, какие препараты входят в обе.\n\nНажмите [+] у любой рубрики.',
    action: '→ Нажмите [+] у любой рубрики',
    btnLabel: null,
    autoAdvance: true,
  },
  // 6 ─ Добавить ещё
  {
    emoji: '📌',
    title: '⑥ Добавьте ещё рубрики',
    body: 'Один симптом — ненадёжный критерий. Кент рекомендовал строить анализ на 3–7 хорошо выраженных симптомах.\n\nЧто искать:\n— модальности: «хуже от холода», «лучше от движения»\n— психику: «тревога вечером», «раздражительность»\n— общие: «жажда холодной воды», «зябкость»\n— характерные: необычные, яркие, «странные» симптомы\n\nДобавьте хотя бы ещё одну рубрику, чтобы двигаться дальше.',
    action: null,
    btnLabel: null,  // появляется при addedCount >= 2
  },
  // 7 ─ Панель анализа
  {
    emoji: '📊',
    title: '⑦ Кентовский анализ — рубрики и веса',
    body: 'Система подсчитала, какие препараты встречаются в добавленных рубриках и отсортировала их по сумме баллов.\n\nПосмотрите на подсвеченную панель справа. Для каждой рубрики:\n• Кнопки 1 · 2 · 3 — вес рубрики в анализе (расскажем подробнее)\n• Кнопка E — элиминация (тоже объясним)\n• Кнопка ✕ — удалить рубрику из анализа\n\nНиже — топ препаратов, отсортированных по баллу.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 8 ─ Веса 1/2/3
  {
    emoji: '⚡',
    title: '⑧ Вес рубрики: 1 · 2 · 3',
    body: 'Подсвеченные кнопки 1 / 2 / 3 рядом с каждой рубрикой — её вес в анализе:\n\n• 1 = обычный симптом\nВстречается у многих пациентов, ничего особенного.\n\n• 2 = важная жалоба\nПациент сам подчёркивает, чётко выражен, часто упоминает.\n\n• 3 = редкий, характерный симптом\nПо Ганеману: «странный, выдающийся» — давать вес 3.\n\nФормула: балл препарата = сумма (грейд × вес рубрики). Чем больше совпадений с высоким весом — тем выше препарат поднимается в рейтинге.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 9 ─ Элиминация E
  {
    emoji: '⊘',
    title: '⑨ Кнопка [E] — Элиминация',
    body: 'Подсвеченная кнопка E (элиминация) — оставить только препараты, ОБЯЗАТЕЛЬНО присутствующие в данной рубрике.\n\nИспользуйте для самых ключевых симптомов.\n\nПример: пациенту однозначно хуже от тепла. Нажимаете [E] на рубрике «хуже от тепла» — все препараты, которые НЕ связаны с этим симптомом, мгновенно исчезают из рейтинга.\n\nМожно включить [E] на нескольких рубриках — фильтр станет строже.',
    action: null,
    btnLabel: 'Понятно →',
  },
  // 10 ─ Топ препаратов
  {
    emoji: '🏆',
    title: '⑩ Топ препаратов по рубрикам',
    body: 'Результат кентовского анализа. Препараты отсортированы по формуле: сумма (грейд × вес рубрики). Полоска — относительный счёт.\n\nКак читать строку:\n• Sulph, Nat-m, Puls — аббревиатура препарата по Кенту\n• Полоска — относительный балл\n• Число — точный балл\n• Цветные квадраты — в каких рубриках этот препарат присутствует (яркий = высокий грейд, бледный = низкий)\n\nПервый в списке — наиболее вероятный кандидат. Но это не окончательный ответ — всегда сверяйте с Materia Medica перед назначением.',
    action: '↗ Нажмите на препарат — увидите кнопку [Rx]',
    btnLabel: 'Понятно →',
  },
  // 11 ─ Назначение Rx
  {
    emoji: '💊',
    title: '⑪ Назначить препарат',
    body: 'Нажмите [Rx] рядом с препаратом — откроется форма назначения:\n• Потенция (6С, 30С, 200С, 1M...)\n• Форма приёма (гранулы, капли, порошок)\n• Схема и длительность курса\n\nНажмите «Сохранить в консультацию» — препарат автоматически перенесётся в запись пациента. Если вы пришли из консультации — вернётесь обратно с уже заполненным назначением.\n\nДалее останется только указать потенцию, схему и длительность.',
    action: '↗ Попробуйте нажать [Rx]',
    btnLabel: 'Всё понятно! →',
  },
  // 12 ─ Финал
  {
    emoji: '✅',
    title: 'Обучение завершено!',
    body: 'Теперь вы умеете работать с реперторийом Кента:\n\n✓ Искать симптомы по базе из 74 482 рубрик\n✓ Читать рубрики: название, раздел, грейды (1, 2, 3)\n✓ Добавлять рубрики в кентовский анализ кнопкой [+]\n✓ Выставлять вес рубрики (1 · 2 · 3) — по Ганеману\n✓ Отсекать неподходящие через элиминацию [E]\n✓ Читать рейтинг и находить симилимум\n✓ Назначать препарат через [Rx]\n\nВсё автоматически сохраняется в консультацию — не нужно ничего копировать вручную.',
    action: null,
    btnLabel: 'Закрыть обучение',
  },
]

const STEPS_EN: StepConfig[] = [
  {
    emoji: '📚',
    title: "Kent's Repertory — what is it?",
    body: "In 1897, homeopath James Tyler Kent created a massive reference: for every symptom — a list of remedies that cause or cure it.\n\nEach remedy has a grade (1, 2 or 3) — the higher the grade, the stronger the link to the symptom.\n\nOur database has over 74,000 such symptoms (rubrics). Let's walk through the entire workflow — step by step.",
    action: null,
    btnLabel: 'Start practice →',
  },
  {
    emoji: '🔍',
    title: '① Search bar',
    body: "See the highlighted search bar at the top?\n\nType a patient symptom — in English or Russian:\n\"headache\", \"worse at night\", \"thirst\", \"fear of dark\".\n\nResults appear instantly — the system searches the entire database.",
    action: '↑ Type any symptom in the search bar',
    btnLabel: null,
    autoAdvance: true,
  },
  {
    emoji: '📋',
    title: '② How to read rubric rows',
    body: "Results are here! Each row is one symptom (rubric) from Kent's reference.\n\nWhat you see in each row:\n• Symptom name — bold text\n• Chapter (Head, Mind, Sleep...) — badge on the right\n• Number — how many remedies are linked to this symptom\n\nBelow the name — a preview of key remedies. Larger, bolder text = higher grade.",
    action: null,
    btnLabel: 'Got it →',
  },
  {
    emoji: '🔎',
    title: '③ Expanding a rubric',
    body: "Click any row — it will expand and show all remedies linked to this symptom.\n\nTry it — click the first highlighted row.",
    action: '↓ Click on a rubric row',
    btnLabel: null,
    autoAdvance: true,
  },
  {
    emoji: '🎓',
    title: '④ Grades: 1, 2, 3',
    body: "Inside the rubric, remedies are divided by grades — how strongly they match this symptom:\n\n● Grade 3 — LARGE bold text\nStrongest link. This remedy very often caused or cured this symptom.\n\n● Grade 2 — italic\nModerate link. Confirmed in clinical practice.\n\n● Grade 1 — small gray text\nWeak link. Noted but not characteristic.\n\nSimple rule: bigger font = more important remedy for this symptom.",
    action: null,
    btnLabel: 'Got it →',
  },
  {
    emoji: '➕',
    title: '⑤ [+] button — add to analysis',
    body: "Each row has a [+] button on the right.\n\nClick it — the rubric moves to the Analysis panel on the right.\n\nThe idea: we collect several patient symptoms, and the system calculates which remedy best fits the whole picture.",
    action: '→ Click [+] on any rubric',
    btnLabel: null,
    autoAdvance: true,
  },
  {
    emoji: '📌',
    title: '⑥ Add more rubrics',
    body: "One symptom isn't enough for a reliable choice. Kent recommended 3–7 well-expressed symptoms.\n\nSearch for more from the patient's picture:\n— Worse/better from what (modalities)\n— Mood, fears, behavior\n— Thirst, appetite, sleep, chilliness\n— Unusual or striking sensations\n\nAdd at least one more rubric.",
    action: null,
    btnLabel: null,
  },
  {
    emoji: '⚖️',
    title: '⑦ Analysis Panel',
    body: "Look at the highlighted panel on the right — this is your workspace.\n\nAll added rubrics are shown here. Next to each:\n• Buttons 1 · 2 · 3 — symptom weight (more on this next)\n• Button [E] — elimination (we'll explain)\n• Button ✕ — remove rubric\n\nBelow — remedies ranked by score.",
    action: null,
    btnLabel: 'Got it →',
  },
  {
    emoji: '⚡',
    title: '⑧ Symptom weight: 1 · 2 · 3',
    body: "Buttons 1, 2, 3 — how important is this symptom for this particular patient.\n\nWeight 1 — common symptom\nSeen in many patients, nothing special.\n\nWeight 2 — noticeable symptom\nThe patient emphasizes it, clearly expressed.\n\nWeight 3 — key symptom\nVery striking, unusual. Kent called these 'strange, rare, peculiar.'\n\nThe system calculates: remedy grade × symptom weight. More high-weight matches = higher ranking.",
    action: null,
    btnLabel: 'Got it →',
  },
  {
    emoji: '⊘',
    title: '⑨ [E] button — Elimination',
    body: "Elimination filters out unsuitable remedies.\n\nPress [E] on a rubric — only remedies present in that rubric stay in the ranking. The rest disappear.\n\nExample: patient is worse from heat. Set [E] on that rubric — remedies not linked to 'worse from heat' are removed instantly.\n\nYou can enable [E] on multiple rubrics — the filter gets stricter.",
    action: null,
    btnLabel: 'Got it →',
  },
  {
    emoji: '🏆',
    title: '⑩ Top Remedies — the result',
    body: "At the bottom of the panel — a ranking of 15 best remedies.\n\nWhat each row means:\n• Name — Kent abbreviation (Sulph, Nat-m, Puls...)\n• Bar — relative score (longer = better)\n• Number — exact score\n• Colored squares — which rubrics this remedy covers\n\nBright square = high grade, pale = low grade.\n\nHover over a remedy to see the [Rx] button.",
    action: '↗ Hover over any remedy',
    btnLabel: 'Got it →',
  },
  {
    emoji: '💊',
    title: '⑪ [Rx] button — prescribing',
    body: "Click [Rx] on a remedy — a prescribing form opens:\n• Potency (6C, 30C, 200C, 1M...)\n• Form (granules, drops, powder)\n• Schedule and duration\n\nClick 'Save to consultation' — the prescription is saved to the patient's record.\n\nIf you came from a consultation — you'll return with the prescription ready.",
    action: '↗ Try clicking [Rx]',
    btnLabel: 'All clear! →',
  },
  {
    emoji: '✅',
    title: 'Done!',
    body: "You now know how to:\n\n✓ Search symptoms in 74,000+ rubrics\n✓ Read rubrics and understand grades (1, 2, 3)\n✓ Add rubrics to analysis with [+]\n✓ Set symptom weights (1 · 2 · 3)\n✓ Filter with elimination [E]\n✓ Read the remedy ranking\n✓ Prescribe via [Rx]\n\nNow try it with real patient symptoms!",
    action: null,
    btnLabel: 'Close tutorial',
  },
]

const TOTAL_STEPS = 13

const pulseStyle = `
  @keyframes tut-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(45,106,79,0.45), 0 0 20px rgba(45,106,79,0.3); }
    50% { box-shadow: 0 0 0 6px rgba(45,106,79,0.25), 0 0 30px rgba(45,106,79,0.4); }
  }
  @keyframes tut-pulse-light {
    0%, 100% { box-shadow: 0 0 0 3px rgba(110,231,183,0.5), 0 0 20px rgba(110,231,183,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(110,231,183,0.3), 0 0 30px rgba(110,231,183,0.55); }
  }
  .tut-glow {
    outline: 2px solid #2d6a4f !important;
    outline-offset: 3px;
    border-radius: 8px;
    animation: tut-pulse 1.8s ease-in-out infinite;
    position: relative;
    z-index: 9995 !important;
    background: white;
  }
  .tut-glow-light {
    outline: 2px solid rgba(110,231,183,0.9) !important;
    outline-offset: 3px;
    border-radius: 8px;
    animation: tut-pulse-light 1.8s ease-in-out infinite;
    position: relative;
    z-index: 9995 !important;
  }
`

export default function RepertoryTutorialPanel({ step, lang, addedCount, onNext, onExit }: Props) {
  const steps = lang === 'en' ? STEPS_EN : STEPS_RU
  const cfg = steps[Math.max(0, Math.min(step, TOTAL_STEPS - 1))]

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

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit])

  // Шаг 6: кнопка появляется только когда addedCount >= 2
  const step6Ready = addedCount >= 2
  const effectiveBtnLabel = step === 6
    ? (step6Ready ? (lang === 'ru' ? 'Смотреть Анализ →' : 'View Analysis →') : null)
    : cfg.btnLabel

  const effectiveAction = step === 6
    ? (addedCount === 0
        ? (lang === 'ru' ? '↓ Нажмите [+] у любой рубрики (нужно ещё 2)' : '↓ Click [+] on a rubric (need 2 more)')
        : addedCount === 1
          ? (lang === 'ru' ? '✓ Одна добавлена. Добавьте ещё одну' : '✓ One added. Add one more')
          : (lang === 'ru' ? '✓✓ Отлично! Нажмите кнопку ниже' : '✓✓ Great! Click the button below'))
    : cfg.action

  // Шаг 1: авто-переход — нет кнопки
  const isAutoStep = cfg.autoAdvance && !effectiveBtnLabel
  // Шаги без кнопки и без авто — не показываем футер
  const showFooter = !isAutoStep && (!!effectiveBtnLabel || step === 6)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pulseStyle }} />
      {/* Затемняющий оверлей — весь экран кроме подсвеченных элементов и панели */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 9990,
          backgroundColor: 'rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rep-tut-title"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          zIndex: 9999,
          border: '1px solid rgba(45,106,79,0.25)',
          backgroundColor: '#fff',
          width: 'min(320px, calc(100vw - 32px))',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ backgroundColor: 'var(--sim-forest)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{cfg.emoji}</span>
            <span className="text-xs font-bold text-white opacity-90">
              {lang === 'ru' ? 'Обучение' : 'Tutorial'}
            </span>
          </div>
          {/* Прогресс */}
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 12 : 5,
                  height: 5,
                  backgroundColor: i < step
                    ? 'rgba(110,231,183,0.7)'
                    : i === step
                      ? '#6ee7b7'
                      : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[12px] text-white opacity-70">{step + 1}/{TOTAL_STEPS}</span>
            <button
              onClick={onExit}
              aria-label={lang === 'ru' ? 'Закрыть обучение' : 'Close tutorial'}
              className="text-sm p-1 opacity-60 hover:opacity-100 transition-opacity text-white"
              title={lang === 'ru' ? 'Выйти из обучения' : 'Exit tutorial'}
            >✕</button>
          </div>
        </div>

        {/* Контент (прокручиваемый) */}
        <div className="px-4 py-4 overflow-y-auto flex-1">
          <h3 id="rep-tut-title" className="text-sm font-bold mb-2.5 leading-snug" style={{ color: 'var(--sim-forest)' }}>
            {cfg.title}
          </h3>
          <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--sim-text-sec)' }}>
            {cfg.body}
          </p>

          {/* Подсказка-действие */}
          {effectiveAction && (
            <div
              className="mt-3 px-3 py-2 rounded-xl text-[12px] font-medium"
              style={{
                backgroundColor: 'rgba(45,106,79,0.08)',
                color: 'var(--sim-green)',
                border: '1px solid rgba(45,106,79,0.2)',
              }}
            >
              {effectiveAction}
            </div>
          )}

          {/* Авто-переход: подсказка */}
          {isAutoStep && !showSkip && (
            <p className="mt-2 text-[12px] text-center" style={{ color: 'var(--sim-text-hint)' }}>
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

        {/* Кнопки */}
        {showFooter && (
          <div className="px-4 pb-4 shrink-0">
            <button
              onClick={effectiveBtnLabel ? onNext : undefined}
              disabled={!effectiveBtnLabel}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-35 disabled:cursor-not-allowed"
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
