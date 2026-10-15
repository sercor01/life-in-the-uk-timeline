import type { Place, NationId } from "../types";

/**
 * Curated places for the map tab.
 *
 * Each place is a *where*, not a *when*, so it does not live on the timeline.
 * As with `events.ts`, a place either points back at the quiz question(s) it
 * was drawn from (`source: "exam"`) or fills a handbook gap the quizzes skip
 * (`source: "handbook"`).
 *
 * - `examRefs` must resolve against `data/exams.json`; the smoke suite asserts
 *   that every place either resolves a reference or shows the handbook note.
 * - `linkedEventId` must match an id in `events.ts`; the map uses it for the
 *   "show this on the timeline" link.
 * - `importance`: 3 = always labelled, 2 = labelled once zoomed in a little,
 *   1 = labelled only when zoomed right in. It never hides the pin itself.
 * - Coordinates are the real ones, projected by `src/lib/geo.ts`.
 */
export const PLACES: Place[] = [
  // ----------------------------------------------------------------- England
  {
    id: "big-ben",
    name: "Big Ben & the Houses of Parliament",
    nation: "england",
    lat: 51.5007,
    lon: -0.1246,
    area: "Westminster, London",
    category: "monarchy",
    markerLabel: "Big Ben",
    summary:
      "Big Ben is the nickname of the great bell in the clock tower at the Houses of Parliament. The tower itself is the Elizabeth Tower, and the clock is over 150 years old.",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 1, id: 2 }],
  },
  {
    id: "tower-of-london",
    name: "Tower of London",
    nation: "england",
    lat: 51.5081,
    lon: -0.0759,
    area: "London",
    category: "monarchy",
    summary:
      "Built by William the Conqueror after 1066, the Tower has been a fortress, a prison and a palace. The Crown Jewels are kept here, and Anne Boleyn was executed within its walls.",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 2, id: 20 },
      { set: 6, id: 3 },
      { set: 4, id: 18 },
    ],
    linkedEventId: "norman-conquest",
  },
  {
    id: "st-pauls-cathedral",
    name: "St Paul's Cathedral",
    nation: "england",
    lat: 51.5138,
    lon: -0.0984,
    area: "London",
    category: "religion",
    markerLabel: "St Paul's",
    summary:
      "The cathedral was destroyed in the Great Fire of London in 1666 and rebuilt by Sir Christopher Wren. It is one of the churches lost and remade in that fire.",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 4, id: 3 }],
    linkedEventId: "great-fire",
  },
  {
    id: "buckingham-palace",
    name: "Buckingham Palace",
    nation: "england",
    lat: 51.5014,
    lon: -0.1419,
    area: "London",
    category: "monarchy",
    summary:
      "The official London residence of the monarch, and the focus of the Changing of the Guard and royal celebrations.",
    importance: 2,
    source: "handbook",
  },
  {
    id: "westminster-abbey",
    name: "Westminster Abbey",
    nation: "england",
    lat: 51.4994,
    lon: -0.1273,
    area: "London",
    category: "religion",
    summary:
      "William the Conqueror was crowned here in 1066, and almost every monarch since has been crowned in the abbey. It is also the burial place of many kings, queens and famous figures.",
    importance: 2,
    source: "handbook",
  },
  {
    id: "stonehenge",
    name: "Stonehenge",
    nation: "england",
    lat: 51.1789,
    lon: -1.8262,
    area: "Wiltshire",
    category: "prehistory",
    summary:
      "The great stone circle on Salisbury Plain in Wiltshire, raised in stages during the Bronze Age.",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 14, id: 13 }],
    linkedEventId: "stonehenge",
  },
  {
    id: "hadrians-wall",
    name: "Hadrian's Wall",
    nation: "england",
    lat: 55.013,
    lon: -2.33,
    area: "Northumberland",
    category: "prehistory",
    summary:
      "The Emperor Hadrian built a wall in the north of England to keep out the Picts, ancestors of the Scottish people. Parts survive, including the forts of Housesteads and Vindolanda.",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 10, id: 22 },
      { set: 15, id: 15 },
    ],
    linkedEventId: "hadrians-wall",
  },
  {
    id: "canterbury",
    name: "Canterbury",
    nation: "england",
    lat: 51.2802,
    lon: 1.0789,
    area: "Kent",
    category: "religion",
    summary:
      "The seat of the Church of England and the destination of Chaucer's pilgrims in The Canterbury Tales. St Augustine founded the first English cathedral here.",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 4, id: 14 },
      { set: 10, id: 4 },
    ],
    linkedEventId: "augustine",
  },
  {
    id: "york",
    name: "York",
    nation: "england",
    lat: 53.9591,
    lon: -1.0815,
    area: "Yorkshire",
    category: "monarchy",
    summary:
      "The House of York gave its name to one side in the Wars of the Roses, fought against the House of Lancaster from 1455.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 1, id: 6 },
      { set: 18, id: 10 },
    ],
    linkedEventId: "wars-of-roses",
  },
  {
    id: "lake-district",
    name: "Lake District",
    nation: "england",
    lat: 54.4609,
    lon: -3.0886,
    area: "Cumbria",
    category: "landscape",
    summary:
      "England's largest national park. In 2007 television viewers voted Wastwater, in the Lake District, as Britain's favourite view.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 3, id: 15 },
      { set: 7, id: 17 },
      { set: 9, id: 4 },
    ],
  },
  {
    id: "oxford",
    name: "Oxford",
    nation: "england",
    lat: 51.752,
    lon: -1.2577,
    area: "Oxfordshire",
    category: "science",
    summary:
      "Home of one of the two ancient universities. The annual rowing race on the Thames — the Boat Race — is contested between Oxford and Cambridge.",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 10, id: 23 }],
  },
  {
    id: "cambridge",
    name: "Cambridge",
    nation: "england",
    lat: 52.2053,
    lon: 0.1218,
    area: "Cambridgeshire",
    category: "science",
    summary:
      "A university city at the centre of British science: Rutherford worked here after Manchester, and the structure of DNA was worked out in 1953 through work at London and Cambridge.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 16, id: 10 },
      { set: 15, id: 12 },
      { set: 10, id: 23 },
    ],
  },
  {
    id: "manchester",
    name: "Manchester",
    nation: "england",
    lat: 53.4808,
    lon: -2.2426,
    area: "Greater Manchester",
    category: "rights",
    summary:
      "The birthplace of Emmeline Pankhurst, and where Ernest Rutherford led the team that first split the atom.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 11, id: 22 },
      { set: 15, id: 12 },
    ],
  },
  {
    id: "liverpool",
    name: "Liverpool",
    nation: "england",
    lat: 53.4084,
    lon: -2.9916,
    area: "Merseyside",
    category: "sport",
    summary:
      "The Grand National, one of Britain's most famous horse races, is run at Aintree near Liverpool.",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 7, id: 21 }],
  },
  {
    id: "stratford-upon-avon",
    name: "Stratford-upon-Avon",
    nation: "england",
    lat: 52.1917,
    lon: -1.7079,
    area: "Warwickshire",
    category: "arts",
    summary:
      "The birthplace of William Shakespeare, England's most famous playwright and poet.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 6, id: 9 },
      { set: 9, id: 6 },
    ],
  },
  {
    id: "eden-project",
    name: "Eden Project",
    nation: "england",
    lat: 50.3619,
    lon: -4.7447,
    area: "Cornwall",
    category: "science",
    summary:
      "The Eden Project, with its giant biomes, is in Cornwall, in the south-west of England.",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 5, id: 3 }],
  },
  {
    id: "portsmouth",
    name: "Portsmouth",
    nation: "england",
    lat: 50.8198,
    lon: -1.0874,
    area: "Hampshire",
    category: "science",
    summary:
      "The birthplace of the engineer Isambard Kingdom Brunel, who built the Great Western Railway — the first major railway in Britain.",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 16, id: 20 }],
  },
  {
    id: "dover",
    name: "White Cliffs of Dover",
    nation: "england",
    lat: 51.1279,
    lon: 1.3134,
    area: "Kent",
    category: "landscape",
    summary:
      "The chalk cliffs facing France, long a symbol of Britain's front door and of the country's defence in two world wars.",
    importance: 1,
    source: "handbook",
  },
  {
    id: "bath",
    name: "Bath",
    nation: "england",
    lat: 51.3811,
    lon: -2.359,
    area: "Somerset",
    category: "prehistory",
    summary:
      "A Roman town built around natural hot springs, with some of the best preserved Roman remains in Britain.",
    importance: 1,
    source: "handbook",
  },
  {
    id: "bletchley-park",
    name: "Bletchley Park",
    nation: "england",
    lat: 51.9976,
    lon: -0.7406,
    area: "Buckinghamshire",
    category: "science",
    summary:
      "The wartime codebreaking centre where Alan Turing worked on cracking the Enigma code, an early chapter in the story of the computer.",
    importance: 1,
    source: "handbook",
    linkedEventId: "turing-machine",
  },
  {
    id: "lindisfarne",
    name: "Lindisfarne",
    nation: "england",
    lat: 55.6809,
    lon: -1.8023,
    area: "Northumberland",
    category: "religion",
    summary:
      "The holy island off the north-east coast, where Viking raiders sacked the monastery in AD 793.",
    importance: 1,
    source: "handbook",
    linkedEventId: "vikings-lindisfarne",
  },
  {
    id: "hastings",
    name: "Hastings",
    nation: "england",
    lat: 50.8552,
    lon: 0.5729,
    area: "East Sussex",
    category: "war",
    summary:
      "The battle of 1066 in which William, Duke of Normandy, defeated Harold and took the English throne.",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 17, id: 16 }],
    linkedEventId: "norman-conquest",
  },
  {
    id: "runnymede",
    name: "Runnymede",
    nation: "england",
    lat: 51.4289,
    lon: -0.5619,
    area: "Surrey",
    category: "monarchy",
    summary:
      "The meadow beside the Thames where King John sealed Magna Carta in 1215, limiting the power of the monarch.",
    importance: 1,
    source: "handbook",
    linkedEventId: "magna-carta",
  },
  {
    id: "windsor-castle",
    name: "Windsor Castle",
    nation: "england",
    lat: 51.4839,
    lon: -0.6044,
    area: "Berkshire",
    category: "monarchy",
    summary:
      "The oldest and largest inhabited castle in the world, and one of the official residences of the monarch.",
    importance: 1,
    source: "handbook",
  },
  {
    id: "wembley",
    name: "Wembley Stadium",
    nation: "england",
    lat: 51.556,
    lon: -0.2796,
    area: "London",
    category: "sport",
    summary:
      "The home of English football, where the national team won the World Cup in 1966.",
    importance: 1,
    source: "handbook",
    linkedEventId: "world-cup-1966",
  },

  // ---------------------------------------------------------------- Scotland
  {
    id: "edinburgh",
    name: "Edinburgh",
    nation: "scotland",
    lat: 55.9533,
    lon: -3.1883,
    area: "Scotland",
    category: "monarchy",
    summary:
      "The capital city of Scotland. Every summer it hosts the Edinburgh Festival, whose best-known part is the Fringe.",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 7, id: 11 },
      { set: 10, id: 9 },
    ],
  },
  {
    id: "scottish-highlands",
    name: "The Highlands",
    nation: "scotland",
    lat: 57.12,
    lon: -4.71,
    area: "Highlands",
    category: "war",
    summary:
      "The clansmen of the Highlands supported Charles Edward Stuart — Bonnie Prince Charlie — in the Jacobite rising of 1745.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 3, id: 6 },
      { set: 13, id: 10 },
    ],
    linkedEventId: "jacobite-1745",
  },
  {
    id: "bannockburn",
    name: "Bannockburn",
    nation: "scotland",
    lat: 56.0936,
    lon: -3.9376,
    area: "Stirling",
    category: "war",
    summary:
      "Robert the Bruce defeated the English army here in 1314, a decisive battle in the Scottish wars of independence.",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 7, id: 6 },
      { set: 12, id: 14 },
    ],
    linkedEventId: "bannockburn",
  },
  {
    id: "skara-brae",
    name: "Skara Brae",
    nation: "scotland",
    lat: 59.0486,
    lon: -3.3417,
    area: "Orkney",
    category: "prehistory",
    summary:
      "A stone-built Neolithic village on Orkney, off the north coast of Scotland, and the best preserved prehistoric village in northern Europe.",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 17, id: 14 }],
    linkedEventId: "skara-brae",
  },
  {
    id: "glasgow",
    name: "Glasgow",
    nation: "scotland",
    lat: 55.8642,
    lon: -4.2518,
    area: "Scotland",
    category: "monarchy",
    summary:
      "Scotland's largest city. The Scottish Parliament sits not here but in Edinburgh.",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 18, id: 20 }],
  },
  {
    id: "ben-nevis",
    name: "Ben Nevis",
    nation: "scotland",
    lat: 56.7969,
    lon: -5.0036,
    area: "Highlands",
    category: "landscape",
    summary: "The highest mountain in the UK, at 1,345 metres.",
    importance: 1,
    source: "handbook",
  },
  {
    id: "loch-ness",
    name: "Loch Ness",
    nation: "scotland",
    lat: 57.3229,
    lon: -4.4244,
    area: "Highlands",
    category: "landscape",
    summary:
      "A deep freshwater loch in the Highlands, famous for the legend of its monster.",
    importance: 1,
    source: "handbook",
  },

  // ------------------------------------------------------------------- Wales
  {
    id: "cardiff",
    name: "Cardiff",
    nation: "wales",
    lat: 51.4816,
    lon: -3.1791,
    area: "Wales",
    category: "monarchy",
    summary:
      "The capital city of Wales, and home of the Welsh Parliament (Senedd).",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 3, id: 21 }],
  },
  {
    id: "snowdon",
    name: "Snowdon",
    nation: "wales",
    lat: 53.0685,
    lon: -4.0762,
    area: "Gwynedd",
    category: "landscape",
    summary:
      "The highest mountain in Wales, in Snowdonia, and a national park.",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 3, id: 11 }],
  },
  {
    id: "caernarfon-castle",
    name: "Caernarfon Castle",
    nation: "wales",
    lat: 53.1395,
    lon: -4.277,
    area: "Gwynedd",
    category: "monarchy",
    summary:
      "The castle where the Prince of Wales is invested, a tradition echoing Edward I's castles built to hold down Wales.",
    importance: 1,
    source: "handbook",
  },
  {
    id: "swansea",
    name: "Swansea",
    nation: "wales",
    lat: 51.6214,
    lon: -3.9436,
    area: "Wales",
    category: "monarchy",
    summary: "A city on the south Wales coast.",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 6, id: 15 }],
  },

  // -------------------------------------------------------- Northern Ireland
  {
    id: "belfast",
    name: "Belfast",
    nation: "ni",
    lat: 54.5973,
    lon: -5.9301,
    area: "Northern Ireland",
    category: "monarchy",
    summary:
      "The capital city of Northern Ireland, where the Northern Ireland Assembly meets at Stormont.",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 9, id: 9 }],
  },
  {
    id: "giants-causeway",
    name: "Giant's Causeway",
    nation: "ni",
    lat: 55.2408,
    lon: -6.5116,
    area: "County Antrim",
    category: "landscape",
    summary:
      "A formation of columns made from volcanic lava on the north-east coast of Northern Ireland, formed about 50 million years ago and wrapped in legend.",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 16, id: 2 }],
  },
];

/** The four nations in map/list order; used for headings and grouping. */
export const NATIONS: { id: NationId; label: string }[] = [
  { id: "england", label: "England" },
  { id: "scotland", label: "Scotland" },
  { id: "wales", label: "Wales" },
  { id: "ni", label: "Northern Ireland" },
];

export const NATION_BY_ID: Record<NationId, string> = Object.fromEntries(
  NATIONS.map((n) => [n.id, n.label]),
) as Record<NationId, string>;

/**
 * The places that point at a given event, most important first.
 *
 * One event can be the site of several places — the Norman Conquest links both
 * the Tower of London and Hastings — so this returns a list and the panel
 * offers each of them.
 */
export function placesLinkedTo(eventId: string): Place[] {
  return PLACES.filter((p) => p.linkedEventId === eventId).sort(
    (a, b) => b.importance - a.importance || a.name.localeCompare(b.name),
  );
}
