# Roastery

A roast log and coach for the **Gene Café CBR-101** home roaster. Log the Gene’s temperature while you roast and get a live graph. Afterwards, say how the coffee tasted and the app tells you what to change next time, e.g. *“Drop about 55 s later (at 11:53)”*. It’s an installable web app (PWA) that works offline next to the roaster and syncs to Supabase.

## What it does

- **Beans library**: origin, region, town/farm, altitude (masl), variety, process, grade, harvest, supplier, the seller’s tasting notes, and the flavours you’re aiming for. Each bean page shows what the research says about that origin, process, variety and altitude, plus your own roast history with it.
- **Live roast logger** (built for a phone next to the Gene):
  - A big timer that keeps running if the phone locks or the page reloads. The screen is kept awake.
  - A keypad for what the Gene’s display shows. The time is taken when you press the first digit, not when you press Log. “+1 / +2 / +3 / +5” buttons log a reading in one tap.
  - **Set temp** mode logs dial changes.
  - Buttons for yellow, first crack, first crack end, second crack and drop (the end of the roast), plus colour, smell and notes.
  - A beep or vibration every 30 s (configurable) reminding you to log.
  - Live graph: display temperature, set temperature, rate of rise, phase bands (drying / Maillard / development), and an overlay of an earlier roast so you can follow its curve.
  - After first crack it shows when to drop for a 20 / 22.5 / 25% development time ratio, and where your reference roast would land.
  - Optional starting plans from published Gene profiles (Roast Rebels, Sweet Maria’s, forum profiles, the manual’s chart) prompt you to change the dial at the right moment.
- **Finish**: roasted weight (→ weight loss %), roast level by sound and sight, how the beans look.
- **Tasting feedback**: stars; acidity, sweetness, body and bitterness compared with what you’d like; flavour tags (including off-notes like grassy, sour, ashy, papery); and “next time I want…”.
- **Advice** (rule-based, offline, every claim linked to its source):
  - Reads the direction from the off-flavours, sliders and your target flavours.
  - Sizes the change from your own roast: the drop time that puts your DTR in Scott Rao’s 20–25% band.
  - Shows your best roast of the same bean as a reference.
  - Adds origin, process and variety notes, a weight-loss check, and a warning if you tasted it too fresh.
- **Copy for Claude**: one tap copies the roast, bean, readings (CSV), tastings, your other roasts of that bean and the app’s suggestion, ready to paste into a new Claude chat for deeper research. If you roasted with a plan, it also includes the plan (curve and all), its target temperatures next to each reading, and planned vs actual yellow, first crack and cool times. Tick **“ask for a roast plan I can import”** and Claude is asked to reply with a plan in the Roastery plan CSV format (spec and an example included); paste the reply, or open the .csv, under **Plans → Import from Claude**, check the preview graph and save it. Plans can also be copied as CSV from the plan editor. There’s also CSV export of one roast or all roasts.
- **My plans**: design a roast before you start. A plan holds:
  - set-temperature changes (at the start, at a time, or at first crack + a few seconds);
  - target times for yellow and first crack;
  - when to drop (a time after first crack, a fixed time, or a DTR %);
  - optionally a target curve, previewed as a graph while you edit.

  Start one from scratch, from any of your roasts, from a published Gene profile, or with one tap from the advice on a tasted roast (“Plan the next roast: drop at 11:53”). While roasting, the plan’s curve and milestones are drawn behind yours, the screen shows how far over or under the plan you are, prompts each dial change, and counts down to the planned cool time (moved to match your real first crack).
- **Public library**: share any roast so other Gene roasters can see its curve, timings and how it tasted. Anyone can browse the library, even without an account: search by bean, region, roaster or flavour, and filter by origin and process.
  - On a shared roast you can **roast along** (its curve is drawn behind yours on the live screen), compare it with one of your own roasts, or add its bean to your list.
  - Sharing makes a copy: the curve, events, set temperatures, weights and level; the bean’s origin, region, farm, altitude, variety, process, grade, harvest, supplier and seller’s notes; your tasting ratings, tags and sliders. Your email and the price you paid are never shared, and written notes only if you tick the box. You choose the name shown.
  - The copy updates by itself when you add a tasting or edit the roast or bean. Remove it any time; deleting the roast removes it too.
