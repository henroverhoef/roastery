import type { Bean, Roast, Tasting, Unit } from './types'
import type { SourceId } from '../knowledge/sources'
import { computeMetrics, dropForDtr, stallBeforeFc, type Metrics } from './metrics'
import { daysBetween, fmtDelta, fmtDuration, fmtPct, fmtTemp, fmtTime } from './format'
import { findFlavour, meanPos } from '../knowledge/flavours'
import { findOrigin, isAmericas, americasNotes, type Origin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { matchVarieties } from '../knowledge/varieties'
import { DTR_HIGH, DTR_LOW, DTR_MID, findLevel, lossBandFor, restGuide } from '../knowledge/roasting'

export type Tone = 'change' | 'keep' | 'info' | 'warn'

export interface AdviceItem {
  id: string
  tone: Tone
  title: string
  body: string
  sources: SourceId[]
}

export interface Advice {
  headline: string
  direction: -1 | 0 | 1 // -1 = less development / lighter, +1 = more development / darker
  reasons: string[]
  items: AdviceItem[]
}

export interface HistoryEntry {
  roast: Roast
  tastings: Tasting[]
}

export interface AdviceContext {
  roast: Roast
  bean?: Bean | null
  tasting: Tasting
  history: HistoryEntry[] // other roasts of the same bean
  unit: Unit
}

const round5 = (s: number) => Math.round(s / 5) * 5
const names = (ids: string[]) => ids.map((id) => findFlavour(id)?.name.toLowerCase() ?? id).join(', ')

export function targetFlavours(bean: Bean | null | undefined, origin: Origin | undefined): { ids: string[]; from: 'bean' | 'origin' | null } {
  if (bean?.target_flavours?.length) return { ids: bean.target_flavours, from: 'bean' }
  if (origin?.best.length) return { ids: origin.best, from: 'origin' }
  return { ids: [], from: null }
}

export function targetLevelId(roast: Roast, origin: Origin | undefined): string | null {
  if (roast.target_level) return roast.target_level
  if (origin?.levels.length) return origin.levels[Math.floor((origin.levels.length - 1) / 2)]
  return null
}

function bestOf(history: HistoryEntry[], minRating: number): { entry: HistoryEntry; rating: number; m: Metrics } | null {
  let best: { entry: HistoryEntry; rating: number; m: Metrics } | null = null
  for (const entry of history) {
    const ratings = entry.tastings.map((t) => t.rating).filter((r): r is number => r != null)
    if (!ratings.length) continue
    const rating = Math.max(...ratings)
    if (rating < minRating) continue
    const m = computeMetrics(entry.roast)
    if (!best || rating > best.rating || (rating === best.rating && entry.roast.roasted_at > best.entry.roast.roasted_at)) {
      best = { entry, rating, m }
    }
  }
  return best
}

export function adviseTasting(ctx: AdviceContext): Advice {
  const { roast, bean, tasting, history, unit } = ctx
  const m = computeMetrics(roast)
  const origin = findOrigin(bean?.country)
  const process = findProcess(bean?.process)
  const vars = matchVarieties(bean?.variety, bean?.grade)
  const items: AdviceItem[] = []
  const reasons: string[] = []
  const tags = tasting.tags ?? []
  const level = findLevel(roast.level)
  const lightRoast = level ? level.rank <= 2 : m.scS == null

  const under = tags.filter((id) => findFlavour(id)?.group === 'under')
  const over = tags.filter((id) => findFlavour(id)?.group === 'over' && id !== 'rubbery')
  const flat = tags.filter((id) => ['flat', 'papery', 'woody'].includes(id))
  const bready = tags.includes('bready')
  const scorchLook = roast.appearance.some((a) => a === 'tipped' || a === 'scorched')
  const harsh = tags.filter((id) => ['smoky', 'ashy', 'burnt'].includes(id))
  // Smoky/ashy in a light roast (or burnt tips on the beans) points at too much heat early on,
  // not at a roast that went too far.
  const scorch = scorchLook || (harsh.length > 0 && lightRoast && m.dtr != null && m.dtr <= DTR_HIGH)

  // ——— which way? ———
  let score = 0
  if (under.length) {
    score += 2 * under.length
    reasons.push(`underdeveloped notes (${names(under)})`)
  }
  if (over.length && !scorch) {
    score -= 2 * over.length
    reasons.push(`roasty/over-roasted notes (${names(over)})`)
  }
  if (bready && m.dtr != null && m.dtr < DTR_LOW) {
    score += 1
    reasons.push('bready notes with a short development')
  }
  const acidity = tasting.acidity ?? 0
  if (acidity >= 1) {
    score += acidity
    reasons.push('acidity too sharp')
  } else if (acidity <= -1) {
    score += acidity
    reasons.push('acidity too flat')
  }
  const bitterness = tasting.bitterness ?? 0
  if (bitterness >= 1) {
    score -= bitterness
    reasons.push('too bitter')
  }
  const body = tasting.body ?? 0
  if (body <= -1) {
    score += 0.5 * -body
    reasons.push('body too thin')
  } else if (body >= 1) {
    score -= 0.5 * body
    reasons.push('body too heavy')
  }

  const target = targetFlavours(bean, origin)
  const targetPos = meanPos(target.ids)
  const positive = tags.filter((id) => !findFlavour(id)?.defect)
  const tastedPos = meanPos(positive)
  if (targetPos != null && tastedPos != null && Math.abs(targetPos - tastedPos) >= 0.5) {
    const diff = Math.max(-2, Math.min(2, targetPos - tastedPos))
    score += diff
    reasons.push(
      diff > 0
        ? `tasted ${names(positive)}, lighter than the ${names(target.ids)} you’re aiming for`
        : `tasted ${names(positive)}, darker than the ${names(target.ids)} you’re aiming for`,
    )
  }

  const want = new Set(tasting.wants ?? [])
  if (want.has('less_sour')) score += 1
  if (want.has('less_bitter')) score -= 1
  if (want.has('more_body')) score += 0.5
  if (want.has('more_fruit')) score -= 1
  if (want.has('more_choc')) {
    if (tastedPos == null || tastedPos < 4) score += 1
    else if (tastedPos > 4.5) score -= 1
  }
  if (want.size && !want.has('same')) {
    const w = [...want].filter((x) => x !== 'same' && x !== 'sweeter')
    if (w.length) reasons.push(`you want ${w.map((x) => x.replace(/_/g, ' ').replace('choc', 'chocolate')).join(', ')}`)
  }

  const direction: -1 | 0 | 1 = score >= 1 ? 1 : score <= -1 ? -1 : 0
  const tLevel = targetLevelId(roast, origin)

  // ——— rest first: a too-fresh cup can mislead ———
  if (tasting.tasted_on) {
    const days = daysBetween(roast.roasted_at, tasting.tasted_on)
    const espresso = /espresso/i.test(tasting.brew ?? roast.brew ?? '')
    if (days < 1) {
      items.push({
        id: 'rest-min',
        tone: 'warn',
        title: 'Tasted on roast day',
        body: 'Sweet Maria’s says to rest coffee 24–48 hours before judging the roast level. Treat this tasting as a first impression and taste it again in a few days before changing much.',
        sources: ['smTaste'],
      })
    } else if (lightRoast && days < (espresso ? restGuide.lightEspressoDays[0] : restGuide.lightFilterDays[0]) && (under.length || acidity >= 1)) {
      const [a, b] = espresso ? restGuide.lightEspressoDays : restGuide.lightFilterDays
      items.push({
        id: 'rest-light',
        tone: 'info',
        title: `Only ${days} day${days === 1 ? '' : 's'} of rest`,
        body: `Roasters suggest resting light roasts about ${a}–${b} days for ${espresso ? 'espresso' : 'filter'}. Fresh light roasts can taste sharper and more hollow than they will later, so retaste before you change a lot.`,
        sources: ['restSimonBearns', 'restPartners', 'restMagazine'],
      })
    }
  }

  if (tags.includes('potato')) {
    items.push({
      id: 'potato',
      tone: 'warn',
      title: 'Raw potato is a bean defect, not your roast',
      body: 'The “potato defect” (mostly Rwanda and Burundi) comes from bacteria in some cherries and can’t be seen in green beans. One affected bean can spoil a cup. Don’t change your roast because of it.',
      sources: ['smPotato', 'cafeImportsRwanda'],
    })
  }

  // ——— the main change ———
  if (direction !== 0) {
    items.push(developmentChange(direction, m, tLevel, origin, unit))
  } else if (under.length && over.length) {
    items.push({
      id: 'uneven',
      tone: 'change',
      title: 'Mixed signals: probably an uneven roast',
      body:
        'Tasting both underdeveloped and roasty notes usually means some beans (or the insides of the beans) went less far than others. Check the roast for uneven colour, and break a bean: a pale inside with a darker outside means the heat didn’t get in evenly. On the Gene, try a slightly lower starting set temperature so the inside keeps up, and keep the batch near 250 g (one owner found 200 g roasted less evenly).',
      sources: ['eoDefects', 'hbGeneBatch', 'smGeneTips'],
    })
  } else if ((tasting.rating ?? 0) >= 4 && !tags.some((id) => findFlavour(id)?.defect)) {
    items.push({
      id: 'keep',
      tone: 'keep',
      title: 'Keep this profile',
      body: `This one works. To repeat it: ${repeatRecipe(roast, m, unit)}. If you want to explore, change only one thing next time (e.g. only the drop time) so you can tell what it did.`,
      sources: ['roestOneVariable'],
    })
  } else if ((tasting.sweetness ?? 0) <= -1) {
    items.push(sweetnessAdvice(m))
  }

  if (direction === 0 && reasons.length === 0 && !items.some((i) => i.tone === 'change' || i.tone === 'keep')) {
    items.push({
      id: 'need-more',
      tone: 'info',
      title: 'Tell the app a bit more',
      body: 'Pick a few flavour tags (especially any off-notes like grassy, sour, bitter or ashy) and move the sliders. The advice works from those.',
      sources: [],
    })
  }

  if (scorch) {
    items.push({
      id: 'scorch',
      tone: 'change',
      title: 'Too much heat early on',
      body: `${scorchLook ? 'Dark tips or flat dark spots on the beans' : `${capitalise(names(harsh))} notes in a light roast`} usually mean the outside got too hot too early for this coffee’s density and moisture. On the Gene: start with a lower set temperature or a lower preheat${process?.id === 'natural' ? ', and for naturals try 200 g (they carry more chaff and their sugars scorch easily)' : ''}. One Gene owner found 250 °C (482 °F) scorches beans and runs about 242–244 °C instead.`,
      sources: ['eoDefects', 'giesenDefects', 'hbGeneBatch2', ...(process?.id === 'natural' ? (['pdgNaturalHoney', 'smGeneTips'] as SourceId[]) : [])],
    })
  }

  if (flat.length || (bready && !(m.dtr != null && m.dtr < DTR_LOW))) {
    items.push(flatAdvice(roast, m, flat, unit))
  }

  // ——— origin, process and variety specifics ———
  if (origin) {
    if (direction > 0 && origin.tooLight) items.push({ id: 'origin-light', tone: 'info', title: `${origin.name}: what lies further on`, body: origin.tooLight, sources: origin.sources })
    if (direction < 0 && origin.tooDark) items.push({ id: 'origin-dark', tone: 'info', title: `${origin.name}: don’t push it`, body: origin.tooDark, sources: origin.sources })
    if (isAmericas(origin) && direction !== 0 && process?.id !== 'natural') {
      const note = direction > 0 && acidity >= 1 ? americasNotes[1] : americasNotes[0]
      items.push({ id: 'americas', tone: 'info', title: 'Washed Central & South American coffees', body: note.text, sources: note.sources })
    }
  }
  if (process?.id === 'decaf') {
    items.push({ id: 'decaf', tone: 'info', title: 'Decaf: go by time, not colour', body: 'Decaf darkens early and its first crack is soft, so judge it by the time after first crack and the weight loss rather than the colour.', sources: ['smDecaf', 'swissWaterRoast'] })
  }
  if (process?.id === 'wet_hulled' && (under.length || tags.includes('astringent'))) {
    items.push({ id: 'wethulled', tone: 'info', title: 'Wet-hulled beans need more heat early', body: 'These beans start wetter. If the drying phase falls short they taste astringent and sour, so keep the set temperature high in the first minutes.', sources: ['pdgWetHulled', 'mtpakSumatra'] })
  }
  for (const v of vars) {
    if (v.id === 'pacamara' && direction < 0) items.push({ id: 'pacamara', tone: 'info', title: 'Pacamara runs ahead', body: v.notes[0], sources: v.sources })
    if (v.id === 'sl28' && direction < 0) items.push({ id: 'sl28', tone: 'info', title: 'SL28 / SL34', body: v.notes[1], sources: v.sources })
    if (v.id === 'gesha' && direction < 0) items.push({ id: 'gesha', tone: 'info', title: 'Gesha', body: v.notes[1], sources: v.sources })
  }

  // ——— your own history ———
  const best = bestOf(history, Math.max(4, (tasting.rating ?? 0) + 1))
  if (best) {
    const b = best.m
    const parts: string[] = []
    if (b.fcS != null) parts.push(`first crack ${fmtTime(b.fcS)}`)
    if (b.dropS != null) parts.push(`drop ${fmtTime(b.dropS)}`)
    if (b.devS != null) parts.push(`${fmtDuration(b.devS)} development`)
    if (b.dtr != null) parts.push(`DTR ${fmtPct(b.dtr)}`)
    if (b.weightLossPct != null) parts.push(`${b.weightLossPct.toFixed(1)}% weight loss`)
    let compare = ''
    if (b.devS != null && m.devS != null) {
      const d = round5(b.devS - m.devS)
      if (Math.abs(d) >= 5) compare = ` That’s ${fmtDuration(Math.abs(d))} ${d > 0 ? 'more' : 'less'} development than this roast.`
    }
    items.push({
      id: 'history',
      tone: 'info',
      title: `Your best roast of this bean so far (${'★'.repeat(best.rating)})`,
      body: `${shortDate(best.entry.roast.roasted_at)}: ${parts.join(', ') || 'no times logged'}.${compare}${direction !== 0 ? ' Moving towards that roast is the safest next step.' : ''}`,
      sources: [],
    })
  }

  // ——— weight loss ———
  const band = lossBandFor(tLevel)
  if (m.weightLossPct != null && band) {
    const wl = m.weightLossPct
    if ((direction > 0 && wl < band.min) || (direction < 0 && wl > band.max)) {
      items.push({
        id: 'loss',
        tone: 'info',
        title: `Weight loss ${wl.toFixed(1)}%`,
        body: `Published ranges put ${band.label.toLowerCase()} at roughly ${band.min}–${band.max}%, so the scale agrees: this went ${direction > 0 ? 'less' : 'further'} than a ${findLevel(tLevel)?.name ?? band.label} roast usually does. Ranges vary with the bean’s moisture, so your own history matters more.`,
        sources: ['royalYield', 'ctcWeightLoss'],
      })
    }
  }

  const order: Record<Tone, number> = { change: 0, keep: 0, warn: 1, info: 2 }
  const sorted = items.map((item, i) => ({ item, i })).sort((a, b) => order[a.item.tone] - order[b.item.tone] || a.i - b.i).map((x) => x.item)
  const headline = makeHeadline(direction, sorted, reasons)
  return { headline, direction, reasons, items: sorted }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function repeatRecipe(roast: Roast, m: Metrics, unit: Unit): string {
  const parts: string[] = []
  if (roast.batch_g) parts.push(`${roast.batch_g} g`)
  if (roast.preheat_c) parts.push(`preheat ${fmtTemp(roast.preheat_c, unit)}`)
  const sets = [...roast.setpoints].sort((a, b) => a.t - b.t)
  if (sets.length) parts.push(sets.map((s) => `${fmtTemp(s.c, unit)} at ${fmtTime(s.t)}`).join(', then '))
  if (m.fcS != null) parts.push(`first crack ${fmtTime(m.fcS)}`)
  if (m.dropS != null) parts.push(`cool at ${fmtTime(m.dropS)}`)
  return parts.join(', ') || 'log the same settings'
}

function developmentChange(direction: 1 | -1, m: Metrics, tLevel: string | null, origin: Origin | undefined, unit: Unit): AdviceItem {
  const level = findLevel(tLevel)
  const dark = level ? level.rank >= 4 : false
  const sources: SourceId[] = ['raoDtr', 'smGeneTips']
  const geneHow = (dropAt: number) =>
    ` On the Gene: set the timer longer than ${fmtTime(dropAt)} and press cool yourself at ${fmtTime(dropAt)}. It keeps roasting a little in the cooling cycle, so press slightly early rather than late.`

  if (m.fcS == null || m.totalS == null) {
    return {
      id: 'dev-nofc',
      tone: 'change',
      title: direction > 0 ? 'Develop it longer' : 'Develop it less',
      body: `${direction > 0 ? 'Let it go longer before pressing cool' : 'Press cool sooner'}. First crack wasn’t logged on this roast, so the app can’t size the change. Tap “1st crack” when you hear (or see) it next time, and it’ll tell you the seconds.`,
      sources: ['raoDtr'],
    }
  }

  const fc = m.fcS
  const total = m.totalS
  const dtr = m.dtr ?? 0
  const at = (d: number) => dropForDtr(fc, d)

  if (dark && m.scS != null) {
    const sinceSc = total - m.scS
    return {
      id: 'dev-dark',
      tone: 'change',
      title: direction > 0 ? 'Go a little further into second crack' : 'Finish closer to second crack',
      body:
        direction > 0
          ? `Second crack started at ${fmtTime(m.scS)} and you stopped ${fmtDuration(sinceSc)} later. For a darker cup, keep going a little longer into second crack, in small steps.${geneHow(total)}`
          : `Second crack started at ${fmtTime(m.scS)} and you stopped ${fmtDuration(sinceSc)} into it. Pressing cool nearer the first snaps of second crack (around ${fmtTime(m.scS)}) should take the edge off the roastiness.${geneHow(m.scS)}`,
      sources: ['smGeneTips', 'ozoneLevels'],
    }
  }

  if (direction > 0) {
    if (dtr < DTR_LOW) {
      const drop = at(DTR_LOW)
      const later = round5(drop - total)
      return {
        id: 'dev-more',
        tone: 'change',
        title: `Drop about ${later} s later (at ${fmtTime(drop)})`,
        body: `First crack was at ${fmtTime(fc)} and you pressed cool at ${fmtTime(total)}: ${fmtDuration(m.devS ?? 0)} of development, DTR ${fmtPct(dtr)}. That’s below the 20–25% Scott Rao prefers. Cooling at ${fmtTime(drop)} gives 20%; ${fmtTime(at(DTR_MID))} gives 22.5%.${geneHow(drop)}`,
        sources,
      }
    }
    if (dtr < DTR_HIGH) {
      const drop = at(DTR_MID) > total + 5 ? at(DTR_MID) : at(DTR_HIGH)
      const later = round5(drop - total)
      return {
        id: 'dev-more',
        tone: 'change',
        title: `Try ${later} s later (at ${fmtTime(drop)})`,
        body: `Development was ${fmtDuration(m.devS ?? 0)} (DTR ${fmtPct(dtr)}), already inside the 20–25% band, so move towards its upper end: ${fmtTime(at(DTR_MID))} gives 22.5% and ${fmtTime(at(DTR_HIGH))} gives 25%. If it’s still underdeveloped after that, the issue is more likely before first crack (see below).${geneHow(drop)}`,
        sources,
      }
    }
    return {
      id: 'dev-more-pre',
      tone: 'change',
      title: 'Development is already long: look before first crack',
      body: `DTR was ${fmtPct(dtr)}, above the 20–25% band, yet it still tastes underdeveloped. More time after first crack would mostly add roastiness. Instead, give the beans a slightly slower, longer run into first crack (Royal NY: a longer time to first crack and extended development lowers acidity), keep the batch the same, and check the rest time${origin?.id === 'sumatra' || origin?.id === 'sulawesi' ? ', and give wet-hulled beans more heat early' : ''}.`,
      sources: ['raoDtr', 'royalNyCsa'],
    }
  }

  // direction < 0
  if (dtr > DTR_HIGH) {
    const drop = at(DTR_HIGH)
    const earlier = round5(total - drop)
    return {
      id: 'dev-less',
      tone: 'change',
      title: `Drop about ${earlier} s earlier (at ${fmtTime(drop)})`,
      body: `First crack ${fmtTime(fc)}, cool at ${fmtTime(total)}: ${fmtDuration(m.devS ?? 0)} of development, DTR ${fmtPct(dtr)}. That’s above Rao’s 20–25%. Cooling at ${fmtTime(drop)} gives 25%; ${fmtTime(at(DTR_MID))} gives 22.5%.${geneHow(drop)}`,
      sources,
    }
  }
  if (dtr > DTR_LOW) {
    const drop = at(DTR_LOW)
    const earlier = round5(total - drop)
    return {
      id: 'dev-less',
      tone: 'change',
      title: `Try ${earlier} s earlier (at ${fmtTime(drop)})`,
      body: `Development was ${fmtDuration(m.devS ?? 0)} (DTR ${fmtPct(dtr)}), inside the 20–25% band. Move towards its lower end: ${fmtTime(drop)} gives 20%. Light-roast specialists often go below 20% too, which Rao says can still be excellent.${geneHow(drop)}`,
      sources,
    }
  }
  return {
    id: 'dev-less-heat',
    tone: 'change',
    title: 'Less heat at the end rather than less time',
    body: `Development was already short (${fmtDuration(m.devS ?? 0)}, DTR ${fmtPct(dtr)}), so the roastiness probably came from heat, not time. Turn the set temperature down when first crack starts${m.setAtFcC != null ? ` (it was ${fmtTemp(m.setAtFcC, unit)})` : ''}: published Gene profiles drop by roughly 2–20 °C there (Roast Rebels uses 10 °C and 20 °C). Also press cool a little earlier, because the Gene keeps roasting while it cools, and tip the beans into a colander once the cool cycle starts. Don’t cut the heat so hard that the roast stalls, which tastes flat and baked.`,
    sources: ['roastRebels', 'hbGeneBatch2', 'smGeneTips', 'hbGeneCooling', 'royalNyDev'],
  }
}

function sweetnessAdvice(m: Metrics): AdviceItem {
  const where =
    m.dtr == null
      ? 'Log first crack next time so the app can see where in the roast the sweetness went.'
      : m.dtr < DTR_LOW
        ? `With DTR at ${fmtPct(m.dtr)} (below 20%), the likelier fix is a bit more development.`
        : m.dtr > DTR_HIGH
          ? `With DTR at ${fmtPct(m.dtr)} (above 25%), the likelier fix is a bit less development.`
          : `DTR was ${fmtPct(m.dtr)}, inside the 20–25% band, so look at the run into first crack: give it a little more time between yellowing and first crack rather than a big jump in heat.`
  return {
    id: 'sweet',
    tone: 'change',
    title: 'Not sweet enough',
    body: `Sweetness gets lost at both ends: stop too early and it’s sour, go too long and you burn it off. ${where}`,
    sources: ['pdgSweetness', 'raoDtr'],
  }
}

function flatAdvice(roast: Roast, m: Metrics, flat: string[], unit: Unit): AdviceItem {
  const parts: string[] = []
  const sources: SourceId[] = ['eoDefects', 'roestRor']
  if (m.totalS != null && m.totalS > 20 * 60) {
    parts.push(`The roast took ${fmtTime(m.totalS)}, longer than the 15–20 minutes typical for a Gene, so it may have dragged. Keep the set temperature high until first crack, warm the room on cold days, and check the plug isn’t on an extension lead.`)
    sources.push('smGene101', 'smGeneTips')
  }
  const stall = stallBeforeFc(roast.readings, m.fcS)
  if (stall) parts.push(`In the ${fmtDuration(stall.to - stall.from)} before first crack the display rose ${fmtDelta(stall.rise, unit)}. A roast that stalls there tends to taste baked.`)
  if (flat.includes('woody') || flat.includes('papery')) {
    parts.push('Woody and papery notes are also typical of old or badly stored green beans. If the beans are past-crop, test a couple of roast levels in the middle rather than going very dark, which amplifies woodiness.')
    sources.push('hbWoody', 'royalPastCrop')
  }
  return {
    id: 'flat',
    tone: 'change',
    title: 'Flat or papery: the roast may have stalled',
    body: `A flat, bready or papery cup is often a roast that lost momentum before first crack. ${parts.join(' ')}`.trim(),
    sources,
  }
}

function makeHeadline(direction: -1 | 0 | 1, items: AdviceItem[], reasons: string[]): string {
  const change = items.find((i) => i.tone === 'change')
  const why = reasons.length ? ` because of ${reasons.slice(0, 2).join(' and ')}` : ''
  if (direction > 0) return `Develop it further${why}. ${change ? change.title + '.' : ''}`.trim()
  if (direction < 0) return `Pull it back${why}. ${change ? change.title + '.' : ''}`.trim()
  if (items.some((i) => i.id === 'keep')) return 'This roast is a keeper.'
  if (change) return change.title + '.'
  return 'No clear direction yet.'
}

