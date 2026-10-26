import type { ReactNode } from 'react'
import { useStore } from '../data/store'
import { Header, SourceLinks } from '../components/ui'
import OriginGuide from '../components/OriginGuide'
import { geneFacts, manualChart, plans, type Fact } from '../knowledge/gene'
import { defectFacts, levelSources, roastingFacts, roastLevels, weightLossBands, weightLossSources } from '../knowledge/roasting'
import { flavours, flavourSources } from '../knowledge/flavours'
import { origins } from '../knowledge/origins'
import { processes } from '../knowledge/processes'
import { varieties } from '../knowledge/varieties'
import { sources, type SourceId } from '../knowledge/sources'
import { fmtTemp } from '../lib/format'
import type { Bean } from '../lib/types'

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <div className="space-y-3">
      {facts.map((f) => (
        <div key={f.title}>
          <h3 className="font-semibold">{f.title}</h3>
          <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">{f.body}</p>
          <SourceLinks ids={f.sources} className="mt-1" />
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, children, open = false }: { id: string; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details id={id} className="card group" open={open}>
      <summary className="h2 cursor-pointer list-none">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span> {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

const ladder = [0, 1, 2, 3, 4, 5, 6].map((p) => ({
  p,
  name: ['Too light', 'Bright', 'Fruity', 'Sweet & nutty', 'Chocolate', 'Bittersweet', 'Too dark'][p],
  tags: flavours.filter((f) => f.pos != null && Math.round(f.pos) === p).map((f) => f.name),
}))

const blankBean = (country: string): Bean => ({
  id: country, name: '', country, region: null, town: null, producer: null, altitude_min: null, altitude_max: null, variety: null, process: null,
  grade: null, harvest: null, supplier: null, price_per_kg: null, seller_notes: null, target_flavours: [], notes: null, archived: false, created_at: '', updated_at: '',
})

export default function Guide() {
  const { settings } = useStore()
  const unit = settings.unit
  const kinds: { kind: string; label: string }[] = [
    { kind: 'manufacturer', label: 'Manufacturer' },
    { kind: 'study', label: 'Studies' },
    { kind: 'reference', label: 'Reference & education' },
    { kind: 'roaster', label: 'Roasters' },
    { kind: 'retailer', label: 'Green coffee retailers' },
    { kind: 'forum', label: 'Forums (one person’s experience)' },
  ]
  return (
    <div className="page space-y-3">
      <Header title="Roasting guide" />
      <p className="muted -mt-2">
        What the app knows and where it comes from. Where there was no reliable number, it says so instead of guessing. Forum posts are labelled as such.
      </p>

      <Section id="gene" title="Your Gene Café CBR-101" open>
        <Facts facts={geneFacts} />
        <h3 className="mt-4 font-semibold">The manual’s roasting chart</h3>
        <table className="mt-1 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-stone-500"><th className="py-1">Level</th><th>Set temp</th><th>Timer</th></tr>
          </thead>
          <tbody>
            {manualChart.map((r) => (
              <tr key={r.level} className="border-t border-stone-100 dark:border-stone-800"><td className="py-1">{r.level}</td><td>{fmtTemp(r.c, unit)}</td><td>{r.minutes} min</td></tr>
            ))}
          </tbody>
        </table>
        <SourceLinks ids={['geneGuide', 'geneManual']} className="mt-1" />
        <h3 className="mt-4 font-semibold">Published starting profiles</h3>
        <div className="mt-1 space-y-2">
          {plans.filter((p) => !p.id.startsWith('manual-')).map((p) => (
            <div key={p.id} className="rounded-xl bg-stone-100 p-3 text-sm dark:bg-stone-800">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-stone-500">For: {p.forWhat}</p>
              <p className="mt-1">{p.note}</p>
              <SourceLinks ids={p.sources} className="mt-1" />
            </div>
          ))}
        </div>
      </Section>

      <Section id="basics" title="Roasting basics">
        <Facts facts={roastingFacts} />
        <h3 className="mt-4 font-semibold">Roast levels</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {roastLevels.map((l) => <li key={l.id}><b>{l.name}:</b> {l.cue}</li>)}
        </ul>
        <SourceLinks ids={levelSources} className="mt-1" />
        <h3 className="mt-4 font-semibold">Weight loss by roast level</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {weightLossBands.map((b) => <li key={b.label}>{b.label}: about {b.min}–{b.max}%</li>)}
        </ul>
        <SourceLinks ids={weightLossSources} className="mt-1" />
      </Section>

      <Section id="defects" title="What went wrong? (off-flavours)">
        <Facts facts={defectFacts} />
      </Section>

      <Section id="flavours" title="How flavours move as a roast develops">
        <p className="text-sm">
          A general tendency, not a law: every coffee moves along it differently. The advice uses this to tell whether your cup sits lighter or darker than what you’re aiming for.
        </p>
        <ol className="mt-2 space-y-1.5 text-sm">
          {ladder.map((s) => (
            <li key={s.p} className="flex gap-2">
              <span className={`w-28 shrink-0 font-semibold ${s.p === 0 || s.p === 6 ? 'text-red-700 dark:text-red-400' : ''}`}>{s.name}</span>
              <span className="text-stone-700 dark:text-stone-300">{s.tags.join(', ')}</span>
            </li>
          ))}
        </ol>
        <SourceLinks ids={flavourSources} className="mt-2" />
      </Section>

      <Section id="advice" title="How the advice works">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>Off-flavours point a direction: grassy, sour, peanut or thin means develop further; harsh bitter, ashy or roasty means pull back. Smoky or ashy in a <i>light</i> roast, or burnt tips on the beans, means too much heat early instead.</li>
          <li>Your sliders add to that (sharp acidity → further; flat acidity or harsh bitterness → less).</li>
          <li>Your flavours are compared with your target for the bean (or the origin’s classic profile). E.g. a Brazil that tastes nutty when you want chocolate sits a step too light.</li>
          <li>The size of the change comes from your own roast: the app works out the cool time that puts your development time ratio in Scott Rao’s 20–25% band (e.g. first crack 9:30 → cool at 11:53 for 20%). Above or below that band it looks elsewhere (heat before or after first crack).</li>
          <li>Your best-rated roast of the same bean is shown alongside, because your own history beats any general rule.</li>
          <li>Origin, process and variety notes are added when they’re relevant, and too-fresh tastings get a rest warning.</li>
        </ol>
        <p className="muted mt-2">For a deeper look, use “Copy for Claude” on a roast and paste it into a new chat.</p>
        <SourceLinks ids={['raoDtr', 'roestOneVariable']} className="mt-1" />
      </Section>

      <Section id="origins" title={`Origins (${origins.length})`}>
        <div className="space-y-2">
          {origins.map((o) => (
            <details key={o.id} className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
              <summary className="cursor-pointer font-semibold">{o.name} <span className="text-xs font-normal text-stone-500">{o.continent}</span></summary>
              <div className="mt-2"><OriginGuide bean={blankBean(o.id)} /></div>
            </details>
          ))}
        </div>
      </Section>

      <Section id="processes" title="Processing methods">
        <div className="space-y-3">
          {processes.filter((p) => p.roasting.length).map((p) => (
            <div key={p.id}>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm">{p.summary}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{p.roasting.map((r) => <li key={r}>{r}</li>)}</ul>
              <SourceLinks ids={p.sources} className="mt-1" />
            </div>
          ))}
        </div>
      </Section>

      <Section id="varieties" title="Varieties & bean sizes">
        <div className="space-y-3">
          {varieties.map((v) => (
            <div key={v.id}>
              <h3 className="font-semibold">{v.name}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              <SourceLinks ids={v.sources} className="mt-1" />
            </div>
          ))}
        </div>
      </Section>

      <Section id="sources" title={`All sources (${Object.keys(sources).length})`}>
        {kinds.map(({ kind, label }) => (
          <div key={kind} className="mb-3">
            <h3 className="text-sm font-semibold">{label}</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {(Object.keys(sources) as SourceId[])
                .filter((id) => sources[id].kind === kind)
                .map((id) => (
                  <li key={id}>
                    <a className="underline decoration-stone-300 underline-offset-2 hover:text-amber-700" href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].title}</a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Section>
    </div>
  )
}
