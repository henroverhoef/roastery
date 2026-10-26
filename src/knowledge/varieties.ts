import type { SourceId } from './sources'

export interface Variety {
  id: string
  name: string
  match: RegExp // matched against the bean's variety and grade fields
  notes: string[]
  sources: SourceId[]
}

export const varieties: Variety[] = [
  {
    id: 'sl28',
    name: 'SL28 / SL34',
    match: /\bsl[- ]?(28|34)\b/i,
    notes: [
      'SL28 is linked to intense blackcurrant and bright, phosphoric acidity at altitude. SL34 is similar but usually a bit less complex.',
      'Most roasters keep these light, stopping shortly after first crack, because darker roasts mute the blackcurrant and citrus.',
      'Its acidity fades faster than heavier coffees, so one guide suggests drinking within 4–6 weeks of roasting.',
    ],
    sources: ['mtpakSl28', 'pdgSl28'],
  },
  {
    id: 'gesha',
    name: 'Gesha / Geisha',
    match: /\bg[ie]e?sha\b|\bgeisha\b/i,
    notes: [
      'Prized for jasmine-like florals and citrus. Panamanian Geshas in reviews are mostly roasted light (Agtron readings roughly in the 60s to 70s).',
      'Roast it gently and light. Pushing it into chocolate territory hides what you paid for.',
    ],
    sources: ['wayToCoffee'],
  },
  {
    id: 'pacamara',
    name: 'Pacamara',
    match: /\bpacamara\b/i,
    notes: [
      'A large bean (Pacas × Maragogype). Pacamaras often reach first and second crack a few degrees cooler than other coffees, and the heat released by the cracks can run the roast ahead of plan.',
      'They often look lighter and more uneven than they really are, so don’t chase colour.',
      'The same weight takes about 10% more volume, so mind the Gene’s fill line.',
    ],
    sources: ['ozonePacamara', 'coffeeReviewBigBean'],
  },
  {
    id: 'maragogype',
    name: 'Maragogype',
    match: /\bmarago(gype|gipe)\b|\belephant\b/i,
    notes: [
      'A very large, porous bean that is hard to roast and can taste woody and flat. Lighter and less acidic than most.',
    ],
    sources: ['ozoneMaragogype', 'coffeeReviewBigBean'],
  },
  {
    id: 'peaberry',
    name: 'Peaberry',
    match: /\bpea ?berr(y|ies)\b|\bpb\b/i,
    notes: [
      'A single round seed instead of two flat ones. Roasters sort them out because their size and texture behave differently in the roast. One source notes their small, round shape lends itself to more even roasting.',
      'Cracks are hard to hear in the Gene anyway. If you miss first crack, estimate it from your earlier roasts of the same lot and watch the colour.',
    ],
    sources: ['royalTanzania', 'coffeeReviewBigBean', 'hbGeneHearing'],
  },
  {
    id: 'typica',
    name: 'Typica',
    match: /\btypica\b/i,
    notes: ['Sweet Maria’s describes high-grown old Typica from Mexico as a clean, classic profile.'],
    sources: ['smMexico'],
  },
  {
    id: 'bourbon',
    name: 'Bourbon',
    match: /\bbourbon\b|\bjackson\b|\bmibirizi\b/i,
    notes: [
      'The Great Lakes (Rwanda, Burundi) grow local Bourbon-type cultivars. Coffee Review describes their cups as sweet, quietly floral, stone fruit, tangerine and cocoa.',
    ],
    sources: ['coffeeReviewGreatLakes'],
  },
  {
    id: 'landrace',
    name: 'Ethiopian landrace / heirloom',
    match: /\bheirloom\b|\blandrace\b|\b74\d{3}\b/i,
    notes: [
      'Genetically diverse, so bean size varies within a lot. First crack tends to stagger rather than start all at once.',
    ],
    sources: ['ethiocoffeeRoast'],
  },
  {
    id: 'robusta',
    name: 'Robusta / canephora',
    match: /\brobusta\b|\bcanephora\b/i,
    notes: [
      'The Coffee Quality Institute’s cupping protocol roasts robusta medium to medium-dark, darker than arabica.',
      'Roasters unfamiliar with fine robusta tend to take it darker than it needs. Too dark tastes smoky, flat and oily.',
    ],
    sources: ['freshcupRobusta', 'nguyenRoast'],
  },
  {
    id: 'large_screen',
    name: 'Large screen (AA, 18+)',
    match: /\baa\b|\bscreen ?1[89]\b|\b1[89]\+/i,
    notes: [
      '“AA” is a screen size (bean size), not a variety. Big, dense high-grown beans usually need slightly more heat.',
    ],
    sources: ['intheblackKenya', 'mtpakSl28'],
  },
]

export function matchVarieties(...fields: (string | null | undefined)[]): Variety[] {
  const text = fields.filter(Boolean).join(' ')
  if (!text) return []
  return varieties.filter((v) => v.match.test(text))
}
