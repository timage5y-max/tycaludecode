"""Transcription backends.

Each backend turns an audio/video file into a :class:`Transcript` with
word-level timestamps. Backends are pluggable so the same pipeline can run
with a cloud API (when network + key are available) or fully local.

Backends:
    - ``elevenlabs``: ElevenLabs Scribe API (needs ELEVENLABS_API_KEY + network)
    - ``whisper``:    faster-whisper, runs locally (downloads model once)
    - ``file``:       load an existing transcript (SRT / JSON)

Pick one explicitly, or call :func:`autodetect` to choose the first that is
usable in the current environment.
"""

from __future__ import annotations

import json
import os
import re
from typing import List, Optional

from .model import Transcript, Word


# --------------------------------------------------------------------------- #
# ElevenLabs Scribe
# --------------------------------------------------------------------------- #
def transcribe_elevenlabs(
    path: str,
    api_key: Optional[str] = None,
    model_id: str = "scribe_v1",
) -> Transcript:
    """Transcribe via ElevenLabs Scribe. Returns word-level timings."""
    import requests  # local import so the dependency is optional

    api_key = api_key or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")

    with open(path, "rb") as fh:
        resp = requests.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": api_key},
            data={"model_id": model_id, "timestamps_granularity": "word"},
            files={"file": fh},
            timeout=600,
        )
    resp.raise_for_status()
    data = resp.json()

    words: List[Word] = []
    for w in data.get("words", []):
        # ElevenLabs marks spacing/audio-event tokens; keep only real words.
        if w.get("type", "word") != "word":
            continue
        words.append(Word(text=w["text"].strip(), start=float(w["start"]), end=float(w["end"])))
    return Transcript(words=words)


# --------------------------------------------------------------------------- #
# faster-whisper (local)
# --------------------------------------------------------------------------- #
def transcribe_whisper(path: str, model_size: str = "base", language: Optional[str] = None) -> Transcript:
    """Transcribe locally with faster-whisper (word timestamps enabled)."""
    from faster_whisper import WhisperModel  # optional dependency

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(path, language=language, word_timestamps=True)

    words: List[Word] = []
    for seg in segments:
        for w in (seg.words or []):
            words.append(Word(text=w.word.strip(), start=float(w.start), end=float(w.end)))
    return Transcript(words=words)


# --------------------------------------------------------------------------- #
# Load an existing transcript from disk
# --------------------------------------------------------------------------- #
_SRT_TIME = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)")


def _srt_ts(h: str, m: str, s: str, ms: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def transcribe_file(path: str) -> Transcript:
    """Load a transcript from a ``.json`` ([{text,start,end}, ...]) or ``.srt`` file."""
    if path.lower().endswith(".json"):
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        items = data["words"] if isinstance(data, dict) else data
        words = [Word(text=i["text"].strip(), start=float(i["start"]), end=float(i["end"])) for i in items]
        return Transcript(words=words)

    # SRT: approximate word timings by spreading each cue across its words.
    words = []
    with open(path, encoding="utf-8") as fh:
        blocks = re.split(r"\n\s*\n", fh.read().strip())
    for block in blocks:
        lines = [ln for ln in block.splitlines() if ln.strip()]
        m = next((_SRT_TIME.search(ln) for ln in lines if _SRT_TIME.search(ln)), None)
        if not m:
            continue
        start = _srt_ts(*m.groups()[:4])
        end = _srt_ts(*m.groups()[4:])
        text = " ".join(ln for ln in lines if not _SRT_TIME.search(ln) and not ln.strip().isdigit())
        toks = text.split()
        if not toks:
            continue
        step = (end - start) / len(toks)
        for i, tok in enumerate(toks):
            words.append(Word(text=tok, start=start + i * step, end=start + (i + 1) * step))
    return Transcript(words=words)


# --------------------------------------------------------------------------- #
# Dispatch
# --------------------------------------------------------------------------- #
def transcribe(path: str, backend: str = "auto", **kwargs) -> Transcript:
    if backend == "auto":
        backend = autodetect()
    if backend == "elevenlabs":
        return transcribe_elevenlabs(path, **kwargs)
    if backend == "whisper":
        return transcribe_whisper(path, **kwargs)
    if backend == "file":
        return transcribe_file(kwargs["path"] if "path" in kwargs else path)
    raise ValueError(f"unknown transcription backend: {backend!r}")


def autodetect() -> str:
    """Choose the best available backend for the current environment."""
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    try:
        import faster_whisper  # noqa: F401

        return "whisper"
    except ImportError:
        raise RuntimeError(
            "No transcription backend available. Set ELEVENLABS_API_KEY, "
            "install faster-whisper, or pass an existing transcript with --transcript."
        )
