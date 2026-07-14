/**
 * TarotDeck — 78 карт Райдера-Уэйта-Смита (22 Major + 56 Minor Arcana).
 * Clean Architecture: domain entity, чистый TS.
 */
export type Arcana = "major" | "minor";
export type Suit = "wands" | "cups" | "swords" | "pentacles" | null;
export type CourtRank = "page" | "knight" | "queen" | "king" | null;

export interface TarotCard {
  id: number; // 0..77
  name: string;
  nameRu: string;
  arcana: Arcana;
  suit: Suit;
  rank: number | CourtRank; // 1..14 для minor, 0..21 для major
  keywordsUpright: string[];
  keywordsReversed: string[];
  element: "Fire" | "Water" | "Air" | "Earth" | "Spirit";
}

const MAJOR_ARCANA: Array<{ name: string; nameRu: string; keywords: string[] }> = [
  { name: "The Fool", nameRu: "Шут", keywords: ["new beginnings", "innocence", "spontaneity", "free spirit"] },
  { name: "The Magician", nameRu: "Маг", keywords: ["manifestation", "willpower", "skill", "creation"] },
  { name: "The High Priestess", nameRu: "Верховная Жрица", keywords: ["intuition", "mystery", "subconscious", "inner voice"] },
  { name: "The Empress", nameRu: "Императрица", keywords: ["abundance", "nurturing", "fertility", "nature"] },
  { name: "The Emperor", nameRu: "Император", keywords: ["authority", "structure", "control", "fatherhood"] },
  { name: "The Hierophant", nameRu: "Иерофант", keywords: ["tradition", "spiritual wisdom", "conformity", "teaching"] },
  { name: "The Lovers", nameRu: "Влюблённые", keywords: ["love", "harmony", "choices", "alignment"] },
  { name: "The Chariot", nameRu: "Колесница", keywords: ["determination", "willpower", "victory", "control"] },
  { name: "Strength", nameRu: "Сила", keywords: ["courage", "inner strength", "patience", "compassion"] },
  { name: "The Hermit", nameRu: "Отшельник", keywords: ["introspection", "solitude", "inner guidance", "philosophy"] },
  { name: "Wheel of Fortune", nameRu: "Колесо Фортуны", keywords: ["change", "cycles", "destiny", "turning point"] },
  { name: "Justice", nameRu: "Справедливость", keywords: ["fairness", "truth", "cause and effect", "law"] },
  { name: "The Hanged Man", nameRu: "Повешенный", keywords: ["surrender", "letting go", "new perspective", "sacrifice"] },
  { name: "Death", nameRu: "Смерть", keywords: ["transformation", "endings", "transition", "release"] },
  { name: "Temperance", nameRu: "Умеренность", keywords: ["balance", "moderation", "patience", "harmony"] },
  { name: "The Devil", nameRu: "Дьявол", keywords: ["bondage", "addiction", "materialism", "attachment"] },
  { name: "The Tower", nameRu: "Башня", keywords: ["sudden change", "upheaval", "chaos", "revelation"] },
  { name: "The Star", nameRu: "Звезда", keywords: ["hope", "renewal", "inspiration", "serenity"] },
  { name: "The Moon", nameRu: "Луна", keywords: ["illusion", "fear", "subconscious", "intuition"] },
  { name: "The Sun", nameRu: "Солнце", keywords: ["joy", "success", "positivity", "vitality"] },
  { name: "Judgement", nameRu: "Суд", keywords: ["rebirth", "awakening", "renewal", "absolution"] },
  { name: "The World", nameRu: "Мир", keywords: ["completion", "achievement", "fulfillment", "wholeness"] },
];

const SUITS: Array<{ suit: "wands" | "cups" | "swords" | "pentacles"; element: "Fire" | "Water" | "Air" | "Earth"; nameRu: string }> = [
  { suit: "wands", element: "Fire", nameRu: "Жезлы" },
  { suit: "cups", element: "Water", nameRu: "Кубки" },
  { suit: "swords", element: "Air", nameRu: "Мечи" },
  { suit: "pentacles", element: "Earth", nameRu: "Пентакли" },
];

