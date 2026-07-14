// AstroOS v3.0 — mock cosmic data fused with GitHub project's real patterns
// Reflects: 44 planetary lines, 84 weights (14 planets × 6 spheres), orbis zones,
// narrative engine, BaZi 4 pillars, I-Ching, Tarot, compatibility, local space, members.

import type { Locale } from "./i18n";

export type ScreenKey =
  | "overview" | "reveal" | "today" | "self" | "world" | "local"
  | "mentor" | "divine" | "connect" | "members" | "upgrade" | "business"
  | "profile" | "auth" | "welcome" | "birth" | "themes" | "family" | "astro-travel"
  | "bazi-report";

export const USER = {
  name: "Aeliana",
  nameRu: "Аэлиана",
  nameHi: "एलियाना",
  sun: "Scorpio",
  moon: "Pisces",
  rising: "Aquarius",
  dayMaster: "Yang Water 壬",
  dayMasterEl: "Water",
  dayMasterStem: "壬",
  powerCities: ["Lisbon", "Buenos Aires", "Tokyo"],
  gift: "depth",
  edge: "boundaries",
  voice: "Empowerment",
  tier: "Pro · Monthly",
  birthPlace: "Saint Petersburg, RU",
  birthLat: 59.93,
  birthLng: 30.34,
  birthTime: "04:17 AM",
  birthTz: 3,
  dob: "1989-11-07T04:17",
  gender: 0,
  streak: 5,
};

export const TODAY = {
  date: { en: "Thursday · June 26", ru: "Четверг · 26 июня", hi: "गुरुवार · 26 जून" },
  focus: {
    en: "A conversation you've been postponing wants your courage today.",
    ru: "Разговор, который ты откладываешь, сегодня ждёт твоей смелости.",
    hi: "वह बातचीत जिसे आप टाल रहे हैं, आज आपके साहस की प्रतीक्षा कर रही है।",
  },
  horoscope: {
    en: "The Moon in Cancer trines your Scorpio Sun this morning, softening the edges of what felt rigid yesterday. Mercury's lingering sextile to Saturn invites disciplined honesty — not the kind that wounds, but the kind that clears ground. Mid-afternoon, a square to Chiron may surface an old story about whether your depth is 'too much.' It isn't. Today is for naming what you've been circling.",
    ru: "Луна в Раке утром образует трины к вашему Скорпионьему Солнцу, смягчая то, что вчера казалось жёстким. Секстиль Меркурия к Сатурну приглашает к дисциплинированной честности — не той, что ранит, а той, что расчищает землю. После полудня квадратура к Хирону может поднять старую историю о том, 'не слишком ли' ваша глубина. Нет. Сегодня — назвать то, вокруг чего вы кружите.",
    hi: "कर्क में चंद्रमा आज सुबह आपके वृश्चिक सूर्य से त्रिकोण बनाता है, कल जो कठोर लगा था उसे नरम करते हुए। बुध का शनि से सेक्स्टाइल अनुशासित ईमानदारी को आमंत्रित करता है। दोपहर में चिरोन से वर्ग पुरानी कहानी उठा सकता है। आज — नाम लें जिसके चारों ओर आप घूम रहे हैं।",
  },
  affirmation: {
    en: "I do not shrink to fit rooms that were built without me. I bring my full tide, and let the shore decide.",
    ru: "Я не уменьшаюсь, чтобы поместиться в комнатах, построенных без меня. Я приношу свой полный прилив — и пусть берег решает.",
    hi: "मैं उन कमरों में छोटा नहीं होता जो मेरे बिना बने। मैं अपना पूरा ज्वार लाता हूं — किनारा तय करे।",
  },
  compliment: {
    en: "Your ability to hold paradox without flinching is a rare architecture. People feel safer around it than they admit.",
    ru: "Ваша способность держать парадокс, не вздрагивая, — редкая архитектура. Люди чувствуют себя вокруг неё безопаснее, чем признаются.",
    hi: "विरोधाभास को बिना हिचकिचाए थामने की आपकी क्षमता दुर्लभ वास्तुकला है। लोग इसके चारों ओर सुरक्षित महसूस करते हैं।",
  },
  transitPills: [
    { label: "☾ Moon ☌ Scorpio Sun", tone: "gold" as const },
    { label: "☿ Mercury ⚹ Saturn", tone: "jade" as const },
    { label: "☽ square Chiron", tone: "rose" as const },
  ],
};

// 8 UI spheres with colors (matching GitHub project constants.ts)
export const SPHERES = [
  { key: "career", icon: "◈", color: "#FBBF24", weight: 0.78 },
  { key: "love", icon: "♥", color: "#F9A8D4", weight: 0.86 },
  { key: "health", icon: "✚", color: "#34D399", weight: 0.64 },
  { key: "finance", icon: "◆", color: "#FBBF24", weight: 0.70 },
  { key: "spirit", icon: "✦", color: "#C4B5FD", weight: 0.72 },
  { key: "create", icon: "❋", color: "#FDA4AF", weight: 0.75 },
  { key: "travel", icon: "➤", color: "#67E8F9", weight: 0.68 },
  { key: "family", icon: "⌂", color: "#10B981", weight: 0.80 },
];

// 10 planets + colors (GitHub PLANET_COLORS)
export const PLANETS = [
  { key: "Sun", symbol: "☉", color: "#FBBF24" },
  { key: "Moon", symbol: "☾", color: "#94A3B8" },
  { key: "Mercury", symbol: "☿", color: "#60A5FA" },
  { key: "Venus", symbol: "♀", color: "#F472B6" },
  { key: "Mars", symbol: "♂", color: "#EF4444" },
  { key: "Jupiter", symbol: "♃", color: "#A78BFA" },
  { key: "Saturn", symbol: "♄", color: "#94A3B8" },
  { key: "Uranus", symbol: "♅", color: "#22D3EE" },
  { key: "Neptune", symbol: "♆", color: "#2DD4BF" },
  { key: "Pluto", symbol: "♇", color: "#9333EA" },
];

// 4 line types
export const LINE_TYPES = [
  { key: "MC", label: "MC", desc: { en: "Career · status · public image", ru: "Карьера · статус · имидж", hi: "करियर · स्थिति · सार्वजनिक छवि" }, color: "#E8B86D" },
  { key: "IC", label: "IC", desc: { en: "Home · roots · family", ru: "Дом · корни · семья", hi: "घर · जड़ें · परिवार" }, color: "#5BB89C" },
  { key: "Asc", label: "Asc", desc: { en: "Personality · vitality · beginnings", ru: "Личность · жизненность · начала", hi: "व्यक्तित्व · ऊर्जा · शुरुआत" }, color: "#D98E7A" },
  { key: "Desc", label: "Desc", desc: { en: "Partnerships · relationships", ru: "Партнёрство · отношения", hi: "साझेदारी · रिश्ते" }, color: "#5E8FA8" },
];

// Orbis zones (GitHub BUFFER_ZONES)
export const ORBIS_ZONES = [
  { key: "main", maxKm: 111, factor: 1.0, color: "#10B981", label: { en: "Direct hit", ru: "Прямое попадание", hi: "प्रत्यक्ष" } },
  { key: "extended", maxKm: 222, factor: 0.7, color: "#84CC16", label: { en: "Strong zone", ru: "Сильная зона", hi: "मजबूत क्षेत्र" } },
  { key: "fading", maxKm: 444, factor: 0.3, color: "#F59E0B", label: { en: "Fading zone", ru: "Зона затухания", hi: "मंद क्षेत्र" } },
];

