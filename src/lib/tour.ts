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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _formDriver: any = null

export const destroyActiveTour = () => {
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
