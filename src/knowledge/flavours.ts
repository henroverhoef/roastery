import type { SourceId } from './sources'

// Flavour tags for tasting. `pos` places a flavour on the roast-development scale, from
// 0 (underdeveloped) to 6 (over-roasted). This is a general tendency drawn from the sources
// below (lighter = acidity, florals, fruit; medium = caramel, nuts, chocolate; dark = roasty,
// bittersweet, smoky), not a law: every coffee moves along it differently.
//   - SCA roast degree study: light → acidity/fruit, dark → bitter/roasted.
//   - Sweet Maria's (Schooley): washed Centrals go malty → candy-like → fruited → chocolate.
//   - Sweet Maria's Mexico: light → caramel, praline nuts; dark → smoky cocoa.
//   - Tanzania listing: grassy/nutty right at first crack, chocolatey at medium, smoky into 2C.
//   - Brazil guides: chocolate, caramel and almond around Full City; ashy past rolling 2C.

export type FlavourGroup = 'fruit' | 'floral' | 'sweet' | 'nut_choc' | 'other' | 'under' | 'over' | 'flat'

export interface Flavour {
  id: string
  name: string
  group: FlavourGroup
  pos: number | null // null = says nothing about roast degree
  defect?: boolean
}

export const flavourSources: SourceId[] = ['scaRoastDegree', 'smCentral', 'smMexico', 'dunnTanzania', 'baristalifeBrazil', 'eoDefects']

export const flavours: Flavour[] = [
  // bright end
  { id: 'floral', name: 'Floral', group: 'floral', pos: 1 },
  { id: 'jasmine', name: 'Jasmine', group: 'floral', pos: 1 },
  { id: 'tea', name: 'Tea-like', group: 'floral', pos: 1 },
  { id: 'citrus', name: 'Citrus', group: 'fruit', pos: 1 },
  { id: 'bright', name: 'Bright acidity', group: 'fruit', pos: 1 },
  { id: 'berry', name: 'Berry', group: 'fruit', pos: 2 },
  { id: 'blackcurrant', name: 'Blackcurrant', group: 'fruit', pos: 2 },
  { id: 'stone_fruit', name: 'Stone fruit', group: 'fruit', pos: 2 },
  { id: 'tropical', name: 'Tropical fruit', group: 'fruit', pos: 2 },
  { id: 'red_apple', name: 'Apple / red fruit', group: 'fruit', pos: 2 },
  { id: 'winey', name: 'Winey / boozy', group: 'fruit', pos: 2 },
  { id: 'juicy', name: 'Juicy', group: 'fruit', pos: 2 },
  { id: 'dried_fruit', name: 'Dried fruit', group: 'fruit', pos: 3 },
  // sweet middle
  { id: 'honey', name: 'Honey', group: 'sweet', pos: 3 },
  { id: 'brown_sugar', name: 'Brown sugar', group: 'sweet', pos: 3 },
  { id: 'caramel', name: 'Caramel', group: 'sweet', pos: 3 },
  { id: 'malty', name: 'Malty', group: 'sweet', pos: 3 },
  { id: 'vanilla', name: 'Vanilla', group: 'sweet', pos: 3 },
  { id: 'nutty', name: 'Nutty', group: 'nut_choc', pos: 3 },
  { id: 'almond', name: 'Almond / praline', group: 'nut_choc', pos: 3 },
  { id: 'milk_choc', name: 'Milk chocolate', group: 'nut_choc', pos: 4 },
  { id: 'chocolate', name: 'Chocolate', group: 'nut_choc', pos: 4 },
  { id: 'cocoa', name: 'Cocoa', group: 'nut_choc', pos: 4 },
  { id: 'spice', name: 'Spice', group: 'other', pos: 4 },
  { id: 'dark_choc', name: 'Dark chocolate', group: 'nut_choc', pos: 5 },
  { id: 'molasses', name: 'Molasses', group: 'sweet', pos: 5 },
  // descriptors that don't place the roast
  { id: 'sweet', name: 'Sweet', group: 'sweet', pos: null },
  { id: 'clean', name: 'Clean', group: 'other', pos: null },
  { id: 'balanced', name: 'Balanced', group: 'other', pos: null },
  { id: 'syrupy', name: 'Syrupy / creamy body', group: 'other', pos: null },
  { id: 'earthy', name: 'Earthy', group: 'other', pos: null },
  { id: 'herbal', name: 'Herbal', group: 'other', pos: null },
  // too light
  { id: 'grassy', name: 'Grassy', group: 'under', pos: 0, defect: true },
  { id: 'hay', name: 'Hay / straw', group: 'under', pos: 0, defect: true },
  { id: 'vegetal', name: 'Vegetal / green', group: 'under', pos: 0, defect: true },
  { id: 'peanut', name: 'Raw peanut', group: 'under', pos: 0, defect: true },
  { id: 'sour', name: 'Sour (sharp)', group: 'under', pos: 0, defect: true },
  { id: 'astringent', name: 'Astringent / drying', group: 'under', pos: 0, defect: true },
  { id: 'thin', name: 'Thin / watery', group: 'under', pos: 0.5, defect: true },
  { id: 'bready', name: 'Bready / cereal', group: 'flat', pos: 0.5, defect: true },
  // flat
  { id: 'flat', name: 'Flat / dull', group: 'flat', pos: null, defect: true },
  { id: 'papery', name: 'Papery / cardboard', group: 'flat', pos: null, defect: true },
  { id: 'woody', name: 'Woody', group: 'flat', pos: null, defect: true },
  // too dark / too hot
  { id: 'roasty', name: 'Roasty', group: 'over', pos: 5.5, defect: true },
  { id: 'bitter', name: 'Bitter (harsh)', group: 'over', pos: 6, defect: true },
  { id: 'smoky', name: 'Smoky', group: 'over', pos: 6, defect: true },
  { id: 'ashy', name: 'Ashy', group: 'over', pos: 6, defect: true },
  { id: 'burnt', name: 'Burnt / charred', group: 'over', pos: 6, defect: true },
  { id: 'rubbery', name: 'Rubbery', group: 'over', pos: null, defect: true },
  { id: 'potato', name: 'Raw potato', group: 'other', pos: null, defect: true },
]

