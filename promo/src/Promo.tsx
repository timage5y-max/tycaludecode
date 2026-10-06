import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, ease, hebSerif, sans, serif } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const prog = (f: number, from: number, to: number) =>
  interpolate(f, [from, to], [0, 1], { ...clamp, easing: ease });

/** Fades a scene in and out inside its own Sequence. */
const Fade: React.FC<{ d: number; i?: number; o?: number; children: React.ReactNode }> = ({
  d,
  i = 8,
  o = 8,
  children,
}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, i, d - o, d], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/* ---------- persistent cinematic overlays ---------- */

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.16, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2)} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};

const Overlays: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = Math.floor(f / fps);
  const ff = f % fps;
  const tc = `00:00:${String(s).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />
      <Grain />
      <div
        style={{
          position: "absolute",
          inset: 36,
          border: `1px solid ${C.gold}`,
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 72,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: sans,
          fontWeight: 300,
          fontSize: 24,
          letterSpacing: 4,
          color: C.muted,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#d9463e",
            opacity: blink ? 1 : 0.15,
          }}
        />
        REC {tc}
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 70,
          height: 2,
          background: "rgba(243,236,225,0.15)",
        }}
      >
        <div
          style={{
            width: `${(f / durationInFrames) * 100}%`,
            height: "100%",
            background: C.gold,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- scenes ---------- */

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const line = prog(f, 0, 30);
  const name = prog(f, 14, 60);
  const sub = prog(f, 40, 75);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          width: 2,
          height: `${line * 42}%`,
          background: `linear-gradient(${C.gold}, transparent)`,
        }}
      />
      <div style={{ textAlign: "center", marginTop: 120 }}>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 300,
            fontSize: 118,
            color: C.ivory,
            letterSpacing: `${interpolate(name, [0, 1], [0.9, 0.18])}em`,
            opacity: name,
            lineHeight: 1.1,
            paddingLeft: "0.18em",
          }}
        >
          TAMIR
          <br />
          YESHAYAHU
        </div>
        <div
          style={{
            marginTop: 54,
            fontFamily: serif,
            fontSize: 34,
            letterSpacing: "0.55em",
            color: C.gold,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
          }}
        >
          WEDDING FILMMAKER
        </div>
        <div
          dir="rtl"
          style={{
            marginTop: 26,
            fontFamily: hebSerif,
            fontSize: 44,
            color: C.muted,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
          }}
        >
          צלם וידאו חתונות
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PhotoCard: React.FC<{
  src: string;
  d: number;
  idx?: number;
  total?: number;
  tag?: { en: string; he: string };
  align?: "left" | "right";
}> = ({ src, d, idx, total, tag, align = "left" }) => {
  const f = useCurrentFrame();
  const enter = prog(f, 0, 22);
  const zoom = interpolate(f, [0, d], [1.0, 1.12]);
  const bgZoom = interpolate(f, [0, d], [1.35, 1.5]);
  const slide = (1 - enter) * (align === "left" ? -90 : 90);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bgZoom})`,
            filter: "blur(38px) brightness(0.42) saturate(1.1)",
          }}
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 130,
          width: 820,
          height: 888,
          overflow: "hidden",
          transform: `translateX(${slide}px)`,
          opacity: enter,
          boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
          outline: `1px solid rgba(201,169,120,0.5)`,
          outlineOffset: 14,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
      </div>
      {tag && (
        <div
          style={{
            position: "absolute",
            top: 1290,
            left: 130,
            right: 130,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            opacity: prog(f, 10, 30),
            transform: `translateY(${(1 - prog(f, 10, 30)) * 24}px)`,
          }}
        >
          <div>
            <div style={{ fontFamily: serif, fontSize: 64, color: C.ivory, letterSpacing: 6 }}>
              {tag.en}
            </div>
            <div dir="rtl" style={{ fontFamily: hebSerif, fontSize: 38, color: C.gold, marginTop: 6 }}>
              {tag.he}
            </div>
          </div>
          {idx && total && (
            <div style={{ fontFamily: serif, fontSize: 40, color: C.muted, letterSpacing: 4 }}>
              {String(idx).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Tagline: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const l1 = prog(f, 14, 44);
  const l2 = prog(f, 28, 58);
  return (
    <AbsoluteFill>
      <PhotoCard src="media/p1.jpg" d={d} align="right" />
      <div
        dir="rtl"
        style={{
          position: "absolute",
          top: 1290,
          left: 130,
          right: 130,
          fontFamily: hebSerif,
          color: C.ivory,
          fontSize: 76,
          lineHeight: 1.25,
        }}
      >
        <div style={{ opacity: l1, transform: `translateY(${(1 - l1) * 30}px)` }}>הרגעים שלכם.</div>
        <div style={{ opacity: l2, transform: `translateY(${(1 - l2) * 30}px)`, color: C.gold }}>
          יצירה אחת.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Storyteller: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const a = prog(f, 4, 36);
  const b = prog(f, 20, 52);
  const bg = interpolate(f, [0, d], [1.15, 1.3]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile("media/p8.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bg})`,
            filter: "blur(30px) brightness(0.3)",
          }}
        />
      </AbsoluteFill>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 112,
            lineHeight: 1.1,
            color: C.ivory,
            letterSpacing: `${interpolate(a, [0, 1], [0.5, 0.12])}em`,
            opacity: a,
            paddingLeft: "0.12em",
          }}
        >
          VISUAL
          <br />
          STORYTELLER
        </div>
        <div
          dir="rtl"
          style={{
            marginTop: 50,
            fontFamily: hebSerif,
            fontSize: 52,
            color: C.gold,
            opacity: b,
            transform: `translateY(${(1 - b) * 24}px)`,
          }}
        >
          מספר סיפורים בתמונה
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const a = prog(f, 0, 30);
  const b = prog(f, 18, 48);
  const c = prog(f, 34, 64);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 98,
            letterSpacing: "0.16em",
            lineHeight: 1.12,
            color: C.ivory,
            opacity: a,
            paddingLeft: "0.16em",
          }}
        >
          TAMIR
          <br />
          YESHAYAHU
        </div>
        <div
          style={{
            margin: "50px auto",
            width: interpolate(b, [0, 1], [0, 220]),
            height: 2,
            background: C.gold,
          }}
        />
        <div
          style={{
            fontFamily: serif,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: 44,
            color: C.muted,
            opacity: b,
            padding: "0 100px",
            lineHeight: 1.35,
          }}
        >
          Crafting your moments
          <br />
          into a masterpiece
        </div>
        <div style={{ opacity: c, transform: `translateY(${(1 - c) * 24}px)`, marginTop: 90 }}>
          <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 56, color: C.ivory, letterSpacing: 6 }}>
            054-355-0216
          </div>
          <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 34, color: C.gold, marginTop: 26, letterSpacing: 3 }}>
            vimeo.com/tamiryeshayahu
          </div>
          <div style={{ fontFamily: sans, fontWeight: 300, fontSize: 34, color: C.muted, marginTop: 14, letterSpacing: 3 }}>
            @tamiryeshayahu_filmmaker
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- timeline (30fps, 600 frames = 20s) ---------- */

