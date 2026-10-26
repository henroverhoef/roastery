import type { SourceId } from './sources'

// Origin profiles. Altitudes and flavours come from the listed sources (often individual lots
// or one roaster's notes, which is said where it matters). Where no reliable data was found,
// the entry says so instead of guessing. Use the seller's notes for your specific lot.

export type Continent = 'Africa' | 'Central America & Mexico' | 'South America' | 'Asia & Pacific' | 'Arabia' | 'Islands'

export interface Region {
  name: string
  note: string
  altitude?: [number, number]
}

export interface Origin {
  id: string
  name: string
  continent: Continent
  altitude?: [number, number]
  altitudeNote?: string
  typical: string
  flavours: string[] // flavour ids it's known for
  best: string[] // the app's default flavour target for this origin
  levels: string[] // roast level ids where it tends to shine (empty = no clear guidance found)
  roasting: string[]
  watch?: string[]
  regions?: Region[]
  tooLight?: string // origin-specific line when your cup sits lighter than the target
  tooDark?: string // … and when it sits darker
  sources: SourceId[]
}

// Shared notes for washed Central and South American coffees.
export const americasNotes: { text: string; sources: SourceId[] }[] = [
  {
    text:
      'Sweet Maria’s (Chris Schooley) calls sweetness the core of washed Central Americans, and says they are versatile from City to Full City+. Lighter roasts show a malty sweetness, a little more development gives candy-like sweetness, then fruit, then chocolate.',
    sources: ['smCentral'],
  },
  {
    text:
      'Royal NY’s profile notes for Central and South America: for more acidity reach first crack sooner and end lighter with less development; for less acidity take longer to reach first crack and extend development.',
    sources: ['royalNyCsa'],
  },
]

