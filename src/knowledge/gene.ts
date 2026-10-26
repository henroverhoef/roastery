import type { SourceId } from './sources'

// What is known about the Gene Café CBR-101, and published starting profiles for it.
// Temperatures are °C (the °F figures in the sources are converted and rounded).

export interface Fact {
  title: string
  body: string
  sources: SourceId[]
}

export const geneFacts: Fact[] = [
  {
    title: 'The display shows exhaust air, not the beans',
    body:
      'The number on the Gene is the temperature of the hot air leaving the drum, measured at the exhaust. It is not the bean temperature, so it won’t match published “first crack at 196 °C” style numbers from probe-equipped roasters. Owners describe the beans lagging behind the display, and one owner estimated the display reads roughly 15–20 °C above the coffee itself. Readings also differ between machines (one owner saw about 10 degrees between two units at the same setting). That is why this app compares you with your own earlier roasts rather than with other roasters.',
    sources: ['koffietent', 'coffeesnobsGene', 'hbGeneProfiles', 'cfGeneSlow'],
  },
  {
    title: 'The trend of the display is still useful',
    body:
      'One owner who fitted a bean probe found the exhaust reading followed the bean temperature’s rate of change well, even though the absolute numbers differ. So the shape of your curve, and the rate of rise (RoR) the app calculates from it, are worth comparing between your own roasts.',
    sources: ['homeroastersBt'],
  },
  {
    title: 'Two controls: set temperature and timer',
    body:
      'The CBR-101 lets you change the set temperature (up to 250 °C / 482 °F) and the timer (up to 30 minutes) during the roast. There’s no fan or drum-speed control. When the timer runs out, or you press cool, the heater stops and the cooling cycle starts.',
    sources: ['geneManual', 'smGene101'],
  },
  {
    title: 'It keeps roasting while it cools',
    body:
      'The beans stay in the hot drum during the cooling cycle, so they darken a bit more after you press cool. Sweet Maria’s advises stopping a little before the roast degree you want. The machine cools until about 60 °C (140 °F) before the drum stops. Some owners find the built-in cooling slow and dump the beans into a colander with a fan instead.',
    sources: ['smGeneTips', 'hbGeneOpinions', 'hbGeneCooling'],
  },
  {
    title: 'Batch size: about 250 g, less for naturals',
    body:
      'Sweet Maria’s tip sheet recommends 250 g (2½ of the supplied scoops), and 200 g for dry-processed (natural) coffees because they shed more chaff. Smaller batches roast faster than bigger ones, so once you find a size you like, keep it the same. The manufacturer also warns not to fill natural coffees above the line. One owner found 200 g roasted less evenly than a bit more, because the extra mass tumbles better.',
    sources: ['smGeneTips', 'burmanGene', 'hbGeneBatch'],
  },
  {
    title: 'Voltage and room temperature change everything',
    body:
      'Line voltage, extension cords and power strips change how much heat the Gene makes, and a cold room slows it down. Owners measure their mains voltage and warm the room on cold days. Sweet Maria’s suggests starting with a long timer and stopping manually until you know how your machine behaves on your supply. Starting again before the roaster has cooled down also makes the next roast faster.',
    sources: ['smGeneTips', 'hbGeneOpinions', 'cfGeneSlow'],
  },
  {
    title: 'Cracks can be hard to hear',
    body:
      'The chaff collector and fan muffle the cracks. Owners rely on watching the beans, and some listen at the exhaust (one uses a stethoscope on the exhaust pipe). Smell is less reliable because the exhaust passes over old oils on the chaff screen. Older, drier beans tend to have a quieter first crack.',
    sources: ['hbGeneHearing', 'hbGeneBatch'],
  },
  {
    title: 'Preheating: owners disagree',
    body:
      'Some owners preheat (for example to 175–180 °C) and report shorter roasts; others say there’s no benefit and it stresses the element. If you preheat, do it the same way every time so roasts stay comparable. The app records your preheat temperature.',
    sources: ['roastRebels', 'hbGeneBatch2', 'hbGeneOpinions'],
  },
  {
    title: 'Typical timings',
    body:
      'The manual’s chart spans 12–23 minutes at 230–250 °C depending on roast level. Sweet Maria’s describes typical Gene roasts as 15–20 minutes. Burman’s guidance for a 15-minute roast at about 232 °C (450 °F) says yellowing at roughly 4–6 minutes and first crack commonly at about 9–12 minutes. Your own timings will vary with voltage, batch and beans.',
    sources: ['geneGuide', 'smGene101', 'burmanGene301'],
  },
  {
    title: 'Roasting at altitude',
    body:
      'If you roast high up (for example on the Highveld), the air is thinner. Cropster’s sample-roaster tests found the roaster had to apply more heat to get the same exhaust curve at altitude, and roasters at high elevation report first crack coming sooner. The app lets you note your roasting altitude, but this mostly matters when comparing with profiles from people at sea level.',
    sources: ['cropsterAltitude', 'baristaMagAltitude'],
  },
]

