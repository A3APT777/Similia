// Карта синонимов и быстрый matching для MDRI Engine

export const SYNONYM_MAP: Record<string, string[]> = {
  // MIND
  'grief': ['grief', 'sorrow', 'bereavement', 'loss', 'mourning', 'ailments grief'],
  'grief suppressed': ['grief', 'silent grief', 'suppressed grief', 'unexpressed sorrow'],
  'fear death': ['fear death', 'death fear', 'afraid dying', 'terror death', 'anxiety death'],
  'fear dark': ['fear dark', 'darkness fear', 'night fear', 'afraid dark'],
  'fear thunderstorm': ['fear thunderstorm', 'thunder fear', 'storm fear', 'lightning', 'fear storm'],
  'fear snakes': ['fear snakes', 'snake fear', 'serpent fear', 'reptile fear'],
  'fear heights': ['fear heights', 'vertigo heights', 'acrophobia', 'bridges fear'],
  'fear alone': ['fear alone', 'fear solitude', 'company desire'],
  'fear crowds': ['fear crowds', 'agoraphobia', 'public places fear'],
  'fear disease': ['fear disease', 'hypochondria', 'health anxiety', 'cancer fear'],
  'anxiety': ['anxiety', 'anxious', 'worry', 'apprehension', 'nervousness'],
  'anxiety anticipation': ['anticipation', 'stage fright', 'examination fear', 'before events'],
  'restlessness': ['restlessness', 'restless', 'cannot keep still', 'tossing turning', 'fidgety'],
  'irritability': ['irritability', 'irritable', 'angry easily', 'impatient', 'cross', 'peevish'],
  'anger suppressed': ['anger suppressed', 'indignation', 'humiliation', 'silent anger'],
  'consolation agg': ['consolation agg', 'consolation worse', 'sympathy agg', 'aversion consolation', 'consolation aversion', 'aversion to consolation'],
  'consolation amel': ['consolation amel', 'consolation better', 'sympathy desire'],
  'weeping easily': ['weeping easily', 'crying easily', 'lachrymose', 'tearful'],
  'weeping alone': ['weeping alone', 'crying alone', 'tears solitude'],
  'sighing': ['sighing', 'sigh', 'deep breath involuntary'],
  'mood alternating': ['mood alternating', 'changeable mood', 'laughing crying', 'mood swing', 'emotional'],
  'mood changeable': ['mood changeable', 'emotional', 'mood swing', 'changeable moods'],
  'indifference family': ['indifference family', 'apathy loved ones', 'aversion family', 'emotional flatness'],
  'contempt self': ['contempt self', 'worthlessness', 'self depreciation', 'low self esteem'],
  'suicidal': ['suicidal', 'suicide', 'death wish', 'life weary'],
  'jealousy': ['jealousy', 'jealous', 'suspicion', 'suspicious', 'envy'],
  'loquacity': ['loquacity', 'talkative', 'talks too much', 'verbose', 'garrulous'],
  'concentration difficult': ['concentration', 'focus difficult', 'attention deficit', 'absent minded'],
  'memory weakness': ['memory weakness', 'forgetful', 'amnesia', 'memory poor'],
  'hurry': ['hurry', 'hurried', 'impatient', 'hasty', 'rushed'],
  'fastidious': ['fastidious', 'orderly', 'neat', 'perfectionist', 'tidy'],
  'sympathetic': ['sympathetic', 'compassionate', 'empathetic', 'feeling others', 'affectionate', 'sociable affectionate', 'loving', 'warm hearted'],
  'desire company': ['desire company', 'sociable', 'extrovert', 'wants people around'],
  'aversion company': ['aversion company', 'wants alone', 'solitude desire', 'misanthropy'],
  'insomnia': ['insomnia', 'sleeplessness', 'cannot sleep', 'wakefulness'],
  // GENERALITIES
  'sudden onset': ['sudden onset', 'acute sudden', 'abrupt beginning', 'violent onset', 'sudden complaints'],
  'cold wind': ['cold wind', 'cold dry wind', 'exposure wind', 'draft cold', 'wind after'],
  'motion amel': ['motion amel', 'exercise better', 'walking better', 'dancing amel', 'movement better'],
  'motion agg': ['motion agg', 'movement worse', 'exertion worse', 'walking worse'],
  'rest agg': ['rest agg', 'rest worse', 'sitting still worse', 'lying still worse'],
  'heat agg': ['heat agg', 'warm worse', 'summer worse', 'hot weather worse'],
  'cold agg': ['cold agg', 'cold worse', 'winter worse', 'chilly'],
  'cold amel': ['cold amel', 'cold better', 'cold applications amel', 'ice amel'],
  'heat amel': ['heat amel', 'warm better', 'warmth amel', 'hot applications better'],
  'sun agg': ['sun agg', 'sun worse', 'sunshine worse', 'solar heat'],
  'night agg': ['night agg', 'night worse', 'nocturnal agg', 'midnight worse'],
  'morning agg': ['morning agg', 'morning worse', 'waking worse', 'forenoon'],
  'evening agg': ['evening agg', 'evening worse', 'twilight worse', 'dusk'],
  'sea amel': ['sea amel', 'ocean better', 'seaside better', 'seashore amel', 'sea bathing'],
  'washing agg': ['washing agg', 'water worse', 'bathing worse', 'wet worse skin'],
  'perspiration agg': ['perspiration agg', 'sweat worse', 'sweating agg', 'profuse sweat'],
  'touch agg': ['touch agg', 'touch worse', 'sensitive touch', 'cannot bear touch'],
  'pressure amel': ['pressure amel', 'pressure better', 'hard pressure amel', 'lying painful side'],
  'damp agg': ['damp agg', 'wet weather worse', 'humidity worse', 'rain worse'],
  'alternating sides': ['alternating sides', 'sides alternating', 'wandering side to side'],
  'right sided': ['right sided', 'right side', 'complaints right'],
  'left sided': ['left sided', 'left side', 'complaints left'],
  'emaciation': ['emaciation', 'thin despite eating', 'weight loss', 'marasmus', 'wasting', 'loss of weight'],
  'change of place': ['change place', 'relocation', 'moving house', 'travel ailments'],
  // FOOD/THIRST
  'salt desire': ['salt desire', 'desire salt', 'craving salt', 'salty food desire', 'desire salty', 'thirst salt', 'salt for'],
  'desire sweets': ['desire sweets', 'sweet craving', 'sugar desire', 'sweet things'],
  'sour desire': ['sour desire', 'vinegar desire', 'acid desire', 'pickles desire'],
  'eggs desire': ['eggs desire', 'desire eggs', 'craving eggs'],
  'thirst cold water': ['thirst cold', 'desire cold water', 'cold drinks desire', 'ice water'],
  'thirstless': ['thirstless', 'no thirst', 'thirst absent', 'drinks little'],
  'thirst large': ['thirst large', 'thirst great', 'drinks much', 'large quantities'],
  'thirst small sips': ['thirst small sips', 'sips frequently', 'little and often'],
  'fat food agg': ['fat food agg', 'rich food worse', 'greasy food worse'],
  'coffee agg': ['coffee agg', 'coffee worse', 'caffeine sensitive'],
  'milk agg': ['milk agg', 'milk intolerance', 'dairy worse'],
  // SLEEP
  'sleep abdomen': ['sleep abdomen', 'sleeping stomach', 'position abdomen', 'prone sleep'],
  'sleep curled': ['sleep curled', 'fetal position', 'curled up sleep', 'knees drawn up'],
  'sleep agg': ['sleep agg', 'worse after sleep', 'waking worse', 'sleep into agg'],
  // SKIN
  'eczema': ['eczema', 'dermatitis', 'atopic', 'eruption dry', 'skin inflammation'],
  'itching': ['itching', 'pruritus', 'itch', 'scratching'],
  'cracks': ['cracks', 'fissures', 'cracked skin', 'chapped'],
  'warts': ['warts', 'condylomata', 'verruca', 'papilloma'],
  // THROAT
  'lump throat': ['lump throat', 'globus', 'ball throat', 'sensation lump'],
  'throat pain': ['throat pain', 'sore throat', 'pharyngitis', 'tonsillitis'],
  'constriction throat': ['constriction throat', 'closing throat', 'tight throat'],
  // HEAD
  'headache': ['headache', 'head pain', 'cephalalgia', 'migraine'],
  'headache sun': ['headache sun', 'head pain sun', 'solar headache'],
  'headache nail': ['headache nail', 'nail sensation', 'as if nail driven', 'plug head'],
  'headache throbbing': ['headache throbbing', 'pulsating head', 'hammering head'],
  'vertigo': ['vertigo', 'dizziness', 'dizzy', 'giddiness'],
  // RESPIRATORY
  'cough': ['cough', 'tussis', 'coughing'],
  'cough dry': ['cough dry', 'dry cough', 'unproductive cough'],
  'cough barking': ['cough barking', 'croup', 'croupy cough', 'seal bark'],
  'epistaxis': ['epistaxis', 'nosebleed', 'bleeding nose', 'hemorrhage nose'],
  // STOMACH
  'nausea': ['nausea', 'nauseous', 'queasy', 'sick stomach'],
  'nausea travel': ['nausea travel', 'motion sickness', 'car sick', 'sea sick'],
  'vomiting': ['vomiting', 'emesis', 'throwing up'],
  'bloating': ['bloating', 'distension', 'fullness abdomen', 'flatulence'],
  'constipation': ['constipation', 'constipated', 'hard stool', 'no urge'],
  'constipation ineffectual': ['constipation ineffectual', 'ineffectual urging', 'straining stool'],
  'diarrhea': ['diarrhea', 'loose stool', 'watery stool', 'purging'],
  // FEMALE
  'prolapsus': ['prolapsus', 'bearing down', 'dragging sensation', 'uterus falling'],
  'menses painful': ['menses painful', 'dysmenorrhea', 'period pain', 'menstrual cramps'],
  'leucorrhea': ['leucorrhea', 'vaginal discharge', 'whites'],
  // MUSCULOSKELETAL
  'stiffness': ['stiffness', 'stiff', 'rigid', 'tight muscles'],
  'cramps': ['cramps', 'cramping', 'spasm', 'colic'],
  'weakness': ['weakness', 'debility', 'fatigue', 'exhaustion', 'prostration'],
  'weakness emptiness': ['weakness emptiness', 'hollow feeling', 'empty sensation', 'sinking'],
  'exhaustion nursing': ['exhaustion nursing', 'loss sleep', 'night watching', 'caretaker fatigue'],
  // MODALITIES
  'eating amel': ['eating amel', 'eating better', 'food amel', 'better after eating'],
  'eating agg': ['eating agg', 'eating worse', 'after food worse'],
  'open air amel': ['open air amel', 'fresh air better', 'outdoors better'],
  'open air agg': ['open air agg', 'cold air worse', 'outdoors worse'],
  'lying agg': ['lying agg', 'lying worse', 'bed worse', 'recumbent worse'],
  'lying amel': ['lying amel', 'lying better', 'rest in bed better'],
  'ascending agg': ['ascending agg', 'climbing worse', 'stairs worse', 'going up worse'],
  // OTHER
  'chloasma': ['chloasma', 'yellow spots face', 'discoloration yellow', 'liver spots', 'melasma'],
  'chilly': ['chilly', 'cold patient', 'lack vital heat', 'freezing'],
  'hot patient': ['hot patient', 'warm blooded', 'heat intolerant', 'throws covers'],
  'bruised': ['bruised', 'sore feeling', 'beaten feeling', 'trauma'],
  'glands enlarged': ['glands enlarged', 'lymph nodes swollen', 'adenopathy', 'glands hard'],
  'suppuration': ['suppuration', 'abscess', 'pus', 'festering'],
  'ambitious': ['ambitious', 'competitive', 'workaholic', 'driven'],
  'dryness': ['dryness', 'dry', 'dried out', 'parched'],
}

