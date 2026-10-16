import React from "react";
import { Composition } from "remotion";
import { FPS, LumbungDemo, TOTAL } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition id="LumbungDemo" component={LumbungDemo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
