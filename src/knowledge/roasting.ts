import type { SourceId } from './sources'
import type { Fact } from './gene'

// Roast levels, judged at the end of the roast by sound and sight.
export interface RoastLevel {
  id: string
  name: string
  cue: string
  rank: number // lighter → darker
}

export const roastLevels: RoastLevel[] = [
  { id: 'under', name: 'Before first crack', cue: 'Stopped before first crack. Usually tastes grassy and sour.', rank: 0 },
  { id: 'city', name: 'City', cue: 'Pulled at or just after the last sounds of first crack.', rank: 1 },
  { id: 'city_plus', name: 'City+', cue: 'A little after first crack ends, in the quiet gap before second crack.', rank: 2 },
  { id: 'full_city', name: 'Full City', cue: 'At the verge of second crack, or the very first snaps.', rank: 3 },
  { id: 'full_city_plus', name: 'Full City+', cue: 'Just into second crack.', rank: 4 },
  { id: 'vienna', name: 'Vienna', cue: 'Further into second crack, with some surface oil.', rank: 5 },
  { id: 'french', name: 'French', cue: 'Deep into second crack, dark brown and oily.', rank: 6 },
]

export const levelSources: SourceId[] = ['smCity', 'ozoneLevels']

export function findLevel(id: string | null | undefined): RoastLevel | undefined {
  return roastLevels.find((l) => l.id === id)
}

// Weight loss bands. Sources disagree by a point or two, so these are deliberately broad and
// the app always prefers your own history of the same bean.
export interface LossBand {
  label: string
  levels: string[]
  min: number
  max: number
}

export const weightLossBands: LossBand[] = [
  { label: 'Light (City)', levels: ['city'], min: 11, max: 13 },
  { label: 'Medium (City+ to Full City)', levels: ['city_plus', 'full_city'], min: 14, max: 16 },
  { label: 'Dark (Full City+ and darker)', levels: ['full_city_plus', 'vienna', 'french'], min: 17, max: 20 },
]
export const weightLossSources: SourceId[] = ['royalYield', 'ctcWeightLoss', 'bhYield']

export function lossBandFor(levelId: string | null | undefined): LossBand | undefined {
  return weightLossBands.find((b) => levelId != null && b.levels.includes(levelId))
}

// Colour stages to tap while roasting (what you see through the glass).
export const colourStages = [
  { id: 'green', name: 'Green' },
  { id: 'yellow', name: 'Yellow / straw' },
  { id: 'tan', name: 'Tan / cinnamon' },
  { id: 'light_brown', name: 'Light brown' },
  { id: 'medium_brown', name: 'Medium brown' },
  { id: 'dark_brown', name: 'Dark brown' },
  { id: 'oily', name: 'Very dark, oily' },
] as const

export const smells = [
  { id: 'grassy', name: 'Grassy' },
  { id: 'hay', name: 'Hay / straw' },
  { id: 'bread', name: 'Bread / toast' },
  { id: 'sweet', name: 'Sweet / caramel' },
  { id: 'coffee', name: 'Roasty / coffee' },
  { id: 'smoky', name: 'Smoky' },
] as const

// How the roasted beans look at the end.
export const appearanceTags = [
  { id: 'even', name: 'Even colour' },
  { id: 'uneven', name: 'Uneven colour' },
  { id: 'tipped', name: 'Dark tips / edges' },
  { id: 'scorched', name: 'Dark flat spots' },
  { id: 'oily', name: 'Oily surface' },
  { id: 'wrinkled', name: 'Wrinkled / not smoothed out' },
] as const

// Development time ratio: time after first crack as a share of the whole roast.
export const DTR_LOW = 0.2
export const DTR_HIGH = 0.25
export const DTR_MID = 0.225

export const restGuide = {
  minimumHours: 24, // Sweet Maria's: rest 24–48 h before judging a roast
  lightFilterDays: [5, 12] as const,
  lightEspressoDays: [10, 21] as const,
  sources: ['smTaste', 'restSimonBearns', 'restPartners', 'restMagazine'] as SourceId[],
}