export const origins: Origin[] = [
  // ——— South America ———
  {
    id: 'brazil',
    name: 'Brazil',
    continent: 'South America',
    typical:
      'Chocolate, nuts and caramel with low acidity and medium body, especially the pulped naturals. Lower-density lots lean chocolate and nut; denser lots can show more sweetness and fruity acidity.',
    flavours: ['chocolate', 'cocoa', 'milk_choc', 'nutty', 'almond', 'caramel', 'brown_sugar'],
    best: ['chocolate', 'cocoa', 'caramel'],
    levels: ['city_plus', 'full_city'],
    roasting: [
      'Natural Brazils are low density. One roaster gives them a slower profile with longer development, while denser lots (e.g. from Espírito Santo) get more heat early and a shorter roast.',
      'Naturals resist heat early, so the temperature can look sluggish in the first minutes. That’s normal.',
      'Full City (just before second crack) brings out chocolate, caramel and almond and softens the acidity. One guide drops natural lots around 218–224 °C bean temperature (not comparable with the Gene’s exhaust display).',
      'Roast Rebels’ Gene profile for Santos-type beans: preheat 175 °C, 230 g, 243 °C until first crack, then 233 °C, aiming for about 20% development.',
    ],
    watch: ['Past rolling second crack, Brazils pick up ashy, flat notes that strip the sweetness.'],
    tooLight:
      'Brazils show their chocolate and caramel around Full City (just before second crack). Grassy, peanut or only lightly nutty cups suggest it stopped short of that.',
    tooDark: 'Past rolling second crack Brazils turn ashy and flat. Aim to finish just before second crack.',
    sources: ['pdgBrazil', 'baristalifeBrazil', 'roastRebels'],
  },
  {
    id: 'colombia',
    name: 'Colombia',
    continent: 'South America',
    altitude: [1200, 1900],
    altitudeNote: 'Range given for Huila by one source.',
    typical:
      'Balanced and sweet. Huila is described as full-bodied and buttery with floral acidity and soft fruit at lighter roasts; Nariño as bright with sweet caramel aromas.',
    flavours: ['caramel', 'brown_sugar', 'red_apple', 'citrus', 'floral', 'chocolate'],
    best: ['caramel', 'red_apple', 'chocolate'],
    levels: ['city_plus', 'full_city'],
    roasting: [
      'From one Huila roaster: if you like some acidity keep it on the lighter side; if not, take it to at least a strong medium. Darker roasts lose the acidity and pick up a smokier edge.',
      'Sources disagree on the best level: one says Colombians are exceptional at medium, while roasters sell Huila lots from light to medium-dark.',
    ],
    regions: [
      { name: 'Huila', note: 'Fuller body, buttery mouthfeel, floral acidity and soft fruit at lighter roasts.', altitude: [1200, 1900] },
      { name: 'Nariño', note: 'Bright acidity, sweet caramel aromas, balanced mouthfeel.' },
    ],
    tooDark: 'Darker Colombians lose their acidity and pick up a smoky edge.',
    sources: ['driftawayHuila', 'burmanHuila'],
  },
  {
    id: 'peru',
    name: 'Peru',
    continent: 'South America',
    altitude: [900, 1800],
    altitudeNote: 'Lower lots (about 900–1200 m) vs higher lots (above about 1500 m), per one regional guide.',
    typical:
      'Altitude drives the cup. Lower-grown lots are mild with medium body and nutty or floral notes; lots above about 1500 m are brighter and fruitier.',
    flavours: ['chocolate', 'caramel', 'nutty', 'red_apple', 'tropical', 'molasses'],
    best: ['caramel', 'chocolate', 'red_apple'],
    levels: [],
    roasting: [],
    regions: [
      { name: 'Piura', note: 'Chocolate, caramel and nut.' },
      { name: 'Cajamarca', note: 'Sweet acidity with red and yellow fruit.' },
      { name: 'Puno', note: 'Tropical fruit, caramel and molasses.' },
    ],
    sources: ['achillesPeru'],
  },
  {
    id: 'bolivia',
    name: 'Bolivia',
    continent: 'South America',
    typical:
      'Coffee Review notes Bolivian coffee may be among the highest-grown in the world. A Cup of Excellence peaberry was described as brandy-toned chocolate, softly acidic and finely balanced. Not much more reliable data was found.',
    flavours: ['chocolate', 'balanced'],
    best: [],
    levels: [],
    roasting: [],
    sources: ['coffeeReviewAndes'],
  },
  {
    id: 'ecuador',
    name: 'Ecuador',
    continent: 'South America',
    typical:
      'Loja’s protected-origin specification: inclined to sweetness, with notes of fruit, chocolate or florals, citric acidity, medium body and a clean, long finish.',
    flavours: ['citrus', 'chocolate', 'floral', 'sweet'],
    best: ['citrus', 'chocolate'],
    levels: [],
    roasting: [],
    regions: [{ name: 'Loja', note: 'Sweet, fruit/chocolate/floral, citric acidity, medium body.' }],
    sources: ['lojaSpec'],
  },

  // ——— Central America & Mexico ———
  {
    id: 'guatemala',
    name: 'Guatemala',
    continent: 'Central America & Mexico',
    typical:
      'Antigua (a volcanic valley) leans towards chocolate, baking spice and a smoky edge. Huehuetenango, the highest and driest non-volcanic region, is brighter: citrus and fruit with milk chocolate and a syrupy body.',
    flavours: ['chocolate', 'milk_choc', 'spice', 'citrus', 'caramel'],
    best: ['caramel', 'milk_choc', 'citrus'],
    levels: ['city', 'city_plus', 'full_city'],
    roasting: [
      '“SHB” (Strictly Hard Bean) is an altitude grade (above about 1350 m) for slow-ripened, harder, denser beans, which generally take more heat.',
      'Roast Rebels’ Gene profile for SHB beans: preheat 180 °C, 250 g, 245 °C until 45 s after first crack, then 225 °C, aiming for about 19% development.',
    ],
    regions: [
      { name: 'Antigua', note: 'Volcanic soils: chocolate, baking spice, sometimes smoky.', altitude: [1400, 1700] },
      { name: 'Huehuetenango', note: 'Highest non-volcanic region, up to about 2000 m: bright, fruity, citrus, milk chocolate.', altitude: [1500, 2000] },
    ],
    sources: ['coffeeResearchGuatemala', 'interamericanHuehue', 'roastRebels'],
  },
  {
    id: 'costa_rica',
    name: 'Costa Rica',
    continent: 'Central America & Mexico',
    altitude: [1200, 1800],
    altitudeNote: 'Range across individual Tarrazú lots.',
    typical:
      'Clean and sweet. Tarrazú honey lots are described as milk chocolate, red fruit, honey and nougat. The more mucilage left on (white → yellow → red → black honey), the fruitier and heavier.',
    flavours: ['honey', 'brown_sugar', 'milk_choc', 'berry', 'stone_fruit', 'citrus'],
    best: ['honey', 'brown_sugar', 'stone_fruit'],
    levels: ['city', 'city_plus'],
    roasting: [
      'Honey lots are mostly sold light to medium-light for clarity and sweetness. Darker roasts push towards chocolate, caramel and body and mute the fruit.',
    ],
    regions: [{ name: 'Tarrazú', note: 'Honey-processed lots: chocolate, red fruit, honey.' }],
    sources: ['wayToCoffee'],
  },
  {
    id: 'honduras',
    name: 'Honduras',
    continent: 'Central America & Mexico',
    typical:
      'Cup of Excellence lots from Santa Bárbara (about 1500–1550 m) are described as dried berries, cane sugar, blackcurrant, honey, red apple and vanilla with a clean, fruity finish. Little other reliable regional data was found.',
    flavours: ['dried_fruit', 'brown_sugar', 'honey', 'red_apple', 'vanilla', 'blackcurrant'],
    best: ['brown_sugar', 'honey', 'red_apple'],
    levels: [],
    roasting: [],
    regions: [{ name: 'Santa Bárbara', note: 'Dried berries, cane sugar, vanilla.', altitude: [1500, 1550] }],
    sources: ['aceHonduras'],
  },
  {
    id: 'el_salvador',
    name: 'El Salvador',
    continent: 'Central America & Mexico',
    altitude: [1200, 1800],
    typical:
      'Mostly Bourbon and Pacamara. Santa Ana / Apaneca-Ilamatepec lots (about 1200–1700 m) show chocolate, stone fruit, honey and orange; Chalatenango (about 1200–1600 m) is noted for bright acidity and pronounced fruit.',
    flavours: ['chocolate', 'milk_choc', 'stone_fruit', 'honey', 'citrus', 'tropical'],
    best: ['milk_choc', 'stone_fruit', 'honey'],
    levels: [],
    roasting: [],
    regions: [
      { name: 'Santa Ana / Apaneca-Ilamatepec', note: 'Chocolate, stone fruit, marzipan, melon.', altitude: [1200, 1700] },
      { name: 'Chalatenango', note: 'Bright acidity, pronounced fruit, balanced sweetness.', altitude: [1200, 1600] },
    ],
    sources: ['aceElSalvador', 'wayToCoffee'],
  },
  {
    id: 'nicaragua',
    name: 'Nicaragua',
    continent: 'Central America & Mexico',
    altitude: [1200, 1650],
    altitudeNote: 'Jinotega lots in retailer listings.',
    typical:
      'Chocolate, honey and mild citrus, with surprisingly low acidity for a Central American coffee. Jinotega and Matagalpa are the main regions and are often sold interchangeably.',
    flavours: ['chocolate', 'honey', 'citrus', 'red_apple'],
    best: ['chocolate', 'honey'],
    levels: [],
    roasting: [],
    sources: ['happymugNicaragua'],
  },
  {
    id: 'mexico',
    name: 'Mexico',
    continent: 'Central America & Mexico',
    typical:
      'Mild and clean (Oaxaca, Chiapas, Veracruz). Sweet Maria’s: light roasts taste of caramel and praline nuts, dark roasts of smoky cocoa and cacao nibs. Often a thin body that suits blends.',
    flavours: ['caramel', 'almond', 'nutty', 'brown_sugar', 'cocoa'],
    best: ['caramel', 'almond', 'cocoa'],
    levels: ['city', 'city_plus', 'full_city'],
    roasting: ['A crowd-pleaser across roast levels; generally easy to roast.'],
    tooLight: 'Mexican coffees move from caramel and praline at lighter roasts to smoky cocoa when darker.',
    sources: ['smMexico'],
  },
  {
    id: 'panama',
    name: 'Panama',
    continent: 'Central America & Mexico',
    altitude: [1500, 1750],
    altitudeNote: 'Boquete Gesha lots.',
    typical:
      'Best known for Boquete Gesha: jasmine, lavender, citrus (tangelo), red grape and honey. Reviewed lots are roasted light (Agtron readings roughly 62–77).',
    flavours: ['jasmine', 'floral', 'citrus', 'honey', 'red_apple'],
    best: ['jasmine', 'floral', 'citrus'],
    levels: ['city'],
    roasting: ['Geshas are roasted light to keep the florals. Honey-processed lots have more body and sweetness than washed.'],
    tooDark: 'Gesha florals disappear quickly as the roast darkens.',
    sources: ['wayToCoffee'],
  },

  // ——— Africa ———
  {
    id: 'ethiopia',
    name: 'Ethiopia',
    continent: 'Africa',
    typical:
      'Washed coffees (Yirgacheffe, Guji, Sidama) are floral, citrusy and tea-like; naturals are berry-forward and sometimes winey.',
    flavours: ['floral', 'jasmine', 'citrus', 'tea', 'berry', 'stone_fruit', 'winey'],
    best: ['floral', 'citrus', 'berry'],
    levels: ['city', 'city_plus'],
    roasting: [
      'Mostly very dense, small beans that tolerate high heat.',
      'Washed lots: roast light (City to City+) and end development about 30–60 s after first crack to keep the florals.',
      'Naturals: roasters disagree. One runs them faster and hotter with shorter development for florals and acidity; another extends development 60–90 s past first crack with more airflow to avoid scorching (the Gene has no airflow control).',
      'Bean sizes vary within a lot, so first crack staggers. Log first crack at the first clear cracks.',
      'One guide targets 18–22% development for filter and 22–25% for espresso, and rests naturals 7–10 days and washed lots 5–7 days.',
    ],
    regions: [
      { name: 'Yirgacheffe', note: 'Washed: floral and citrus. Keep it light.' },
      { name: 'Guji', note: 'Very high density. One guide says its complex sugars benefit from a slightly longer Maillard phase, and drops just after first crack subsides for filter.' },
      { name: 'Sidama', note: 'Washed and natural lots; floral and fruit.' },
    ],
    tooLight:
      'Even light Ethiopians shouldn’t taste grassy or sour. Rather than going much darker, make sure development runs at least about 30–60 s after first crack, and consider a slightly longer, gentler run into first crack.',
    tooDark:
      'Ethiopian florals and fruit fade quickly. Nutty, chocolate or roasty notes mean it went further than this coffee likes: washed lots are usually ended 30–60 s after first crack.',
    sources: ['ethiocoffeeRoast', 'algranoEthiopia'],
  },
  {
    id: 'kenya',
    name: 'Kenya',
    continent: 'Africa',
    altitude: [1500, 2100],
    altitudeNote: 'General range from one source; SL28 is said to perform best above about 1600 m.',
    typical:
      'Blackcurrant, citrus and juicy, bright (phosphoric) acidity, sometimes a savoury tomato note. Mostly SL28 and SL34.',
    flavours: ['blackcurrant', 'berry', 'citrus', 'juicy', 'bright'],
    best: ['blackcurrant', 'berry', 'juicy'],
    levels: ['city', 'city_plus'],
    roasting: [
      'AA lots are large, dense and high-grown and usually need slightly more heat.',
      'Most roasters stop shortly after first crack. Going darker mutes the blackcurrant and citrus.',
      '“AA” is a size grade, not a variety (most Kenyan AA is SL28, but not all).',
    ],
    tooLight:
      'Kenyans are supposed to be bright, but sharp and sour (rather than juicy) suggests a little more development. Dense AA beans may also want a bit more heat early.',
    tooDark: 'Darker roasts mute the blackcurrant and citrus that Kenyans are prized for.',
    sources: ['mtpakSl28', 'pdgSl28', 'intheblackKenya'],
  },
  {
    id: 'rwanda',
    name: 'Rwanda',
    continent: 'Africa',
    altitude: [1700, 2000],
    altitudeNote: 'Where most farms are, per Sweet Maria’s.',
    typical:
      'Sweet, quietly floral (can read as honey), stone fruit, ripe citrus (often tangerine), cocoa, sometimes red or black currant. Clean and bright. Mostly local Bourbon-type trees.',
    flavours: ['floral', 'honey', 'stone_fruit', 'citrus', 'cocoa', 'berry'],
    best: ['stone_fruit', 'citrus', 'honey'],
    levels: [],
    roasting: [],
    watch: [
      'The “potato defect”: bacteria in some cherries make an occasional bean taste and smell like raw potato. It can’t be seen in the green beans. If a cup suddenly smells of raw potato, that’s the defect, not your roast.',
    ],
    sources: ['smRwanda', 'coffeeReviewGreatLakes', 'cafeImportsRwanda', 'smPotato'],
  },
  {
    id: 'burundi',
    name: 'Burundi',
    continent: 'Africa',
    altitude: [1580, 1900],
    altitudeNote: 'Kayanza Cup of Excellence lots.',
    typical: 'Kayanza lots show floral citrus, caramel, bergamot, peach and orange blossom; some have a tomato-like juiciness.',
    flavours: ['floral', 'citrus', 'caramel', 'stone_fruit', 'juicy'],
    best: ['citrus', 'caramel', 'floral'],
    levels: [],
    roasting: [],
    watch: ['Shares the Great Lakes “potato defect” with Rwanda: a raw-potato cup is the bean, not your roast.'],
    regions: [{ name: 'Kayanza', note: 'North, near the Rwandan border.', altitude: [1580, 1900] }],
    sources: ['aceBurundi', 'coffeeReviewGreatLakes', 'cafeImportsRwanda'],
  },
  {
    id: 'drc',
    name: 'DR Congo',
    continent: 'Africa',
    typical:
      'Kivu coffees grow on the slopes above Lake Kivu. One roaster found these dense, high-elevation coffees rich-bodied and sweet with caramel, chocolate and spice when roasted dark. Little other reliable data was found.',
    flavours: ['caramel', 'chocolate', 'spice'],
    best: ['caramel', 'chocolate'],
    levels: [],
    roasting: [],
    watch: ['The potato defect also turns up here, to a lesser degree than in Rwanda and Burundi.'],
    sources: ['driftawayCongo', 'coffeeReviewGreatLakes', 'smPotato'],
  },
  {
    id: 'uganda',
    name: 'Uganda',
    continent: 'Africa',
    altitude: [1250, 2000],
    altitudeNote: 'Bugisu (Mount Elgon) lots.',
    typical:
      'Mostly known for robusta. Arabica from Bugisu on Mount Elgon is usually washed, with citric acidity, full body, berries, red fruit and chocolate. Natural lots can be deeply fruity.',
    flavours: ['citrus', 'berry', 'red_apple', 'chocolate', 'syrupy'],
    best: ['berry', 'chocolate'],
    levels: [],
    roasting: [],
    sources: ['royalBugisu', 'coffeeReviewGreatLakes'],
  },
  {
    id: 'tanzania',
    name: 'Tanzania',
    continent: 'Africa',
    altitude: [1400, 2000],
    typical:
      'Often sold as peaberry. Lots are described as lemon/lime, plum, apple, caramel and chocolate, with slightly lighter acidity than Kenya (one seller).',
    flavours: ['citrus', 'stone_fruit', 'red_apple', 'caramel', 'chocolate'],
    best: ['chocolate', 'citrus', 'caramel'],
    levels: ['city_plus', 'full_city'],
    roasting: [
      'One roaster found a Tanzanian peaberry grassy/nutty right at first crack, smooth and chocolatey with citrus and florals at medium, and fuller with a smoky sweetness going into second crack.',
    ],
    tooLight: 'One roaster found Tanzanians grassy/nutty right at first crack and chocolatey at medium, so go a bit longer.',
    tooDark: 'Into second crack it turns fuller and smoky.',
    sources: ['royalTanzania', 'dunnTanzania'],
  },
  {
    id: 'zambia',
    name: 'Zambia',
    continent: 'Africa',
    altitude: [1200, 1700],
    altitudeNote: 'Most is grown above 1200 m and the best above 1500 m; Mount Sunzu is about 1600 m.',
    typical: 'Northern Province (Kasama, Mbala, Nakonde, Isoka). Mount Sunzu lots lean cocoa and caramel; a washed Starmaya lot tasted of brown sugar, cocoa and orange.',
    flavours: ['cocoa', 'caramel', 'brown_sugar', 'citrus'],
    best: ['cocoa', 'caramel'],
    levels: [],
    roasting: [],
    sources: ['algranoZambia', 'wayToCoffee'],
  },
  {
    id: 'malawi',
    name: 'Malawi',
    continent: 'Africa',
    typical:
      'The Mapanga estate in the south is the benchmark; northern areas such as Mzuzu sit at roughly 900–1800 m (seller figures). No reliable flavour data was found, so use the seller’s notes as your target.',
    flavours: [],
    best: [],
    levels: [],
    roasting: [],
    sources: ['happymugMalawi'],
  },
  {
    id: 'zimbabwe',
    name: 'Zimbabwe',
    continent: 'Africa',
    typical:
      'Coffee Review calls Zimbabwe’s coffees interesting and at times exceptional. No reliable flavour or altitude data was found for Chipinge or the Eastern Highlands, so use the seller’s notes as your target and lean on your own roasts.',
    flavours: [],
    best: [],
    levels: [],
    roasting: [],
    sources: ['coffeeReviewAltAfrica'],
  },

  // ——— Arabia & Asia ———
  {
    id: 'yemen',
    name: 'Yemen',
    continent: 'Arabia',
    typical:
      'All dry-processed, from old landrace trees: rustic and bittersweet, with date, pistachio, chai spice, tobacco and cocoa, thick body and mild acidity.',
    flavours: ['dried_fruit', 'spice', 'cocoa', 'nutty', 'winey'],
    best: ['dried_fruit', 'spice', 'cocoa'],
    levels: ['city_plus', 'full_city', 'full_city_plus', 'vienna'],
    roasting: [
      'Sweet Maria’s roasts many Yemen lots anywhere from City to French; darker roasts bring out bittersweet chocolate for espresso.',
      'Yemen lots are often a mix of grades and bean sizes, so expect a less even roast.',
      'Rest at least 72 hours: Sweet Maria’s says the flavours only start to come together after that.',
    ],
    sources: ['smYemen'],
  },
  {
    id: 'india',
    name: 'India',
    continent: 'Asia & Pacific',
    typical:
      'Best known for Monsooned Malabar: low acidity, earthy, woody and spicy with heavy body. Often used in espresso blends for body and crema.',
    flavours: ['earthy', 'spice', 'cocoa', 'syrupy'],
    best: ['cocoa', 'spice'],
    levels: ['full_city', 'full_city_plus', 'vienna'],
    roasting: [
      'Often roasted dark. At Full City+ to French, Sweet Maria’s describes bitter cocoa, spice and smoke, and says it can be more bitter than sweet on its own.',
      'One seller finds a lot of sweetness depending on roast, so lighter roasts are worth trying.',
    ],
    sources: ['smMonsoon', 'burmanMonsoon'],
  },
  {
    id: 'sumatra',
    name: 'Indonesia: Sumatra',
    continent: 'Asia & Pacific',
    typical: 'Wet-hulled: heavy body, earthy and herbal, low acidity, dark chocolate and spice.',
    flavours: ['earthy', 'herbal', 'dark_choc', 'spice', 'syrupy'],
    best: ['dark_choc', 'spice'],
    levels: ['full_city', 'full_city_plus'],
    roasting: [
      'Wetter beans: give a little more heat towards the start. A short drying phase can make it astringent and sour.',
      'Medium-dark is the usual sweet spot for body and chocolate. Light roasts can taste underdeveloped and roughly earthy.',
      'Expect some uneven colour; check that the beans dried evenly before blaming the roast.',
    ],
    watch: ['Poorly dried or stored lots can taste musty or muddy, and no roast fixes that.'],
    tooLight: 'Light Sumatras tend to taste underdeveloped and roughly earthy; medium to medium-dark is the usual target.',
    sources: ['mtpakSumatra', 'pdgWetHulled', 'scofiWetHulled'],
  },
  {
    id: 'sulawesi',
    name: 'Indonesia: Sulawesi (Toraja)',
    continent: 'Asia & Pacific',
    altitude: [1100, 2100],
    typical:
      'Warm spice, cocoa and dried fruit with a full, creamy body; sources disagree on acidity (low to vibrant), and Coffee Review finds the earthy note most intense in Toraja. Much of it is semi-washed or wet-hulled.',
    flavours: ['spice', 'cocoa', 'dried_fruit', 'earthy', 'syrupy'],
    best: ['spice', 'cocoa', 'dried_fruit'],
    levels: [],
    roasting: [],
    sources: ['scIdToraja', 'coffeeReviewIndonesia'],
  },
  {
    id: 'png',
    name: 'Papua New Guinea',
    continent: 'Asia & Pacific',
    altitude: [1400, 2100],
    typical:
      'Varies by lot: orange, plum and apple; blackcurrant, mandarin and caramel; or herbal and floral with caramel and earthy spice. Medium body and acidity.',
    flavours: ['citrus', 'stone_fruit', 'red_apple', 'caramel', 'herbal', 'spice'],
    best: ['caramel', 'citrus', 'stone_fruit'],
    levels: [],
    roasting: [
      'Roasters disagree: one suggests medium for more flavour and gentler acidity, another found a dark roast gave more flavour than a lighter, sweeter one.',
    ],
    sources: ['quantumPng', 'wayToCoffee'],
  },
  {
    id: 'china',
    name: 'China (Yunnan)',
    continent: 'Asia & Pacific',
    altitude: [1250, 2050],
    typical:
      'Sweet Maria’s describes Yunnan as soft, balanced, with good body and a modicum of acidity. Higher-grown modern lots show dried fig, florals, berries and lime.',
    flavours: ['dried_fruit', 'floral', 'berry', 'citrus', 'balanced'],
    best: ['dried_fruit', 'berry'],
    levels: [],
    roasting: [],
    sources: ['smChina', 'wayToCoffee'],
  },
  {
    id: 'vietnam',
    name: 'Vietnam',
    continent: 'Asia & Pacific',
    typical: 'Mostly robusta: heavy, low acidity, cocoa and nut. Fine robusta lots are increasingly available.',
    flavours: ['cocoa', 'dark_choc', 'nutty'],
    best: ['cocoa', 'dark_choc'],
    levels: ['full_city', 'full_city_plus'],
    roasting: [
      'Robusta is cupped at medium to medium-dark (Coffee Quality Institute protocol).',
      'A Vietnamese roaster says people tend to take fine robusta darker than necessary; too dark comes out smoky, flat and oily.',
    ],
    sources: ['freshcupRobusta', 'nguyenRoast'],
  },
  {
    id: 'hawaii',
    name: 'Hawaii (Kona)',
    continent: 'Islands',
    typical:
      'Smooth and rich with balanced acidity, caramel, nuts and chocolate. Coffee Review points out that Kona grows at fairly low elevations with traditional varieties.',
    flavours: ['caramel', 'nutty', 'chocolate', 'balanced'],
    best: ['caramel', 'nutty', 'chocolate'],
    levels: [],
    roasting: [],
    sources: ['konaCoffee', 'coffeeReviewIslands'],
  },
  {
    id: 'jamaica',
    name: 'Jamaica (Blue Mountain)',
    continent: 'Islands',
    typical: 'Mild, clean and sweet with a light body and subtle fruit.',
    flavours: ['clean', 'sweet', 'balanced'],
    best: [],
    levels: [],
    roasting: [],
    sources: ['buddhasCup', 'coffeeReviewIslands'],
  },
]

