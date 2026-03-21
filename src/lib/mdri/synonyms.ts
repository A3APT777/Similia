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

/**
 * Быстрый семантический matching между рубрикой пациента и целевой рубрикой
 */
export function symMatch(patientRubric: string, target: string): boolean {
  const p = patientRubric.toLowerCase()
  const t = target.toLowerCase()

  // Точное вхождение
  if (p.includes(t) || t.includes(p)) return true

  // Совпадение по словам (>50%)
  const pWords = new Set(p.split(' ').filter(w => w.length > 2))
  const tWords = t.split(' ').filter(w => w.length > 2)
  if (tWords.length > 0) {
    let matchCount = 0
    for (const tw of tWords) {
      for (const pw of pWords) {
        if (pw.includes(tw) || tw.includes(pw)) {
          matchCount++
          break
        }
      }
    }
    if (matchCount / tWords.length >= 0.5) return true
  }

  // Быстрые синонимы через индекс
  const pSynonymKeys = new Set<string>()
  for (const pw of pWords) {
    const keys = SYNONYM_WORD_INDEX.get(pw)
    if (keys) {
      for (const k of keys) pSynonymKeys.add(k)
    }
  }

  if (pSynonymKeys.size > 0) {
    const tWordsSet = new Set(tWords)
    for (const tw of tWordsSet) {
      const tKeys = SYNONYM_WORD_INDEX.get(tw)
      if (tKeys) {
        for (const tk of tKeys) {
          if (pSynonymKeys.has(tk)) return true
        }
      }
    }
  }

  return false
}
