import type { Bean } from '../lib/types'
import { altitudeNote, americasNotes, findOrigin, findRegion, isAmericas } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { matchVarieties } from '../knowledge/varieties'
import { findFlavour } from '../knowledge/flavours'
import { findLevel } from '../knowledge/roasting'
import { SourceLinks } from './ui'

/** Everything the knowledge base knows that applies to this bean. */
export default function OriginGuide({ bean }: { bean: Bean }) {
  const origin = findOrigin(bean.country)
  const region = findRegion(origin, bean.region)
  const process = findProcess(bean.process)
  const vars = matchVarieties(bean.variety, bean.grade)
  const alt = altitudeNote(bean.altitude_min, bean.altitude_max)

  if (!origin && !process && !vars.length && !alt) {
    return <p className="muted">Pick an origin and process for this bean to see roasting notes for it.</p>
  }

  return (
    <div className="space-y-4">
      {origin && (
        <section>
          <h3 className="font-semibold">{origin.name}</h3>
          <p className="mt-1 text-sm">{origin.typical}</p>
          {origin.altitude && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Typical altitude: {origin.altitude[0]}–{origin.altitude[1]} m{origin.altitudeNote ? ` (${origin.altitudeNote})` : ''}
            </p>
          )}
          {origin.levels.length > 0 && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Tends to shine at: {origin.levels.map((l) => findLevel(l)?.name).join(', ')}</p>
          )}
          {origin.best.length > 0 && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              The app’s default target for it: {origin.best.map((f) => findFlavour(f)?.name).join(', ')}
              {bean.target_flavours.length ? ' (you’ve set your own target, which wins)' : ''}
            </p>
          )}
          {region && (
            <p className="mt-2 rounded-lg bg-stone-100 p-2 text-sm dark:bg-stone-800">
              <b>{region.name}:</b> {region.note}
              {region.altitude ? ` (${region.altitude[0]}–${region.altitude[1]} m)` : ''}
            </p>
          )}
          {origin.roasting.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {origin.roasting.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {origin.watch?.map((w) => (
            <p key={w} className="mt-2 rounded-lg border-l-4 border-red-600 bg-red-50 p-2 text-sm dark:bg-red-950/40">{w}</p>
          ))}
          <SourceLinks ids={origin.sources} className="mt-2" />
          {isAmericas(origin) && bean.process !== 'natural' && (
            <div className="mt-2 space-y-1 text-sm">
              {americasNotes.map((n) => (
                <div key={n.text}>
                  <p>{n.text}</p>
                  <SourceLinks ids={n.sources} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {alt && (
        <section>
          <h3 className="font-semibold">
            Altitude: {[bean.altitude_min, bean.altitude_max].filter(Boolean).join('–')} m
          </h3>
          <p className="mt-1 text-sm">{alt.text}</p>
          <SourceLinks ids={alt.sources} className="mt-1" />
        </section>
      )}

      {process && process.roasting.length > 0 && (
        <section>
          <h3 className="font-semibold">{process.name}</h3>
          <p className="mt-1 text-sm">{process.summary}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {process.roasting.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <SourceLinks ids={process.sources} className="mt-1" />
        </section>
      )}

      {vars.map((v) => (
        <section key={v.id}>
          <h3 className="font-semibold">{v.name}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {v.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <SourceLinks ids={v.sources} className="mt-1" />
        </section>
      ))}
    </div>
  )
}
