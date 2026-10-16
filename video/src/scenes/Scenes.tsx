import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Badge,
  C,
  Card,
  Character,
  Counter,
  Illo,
  Rise,
  SceneTitle,
  Sfx,
  Typed,
  mono,
  sans,
  serif,
  useLinear,
  useSpring,
} from "../ui";

type P = { dur: number };

const center: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" };

/* 1. Intro: barn logo + title */
export const Intro: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const logo = useSpring(4, 10, 1);
  const glow = 0.5 + 0.5 * Math.sin(frame / 12);
  const letters = "Lumbung".split("");
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column" }}>
      <Sfx name="rise" at={2} />
      <Character src="lumbung-hero-barn.png" width={560} delay={0} from="left" style={{ left: 40, bottom: 90 }} />
      <Character src="vignette-viewer.png" width={380} delay={20} from="right" style={{ right: 90, bottom: 130 }} />
      <Sfx name="ding" at={30} />
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: C.sageLight,
          border: `4px solid ${C.sage}`,
          boxShadow: `0 0 ${40 + glow * 40}px rgba(147,189,99,${0.35 + glow * 0.25})`,
          ...center,
          transform: `scale(${logo}) rotate(${(1 - logo) * -90}deg)`,
        }}
      >
        <Illo src="lumbung-barn.svg" style={{ width: 170, height: 170, objectFit: "contain" }} />
      </div>
      <div style={{ display: "flex", marginTop: 40 }}>
        {letters.map((l, i) => (
          <Rise key={i} delay={18 + i * 3} y={60}>
            <span style={{ fontFamily: serif, fontSize: 150, fontWeight: 700, color: C.oliveDeep }}>{l}</span>
          </Rise>
        ))}
      </div>
      <Rise delay={50}>
        <div style={{ fontFamily: sans, fontSize: 40, color: C.muted, marginTop: 10 }}>
          The village barn, run by an AI agent — on <b style={{ color: C.olive }}>Arc</b>
        </div>
      </Rise>
      <Rise delay={70} scale>
        <div style={{ marginTop: 36, display: "flex", gap: 16 }}>
          <Badge tone="info">CIRCLE WALLETS</Badge>
          <Badge tone="pay">ARC TESTNET</Badge>
          <Badge tone="hold">USDC</Badge>
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

