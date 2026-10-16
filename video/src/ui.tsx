import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const C = {
  parchment: "#f5f3ea",
  paper: "#fbfaf6",
  paperAlt: "#f2ede2",
  ink: "#1a1f12",
  inkMuted: "#3c4132",
  muted: "#6b6e5d",
  rule: "#d6d6c8",
  sage: "#93bd63",
  sageLight: "#edf5e5",
  sageDark: "#6e9442",
  olive: "#4c5d34",
  oliveDeep: "#2f3a20",
  gold: "#b08d3c",
  goldLight: "#f6efe0",
  red: "#b5523b",
  redLight: "#f7e4dd",
  blue: "#3f6f8f",
  blueLight: "#e1edf4",
};

export const serif = "'Iowan Old Style', 'Palatino', Georgia, serif";
export const sans = "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif";
export const mono = "'SF Mono', Menlo, monospace";

/** All sound effects play at 25% volume. */
export const SFX_VOLUME = 0.25;

export type SfxName = "whoosh" | "pop" | "click" | "ding" | "success" | "alert" | "tick" | "rise";

export const Sfx: React.FC<{ name: SfxName; at: number }> = ({ name, at }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

/** Spring progress 0..1 starting at `delay` frames. */
export const useSpring = (delay = 0, damping = 14, mass = 0.8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
};

export const useLinear = (from: number, to: number, ease = Easing.out(Easing.cubic)) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

/** Element that pops/slides in with a spring. */
export const Rise: React.FC<{
  delay?: number;
  y?: number;
  x?: number;
  scale?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 40, x = 0, scale = false, children, style }) => {
  const p = useSpring(delay);
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.4),
        transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${scale ? 0.6 + 0.4 * p : 1})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Animated number counter. */
export const Counter: React.FC<{
  to: number;
  from?: number;
  start: number;
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}> = ({ to, from = 0, start, end, decimals = 0, prefix = "", suffix = "" }) => {
  const t = useLinear(start, end);
  const v = from + (to - from) * t;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};

/** Typewriter text. */
export const Typed: React.FC<{ text: string; start: number; cps?: number }> = ({ text, start, cps = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.floor(((frame - start) / fps) * cps));
  const cursor = n < text.length && frame >= start && Math.floor(frame / 8) % 2 === 0;
  return (
    <span>
      {text.slice(0, n)}
      <span style={{ opacity: cursor ? 1 : 0 }}>▍</span>
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: C.paper,
      border: `1.5px solid ${C.rule}`,
      borderRadius: 22,
      padding: 32,
      boxShadow: "0 18px 50px rgba(47,58,32,0.10)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ tone: "pay" | "hold" | "escalate" | "reject" | "info"; children: React.ReactNode; size?: number }> = ({
  tone,
  children,
  size = 22,
}) => {
  const map = {
    pay: [C.sageLight, C.sageDark],
    hold: [C.goldLight, C.gold],
    escalate: [C.blueLight, C.blue],
    reject: [C.redLight, C.red],
    info: [C.paperAlt, C.inkMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        border: `1.5px solid ${fg}`,
        borderRadius: 999,
        padding: `${size * 0.25}px ${size * 0.7}px`,
        fontFamily: mono,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 1,
      }}
    >
      {children}
    </span>
  );
};

/** Section heading shown top-left of every scene. */
export const SceneTitle: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => {
  const p = useSpring(0, 16);
  const line = useLinear(4, 30);
  return (
    <div style={{ position: "absolute", top: 70, left: 110 }}>
      <div
        style={{
          fontFamily: mono,
          color: C.gold,
          fontSize: 24,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: p,
          transform: `translateX(${(1 - p) * -40}px)`,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: serif,
          color: C.ink,
          fontSize: 64,
          fontWeight: 600,
          marginTop: 8,
          opacity: p,
          transform: `translateY(${(1 - p) * 20}px)`,
        }}
      >
        {title}
      </div>
      <div style={{ height: 4, width: 220 * line, background: C.sage, borderRadius: 2, marginTop: 14 }} />
    </div>
  );
};

