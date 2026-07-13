/**
 * DrawTarot — use case: вытягивание карт Таро (1, 3, или 10 карт Celtic Cross).
 * Честный crypto-random shuffle + draw.
 */
import { TAROT_DECK, type TarotSpread, type TarotDrawResult, type TarotCard } from "../../domain/entities/TarotDeck";

const SPREAD_CARD_COUNT: Record<TarotSpread, number> = {
  single: 1,
  three: 3,
  celtic: 10,
};

const SPREAD_POSITIONS: Record<TarotSpread, string[]> = {
  single: ["Present"],
  three: ["Past", "Present", "Future"],
  celtic: [
    "Present", "Challenge", "Foundation", "Recent Past", "Possible Outcome",
    "Near Future", "Self", "Environment", "Hopes & Fears", "Final Outcome",
  ],
};

export class DrawTarot {
  execute(spread: TarotSpread = "three"): TarotDrawResult {
    const count = SPREAD_CARD_COUNT[spread];
    const positions = SPREAD_POSITIONS[spread];

    // Fisher-Yates shuffle с crypto-random
    const shuffled = [...TAROT_DECK];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      const j = buf[0] % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const drawn: Array<{ card: TarotCard; reversed: boolean; position: string }> = [];
    for (let i = 0; i < count; i++) {
      const card = shuffled[i];
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      const reversed = buf[0] % 2 === 1;
      drawn.push({ card, reversed, position: positions[i] ?? `Position ${i + 1}` });
    }

    return { spread, cards: drawn };
  }
}
