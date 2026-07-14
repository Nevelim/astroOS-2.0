"""Tarot Major Arcana — rich upright + reversed sentence interpretations.

Goes beyond the 2-3 keyword summaries in tarot.py to provide full-sentence
meanings for each of the 22 Major Arcana cards, both upright and reversed.
Sourced from the Rider-Waite-Smith tradition as interpreted by standard
modern references (Biddy Tarot, Labyrinthos). These power richer divination
readings — the API can return a meaningful interpretation alongside keywords.

Each entry is keyed by the card id (0..21) and provides:
  - upright: a 1-2 sentence meaning when the card is drawn upright
  - reversed: the meaning when drawn inverted (NOT just "blocked X")
"""
from __future__ import annotations


# id → (upright_meaning, reversed_meaning)
MAJOR_INTERPRETATIONS: dict[int, tuple[str, str]] = {
    0: (  # The Fool
        "A leap of faith and a fresh beginning. You stand at the threshold of a "
        "new journey, guided by innocence and openness to possibility.",
        "Recklessness or a leap taken without looking. There is a warning here "
        "against impulsiveness — pause and consider the ground beneath you."),
    1: (  # The Magician
        "You have all the tools you need to manifest your will. This is a card of "
        "resourcefulness, focused intention, and the power to bring ideas into form.",
        "Manipulation, deception, or talents going untapped. Power is being "
        "misused or squandered — realign your intentions with integrity."),
    2: (  # The High Priestess
        "Listen to your intuition; the answers lie within. This is a time of "
        "stillness, mystery, and accessing the deeper wisdom beneath the surface.",
        "A disconnection from your inner voice, or secrets being kept. You may "
        "be ignoring your intuition or withholding something from yourself."),
    3: (  # The Empress
        "Abundance, creativity, and nurturing energy surround you. This is a "
        "fertile time for growth, connection, and expressing your creative nature.",
        "A creative block, smothering dependence, or neglect of self-care. "
        "Reconnect with what nourishes you — body, heart, and creative spirit."),
    4: (  # The Emperor
        "Structure, authority, and steady leadership prevail. Through discipline "
        "and clear boundaries, you build something that endures.",
        "Rigidity, domination, or excessive control — of yourself or others. "
        "Loosen the grip; flexibility is strength too."),
    5: (  # The Hierophant
        "Tradition, guidance, and spiritual teaching offer a framework. You may "
        "find meaning within an established system or through a mentor.",
        "Rebellion against convention, or dogmatic rigidity. Question whether the "
        "rules you follow still serve your truth."),
    6: (  # The Lovers
        "A meaningful choice, often of the heart — alignment, union, and values "
        "that resonate. Commitment and deep connection are at hand.",
        "Disharmony, a values conflict, or a difficult choice in relationship. "
        "Realign with what you truly value before deciding."),
    7: (  # The Chariot
        "Victory through determined will and focused control. You harness opposing "
        "forces and drive forward — success is earned through discipline.",
        "A loss of direction, scattered energy, or aggression without aim. "
        "Reconnect with your goal and channel your drive deliberately."),
    8: (  # Strength
        "Inner fortitude and gentle courage. You meet challenges not with force "
        "but with patience, compassion, and quiet confidence.",
        "Self-doubt, suppressed anger, or a lack of confidence. The strength you "
        "seek is already within — trust it and act."),
    9: (  # The Hermit
        "A time of introspection and solitary seeking. Withdraw to find your inner "
        "light; the guidance you need comes from within.",
        "Isolation, loneliness, or withdrawal from needed connection. Seek the "
        "balance between solitude and community."),
    10: (  # Wheel of Fortune
        "A turning point — cycles shift in your favor. Change is afoot; what was "
        "down rises. Align with the flow rather than resisting it.",
        "A run of bad luck or a sense of powerlessness against change. Remember "
        "that all wheels turn — this phase too shall pass."),
    11: (  # Justice
        "Truth, fairness, and accountability. Decisions made now carry weight; "
        "act with integrity and the scales balance in your favor.",
        "Injustice, dishonesty, or avoidance of responsibility. Face the "
        "consequences of your actions with honesty."),
    12: (  # The Hanged Man
        "A voluntary pause that brings new perspective. By surrendering control "
        "and seeing things differently, insight emerges.",
        "Stagnation, indecision, or resisting the needed sacrifice. Sometimes "
        "letting go is the only way forward."),
    13:  # Death
    ("An ending that clears space for rebirth. A chapter closes — not to destroy, "
     "but to transform. Release what no longer serves; renewal follows.",
     "Resistance to necessary change, or a transformation stalled. The old must "
     "be released before the new can begin."),
    14: (  # Temperance
        "Balance, moderation, and the blending of opposites. Patience and "
        "harmony lead to a steady, healing flow.",
        "Excess, imbalance, or impatience. Recenter — extremes will not serve "
        "you now."),
    15: (  # The Devil
        "Attachment, bondage, or being chained to what diminishes you — material "
        "excess, addiction, or toxic ties. Recognize the chains; they are "
        "self-forged.",
        "Reclaiming freedom from what bound you. The chains loosen as you "
        "confront the shadow and choose liberation."),
    16: (  # The Tower
        "Sudden upheaval that reveals truth. A false structure crumbles — "
        "shocking, but necessary. What remains is real and can be rebuilt.",
        "Averting disaster, or resisting the necessary collapse. The change you "
        "fear may be the liberation you need."),
    17: (  # The Star
        "Hope, inspiration, and renewal after the storm. You are guided; trust "
        "the light ahead and allow yourself to heal.",
        "Despair, disconnection from hope, or feeling lost. Reconnect with the "
        "faith that carried you before."),
    18: (  # The Moon
        "Illusion, uncertainty, and the realm of the unconscious. Not all is as "
        "it seems; navigate by intuition and face what hides in shadow.",
        "Confusion lifting, or deception revealed. As the fog clears, trust "
        "returns and the path becomes visible."),
    19: (  # The Sun
        "Joy, vitality, and radiant success. This is a card of warmth, clarity, "
        "and positivity — celebrate and shine.",
        "Temporary gloom or delayed joy. The sun is only behind a cloud; its "
        "warmth will return."),
    20: (  # Judgement
        "A reckoning and rebirth. You are called to rise, having integrated the "
        "lessons of the past. Forgive, release, and step into renewal.",
        "Self-criticism, avoidance of reckoning, or refusing the call to grow. "
        "Face the assessment honestly — it leads to freedom."),
    21: (  # The World
        "Completion, fulfillment, and wholeness. A cycle reaches its triumphant "
        "end; you have integrated the journey and stand ready for the next.",
        "Incompletion, or a loose end holding back closure. Identify what "
        "remains and bring it to resolution."),
}


def interpretation_for(card_id: int) -> tuple[str, str]:
    """Return (upright_meaning, reversed_meaning) for a card.

    For Major Arcana (id 0-21), returns the rich interpretation. For Minor
    Arcana (id 22+), returns empty strings — those use the keyword system.
    """
    return MAJOR_INTERPRETATIONS.get(card_id, ("", ""))
