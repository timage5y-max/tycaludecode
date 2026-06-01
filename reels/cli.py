"""Command-line interface for the reels tool.

Example:
    python -m reels make raw.mp4 --duration 30 --count 3 --reframe crop
    python -m reels make raw.mp4 --transcript words.json --reframe blur
"""

from __future__ import annotations

import argparse
import sys

from .pipeline import cut_clip, make_reels


def _parse_time(value: str) -> float:
    """Accept seconds (\"75\") or mm:ss / hh:mm:ss (\"1:15\")."""
    if ":" not in value:
        return float(value)
    parts = [float(p) for p in value.split(":")]
    seconds = 0.0
    for p in parts:
        seconds = seconds * 60 + p
    return seconds


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="reels", description="Make vertical reels from long footage.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    mk = sub.add_parser("make", help="cut long footage into vertical reels")
    mk.add_argument("input", help="source video file")
    mk.add_argument("--out", default="out", help="output directory (default: out)")
    mk.add_argument("--duration", type=float, default=30.0, help="target clip length in seconds")
    mk.add_argument("--count", type=int, default=1, help="number of reels to produce")
    mk.add_argument("--reframe", choices=["crop", "blur", "none"], default="crop")
    mk.add_argument("--no-captions", action="store_true", help="do not burn captions")
    mk.add_argument("--backend", choices=["auto", "elevenlabs", "whisper", "file"], default="auto")
    mk.add_argument("--transcript", help="existing transcript (.json/.srt); skips transcription")
    mk.add_argument("--whisper-model", default="base", help="faster-whisper model size")
    mk.add_argument("--width", type=int, default=1080)
    mk.add_argument("--height", type=int, default=1920)

    ct = sub.add_parser("cut", help="manual cut + 9:16 reframe (no transcript, no captions)")
    ct.add_argument("input", help="source video file")
    ct.add_argument("--out", default="out/clip.mp4", help="output file path")
    ct.add_argument("--start", required=True, help="clip start (seconds or mm:ss)")
    grp = ct.add_mutually_exclusive_group()
    grp.add_argument("--end", help="clip end (seconds or mm:ss)")
    grp.add_argument("--duration", type=float, help="clip length in seconds")
    ct.add_argument("--reframe", choices=["crop", "blur", "none"], default="blur")
    ct.add_argument("--width", type=int, default=1080)
    ct.add_argument("--height", type=int, default=1920)

    args = parser.parse_args(argv)

    if args.cmd == "cut":
        res = cut_clip(
            args.input,
            args.out,
            start=_parse_time(args.start),
            end=_parse_time(args.end) if args.end else None,
            duration=args.duration,
            reframe_mode=args.reframe,
            target_w=args.width,
            target_h=args.height,
        )
        print(f"Wrote {res.path}  [{res.clip.start:.1f}s-{res.clip.end:.1f}s, "
              f"{res.clip.duration:.1f}s, {args.width}x{args.height}, reframe={args.reframe}]")
        return 0

    if args.cmd == "make":
        results = make_reels(
            args.input,
            out_dir=args.out,
            duration=args.duration,
            count=args.count,
            reframe_mode=args.reframe,
            burn_captions=not args.no_captions,
            backend=args.backend,
            transcript_path=args.transcript,
            target_w=args.width,
            target_h=args.height,
            whisper_model=args.whisper_model,
        )
        if len(results) < args.count:
            print(
                f"\nNote: asked for {args.count} reels but the source only fits "
                f"{len(results)} non-overlapping clip(s) of ~{args.duration:.0f}s.",
                file=sys.stderr,
            )
        print(f"\nProduced {len(results)} reel(s):")
        for r in results:
            print(f"  {r.path}  [{r.clip.start:.1f}s-{r.clip.end:.1f}s, score={r.clip.score:.2f}]")
            print(f"      {r.text[:90]}{'...' if len(r.text) > 90 else ''}")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