// The manual's roasting chart: one fixed temperature and a timer per roast level.
export const manualChart = [
  { level: 'Light', minutes: 12, c: 230 },
  { level: 'Cinnamon', minutes: 13, c: 235 },
  { level: 'Medium', minutes: 14, c: 240 },
  { level: 'High', minutes: 15, c: 245 },
  { level: 'City', minutes: 17, c: 250 },
  { level: 'Full City', minutes: 19, c: 250 },
  { level: 'French', minutes: 21, c: 250 },
  { level: 'Italian', minutes: 23, c: 250 },
] as const

export interface PlanStep {
  when: 'start' | 'fc' // at the start, or at first crack (+ offset_s)
  offset_s?: number
  c: number
}

export interface Plan {
  id: string
  name: string
  forWhat: string
  batch_g?: number
  preheat_c?: number
  timer_min?: number
  steps: PlanStep[]
  note: string
  sources: SourceId[]
}

export const plans: Plan[] = [
  {
    id: 'rr-santos',
    name: 'Roast Rebels: Brazil/Santos',
    forWhat: 'Brazilian Santos-type beans (softer, lower-density coffees)',
    batch_g: 230,
    preheat_c: 175,
    steps: [
      { when: 'start', c: 243 },
      { when: 'fc', c: 233 },
    ],
    note: 'Preheat to 175 °C, load 230 g, hold 243 °C until first crack, then 233 °C to the end. They aim for about 20% development.',
    sources: ['roastRebels'],
  },
  {
    id: 'rr-shb',
    name: 'Roast Rebels: high-grown Central & South America',
    forWhat: 'Strictly hard bean (SHB) coffees from Central and South America',
    batch_g: 250,
    preheat_c: 180,
    steps: [
      { when: 'start', c: 245 },
      { when: 'fc', offset_s: 45, c: 225 },
    ],
    note: 'Preheat to 180 °C, load 250 g, hold 245 °C until 45 s after first crack, then 225 °C to the end. They aim for about 19% development.',
    sources: ['roastRebels'],
  },
  {
    id: 'sm-max',
    name: 'Sweet Maria’s: max until first crack',
    forWhat: 'A general starting point',
    batch_g: 250,
    steps: [{ when: 'start', c: 250 }],
    note: 'Start at the highest setting (250 °C / 482 °F) until first crack begins, then turn the temperature down towards the end. Sweet Maria’s doesn’t give a number; published Gene profiles turn down by roughly 2–20 °C. Stop a little early, because it coasts while cooling.',
    sources: ['smGeneTips', 'roastRebels', 'hbGeneBatch2'],
  },
  {
    id: 'hb-245',
    name: 'Forum: 245 °C to first crack, no preheat',
    forWhat: 'One owner’s simple profile',
    steps: [{ when: 'start', c: 245 }],
    note: 'One Home-Barista owner sets 245 °C with no preheat until first crack, which usually came at 6–7 minutes for them. Another owner at 230 °C with no preheat got first crack at about 12:20. Use it as a rough reference only.',
    sources: ['hbGeneFirstRoast'],
  },
  {
    id: 'hb-gentle',
    name: 'Forum: gentler 242 °C, small turn-down',
    forWhat: 'If 250 °C scorches your beans',
    batch_g: 227,
    steps: [
      { when: 'start', c: 243 },
      { when: 'fc', offset_s: 45, c: 241 },
    ],
    note: 'One owner roasting 227 g uses 468–472 °F (about 242–244 °C) depending on the bean’s growing altitude, and turns down 4 °F (about 2 °C) 45 s after first crack. In the same thread another says 482 °F (250 °C) is too hot and scorches beans.',
    sources: ['hbGeneBatch2'],
  },
  ...manualChart.map((m) => ({
    id: `manual-${m.level.toLowerCase().replace(/\s+/g, '-')}`,
    name: `Manual chart: ${m.level}`,
    forWhat: `The manual’s fixed setting for a ${m.level.toLowerCase()} roast`,
    timer_min: m.minutes,
    steps: [{ when: 'start' as const, c: m.c }],
    note: `Set ${m.c} °C and the timer to ${m.minutes} minutes (the manual’s chart). The manual notes ambient temperature, humidity and the bean change results, so watch the beans rather than trusting the timer.`,
    sources: ['geneGuide', 'geneManual'] as SourceId[],
  })),
]

export function findPlan(id: string | null | undefined): Plan | undefined {
  return plans.find((p) => p.id === id)
}

/** The set temperature a plan asks for at time t (needs first crack to apply 'fc' steps). */
export function planSetpointAt(plan: Plan, t: number, fcS: number | null): number | null {
  let current: number | null = null
  for (const step of plan.steps) {
    const at = step.when === 'start' ? 0 : fcS == null ? null : fcS + (step.offset_s ?? 0)
    if (at != null && t >= at) current = step.c
  }
  return current
}

/** The next plan step that hasn't happened yet, for the live prompt. */
export function nextPlanStep(plan: Plan, t: number, fcS: number | null): { step: PlanStep; at: number | null } | null {
  for (const step of plan.steps) {
    if (step.when === 'start') continue
    const at = fcS == null ? null : fcS + (step.offset_s ?? 0)
    if (at == null || t < at) return { step, at }
  }
  return null
}
