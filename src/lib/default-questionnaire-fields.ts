import type { TemplateField } from '@/lib/actions/questionnaire-templates'

// Первичная анкета — полный анамнез
export const DEFAULT_PRIMARY_FIELDS: TemplateField[] = [
  { id: 'chief_complaint', label: 'Основная жалоба', hint: 'Что беспокоит больше всего?', type: 'textarea', required: true },
  { id: 'duration', label: 'Как давно', hint: 'Когда впервые появились симптомы?', type: 'text', required: true },
  { id: 'etiology', label: 'С чего началось', hint: 'Что произошло перед началом заболевания? Стресс, травма, переохлаждение?', type: 'textarea', required: false },
  { id: 'modality_worse', label: 'Хуже от', hint: 'Что ухудшает состояние? Время суток, погода, температура, положение тела', type: 'textarea', required: false },
  { id: 'modality_better', label: 'Лучше от', hint: 'Что улучшает состояние?', type: 'textarea', required: false },
  { id: 'mental', label: 'Психика и эмоции', hint: 'Настроение, тревоги, страхи, раздражительность, сон', type: 'textarea', required: false },
  { id: 'general', label: 'Общие симптомы', hint: 'Аппетит, жажда, потливость, зябкость, предпочтения в еде', type: 'textarea', required: false },
  { id: 'sleep', label: 'Сон', hint: 'Качество сна, позиция, сновидения, пробуждения', type: 'textarea', required: false },
  { id: 'appetite', label: 'Аппетит и пищевые предпочтения', hint: 'Что любите? Что не переносите? Жажда?', type: 'textarea', required: false },
  { id: 'perspiration', label: 'Потоотделение', hint: 'Где потеете? Когда? Запах?', type: 'textarea', required: false },
  { id: 'family_history', label: 'Наследственность', hint: 'Хронические заболевания у родственников', type: 'textarea', required: false },
  { id: 'previous_treatment', label: 'Предыдущее лечение', hint: 'Какие препараты принимали? Помогало ли?', type: 'textarea', required: false },
  { id: 'allergies', label: 'Аллергии', hint: 'На что есть аллергия?', type: 'text', required: false },
  { id: 'medications', label: 'Текущие препараты', hint: 'Что принимаете сейчас?', type: 'textarea', required: false },
  // Гинекологический анамнез — необязательные, врач может убрать в настройках
  { id: 'menstrual_cycle', label: 'Менструальный цикл', hint: 'Регулярность, длительность цикла, продолжительность менструации', type: 'textarea', required: false },
  { id: 'menstrual_character', label: 'Характер менструаций', hint: 'Обильность, цвет, наличие сгустков, болезненность (до/во время/после)', type: 'textarea', required: false },
  { id: 'menstrual_concomitant', label: 'Сопутствующие симптомы', hint: 'Изменения настроения, головные боли, тошнота, отёки до/во время менструации', type: 'textarea', required: false },
  { id: 'gynecological_history', label: 'Гинекологический анамнез', hint: 'Беременности, роды, аборты, операции, выделения, климакс', type: 'textarea', required: false },
  // Прививочный анамнез и детские болезни — важно для миазматического анализа
  { id: 'vaccinations', label: 'Прививки', hint: 'Какие прививки делали? Были ли реакции? Отводы?', type: 'textarea', required: false },
  { id: 'childhood_diseases', label: 'Детские болезни', hint: 'Корь, ветрянка, скарлатина, коклюш, паротит и др. В каком возрасте?', type: 'textarea', required: false },
]

// Острый случай
export const DEFAULT_ACUTE_FIELDS: TemplateField[] = [
  { id: 'chief_complaint', label: 'Что случилось', hint: 'Опишите текущее состояние', type: 'textarea', required: true },
  { id: 'onset', label: 'Когда началось', hint: 'Точное время начала, что предшествовало', type: 'text', required: true },
  { id: 'character', label: 'Характер ощущений', hint: 'Боль: острая, тупая, пульсирующая, жгучая?', type: 'textarea', required: false },
  { id: 'modality_worse', label: 'Хуже от', hint: 'Что ухудшает? Движение, покой, тепло, холод?', type: 'textarea', required: false },
  { id: 'modality_better', label: 'Лучше от', hint: 'Что облегчает?', type: 'textarea', required: false },
  { id: 'temperature', label: 'Температура', hint: 'Есть ли? Какая?', type: 'text', required: false },
  { id: 'concomitant', label: 'Сопутствующие симптомы', hint: 'Что ещё беспокоит?', type: 'textarea', required: false },
  { id: 'mental', label: 'Эмоциональное состояние', hint: 'Тревога, раздражительность, плаксивость?', type: 'textarea', required: false },
  { id: 'taken', label: 'Что уже приняли', hint: 'Препараты, которые уже принимали', type: 'text', required: false },
]

// Предконсультационный опросник
export const DEFAULT_PRE_VISIT_FIELDS: TemplateField[] = [
  { id: 'general_state', label: 'Общее состояние', hint: 'Как вы себя чувствуете в целом?', type: 'scale', required: true, scaleMin: 1, scaleMax: 10 },
  { id: 'changes', label: 'Что изменилось с прошлого визита', hint: 'Опишите любые изменения', type: 'textarea', required: true },
  { id: 'remedy_reaction', label: 'Реакция на препарат', hint: 'Заметили ли изменения после приёма?', type: 'textarea', required: false },
  { id: 'remedy_compliance', label: 'Принимали ли по назначению', type: 'select', required: false, options: ['Да, полностью', 'Частично', 'Нет'] },
  { id: 'new_symptoms', label: 'Новые симптомы', hint: 'Появилось ли что-то новое?', type: 'textarea', required: false },
  { id: 'sleep', label: 'Сон', type: 'select', required: false, options: ['Хороший', 'С трудностями', 'Бессонница', 'Улучшился', 'Ухудшился'] },
  { id: 'appetite', label: 'Аппетит', type: 'select', required: false, options: ['Хороший', 'Сниженный', 'Повышенный', 'Без изменений'] },
  { id: 'mood', label: 'Настроение', hint: 'Как ваше эмоциональное состояние?', type: 'textarea', required: false },
  { id: 'energy', label: 'Энергия', type: 'select', required: false, options: ['Высокая', 'Нормальная', 'Низкая', 'Очень низкая'] },
  { id: 'additional', label: 'Что ещё хотите сообщить врачу', type: 'textarea', required: false },
]

export function getDefaultFields(type: 'primary' | 'acute' | 'pre_visit'): TemplateField[] {
  switch (type) {
    case 'primary': return DEFAULT_PRIMARY_FIELDS
    case 'acute': return DEFAULT_ACUTE_FIELDS
    case 'pre_visit': return DEFAULT_PRE_VISIT_FIELDS
  }
}