// Cities — real data density (from city-seeds.ts sample)
export const CITIES = [
  {
    name: "Lisbon", country: "Portugal", lat: 38.72, lng: -9.14, score: 92,
    tone: "gold" as const, sphere: "love", qol: 85, population: 547000, income: 2200, housing: 3800, climate: "temperate",
    matchType: "favorable",
    lines: [
      { planet: "Venus", type: "IC", distKm: 28, zone: "main", weight: 0.92 },
      { planet: "Jupiter", type: "MC", distKm: 45, zone: "main", weight: 0.88 },
      { planet: "Sun", type: "Desc", distKm: 67, zone: "main", weight: 0.82 },
      { planet: "Saturn", type: "IC", distKm: 180, zone: "extended", weight: -0.45 },
    ],
    narrative: {
      en: ["Your Venus IC line creates an atmosphere of harmony and beauty — deep roots for partnership and a home that holds you.", "Jupiter MC opens financial and public horizons — visible expansion in your work.", "Sun Descendant brings relationships with warmth and recognition."],
      ru: ["Линия Венеры на IC создаёт атмосферу гармонии и красоты — глубокие корни для партнёрства и дом, который держит вас.", "Юпитер на MC открывает финансовые и публичные горизонты — видимое расширение в работе.", "Солнце на Десценденте приносит отношениям теплоту и признание."],
      hi: ["शुक्र IC रेखा सामंजस्य और सुंदरता का माहौल बनाती है — साझेदारी के लिए गहरी जड़ें।", "गुरु MC वित्तीय और सार्वजनिक क्षितिज खोलता है।", "सूर्य डिसेंडेंट रिश्तों में गर्माहट लाता है।"],
    },
    watch: { en: ["Saturn IC (180km) — discipline required around finances"], ru: ["Сатурн IC (180км) — дисциплина в финансах"], hi: ["शनि IC (180किमी) — वित्त में अनुशासन"] },
    parans: [{ desc: "Venus IC × Jupiter MC", bonus: 0.15 }],
    travelMode: true,
  },
  {
    name: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.38, score: 87,
    tone: "jade" as const, sphere: "create", qol: 78, population: 3075000, income: 1200, housing: 2400, climate: "temperate",
    matchType: "favorable",
    lines: [
      { planet: "Neptune", type: "MC", distKm: 52, zone: "main", weight: 0.85 },
      { planet: "Venus", type: "Asc", distKm: 89, zone: "main", weight: 0.78 },
      { planet: "Mars", type: "IC", distKm: 210, zone: "extended", weight: -0.55 },
    ],
    narrative: {
      en: ["Neptune MC amplifies artistic recognition and dream-work — your creativity becomes visible.", "Venus Ascendant — romance unfolds gently, without forcing."],
      ru: ["Нептун на MC усиливает художественное признание и работу со снами — ваше творчество становится видимым.", "Венера на Асценденте — романтика раскрывается мягко, без давления."],
      hi: ["वरुण MC कलात्मक मान्यता और स्वप्न-कार्य को बढ़ाता है।", "शुक्र एसेंडेंट — प्रेम कोमलता से खिलता है।"],
    },
    watch: { en: ["Mars IC (210km) — underground friction, choose neighbourhoods carefully"], ru: ["Марс IC (210км) — подповерхностное трение, выбирайте район осторожно"], hi: ["मंगल IC (210किमी) — सावधानी से क्षेत्र चुनें"] },
    parans: [],
    travelMode: true,
  },
  {
    name: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, score: 81,
    tone: "rose" as const, sphere: "career", qol: 88, population: 13960000, income: 3800, housing: 9200, climate: "temperate",
    matchType: "favorable",
    lines: [
      { planet: "Mercury", type: "MC", distKm: 38, zone: "main", weight: 0.90 },
      { planet: "Saturn", type: "MC", distKm: 95, zone: "main", weight: 0.72 },
      { planet: "Pluto", type: "IC", distKm: 240, zone: "extended", weight: -0.60 },
    ],
    narrative: {
      en: ["Mercury MC — communication work, writing, teaching flourish here.", "Saturn trine — long-term structures reward patient building."],
      ru: ["Меркурий на MC — коммуникативная работа, письмо, преподавание процветают.", "Сатурн тригон — долгосрочные структуры вознаграждают терпеливое строительство."],
      hi: ["बुध MC — संचार कार्य, लेखन, शिक्षण फलते-फूलते हैं।", "शनि त्रिकोण — दीर्घकालिक संरचनाएं धैर्य का पुरस्कार देती हैं।"],
    },
    watch: { en: ["Pluto IC (240km) — transformation through intensity"], ru: ["Плутон IC (240км) — трансформация через интенсивность"], hi: ["यम IC (240किमी) — तीव्रता से परिवर्तन"] },
    parans: [{ desc: "Mercury MC × Saturn MC", bonus: 0.12 }],
    travelMode: false,
  },
  {
    name: "Tbilisi", country: "Georgia", lat: 41.69, lng: 44.8, score: 78,
    tone: "gold" as const, sphere: "finance", qol: 72, population: 1180000, income: 900, housing: 1500, climate: "temperate",
    matchType: "favorable",
    lines: [
      { planet: "Jupiter", type: "Asc", distKm: 62, zone: "main", weight: 0.80 },
      { planet: "Uranus", type: "Desc", distKm: 195, zone: "extended", weight: -0.40 },
    ],
    narrative: {
      en: ["Jupiter sextile — modest, steady growth in resources.", "Ascendant line — new beginnings arrive with optimism."],
      ru: ["Юпитер секстиль — скромный, стабильный рост ресурсов.", "Линия Асцендента — новые начала приходят с оптимизмом."],
      hi: ["गुरु सेक्स्टाइल — विनम्र, स्थिर वृद्धि।", "एसेंडेंट रेखा — नई शुरुआत आशावाद के साथ।"],
    },
    watch: { en: ["Uranus Desc (195km) — expect the unexpected in contracts"], ru: ["Уран Десц (195км) — ожидайте неожиданного в контрактах"], hi: ["अरुण डिसेंडेंट (195किमी) — अनुबंध में अप्रत्याशित"] },
    parans: [],
    travelMode: false,
  },
  {
    name: "Mexico City", country: "Mexico", lat: 19.43, lng: -99.13, score: 74,
    tone: "jade" as const, sphere: "family", qol: 70, population: 9210000, income: 1100, housing: 2100, climate: "temperate",
    matchType: "favorable",
    lines: [
      { planet: "Moon", type: "IC", distKm: 41, zone: "main", weight: 0.86 },
    ],
    narrative: {
      en: ["Moon trine — emotional nourishment, ancestral healing. Your family roots find ground here."],
      ru: ["Луна тригон — эмоциональное питание, исцеление предков. Семейные корни находят здесь почву."],
      hi: ["चंद्र त्रिकोण — भावनात्मक पोषण, पैतृक चिकित्सा। परिवार की जड़ें यहां जमीन पाती हैं।"],
    },
    watch: { en: [], ru: [], hi: [] },
    parans: [],
    travelMode: false,
  },
  {
    name: "Dubai", country: "UAE", lat: 25.2, lng: 55.27, score: 69,
    tone: "rose" as const, sphere: "finance", qol: 82, population: 3331000, income: 4500, housing: 7800, climate: "desert",
    matchType: "challenging",
    lines: [
      { planet: "Saturn", type: "MC", distKm: 78, zone: "main", weight: -0.65 },
      { planet: "Mars", type: "Asc", distKm: 130, zone: "extended", weight: -0.50 },
    ],
    narrative: {
      en: ["Saturn MC brings structure but also restriction — career moves require patience here.", "Mars Ascendant — high drive but risk of friction in personal expression."],
      ru: ["Сатурн на MC даёт структуру, но и ограничения — карьерные ходы требуют терпения.", "Марс на Асценденте — высокий драйв, но риск трения в самовыражении."],
      hi: ["शनि MC संरचना देता है लेकिन प्रतिबंध भी — करियर में धैर्य चाहिए।", "मंगल एसेंडेंट — उच्च ड्राइव लेकिन घर्षण का जोखिम।"],
    },
    watch: { en: ["Mars Asc (130km) — channel drive into structured projects"], ru: ["Марс Асц (130км) — направьте драйв в структурированные проекты"], hi: ["मंगल एसेंडेंट (130किमी) — ड्राइव को संरचित परियोजनाओं में लगाएं"] },
    parans: [],
    travelMode: true,
  },
];