export const roastingFacts: Fact[] = [
  {
    title: 'Three phases',
    body:
      'Drying: from loading the beans until they turn yellow. Maillard (browning): from yellow until first crack. Development: from first crack until you press cool. Moisture actually leaves the beans steadily until just before first crack, and “yellow” is a judgement call, so mark it the same way every time.',
    sources: ['bhPhases'],
  },
  {
    title: 'Development time ratio (DTR)',
    body:
      'DTR is the time from first crack to the end of the roast as a share of the whole roast. Scott Rao prefers 20–25% for most roast levels. He chose that range from cupping more than 20,000 roasts, where 18 of the 20 best fell inside it, and he calls it a correlation rather than a rule. Roasts below 20% can be excellent, and light-roast lovers often go lower. The app uses 20–25% as its default band and then learns from your own best roasts.',
    sources: ['raoDtr'],
  },
  {
    title: 'Rate of rise (RoR)',
    body:
      'RoR is how fast the temperature is climbing, in degrees per minute. Rao’s rule is that it should keep slowing down through the roast. A RoR that stalls tends to taste baked and flat. A RoR that speeds back up near the end (“the flick”) tends to taste roasty or charred. On the Gene the RoR is calculated from the exhaust display, so use it to compare the shape of your own roasts rather than against numbers from bean-probe roasters.',
    sources: ['cropsterFlick', 'roestRor', 'homeroastersBt'],
  },
  {
    title: 'Weight loss tells you how far you went',
    body:
      'Weigh the green beans before and the roasted beans after. Darker roasts lose more weight, mostly water. Published ranges vary: roughly 11–13% for light, 14–16% for medium and 17–20% for dark roasts. Wetter green coffee loses more at the same roast level, so the most useful comparison is with your earlier roasts of the same bean.',
    sources: ['royalYield', 'ctcWeightLoss', 'bhYield'],
  },
  {
    title: 'What roast degree does to the cup',
    body:
      'In a controlled SCA study (roast time held constant), the lightest roast scored highest for acidity and fruit and lowest for bitterness. Going darker added bitter and roasted notes and reduced acidity and fruit. Body rose as the roast developed, then seemed to ease off again at the darkest end. The study found no significant difference in sweetness, although many roasters describe medium roasts as sweetest.',
    sources: ['scaRoastDegree', 'equatorLevels'],
  },
  {
    title: 'Rest before you judge',
    body:
      'Sweet Maria’s says to rest coffee 24–48 hours before judging the roast level. Light roasts generally need longer: roasters suggest about 5–12 days for filter and 10–21 days for espresso, because espresso traps the CO₂ that the fresh beans give off. If a fresh roast tastes sharp or hollow, taste it again after a few more days before changing your roast.',
    sources: ['smTaste', 'restSimonBearns', 'restPartners', 'restMagazine'],
  },
  {
    title: 'Change one thing at a time',
    body:
      'Roast the same coffee with one variable changed each time (for example only the drop time), then taste them side by side. Otherwise you can’t tell which change did what.',
    sources: ['roestOneVariable'],
  },
]

export const defectFacts: Fact[] = [
  {
    title: 'Underdeveloped',
    body:
      'Grassy, hay-like, green, peanut, sharply sour or astringent. Not enough effective heat and time after the browning started. A light colour alone doesn’t prove it, because a well-roasted light coffee can be sweet. Sourness is the most common complaint from new roasters, and the most common reason is underdevelopment.',
    sources: ['eoDefects', 'smSour', 'smTaste'],
  },
  {
    title: 'Baked',
    body:
      'Flat, bready, papery, lacking sweetness. The roast lost momentum and stalled before or around first crack. You can’t see baking on the bean. A flat cup can also come from old green coffee, stale roasted coffee, water or brewing.',
    sources: ['eoDefects', 'roestRor', 'defectStudy'],
  },
  {
    title: 'Scorched / tipped',
    body:
      'Dark flat spots on the bean faces, or burnt tips and edges, with an ashy or smoky taste even in a light roast. Too much heat applied too early for the coffee’s density and moisture.',
    sources: ['eoDefects', 'giesenDefects'],
  },
  {
    title: 'Over-roasted or flicked',
    body:
      'Ashy, smoky, burnt, harsh bitterness, acidity gone. Either too dark, or the temperature sped up again late in the roast. The usual fix is to end the roast sooner, not just to cut heat, because cutting heat too hard can stall the roast and make it taste baked.',
    sources: ['royalNyDev', 'cropsterFlick', 'equatorLevels'],
  },
  {
    title: 'Old green coffee',
    body:
      'Woody, papery or stale notes usually come from old or badly stored green beans (trans-2-nonenal). Very dark roasting tends to amplify woodiness, and very light roasting can taste grassy, so test a couple of levels in between.',
    sources: ['hbWoody', 'royalPastCrop'],
  },
]
