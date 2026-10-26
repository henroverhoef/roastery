// All temperatures are stored in °C (what the Gene shows, converted if the Gene is set to °F).
// All times are seconds since the beans went in ("charge").

export type Unit = 'C' | 'F'

export type EventType =
  | 'yellow' // beans turned from green to yellow: end of the drying phase
  | 'fc_start' // first crack begins: end of the Maillard phase, start of development
  | 'fc_end' // first crack is over
  | 'sc_start' // second crack begins
  | 'drop' // cool button pressed / beans out: the end of the roast
  | 'colour' // what the beans look like right now (value = ColourStage id)
  | 'smell' // what the exhaust smells like right now (value = Smell id)
  | 'note'

export interface Reading {
  t: number
  c: number // the Gene's display (exhaust air temperature)
}

export interface SetPoint {
  t: number
  c: number // the temperature the Gene's dial is set to
}

export interface RoastEvent {
  t: number
  type: EventType
  value?: string
  note?: string
}

export interface Bean {
  id: string
  name: string
  country: string | null // origin id from knowledge/origins.ts, or free text
  region: string | null
  town: string | null // town, farm, washing station or co-op
  producer: string | null
  altitude_min: number | null // metres above sea level
  altitude_max: number | null
  variety: string | null
  process: string | null // process id from knowledge/processes.ts
  grade: string | null // e.g. AA, SHB, peaberry, screen 18
  harvest: string | null
  supplier: string | null
  price_per_kg: number | null
  seller_notes: string | null
  target_flavours: string[] // flavour ids the roaster is aiming for
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Roast {
  id: string
  bean_id: string | null
  roasted_at: string
  batch_g: number | null // green weight in
  roasted_g: number | null // roasted weight out
  ambient_c: number | null
  preheat_c: number | null
  brew: string | null // what it's meant for: filter, espresso, ...
  target_level: string | null // RoastLevel id
  plan_id: string | null // starting plan used, see knowledge/gene.ts
  reference_id: string | null // roast that was overlaid while roasting
  readings: Reading[]
  setpoints: SetPoint[]
  events: RoastEvent[]
  level: string | null // RoastLevel id judged at the end
  appearance: string[] // e.g. even, uneven, tipped, scorched, oily
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tasting {
  id: string
  roast_id: string
  tasted_on: string // yyyy-mm-dd
  brew: string | null
  rating: number | null // 1–5
  // How each attribute compares to what you'd like: -2 far too little … 0 just right … +2 far too much.
  acidity: number | null
  sweetness: number | null
  body: number | null
  bitterness: number | null
  tags: string[] // flavour ids
  wants: string[] // what you'd like next time (Want ids)
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Settings {
  unit: Unit
  unitChosen: boolean
  batch_g: number
  reminder_s: number // beep to log a temperature every N seconds (0 = off)
  sound: boolean
  location_m: number | null // altitude where you roast, metres
}

export const defaultSettings: Settings = {
  unit: 'C',
  unitChosen: false,
  batch_g: 250,
  reminder_s: 30,
  sound: true,
  location_m: null,
}