// BaZi four pillars (real structure from bazi-fallback.ts)
export const BAZI = {
  dayMaster: { stem: "壬", nameEn: "Yang Water", nameRu: "Янская Вода", nameHi: "यांग जल", element: "Water", strength: "moderate", score: 24 },
  fourPillars: [
    { position: "Year", stem: "己", stemName: "Yin Earth", branch: "巳", branchName: "Snake", hiddenStems: ["丙", "戊", "庚"] },
    { position: "Month", stem: "甲", stemName: "Yang Wood", branch: "子", branchName: "Rat", hiddenStems: ["癸"] },
    { position: "Day", stem: "壬", stemName: "Yang Water", branch: "辰", branchName: "Dragon", hiddenStems: ["戊", "乙", "癸"] },
    { position: "Hour", stem: "壬", stemName: "Yang Water", branch: "寅", branchName: "Tiger", hiddenStems: ["甲", "丙", "戊"] },
  ],
  tenGods: [
    { god: "比肩 (Bi Jian)", nameEn: "Companion", nameRu: "Братство", nameHi: "साथी", desc: "Self-discipline, independence, peer relationships" },
    { god: "正财 (Zheng Cai)", nameEn: "Direct Wealth", nameRu: "Прямое богатство", nameHi: "प्रत्यक्ष धन", desc: "Stable income, property, frugality" },
    { god: "七杀 (Qi Sha)", nameEn: "Seven Killings", nameRu: "Убийство семёрки", nameHi: "सात हत्याएं", desc: "Authority, ambition, pressure" },
    { god: "正印 (Zheng Yin)", nameEn: "Direct Resource", nameRu: "Прямая печать", nameHi: "प्रत्यक्ष संसाधन", desc: "Wisdom, learning, mother, protection" },
  ],
  luckPillars: [
    { age: "1-10", stem: "乙", stemName: "Yin Wood", branch: "亥", branchName: "Pig", element: "Wood" },
    { age: "11-20", stem: "丙", stemName: "Yang Fire", branch: "子", branchName: "Rat", element: "Fire" },
    { age: "21-30", stem: "丁", stemName: "Yin Fire", branch: "丑", branchName: "Ox", element: "Fire" },
    { age: "31-40", stem: "戊", stemName: "Yang Earth", branch: "寅", branchName: "Tiger", element: "Earth", current: true },
    { age: "41-50", stem: "己", stemName: "Yin Earth", branch: "卯", branchName: "Rabbit", element: "Earth" },
    { age: "51-60", stem: "庚", stemName: "Yang Metal", branch: "辰", branchName: "Dragon", element: "Metal" },
    { age: "61-70", stem: "辛", stemName: "Yin Metal", branch: "巳", branchName: "Snake", element: "Metal" },
    { age: "71-80", stem: "壬", stemName: "Yang Water", branch: "午", branchName: "Horse", element: "Water" },
  ],
  elements: [
    { element: "Wood", score: 22, color: "#5BB89C" },
    { element: "Fire", score: 14, color: "#D98E7A" },
    { element: "Earth", score: 28, color: "#E8B86D" },
    { element: "Metal", score: 12, color: "#9A9AA8" },
    { element: "Water", score: 24, color: "#5E8FA8" },
  ],
  recommendations: {
    stones: [
      { name: "Pearl", element: "Water", finger: "little finger", purpose: { en: "Strengthens Water Day Master", ru: "Усиливает Water Day Master", hi: "जल Day Master को मजबूत करता है" } },
      { name: "Blue Sapphire", element: "Water", finger: "middle finger", purpose: { en: "Calms, deepens intuition", ru: "Успокаивает, углубляет интуицию", hi: "शांत करता है, अंतर्ज्ञान गहरा करता है" } },
      { name: "Moonstone", element: "Water", finger: "ring finger", purpose: { en: "Emotional balance", ru: "Эмоциональный баланс", hi: "भावनात्मक संतुलन" } },
      { name: "Avoid: Ruby", element: "Fire", finger: "—", purpose: { en: "Drains Water", ru: "Истощает Воду", hi: "जल को कम करता है" } },
    ],
    colors: { primary: ["#1E3A5F", "#0F4C5C", "#5E8FA8"], accent: ["#E8B86D", "#5BB89C"], avoid: ["#EF4444", "#D98E7A"] },
    professions: { top: ["Diplomat", "Therapist", "Writer", "Navigator", "Healer", "Philosopher"], avoid: ["Butcher", "Soldier", "Demolition"] },
    directions: { sleep: "North", work: "North-East", travel: "East" },
    luckyNumber: 1,
    homeArtifacts: ["Aquarium or water feature in North", "Mirrors to expand space", "Blue/black textiles"],
  },
  riskYears: [{ year: 2026, note: { en: "Snake year clashes with Day Master — rest, don't force", ru: "Год Змеи сталкивается с Day Master — отдых, не насилуйте", hi: "सर्प वर्ष Day Master से टकराता है — विश्राम" } }],
};

