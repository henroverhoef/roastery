import type { SourceId } from './sources'
import type { EndMethod } from '../lib/types'

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
    title: 'Ending the roast: drop the beans, or use the cooling cycle',
    body:
      'In the Gene’s cooling cycle the beans stay in the hot drum, so they darken a bit more after you press cool. Sweet Maria’s advises stopping a little before the roast degree you want, and the machine cools until about 60 °C (140 °F) before the drum stops. Many owners find that slow and hard to predict, so they stop the roast, take the chamber out (it’s very hot: use heat-proof gloves) and tip the beans into a colander or sieve, some with a fan, to stop the roast closer to where they want it. Some then run the cooling cycle with the empty chamber to cool the machine down. Owners report better control this way; nobody has published a side-by-side taste test of the two.',
    sources: ['smGeneTips', 'hbGeneOpinions', 'hbGeneCooling', 'hbGeneExternalCool', 'csGeneCooler'],
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
    title: 'Preheating: how it works, and owners disagree',
    body:
      'Preheating warms the empty machine, not the beans. Owners who do it run the Gene empty until the display reaches the preheat temperature (Roast Rebels uses 175–180 °C; one Home-Barista owner 350–400 °F), then stop it, load the beans and start the roast at the roast setting. The beans never sit at 175 °C. Taking the chamber out and adding cold beans makes the display drop well below the preheat temperature before it climbs again, which is expected. What you gain is a warm drum, heater and air, so drying starts sooner. Other owners say there’s no benefit and it stresses the element. If you preheat, do it the same way and load just as quickly every time, so roasts stay comparable.',
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

/** Shown with any plan that preheats. */
export const preheatHowTo =
  'Preheat = run the empty Gene until the display shows that temperature. Then load the beans quickly (the chamber is hot) and start the roast at the plan’s setting. The display drops when the beans go in and then climbs again; that’s normal.'

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
  when: 'start' | 'fc' | 'time' // at the start, at first crack (+ offset_s), or at a fixed time (at_s)
  offset_s?: number
  at_s?: number
  c: number
}

/** How you end a roast. The app calls the end of the roast "drop" either way. */
export const endMethods: { id: EndMethod; name: string; detail: string }[] = [
  { id: 'dump', name: 'Drop the beans and cool them myself', detail: 'Stop the Gene, take the chamber out and tip the beans into a sieve or colander.' },
  { id: 'gene', name: 'The Gene’s cooling cycle', detail: 'Press cool and let the beans cool in the turning drum.' },
]

/** One sentence on how to end the roast at a given time (shown in the advice). */
export function dropHowTo(method: EndMethod, at: string): string {
  return method === 'gene'
    ? `On the Gene: set the timer longer than ${at} and press cool yourself at ${at}. It keeps roasting a little in the cooling cycle, so press slightly early rather than late.`
    : `On the Gene: set the timer longer than ${at}, stop it yourself at ${at} and get the beans into the sieve. They keep roasting until they’re out of the hot chamber, so do that just as quickly every time.`
}

/** When to drop: at a fixed time, a number of seconds after first crack, or at a DTR. */
export interface PlanDrop {
  mode: 'time' | 'dev' | 'dtr'
  value: number // seconds for time/dev, a fraction (0.2 = 20%) for dtr
}

export interface Plan {
  id: string
  name: string
  forWhat: string
  batch_g?: number | null
  preheat_c?: number | null
  timer_min?: number
  steps: PlanStep[]
  note: string
  sources: SourceId[]
  // Only on plans you design yourself:
  mine?: boolean
  bean_id?: string | null
  target_level?: string | null
  curve?: { t: number; c: number }[] // target display temperatures
  targets?: { yellow_s: number | null; fc_s: number | null }
  drop?: PlanDrop | null
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

export function findPlan(id: string | null | undefined, mine: Plan[] = []): Plan | undefined {
  if (!id) return undefined
  return mine.find((p) => p.id === id) ?? plans.find((p) => p.id === id)
}

/** When a step happens. First-crack steps need first crack (or, for planning, the target). */
export function stepTime(step: PlanStep, fcS: number | null): number | null {
  if (step.when === 'start') return 0
  if (step.when === 'time') return step.at_s ?? 0
  return fcS == null ? null : fcS + (step.offset_s ?? 0)
}

/** The set temperature a plan asks for at time t. */
export function planSetpointAt(plan: Plan, t: number, fcS: number | null): number | null {
  const timed = plan.steps
    .map((step) => ({ step, at: stepTime(step, fcS) }))
    .filter((x): x is { step: PlanStep; at: number } => x.at != null && x.at <= t)
    .sort((a, b) => a.at - b.at)
  return timed.length ? timed[timed.length - 1].step.c : null
}

/** The next step still to come, for the live prompt. A first-crack step without first crack has at = null. */
export function nextPlanStep(plan: Plan, t: number, fcS: number | null): { step: PlanStep; at: number | null } | null {
  const fcGuess = fcS ?? plan.targets?.fc_s ?? null
  const upcoming = plan.steps
    .filter((step) => step.when !== 'start')
    .map((step) => ({ step, at: stepTime(step, fcS), sortAt: stepTime(step, fcGuess) ?? Infinity }))
    .filter((x) => x.at == null || x.at > t)
    .sort((a, b) => a.sortAt - b.sortAt)
  return upcoming.length ? { step: upcoming[0].step, at: upcoming[0].at } : null
}

/** When the plan says to drop, given the actual (or planned) first crack. */
export function planDropAt(plan: Plan, fcS: number | null): number | null {
  const d = plan.drop
  if (!d) return null
  const fc = fcS ?? plan.targets?.fc_s ?? null
  if (d.mode === 'time') return d.value
  if (fc == null) return null
  if (d.mode === 'dev') return fc + d.value
  return d.value > 0 && d.value < 1 ? fc / (1 - d.value) : null
}

/** The plan's target display temperature at time t (between curve points). */
export function planTargetAt(plan: Plan, t: number): number | null {
  const pts = [...(plan.curve ?? [])].sort((a, b) => a.t - b.t)
  if (pts.length < 2 || t < pts[0].t || t > pts[pts.length - 1].t) return null
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].t >= t) {
      const a = pts[i - 1]
      const b = pts[i]
      return b.t === a.t ? b.c : a.c + ((b.c - a.c) * (t - a.t)) / (b.t - a.t)
    }
  }
  return null
}

/** The set-temperature schedule as times, using actual (or planned) first crack. */
export function planSetpoints(plan: Plan, fcS: number | null): { t: number; c: number }[] {
  return plan.steps
    .map((step) => ({ t: stepTime(step, fcS ?? plan.targets?.fc_s ?? null), c: step.c }))
    .filter((x): x is { t: number; c: number } => x.t != null)
    .sort((a, b) => a.t - b.t)
}
