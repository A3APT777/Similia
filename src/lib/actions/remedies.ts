'use server'

import { prisma } from '@/lib/prisma'
import { searchQuerySchema } from '@/lib/shared/validation'

export type RemedyResult = {
  abbrev: string
  name_latin: string
  name_ru: string | null
}

// Транслитерация кириллицы → несколько латинских вариантов для поиска
const TRANSLIT: Record<string, string[]> = {
  а:['a'],б:['b'],в:['v','w'],г:['g'],д:['d'],е:['e'],ё:['e'],ж:['zh','j'],
  з:['z'],и:['i','y'],й:['y','i'],к:['k','c'],л:['l'],м:['m'],н:['n'],
  о:['o'],п:['p'],р:['r'],с:['s','c'],т:['t','th'],у:['u'],ф:['f','ph'],
  х:['h','ch'],ц:['c','ts'],ч:['ch'],ш:['sh'],щ:['sch'],ъ:[''],ы:['y','i'],
  ь:['','i'],э:['e'],ю:['u','yu'],я:['ya','ia'],
}

// Генерирует основной вариант транслитерации
function transliterate(text: string): string {
  return text.toLowerCase().split('').map(c => TRANSLIT[c]?.[0] || c).join('')
}

// Генерирует несколько вариантов транслитерации для нечёткого поиска
function transliterateVariants(text: string): string[] {
  const base = transliterate(text)
  const variants = new Set<string>([base])

  // Добавляем варианты с альтернативными заменами
  const chars = text.toLowerCase().split('')
  for (let i = 0; i < chars.length; i++) {
    const alts = TRANSLIT[chars[i]]
    if (alts && alts.length > 1) {
      for (let a = 1; a < alts.length; a++) {
        const variant = chars.map((c, j) => j === i ? alts[a] : (TRANSLIT[c]?.[0] || c)).join('')
        variants.add(variant)
      }
    }
  }

  // Специальные замены: кс→x, нукс→nux
  if (base.includes('ks')) variants.add(base.replace(/ks/g, 'x'))

  return Array.from(variants).slice(0, 5) // максимум 5 вариантов
}

// Русские названия основных средств для поиска
const REMEDY_NAME_RU: Record<string, string> = {
  'acon.': 'Аконит', 'apis': 'Апис', 'arg-n.': 'Аргентум нитрикум', 'arn.': 'Арника',
  'ars.': 'Арсеникум альбум', 'aur.': 'Аурум', 'bar-c.': 'Барита карбоника',
  'bell.': 'Белладонна', 'bry.': 'Бриония', 'calc.': 'Калькарея карбоника',
  'calc-p.': 'Калькарея фосфорика', 'carb-v.': 'Карбо вегетабилис',
  'caust.': 'Каустикум', 'cham.': 'Хамомилла', 'chin.': 'Хина',
  'cina': 'Цина', 'cocc.': 'Коккулюс', 'coloc.': 'Колоцинт',
  'con.': 'Кониум', 'cupr.': 'Купрум', 'dros.': 'Дрозера',
  'dulc.': 'Дулькамара', 'ferr.': 'Феррум', 'gels.': 'Гельземиум',
  'graph.': 'Графитес', 'hep.': 'Гепар сульфур', 'hyos.': 'Гиосциамус',
  'ign.': 'Игнация', 'iod.': 'Йодум', 'ip.': 'Ипекакуана',
  'kali-bi.': 'Кали бихромикум', 'kali-c.': 'Кали карбоникум',
  'lach.': 'Лахезис', 'lyc.': 'Ликоподиум', 'mag-p.': 'Магнезия фосфорика',
  'merc.': 'Меркуриус', 'nat-m.': 'Натриум муриатикум', 'nat-s.': 'Натриум сульфурикум',
  'nit-ac.': 'Нитрикум ацидум', 'nux-v.': 'Нукс вомика',
  'op.': 'Опиум', 'petr.': 'Петролеум', 'ph-ac.': 'Фосфорикум ацидум',
  'phos.': 'Фосфорус', 'plat.': 'Платина', 'plb.': 'Плюмбум',
  'psor.': 'Псоринум', 'puls.': 'Пульсатилла', 'rhus-t.': 'Рус токсикодендрон',
  'sep.': 'Сепия', 'sil.': 'Силицея', 'spong.': 'Спонгия',
  'staph.': 'Стафизагрия', 'stram.': 'Страмониум', 'sulph.': 'Сульфур',
  'thuj.': 'Туя', 'tub.': 'Туберкулинум', 'verat.': 'Вератрум',
  'carc.': 'Карцинозин', 'med.': 'Медорринум',
  'lac-c.': 'Лак канинум', 'lil-t.': 'Лилиум тигринум',
  'all-c.': 'Аллиум цепа', 'ant-c.': 'Антимониум крудум', 'ant-t.': 'Антимониум тартарикум',
}

export async function searchRemediesDB(query: string): Promise<RemedyResult[]> {
  searchQuerySchema.parse(query)
  if (!query.trim()) return []
  const q = query.trim().replace(/[%_.*,()]/g, '')
  if (!q) return []

  const hasRussian = /[а-яё]/i.test(q)
  const variants = hasRussian ? transliterateVariants(q) : [q]

  // Короткий запрос (1-2 символа) → поиск по началу, длинный → содержит
  const isShort = q.length <= 2
  const likePrefix = isShort ? '' : '%'

  try {
    // Параметризованный поиск
    const conditions = variants
      .map((_, i) => `name_latin ILIKE $${i + 1} OR abbrev ILIKE $${i + 1}`)
      .join(' OR ')

    const params = variants.map(v => likePrefix + v + '%')
    // Добавляем русский поиск
    const ruParam = '%' + q + '%'
    params.push(ruParam)
    const ruIdx = params.length

    const results = await prisma.$queryRawUnsafe<RemedyResult[]>(
      `SELECT DISTINCT abbrev, name_latin, name_ru FROM homeo_remedies WHERE ${conditions} OR name_ru ILIKE $${ruIdx} ORDER BY
        CASE WHEN abbrev ILIKE $${ruIdx - variants.length} THEN 0
             WHEN name_latin ILIKE $${ruIdx - variants.length} THEN 1
             ELSE 2 END,
        name_latin
      LIMIT 15`,
      ...params
    )

    // Добавляем русские названия из маппинга если нет в БД
    const enriched = results.map(r => ({
      ...r,
      name_ru: r.name_ru || REMEDY_NAME_RU[r.abbrev.toLowerCase()] || null,
    }))

    if (enriched.length > 0) return enriched
  } catch {
    // noop
  }

  // Fallback: поиск по русским названиям из маппинга
  if (hasRussian) {
    const qLower = q.toLowerCase()
    const matches = Object.entries(REMEDY_NAME_RU)
      .filter(([, name]) => name.toLowerCase().includes(qLower))
      .slice(0, 12)
      .map(([abbrev, name]) => ({ abbrev: abbrev.charAt(0).toUpperCase() + abbrev.slice(1), name_latin: abbrev, name_ru: name }))
    if (matches.length > 0) return matches
  }

  return []
}
