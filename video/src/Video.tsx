import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import durations from "./durations.json";
import narration from "./narration.json";
import { Caption, SceneShell } from "./ui";
import { Escalate, Intro, Metrics, Overview, Problem, Redeem, Reserve, Velocity, Verify, Outro } from "./scenes/Scenes";

export const FPS = 30;
const LEAD = 12; // frames of animation before the voice starts
const TAIL = 24; // breathing room after the voice ends

const scenes: Record<string, React.FC<{ dur: number }>> = {
  intro: Intro,
  problem: Problem,
  overview: Overview,
  redeem: Redeem,
  verify: Verify,
  velocity: Velocity,
  escalate: Escalate,
  reserve: Reserve,
  metrics: Metrics,
  outro: Outro,
};

export const timeline = narration.map(({ id, text }) => ({
  id,
  text,
  dur: LEAD + Math.ceil((durations as Record<string, number>)[id] * FPS) + TAIL,
}));

export const TOTAL = timeline.reduce((a, s) => a + s.dur, 0);

export const LumbungDemo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill>
      {timeline.map((s) => {
        const Scene = scenes[s.id];
        const start = from;
        from += s.dur;
        return (
          <Sequence key={s.id} from={start} durationInFrames={s.dur} name={s.id}>
            <SceneShell duration={s.dur}>
              <Scene dur={s.dur} />
              {s.id !== "intro" && s.id !== "outro" && <Caption text={s.text} />}
            </SceneShell>
            <Sequence from={LEAD} layout="none">
              <Audio src={staticFile(`voice/${s.id}.wav`)} volume={1} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
