import type { Lang } from '@/hooks/useLanguage'
import { t } from '@/lib/i18n'

const getTourSteps = (lang: Lang) => [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: t(lang).tourSteps.welcomeTitle,
      description: t(lang).tourSteps.welcomeDesc,
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="new-patient"]',
    popover: {
      title: t(lang).tourSteps.addPatientTitle,
      description: t(lang).tourSteps.addPatientDesc,
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="questionnaire-btn"]',
    popover: {
      title: t(lang).tourSteps.intakeTitle,
      description: t(lang).tourSteps.intakeDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-list"]',
    popover: {
      title: t(lang).tourSteps.searchTitle,
      description: t(lang).tourSteps.searchDesc,
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="repertory-link"]',
    popover: {
      title: t(lang).tourSteps.repertoryTitle,
      description: t(lang).tourSteps.repertoryDesc,
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="stats"]',
    popover: {
      title: t(lang).tourSteps.statsTitle,
      description: t(lang).tourSteps.statsDesc,
      side: 'bottom' as const,
    },
  },
]

const getPatientFormSteps = (lang: Lang) => [
  {
    element: '[data-tour="patient-name"]',
    popover: {
      title: t(lang).tourSteps.formName,
      description: t(lang).tourSteps.formNameDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-birthdate"]',
    popover: {
      title: t(lang).tourSteps.formBirthdate,
      description: t(lang).tourSteps.formBirthdateDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-phone"]',
    popover: {
      title: t(lang).tourSteps.formPhone,
      description: t(lang).tourSteps.formPhoneDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-email"]',
    popover: {
      title: t(lang).tourSteps.formEmail,
      description: t(lang).tourSteps.formEmailDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-constitution"]',
    popover: {
      title: t(lang).tourSteps.formConstitution,
      description: t(lang).tourSteps.formConstitutionDesc,
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-note"]',
    popover: {
      title: t(lang).tourSteps.formNote,
      description: t(lang).tourSteps.formNoteDesc,
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="patient-submit"]',
    popover: {
      title: t(lang).tourSteps.formSubmit,
      description: t(lang).tourSteps.formSubmitDesc,
      side: 'top' as const,
    },
  },
]

const getPatientCardSteps = (lang: Lang) => [
  {
    element: '[data-tour="patient-hero"]',
    popover: { title: t(lang).tourSteps.cardTitle, description: t(lang).tourSteps.cardDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="intake-link"]',
    popover: { title: t(lang).tourSteps.intakeLinkTitle, description: t(lang).tourSteps.intakeLinkDesc, side: 'top' as const },
  },
  {
    element: '[data-tour="schedule-btn"]',
    popover: { title: t(lang).tourSteps.scheduleTitle, description: t(lang).tourSteps.scheduleDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="new-consultation"]',
    popover: { title: t(lang).tourSteps.newConsultTitle, description: t(lang).tourSteps.newConsultDesc, side: 'top' as const },
  },
]

const getConsultationSteps = (lang: Lang) => [
  {
    element: '[data-tour="complaints"]',
    popover: { title: t(lang).tourSteps.complaintsTitle, description: t(lang).tourSteps.complaintsDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="editor-toolbar"]',
    popover: { title: t(lang).tourSteps.toolbarTitle, description: t(lang).tourSteps.toolbarDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="open-repertory"]',
    popover: { title: t(lang).tourSteps.openRepTitle, description: t(lang).tourSteps.openRepDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="right-panel"]',
    popover: { title: t(lang).tourSteps.rightPanelTitle, description: t(lang).tourSteps.rightPanelDesc, side: 'left' as const },
  },
  {
    element: '[data-tour="inline-rx"]',
    popover: { title: t(lang).tourSteps.rxTitle, description: t(lang).tourSteps.rxDesc, side: 'top' as const },
  },
  {
    element: '[data-tour="finish-btn"]',
    popover: { title: t(lang).tourSteps.finishTitle, description: t(lang).tourSteps.finishDesc, side: 'top' as const },
  },
]

const getRepertorySteps = (lang: Lang) => [
  {
    element: '[data-tour="rep-search"]',
    popover: { title: t(lang).tourSteps.repSearchTitle, description: t(lang).tourSteps.repSearchDesc, side: 'bottom' as const },
  },
  {
    element: '[data-tour="rep-rubric-row"]',
    popover: { title: t(lang).tourSteps.repRubricTitle, description: t(lang).tourSteps.repRubricDesc, side: 'right' as const },
  },
  {
    element: '[data-tour="rep-add-rubric"]',
    popover: { title: t(lang).tourSteps.repAddTitle, description: t(lang).tourSteps.repAddDesc, side: 'left' as const },
  },
  {
    element: '[data-tour="rep-analysis"]',
    popover: { title: t(lang).tourSteps.repAnalysisTitle, description: t(lang).tourSteps.repAnalysisDesc, side: 'left' as const },
  },
]

// ── Авто-переход: навешивает слушатель на подсвеченный элемент ──────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupAutoAdvance(el: Element, kind: 'click' | 'click-destroy' | 'input' | 'child-input', d: any): () => void {
  if (kind === 'click') {
    const handler = () => setTimeout(() => { try { d.moveNext() } catch { /* ignore */ } }, 350)
    el.addEventListener('click', handler, { once: true })
    return () => el.removeEventListener('click', handler)
  }
  if (kind === 'click-destroy') {
    const handler = () => setTimeout(() => { try { d.destroy() } catch { /* ignore */ } }, 100)
    el.addEventListener('click', handler, { once: true })
    return () => el.removeEventListener('click', handler)
  }
  if (kind === 'input') {
    let done = false
    const handler = () => { if (done) return; done = true; setTimeout(() => { try { d.moveNext() } catch { /* ignore */ } }, 1500) }
    el.addEventListener('input', handler)
    return () => el.removeEventListener('input', handler)
  }
  if (kind === 'child-input') {
    let done = false
    const handler = () => { if (done) return; done = true; setTimeout(() => { try { d.moveNext() } catch { /* ignore */ } }, 1500) }
    const inputs = el.querySelectorAll('input, textarea')
    inputs.forEach(inp => inp.addEventListener('input', handler))
    return () => inputs.forEach(inp => inp.removeEventListener('input', handler))
  }
  return () => {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _activeDriver: any = null
// Backward compat alias used internally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _formDriver: any = null

export const destroyActiveTour = () => {
  if (_activeDriver) {
    _activeDriver.destroy()
    _activeDriver = null
  }
  if (_formDriver) {
    _formDriver.destroy()
    _formDriver = null
  }
}

export const startTour = async (lang: Lang) => {
  const { driver } = await import('driver.js')
  const ts = t(lang).tourSteps

  let currentStepIndex = 0
  let redirecting = false

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: ts.doneBtn,
    nextBtnText: ts.nextBtn,
    prevBtnText: ts.prevBtn,
    progressText: ts.progress,
    onNextClick: (_el, _step, { driver: d }) => {
      const wasOnStep = currentStepIndex
      currentStepIndex++

      if (wasOnStep === 1) {
        // Шаг "Новый пациент" — переходим к форме
        redirecting = true
        localStorage.setItem('tour_active', 'true')
        localStorage.setItem('tour_completed', 'true')
        d.destroy()
        window.location.href = '/patients/new'
        return
      }

      d.moveNext()
    },
    onPrevClick: (_el, _step, { driver: d }) => {
      currentStepIndex--
      d.movePrevious()
    },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      if (!redirecting) {
        localStorage.setItem('tour_completed', 'true')
      }
      d.destroy()
    },
    steps: getTourSteps(lang).map(step => ({
      element: step.element,
      popover: step.popover,
    })),
  })

  driverObj.drive()
}

export const startPatientFormTour = async (lang: Lang) => {
  const { driver } = await import('driver.js')
  const ts = t(lang).tourSteps

  _formDriver = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: ts.formDoneBtn,
    nextBtnText: ts.nextBtn,
    prevBtnText: ts.prevBtn,
    progressText: ts.progress,
    onNextClick: (_el, _step, { driver: d }) => { d.moveNext() },
    onPrevClick: (_el, _step, { driver: d }) => { d.movePrevious() },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      localStorage.setItem('tour_active', 'false')
      localStorage.setItem('tour_success', 'true')
      localStorage.setItem('tour_patient_active', 'true')
      _formDriver = null
      d.destroy()
    },
    steps: getPatientFormSteps(lang).map(step => ({
      element: step.element,
      popover: step.popover,
    })),
  })

  _formDriver.drive()
}