// Предрасчитанный индекс: слово → set ключей синонимов
export const SYNONYM_WORD_INDEX: Map<string, Set<string>> = new Map()

for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
  const allWords = new Set<string>()
  for (const w of key.split(' ')) allWords.add(w)
  for (const s of syns) {
    for (const w of s.split(' ')) allWords.add(w)
  }
  for (const w of allWords) {
    if (w.length > 2) {
      if (!SYNONYM_WORD_INDEX.has(w)) {
        SYNONYM_WORD_INDEX.set(w, new Set())
      }
      SYNONYM_WORD_INDEX.get(w)!.add(key)
    }
  }
}

/** Проверка stem-совпадения: общий префикс >=5 символов */
function stemEq(a: string, b: string): boolean {
  if (a === b) return true
  const minLen = Math.min(a.length, b.length)
  if (minLen < 5) return false
  let cp = 0
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) cp++
    else break
  }
  if (cp < 5) return false
  // Защита от антонимов: "thirst"/"thirstless", "pain"/"painless"
  // Если одно слово заканчивается на "less" а другое нет — это антоним
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.endsWith('less') && !shorter.endsWith('less')) return false
  if (longer.endsWith('ness') && !shorter.endsWith('ness') && longer.length - shorter.length > 3) return false
  return true
}