export function findOrigin(id: string | null | undefined): Origin | undefined {
  if (!id) return undefined
  const key = id.toLowerCase()
  return origins.find((o) => o.id === key || o.name.toLowerCase() === key)
}

export function isAmericas(o: Origin | undefined): boolean {
  return o?.continent === 'Central America & Mexico' || o?.continent === 'South America'
}

export function findRegion(o: Origin | undefined, region: string | null | undefined): Region | undefined {
  if (!o?.regions || !region) return undefined
  const r = region.toLowerCase()
  return o.regions.find((x) => r.includes(x.name.toLowerCase().split(' ')[0]) || x.name.toLowerCase().includes(r))
}

// Growing altitude → what that usually means for roasting.
export function altitudeNote(min: number | null, max: number | null): { text: string; sources: SourceId[] } | null {
  const alt = max ?? min
  if (alt == null) return null
  const high = alt >= 1500
  const shb = alt >= 1350
  if (high) {
    return {
      text:
        'High-grown (above about 1500 m, a rough threshold). Beans from higher up are generally denser and soak up heat more slowly at first. One guide charges dense beans 5–10 °C hotter than low-grown ones, and a soft, gentle profile on dense beans risks a baked or underdeveloped cup. High-grown coffees are often roasted lighter to keep their character.',
      sources: ['roastMagDensity', 'mtpakAltitude'],
    }
  }
  if (shb) {
    return {
      text:
        'Mid-to-high grown. In the Central American grading system, coffee grown above about 1350–1370 m counts as Strictly Hard Bean / Strictly High Grown: slower-ripened and denser than low-grown beans.',
      sources: ['roastMagDensity', 'interamericanHuehue'],
    }
  }
  return {
    text:
      'Lower-grown. These beans tend to be softer and less dense: roasters use a gentler profile and they tend towards chocolate and nut rather than bright fruit.',
    sources: ['roastMagDensity', 'pdgBrazil'],
  }
}