export const startPatientCardTour = async (lang: Lang) => {
  const { driver } = await import('driver.js')
  const ts = t(lang).tourSteps

  // Тип авто-перехода по индексу шага:
  // 0=patient-hero (инфо), 1=intake-link (клик), 2=schedule-btn (клик), 3=new-consultation (клик+навигация)
  const autoAdvanceMap: Record<number, 'click' | 'click-destroy'> = { 1: 'click', 2: 'click', 3: 'click-destroy' }
  let currentStep = 0
  let cleanupAutoAdvance: (() => void) | null = null

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: ts.cardDoneBtn,
    nextBtnText: ts.nextBtn,
    prevBtnText: ts.prevBtn,
    progressText: ts.progress,
    onNextClick: (_el, _step, { driver: d }) => { currentStep++; d.moveNext() },
    onPrevClick: (_el, _step, { driver: d }) => { currentStep--; d.movePrevious() },
    onHighlighted: (el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      if (!el) return
      const kind = autoAdvanceMap[currentStep]
      if (kind) cleanupAutoAdvance = setupAutoAdvance(el, kind, d)
    },
    onDeselected: () => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
    },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      localStorage.setItem('tour_patient_active', 'false')
      localStorage.setItem('tour_consult_active', 'true')
      _activeDriver = null
      d.destroy()
    },
    steps: getPatientCardSteps(lang).map(step => ({ element: step.element, popover: step.popover })),
  })

  _activeDriver = driverObj
  driverObj.drive()
}

