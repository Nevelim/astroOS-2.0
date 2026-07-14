"""Tarot upright + reversed sentence interpretations — full 78-card deck.

Goes beyond the 2-3 keyword summaries in tarot.py to provide full-sentence
meanings for each card, both upright and reversed. Sourced from the
Rider-Waite-Smith tradition as interpreted by standard modern references
(Biddy Tarot, Labyrinthos). These power richer divination readings — the
API can return a meaningful interpretation alongside keywords.

Two dictionaries, each keyed by card id and providing:
  - upright: a 1-2 sentence meaning when the card is drawn upright
  - reversed: the meaning when drawn inverted (NOT just "blocked X")

  - MAJOR_INTERPRETATIONS: ids 0..21 (the 22 Major Arcana)
  - MINOR_INTERPRETATIONS: ids 22..77 (the 56 Minor Arcana — 4 suits of 14)
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


# --------------------------------------------------------------------------- #
# Minor Arcana (56 cards) — upright + reversed meanings, Rider-Waite-Smith.
#
# ids 22-35  Wands   (Fire)  — passion, energy, action, creativity
# ids 36-49  Cups    (Water) — emotion, love, intuition, relationships
# ids 50-63  Swords  (Air)   — intellect, conflict, communication, truth
# ids 64-77  Pentacles(Earth)— resources, stability, work, manifestation
#
# Within each suit: Ace..Ten (ranks 1-10) then Page, Knight, Queen, King
# (ranks 11-14). Reversed meanings are genuine inversions, not "blocked X".
# --------------------------------------------------------------------------- #
MINOR_INTERPRETATIONS: dict[int, tuple[str, str]] = {
    # --- Wands (Fire) — ids 22-35 --- #
    22: (  # Ace of Wands
        "A spark of inspiration and the birth of a passionate new venture. "
        "Creative fire is lit — seize the moment and act on your enthusiasm.",
        "Delays, dashed inspiration, or creative fire that won't catch. The "
        "spark fades without follow-through — find what reignites your drive."),
    23: (  # Two of Wands
        "You stand at the threshold, planning a future beyond the horizon. "
        "Vision meets choice as you weigh the path ahead and commit.",
        "Fear of the unknown keeps you playing small or stuck in planning. "
        "The map is drawn but you hesitate to set sail — step forward."),
    24: (  # Three of Wands
        "Your ships are launched and your efforts begin to bear fruit. "
        "Foresight and patience pay off as expansion unfolds ahead.",
        "Ventures stall or returns fall short of what you imagined. "
        "Regroup and reassess before sending more ships to sea."),
    25: (  # Four of Wands
        "Celebration, harmony, and a joyful homecoming. A milestone is reached "
        "and shared with community — pause to honor stability and belonging.",
        "Instability at home or a celebration that rings hollow. Tend the "
        "foundations of belonging before the festivities can truly land."),
    26: (  # Five of Wands
        "Competition and clashing viewpoints stir productive friction. Through "
        "healthy conflict, sharper ideas and stronger resolve are forged.",
        "Conflict that grinds down rather than sharpens, or avoiding necessary "
        "friction. Seek common ground instead of needless strife."),
    27: (  # Six of Wands
        "Victory and public recognition arrive; your efforts are honored. "
        "Lead with confidence and humility as success lifts you up.",
        "Recognition withheld, or ego inflated past its earned reward. "
        "Reconnect achievement with substance rather than chasing applause."),
    28: (  # Seven of Wands
        "You hold your ground against competing pressures, defending a hard-won "
        "position. Hold the line with courage and conviction.",
        "Overwhelmed and yielding ground, or fighting battles not worth winning. "
        "Conserve your energy for the challenges that truly matter."),
    29: (  # Eight of Wands
        "Swift movement and sudden momentum carry events forward. News, travel, "
        "or communication accelerates — act quickly while the channel is open.",
        "Friction, delays, or misfired communication slows your progress. "
        "Check your aim and resend the message clearly."),
    30: (  # Nine of Wands
        "Battle-worn but unbowed, you stand ready for the final test. "
        "Your resilience has carried you far — persevere just a little longer.",
        "Defensiveness, exhaustion, or paranoia from old wounds. Lower the "
        "guard where it no longer serves and let yourself rest."),
    31: (  # Ten of Wands
        "You carry a heavy load of responsibilities, near your limit. "
        "Completion is close, but the burden demands you delegate or release.",
        "Releasing the burden, or taking on obligations you cannot sustain. "
        "Lighten the load — some weights were never yours to carry."),
    32: (  # Page of Wands
        "An eager explorer with a free spirit and a message of possibility. "
        "Curiosity and wanderlust beckon you toward a creative adventure.",
        "Restlessness without direction, or enthusiasm that flames out fast. "
        "Channel the spark into commitment rather than scattering it."),
    33: (  # Knight of Wands
        "A bold adventurer charges forward on a passionate quest. Energy, "
        "charisma, and daring propel you into action — ride the impulse.",
        "Impulsiveness, bravado, or a charge that scatters into recklessness. "
        "Rein in the stallion before it bolts past the goal."),
    34: (  # Queen of Wands
        "A radiant, confident presence who leads with warmth and magnetism. "
        "Self-assured vitality draws others in — shine and inspire.",
        "Insecurity masked as vanity, or a need for attention that dominates "
        "the room. Reclaim your warmth from its shadow."),
    35: (  # King of Wands
        "A visionary leader who commands with charisma and bold clarity. "
        "You hold the fire of purpose and rally others toward a grand aim.",
        "Tyranny, arrogance, or vision turned to self-serving control. Temper "
        "command with humility or your court will turn away."),

    # --- Cups (Water) — ids 36-49 --- #
    36: (  # Ace of Cups
        "The heart overflows with new love, compassion, and emotional awakening. "
        "A wellspring of feeling opens — receive it with openness.",
        "Emotional blockage, repressed feeling, or love that drains away. "
        "Open the cup that has been sealed against its own flow."),
    37: (  # Two of Cups
        "A deep mutual attraction and partnership of heart and spirit. "
        "Two meet as equals — in love, friendship, or sacred union.",
        "Imbalance, broken trust, or a union strained by misunderstanding. "
        "Tend the bond where the flow between you has dried up."),
    38: (  # Three of Cups
        "Friendship and joyful celebration among kindred spirits. Raise a glass "
        "with your circle — shared happiness multiplies the blessing.",
        "Overindulgence, gossip, or a friendship fractured by rivalry. "
        "Sober up the bond and clear the air between friends."),
    39: (  # Four of Cups
        "Apathy and quiet discontent, blind to the gift being offered. "
        "Reevaluate what truly satisfies before a chance slips away.",
        "A welcome shift out of apathy, or seizing the cup once ignored. "
        "Curiosity returns — reach for what you had pushed aside."),
    40: (  # Five of Cups
        "Grief over what is lost, even as something remains. Honor the sorrow, "
        "then turn toward the cups still standing and unwept for.",
        "Acceptance and moving past regret toward what endures. The loss "
        "softens as you recognize what was never truly gone."),
    41: (  # Six of Cups
        "Nostalgia, innocence, and the warmth of childhood memories. "
        "Reconnect with simple joys and the kindness of your roots.",
        "Stuck in the past or romanticizing what was over what is. "
        "Carry the memory forward without living inside it."),
    42: (  # Seven of Cups
        "A dazzling array of choices and fantasies beckons. Options multiply, "
        "but discern which visions are real and which are mirage.",
        "Clarity cutting through illusion, or paralysis before too many paths. "
        "Choose one cup and commit rather than chasing every shimmer."),
    43: (  # Eight of Cups
        "You walk away from what no longer fulfills, seeking deeper meaning. "
        "Leaving takes courage, but emotional truth calls you onward.",
        "Fear of leaving, or wandering without finding what you sought. "
        "Reconsider what you abandoned before searching any further."),
    44: (  # Nine of Cups
        "Contentment and emotional fulfillment — your wish is granted. "
        "Savor the satisfaction of desires met and a heart well-tended.",
        "Smug self-indulgence, or a wish fulfilled that leaves you empty. "
        "Check whether what you wanted is what you truly needed."),
    45: (  # Ten of Cups
        "Lasting happiness, family harmony, and emotional alignment. "
        "Joy radiates through connection — love is the true home you sought.",
        "Broken harmony, fractured family, or ideals that clash with reality. "
        "Mend the bonds where love has worn thin."),
    46: (  # Page of Cups
        "A gentle dreamer bearing an intuitive message or creative nudge. "
        "Stay open to wonder — feeling and imagination guide you now.",
        "Emotional immaturity or escapism dressed up as sensitivity. Ground "
        "the daydream before it carries you away."),
    47: (  # Knight of Cups
        "A romantic idealist arrives with charm, art, and an offer of the heart. "
        "Grace and imagination move you — follow what inspires.",
        "Moody unreliability, or charm that promises more than it delivers. "
        "Look past the poetry to the substance beneath."),
    48: (  # Queen of Cups
        "A compassionate, receptive heart that feels deeply yet stays secure. "
        "Tend emotions with grace — yours and others' — without drowning.",
        "Emotional overwhelm or co-dependency that loses itself in others. "
        "Find your center before pouring from an empty cup."),
    49: (  # King of Cups
        "Calm emotional mastery balanced with diplomacy and deep feeling. "
        "You hold the waves steady — lead with compassion and composure.",
        "Moodiness silently boiling under a calm surface, or manipulation "
        "through emotion. Surface what you have been hiding from yourself."),

    # --- Swords (Air) — ids 50-63 --- #
    50: (  # Ace of Swords
        "A flash of clarity and a breakthrough of pure mental force. Truth "
        "cuts through confusion — now act with sharp, decisive intent.",
        "Clouded thinking, confusion, or a truth distorted by bias. "
        "Clear the fog before the blade can cut cleanly."),
    51: (  # Two of Swords
        "A difficult stalemate between two choices, eyes bound against the truth. "
        "You cannot avoid deciding — remove the blindfold and weigh it honestly.",
        "A welcome release from indecision, or information that breaks the "
        "deadlock. The choice becomes clear at last."),
    52: (  # Three of Swords
        "Heartbreak, sorrow, and the pain of a piercing truth. Grief is real "
        "and necessary — let it move through you toward healing.",
        "Recovering from heartbreak, or releasing the old wound. "
        "The sorrow lifts as forgiveness becomes possible."),
    53: (  # Four of Swords
        "A needed retreat into rest, recovery, and contemplation. Step back "
        "from the fray to heal body and mind before continuing.",
        "Stagnation, burnout, or restlessness that resists stillness. "
        "True restoration requires actually pausing, not just withdrawing."),
    54: (  # Five of Swords
        "Conflict, rivalry, and a victory that may cost more than it wins. "
        "Choose your battles — hollow triumph hollows out the winner.",
        "Reconciliation after conflict, or releasing the need to win at "
        "any cost. A truce becomes possible when pride steps aside."),
    55: (  # Six of Swords
        "Transition toward calmer waters after turbulence, carrying what was "
        "learned. Movement brings relief even if the shore is still distant.",
        "Resistance to moving on, or landing somewhere not yet at peace. "
        "The passage stalls — address what you are reluctant to leave behind."),
    56: (  # Seven of Swords
        "Strategy, stealth, or diplomacy in gathering what you need. Act with "
        "subtlety — but examine whether deception serves you or others.",
        "A secret exposed, or honesty reclaiming ground from the stealth. "
        "Come clean before the deception unravels on its own."),
    57: (  # Eight of Swords
        "Feeling trapped and blindfolded by your own fearful thoughts. The "
        "bindings are looser than they seem — the cage is largely self-made.",
        "Releasing self-imposed limits and seeing the way out. The blindfold "
        "drops as you reclaim your power to choose."),
    58: (  # Nine of Swords
        "Anxiety, nightmares, and grief that looms largest in the dark. "
        "Much of the dread is the mind magnifying — name it to shrink it.",
        "Despair lifting as dawn reveals the worry was unfounded. "
        "The night passes and the fear loses its hold."),
    59: (  # Ten of Swords
        "A painful ending, betrayal, or rock-bottom collapse of an old cycle. "
        "The worst is over — from here, the only way is upward.",
        "Recovery and survival after hitting bottom, or a painful ending "
        "that nonetheless brings relief. The dawn breaks at last."),
    60: (  # Page of Swords
        "A curious, vigilant new thinker eager for truth and fresh ideas. "
        "Stay sharp and inquisitive — a message or insight is on the wind.",
        "Gossip, hasty judgment, or curiosity turned to snooping. "
        "Verify before you speak, and temper inquiry with tact."),
    61: (  # Knight of Swords
        "A driven, fast-charging force of ambition and blunt directness. "
        "Charge toward the goal with conviction — speed is your ally now.",
        "Reckless haste, aggression, or a charge with no clear target. "
        "Slow the stallion before it carries you off a cliff."),
    62: (  # Queen of Swords
        "A perceptive, independent mind that judges with crisp honesty. "
        "Speak truth clearly and set boundaries — compassion need not soften fact.",
        "Coldness, bitterness, or a sharp tongue that wounds from old hurt. "
        "Soften the blade with warmth it has long withheld."),
    63: (  # King of Swords
        "An authoritative intellect who rules with truth, ethics, and clear "
        "judgment. Decide firmly on principle and command with integrity.",
        "Rigidity, cold manipulation, or tyranny of pure logic over feeling. "
        "Reintroduce fairness and heart to the verdict."),

    # --- Pentacles (Earth) — ids 64-77 --- #
    64: (  # Ace of Pentacles
        "A tangible new opportunity for prosperity, security, or a venture made "
        "real. A seed of abundance lands in your hand — plant it well.",
        "A missed opportunity, or a venture that fails to take root. "
        "Secure the foundation before trusting the promise of gain."),
    65: (  # Two of Pentacles
        "Juggling many priorities with adaptable, flexible balance. You keep "
        "the balls in the air — but stay mindful of your limits.",
        "Overwhelm and dropped balls as too much spins at once. "
        "Set something down before the whole juggling act collapses."),
    66: (  # Three of Pentacles
        "Skilled collaboration and teamwork that builds something of real craft. "
        "Each contributor's expertise raises the whole — build together.",
        "Disharmony in the team, or work that falls short through poor "
        "coordination. Realign roles before the structure suffers."),
    67: (  # Four of Pentacles
        "A grip on security, holding tightly to what you have earned. "
        "Stability is well-earned, but check whether control has become a cage.",
        "Loosening the hoarded grip, or overholding that blocks new flow. "
        "Release what you clutch — generosity invites abundance."),
    68: (  # Five of Pentacles
        "Hardship, scarcity, and feeling shut out in the cold. Help is nearer "
        "than it appears — reach toward the warm light of the window.",
        "Recovery from hardship, or material relief finally arriving. "
        "The door opens to the support you had felt denied."),
    69: (  # Six of Pentacles
        "Generosity flows in fair balance between giving and receiving. Share "
        "abundance with open hand — and receive with equal grace.",
        "Unequal exchange, strings attached to a gift, or debt that burdens. "
        "Examine the power in the giving before you accept or offer."),
    70: (  # Seven of Pentacles
        "Patient assessment as you wait for slow-growing efforts to mature. "
        "The harvest is not yet — tend the crop and trust the season.",
        "Frustration at slow returns, or effort poured into barren ground. "
        "Reassess whether what you tend is worth the wait."),
    71: (  # Eight of Pentacles
        "Diligent dedication to craft and the honing of skill. Devotion to "
        "mastery through steady, attentive work brings quiet excellence.",
        "Burnout, perfectionism, or busyness that misses the bigger aim. "
        "Lift your eyes from the bench and reclaim perspective."),
    72: (  # Nine of Pentacles
        "Self-sufficient abundance earned through your own discipline. Enjoy "
        "the refined fruits of independent accomplishment and well-tended grace.",
        "False independence that masks a craving for connection, or a "
        "supersecurity that walls out life. Let yourself be sustained by others."),
    73: (  # Ten of Pentacles
        "Lasting wealth, legacy, and the deep security of family and home. "
        "Generational abundance roots you — what you build will endure.",
        "Family conflict over legacy, or financial instability fracturing "
        "the home. Mend the inheritance where it has frayed."),
    74: (  # Page of Pentacles
        "A studious apprentice eager to learn and plant seeds of new skill. "
        "Stay open to practical opportunity — study what the earth offers.",
        "Laziness, lost focus, or a venture abandoned before the lesson "
        "landed. Return to the workbench and pick up where you stalled."),
    75: (  # Knight of Pentacles
        "A reliable, hardworking plodder who advances through steady effort. "
        "Progress is slow but sure — patience and routine carry the day.",
        "Stagnation, stubbornness, or diligence turned to drudgery. "
        "Look up from the routine to find a more inspired path."),
    76: (  # Queen of Pentacles
        "A nurturing, practical presence who tends resources, home, and loved "
        "ones. Ground abundance in care — security and warmth together.",
        "Work-life imbalance, or smothering practicality that forgets the soul. "
        "Replenish your own well before pouring out for others."),
    77: (  # King of Pentacles
        "A master of the material realm who has built wealth, status, and "
        "stability. Lead with steady generosity and enjoy what you've earned.",
        "Greed, control through money, or rigidity that hoards rather than "
        "enjoys. Reconnect wealth with purpose beyond accumulation."),
}


def interpretation_for(card_id: int) -> tuple[str, str]:
    """Return (upright_meaning, reversed_meaning) for a card.

    Checks MAJOR_INTERPRETATIONS (ids 0-21) first, then falls back to
    MINOR_INTERPRETATIONS (ids 22-77). Returns empty strings for unknown ids.
    """
    return MAJOR_INTERPRETATIONS.get(
        card_id, MINOR_INTERPRETATIONS.get(card_id, ("", ""))
    )