// Local Space (8 sectors)
export const LOCAL_SPACE = {
  sectors: [
    { dir: "N", deg: 0, planets: ["Moon"], tone: "water" as const, rec: { en: "Rest, intuition, ancestral connection", ru: "Отдых, интуиция, связь с предками", hi: "विश्राम, अंतर्ज्ञान, पैतृक संबंध" } },
    { dir: "NE", deg: 45, planets: ["Jupiter"], tone: "gold" as const, rec: { en: "Growth, learning, expansion", ru: "Рост, обучение, расширение", hi: "वृद्धि, सीखना, विस्तार" } },
    { dir: "E", deg: 90, planets: [], tone: "muted" as const, rec: { en: "Neutral — new beginnings", ru: "Нейтрально — новые начала", hi: "तटस्थ — नई शुरुआत" } },
    { dir: "SE", deg: 135, planets: ["Venus"], tone: "rose" as const, rec: { en: "Love, beauty, harmony", ru: "Любовь, красота, гармония", hi: "प्रेम, सुंदरता, सामंजस्य" } },
    { dir: "S", deg: 180, planets: ["Saturn"], tone: "muted" as const, rec: { en: "Structure but restriction — avoid bed here", ru: "Структура, но ограничение — избегайте кровати здесь", hi: "संरचना लेकिन प्रतिबंध — बिस्तर यहां नहीं" } },
    { dir: "SW", deg: 225, planets: [], tone: "muted" as const, rec: { en: "Neutral — grounding", ru: "Нейтрально — заземление", hi: "तटस्थ — आधार" } },
    { dir: "W", deg: 270, planets: ["Mars"], tone: "rose" as const, rec: { en: "Drive but friction — workspace ok, bed no", ru: "Драйв, но трение — рабочее место ок, кровать нет", hi: "ड्राइव लेकिन घर्षण — कार्यस्थल ठीक, बिस्तर नहीं" } },
    { dir: "NW", deg: 315, planets: ["Mercury"], tone: "jade" as const, rec: { en: "Communication, study, commerce", ru: "Общение, учёба, коммерция", hi: "संचार, अध्ययन, वाणिज्य" } },
  ],
  recommendations: {
    bed: { dir: "N / NE", why: { en: "Moon + Jupiter — rest and growth", ru: "Луна + Юпитер — отдых и рост", hi: "चंद्र + गुरु — विश्राम और वृद्धि" } },
    workspace: { dir: "NW", why: { en: "Mercury — communication and study", ru: "Меркурий — общение и учёба", hi: "बुध — संचार और अध्ययन" } },
    door: { dir: "SE / E", why: { en: "Venus — welcome love and beauty", ru: "Венера — приветствуйте любовь и красоту", hi: "शुक्र — प्रेम और सुंदरता का स्वागत" } },
    avoid: { dir: "S / W", why: { en: "Saturn + Mars — restriction and friction", ru: "Сатурн + Марс — ограничение и трение", hi: "शनि + मंगल — प्रतिबंध और घर्षण" } },
    energy: { en: "Balanced with strong Water/Jupiter in the growth quadrant. Channel Mars in the West into structured work, not confrontation.", ru: "Сбалансировано с сильной Водой/Юпитером в квадранте роста. Направьте Марс на Западе в структурированную работу, а не конфронтацию.", hi: "वृद्धि चतुर्थांश में मजबूत जल/गुरु के साथ संतुलित।" },
  },
};

// Compatibility (real 5 categories + aspects)
export const COMPATIBILITY = {
  person1: { name: "Aeliana", sun: "Scorpio", moon: "Pisces", venus: "Libra", mars: "Sagittarius", mercury: "Scorpio" },
  person2: { name: "Kai", sun: "Cancer", moon: "Taurus", venus: "Virgo", mars: "Pisces", mercury: "Cancer" },
  categories: [
    { key: "emotional", name: { en: "Emotional", ru: "Эмоциональная", hi: "भावनात्मक" }, score: 82, tone: "gold" as const, desc: { en: "Sun-Moon cross-resonance — deep mutual understanding", ru: "Перекрёстный резонанс Солнце-Луна — глубокое взаимопонимание", hi: "सूर्य-चंद्र पारस्परिक अनुनाद" } },
    { key: "love", name: { en: "Love", ru: "Любовь", hi: "प्रेम" }, score: 75, tone: "rose" as const, desc: { en: "Venus-Mars dance — magnetic attraction with tension", ru: "Танец Венера-Марс — магнитное притяжение с напряжением", hi: "शुक्र-मंगल नृत्य — चुंबकीय आकर्षण" } },
    { key: "communication", name: { en: "Communication", ru: "Общение", hi: "संचार" }, score: 68, tone: "jade" as const, desc: { en: "Mercury-Mercury — different wavelengths, work to bridge", ru: "Меркурий-Меркурий — разные волны, работайте над мостом", hi: "बुध-बुध — अलग तरंगे" } },
    { key: "physical", name: { en: "Physical", ru: "Физическая", hi: "भौतिक" }, score: 71, tone: "gold" as const, desc: { en: "Mars-Mars — compatible drive with creative friction", ru: "Марс-Марс — совместимый драйв с творческим трением", hi: "मंगल-मंगल — संगत ड्राइव" } },
    { key: "spiritual", name: { en: "Spiritual", ru: "Духовная", hi: "आध्यात्मिक" }, score: 88, tone: "water" as const, desc: { en: "Sun-Sun trine — shared soul orientation", ru: "Солнце-Солнце тригон — общая душевная ориентация", hi: "सूर्य-सूर्य त्रिकोण — साझा आत्मा अभिविन्यास" } },
  ],
  overall: 78,
  level: { en: "Excellent", ru: "Отлично", hi: "उत्कृष्ट" },
  aspects: [
    { p1: "Sun", p2: "Moon", aspect: "trine", orb: 2.1, tone: "jade" as const, type: "harmonious" },
    { p1: "Venus", p2: "Mars", aspect: "opposition", orb: 3.8, tone: "rose" as const, type: "tense" },
    { p1: "Mercury", p2: "Mercury", aspect: "square", orb: 5.2, tone: "rose" as const, type: "tense" },
    { p1: "Sun", p2: "Sun", aspect: "trine", orb: 1.4, tone: "jade" as const, type: "harmonious" },
    { p1: "Mars", p2: "Mars", aspect: "sextile", orb: 4.1, tone: "jade" as const, type: "harmonious" },
    { p1: "Moon", p2: "Venus", aspect: "conjunction", orb: 0.8, tone: "gold" as const, type: "harmonious" },
  ],
  strengths: [
    { en: "Deep emotional attunement — you feel each other before words.", ru: "Глубокая эмоциональная настройка — вы чувствуете друг друга до слов.", hi: "गहरी भावनात्मक सामंजस्य।" },
    { en: "Shared spiritual orientation — aligned values and life direction.", ru: "Общая духовная ориентация — согласованные ценности и направление.", hi: "साझा आध्यात्मिक अभिविन्यास।" },
  ],
  challenges: [
    { en: "Communication on different wavelengths — bridge with patience, not assumption.", ru: "Общение на разных волнах — мостите терпением, не допущениями.", hi: "अलग तरंगों पर संचार — धैर्य से पुल बनाएं।" },
  ],
};

// Family members
export const MEMBERS = [
  { id: "m1", name: "Aeliana", relation: "You", dob: "1989-11-07T04:17", place: "Saint Petersburg, RU", lat: 59.93, lng: 30.34, tz: 3, gender: 0, dayMaster: "壬 Water", topCity: "Lisbon", score: 92 },
  { id: "m2", name: "Kai", relation: "Partner", dob: "1986-07-14T22:30", place: "Oslo, NO", lat: 59.91, lng: 10.75, tz: 2, gender: 1, dayMaster: "丙 Fire", topCity: "Buenos Aires", score: 81 },
  { id: "m3", name: "Lena", relation: "Daughter", dob: "2018-03-22T11:05", place: "Berlin, DE", lat: 52.52, lng: 13.40, tz: 1, gender: 0, dayMaster: "戊 Earth", topCity: "Mexico City", score: 74 },
  { id: "m4", name: "Mother", relation: "Parent", dob: "1962-09-03T08:15", place: "Tbilisi, GE", lat: 41.69, lng: 44.80, tz: 4, gender: 0, dayMaster: "庚 Metal", topCity: "Tbilisi", score: 78 },
];