/* 2. Problem: points are promises */
export const Problem: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const coins = Array.from({ length: 9 });
  return (
    <AbsoluteFill>
      <SceneTitle kicker="The problem" title="Every point is a promise to pay" />
      <Rise delay={10} x={-80} y={0} style={{ position: "absolute", left: 110, top: 290 }}>
        <Card style={{ width: 620, padding: 0, overflow: "hidden" }}>
          <Illo src="vignette-viewer.png" style={{ width: 620, height: 380 }} />
          <div style={{ padding: 28, fontFamily: sans, fontSize: 30, color: C.inkMuted }}>
            OWatch viewers earn points by watching videos
          </div>
        </Card>
      </Rise>
      {coins.map((_, i) => {
        const start = 40 + i * 12;
        const t = interpolate(frame, [start, start + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = 760 + t * 420;
        const y = 520 - Math.sin(t * Math.PI) * 160 + (i % 3) * 30;
        return (
          <React.Fragment key={i}>
            {i < 5 && <Sfx name="tick" at={start} />}
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                opacity: t > 0 && t < 1 ? 1 : 0,
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: C.gold,
                color: C.paper,
                fontFamily: mono,
                fontWeight: 700,
                fontSize: 22,
                ...center,
                transform: `rotate(${t * 360}deg)`,
              }}
            >
              pt
            </div>
          </React.Fragment>
        );
      })}
      <Rise delay={70} x={80} y={0} style={{ position: "absolute", right: 140, top: 330 }}>
        <Card style={{ width: 600 }}>
          <div style={{ fontFamily: mono, color: C.muted, fontSize: 24 }}>OUTSTANDING LIABILITY</div>
          <div style={{ fontFamily: serif, fontSize: 96, color: C.oliveDeep, fontWeight: 700 }}>
            <Counter to={4210} start={70} end={170} prefix="$" />
          </div>
          <div style={{ fontFamily: sans, fontSize: 28, color: C.inkMuted }}>owed to viewers, in USDC</div>
        </Card>
      </Rise>
      <Character src="vignette-exchange.png" width={330} delay={150} style={{ left: 800, top: 640 }} />
      <Rise delay={170} scale style={{ position: "absolute", right: 140, top: 680 }}>
        <Sfx name="pop" at={170} />
        <div style={{ width: 600, fontFamily: serif, fontSize: 40, color: C.olive, textAlign: "center" }}>
          Lumbung = the AI treasurer 🌾
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

/* 3. Overview dashboard */
const Bar: React.FC<{ label: string; used: number; cap: number; delay: number; color: string }> = ({ label, used, cap, delay, color }) => {
  const t = useLinear(delay, delay + 45);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontSize: 26, color: C.inkMuted }}>
        <span>{label}</span>
        <span style={{ fontFamily: mono }}>
          ${(used * t).toFixed(0)} / ${cap}
        </span>
      </div>
      <div style={{ height: 22, background: C.paperAlt, borderRadius: 11, marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(used / cap) * 100 * t}%`, background: color, borderRadius: 11 }} />
      </div>
    </div>
  );
};

const Gauge: React.FC<{ value: number; max: number; delay: number; label: string; color?: string; from?: number }> = ({
  value,
  max,
  delay,
  label,
  color = C.sage,
  from = 0,
}) => {
  const t = useLinear(delay, delay + 60);
  const v = from + (value - from) * t;
  const r = 120;
  const circ = Math.PI * r;
  return (
    <div style={{ position: "relative", width: 300, height: 180 }}>
      <svg width={300} height={170} viewBox="0 0 300 170">
        <path d="M30 150 A120 120 0 0 1 270 150" stroke={C.paperAlt} strokeWidth={26} fill="none" strokeLinecap="round" />
        <path
          d="M30 150 A120 120 0 0 1 270 150"
          stroke={color}
          strokeWidth={26}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(1, v / max))}
        />
      </svg>
      <div style={{ position: "absolute", top: 80, width: 300, textAlign: "center" }}>
        <div style={{ fontFamily: serif, fontSize: 56, fontWeight: 700, color: C.oliveDeep }}>{v.toFixed(2)}×</div>
        <div style={{ fontFamily: mono, fontSize: 20, color: C.muted }}>{label}</div>
      </div>
    </div>
  );
};

export const Overview: React.FC<P> = () => {
  const stats = [
    { k: "VAULT BALANCE", v: <Counter to={7580} start={20} end={80} prefix="$" />, d: 15 },
    { k: "LIABILITY", v: <Counter to={4210} start={30} end={90} prefix="$" />, d: 25 },
    { k: "RUNWAY", v: <Counter to={12} start={40} end={100} suffix=" days" />, d: 35 },
  ];
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Overview" title="The treasury, against every promise" />
      <div style={{ position: "absolute", top: 290, left: 110, display: "flex", gap: 30 }}>
        {stats.map((s) => (
          <Rise key={s.k} delay={s.d} scale>
            <Sfx name="pop" at={s.d} />
            <Card style={{ width: 360 }}>
              <div style={{ fontFamily: mono, color: C.muted, fontSize: 22 }}>{s.k}</div>
              <div style={{ fontFamily: serif, fontSize: 64, fontWeight: 700, color: C.oliveDeep }}>{s.v}</div>
            </Card>
          </Rise>
        ))}
      </div>
      <Rise delay={50} x={120} y={0} style={{ position: "absolute", top: 290, right: 110 }}>
        <Card style={{ width: 460, ...center, flexDirection: "column" }}>
          <Gauge value={1.8} max={2.5} delay={60} label="RESERVE RATIO" />
        </Card>
      </Rise>
      <Rise delay={110} style={{ position: "absolute", top: 530, left: 110 }}>
        <Card style={{ width: 1140 }}>
          <div style={{ fontFamily: mono, color: C.gold, fontSize: 22, marginBottom: 18 }}>DAILY BUDGETS · ENFORCED ON-CHAIN</div>
          <Bar label="Viewer redemptions" used={142} cap={300} delay={120} color={C.sage} />
          <Bar label="Creator payouts" used={60} cap={200} delay={135} color={C.gold} />
          <Bar label="Ops" used={12} cap={50} delay={150} color={C.blue} />
        </Card>
      </Rise>
      <Rise delay={200} scale style={{ position: "absolute", top: 600, right: 110 }}>
        <Sfx name="ding" at={200} />
        <Card style={{ width: 460, background: C.goldLight, borderColor: C.gold, display: "flex", gap: 16, alignItems: "center" }}>
          <Illo src="vignette-keeper.png" style={{ width: 190, objectFit: "contain" }} />
          <div style={{ fontFamily: serif, fontSize: 28, color: C.ink }}>
            Caps live in the vault contract. The agent can’t override them.
          </div>
        </Card>
      </Rise>
    </AbsoluteFill>
  );
};

/* 4. Redeem flow */
const FlowNode: React.FC<{ icon: string; label: string; sub: string; delay: number; active: boolean }> = ({ icon, label, sub, delay, active }) => {
  const frame = useCurrentFrame();
  const pulse = active ? 1 + Math.sin(frame / 5) * 0.04 : 1;
  return (
    <Rise delay={delay} scale>
      <div
        style={{
          width: 300,
          height: 260,
          borderRadius: 26,
          background: active ? C.sageLight : C.paper,
          border: `3px solid ${active ? C.sage : C.rule}`,
          ...center,
          flexDirection: "column",
          transform: `scale(${pulse})`,
          boxShadow: active ? "0 0 40px rgba(147,189,99,0.45)" : "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: 76 }}>{icon}</div>
        <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, color: C.ink, marginTop: 6 }}>{label}</div>
        <div style={{ fontFamily: mono, fontSize: 19, color: C.muted, marginTop: 6 }}>{sub}</div>
      </div>
    </Rise>
  );
};

export const Redeem: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const steps = [40, 95, 160, 225];
  const active = steps.filter((s) => frame >= s).length - 1;
  const packetT = interpolate(frame, [steps[0], steps[3]], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nodes = [
    { icon: "📱", label: "Redeem", sub: "viewer · $2.50" },
    { icon: "🧠", label: "Agent", sub: "reads live state" },
    { icon: "📏", label: "Hard rules", sub: "R1–R12 pass" },
    { icon: "🏦", label: "Vault pays", sub: "Circle agent wallet" },
  ];
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Redeem" title="Points become USDC in seconds" />
      {steps.map((s, i) => (
        <Sfx key={i} name={i === 3 ? "success" : "click"} at={s} />
      ))}
      <div style={{ position: "absolute", top: 320, left: 110, right: 110, display: "flex", justifyContent: "space-between" }}>
        {nodes.map((n, i) => (
          <FlowNode key={n.label} {...n} delay={10 + i * 10} active={active === i} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 446, left: 410, width: 1100, height: 8, background: C.rule, borderRadius: 4 }}>
        <div style={{ width: `${(packetT / 3) * 100}%`, height: "100%", background: C.sage, borderRadius: 4 }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 430,
          left: 395 + (packetT / 3) * 1100,
          width: 40,
          height: 40,
          opacity: frame > steps[0] && frame < steps[3] + 10 ? 1 : 0,
        }}
      >
        <Illo
          src="vignette-messenger.png"
          style={{
            width: 190,
            position: "absolute",
            left: -95,
            top: -150 + Math.abs(Math.sin(frame / 4)) * -14,
            objectFit: "contain",
          }}
        />
      </div>
      <Rise delay={235} y={60} style={{ position: "absolute", top: 640, left: 110, right: 110 }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Badge tone="pay" size={34}>
            PAID ✓
          </Badge>
          <div style={{ fontFamily: mono, fontSize: 26, color: C.inkMuted, flex: 1 }}>
            <Typed text="tx 0x7c1e…a94f · Paid(user, 2.50 USDC, reasonHash)" start={245} />
          </div>
          <div style={{ fontFamily: sans, fontSize: 28, color: C.olive, textAlign: "right" }}>
            <b>
              <Counter to={0.8} start={245} end={280} decimals={1} suffix=" s" />
            </b>{" "}
            · ~$0.01 fee
          </div>
        </Card>
      </Rise>
    </AbsoluteFill>
  );
};

/* 5. Decision detail + verify reasonHash */
const rules = [
  ["R1", "Amount ≤ per-tx cap"],
  ["R2", "Daily budget remaining"],
  ["R4", "Wallet address valid"],
  ["R6", "Reserve ratio ≥ 1.2"],
  ["R9", "Velocity within limit"],
];

export const Verify: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [70, 170], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const verifyAt = 170;
  const matched = frame > verifyAt + 30;
  const spin = interpolate(frame, [verifyAt, verifyAt + 30], [0, 720], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Transparency" title="Every decision, verifiable" />
      <Character src="vignette-verify.png" width={340} delay={60} from="right" style={{ right: 60 + sweep * 560, top: 40, zIndex: 5 }} />
      <Rise delay={10} x={-80} y={0} style={{ position: "absolute", top: 290, left: 110 }}>
        <Card style={{ width: 780 }}>
          <div style={{ fontFamily: mono, color: C.gold, fontSize: 22, marginBottom: 14 }}>RULE CHECKS</div>
          {rules.map(([id, name], i) => (
            <Rise key={id} delay={25 + i * 12} x={-40} y={0}>
              <Sfx name="tick" at={25 + i * 12} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: `1px solid ${C.rule}`,
                  fontFamily: sans,
                  fontSize: 28,
                }}
              >
                <span>
                  <b style={{ fontFamily: mono, color: C.olive }}>{id}</b> {name}
                </span>
                <Badge tone="pay" size={18}>
                  PASS
                </Badge>
              </div>
            </Rise>
          ))}
        </Card>
      </Rise>
      <Rise delay={60} x={80} y={0} style={{ position: "absolute", top: 290, right: 110 }}>
        <Card style={{ width: 860 }}>
          <div style={{ fontFamily: mono, color: C.gold, fontSize: 22 }}>AGENT REASONING</div>
          <div style={{ fontFamily: serif, fontSize: 30, color: C.ink, lineHeight: 1.45, marginTop: 12, minHeight: 180 }}>
            <Typed
              text="First redeem today, normal size, reserve healthy at 1.8×. All hard rules pass — paying."
              start={70}
              cps={32}
            />
          </div>
          <div style={{ fontFamily: mono, fontSize: 20, color: C.muted, marginTop: 18, wordBreak: "break-all" }}>
            reasonHash = keccak256(canonical(decision))
            <br />
            <span style={{ color: C.olive }}>0x3fa9c2…e81b04d7</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 26 }}>
            <Sfx name="click" at={verifyAt} />
            {matched && <Sfx name="success" at={verifyAt + 30} />}
            <div
              style={{
                padding: "16px 30px",
                borderRadius: 14,
                background: matched ? C.sage : C.oliveDeep,
                color: C.paper,
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 28,
                transform: `scale(${frame > verifyAt && frame < verifyAt + 6 ? 0.94 : 1})`,
              }}
            >
              {matched ? "✓ Matches on-chain event" : "Verify reasonHash"}
            </div>
            {!matched && frame > verifyAt && (
              <div style={{ fontSize: 40, transform: `rotate(${spin}deg)` }}>⟳</div>
            )}
          </div>
        </Card>
      </Rise>
    </AbsoluteFill>
  );
};

/* 6. Velocity: hold / escalate */
export const Velocity: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const redeems = [
    { t: "10:02", amt: "$2.00", at: 30, tone: "pay" as const, label: "PAY" },
    { t: "10:21", amt: "$2.00", at: 70, tone: "pay" as const, label: "PAY" },
    { t: "10:39", amt: "$2.00", at: 110, tone: "hold" as const, label: "HOLD" },
  ];
  const shake = frame > 110 && frame < 130 ? Math.sin(frame * 2.5) * 8 : 0;
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Judgment" title="Something looks off? Hold, and say why" />
      <div style={{ position: "absolute", top: 300, left: 110, width: 900 }}>
        {redeems.map((r, i) => (
          <Rise key={i} delay={r.at} x={-100} y={0}>
            <Sfx name={r.tone === "hold" ? "alert" : "pop"} at={r.at} />
            <Card
              style={{
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transform: i === 2 ? `translateX(${shake}px)` : undefined,
                borderColor: i === 2 ? C.gold : C.rule,
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 30, color: C.muted }}>{r.t}</span>
              <span style={{ fontFamily: sans, fontSize: 32 }}>user_0x41… redeems {r.amt}</span>
              <Badge tone={r.tone}>{r.label}</Badge>
            </Card>
          </Rise>
        ))}
      </div>
      <Character src="vignette-keeper.png" width={330} delay={125} from="left" tilt={3} style={{ left: 140, top: 680 }} />
      <Rise delay={135} x={100} y={0} style={{ position: "absolute", top: 300, right: 110 }}>
        <Card style={{ width: 760, background: C.goldLight, borderColor: C.gold }}>
          <div style={{ fontFamily: mono, color: C.gold, fontSize: 22 }}>VELOCITY · 3 REDEEMS / 1 HOUR</div>
          <svg width={690} height={180} style={{ marginTop: 16 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const h = [30, 20, 35, 25, 60, 110, 160][i];
              const t = interpolate(frame, [145 + i * 5, 175 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return <rect key={i} x={i * 98} y={175 - h * t} width={70} height={h * t} rx={8} fill={i >= 5 ? C.gold : C.rule} />;
            })}
          </svg>
          <div style={{ fontFamily: serif, fontSize: 30, color: C.ink, marginTop: 18, lineHeight: 1.4 }}>
            <Typed text="“3× usual pace for this viewer. Holding until the pattern clears.”" start={185} cps={30} />
          </div>
        </Card>
      </Rise>
    </AbsoluteFill>
  );
};

/* 7. Escalation: Telegram + owner approval */
export const Escalate: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const phone = useSpring(70, 12);
  const approveAt = 200;
  const approved = frame > approveAt;
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Human in the loop" title="Over the cap? Ask the owner, on-chain" />
      <Rise delay={15} x={-80} y={0} style={{ position: "absolute", top: 300, left: 110 }}>
        <Sfx name="pop" at={15} />
        <Card style={{ width: 720 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: sans, fontSize: 34 }}>Redeem $40.00</span>
            <Badge tone="escalate">ESCALATE</Badge>
          </div>
          <div style={{ fontFamily: mono, fontSize: 22, color: C.muted, marginTop: 18 }}>
            per-tx cap $25 · ApprovalRequested(id 17)
          </div>
          <div style={{ marginTop: 30, height: 14, background: C.paperAlt, borderRadius: 7, overflow: "hidden" }}>
            <div
              style={{
                width: `${interpolate(frame, [30, 70], [0, 160], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}%`,
                height: "100%",
                background: C.blue,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 18, color: C.muted, marginTop: 6 }}>
            <span>$0</span>
            <span>cap $25</span>
          </div>
        </Card>
      </Rise>
      <Sfx name="alert" at={75} />
      <Illo
        src="vignette-messenger.png"
        style={{
          position: "absolute",
          width: 260,
          objectFit: "contain",
          top: 560,
          left: interpolate(frame, [40, 85], [700, 1300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          opacity: interpolate(frame, [40, 48, 78, 88], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <Character src="vignette-exchange.png" width={300} delay={approveAt + 25} style={{ left: 120, top: 720 }} />
      <div
        style={{
          position: "absolute",
          top: 270,
          right: 200,
          width: 470,
          height: 640,
          borderRadius: 54,
          background: C.ink,
          padding: 18,
          transform: `translateY(${(1 - phone) * 500}px) rotate(${(1 - phone) * 12}deg)`,
        }}
      >
        <div style={{ background: "#e7eef3", borderRadius: 40, height: "100%", padding: 24, fontFamily: sans }}>
          <div style={{ fontSize: 22, color: C.muted, textAlign: "center" }}>Telegram · Lumbung bot</div>
          <Rise delay={85} scale>
            <div style={{ background: "white", borderRadius: 20, padding: 20, marginTop: 24, fontSize: 25, lineHeight: 1.4 }}>
              ⚠️ <b>Approval needed</b>
              <br />
              $40.00 redeem, over cap.
              <br />
              Agent recommends: <b style={{ color: C.sageDark }}>PAY</b>
            </div>
          </Rise>
          <Rise delay={140} scale>
            <Sfx name="click" at={approveAt} />
            <div
              style={{
                marginTop: 28,
                padding: 22,
                borderRadius: 18,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 28,
                color: "white",
                background: approved ? C.sageDark : C.blue,
                transform: `scale(${frame > approveAt && frame < approveAt + 6 ? 0.92 : 1})`,
              }}
            >
              {approved ? "✓ Approved from wallet" : "Approve in /approvals"}
            </div>
          </Rise>
          {frame > approveAt + 20 && (
            <Rise delay={approveAt + 20} scale>
              <Sfx name="success" at={approveAt + 20} />
              <div style={{ background: C.sageLight, borderRadius: 20, padding: 20, marginTop: 24, fontSize: 25 }}>
                💸 Vault paid $40.00 · ApprovalResolved
              </div>
            </Rise>
          )}
        </div>
      </div>
      <Rise delay={250} style={{ position: "absolute", top: 640, left: 110 }}>
        <div style={{ width: 720, fontFamily: serif, fontSize: 40, color: C.olive }}>
          The human only sees what needs a human.
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

/* 8. Low reserve */
export const Reserve: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const level = interpolate(frame, [20, 90], [0.8, 0.28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Adaptive" title="When the barn runs low" />
      <Rise delay={10} scale style={{ position: "absolute", top: 300, left: 160 }}>
        <div style={{ width: 340, height: 520, borderRadius: 30, border: `6px solid ${C.olive}`, position: "relative", overflow: "hidden", background: C.paper }}>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              height: `${level * 100}%`,
              background: level < 0.4 ? C.gold : C.sage,
              transition: "none",
            }}
          >
            <svg width={340} height={30} style={{ position: "absolute", top: -20 }}>
              <path
                d={`M0 20 Q 42 ${10 + Math.sin(frame / 6) * 10} 85 20 T 170 20 T 255 20 T 340 20 V30 H0 Z`}
                fill={level < 0.4 ? C.gold : C.sage}
              />
            </svg>
          </div>
          <div style={{ position: "absolute", top: 30, width: "100%", textAlign: "center", fontFamily: serif, fontSize: 56, fontWeight: 700, color: C.oliveDeep }}>
            {(level * 2.25).toFixed(2)}×
          </div>
        </div>
      </Rise>
      <Sfx name="alert" at={95} />
      <Character src="vignette-deposit.png" width={250} delay={180} from="left" style={{ left: 20, top: 640, zIndex: 3 }} />
      <div style={{ position: "absolute", top: 300, left: 640, right: 110 }}>
        <Rise delay={100} x={100} y={0}>
          <Sfx name="success" at={100} />
          <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: sans, fontSize: 32 }}>Small redeem · $1.50</span>
            <Badge tone="pay">PAY</Badge>
          </Card>
        </Rise>
        <Rise delay={135} x={100} y={0}>
          <Sfx name="pop" at={135} />
          <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: sans, fontSize: 32 }}>Larger redeem · $18.00</span>
            <Badge tone="hold">HOLD</Badge>
          </Card>
        </Rise>
        <Rise delay={175} scale>
          <Sfx name="ding" at={175} />
          <Card style={{ background: C.oliveDeep, borderColor: C.oliveDeep, color: C.paper }}>
            <div style={{ fontFamily: mono, fontSize: 22, color: C.sage }}>TELEGRAM · LOW RESERVE</div>
            <div style={{ fontFamily: serif, fontSize: 34, marginTop: 10 }}>
              Top up <b style={{ color: C.gold }}>$1,450 USDC</b> to restore 1.2× reserve.
            </div>
          </Card>
        </Rise>
      </div>
    </AbsoluteFill>
  );
};

/* 9. Metrics (illustrative numbers, labelled as such) */
export const Metrics: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const viewer = <Character src="vignette-viewer.png" width={330} delay={45} from="right" style={{ right: 110, top: 520 }} />;
  const days = [3, 5, 4, 8, 11, 9, 14];
  const tiles = [
    { k: "VIEWERS PAID", v: 24 },
    { k: "PAYOUTS", v: 61 },
    { k: "DECISIONS", v: 78 },
    { k: "ESCALATIONS", v: 6 },
  ];
  return (
    <AbsoluteFill>
      <SceneTitle kicker="Metrics" title="Public, live, on /metrics" />
      {viewer}
      <div style={{ position: "absolute", top: 290, left: 110, display: "flex", gap: 26 }}>
        {tiles.map((t, i) => (
          <Rise key={t.k} delay={10 + i * 8} scale>
            <Sfx name="pop" at={10 + i * 8} />
            <Card style={{ width: 400 }}>
              <div style={{ fontFamily: mono, fontSize: 22, color: C.muted }}>{t.k}</div>
              <div style={{ fontFamily: serif, fontSize: 72, fontWeight: 700, color: C.oliveDeep }}>
                <Counter to={t.v} start={15 + i * 8} end={60 + i * 8} />
              </div>
            </Card>
          </Rise>
        ))}
      </div>
      <Rise delay={40} style={{ position: "absolute", top: 530, left: 110 }}>
        <Card style={{ width: 1330 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 22 }}>
            <span style={{ color: C.gold }}>PAYOUTS PER DAY</span>
            <span style={{ color: C.muted }}>sample data · real numbers come from /api/public/stats</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40, height: 230, marginTop: 20 }}>
            {days.map((d, i) => {
              const t = interpolate(frame, [50 + i * 6, 80 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return <div key={i} style={{ flex: 1, height: d * 15 * t, background: i === days.length - 1 ? C.sage : C.olive, borderRadius: 10 }} />;
            })}
          </div>
        </Card>
      </Rise>
    </AbsoluteFill>
  );
};

/* 10. Outro */
export const Outro: React.FC<P> = () => {
  const frame = useCurrentFrame();
  const zoom = 1.08 - useLinear(0, 120) * 0.08;
  return (
    <AbsoluteFill>
      <Illo src="lumbung-village-panorama.png" style={{ width: "100%", height: "100%", transform: `scale(${zoom})`, opacity: 0.35 }} />
      <AbsoluteFill style={{ ...center, flexDirection: "column" }}>
        <Sfx name="ding" at={10} />
        <Rise delay={5} scale>
          <Illo src="lumbung-hero-barn.png" style={{ width: 360, height: 360, objectFit: "contain", transform: `scale(${1 + Math.sin(frame / 20) * 0.02})` }} />
        </Rise>
        <Rise delay={15}>
          <div style={{ fontFamily: serif, fontSize: 130, fontWeight: 700, color: C.oliveDeep }}>Lumbung</div>
        </Rise>
        <Rise delay={28}>
          <div style={{ fontFamily: sans, fontSize: 42, color: C.inkMuted }}>The village barn, run by an agent.</div>
        </Rise>
        <Rise delay={45} scale>
          <div style={{ marginTop: 34 }}>
            <Badge tone="pay">BUILT ON ARC · CIRCLE</Badge>
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