const RANK_NAMES: Array<{ rank: number; name: string; nameRu: string }> = [
  { rank: 1, name: "Ace", nameRu: "Туз" },
  { rank: 2, name: "Two", nameRu: "Двойка" },
  { rank: 3, name: "Three", nameRu: "Тройка" },
  { rank: 4, name: "Four", nameRu: "Четвёрка" },
  { rank: 5, name: "Five", nameRu: "Пятёрка" },
  { rank: 6, name: "Six", nameRu: "Шестёрка" },
  { rank: 7, name: "Seven", nameRu: "Семёрка" },
  { rank: 8, name: "Eight", nameRu: "Восьмёрка" },
  { rank: 9, name: "Nine", nameRu: "Девятка" },
  { rank: 10, name: "Ten", nameRu: "Десятка" },
];

const COURT_CARDS: Array<{ rank: "page" | "knight" | "queen" | "king"; name: string; nameRu: string }> = [
  { rank: "page", name: "Page", nameRu: "Паж" },
  { rank: "knight", name: "Knight", nameRu: "Рыцарь" },
  { rank: "queen", name: "Queen", nameRu: "Королева" },
  { rank: "king", name: "King", nameRu: "Король" },
];

function buildDeck(): TarotCard[] {
  const deck: TarotCard[] = [];
  let id = 0;

  // Major Arcana (0..21)
  for (let i = 0; i < MAJOR_ARCANA.length; i++) {
    const m = MAJOR_ARCANA[i];
    deck.push({
      id: id++,
      name: m.name,
      nameRu: m.nameRu,
      arcana: "major",
      suit: null,
      rank: i,
      keywordsUpright: m.keywords,
      keywordsReversed: m.keywords.map((k) => `blocked ${k}`),
      element: "Spirit",
    });
  }

  // Minor Arcana (22..77) — 4 suits × 14 cards
  for (const s of SUITS) {
    for (const r of RANK_NAMES) {
      deck.push({
        id: id++,
        name: `${r.name} of ${s.suit.charAt(0).toUpperCase() + s.suit.slice(1)}`,
        nameRu: `${r.nameRu} ${s.nameRu}`,
        arcana: "minor",
        suit: s.suit,
        rank: r.rank,
        keywordsUpright: suitKeywords(s.suit, r.rank),
        keywordsReversed: suitKeywords(s.suit, r.rank).map((k) => `blocked ${k}`),
        element: s.element,
      });
    }
    for (const c of COURT_CARDS) {
      deck.push({
        id: id++,
        name: `${c.name} of ${s.suit.charAt(0).toUpperCase() + s.suit.slice(1)}`,
        nameRu: `${c.nameRu} ${s.nameRu}`,
        arcana: "minor",
        suit: s.suit,
        rank: c.rank,
        keywordsUpright: courtKeywords(s.suit, c.rank),
        keywordsReversed: courtKeywords(s.suit, c.rank).map((k) => `shadow ${k}`),
        element: s.element,
      });
    }
  }

  return deck;
}

function suitKeywords(suit: string, rank: number): string[] {
  const themes: Record<string, string[]> = {
    wands: ["passion", "energy", "action", "ambition"],
    cups: ["emotion", "love", "intuition", "relationships"],
    swords: ["intellect", "truth", "conflict", "clarity"],
    pentacles: ["material", "work", "money", "body"],
  };
  const t = themes[suit] ?? ["unknown"];
  if (rank === 1) return [`new ${t[0]}`, `beginning ${t[1]}`];
  if (rank === 10) return [`completion ${t[0]}`, `fullness ${t[1]}`];
  return [`${t[0]} ${rank}`, `${t[1]} stage`];
}

function courtKeywords(suit: string, rank: string): string[] {
  const rankThemes: Record<string, string> = {
    page: "learning", knight: "questing", queen: "embodying", king: "mastering",
  };
  const suitThemes: Record<string, string> = {
    wands: "passion", cups: "emotion", swords: "intellect", pentacles: "material",
  };
  return [`${rankThemes[rank]} ${suitThemes[suit]}`];
}

export const TAROT_DECK: TarotCard[] = buildDeck();

export type TarotSpread = "single" | "three" | "celtic";

export interface TarotDrawResult {
  spread: TarotSpread;
  cards: Array<{ card: TarotCard; reversed: boolean; position: string }>;
}

const SPREAD_POSITIONS: Record<TarotSpread, string[]> = {
  single: ["Present"],
  three: ["Past", "Present", "Future"],
  celtic: [
    "Present", "Challenge", "Foundation", "Recent Past", "Possible Outcome",
    "Near Future", "Self", "Environment", "Hopes & Fears", "Final Outcome",
  ],
};
