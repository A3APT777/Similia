import { config } from 'dotenv'
config({ path: '.env.local' })
import { analyzePipeline as analyzeRaw } from '../src/lib/mdri/engine'
import { analyzeWithIdf } from '../src/lib/mdri/product-layer'
import { loadMDRIData } from '../src/lib/mdri/data-loader'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

const CASES = [
  { id: 19, expected: 'arg-n', text: 'mind anxiety;mind fear heights;generalities desire sweets;generalities warm aggravates;rectum diarrhea;stomach distension' },
  { id: 4, expected: 'phos', text: 'mind fear dark;mind fear thunderstorm;mind fear alone;mind sympathetic;stomach thirst large quantities cold;generalities hemorrhage;extremities burning between scapulae' },
  { id: 18, expected: 'kali-c', text: 'sleep waking 2-4am;mind anxiety;generalities pain stitching;eye edema lids upper;generalities chilly;generalities weakness;respiration asthma night' },
]

async function main() {
  const data = await loadMDRIData()
  for (const c of CASES) {
    const symptoms = c.text.split(';').map(r => ({
      rubric: r.trim(), category: 'general' as const, present: true, weight: 2 as const
    }))
    const raw = analyzeRaw(data as any, symptoms, [], [], DEFAULT_PROFILE)
    const idf = analyzeWithIdf(data as any, symptoms, [], [], DEFAULT_PROFILE)
    console.log(`\n#${c.id} expected=${c.expected}`)
    console.log(`RAW: ${raw.slice(0,5).map(r => `${r.remedy}(${r.totalScore})`).join(' > ')}`)
    console.log(`IDF: ${idf.slice(0,5).map(r => `${r.remedy}(${r.totalScore})`).join(' > ')}`)
    // Show if any reranking happened
    if (raw[0]?.remedy !== idf[0]?.remedy) {
      console.log(`  → TOP-1 CHANGED: ${raw[0]?.remedy} → ${idf[0]?.remedy}`)
    }
  }
}
main().catch(console.error)