/** Parchment background with slowly drifting ornament rings. */
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.parchment, overflow: "hidden" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            right: -260 + i * 40,
            bottom: -260 + i * 30,
            width: 720 - i * 160,
            height: 720 - i * 160,
            borderRadius: "50%",
            border: `2px solid ${C.rule}`,
            opacity: 0.6,
            transform: `rotate(${frame * (0.15 + i * 0.1)}deg) scale(${1 + Math.sin((frame + i * 30) / 50) * 0.02})`,
          }}
        />
      ))}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = (i * 137) % 1920;
        const y = (((i * 263 - frame * (0.4 + (i % 4) * 0.2)) % 1080) + 1080) % 1080;
        return (
          <div
            key={`d${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 6 + (i % 3) * 3,
              height: 6 + (i % 3) * 3,
              borderRadius: "50%",
              background: i % 2 ? C.sage : C.gold,
              opacity: 0.18,
            }}
          />
        );
      })}
      <Landscape />
      {children}
    </AbsoluteFill>
  );
};

/** Engraved village panorama, swaying rice and birds along the bottom of every scene. */
export const Landscape: React.FC<{ strength?: number }> = ({ strength = 0.13 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Img
        src={staticFile("img/lumbung-village-panorama.png")}
        style={{
          position: "absolute",
          bottom: -40,
          left: -120 - frame * 0.35,
          width: 2400,
          opacity: strength,
          mixBlendMode: "multiply",
        }}
      />
      <svg width={1920} height={160} style={{ position: "absolute", bottom: 0, left: 0, opacity: 0.55 }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const x = i * 31 + (i % 3) * 7;
          const h = 70 + ((i * 37) % 60);
          const sway = Math.sin(frame / 18 + i * 0.6) * 9;
          return (
            <g key={i} stroke={i % 4 === 0 ? C.gold : C.olive} strokeWidth={2.2} fill="none" strokeLinecap="round">
              <path d={`M${x} 160 Q ${x + sway * 0.4} ${160 - h / 2} ${x + sway} ${160 - h}`} />
              <path d={`M${x + sway} ${160 - h} q 8 6 4 18`} />
              <path d={`M${x + sway * 0.7} ${160 - h * 0.7} q -9 4 -6 15`} />
            </g>
          );
        })}
      </svg>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 70) % 420) / 420;
        const flap = Math.sin(frame / 3 + i) * 6;
        return (
          <svg
            key={`b${i}`}
            width={40}
            height={20}
            style={{ position: "absolute", left: -60 + t * 2100, top: 150 + i * 45 + Math.sin(t * 9 + i) * 20, opacity: 0.5 }}
          >
            <path d={`M2 ${10 - flap} Q 10 10 20 12 Q 30 10 38 ${10 - flap}`} stroke={C.oliveDeep} strokeWidth={2.4} fill="none" />
          </svg>
        );
      })}
    </>
  );
};

/** Floating illustration with entrance spring and idle bob. */
export const Character: React.FC<{
  src: string;
  delay?: number;
  width: number;
  style?: React.CSSProperties;
  from?: "left" | "right" | "bottom";
  bob?: number;
  tilt?: number;
}> = ({ src, delay = 0, width, style, from = "bottom", bob = 8, tilt = 1.5 }) => {
  const frame = useCurrentFrame();
  const p = useSpring(delay, 13);
  const off = (1 - p) * 300;
  const tr = from === "left" ? `translateX(${-off}px)` : from === "right" ? `translateX(${off}px)` : `translateY(${off}px)`;
  const idle = `translateY(${Math.sin((frame - delay) / 20) * bob}px) rotate(${Math.sin((frame - delay) / 28) * tilt}deg)`;
  return (
    <Img
      src={staticFile(`img/${src}`)}
      style={{ position: "absolute", width, mixBlendMode: "multiply", opacity: Math.min(1, p * 1.5), transform: `${tr} ${idle}`, ...style }}
    />
  );
};

/** Wipe-in / fade-out wrapper for each scene. */
export const SceneShell: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const outP = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow camera push-in with a gentle drift, so no scene ever sits still
  const cam = interpolate(frame, [0, duration], [1, 1.06]);
  const driftX = Math.sin(frame / 90) * 12;
  const driftY = Math.cos(frame / 110) * 8;
  return (
    <AbsoluteFill style={{ clipPath: `circle(${inP * 120}% at 50% 55%)`, opacity: outP }}>
      <Backdrop>
        <AbsoluteFill style={{ transform: `scale(${cam}) translate(${driftX}px, ${driftY}px)` }}>{children}</AbsoluteFill>
      </Backdrop>
      <Sfx name="whoosh" at={0} />
    </AbsoluteFill>
  );
};

export const Illo: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(`img/${src}`)} style={{ objectFit: "cover", mixBlendMode: "multiply", ...style }} />
);

/** Subtitle bar at the bottom, synced with narration. */
export const Caption: React.FC<{ text: string }> = ({ text }) => {
  const p = useSpring(6, 18);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 26,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: p * 0.95,
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          background: "rgba(26,31,18,0.82)",
          color: C.paper,
          fontFamily: sans,
          fontSize: 24,
          lineHeight: 1.3,
          padding: "14px 28px",
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        {text.replace(/A I/g, "AI").replace(/on chain/g, "on-chain")}
      </div>
    </div>
  );
};