const MONTAGE = [
  { src: "media/p2.jpg", tag: { en: "CEREMONY", he: "טקס" } },
  { src: "media/p3.jpg", tag: { en: "AERIAL", he: "מלמעלה" } },
  { src: "media/p4.jpg", tag: { en: "DETAILS", he: "פרטים" } },
  { src: "media/p5.jpg", tag: { en: "PORTRAIT", he: "פורטרט" } },
  { src: "media/p6.jpg", tag: { en: "LOVE", he: "אהבה" } },
  { src: "media/p7.jpg", tag: { en: "JOY", he: "שמחה" } },
];
const M_START = 190;
const M_LEN = 40;

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sequence from={0} durationInFrames={100}>
      <Fade d={100} i={4} o={14}>
        <Intro />
      </Fade>
    </Sequence>
    <Sequence from={90} durationInFrames={110}>
      <Fade d={110} i={14} o={10}>
        <Tagline d={110} />
      </Fade>
    </Sequence>
    {MONTAGE.map((m, i) => (
      <Sequence key={m.src} from={M_START + i * M_LEN - 4} durationInFrames={M_LEN + 8}>
        <Fade d={M_LEN + 8} i={6} o={6}>
          <PhotoCard
            src={m.src}
            d={M_LEN + 8}
            idx={i + 1}
            total={MONTAGE.length}
            tag={m.tag}
            align={i % 2 ? "right" : "left"}
          />
        </Fade>
      </Sequence>
    ))}
    <Sequence from={M_START + MONTAGE.length * M_LEN - 4} durationInFrames={100}>
      <Fade d={100} i={12} o={12}>
        <Storyteller d={100} />
      </Fade>
    </Sequence>
    <Sequence from={520} durationInFrames={80}>
      <Fade d={80} i={14} o={1}>
        <Outro />
      </Fade>
    </Sequence>
    <Overlays />
  </AbsoluteFill>
);