// I-Ching
export const ICHING_CAST = {
  hexagram: "䷂", number: 3,
  name: { en: "Chun · Difficulty at the Beginning", ru: "Чунь · Трудность в начале", hi: "चुन · शुरुआत में कठिनाई" },
  judgment: {
    en: "Difficulty works success. Through perseverance, the great brings order to the confused. Favorable to install helpers — do not act alone.",
    ru: "Трудность ведёт к успеху. Через упорство великое наводит порядок в запутанном. Благоприятно установить помощников — не действуй один.",
    hi: "कठिनाई सफलता लाती है। धैर्य से, महान भ्रमित को व्यवस्थित करता है। सहायक बनाएं — अकेले न करें।",
  },
  resonance: {
    en: "Your Saturn return transit resonates here. The beginning you fear is not a wall. It is a knot — and knots untie with patient hands, not force.",
    ru: "Ваш транзит возврата Сатурна резонирует здесь. Начало, которого вы боитесь, — не стена. Это узел — а узлы развязываются терпеливыми руками, не силой.",
    hi: "आपका शनि वापसी ट्रांज़िट यहां गूंजता है। जिस शुरुआत से आप डरते हैं वह दीवार नहीं। यह एक गाँठ है।",
  },
  lines: [7, 8, 9, 7, 6, 8], // bottom to top, 6=old yin, 7=young yang, 8=young yin, 9=old yang
  changingLines: [2, 4], // indices of changing lines
};

// Tarot
export const TAROT_DRAW = [
  { name: { en: "The Star", ru: "Звезда", hi: "तारा" }, pos: { en: "Past · what healed you", ru: "Прошлое · что исцелило", hi: "अतीत · क्या चंगा किया" }, tone: "jade" as const, meaning: { en: "Hope restored after crisis. Quiet faith.", ru: "Надежда, восстановленная после кризиса. Тихая вера.", hi: "संकट के बाद बहाल आशा। शांत विश्वास।" } },
  { name: { en: "Queen of Cups", ru: "Королева Кубков", hi: "कपों की रानी" }, pos: { en: "Present · who you are becoming", ru: "Настоящее · кем становишься", hi: "वर्तमान · आप कौन बन रहे हैं" }, tone: "rose" as const, meaning: { en: "Emotional mastery. Depth that holds others.", ru: "Эмоциональное мастерство. Глубина, держащая других.", hi: "भावनात्मक महारत। गहराई जो दूसरों को थामे।" } },
  { name: { en: "Ace of Swords", ru: "Туз Мечей", hi: "तलवारों का इक्का" }, pos: { en: "Forward · the clarity coming", ru: "Вперёд · грядущая ясность", hi: "आगे · आने वाली स्पष्टता" }, tone: "gold" as const, meaning: { en: "A new thought breaks through. Cut through fog.", ru: "Новая мысль прорывается. Разрежьте туман.", hi: "नया विचार सामने आता है। कोहरे को काटें।" } },
];

// Horoscope 5 spheres
export const HOROSCOPE_SPHERES = [
  { key: "career", val: 78, tone: "gold" as const, note: { en: "Mercury ⚹ Saturn — disciplined honesty wins", ru: "Меркурий ⚹ Сатурн — дисциплинированная честность побеждает", hi: "बुध ⚹ शनि — अनुशासित ईमानदारी जीतती है" } },
  { key: "love", val: 86, tone: "rose" as const, note: { en: "Venus ☌ MC — you are seen, warmly", ru: "Венера ☌ MC — вас видят, тепло", hi: "शुक्र ☌ MC — आपको देखा जाता है, गर्मजोशी से" } },
  { key: "health", val: 64, tone: "jade" as const, note: { en: "☽ square Chiron — tend the old wound", ru: "☽ квадрат Хирон — лечите старую рану", hi: "☽ वर्ग चिरोन — पुराना घाव संभालें" } },
  { key: "communication", val: 72, tone: "gold" as const, note: { en: "Mercury direct — say the thing", ru: "Меркурий директный — скажите это", hi: "बुध प्रत्यक्ष — बात कहें" } },
  { key: "finance", val: 70, tone: "jade" as const, note: { en: "Jupiter retrograde — review, don't expand", ru: "Юпитер ретроград — пересмотрите, не расширяйте", hi: "गुरु वक्री — समीक्षा करें, विस्तार न करें" } },
];

export const MENTOR_VOICES = [
  { key: "empowerment", name: "Empowerment", desc: "Warm, supportive, action-oriented", sample: "You have everything you need.", tone: "gold" as const },
  { key: "reflective", name: "Reflective", desc: "Slower, journaling-style", sample: "Let's sit with what's coming up.", tone: "jade" as const },
  { key: "playful", name: "Playful", desc: "Gen-Z friendly, witty", sample: "Saturn's being a lot today, huh?", tone: "rose" as const },
  { key: "pragmatic", name: "Pragmatic", desc: "Direct, no jargon", sample: "Here are 3 concrete steps.", tone: "muted" as const },
];

export const MENTOR_CHAT = [
  { role: "mentor" as const, text: "Good morning, Aeliana. The Moon meets your Sun today — the old story about being 'too much' may surface. I remember you mentioned the conversation with your sister last week. This transit softens the ground for it. Want to prepare what you'd actually like to say?", cites: ["☾ Moon ☌ Scorpio Sun", "Memory · sister · 7 days ago"] },
  { role: "user" as const, text: "Yes. I keep rehearsing it and then freezing. What's actually mine to say?" },
  { role: "mentor" as const, text: "Mercury sextile Saturn rewards disciplined honesty — not accusation, not apology. Three steps: (1) name the pattern you've noticed, not her character; (2) say what you need going forward, concretely; (3) leave room for her response without managing it. The depth you carry isn't a burden here. It's the instrument.", cites: ["☿ Mercury ⚹ Saturn", "Day Master 壬 · Water · depth"] },
];

export const TIERS = [
  { key: "free", name: "Free", price: "$0", cadence: "forever", tagline: "Habit formation & viral surface", tone: "muted" as const, features: ["Daily horoscope (basic, 5 spheres)", "Western natal chart (basic)", "1 astrocartography city score", "AI mentor · 3 messages / day", "1 shareable Power City card", "Daily Horoscope module"], cta: "Current plan", highlight: false },
  { key: "pro", name: "Pro Monthly", price: "$12.99", cadence: "/ month", tagline: "Everything, unlimited — the anchor", tone: "gold" as const, features: ["Everything in Free, plus:", "Unlimited astrocartography cities + travel-mode", "Local Space floor-plan overlay", "BaZi Luck Pillars (大运) + Ten Gods (十神)", "AI mentor · unlimited + 2 a.m. Companion", "I-Ching (64) + Tarot (78) deep modules", "Cosmic Match · unlimited messaging", "Family hub · up to 5 profiles", "All 6 Life Themes + monthly new content", "Pro shareable cards (branded, 4 formats)"], cta: "Start 7-day reverse trial", highlight: true },
  { key: "annual", name: "Pro Annual", price: "$99", cadence: "/ year · save 37%", tagline: "Anti-churn anchor · $8.25/mo", tone: "jade" as const, features: ["Everything in Pro Monthly, plus:", "Locked-in annual pricing", "Solar return reading (birthday month)", "Year-ahead personalized review", "Priority mentor memory recall"], cta: "Go annual, save $57", highlight: false },
  { key: "lifetime", name: "Lifetime", price: "$199", cadence: "one-time · forever", tagline: "For the anti-subscription soul", tone: "rose" as const, features: ["Everything in Pro Annual, forever", "No renewal, no surprise charges", "Founder-tier badge (cosmetic)", "All future v2/v3 modules included"], cta: "Own it forever", highlight: false },
];

