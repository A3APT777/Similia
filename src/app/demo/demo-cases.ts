// Предрасчитанные результаты для демо (без API-вызовов)
export const DEMO_RESULTS = {
  grief: {
    name: { ru: 'Горе, подавленные эмоции', en: 'Grief, suppressed emotions' },
    results: [
      { remedy: 'nat-m', remedyName: 'Natrum muriaticum', totalScore: 82, confidence: 'high' },
      { remedy: 'ign', remedyName: 'Ignatia amara', totalScore: 68, confidence: 'medium' },
      { remedy: 'ph-ac', remedyName: 'Phosphoricum acidum', totalScore: 54, confidence: 'medium' },
    ],
  },
  anxiety: {
    name: { ru: 'Тревога, ночное беспокойство', en: 'Anxiety, restlessness at night' },
    results: [
      { remedy: 'ars', remedyName: 'Arsenicum album', totalScore: 79, confidence: 'high' },
      { remedy: 'acon', remedyName: 'Aconitum napellus', totalScore: 63, confidence: 'medium' },
      { remedy: 'kali-c', remedyName: 'Kali carbonicum', totalScore: 51, confidence: 'medium' },
    ],
  },
  irritability: {
    name: { ru: 'Раздражительность, пищеварение', en: 'Irritability, digestion' },
    results: [
      { remedy: 'nux-v', remedyName: 'Nux vomica', totalScore: 85, confidence: 'high' },
      { remedy: 'bry', remedyName: 'Bryonia alba', totalScore: 58, confidence: 'medium' },
      { remedy: 'lyc', remedyName: 'Lycopodium', totalScore: 52, confidence: 'medium' },
    ],
  },
}

// Маппинг индекса пресета на ключ
export const PRESET_KEYS: Array<keyof typeof DEMO_RESULTS> = ['grief', 'anxiety', 'irritability']
