/**
 * Перетест 50 кейсов через MDRI Engine (локально, без API)
 * Диагностика findRubrics для каждого MISS
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

// === Загрузка данных ===
function loadData(): MDRIData {
  const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
  const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
  const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
  const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({
    rubric: r.fullpath,
    chapter: r.chapter,
    remedies: r.remedies,
  }))

  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of constellationsRaw) {
    constellations[c.remedy] = {
      name: c.name,
      clusters: c.clusters,
      sine_qua_non: c.sine_qua_non,
      excluders: c.excluders,
    }
  }

  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of polaritiesRaw) {
    polarities[p.remedy] = p.polarities
  }

  // Clinical data
  const clinicalData: MDRIClinicalData = {
    thermal_contradictions: {},
    consistency_groups: [],
  }
  for (const cd of clinicalRaw) {
    if (cd.type === 'thermal_contradiction' && cd.data) {
      Object.assign(clinicalData.thermal_contradictions, cd.data)
    }
  }

  const indices = buildIndices(repertory, constellations)

  return {
    repertory,
    constellations,
    polarities,
    relationships: {},
    clinicalData,
    ...indices,
  }
}

// === 50 тестовых кейсов: structured symptoms ===
type TestCase = {
  id: number
  name: string
  expected: string
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  familyHistory: string[]
  profile: MDRIPatientProfile
}

const CASES: TestCase[] = [
  // 1. Sulphur
  {
    id: 1, name: 'Sulphur: философ-грязнуля', expected: 'sulph',
    symptoms: [
      { rubric: 'itching skin worse heat washing', category: 'particular', present: true, weight: 3 },
      { rubric: 'burning feet at night uncovers', category: 'particular', present: true, weight: 3 },
      { rubric: 'hunger 11am emptiness stomach', category: 'general', present: true, weight: 2 },
      { rubric: 'aversion bathing', category: 'general', present: true, weight: 2 },
      { rubric: 'theorizing philosophizing', category: 'mental', present: true, weight: 1 },
      { rubric: 'standing aggravates', category: 'general', present: true, weight: 2 },
      { rubric: 'redness orifices', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'agg' }],
    familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'adult' },
  },
  // 2. Calc-carb
  {
    id: 2, name: 'Calc: зябкий потливый ребёнок', expected: 'calc',
    symptoms: [
      { rubric: 'perspiration head night', category: 'particular', present: true, weight: 3 },
      { rubric: 'feet cold damp', category: 'particular', present: true, weight: 2 },
      { rubric: 'slow development late walking late teething', category: 'general', present: true, weight: 2 },
      { rubric: 'desire eggs', category: 'general', present: true, weight: 2 },
      { rubric: 'fear dogs', category: 'mental', present: true, weight: 1 },
      { rubric: 'obstinate', category: 'mental', present: true, weight: 1 },
      { rubric: 'chilly', category: 'general', present: true, weight: 2 },
      { rubric: 'sour smell body', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 3. Lycopodium
  {
    id: 3, name: 'Lyc: вздутие справа 16-20', expected: 'lyc',
    symptoms: [
      { rubric: 'distension abdomen after eating few mouthfuls', category: 'particular', present: true, weight: 3 },
      { rubric: 'complaints right side', category: 'general', present: true, weight: 2 },
      { rubric: 'worse 4pm 8pm afternoon evening', category: 'general', present: true, weight: 3 },
      { rubric: 'anxiety anticipation stage fright', category: 'mental', present: true, weight: 2 },
      { rubric: 'dictatorial domineering', category: 'mental', present: true, weight: 2 },
      { rubric: 'desire sweets', category: 'general', present: true, weight: 1 },
      { rubric: 'warm drinks amel', category: 'general', present: true, weight: 1 },
      { rubric: 'flatulence bloating', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 4. Phosphorus
  {
    id: 4, name: 'Phos: кровоточивый общительный', expected: 'phos',
    symptoms: [
      { rubric: 'epistaxis bright red blood', category: 'particular', present: true, weight: 2 },
      { rubric: 'fear dark thunderstorm alone', category: 'mental', present: true, weight: 3 },
      { rubric: 'sympathetic compassionate', category: 'mental', present: true, weight: 2 },
      { rubric: 'thirst cold water large quantities', category: 'general', present: true, weight: 3 },
      { rubric: 'worse twilight', category: 'general', present: true, weight: 2 },
      { rubric: 'burning pain between scapulae', category: 'particular', present: true, weight: 2 },
      { rubric: 'desire ice cream', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 5. Sepia
  {
    id: 5, name: 'Sepia: безразличная мать', expected: 'sep',
    symptoms: [
      { rubric: 'indifference family husband children', category: 'mental', present: true, weight: 3 },
      { rubric: 'bearing down sensation prolapse uterus', category: 'particular', present: true, weight: 3 },
      { rubric: 'yellow spots face chloasma', category: 'particular', present: true, weight: 2 },
      { rubric: 'constipation', category: 'particular', present: true, weight: 1 },
      { rubric: 'desire vinegar sour', category: 'general', present: true, weight: 2 },
      { rubric: 'better vigorous exercise dancing', category: 'general', present: true, weight: 3 },
      { rubric: 'irritability', category: 'mental', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 6. Arsenicum
  {
    id: 6, name: 'Ars: педант в полночь', expected: 'ars',
    symptoms: [
      { rubric: 'anxiety health hypochondria cancer', category: 'mental', present: true, weight: 3 },
      { rubric: 'fastidious orderly', category: 'mental', present: true, weight: 2 },
      { rubric: 'restlessness cannot lie still', category: 'mental', present: true, weight: 2 },
      { rubric: 'worse after midnight 1am 2am', category: 'general', present: true, weight: 3 },
      { rubric: 'chilly', category: 'general', present: true, weight: 2 },
      { rubric: 'burning pains better warm applications', category: 'general', present: true, weight: 3 },
      { rubric: 'thirst small sips frequently', category: 'general', present: true, weight: 2 },
      { rubric: 'weakness prostration disproportionate', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 7. Nux vomica
  {
    id: 7, name: 'Nux-v: нервный бизнесмен', expected: 'nux-v',
    symptoms: [
      { rubric: 'irritability impatience', category: 'mental', present: true, weight: 2 },
      { rubric: 'overwork sedentary', category: 'general', present: true, weight: 1 },
      { rubric: 'desire stimulants coffee alcohol', category: 'general', present: true, weight: 2 },
      { rubric: 'constipation ineffectual urging', category: 'particular', present: true, weight: 3 },
      { rubric: 'nausea morning', category: 'particular', present: true, weight: 2 },
      { rubric: 'sensitive noise light', category: 'general', present: true, weight: 2 },
      { rubric: 'chilly worse draft', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 8. Pulsatilla
  {
    id: 8, name: 'Puls: плаксивая девочка', expected: 'puls',
    symptoms: [
      { rubric: 'weeping easily consolation amel', category: 'mental', present: true, weight: 3 },
      { rubric: 'thirstless', category: 'general', present: true, weight: 3 },
      { rubric: 'worse warm room better open air', category: 'general', present: true, weight: 3 },
      { rubric: 'changeable mood', category: 'mental', present: true, weight: 2 },
      { rubric: 'aversion fat food nausea', category: 'general', present: true, weight: 2 },
      { rubric: 'mild yielding gentle', category: 'mental', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'agg' }],
    familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 9. Belladonna
  {
    id: 9, name: 'Bell: горячая красная внезапная', expected: 'bell',
    symptoms: [
      { rubric: 'fever sudden high temperature', category: 'general', present: true, weight: 3 },
      { rubric: 'face red hot congested', category: 'particular', present: true, weight: 3 },
      { rubric: 'pupils dilated', category: 'particular', present: true, weight: 2 },
      { rubric: 'headache throbbing pulsating worse light noise', category: 'particular', present: true, weight: 3 },
      { rubric: 'worse jarring', category: 'general', present: true, weight: 2 },
      { rubric: 'delirium fever', category: 'mental', present: true, weight: 2 },
      { rubric: 'dry heat', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' },
  },
  // 10. Rhus-tox
  {
    id: 10, name: 'Rhus-t: скованность от покоя', expected: 'rhus-t',
    symptoms: [
      { rubric: 'stiffness joints morning first motion', category: 'particular', present: true, weight: 3 },
      { rubric: 'better continued motion limbers up', category: 'general', present: true, weight: 3 },
      { rubric: 'worse rest cannot sit still', category: 'general', present: true, weight: 3 },
      { rubric: 'worse damp wet weather', category: 'general', present: true, weight: 2 },
      { rubric: 'restless night tossing turning', category: 'general', present: true, weight: 2 },
      { rubric: 'better warm bath', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'motion_rest', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 11. Staph
  {
    id: 11, name: 'Staph vs Ign: подавленный гнев', expected: 'staph',
    symptoms: [
      { rubric: 'suppressed anger indignation humiliation', category: 'mental', present: true, weight: 3 },
      { rubric: 'styes recurrent', category: 'particular', present: true, weight: 2 },
      { rubric: 'cystitis after coition', category: 'particular', present: true, weight: 3 },
      { rubric: 'sensitive offended easily', category: 'mental', present: true, weight: 2 },
      { rubric: 'ailments from humiliation', category: 'mental', present: true, weight: 3 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 12. Aurum
  {
    id: 12, name: 'Aur: депрессия с виной', expected: 'aur',
    symptoms: [
      { rubric: 'depression suicidal impulse jump from height', category: 'mental', present: true, weight: 3 },
      { rubric: 'self reproach guilt duty', category: 'mental', present: true, weight: 3 },
      { rubric: 'anger contradiction', category: 'mental', present: true, weight: 2 },
      { rubric: 'conscientious responsible workaholic', category: 'mental', present: true, weight: 2 },
      { rubric: 'palpitation heart', category: 'particular', present: true, weight: 1 },
      { rubric: 'worse night', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 13. Chamomilla
  {
    id: 13, name: 'Cham: невыносимая боль зубы', expected: 'cham',
    symptoms: [
      { rubric: 'dentition difficult teething pain', category: 'particular', present: true, weight: 3 },
      { rubric: 'one cheek red other pale', category: 'particular', present: true, weight: 3 },
      { rubric: 'capricious asks then refuses', category: 'mental', present: true, weight: 3 },
      { rubric: 'wants to be carried', category: 'mental', present: true, weight: 2 },
      { rubric: 'stool green', category: 'particular', present: true, weight: 2 },
      { rubric: 'oversensitive pain intolerance', category: 'mental', present: true, weight: 3 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' },
  },
  // 14. Apis
  {
    id: 14, name: 'Apis vs Puls: отёк без жажды', expected: 'apis',
    symptoms: [
      { rubric: 'edema swelling stinging pain', category: 'particular', present: true, weight: 3 },
      { rubric: 'better cold applications', category: 'general', present: true, weight: 3 },
      { rubric: 'thirstless', category: 'general', present: true, weight: 2 },
      { rubric: 'worse heat in any form', category: 'general', present: true, weight: 2 },
      { rubric: 'jealousy', category: 'mental', present: true, weight: 1 },
      { rubric: 'right side worse', category: 'general', present: true, weight: 1 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'agg' }],
    familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' },
  },
  // 15. Gelsemium
  {
    id: 15, name: 'Gels: паралич от страха', expected: 'gels',
    symptoms: [
      { rubric: 'weakness trembling anticipation exam', category: 'mental', present: true, weight: 3 },
      { rubric: 'drowsiness heaviness eyelids', category: 'general', present: true, weight: 3 },
      { rubric: 'tremor trembling weakness', category: 'general', present: true, weight: 2 },
      { rubric: 'thirstless during fever', category: 'general', present: true, weight: 2 },
      { rubric: 'gradual onset', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' },
  },
  // 16. Mercurius
  {
    id: 16, name: 'Merc: нагноение ночью', expected: 'merc',
    symptoms: [
      { rubric: 'abscess gum suppuration', category: 'particular', present: true, weight: 2 },
      { rubric: 'salivation profuse', category: 'particular', present: true, weight: 3 },
      { rubric: 'offensive breath mouth', category: 'particular', present: true, weight: 2 },
      { rubric: 'tongue imprint teeth', category: 'particular', present: true, weight: 3 },
      { rubric: 'perspiration night no relief', category: 'general', present: true, weight: 2 },
      { rubric: 'worse night', category: 'general', present: true, weight: 2 },
      { rubric: 'sensitive heat and cold equally', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 17. Conium
  {
    id: 17, name: 'Con: вертиго при повороте', expected: 'con',
    symptoms: [
      { rubric: 'vertigo turning head', category: 'particular', present: true, weight: 3 },
      { rubric: 'worse watching moving objects', category: 'general', present: true, weight: 2 },
      { rubric: 'weakness ascending', category: 'general', present: true, weight: 2 },
      { rubric: 'induration glands breast hard', category: 'particular', present: true, weight: 3 },
      { rubric: 'memory weak', category: 'mental', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'elderly' },
  },
  // 18. Kali-carb
  {
    id: 18, name: 'Kali-c: 2 часа ночи', expected: 'kali-c',
    symptoms: [
      { rubric: 'waking 2am 3am dyspnea', category: 'particular', present: true, weight: 3 },
      { rubric: 'rigid duty conscientious rules', category: 'mental', present: true, weight: 2 },
      { rubric: 'anxiety felt in stomach', category: 'mental', present: true, weight: 2 },
      { rubric: 'stitching pain', category: 'general', present: true, weight: 2 },
      { rubric: 'edema upper eyelids puffiness', category: 'particular', present: true, weight: 3 },
      { rubric: 'weakness back lumbar', category: 'particular', present: true, weight: 1 },
      { rubric: 'chilly', category: 'general', present: true, weight: 2 },
      { rubric: 'startled easily', category: 'mental', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 19. Arg-n
  {
    id: 19, name: 'Arg-n: тревога ожидания с поносом', expected: 'arg-n',
    symptoms: [
      { rubric: 'diarrhea anticipation anxiety before event', category: 'particular', present: true, weight: 3 },
      { rubric: 'hurry impatience', category: 'mental', present: true, weight: 2 },
      { rubric: 'fear heights bridges impulse jump', category: 'mental', present: true, weight: 3 },
      { rubric: 'desire sweets worse from them', category: 'general', present: true, weight: 3 },
      { rubric: 'flatulence loud', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 20. Petroleum
  {
    id: 20, name: 'Petr: экзема зимой трещины', expected: 'petr',
    symptoms: [
      { rubric: 'cracks fissures hands deep bleeding winter', category: 'particular', present: true, weight: 3 },
      { rubric: 'worse washing cold weather', category: 'general', present: true, weight: 2 },
      { rubric: 'skin rough dry', category: 'particular', present: true, weight: 2 },
      { rubric: 'motion sickness nausea travel', category: 'general', present: true, weight: 2 },
      { rubric: 'hunger with nausea', category: 'general', present: true, weight: 3 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 21. Lac caninum
  {
    id: 21, name: 'Lac-c: боль меняет сторону', expected: 'lac-c',
    symptoms: [
      { rubric: 'sore throat alternating sides', category: 'particular', present: true, weight: 3 },
      { rubric: 'headache alternating sides left right', category: 'particular', present: true, weight: 3 },
      { rubric: 'self contempt worthlessness', category: 'mental', present: true, weight: 3 },
      { rubric: 'fear snakes', category: 'mental', present: true, weight: 1 },
      { rubric: 'sensation throat constriction', category: 'particular', present: true, weight: 2 },
      { rubric: 'worse touch throat', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 22. Cocculus
  {
    id: 22, name: 'Cocc: истощение от ухода', expected: 'cocc',
    symptoms: [
      { rubric: 'exhaustion nursing caring watching sleeplessness', category: 'general', present: true, weight: 3 },
      { rubric: 'motion sickness nausea vertigo', category: 'general', present: true, weight: 3 },
      { rubric: 'emptiness hollow sensation', category: 'general', present: true, weight: 2 },
      { rubric: 'weakness extreme', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 23. Thuja
  {
    id: 23, name: 'Thuja: бородавки после прививки', expected: 'thuj',
    symptoms: [
      { rubric: 'warts after vaccination', category: 'particular', present: true, weight: 3 },
      { rubric: 'skin oily greasy', category: 'particular', present: true, weight: 2 },
      { rubric: 'discharge greenish', category: 'particular', present: true, weight: 1 },
      { rubric: 'secretive reserved', category: 'mental', present: true, weight: 2 },
      { rubric: 'fixed ideas delusion body fragile', category: 'mental', present: true, weight: 2 },
      { rubric: 'worse damp', category: 'general', present: true, weight: 1 },
      { rubric: 'left side', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: ['papillomas'], profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 24. Spongia
  {
    id: 24, name: 'Spong: лающий кашель круп', expected: 'spong',
    symptoms: [
      { rubric: 'cough barking dry croup sawing', category: 'particular', present: true, weight: 3 },
      { rubric: 'wheezing respiration difficult', category: 'particular', present: true, weight: 2 },
      { rubric: 'anxiety dyspnea', category: 'mental', present: true, weight: 1 },
      { rubric: 'larynx sensitive touch', category: 'particular', present: true, weight: 2 },
      { rubric: 'worse before midnight', category: 'general', present: true, weight: 2 },
      { rubric: 'better warm drinks', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' },
  },
  // 25. Ipecac
  {
    id: 25, name: 'Ip: неукротимая тошнота', expected: 'ip',
    symptoms: [
      { rubric: 'nausea constant vomiting does not relieve', category: 'particular', present: true, weight: 3 },
      { rubric: 'tongue clean despite nausea', category: 'particular', present: true, weight: 3 },
      { rubric: 'epistaxis with nausea bright blood', category: 'particular', present: true, weight: 2 },
      { rubric: 'cough spasmodic nausea', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' },
  },
  // 26. Drosera
  {
    id: 26, name: 'Dros: коклюшный кашель', expected: 'dros',
    symptoms: [
      { rubric: 'cough paroxysmal whooping spasmodic', category: 'particular', present: true, weight: 3 },
      { rubric: 'cough ending vomiting', category: 'particular', present: true, weight: 2 },
      { rubric: 'worse lying down', category: 'general', present: true, weight: 2 },
      { rubric: 'worse after midnight', category: 'general', present: true, weight: 1 },
      { rubric: 'epistaxis from cough', category: 'particular', present: true, weight: 2 },
      { rubric: 'worse talking laughing', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' },
  },
  // 27. Colocynthis
  {
    id: 27, name: 'Coloc: колика от гнева', expected: 'coloc',
    symptoms: [
      { rubric: 'colic abdomen doubling up bending', category: 'particular', present: true, weight: 3 },
      { rubric: 'ailments from anger indignation', category: 'mental', present: true, weight: 3 },
      { rubric: 'better hard pressure', category: 'general', present: true, weight: 3 },
      { rubric: 'better warmth heat', category: 'general', present: true, weight: 2 },
      { rubric: 'pain cramping waves', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 28. Tabacum
  {
    id: 28, name: 'Tab: укачивание бледность', expected: 'tab',
    symptoms: [
      { rubric: 'motion sickness nausea deathly', category: 'general', present: true, weight: 3 },
      { rubric: 'pallor deathly pale face', category: 'particular', present: true, weight: 3 },
      { rubric: 'cold sweat', category: 'general', present: true, weight: 2 },
      { rubric: 'better open air', category: 'general', present: true, weight: 2 },
      { rubric: 'worse opening eyes', category: 'general', present: true, weight: 2 },
      { rubric: 'palpitation', category: 'particular', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 29. Causticum
  {
    id: 29, name: 'Caust: хрипота и справедливость', expected: 'caust',
    symptoms: [
      { rubric: 'hoarseness gradual loss voice', category: 'particular', present: true, weight: 3 },
      { rubric: 'sympathetic injustice weeping compassion', category: 'mental', present: true, weight: 3 },
      { rubric: 'weakness progressive paralysis', category: 'general', present: true, weight: 2 },
      { rubric: 'ptosis eyelid drooping', category: 'particular', present: true, weight: 2 },
      { rubric: 'worse dry cold', category: 'general', present: true, weight: 2 },
      { rubric: 'better damp wet weather', category: 'general', present: true, weight: 3 },
      { rubric: 'thirst cold drinks', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 30. Stramonium
  {
    id: 30, name: 'Stram: ужас темноты + насилие', expected: 'stram',
    symptoms: [
      { rubric: 'fear dark terror panic', category: 'mental', present: true, weight: 3 },
      { rubric: 'fear water shining objects', category: 'mental', present: true, weight: 2 },
      { rubric: 'violent aggressive biting striking', category: 'mental', present: true, weight: 3 },
      { rubric: 'stammering speech', category: 'particular', present: true, weight: 2 },
      { rubric: 'nightmares terror waking screaming', category: 'mental', present: true, weight: 3 },
      { rubric: 'worse alone', category: 'mental', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 31. Medorrhinum
  {
    id: 31, name: 'Med: сон на животе + море', expected: 'med',
    symptoms: [
      { rubric: 'eczema since birth', category: 'particular', present: true, weight: 2 },
      { rubric: 'itching worse night', category: 'particular', present: true, weight: 2 },
      { rubric: 'sleep position abdomen prone', category: 'general', present: true, weight: 3 },
      { rubric: 'better at sea seashore', category: 'general', present: true, weight: 3 },
      { rubric: 'desire sweets', category: 'general', present: true, weight: 1 },
      { rubric: 'better evening worse morning', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: ['papillomas', 'asthma'],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 32. Tuberculinum
  {
    id: 32, name: 'Tub: путешественник', expected: 'tub',
    symptoms: [
      { rubric: 'desire travel change restlessness', category: 'mental', present: true, weight: 3 },
      { rubric: 'emaciation despite appetite', category: 'general', present: true, weight: 2 },
      { rubric: 'catches cold easily', category: 'general', present: true, weight: 2 },
      { rubric: 'romantic idealistic', category: 'mental', present: true, weight: 1 },
      { rubric: 'perspiration night', category: 'general', present: true, weight: 2 },
      { rubric: 'glands enlarged swollen', category: 'particular', present: true, weight: 2 },
      { rubric: 'allergies', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: ['tuberculosis'],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 33. Psorinum
  {
    id: 33, name: 'Psor: зябкий отчаявшийся', expected: 'psor',
    symptoms: [
      { rubric: 'eczema worse winter', category: 'particular', present: true, weight: 2 },
      { rubric: 'chilly extremely', category: 'general', present: true, weight: 2 },
      { rubric: 'despair recovery hopeless', category: 'mental', present: true, weight: 3 },
      { rubric: 'offensive smell body even after washing', category: 'general', present: true, weight: 3 },
      { rubric: 'hunger night', category: 'general', present: true, weight: 2 },
      { rubric: 'eruptions suppressed worse', category: 'particular', present: true, weight: 2 },
      { rubric: 'dirty appearance', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: ['psoriasis'], profile: DEFAULT_PROFILE,
  },
  // 34. Carcinosinum
  {
    id: 34, name: 'Carc: перфекционист подавленный', expected: 'carc',
    symptoms: [
      { rubric: 'perfectionism fastidious for others', category: 'mental', present: true, weight: 3 },
      { rubric: 'insomnia', category: 'general', present: true, weight: 1 },
      { rubric: 'desire thunderstorm', category: 'mental', present: true, weight: 2 },
      { rubric: 'desire travel', category: 'mental', present: true, weight: 1 },
      { rubric: 'sympathetic weeping for others', category: 'mental', present: true, weight: 2 },
      { rubric: 'moles naevi many', category: 'particular', present: true, weight: 3 },
      { rubric: 'suppressed emotions smiling always', category: 'mental', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: ['cancer'],
    profile: DEFAULT_PROFILE,
  },
  // 35. Silicea
  {
    id: 35, name: 'Sil: тонкий упрямый зябкий', expected: 'sil',
    symptoms: [
      { rubric: 'thin delicate but obstinate', category: 'mental', present: true, weight: 2 },
      { rubric: 'chilly extremely', category: 'general', present: true, weight: 2 },
      { rubric: 'perspiration head night', category: 'particular', present: true, weight: 2 },
      { rubric: 'feet perspiration offensive', category: 'particular', present: true, weight: 3 },
      { rubric: 'suppuration every wound', category: 'general', present: true, weight: 3 },
      { rubric: 'stage fright', category: 'mental', present: true, weight: 1 },
      { rubric: 'mild yielding but fixed determination', category: 'mental', present: true, weight: 2 },
      { rubric: 'foreign body expulsion splinter', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 36. Graphites
  {
    id: 36, name: 'Graph: толстый + мокнущая экзема', expected: 'graph',
    symptoms: [
      { rubric: 'eczema moist discharge honey sticky', category: 'particular', present: true, weight: 3 },
      { rubric: 'cracks folds skin behind ears', category: 'particular', present: true, weight: 3 },
      { rubric: 'obesity overweight', category: 'general', present: true, weight: 1 },
      { rubric: 'chilly', category: 'general', present: true, weight: 2 },
      { rubric: 'constipation stool large hard', category: 'particular', present: true, weight: 2 },
      { rubric: 'irresolution timidity', category: 'mental', present: true, weight: 1 },
      { rubric: 'nails deformed thick', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 37. Hepar sulph
  {
    id: 37, name: 'Hep: крайняя чувствительность', expected: 'hep',
    symptoms: [
      { rubric: 'abscess tonsil suppuration', category: 'particular', present: true, weight: 3 },
      { rubric: 'oversensitive pain touch slightest', category: 'general', present: true, weight: 3 },
      { rubric: 'discharge offensive cheese old', category: 'particular', present: true, weight: 2 },
      { rubric: 'intolerance cold slightest draft', category: 'general', present: true, weight: 3 },
      { rubric: 'irritability cross angry from pain', category: 'mental', present: true, weight: 2 },
      { rubric: 'sensation splinter throat', category: 'particular', present: true, weight: 3 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 38. Baryta carb
  {
    id: 38, name: 'Bar-c: медленный ребёнок', expected: 'bar-c',
    symptoms: [
      { rubric: 'slow development late speech late walking', category: 'general', present: true, weight: 3 },
      { rubric: 'bashful shy hides behind mother', category: 'mental', present: true, weight: 3 },
      { rubric: 'tonsils enlarged chronic', category: 'particular', present: true, weight: 2 },
      { rubric: 'chilly', category: 'general', present: true, weight: 2 },
      { rubric: 'memory weak forgetful', category: 'mental', present: true, weight: 2 },
      { rubric: 'small stature short for age', category: 'general', present: true, weight: 2 },
      { rubric: 'catches cold easily', category: 'general', present: true, weight: 1 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' }],
    familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 39. Lachesis
  {
    id: 39, name: 'Lach: менопауза левосторонняя', expected: 'lach',
    symptoms: [
      { rubric: 'hot flushes menopause climacteric', category: 'general', present: true, weight: 2 },
      { rubric: 'left side complaints', category: 'general', present: true, weight: 2 },
      { rubric: 'intolerance tight clothing around neck', category: 'general', present: true, weight: 3 },
      { rubric: 'jealousy suspicious', category: 'mental', present: true, weight: 3 },
      { rubric: 'loquacity talkative', category: 'mental', present: true, weight: 2 },
      { rubric: 'worse after sleep', category: 'general', present: true, weight: 3 },
      { rubric: 'hot patient', category: 'general', present: true, weight: 2 },
      { rubric: 'headache left worse sun', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'agg' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 40. Phosphoric acid
  {
    id: 40, name: 'Ph-ac: апатия от горя', expected: 'ph-ac',
    symptoms: [
      { rubric: 'apathy indifference grief loss', category: 'mental', present: true, weight: 3 },
      { rubric: 'mental exhaustion dullness', category: 'mental', present: true, weight: 2 },
      { rubric: 'hair loss falling', category: 'particular', present: true, weight: 2 },
      { rubric: 'diarrhea painless', category: 'particular', present: true, weight: 2 },
      { rubric: 'face pale emaciated', category: 'particular', present: true, weight: 1 },
      { rubric: 'growth retarded', category: 'general', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 41. Bryonia
  {
    id: 41, name: 'Bry: артрит, движение хуже', expected: 'bry',
    symptoms: [
      { rubric: 'arthritis joints worse motion any movement', category: 'particular', present: true, weight: 3 },
      { rubric: 'swelling joints', category: 'particular', present: true, weight: 2 },
      { rubric: 'better pressure lying still immobility', category: 'general', present: true, weight: 3 },
      { rubric: 'thirst large quantities', category: 'general', present: true, weight: 2 },
      { rubric: 'dryness mouth mucous membranes', category: 'particular', present: true, weight: 2 },
      { rubric: 'irritability wants to be alone', category: 'mental', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'motion_rest', value: 'agg' }],
    familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 42. Natrum mur
  {
    id: 42, name: 'Nat-m: горе давнее', expected: 'nat-m',
    symptoms: [
      { rubric: 'grief suppressed old silent weeping alone', category: 'mental', present: true, weight: 3 },
      { rubric: 'consolation aggravates', category: 'mental', present: true, weight: 3 },
      { rubric: 'headache sun heat', category: 'particular', present: true, weight: 2 },
      { rubric: 'desire salt', category: 'general', present: true, weight: 3 },
      { rubric: 'emaciation', category: 'general', present: true, weight: 1 },
      { rubric: 'worse sun 10am 11am', category: 'general', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 43. Arnica
  {
    id: 43, name: 'Arn: травма — я в порядке', expected: 'arn',
    symptoms: [
      { rubric: 'bruises contusions injury trauma', category: 'particular', present: true, weight: 3 },
      { rubric: 'bed feels too hard soreness', category: 'general', present: true, weight: 3 },
      { rubric: 'says nothing wrong refuses help well', category: 'mental', present: true, weight: 3 },
      { rubric: 'fear touch approached', category: 'mental', present: true, weight: 2 },
      { rubric: 'ecchymosis bruise', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' },
  },
  // 44. Veratrum album
  {
    id: 44, name: 'Verat: понос + коллапс', expected: 'verat',
    symptoms: [
      { rubric: 'vomiting diarrhea simultaneous cholera', category: 'particular', present: true, weight: 3 },
      { rubric: 'cold sweat forehead', category: 'general', present: true, weight: 3 },
      { rubric: 'collapse prostration extreme', category: 'general', present: true, weight: 3 },
      { rubric: 'cramps legs calves', category: 'particular', present: true, weight: 2 },
      { rubric: 'pale bluish face', category: 'particular', present: true, weight: 2 },
      { rubric: 'thirst ice cold water', category: 'general', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'motion_rest', value: 'agg' }],
    familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' },
  },
  // 45. Mag phos
  {
    id: 45, name: 'Mag-p: спазмы + тепло лучше', expected: 'mag-p',
    symptoms: [
      { rubric: 'cramps spasms menstrual dysmenorrhea', category: 'particular', present: true, weight: 3 },
      { rubric: 'better warmth heat hot applications', category: 'general', present: true, weight: 3 },
      { rubric: 'better bending doubling up', category: 'general', present: true, weight: 2 },
      { rubric: 'better pressure', category: 'general', present: true, weight: 2 },
      { rubric: 'right side worse', category: 'general', present: true, weight: 1 },
      { rubric: 'pain lightning shooting come go suddenly', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 46. Allium cepa
  {
    id: 46, name: 'All-c: насморк жгучий', expected: 'all-c',
    symptoms: [
      { rubric: 'coryza discharge acrid burning nose', category: 'particular', present: true, weight: 3 },
      { rubric: 'lachrymation bland not burning', category: 'particular', present: true, weight: 3 },
      { rubric: 'sneezing', category: 'particular', present: true, weight: 1 },
      { rubric: 'worse warm room better open air', category: 'general', present: true, weight: 2 },
      { rubric: 'coryza after getting wet', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'agg' }],
    familyHistory: [],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' },
  },
  // 47. Ferrum met
  {
    id: 47, name: 'Ferr: анемия + покраснение', expected: 'ferr',
    symptoms: [
      { rubric: 'anemia pallor', category: 'general', present: true, weight: 2 },
      { rubric: 'face flushes easily red', category: 'particular', present: true, weight: 3 },
      { rubric: 'weakness better slow walking', category: 'general', present: true, weight: 2 },
      { rubric: 'flushing slightest exertion', category: 'general', present: true, weight: 3 },
      { rubric: 'vomiting after eating', category: 'particular', present: true, weight: 2 },
      { rubric: 'false plethora looks healthy but anemic', category: 'general', present: true, weight: 3 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 48. Natrum sulph
  {
    id: 48, name: 'Nat-s: голова + сырость', expected: 'nat-s',
    symptoms: [
      { rubric: 'head injury concussion headache chronic', category: 'particular', present: true, weight: 3 },
      { rubric: 'worse damp wet weather', category: 'general', present: true, weight: 3 },
      { rubric: 'worse morning', category: 'general', present: true, weight: 1 },
      { rubric: 'discharge yellow green', category: 'particular', present: true, weight: 2 },
      { rubric: 'left side', category: 'general', present: true, weight: 1 },
      { rubric: 'suicidal thoughts', category: 'mental', present: true, weight: 2 },
      { rubric: 'asthma damp weather', category: 'particular', present: true, weight: 2 },
      { rubric: 'diarrhea morning', category: 'particular', present: true, weight: 1 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
  // 49. Cina
  {
    id: 49, name: 'Cina: скрипит зубами + черви', expected: 'cina',
    symptoms: [
      { rubric: 'grinding teeth bruxism night', category: 'particular', present: true, weight: 3 },
      { rubric: 'boring picking nose constant', category: 'particular', present: true, weight: 3 },
      { rubric: 'irritable cross touched carried aversion', category: 'mental', present: true, weight: 2 },
      { rubric: 'capricious', category: 'mental', present: true, weight: 1 },
      { rubric: 'hunger canine ravenous', category: 'general', present: true, weight: 2 },
      { rubric: 'worms parasites', category: 'particular', present: true, weight: 3 },
      { rubric: 'pallor around mouth', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [],
    profile: { ...DEFAULT_PROFILE, age: 'child' },
  },
  // 50. Platina
  {
    id: 50, name: 'Plat: высокомерная', expected: 'plat',
    symptoms: [
      { rubric: 'haughty contemptuous arrogant', category: 'mental', present: true, weight: 3 },
      { rubric: 'objects appear small delusion', category: 'mental', present: true, weight: 3 },
      { rubric: 'pain gradually comes goes', category: 'general', present: true, weight: 2 },
      { rubric: 'sexual desire increased', category: 'general', present: true, weight: 2 },
      { rubric: 'numbness tingling', category: 'particular', present: true, weight: 2 },
    ],
    modalities: [], familyHistory: [], profile: DEFAULT_PROFILE,
  },
]

// === Запуск тестов ===
async function main() {
  console.log('Загрузка данных MDRI...')
  const data = loadData()
  console.log(`Загружено: ${data.repertory.length} рубрик, ${Object.keys(data.constellations).length} constellations`)
  console.log(`Word index: ${data.wordIndex.size} слов\n`)

  console.log('=' .repeat(120))
  console.log('ПЕРЕТЕСТ 50 КЕЙСОВ — MDRI Engine (analyzePipeline)')
  console.log('=' .repeat(120))

  // Нормализация имени препарата для сравнения
  const norm = (s: string) => s.toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-')

  let ok = 0, top3 = 0, top5 = 0, top10 = 0
  const misses: { id: number; name: string; expected: string; got: string; top3List: string }[] = []

  for (const c of CASES) {
    const results = analyzePipeline(data, c.symptoms, c.modalities, c.familyHistory, c.profile)

    const top1Remedy = results[0]?.remedy ?? '?'
    const top1Score = results[0]?.totalScore ?? 0
    const isTop1 = norm(top1Remedy) === norm(c.expected)
    const inTop3 = results.slice(0, 3).some(r => norm(r.remedy) === norm(c.expected))
    const inTop5 = results.slice(0, 5).some(r => norm(r.remedy) === norm(c.expected))
    const inTop10 = results.slice(0, 10).some(r => norm(r.remedy) === norm(c.expected))

    if (isTop1) ok++
    if (inTop3) top3++
    if (inTop5) top5++
    if (inTop10) top10++

    const status = isTop1 ? 'OK' : (inTop3 ? 'T3' : (inTop5 ? 'T5' : (inTop10 ? 'T10' : 'XX')))
    const t3str = results.slice(0, 5).map(r => `${norm(r.remedy)}(${r.totalScore})`).join(', ')
    const expMark = isTop1 ? '✓' : `✗ exp:${c.expected}`

    console.log(`  [${status.padEnd(3)}] ${c.name.padEnd(45)} | ${String(top1Score).padStart(3)}% | ${norm(top1Remedy).padEnd(8)} ${expMark} | ${t3str}`)

    if (!isTop1) {
      // Найти позицию expected
      const pos = results.findIndex(r => norm(r.remedy) === norm(c.expected))
      const expScore = pos >= 0 ? results[pos].totalScore : 0
      // Детали: cs и kent для top-1 и expected
      const top1cs = results[0]?.lenses?.find(l => l.name === 'Constellation')?.score ?? 0
      const top1kent = results[0]?.lenses?.find(l => l.name === 'Kent')?.score ?? 0
      const expResult = pos >= 0 ? results[pos] : null
      const expCs = expResult?.lenses?.find(l => l.name === 'Constellation')?.score ?? 0
      const expKent = expResult?.lenses?.find(l => l.name === 'Kent')?.score ?? 0
      const detail = ` | ${norm(top1Remedy)}[k:${top1kent},cs:${top1cs}] vs ${c.expected}[k:${expKent},cs:${expCs}]`
      misses.push({
        id: c.id,
        name: c.name,
        expected: c.expected,
        got: norm(top1Remedy),
        top3List: t3str + (pos >= 0 ? ` | expected@${pos + 1}(${expScore})` : ' | NOT FOUND') + detail,
      })
    }
  }

  console.log('\n' + '=' .repeat(120))
  console.log('ИТОГО:')
  console.log(`  Top-1:  ${ok}/50 (${ok * 2}%)`)
  console.log(`  Top-3:  ${top3}/50 (${top3 * 2}%)`)
  console.log(`  Top-5:  ${top5}/50 (${top5 * 2}%)`)
  console.log(`  Top-10: ${top10}/50 (${top10 * 2}%)`)

  if (misses.length > 0) {
    console.log('\n' + '=' .repeat(120))
    console.log(`ПРОМАХИ (${misses.length}):`)
    for (const m of misses) {
      console.log(`\n  #${m.id} ${m.name}`)
      console.log(`    Expected: ${m.expected} | Got: ${m.got}`)
      console.log(`    Top-5: ${m.top3List}`)
    }
  }
}

main().catch(console.error)