export const PPP_SAMPLE = [
  { region: "US / CA / UK / AU", monthly: "$12.99", rails: "Apple IAP · Google Play · Stripe · PayPal" },
  { region: "Western EU", monthly: "€10", rails: "Stripe · PayPal · SEPA" },
  { region: "India", monthly: "₹199 (~$2.40)", rails: "UPI · Razorpay · PhonePe" },
  { region: "LATAM (BR / MX)", monthly: "R$25 / MX$120", rails: "Mercado Pago · PIX · OXXO" },
  { region: "CIS / Russia", monthly: "₽400 (~$4.50)", rails: "YooMoney · QIWI · local cards" },
  { region: "MENA", monthly: "$5–7", rails: "Mada · Fawry · Apple/Google" },
  { region: "SEA", monthly: "$4–6", rails: "GrabPay · GoPay · e-wallets" },
];

export const B2B_EMPLOYEES = [
  { name: "M. Chen", role: "CFO", dayMaster: "Yin Earth 己", element: "Earth", fit: 94, tone: "gold" as const },
  { name: "R. Okafor", role: "Head of Sales", dayMaster: "Yang Fire 丙", element: "Fire", fit: 91, tone: "rose" as const },
  { name: "L. Petrova", role: "Lead Engineer", dayMaster: "Yang Metal 庚", element: "Metal", fit: 88, tone: "jade" as const },
  { name: "S. Yamamoto", role: "Product Lead", dayMaster: "Yang Wood 甲", element: "Wood", fit: 84, tone: "gold" as const },
  { name: "A. Singh", role: "Ops Director", dayMaster: "Yin Metal 辛", element: "Metal", fit: 79, tone: "jade" as const },
  { name: "K. Müller", role: "Strategy", dayMaster: "Yin Water 癸", element: "Water", fit: 90, tone: "water" as const },
];

export const B2B_ROLES = [
  { role: "Finance / Money", ideal: "Earth + Metal", why: "Precision, stability, resource stewardship" },
  { role: "Sales / Client-facing", ideal: "Fire + Water", why: "Communication, persuasion, adaptability" },
  { role: "Strategy / Mgmt", ideal: "Earth + Resource", why: "Long-view, grounded authority" },
  { role: "Creative", ideal: "Wood + Fire", why: "Growth, expression, ignition" },
  { role: "Operations", ideal: "Metal + Earth", why: "Structure, execution, reliability" },
  { role: "Technical", ideal: "Metal + Water", why: "Precision + flow, problem-solving" },
  { role: "Leadership", ideal: "Balance + Authority", why: "Whole-chart strength, commanded presence" },
];

export const DIVINE_MODULES = [
  { key: "horoscope", name: "Daily Horoscope", tier: "Free", desc: "5 spheres · lucky/avoid hours · 11 languages", tone: "gold" as const, icon: "☉" },
  { key: "iching", name: "I-Ching · 64 Hexagrams", tier: "Pro", desc: "Coin / yarrow cast · narrative interpretation · history", tone: "jade" as const, icon: "䷀" },
  { key: "tarot", name: "Tarot · 78 Cards", tier: "Pro", desc: "10 spreads · natal-chart connections · cosmic variant", tone: "rose" as const, icon: "✦" },
];

// 6 Life Themes — monthly content drops, Pro tier. Each theme maps to a natal
// signature and offers a 4-week practice arc. Drives D30 retention (per audit 9-a §3).
export type LifeTheme = {
  key: string;
  icon: string;
  tone: "gold" | "jade" | "rose" | "water";
  name: { en: string; ru: string; hi: string };
  tagline: { en: string; ru: string; hi: string };
  natalSignature: string; // which chart placement this theme activates around
  focusSphere: string; // SPHERES key
  tier: "Free" | "Pro";
  monthLabel: string;
  weeks: { week: number; title: { en: string; ru: string; hi: string }; prompt: { en: string; ru: string; hi: string } }[];
  practice: { en: string; ru: string; hi: string };
  crystal: string;
  affirmation: { en: string; ru: string; hi: string };
};

