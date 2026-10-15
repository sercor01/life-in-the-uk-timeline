import type { TimelineEvent } from "../types";
import { POPULATION } from "./population";

/**
 * Curated dated events.
 *
 * Each event either points back at the quiz question(s) it was drawn from
 * (`source: "exam"`) or fills a gap in the handbook that the quizzes skip
 * (`source: "handbook"`). Negative years are BC.
 *
 * importance: 3 = always visible, 2 = medium zoom, 1 = only when zoomed in.
 */
const CURATED_EVENTS: TimelineEvent[] = [
  // ---------------------------------------------------------------- Prehistory
  {
    id: "stone-age",
    year: -9000,
    displayDate: "c. 9000 BC",
    title: "Stone Age settlers arrive",
    summary:
      "The first people to live in Britain were hunter-gatherers. They arrived during the Stone Age, long before farming reached the islands.",
    category: "prehistory",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 7, id: 18 }],
  },
  {
    id: "first-farmers",
    year: -4000,
    displayDate: "c. 4000 BC",
    title: "First farmers arrive",
    summary:
      "The first farmers arrived in Britain about 6,000 years ago. Their ancestors probably came from south-east Europe, and they brought farming and settled village life.",
    category: "prehistory",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 2, id: 7 },
      { set: 15, id: 5 },
    ],
  },
  {
    id: "skara-brae",
    year: -3180,
    displayDate: "c. 3180 BC",
    title: "Skara Brae",
    summary:
      "A stone-built Neolithic village on Orkney, off the north coast of Scotland. It is the best preserved prehistoric village in northern Europe.",
    category: "prehistory",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 17, id: 14 }],
  },
  {
    id: "stonehenge",
    year: -2500,
    displayDate: "c. 2500 BC",
    title: "Stonehenge built",
    summary:
      "Stonehenge stands in Wiltshire. The great stone circle was raised in stages during the Bronze Age.",
    category: "prehistory",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 14, id: 13 }],
  },
  {
    id: "iron-age",
    year: -800,
    endYear: 43,
    displayDate: "c. 800 BC – AD 43",
    title: "The Iron Age",
    summary:
      "Iron replaced bronze for tools and weapons. The people of the Iron Age made the first coins to be minted in Britain, some inscribed with the names of Iron Age kings. This marks the beginning of British history.",
    category: "prehistory",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 6, id: 2 },
      { set: 11, id: 21 },
      { set: 12, id: 5 },
    ],
  },

  // -------------------------------------------------------------------- Romans
  {
    id: "caesar-55bc",
    year: -55,
    displayDate: "55 BC",
    title: "Julius Caesar raids Britain",
    summary:
      "Julius Caesar led a Roman invasion of Britain in 55 BC, but it was unsuccessful. For nearly 100 years Britain stayed outside the Roman Empire.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 2, id: 10 }],
  },
  {
    id: "claudius-43",
    year: 43,
    displayDate: "AD 43",
    title: "Romans conquer Britain",
    summary:
      "The Emperor Claudius led the Roman army in a new invasion. Despite resistance from some British tribes, the Romans occupied almost all of Britain.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 2, id: 10 }],
  },
  {
    id: "boudicca",
    year: 60,
    displayDate: "AD 60–61",
    title: "Boudicca's revolt",
    summary:
      "Boudicca, queen of the Iceni in what is now eastern England, led one of the tribal revolts against the Romans.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 4, id: 8 },
      { set: 13, id: 3 },
      { set: 14, id: 24 },
    ],
  },
  {
    id: "hadrians-wall",
    year: 122,
    displayDate: "AD 122",
    title: "Hadrian's Wall built",
    summary:
      "The Emperor Hadrian built a wall in the north of England to keep out the Picts, the ancestors of the Scottish people. Its forts included Housesteads and Vindolanda.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 10, id: 22 },
      { set: 15, id: 15 },
    ],
  },
  {
    id: "romans-leave",
    year: 410,
    displayDate: "AD 410",
    title: "Romans leave Britain",
    summary:
      "The Roman army withdrew from Britain around AD 410. Their departure opened the way for tribes from northern Europe to settle.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 16, id: 4 }],
  },

  // ------------------------------------------------------------ Anglo-Saxons
  {
    id: "anglo-saxon-invasion",
    year: 449,
    displayDate: "AD 449 onwards",
    title: "Angles, Saxons and Jutes settle",
    summary:
      "After the Romans left, Britain was invaded by tribes from northern Europe: the Jutes, the Angles and the Saxons. Their kingdoms eventually became England.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 16, id: 4 },
      { set: 18, id: 9 },
    ],
  },
  {
    id: "augustine",
    year: 597,
    displayDate: "AD 597",
    title: "Christianity spreads",
    summary:
      "St Augustine led missionaries from Rome who spread Christianity in the south of England. He became the first Archbishop of Canterbury.",
    category: "religion",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 14, id: 14 }],
  },
  {
    id: "vikings-lindisfarne",
    year: 793,
    displayDate: "AD 793",
    title: "Viking raids begin",
    summary:
      "Viking raiders from Denmark and Norway attacked Lindisfarne and began a long campaign of raids and settlement across Britain.",
    category: "war",
    importance: 1,
    source: "handbook",
  },
  {
    id: "alfred-vikings",
    year: 878,
    displayDate: "AD 878",
    title: "Alfred defeats the Vikings",
    summary:
      "The Anglo-Saxon kingdoms in England united under King Alfred the Great, who defeated the Vikings.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 2, id: 11 },
      { set: 13, id: 7 },
    ],
  },

  // -------------------------------------------------------- Medieval England
  {
    id: "norman-conquest",
    year: 1066,
    displayDate: "1066",
    title: "Norman Conquest",
    summary:
      "William, Duke of Normandy, defeated Harold, the Saxon king of England, at the Battle of Hastings. It was the last successful foreign invasion of England. William ordered the building of the White Tower in the Tower of London.",
    category: "monarchy",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 2, id: 19 },
      { set: 4, id: 17 },
      { set: 6, id: 3 },
      { set: 7, id: 24 },
      { set: 16, id: 15 },
      { set: 17, id: 16 },
      { set: 18, id: 12 },
    ],
  },
  {
    id: "domesday",
    year: 1086,
    displayDate: "1086",
    title: "Domesday Book",
    summary:
      "William the Conqueror sent people all over England to list every town and village, who lived there, who owned the land and what animals they had. The Domesday Book gives a picture of society just after the Norman Conquest.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 6, id: 21 },
      { set: 9, id: 20 },
      { set: 11, id: 15 },
      { set: 15, id: 11 },
    ],
  },
  {
    id: "magna-carta",
    year: 1215,
    displayDate: "1215",
    title: "Magna Carta",
    summary:
      "Magna Carta established the idea that even the king was subject to the law. It protected the rights of the nobility and restricted the king's power to collect taxes or make and change laws.",
    category: "rights",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 2, id: 12 },
      { set: 8, id: 14 },
    ],
  },
  {
    id: "bannockburn",
    year: 1314,
    displayDate: "1314",
    title: "Battle of Bannockburn",
    summary:
      "The Scots, led by Robert the Bruce, defeated the English at Bannockburn. Scotland remained unconquered by the English.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 7, id: 6 },
      { set: 12, id: 14 },
    ],
  },
  {
    id: "hundred-years-war",
    year: 1337,
    endYear: 1453,
    displayDate: "1337–1453",
    title: "Hundred Years War",
    summary:
      "English kings fought a long war with France, called the Hundred Years War, even though it actually lasted 116 years.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 3, id: 5 }],
  },
  {
    id: "black-death",
    year: 1348,
    displayDate: "1348",
    title: "The Black Death",
    summary:
      "A disease, probably a form of plague, reached Britain in 1348. About one third of the population of England died, with a similar proportion in Scotland and Wales.",
    category: "rights",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 3, id: 19 },
      { set: 6, id: 18 },
      { set: 17, id: 11 },
    ],
  },
  {
    id: "wars-of-roses",
    year: 1455,
    endYear: 1485,
    displayDate: "1455–1485",
    title: "Wars of the Roses",
    summary:
      "A civil war between the supporters of two families, the House of Lancaster and the House of York, named for their red and white rose symbols.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 1, id: 6 }],
  },
  {
    id: "caxton",
    year: 1476,
    displayDate: "c. 1476",
    title: "Printing press in England",
    summary:
      "William Caxton was the first person in England to print books using a printing press.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 2, id: 22 },
      { set: 13, id: 8 },
    ],
  },
  {
    id: "bosworth",
    year: 1485,
    displayDate: "1485",
    title: "Battle of Bosworth Field",
    summary:
      "The Wars of the Roses ended at Bosworth. King Richard III was killed and Henry Tudor, leader of the House of Lancaster, became King Henry VII, the first Tudor monarch.",
    category: "monarchy",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 1, id: 6 }],
  },

  // --------------------------------------------------------- Tudors & Stuarts
  {
    id: "church-of-england",
    year: 1534,
    displayDate: "1534",
    title: "Henry VIII breaks with Rome",
    summary:
      "When the Pope refused to annul his marriage to Catherine of Aragon, Henry VIII established the Church of England. The Reformation was the movement against the authority of the Pope.",
    category: "religion",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 3, id: 4 },
      { set: 5, id: 11 },
      { set: 6, id: 17 },
      { set: 7, id: 19 },
      { set: 9, id: 19 },
    ],
  },
  {
    id: "church-of-scotland",
    year: 1560,
    displayDate: "1560",
    title: "Protestant Church of Scotland",
    summary:
      "The predominantly Protestant Scottish Parliament abolished the authority of the Pope in Scotland. A Protestant Church of Scotland with an elected leadership was established.",
    category: "religion",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 11, id: 14 }],
  },
  {
    id: "mary-executed",
    year: 1587,
    displayDate: "1587",
    title: "Mary, Queen of Scots executed",
    summary:
      "After spending about 20 years in prison, Mary was executed, accused of plotting against Elizabeth I.",
    category: "monarchy",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 8, id: 6 },
      { set: 16, id: 3 },
    ],
  },
  {
    id: "spanish-armada",
    year: 1588,
    displayDate: "1588",
    title: "Defeat of the Spanish Armada",
    summary:
      "The English defeated the Spanish Armada, a large fleet sent by Spain to conquer England and restore Catholicism.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 1, id: 12 },
      { set: 8, id: 18 },
      { set: 10, id: 16 },
      { set: 11, id: 11 },
      { set: 13, id: 21 },
    ],
  },
  {
    id: "union-of-crowns",
    year: 1603,
    displayDate: "1603",
    title: "Union of the crowns",
    summary:
      "When Elizabeth I died, her cousin James VI of Scotland became King James I of England, Wales and Ireland. Scotland remained a separate country.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 13, id: 19 }],
  },
  {
    id: "king-james-bible",
    year: 1611,
    displayDate: "1611",
    title: "King James Bible",
    summary:
      "One achievement of James I's reign was a new translation of the Bible into English, known as the King James Version or Authorised Version.",
    category: "religion",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 12, id: 8 }],
  },
  {
    id: "civil-war",
    year: 1642,
    endYear: 1651,
    displayDate: "1642–1651",
    title: "English Civil War",
    summary:
      "War between the king and Parliament split the country into the Cavaliers, who supported the king, and the Roundheads, who supported Parliament. Key battles included Marston Moor and Naseby.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 4, id: 16 },
      { set: 7, id: 15 },
      { set: 15, id: 14 },
      { set: 17, id: 9 },
    ],
  },
  {
    id: "charles-i-executed",
    year: 1649,
    displayDate: "1649",
    title: "Charles I executed",
    summary:
      "After his army was defeated, Charles I was held prisoner. Unwilling to reach agreement with Parliament, he was executed in 1649. England declared itself a republic, called the Commonwealth.",
    category: "monarchy",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 6, id: 8 },
      { set: 15, id: 3 },
      { set: 17, id: 9 },
    ],
  },
  {
    id: "cromwell-death",
    year: 1658,
    displayDate: "1658",
    title: "Death of Oliver Cromwell",
    summary:
      "Oliver Cromwell was given the title of Lord Protector and ruled until his death in 1658.",
    category: "monarchy",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 1, id: 23 }],
  },
  {
    id: "restoration",
    year: 1660,
    displayDate: "1660",
    title: "Restoration of the monarchy",
    summary:
      "Parliament invited Charles II to return from exile in the Netherlands. He was crowned king of England, Wales, Scotland and Ireland.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 5, id: 10 },
      { set: 16, id: 7 },
    ],
  },
  {
    id: "great-fire",
    year: 1666,
    displayDate: "1666",
    title: "Great Fire of London",
    summary:
      "A great fire destroyed much of the city, including many churches and St Paul's Cathedral. London was rebuilt with a new St Paul's, designed by Sir Christopher Wren.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 4, id: 3 },
      { set: 11, id: 20 },
    ],
  },
  {
    id: "habeas-corpus",
    year: 1679,
    displayDate: "1679",
    title: "Habeas Corpus Act",
    summary:
      "Habeas corpus is Latin for 'you must present the person in court'. The Act guaranteed that no one could be held prisoner unlawfully and that every prisoner has a right to a court hearing.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 10, id: 17 }],
  },
  {
    id: "huguenots",
    year: 1680,
    endYear: 1720,
    displayDate: "1680–1720",
    title: "Huguenot refugees arrive",
    summary:
      "Between 1680 and 1720 many refugees called Huguenots came to England from France.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 12, id: 10 }],
  },
  {
    id: "glorious-revolution",
    year: 1688,
    displayDate: "1688",
    title: "Glorious Revolution",
    summary:
      "Important Protestants in England asked William of Orange to invade England and proclaim himself king. When he reached England there was no resistance and he took the throne.",
    category: "monarchy",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 5, id: 18 },
      { set: 17, id: 20 },
    ],
  },
  {
    id: "bill-of-rights",
    year: 1689,
    displayDate: "1689",
    title: "Bill of Rights",
    summary:
      "The Bill of Rights confirmed the rights of Parliament and the limits of the king's power. Parliament took control of who could be monarch and declared that the monarch must be a Protestant.",
    category: "rights",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 1, id: 7 },
      { set: 7, id: 3 },
    ],
  },
  {
    id: "battle-of-the-boyne",
    year: 1690,
    displayDate: "1690",
    title: "Battle of the Boyne",
    summary: "William of Orange defeated James II at the Battle of the Boyne in Ireland.",
    category: "war",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 17, id: 21 }],
  },

  // --------------------------------------------------- Georgians to Victorians
  {
    id: "act-of-union-1707",
    year: 1707,
    displayDate: "1707",
    title: "Act of Union with Scotland",
    summary:
      "The kingdoms of England and Scotland were united as the Kingdom of Great Britain with a single Parliament at Westminster.",
    category: "monarchy",
    importance: 2,
    source: "handbook",
  },
  {
    id: "first-pm",
    year: 1721,
    endYear: 1742,
    displayDate: "1721–1742",
    title: "Sir Robert Walpole, first Prime Minister",
    summary:
      "The most important minister in Parliament became known as the Prime Minister. The first man to be called this was Sir Robert Walpole.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 14, id: 3 }],
  },
  {
    id: "jacobite-1745",
    year: 1745,
    displayDate: "1745",
    title: "Jacobite rising",
    summary:
      "Charles Edward Stuart (Bonnie Prince Charlie) landed in Scotland, supported by clansmen from the Scottish highlands, in an attempt to put a Stuart king back on the throne.",
    category: "monarchy",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 3, id: 6 },
      { set: 13, id: 10 },
    ],
  },
  {
    id: "american-independence",
    year: 1776,
    displayDate: "1776",
    title: "American colonies declare independence",
    summary:
      "Thirteen American colonies declared their independence, stating that people had a right to establish their own governments. They objected to taxation without representation.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 3, id: 18 },
      { set: 15, id: 2 },
      { set: 18, id: 26 },
    ],
  },
  {
    id: "act-of-union-1801",
    year: 1801,
    displayDate: "1801",
    title: "Act of Union with Ireland",
    summary:
      "The Kingdom of Ireland was brought into the United Kingdom, creating the United Kingdom of Great Britain and Ireland.",
    category: "monarchy",
    importance: 1,
    source: "handbook",
  },
  {
    id: "trafalgar",
    year: 1805,
    displayDate: "1805",
    title: "Battle of Trafalgar",
    summary:
      "Admiral Nelson was in charge of the British fleet at Trafalgar against the Spanish fleet and was killed in the battle.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 5, id: 17 },
      { set: 9, id: 15 },
      { set: 12, id: 4 },
      { set: 14, id: 6 },
    ],
  },
  {
    id: "waterloo",
    year: 1815,
    displayDate: "1815",
    title: "Battle of Waterloo",
    summary:
      "The French Wars ended with the defeat of the Emperor Napoleon by the Duke of Wellington at Waterloo, the last battle between Britain and France.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 4, id: 1 },
      { set: 9, id: 2 },
      { set: 13, id: 16 },
    ],
  },
  {
    id: "emancipation",
    year: 1833,
    displayDate: "1833",
    title: "Emancipation Act",
    summary:
      "The Emancipation Act abolished slavery throughout the British Empire. William Wilberforce had campaigned to end the slave trade.",
    category: "rights",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 7, id: 12 },
      { set: 15, id: 21 },
    ],
  },
  {
    id: "corn-laws",
    year: 1846,
    displayDate: "1846",
    title: "Repeal of the Corn Laws",
    summary:
      "The government began to promote free trade by abolishing taxes on imported goods. Repealing the Corn Laws allowed cheap grain to be imported and helped British industry.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 9, id: 14 }],
  },
  {
    id: "factories-act",
    year: 1847,
    displayDate: "1847",
    title: "Factories Act",
    summary:
      "The Factories Act limited the number of hours that women and children could work to 10 hours per day.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 17, id: 22 }],
  },
  {
    id: "great-exhibition",
    year: 1851,
    displayDate: "1851",
    title: "The Great Exhibition",
    summary:
      "The Great Exhibition opened in Hyde Park in the Crystal Palace, a huge building of steel and glass. Exhibits ranged from huge machines to handmade goods.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 9, id: 23 }],
  },
  {
    id: "crimean-war",
    year: 1853,
    endYear: 1856,
    displayDate: "1853–1856",
    title: "Crimean War",
    summary:
      "Britain fought with Turkey and France against Russia. It was the first war to be extensively covered by the media through news stories and photographs. Florence Nightingale nursed soldiers and is regarded as the founder of modern nursing.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 11, id: 23 },
      { set: 14, id: 12 },
    ],
  },
  {
    id: "pankhurst-born",
    year: 1858,
    displayDate: "1858",
    title: "Emmeline Pankhurst born",
    summary:
      "Emmeline Pankhurst, born in Manchester, became the leader of the suffragettes. She set up the Women's Franchise League in 1889 and helped found the WSPU in 1903.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 11, id: 22 }],
  },
  {
    id: "franchise-league",
    year: 1889,
    displayDate: "1889",
    title: "Women's Franchise League",
    summary:
      "Emmeline Pankhurst set up the Women's Franchise League, which fought to get the vote in local elections for married women.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 10, id: 18 },
      { set: 11, id: 22 },
    ],
  },
  {
    id: "boer-war",
    year: 1899,
    endYear: 1902,
    displayDate: "1899–1902",
    title: "Boer War",
    summary:
      "The British fought in South Africa against settlers from the Netherlands called the Boers. The war went on for over three years.",
    category: "war",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 5, id: 21 },
      { set: 9, id: 10 },
      { set: 17, id: 17 },
    ],
  },

  // ------------------------------------------------------------------ Modern
  {
    id: "wspu",
    year: 1903,
    displayDate: "1903",
    title: "The suffragettes",
    summary:
      "Emmeline Pankhurst helped found the Women's Social and Political Union (WSPU), the first group whose members were called suffragettes. They used civil disobedience to campaign for the vote.",
    category: "rights",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 10, id: 18 },
      { set: 11, id: 22 },
    ],
  },
  {
    id: "olympics-1908",
    year: 1908,
    displayDate: "1908",
    title: "London Olympics",
    summary:
      "The UK has hosted the Olympic Games on three occasions: 1908, 1948 and 2012.",
    category: "sport",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 12, id: 20 },
      { set: 14, id: 19 },
    ],
  },
  {
    id: "ww1-start",
    year: 1914,
    displayDate: "28 June 1914",
    title: "First World War begins",
    summary:
      "The assassination of Archduke Franz Ferdinand of Austria set off a chain of events leading to the First World War (1914–18).",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [{ set: 7, id: 10 }],
  },
  {
    id: "women-vote-1918",
    year: 1918,
    displayDate: "1918",
    title: "Women over 30 get the vote",
    summary:
      "Women over the age of 30 were given voting rights and the right to stand for Parliament, partly in recognition of the contribution they made to the war effort.",
    category: "rights",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 1, id: 3 },
      { set: 2, id: 5 },
      { set: 8, id: 16 },
      { set: 10, id: 7 },
    ],
  },
  {
    id: "ww1-end",
    year: 1918,
    displayDate: "11 November 1918",
    title: "First World War ends",
    summary:
      "The First World War ended at 11.00 am on 11 November 1918 with victory for Britain and its allies.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 10, id: 21 },
      { set: 15, id: 6 },
    ],
  },
  {
    id: "ireland-partition",
    year: 1921,
    displayDate: "1921",
    title: "Anglo-Irish Treaty",
    summary:
      "A peace treaty was signed. In 1922 Ireland became two countries: the six counties in the north remained part of the UK as Northern Ireland, and the rest became the Irish Free State.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 2, id: 6 },
      { set: 6, id: 22 },
    ],
  },
  {
    id: "baird-tv",
    year: 1925,
    displayDate: "1920s",
    title: "Television developed",
    summary:
      "The television was developed by the Scotsman John Logie Baird in the 1920s.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 2, id: 24 }],
  },
  {
    id: "penicillin",
    year: 1928,
    displayDate: "1928",
    title: "Penicillin discovered",
    summary:
      "Sir Alexander Fleming discovered penicillin, the first antibiotic, which transformed medicine.",
    category: "science",
    importance: 2,
    source: "handbook",
  },
  {
    id: "women-vote-1928",
    year: 1928,
    displayDate: "1928",
    title: "Women get the vote at 21",
    summary:
      "Shortly before Emmeline Pankhurst's death, women were given the right to vote at the age of 21, the same age as men.",
    category: "rights",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 1, id: 3 },
      { set: 4, id: 11 },
      { set: 9, id: 7 },
    ],
  },
  {
    id: "great-depression",
    year: 1930,
    displayDate: "1930s",
    title: "The Great Depression",
    summary:
      "During the Great Depression in the 1930s the traditional heavy industries, such as shipbuilding, were badly affected.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 3, id: 22 }],
  },
  {
    id: "jet-engine",
    year: 1930,
    displayDate: "1930s",
    title: "Jet engine invented",
    summary:
      "The jet engine was developed in Britain in the 1930s by Sir Frank Whittle.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 1, id: 21 }],
  },
  {
    id: "turing-machine",
    year: 1936,
    displayDate: "1936",
    title: "The Turing machine",
    summary:
      "Alan Turing, a British mathematician, invented the Turing machine, a theoretical device that laid the foundation of modern computing.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 15, id: 10 }],
  },
  {
    id: "ww2-start",
    year: 1939,
    displayDate: "1939",
    title: "Second World War begins",
    summary:
      "The Second World War started when Hitler invaded Poland. Britain and France declared war in order to stop his aggression.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 3, id: 13 },
      { set: 5, id: 24 },
      { set: 8, id: 1 },
    ],
  },
  {
    id: "battle-of-britain",
    year: 1940,
    displayDate: "Summer 1940",
    title: "Battle of Britain and the Blitz",
    summary:
      "The Battle of Britain was a crucial aerial battle fought between Germany and Britain in the summer of 1940. During the Blitz, German aircraft bombed London and other British cities at night.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 6, id: 14 },
      { set: 11, id: 7 },
      { set: 13, id: 13 },
      { set: 18, id: 16 },
    ],
  },
  {
    id: "butler-act",
    year: 1944,
    displayDate: "1944",
    title: "The Butler Act",
    summary:
      "The Education Act 1944, often called the Butler Act, introduced free secondary education in England and Wales.",
    category: "rights",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 9, id: 21 }],
  },
  {
    id: "ww2-end",
    year: 1945,
    displayDate: "1945",
    title: "Second World War ends",
    summary:
      "The war ended in 1945. The British people elected a Labour government and Clement Attlee became Prime Minister. The United Nations was set up after the war to prevent war and promote international peace and security.",
    category: "war",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 14, id: 18 },
      { set: 16, id: 1 },
    ],
  },
  {
    id: "olympics-1948",
    year: 1948,
    displayDate: "1948",
    title: "London Olympics and the NHS",
    summary:
      "The UK hosted the Olympic Games in 1948. The National Health Service was founded the same year, providing healthcare free at the point of use.",
    category: "sport",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 12, id: 20 },
      { set: 14, id: 19 },
    ],
  },
  {
    id: "ireland-republic",
    year: 1949,
    displayDate: "1949",
    title: "Ireland becomes a republic",
    summary:
      "The Irish Free State, created in 1922, became a republic in 1949.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 2, id: 6 }],
  },
  {
    id: "dna",
    year: 1953,
    displayDate: "1953",
    title: "Structure of DNA discovered",
    summary:
      "The structure of the DNA molecule was discovered in 1953 through work at British universities. Francis Crick was one of those awarded the Nobel Prize.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 8, id: 7 },
      { set: 16, id: 10 },
    ],
  },
  {
    id: "bannister",
    year: 1954,
    displayDate: "1954",
    title: "First four-minute mile",
    summary:
      "Sir Roger Bannister was the first man in the world to run a mile in under four minutes.",
    category: "sport",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 3, id: 23 },
      { set: 17, id: 19 },
    ],
  },
  {
    id: "world-cup-1966",
    year: 1966,
    displayDate: "1966",
    title: "England win the World Cup",
    summary:
      "Bobby Moore captained the English football team that won the World Cup in 1966, which England hosted.",
    category: "sport",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 1, id: 11 }],
  },
  {
    id: "booker-prize",
    year: 1968,
    displayDate: "1968",
    title: "Man Booker Prize founded",
    summary:
      "The Man Booker Prize for Fiction has been awarded since 1968 for the best novel written by an author from the Commonwealth, Ireland or Zimbabwe.",
    category: "arts",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 8, id: 22 }],
  },
  {
    id: "voting-age-18",
    year: 1969,
    displayDate: "1969",
    title: "Voting age lowered to 18",
    summary:
      "The present voting age of 18 was set in 1969. With a few exceptions, all UK-born and naturalised adult citizens have the right to vote.",
    category: "rights",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 13, id: 14 }],
  },
  {
    id: "mary-peters",
    year: 1972,
    displayDate: "1972",
    title: "Mary Peters wins Olympic gold",
    summary:
      "The Northern Irish athlete Mary Peters won an Olympic gold medal in the pentathlon in 1972.",
    category: "sport",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 15, id: 8 }],
  },
  {
    id: "thatcher",
    year: 1979,
    endYear: 1990,
    displayDate: "1979–1990",
    title: "Margaret Thatcher, first woman PM",
    summary:
      "Margaret Thatcher was the first woman Prime Minister of the UK and the longest-serving Prime Minister of the 20th century, remaining in office from 1979 until 1990.",
    category: "monarchy",
    importance: 3,
    source: "exam",
    examRefs: [
      { set: 1, id: 9 },
      { set: 11, id: 8 },
      { set: 17, id: 5 },
    ],
  },
  {
    id: "turner-prize",
    year: 1984,
    displayDate: "1984",
    title: "Turner Prize established",
    summary:
      "The Turner Prize, established in 1984, celebrates contemporary art and is one of the most prestigious visual art awards in Europe.",
    category: "arts",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 8, id: 24 }],
  },
  {
    id: "world-wide-web",
    year: 1989,
    displayDate: "1989",
    title: "World Wide Web invented",
    summary:
      "The World Wide Web was invented by Sir Tim Berners-Lee while working at CERN.",
    category: "science",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 12, id: 15 }],
  },
  {
    id: "devolution",
    year: 1997,
    displayDate: "1997",
    title: "Scottish Parliament and Welsh Assembly",
    summary:
      "The Labour Party led by Tony Blair was elected in 1997. The Blair government introduced a Scottish Parliament and a Welsh Assembly.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 16, id: 13 }],
  },
  {
    id: "greatest-briton",
    year: 2002,
    displayDate: "2002",
    title: "Churchill voted greatest Briton",
    summary:
      "Winston Churchill was voted the greatest Briton of all time by the public in 2002.",
    category: "monarchy",
    importance: 1,
    source: "exam",
    examRefs: [
      { set: 4, id: 9 },
      { set: 12, id: 23 },
    ],
  },
  {
    id: "lord-of-the-rings",
    year: 2003,
    displayDate: "2003",
    title: "Best-loved novel vote",
    summary:
      "In 2003 The Lord of the Rings by JRR Tolkien was voted the country's best-loved novel.",
    category: "arts",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 5, id: 23 }],
  },
  {
    id: "wastwater",
    year: 2007,
    displayDate: "2007",
    title: "Britain's favourite view",
    summary:
      "In 2007 television viewers voted Wastwater in the Lake District as Britain's favourite view.",
    category: "arts",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 7, id: 17 }],
  },
  {
    id: "coalition-2010",
    year: 2010,
    displayDate: "May 2010",
    title: "Coalition government",
    summary:
      "The Conservative and Liberal Democrat parties formed a coalition. The leader of the Conservative Party, David Cameron, became Prime Minister.",
    category: "monarchy",
    importance: 2,
    source: "exam",
    examRefs: [{ set: 6, id: 16 }],
  },
  {
    id: "olympics-2012",
    year: 2012,
    displayDate: "2012",
    title: "London Olympics and Diamond Jubilee",
    summary:
      "London hosted the Olympic Games for the third time. The clock tower at the Houses of Parliament was renamed the Elizabeth Tower to honour Queen Elizabeth II's Diamond Jubilee.",
    category: "sport",
    importance: 2,
    source: "exam",
    examRefs: [
      { set: 1, id: 2 },
      { set: 12, id: 20 },
      { set: 14, id: 19 },
    ],
  },
  {
    id: "paralympics-2016",
    year: 2016,
    displayDate: "2016",
    title: "Ellie Simmonds wins more gold",
    summary:
      "Ellie Simmonds won gold medals for swimming at the 2008, 2012 and 2016 Paralympic Games and holds a number of world records.",
    category: "sport",
    importance: 1,
    source: "exam",
    examRefs: [{ set: 16, id: 18 }],
  },
];

/**
 * The handbook's population table also appears on the timeline, so each figure
 * can be read in context with the events around it. These are generated from
 * `POPULATION` so the numbers live in one place. Every entry is `handbook`
 * sourced and carries no exam reference, because the question sets ask nothing
 * about population figures.
 */
const POPULATION_EVENTS: TimelineEvent[] = POPULATION.map((point) => ({
  id: `population-${point.year}`,
  year: point.year,
  title: `Population: ${point.label.toLowerCase()}`,
  // The marker shows the figure alone so the number stays visible where the
  // full "Population: ..." title would be ellipsised.
  markerLabel: point.label,
  summary:
    `The population of the UK was ${point.label.toLowerCase()}.` +
    (point.note ? ` ${point.note}` : ""),
  category: "population",
  importance: point.importance,
  source: "handbook",
}));

export const EVENTS: TimelineEvent[] = [...CURATED_EVENTS, ...POPULATION_EVENTS];

/** Id lookup, used by the map to link a place to its historical event. */
export const EVENT_BY_ID: Record<string, TimelineEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
);
