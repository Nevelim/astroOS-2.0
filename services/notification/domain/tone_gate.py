"""Notification tone-gate (NOTIF-3) — the calm-framing invariant.

Pure functions, no I/O. Every notification title+body passes through
`check_tone` before any channel delivery. The rule (from the Architecture
ADR and the spec's "trust-first" tone-of-voice): NO aggressive, spammy,
fear-mongering, or clickbait framing. AstroOS empowers; it never pressures.

Layered verdict:
  PASS   — calm, opt-in framing. Send as-is.
  SOFTEN — the intent is fine but the wording is pushy; rewrite to calm.
  BLOCK  — fear-mongering / spammy / manipulative urgency. Drop entirely.

Crisis follow-up (NOTIF-6) is EXEMPT from blocking: its content is authored
by the service (localized hotline resources) and safety overrides tone. It
can still be SOFTEN-ed if somehow mis-worded, but never BLOCK-ed.
"""
from __future__ import annotations

import re

from services.notification.domain.entities import (
    NotificationType,
    ToneVerdict,
)


# --------------------------------------------------------------------------- #
# Patterns that BLOCK — fear-mongering, manipulation, spam tropes
# --------------------------------------------------------------------------- #
_BLOCK_PATTERNS: tuple[re.Pattern, ...] = (
    # False urgency / FOMO pressure
    re.compile(r"\b(urgent|last chance|act now|before it'?s too late|"
               r"don'?t miss out|only today|expires in|limited time)\b",
               re.IGNORECASE),
    # Fear / doom framing (astrology must NEVER fatalize)
    re.compile(r"\b(warn|danger|disaster|catastrophe|ruin|curse|jinx|"
               r"bad luck will|you will (lose|fail|suffer))\b", re.IGNORECASE),
    # Spam / scam tropes
    re.compile(r"\b(free money|guaranteed|click here|buy now|"
               r"100%|secret they don'?t want)\b", re.IGNORECASE),
    # All-caps shouting (3+ consecutive caps words = shouting)
    re.compile(r"(?:[A-Z]{2,}\s+){2,}[A-Z]{2,}"),
    # Excessive exclamation (!! or !!!)
    re.compile(r"!{2,}"),
)

# Patterns that SOFTEN — pushy but salvageable
_SOFTEN_PATTERNS: tuple[re.Pattern, ...] = (
    # Mild pressure / exclamation
    re.compile(r"\b(hurry|now|right now|immediately|asap)\b", re.IGNORECASE),
    re.compile(r"!$"),
    # Vague teaser ellipsis ("You won't believe...")
    re.compile(r"\.{3,}\s*$"),
    # Question-as-clickbait ("Guess what happened?")
    re.compile(r"\b(guess what|you won'?t believe|find out now)\b", re.IGNORECASE),
)


def check_tone(title: str, body: str,
               ntype: NotificationType = NotificationType.DAILY_MORNING
               ) -> ToneVerdict:
    """Classify a notification's tone. Pure function.

    Crisis follow-up is exempt from BLOCK (safety > tone) but can be SOFTEN-ed.
    """
    text = f"{title} {body}".strip()
    if not text:
        return ToneVerdict.BLOCK  # empty notification

    # BLOCK checks
    for pattern in _BLOCK_PATTERNS:
        if pattern.search(text):
            if ntype is NotificationType.CRISIS_FOLLOWUP:
                # Safety override: crisis content is authored & essential.
                # Still flag for softening, never block.
                return ToneVerdict.SOFTEN
            return ToneVerdict.BLOCK

    # SOFTEN checks
    for pattern in _SOFTEN_PATTERNS:
        if pattern.search(text):
            return ToneVerdict.SOFTEN

    return ToneVerdict.PASS


def soften(title: str, body: str) -> tuple[str, str]:
    """Apply calm rewrites for SOFTEN-verdict content. Pure function.

    Strips pushy markers, deflates shouting, removes trailing pressure.
    Returns the (title, body) in calm framing. Conservative: if it can't
    confidently rewrite, it trims rather than fabricates.
    """
    new_title = title
    new_body = body

    # Deflate ALL CAPS shouting to title case
    if re.search(r"[A-Z]{2,}", new_title):
        new_title = new_title.title()

    # Strip excessive punctuation
    new_title = re.sub(r"!{2,}", ".", new_title)
    new_title = re.sub(r"!$", "", new_title).strip()
    new_title = re.sub(r"\.{3,}\s*$", ".", new_title).strip()

    # Replace pushy words with calm framing
    calm_replacements = {
        r"\bhurry\b": "when you're ready",
        r"\bright now\b": "when it suits you",
        r"\bimmediately\b": "at your own pace",
        r"\basap\b": "when convenient",
        r"\bnow\b": "soon",
    }
    for pushy, calm in calm_replacements.items():
        new_body = re.sub(pushy, calm, new_body, flags=re.IGNORECASE)

    return new_title, new_body