/**
 * Семантический matching между рубрикой пациента и целевой рубрикой.
 *
 * Принципы:
 * 1. Phrase-level: совпадение по фразам/биграмам, не по одиночным словам
 * 2. Одно общее слово ("cold", "fear", "agg") ≠ match
 * 3. Synonym matching только через ПОЛНЫЙ ключ (фразу), не через отдельные слова
 * 4. Контекст: "cold sweat" ≠ "chilly", "fear dark" ≠ "fear death"
 */
export function symMatch(patientRubric: string, target: string): boolean {
  const p = patientRubric.toLowerCase()
  const t = target.toLowerCase()

  // 1. Точное вхождение (phrase-level)
  if (p.includes(t) || t.includes(p)) return true

  const pWords = p.split(' ').filter(w => w.length > 2)
  const tWords = t.split(' ').filter(w => w.length > 2)
  if (tWords.length === 0 || pWords.length === 0) return false

  // 2. Слово-в-слово matching с порогом зависящим от длины target
  //    1 слово → нужно точное совпадение (порог 100%)
  //    2 слова → нужно 2/2 (100%) — "fear death" не матчится на "fear dark"
  //    3+ слов → нужно >=2 И >=60%
  let exactWordMatches = 0
  for (const tw of tWords) {
    // Точное совпадение слова (не substring! "head" ≠ "headache")
    if (pWords.includes(tw)) {
      exactWordMatches++
      continue
    }
    // Stem-level: общий префикс >=5 символов
    // "violent" ~ "violence" (prefix "violen" = 6), "suppress" ~ "suppressed" (8)
    for (const pw of pWords) {
      if (stemEq(pw, tw)) { exactWordMatches++; break }
    }
  }

  // Стоп-слова которые не считаются самостоятельным match
  const stopWords = new Set(['agg', 'amel', 'worse', 'better', 'from', 'with', 'after', 'before', 'during', 'like'])

  if (tWords.length === 1) {
    // 1 слово: нужно точное совпадение
    if (exactWordMatches >= 1) return true
  } else if (tWords.length === 2) {
    // 2 слова: нужно >=1 СПЕЦИФИЧНОЕ (>=5 chars) совпадение
    // "dullness drowsiness" → "drowsiness" (10 chars) match = OK
    // "fear death" → "fear" (4 chars) = не специфичное → нужно 2/2
    // "fear alone" → "alone" (5 chars) match = OK
    // "head sweating" → "head" (4 chars) = не специфичное → через synonyms
    if (exactWordMatches >= 2) return true
    if (exactWordMatches >= 1) {
      // Проверяем: совпавшее слово достаточно специфичное (>=5 символов)?
      const matchedSpecific = tWords.some(tw => {
        if (tw.length < 5) return false // Короткие слова ("fear", "cold", "heat") не специфичны
        return pWords.includes(tw) || pWords.some(pw => stemEq(pw, tw))
      })
      if (matchedSpecific) return true
    }
  } else {
    // 3+ слов: >=2 совпадения И >=50% слов
    if (exactWordMatches >= 2 && exactWordMatches / tWords.length >= 0.5) return true
  }

  // 3. Synonym matching: через ПОЛНЫЙ КЛЮЧ SYNONYM_MAP, а не через индекс слов
  //    Ищем synonym key который:
  //    - содержится в patient rubric (все слова ключа есть в patient)
  //    - И содержится в target (все слова ключа есть в target)
  //    ИЛИ:
  //    - patient содержит synonym key
  //    - target содержит одно из значений (synonym expansions) этого ключа
  // 3. Synonym matching через предрасчитанный индекс SYNONYM_WORD_INDEX
  // Но только через ПОЛНЫЙ ключ (все слова ключа должны быть в patient/target)
  // и ключ должен содержать >=1 специфичное слово (>=5 chars)
  //
  // Оптимизация: используем SYNONYM_WORD_INDEX чтобы найти candidate keys
  // через слова из patient, а не итерировать весь SYNONYM_MAP
  const candidateKeys = new Set<string>()
  for (const pw of pWords) {
    if (pw.length < 5) continue // Только специфичные слова
    const keys = SYNONYM_WORD_INDEX.get(pw)
    if (keys) for (const k of keys) candidateKeys.add(k)
  }

  for (const key of candidateKeys) {
    const keyWords = key.split(' ').filter(w => w.length > 2)
    if (keyWords.length === 0) continue
    if (!keyWords.some(kw => kw.length >= 5)) continue

    // Patient содержит ВСЕ слова ключа?
    const patientHasKey = keyWords.every(kw =>
      pWords.some(pw => pw === kw || stemEq(pw, kw))
    )
    if (!patientHasKey) continue

    // Target содержит ВСЕ слова ключа?
    if (keyWords.every(kw => tWords.some(tw => tw === kw || stemEq(tw, kw)))) return true

    // Target содержит synonym-фразу?
    const synonyms = SYNONYM_MAP[key]
    if (!synonyms) continue
    for (const syn of synonyms) {
      const synWords = syn.split(' ').filter(w => w.length > 2)
      if (synWords.length === 0 || !synWords.some(sw => sw.length >= 5)) continue
      if (synWords.every(sw => tWords.some(tw => tw === sw || stemEq(tw, sw)))) return true
    }
  }

  // 4. Обратный: candidate keys через target слова
  const candidateKeysT = new Set<string>()
  for (const tw of tWords) {
    if (tw.length < 5) continue
    const keys = SYNONYM_WORD_INDEX.get(tw)
    if (keys) for (const k of keys) candidateKeysT.add(k)
  }

  for (const key of candidateKeysT) {
    const keyWords = key.split(' ').filter(w => w.length > 2)
    if (keyWords.length === 0 || !keyWords.some(kw => kw.length >= 5)) continue

    if (!keyWords.every(kw => tWords.some(tw => tw === kw || stemEq(tw, kw)))) continue

    const synonyms = SYNONYM_MAP[key]
    if (!synonyms) continue
    for (const syn of synonyms) {
      const synWords = syn.split(' ').filter(w => w.length > 2)
      if (synWords.length === 0 || !synWords.some(sw => sw.length >= 5)) continue
      if (synWords.every(sw => pWords.some(pw => pw === sw || stemEq(pw, sw)))) return true
    }
  }

  return false
}
