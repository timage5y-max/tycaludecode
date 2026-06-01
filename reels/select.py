"""Clip selection: find the best short window(s) inside a long transcript.

The job of a reels tool is mostly *choosing what to keep*. We score every
candidate window and return the highest-scoring, non-overlapping clips.

Scoring favours windows that:
    * are densely spoken (little dead air)              -> speech_density
    * start near a sentence boundary (a clean "hook")   -> hook_bonus
    * end near a sentence boundary (a clean "payoff")   -> payoff_bonus
    * contain hook-y / emotional language               -> keyword_bonus

This is a transparent heuristic. For higher quality, plug an LLM into
:func:`llm_rerank` (it receives candidate texts and returns scores) — the
agent running this repo can act as that LLM.
"""

from __future__ import annotations

import re
from typing import Callable, List, Optional

from .model import Clip, Transcript

# Words that often mark a strong opening or an emotional peak.
HOOK_WORDS = {
    "you", "your", "how", "why", "what", "stop", "never", "always", "secret",
    "mistake", "truth", "imagine", "listen", "here's", "heres", "biggest",
    "best", "worst", "nobody", "everyone", "this", "watch",
}

_SENT_END = re.compile(r"[.!?]\s*$")


def _ends_sentence(text: str) -> bool:
    return bool(_SENT_END.search(text.strip()))


def _score_window(t: Transcript, start: float, end: float) -> Clip:
    words = t.words_between(start, end)
    if not words:
        return Clip(start, end, score=0.0, reason="empty")

    spoken = sum(w.duration for w in words)
    density = spoken / (end - start)

    first, last = words[0], words[-1]
    # Hook bonus: clip opens close to its first word (no long lead-in silence).
    hook_bonus = 0.3 if (first.start - start) < 0.6 else 0.0
    # Payoff bonus: clip ends on a sentence terminator.
    payoff_bonus = 0.3 if _ends_sentence(last.text) else 0.0

    lowered = [re.sub(r"[^\w']", "", w.text.lower()) for w in words[:8]]
    keyword_bonus = 0.2 if any(tok in HOOK_WORDS for tok in lowered) else 0.0

    score = density + hook_bonus + payoff_bonus + keyword_bonus
    reason = (
        f"density={density:.2f} hook={hook_bonus} payoff={payoff_bonus} "
        f"kw={keyword_bonus}"
    )
    return Clip(start=first.start, end=last.end, score=score, reason=reason)


def select_clips(
    transcript: Transcript,
    target: float = 30.0,
    count: int = 1,
    step: float = 1.0,
    min_gap: float = 5.0,
    llm_rerank: Optional[Callable[[List[Clip], Transcript], List[Clip]]] = None,
) -> List[Clip]:
    """Return up to ``count`` non-overlapping clips of ~``target`` seconds.

    A sliding window of width ``target`` advances by ``step`` seconds across
    the transcript; each position is scored and the best non-overlapping
    windows are kept. ``min_gap`` is the minimum spacing between chosen clips.
    """
    total = transcript.duration
    if total <= target:
        return [_score_window(transcript, 0.0, total)]

    candidates: List[Clip] = []
    pos = 0.0
    while pos + target <= total:
        candidates.append(_score_window(transcript, pos, pos + target))
        pos += step

    if llm_rerank:
        candidates = llm_rerank(candidates, transcript)

    candidates.sort(key=lambda c: c.score, reverse=True)

    def overlaps(c: Clip, x: Clip) -> bool:
        # treat clips as intervals; require at least min_gap of separation
        return not (c.end + min_gap <= x.start or c.start >= x.end + min_gap)

    chosen: List[Clip] = []
    for c in candidates:
        if all(not overlaps(c, x) for x in chosen):
            chosen.append(c)
        if len(chosen) >= count:
            break
    chosen.sort(key=lambda c: c.start)
    return chosen
