import type { SourceId } from './sources'

export interface Process {
  id: string
  name: string
  summary: string
  roasting: string[]
  sources: SourceId[]
}

export const processes: Process[] = [
  {
    id: 'washed',
    name: 'Washed',
    summary: 'The fruit is removed before drying. Usually the cleanest and brightest cups, with the most predictable roasting.',
    roasting: [
      'Clean, dense, lower-moisture beans take heat steadily and tend to reach first crack on schedule.',
      'Some roasters run washed coffees a little faster to protect their acidity.',
    ],
    sources: ['scIdProcess', 'pdgNaturalHoney'],
  },
  {
    id: 'natural',
    name: 'Natural (dry process)',
    summary: 'Dried inside the whole cherry. More fruit, more body, sometimes winey, and lots of chaff.',
    roasting: [
      'The fruit sugars scorch easily, so roasters go gentler early on. One roaster charges a natural Brazil about 30% cooler than a high-grown washed coffee. On the Gene that means a lower preheat or a slightly lower starting set temperature.',
      'Roasters slow the approach to first crack and stretch it a little to build sweetness and body.',
      'Lots of chaff: Sweet Maria’s suggests 200 g batches of naturals in the Gene, and the manual says not to fill above the line.',
    ],
    sources: ['pdgNaturalHoney', 'scIdProcess', 'smGeneTips', 'burmanGene'],
  },
  {
    id: 'honey',
    name: 'Honey / pulped natural',
    summary: 'Skin removed, some of the sticky mucilage left on while drying (white → yellow → red → black honey = more and more mucilage).',
    roasting: [
      'Behaves between washed and natural, and varies with how much mucilage was left on.',
      'One guide suggests a medium roast and close attention around first crack to protect the brown-sugar sweetness.',
    ],
    sources: ['ictProcessing', 'scIdProcess', 'pdgNaturalHoney'],
  },
  {
    id: 'wet_hulled',
    name: 'Wet-hulled (giling basah)',
    summary: 'The Indonesian method: hulled while still wet. Heavy body, earthy and herbal, low acidity, often a blue-green bean.',
    roasting: [
      'Beans start wetter, so give a little more heat towards the start. If the drying phase falls short, the cup can taste astringent, sour and unbalanced.',
      'Expect some uneven colour in the roast from the rough processing.',
      'Medium to medium-dark is the usual sweet spot. Light roasts can taste underdeveloped and roughly earthy.',
    ],
    sources: ['mtpakSumatra', 'pdgWetHulled', 'scofiWetHulled'],
  },
  {
    id: 'anaerobic',
    name: 'Anaerobic / experimental fermentation',
    summary: 'Fermented in sealed tanks (sometimes with yeasts or added fruit). Intense, boozy, winey fruit, and divisive cups.',
    roasting: [
      'Usually roasted light to show off the fermentation fruit. Research on fermented coffees found light roasts kept the most distinct aromatics.',
      'Rest them: one roaster recommends drinking theirs 2–4 weeks after roasting. A glossary suggests brewing slightly hotter.',
    ],
    sources: ['anaerobicGlossary', 'hbAnaerobic'],
  },
  {
    id: 'decaf',
    name: 'Decaf',
    summary: 'Caffeine removed (Swiss Water, CO₂, sugarcane/EA, …). The green beans are already darker than normal.',
    roasting: [
      'Don’t trust colour: decaf goes brown very quickly, well before first crack. Judge by time after first crack instead.',
      'First crack is softer and easy to miss, so listen closely.',
      'Water-process decafs can stay matte even when well developed, and surface oil on roasted decaf is normal.',
      'Sweet Maria’s pulls heat earlier than for regular coffee (on their drum roaster about 10–20 degrees before first crack). Start from your normal profile and adjust.',
    ],
    sources: ['smDecaf', 'swissWaterRoast'],
  },
  {
    id: 'monsooned',
    name: 'Monsooned',
    summary: 'Exposed to monsoon winds for weeks (India). The beans swell, acidity mostly disappears, and the cup turns earthy, woody and spicy with heavy body.',
    roasting: [
      'Often roasted dark. At Full City+ to French, Sweet Maria’s describes bitter cocoa, spice and smoke, and says it can be more bitter than sweet on its own.',
      'Lighter roasts can show more sweetness.',
    ],
    sources: ['smMonsoon', 'burmanMonsoon'],
  },
  {
    id: 'other',
    name: 'Other / not sure',
    summary: 'Not one of the common methods, or the seller doesn’t say.',
    roasting: [],
    sources: [],
  },
]

export function findProcess(id: string | null | undefined): Process | undefined {
  return processes.find((p) => p.id === id)
}