export const LIFE_THEMES: LifeTheme[] = [
  {
    key: "shadow",
    icon: "☾",
    tone: "water",
    name: { en: "Shadow Work", ru: "Работа с тенью", hi: "छाया कार्य" },
    tagline: {
      en: "Meet the parts of you that hold the most power.",
      ru: "Встретьте части себя, в которых скрыта наибольшая сила.",
      hi: "अपने उन हिस्सों से मिलें जिनमें सबसे अधिक शक्ति है।",
    },
    natalSignature: "Pluto × Moon · Scorpio 8th house",
    focusSphere: "spirit",
    tier: "Pro",
    monthLabel: "June",
    weeks: [
      { week: 1, title: { en: "Naming", ru: "Назвать", hi: "नामकरण" }, prompt: { en: "What feeling do you most often talk yourself out of?", ru: "Какое чувство вы чаще всего отговариваете себя испытывать?", hi: "आप किस भावना को सबसे अधिक नकारते हैं?" } },
      { week: 2, title: { en: "Sitting with", ru: "Побыть с", hi: "साथ बैठना" }, prompt: { en: "Spend 7 minutes with the feeling. Don't fix it.", ru: "Проведите 7 минут с этим чувством. Не чините его.", hi: "7 मिनट उस भावना के साथ बिताएं। ठीक न करें।" } },
      { week: 3, title: { en: "Dialoguing", ru: "Диалог", hi: "संवाद" }, prompt: { en: "Write the feeling a letter. What does it want?", ru: "Напишите чувству письмо. Чего оно хочет?", hi: "भावना को एक पत्र लिखें। वह क्या चाहती है?" } },
      { week: 4, title: { en: "Integrating", ru: "Интеграция", hi: "एकीकरण" }, prompt: { en: "Where will you let this part of you speak next?", ru: "Где вы позволите этой части себя говорить дальше?", hi: "आगे आप इस हिस्से को कहाँ बोलने देंगे?" } },
    ],
    practice: { en: "Nightly 5-minute journal: name one shadow, one gold.", ru: "Ежевечерний 5-минутный журнал: назвать одну тень, одно золото.", hi: "रात्रिक 5-मिनट जर्नल: एक छाया, एक सोना नाम दें।" },
    crystal: "Obsidian",
    affirmation: { en: "I am large enough to hold all of myself.", ru: "Я достаточно большой, чтобы вместить всего себя.", hi: "मैं अपने सभी हिस्सों को धारण करने के लिए पर्याप्त बड़ा हूं।" },
  },
  {
    key: "prosperity",
    icon: "◈",
    tone: "gold",
    name: { en: "Prosperity", ru: "Изобилие", hi: "समृद्धि" },
    tagline: {
      en: "Rewrite your relationship with receiving.",
      ru: "Перепишите свои отношения с принятием.",
      hi: "प्राप्त करने के साथ अपने रिश्ते को फिर से लिखें।",
    },
    natalSignature: "Jupiter × Venus · 2nd house",
    focusSphere: "finance",
    tier: "Pro",
    monthLabel: "July",
    weeks: [
      { week: 1, title: { en: "Scarcity map", ru: "Карта дефицита", hi: "दुर्लभता मानचित्र" }, prompt: { en: "Where did you first learn there wasn't enough?", ru: "Где вы впервые узнали, что недостаточно?", hi: "आपने पहले कहाँ सीखा कि पर्याप्त नहीं है?" } },
      { week: 2, title: { en: "Receiving practice", ru: "Практика принятия", hi: "प्राप्त करने का अभ्यास" }, prompt: { en: "Accept one compliment fully this week. No deflection.", ru: "Примите один комплимент полностью на этой неделе. Без отклонения.", hi: "इस सप्ताह एक प्रशंसा पूरी तरह स्वीकार करें।" } },
      { week: 3, title: { en: "Value audit", ru: "Аудит ценности", hi: "मूल्य ऑडिट" }, prompt: { en: "What do you give away that you'd never sell?", ru: "Что вы отдаёте, чего никогда бы не продали?", hi: "आप क्या देते हैं जिसे आप कभी नहीं बेचेंगे?" } },
      { week: 4, title: { en: "Expansion", ru: "Расширение", hi: "विस्तार" }, prompt: { en: "Name the next number that doesn't scare you.", ru: "Назовите следующую цифру, которая вас не пугает.", hi: "अगला नंबर बताएं जो डराता नहीं है।" } },
    ],
    practice: { en: "Each purchase this month: ask 'does this expand me?'", ru: "Каждая покупка в этом месяце: спросите «это расширяет меня?»", hi: "इस महीने हर खरीद: पूछें 'क्या यह मुझे विस्तार देता है?'" },
    crystal: "Citrine",
    affirmation: { en: "There is room for me at the table of more.", ru: "Для меня есть место за столом большего.", hi: "अधिक की मेज पर मेरे लिए जगह है।" },
  },
  {
    key: "eros",
    icon: "♥",
    tone: "rose",
    name: { en: "Eros & Belonging", ru: "Эрос и принадлежность", hi: "इरोस और अपनेपन" },
    tagline: {
      en: "The art of wanting and being wanted well.",
      ru: "Искусство хотеть и быть желанным правильно.",
      hi: "ठीक से चाहने और चाहे जाने की कला।",
    },
    natalSignature: "Venus × Mars · 5th & 7th house",
    focusSphere: "love",
    tier: "Pro",
    monthLabel: "August",
    weeks: [
      { week: 1, title: { en: "Desire archaeology", ru: "Археология желания", hi: "इच्छा पुरातत्व" }, prompt: { en: "Whose desire did you learn to want through?", ru: "Через чьё желание вы научились хотеть?", hi: "आप किसकी इच्छा से होकर चाहना सीखे?" } },
      { week: 2, title: { en: "The yes-check", ru: "Проверка «да»", hi: "हां-जांच" }, prompt: { en: "Three times this week, pause before yes. Is it yours?", ru: "Трижды на этой неделе пауза перед «да». Оно ваше?", hi: "इस सप्ताह तीन बार हां से पहले रुकें। क्या यह आपका है?" } },
      { week: 3, title: { en: "Receiving eros", ru: "Принятие эроса", hi: "इरोस प्राप्त करना" }, prompt: { en: "Let yourself be looked at without performing.", ru: "Позвольте себе быть увиденным без игры.", hi: "प्रदर्शन के बिना खुद को देखा जाने दें।" } },
      { week: 4, title: { en: "Belonging to self", ru: "Принадлежность себе", hi: "स्वयं से अपनेपन" }, prompt: { en: "Where do you already belong to yourself?", ru: "Где вы уже принадлежите себе?", hi: "आप पहले से कहाँ खुद के हैं?" } },
    ],
    practice: { en: "One honest want spoken daily, to yourself first.", ru: "Одно честное желание вслух ежедневно, сначала себе.", hi: "रोज एक ईमानदार इच्छा, पहले खुद से।" },
    crystal: "Rose quartz",
    affirmation: { en: "I want what I want, and I am wanted as I am.", ru: "Я хочу то, что хочу, и меня хотят таким, какой я есть.", hi: "मैं वही चाहता हूं जो चाहता हूं, और मुझे वैसे ही चाहा जाता है।" },
  },
  {
    key: "vitality",
    icon: "✚",
    tone: "jade",
    name: { en: "Vitality", ru: "Жизненность", hi: "जीवन शक्ति" },
    tagline: {
      en: "Body as instrument, not obstacle.",
      ru: "Тело как инструмент, а не препятствие.",
      hi: "शरीर बाधा नहीं, वाद्य है।",
    },
    natalSignature: "Mars × Sun · 6th house",
    focusSphere: "health",
    tier: "Pro",
    monthLabel: "September",
    weeks: [
      { week: 1, title: { en: "Listening", ru: "Слушание", hi: "सुनना" }, prompt: { en: "What signal has your body been sending that you've muted?", ru: "Какой сигнал тело посылает, а вы заглушили?", hi: "आपका शरीर कौन सा संकेत भेज रहा है जिसे आपने म्यूट किया?" } },
      { week: 2, title: { en: "Movement as dialogue", ru: "Движение как диалог", hi: "संवाद के रूप में गति" }, prompt: { en: "Move in a way your body hasn't in a year.", ru: "Подвигайтесь так, как тело не двигалось год.", hi: "ऐसे चलें जैसे शरीर ने साल से नहीं किया।" } },
      { week: 3, title: { en: "Nourishment", ru: "Питание", hi: "पोषण" }, prompt: { en: "What does 'enough' feel like in your body?", ru: "Как ощущается 'достаточно' в вашем теле?", hi: "आपके शरीर में 'पर्याप्त' कैसा लगता है?" } },
      { week: 4, title: { en: "Rest as practice", ru: "Отдых как практика", hi: "अभ्यास के रूप में विश्राम" }, prompt: { en: "Schedule one rest as sacred as a meeting.", ru: "Запланируйте один отдых таким же священным, как встреча.", hi: "एक विश्राम को बैठक जितना पवित्र निर्धारित करें।" } },
    ],
    practice: { en: "Daily 3-minute body scan: top of head to soles.", ru: "Ежедневное 3-минутное сканирование тела: от макушки до стоп.", hi: "दैनिक 3-मिनट शरीर स्कैन: सिर से तलवों तक।" },
    crystal: "Bloodstone",
    affirmation: { en: "My body is not a problem to solve. It is a home.", ru: "Моё тело — не проблема, которую надо решить. Это дом.", hi: "मेरा शरीर हल करने की समस्या नहीं। यह घर है।" },
  },
  {
    key: "sovereignty",
    icon: "◇",
    tone: "gold",
    name: { en: "Sovereignty", ru: "Суверенитет", hi: "संप्रभुता" },
    tagline: {
      en: "Center yourself without centering away from others.",
      ru: "Верните себе центр, не уходя от других.",
      hi: "दूसरों से दूर जाए बिना खुद को केंद्र में रखें।",
    },
    natalSignature: "Saturn × Ascendant · 1st house",
    focusSphere: "career",
    tier: "Pro",
    monthLabel: "October",
    weeks: [
      { week: 1, title: { en: "Boundaries audit", ru: "Аудит границ", hi: "सीमा ऑडिट" }, prompt: { en: "Whose emergency has become your rhythm?", ru: "Чья тревога стала вашим ритмом?", hi: "किसकी आपातकाल आपकी लय बन गई?" } },
      { week: 2, title: { en: "The clean no", ru: "Чистое нет", hi: "स्वच्छ ना" }, prompt: { en: "Practice one no this week without an excuse attached.", ru: "Потренируйте одно нет на этой неделе без оправдания.", hi: "इस सप्ताह बिना बहाने एक ना अभ्यास करें।" } },
      { week: 3, title: { en: "Authority", ru: "Авторитет", hi: "प्राधिकार" }, prompt: { en: "Where have you outsourced your knowing?", ru: "Куда вы делегировали своё знание?", hi: "आपने अपनी जानकारी कहाँ आउटसोर्स की?" } },
      { week: 4, title: { en: "Devotion", ru: "Преданность", hi: "समर्पण" }, prompt: { en: "What is worth your devotion this season?", ru: "Чего стоит ваша преданность в этом сезоне?", hi: "इस मौसम में आपका समर्पण किसके लायक है?" } },
    ],
    practice: { en: "Morning: name one thing that is yours to decide today.", ru: "Утром: назвать одну вещь, которую сегодня решать вам.", hi: "सुबह: एक चीज़ नाम लें जिसे आज आप तय करेंगे।" },
    crystal: "Tiger's eye",
    affirmation: { en: "I am the authority on my own life.", ru: "Я — авторитет в своей собственной жизни.", hi: "मैं अपनी जीवन पर स्वयं अधिकारी हूं।" },
  },
  {
    key: "devotion",
    icon: "❋",
    tone: "jade",
    name: { en: "Devotion & Creative Flow", ru: "Преданность и творческий поток", hi: "समर्पण और रचनात्मक प्रवाह" },
    tagline: {
      en: "Make what only you can make.",
      ru: "Создайте то, что можете создать только вы.",
      hi: "वह बनाएं जो केवल आप बना सकते हैं।",
    },
    natalSignature: "Neptune × Mercury · 5th & 12th house",
    focusSphere: "create",
    tier: "Pro",
    monthLabel: "November",
    weeks: [
      { week: 1, title: { en: "Beginner's return", ru: "Возвращение новичка", hi: "नौसिखिया वापसी" }, prompt: { en: "Make something badly this week. On purpose.", ru: "На этой неделе сделайте что-нибудь плохо. Специально.", hi: "इस सप्ताह कुछ बुरा बनाएं। जानबूझकर।" } },
      { week: 2, title: { en: "The devotional object", ru: "Объект преданности", hi: "समर्पण की वस्तु" }, prompt: { en: "Choose one practice to devote 20 minutes daily.", ru: "Выберите одну практику для 20 минут ежедневно.", hi: "एक अभ्यास चुनें, रोज 20 मिनट समर्पित करें।" } },
      { week: 3, title: { en: "Resistance meeting", ru: "Встреча с сопротивлением", hi: "प्रतिरोध से मुलाकात" }, prompt: { en: "The resistance is the map. Walk toward it slowly.", ru: "Сопротивление — это карта. Идите к нему медленно.", hi: "प्रतिरोध ही मानचित्र है। धीरे-धीरे उसकी ओर चलें।" } },
      { week: 4, title: { en: "Sharing", ru: "Делиться", hi: "साझा करना" }, prompt: { en: "Show one thing you made to one person who matters.", ru: "Покажите одну вещь, которую сделали, одному важному человеку.", hi: "एक बनाई हुई चीज़ एक महत्वपूर्ण व्यक्ति को दिखाएं।" } },
    ],
    practice: { en: "20-minute daily devotional block, same time, same place.", ru: "20-минутный ежедневный блок преданности, в то же время, в том же месте.", hi: "20-मिनट दैनिक समर्पण ब्लॉक, एक ही समय, एक ही स्थान।" },
    crystal: "Lapis lazuli",
    affirmation: { en: "What moves through me is needed. I let it through.", ru: "То, что движется через меня, нужно. Я позволяю этому течь.", hi: "मुझसे जो गुजरता है वह जरूरी है। मैं इसे जाने देता हूं।" },
  },
];