- **Guide**: everything the app knows about the Gene, roasting phases, DTR, rate of rise, weight loss, roast levels, off-flavours, 31 origins, processing methods and varieties, with all 107 sources listed. Where no reliable number was found, it says so instead of guessing.

## Setup status

| Part | Status |
|---|---|
| Database | **Done.** Four tables (`roast_beans`, `roast_roasts`, `roast_tastings`, `roast_settings`) in the existing **worship-sets** Supabase project (`ydisjxcetvvatokvucvr`), because the free plan allows two projects. They are private per person via Row Level Security and don’t touch the worship tables. Schema: `supabase/migrations/0001_roastery.sql`. |
| Public library | **Done.** Table `roast_public` (`supabase/migrations/0002_public_library.sql`): anyone can read it; people can only add, change or remove shares of their own roasts. |
| My plans | **Done.** Table `roast_plans` (`supabase/migrations/0003_roast_plans.sql`), private to each person like roasts. |
| Login | **Done.** Same email and password as Worship Sets. Your roasts are only visible to you, unless you share one. |
| Hosting | **To do (2 min):** see below. |

### Put it online (Vercel)

1. Make sure the code is on a `main` branch (merge this branch into `main`, or create `main` from it on GitHub and set it as the default branch).
2. In Vercel: **Add New → Project → Import** `henroverhoef/roastery`. The settings come from `vercel.json` (Vite). Press **Deploy**.
3. Optional, only needed for the “Email link” login and new-account emails: in Supabase (project **worship-sets**) → **Authentication → URL Configuration → Redirect URLs**, add your Vercel address (e.g. `https://roastery.vercel.app/**`). Without it those emails link to the Worship Sets site. Password login works either way.
4. On your phone, open the address and install it: Android Chrome menu → *Install app*; iPhone Safari → Share → *Add to Home Screen*.

## Using it

1. **Beans → + Bean**: fill in what the bag says. Pick target flavours (or leave empty to aim for the origin’s classic profile).
2. **Start a roast**: choose the bean. The app suggests a starting plan and overlays your best earlier roast of that bean. Set the Gene’s timer longer than you need, then press **Beans in** the moment the beans go in.
3. Every 30 s or so, type the number on the Gene’s display. Tap **Yellow**, **1st crack**, etc. as they happen, and log any dial change under **Set temp**.
4. Press **Drop** when you end the roast, then **Finish**: weigh the beans (now or later) and choose the roast level. In Settings, choose how you end a roast: stop the Gene and tip the beans into a sieve (the default), or the Gene’s cooling cycle. Either way the roast ends when you tap Drop; the app never waits for the cooling cycle. The choice changes the tips, the advice wording and what Copy for Claude says about your setup.
5. After resting (24–48 h minimum; light roasts longer), **How was it?** on the home screen: rate it, tag flavours, set the sliders.
6. Read **Next roast** on the roast page. Change one thing at a time. For a deeper look, tap **Copy for Claude**.

## About the Gene’s temperature

The Gene’s display shows the **exhaust air** temperature, not the beans. One owner estimated it reads 15–20 °C above the beans, and units differ from each other. So the app compares you with your own earlier roasts rather than with published bean-probe numbers.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # roast maths, advice rules, knowledge-base integrity, upload queue
npm run build
```

- React + Vite + TypeScript + Tailwind, `vite-plugin-pwa` for offline/installable, Supabase for auth and data.
- `src/knowledge/`: the researched knowledge base (`gene.ts`, `roasting.ts`, `origins.ts`, `processes.ts`, `varieties.ts`, `flavours.ts`). Every entry cites ids from `sources.ts`; a test checks that every cited source exists.
- `src/lib/advice.ts`: the advice rules. `src/lib/metrics.ts`: phases, DTR, rate of rise. `src/lib/export.ts`: the Claude text and CSVs.
- `src/data/store.tsx`: offline-first store. Changes are saved on the device and queued, then uploaded in order when there’s a connection.
- `src/lib/plans.ts` and the plan helpers in `src/knowledge/gene.ts`: your own plans (schedule, targets, drop time, curve) and turning a roast into a plan.
- `src/lib/planCsv.ts`: the Roastery plan CSV format (what Claude is asked to write) and its reader and writer.
- `src/lib/public.ts`: the public library. It builds the shared snapshot (and decides what is never shared) and fetches the library.
- The Supabase URL and publishable key in `.env.production` are public by design; Row Level Security protects the data.