const byId = new Map(flavours.map((f) => [f.id, f]))
export const findFlavour = (id: string) => byId.get(id)

export const flavourGroups: { id: FlavourGroup; name: string }[] = [
  { id: 'floral', name: 'Floral & tea' },
  { id: 'fruit', name: 'Fruit & acidity' },
  { id: 'sweet', name: 'Sweet' },
  { id: 'nut_choc', name: 'Nut & chocolate' },
  { id: 'other', name: 'Other' },
  { id: 'under', name: 'Too light?' },
  { id: 'flat', name: 'Flat / stale?' },
  { id: 'over', name: 'Too dark / hot?' },
]

/** Average roast-scale position of some flavour ids, ignoring the ones that don't place the roast. */
export function meanPos(ids: string[]): number | null {
  const ps = ids.map((id) => byId.get(id)?.pos).filter((p): p is number => p != null)
  if (!ps.length) return null
  return ps.reduce((a, b) => a + b, 0) / ps.length
}

// "Next time I want…" choices on a tasting.
export const wants = [
  { id: 'sweeter', name: 'Sweeter' },
  { id: 'more_choc', name: 'More chocolate / caramel' },
  { id: 'more_fruit', name: 'More fruit / florals' },
  { id: 'more_body', name: 'More body' },
  { id: 'less_bitter', name: 'Less bitter' },
  { id: 'less_sour', name: 'Less sour' },
  { id: 'same', name: 'Same again' },
] as const

export const brewMethods = ['Filter / pour-over', 'Espresso', 'AeroPress', 'French press', 'Moka pot', 'Cupping', 'Other'] as const
