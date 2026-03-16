const tourSteps = [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: '👋 Добро пожаловать в Similia!',
      description: 'Это ваша главная навигация. Здесь находятся все разделы — Главная, Реперторий и Пациенты.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="new-patient"]',
    popover: {
      title: '➕ Добавить пациента',
      description: 'Нажмите сюда чтобы создать карточку нового пациента. Займёт около двух минут.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="questionnaire-btn"]',
    popover: {
      title: '📋 Анкета до приёма',
      description: 'Отправьте пациенту ссылку — он заполнит анкету дома до визита. Экономит 20 минут на первичке.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-list"]',
    popover: {
      title: '🔍 Поиск пациентов',
      description: 'Все пациенты здесь. Поиск по имени или препарату — мгновенный.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="repertory-link"]',
    popover: {
      title: '📖 Реперторий',
      description: 'Встроенный репертоий Кента с 74 000 рубрик. Ищите симптомы прямо во время консультации.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="stats"]',
    popover: {
      title: '📊 Ваша статистика',
      description: 'Здесь будет расти ваша статистика — консультации, динамика пациентов, самые частые препараты.',
      side: 'bottom' as const,
    },
  },
]

const patientFormSteps = [
  {
    element: '[data-tour="patient-name"]',
    popover: {
      title: '👤 Имя пациента',
      description: 'Начните с полного имени. Это поле обязательно — по нему вы будете искать пациента в системе.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-birthdate"]',
    popover: {
      title: '🎂 Дата рождения',
      description: 'Укажите дату рождения — система автоматически рассчитает возраст пациента.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-phone"]',
    popover: {
      title: '📱 Телефон',
      description: 'Телефон нужен для связи. Он отобразится прямо в карточке — можно нажать и позвонить.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-email"]',
    popover: {
      title: '✉️ Email',
      description: 'Email для отправки анкеты или напоминаний о визите.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-constitution"]',
    popover: {
      title: '🌿 Конституциональный тип',
      description: 'Начните вводить — система покажет подсказки из базы полихрестов. Можно заполнить позже.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="patient-note"]',
    popover: {
      title: '📝 Заметка',
      description: 'Здесь пишите всё важное: аллергии, особенности характера, ключевые симптомы. Видно только вам.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="patient-submit"]',
    popover: {
      title: '✅ Готово!',
      description: 'Нажмите "Создать пациента" — карточка создана. Дальше можно начать консультацию или записать на приём.',
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

export const startTour = async () => {
  const { driver } = await import('driver.js')

  let currentStepIndex = 0
  let redirecting = false

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: '🎉 Начать работу',
    nextBtnText: 'Далее →',
    prevBtnText: '← Назад',
    progressText: '{{current}} из {{total}}',
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
    steps: tourSteps.map(step => ({
      element: step.element,
      popover: step.popover,
    })),
  })

  driverObj.drive()
}

export const startPatientFormTour = async () => {
  const { driver } = await import('driver.js')

  _formDriver = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: '✅ Понятно!',
    nextBtnText: 'Далее →',
    prevBtnText: '← Назад',
    progressText: '{{current}} из {{total}}',
    onNextClick: (_el, _step, { driver: d }) => { d.moveNext() },
    onPrevClick: (_el, _step, { driver: d }) => { d.movePrevious() },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      localStorage.setItem('tour_active', 'false')
      localStorage.setItem('tour_success', 'true')
      _formDriver = null
      d.destroy()
    },
    steps: patientFormSteps.map(step => ({
      element: step.element,
      popover: step.popover,
    })),
  })

  _formDriver.drive()
}