export const startConsultationTour = async (lang: Lang) => {
  const { driver } = await import('driver.js')
  const ts = t(lang).tourSteps

  // 0=complaints (textarea), 1=editor-toolbar (инфо), 2=open-repertory (кнопка), 3=right-panel (инфо), 4=inline-rx (div с полями), 5=finish-btn (кнопка+навигация)
  const autoAdvanceMap: Record<number, 'input' | 'click' | 'child-input' | 'click-destroy'> = {
    0: 'input',
    2: 'click',
    4: 'child-input',
    5: 'click-destroy',
  }
  let currentStep = 0
  let cleanupAutoAdvance: (() => void) | null = null

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: ts.consultDoneBtn,
    nextBtnText: ts.nextBtn,
    prevBtnText: ts.prevBtn,
    progressText: ts.progress,
    onNextClick: (_el, _step, { driver: d }) => { currentStep++; d.moveNext() },
    onPrevClick: (_el, _step, { driver: d }) => { currentStep--; d.movePrevious() },
    onHighlighted: (el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      if (!el) return
      const kind = autoAdvanceMap[currentStep]
      if (kind) cleanupAutoAdvance = setupAutoAdvance(el, kind, d)
    },
    onDeselected: () => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
    },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      localStorage.setItem('tour_consult_active', 'false')
      localStorage.setItem('tour_repertory_active', 'true')
      _activeDriver = null
      d.destroy()
    },
    steps: getConsultationSteps(lang).map(step => ({ element: step.element, popover: step.popover })),
  })

  _activeDriver = driverObj
  driverObj.drive()
}

export const startRepertoryTour = async (lang: Lang) => {
  const { driver } = await import('driver.js')
  const ts = t(lang).tourSteps

  // 0=rep-search (ввод), 1=rep-rubric-row (клик по строке), 2=rep-add-rubric (кнопка +), 3=rep-analysis (инфо)
  const autoAdvanceMap: Record<number, 'input' | 'click'> = { 0: 'input', 1: 'click', 2: 'click' }
  let currentStep = 0
  let cleanupAutoAdvance: (() => void) | null = null

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: ts.repDoneBtn,
    nextBtnText: ts.nextBtn,
    prevBtnText: ts.prevBtn,
    progressText: ts.progress,
    onNextClick: (_el, _step, { driver: d }) => { currentStep++; d.moveNext() },
    onPrevClick: (_el, _step, { driver: d }) => { currentStep--; d.movePrevious() },
    onHighlighted: (el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      if (!el) return
      const kind = autoAdvanceMap[currentStep]
      if (kind) cleanupAutoAdvance = setupAutoAdvance(el, kind, d)
    },
    onDeselected: () => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
    },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      if (cleanupAutoAdvance) { cleanupAutoAdvance(); cleanupAutoAdvance = null }
      localStorage.setItem('tour_repertory_active', 'false')
      _activeDriver = null
      d.destroy()
    },
    steps: getRepertorySteps(lang).map(step => ({ element: step.element, popover: step.popover })),
  })

  _activeDriver = driverObj
  driverObj.drive()
}