export const NAV_ITEMS: { key: ScreenKey; label: string; icon: string; group: "journey" | "growth" | "account"; }[] = [
  { key: "overview", label: "nav.overview", icon: "◎", group: "journey" },
  { key: "reveal", label: "nav.reveal", icon: "✧", group: "journey" },
  { key: "today", label: "nav.today", icon: "☉", group: "journey" },
  { key: "self", label: "nav.self", icon: "✦", group: "journey" },
  { key: "astro-travel", label: "nav.astroTravel", icon: "⊕", group: "journey" },
  { key: "bazi-report", label: "nav.baziReport", icon: "經", group: "journey" },
  { key: "mentor", label: "nav.mentor", icon: "✦", group: "journey" },
  { key: "divine", label: "nav.divine", icon: "☯", group: "journey" },
  { key: "connect", label: "nav.connect", icon: "♡", group: "journey" },
  { key: "themes", label: "nav.themes", icon: "❋", group: "journey" },
  { key: "members", label: "nav.members", icon: "⌂", group: "account" },
  { key: "profile", label: "nav.profile", icon: "◉", group: "account" },
  { key: "upgrade", label: "nav.upgrade", icon: "◈", group: "growth" },
  { key: "business", label: "nav.business", icon: "⬡", group: "growth" },
  { key: "auth", label: "nav.auth", icon: "⎆", group: "growth" },
];

export const PROPOSAL_SHIFTS = [
  { n: "1", title: "Re-architected IA", change: "Narrative user journey (Reveal → Today → Self → World → Mentor → Divine → Connect → Members → Upgrade → Business)", why: "User understands value in 90 seconds" },
  { n: "2", title: "90-second Reveal", change: "Cinematic onboarding activation as first-class flow", why: "Activation → 70% (vs industry 45–55%)" },
  { n: "3", title: "2 a.m. Companion", change: "Retention hook #1 as first-class mode (dim/warm UI, soft voice, memory recall) — not a toggle", why: "D30 retention 20% → 28%" },
  { n: "4", title: "Viral AstroCart Card", change: "Growth loop #1 as first-class object + /r/{cardId} reveal page", why: "Viral k → 1.0 by M18" },
  { n: "5", title: "Trust-first monetization", change: "Free / Pro $12.99 / Annual $99 / Lifetime $199 + PPP + 7-day reverse trial. Removed manipulative Weekly $9.", why: "Anti-Nebula, Free→Paid 8%, App Store 4.5+" },
  { n: "6", title: "Gentle streaks + WARD", change: "No-shame RitualStars + WARD north star + AI memory (stable persona)", why: "WARD 25% → 35%, churn <6%" },
  { n: "7", title: "B2B HR as separate line", change: "White-space product (no competitor exists). Org chart + heatmap + hiring funnel + ethics panel.", why: "Path to $160M ARR" },
  { n: "8", title: "Data-density + warm design", change: "GitHub project's data-density (multi-panel workbench, 44 lines, 84 weights, narrative, radar) fused with warm cosmic palette", why: "Customer likes data density + warm design — best of both" },
  { n: "9", title: "3-language i18n (RU/EN/HI)", change: "Cultural adaptation (not just translation). HI: Vedic phrasing, panchang/nakshatra. RU: calm voice. EN: Western primary.", why: "India CAGR 49% — fastest market. RU first-class." },
];

// $160M ARR / 12M MAU trajectory
export const TRAJECTORY = [
  { phase: "Year 1", mau: "500K", arr: "$2M", ward: "25%", k: "0.55", cac: "$7", ltv: "$80" },
  { phase: "Year 2", mau: "3M", arr: "$15M", ward: "35%", k: "1.05", cac: "$5", ltv: "$150" },
  { phase: "Year 3", mau: "6M", arr: "$48M", ward: "38%", k: "1.20", cac: "$4.5", ltv: "$180" },
  { phase: "Year 4", mau: "9M", arr: "$96M", ward: "40%", k: "1.30", cac: "$4", ltv: "$210" },
  { phase: "Year 5", mau: "12M", arr: "$160M", ward: "42%", k: "1.40", cac: "$3.5", ltv: "$240" },
];

export function localized(locale: Locale, field: { en: string; ru: string; hi: string }): string {
  return field[locale] ?? field.en;
}
