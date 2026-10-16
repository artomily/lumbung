// Synthesizes the sound effects with ffmpeg so no third-party audio is needed.
import { execFileSync } from "node:child_process";

const fx = {
  whoosh: "anoisesrc=d=0.6:c=pink:a=0.6,highpass=f=400,lowpass=f=3000,afade=t=in:d=0.25,afade=t=out:st=0.3:d=0.3",
  pop: "sine=f=880:d=0.09,afade=t=out:st=0.02:d=0.07",
  click: "sine=f=1800:d=0.03,afade=t=out:d=0.03",
  ding: "sine=f=1318:d=0.9,afade=t=out:st=0.05:d=0.85",
  success: "sine=f=784:d=0.18,afade=t=out:st=0.1:d=0.08[a];sine=f=1175:d=0.5,afade=t=out:st=0.1:d=0.4[b];[a][b]concat=n=2:v=0:a=1",
  alert: "sine=f=660:d=0.12[a];sine=f=0:d=0.06[s];sine=f=660:d=0.12[b];[a][s][b]concat=n=3:v=0:a=1,afade=t=out:st=0.25:d=0.05",
  tick: "sine=f=2400:d=0.015",
  rise: "sine=f=300:d=0.7,vibrato=f=6:d=0.2,afade=t=in:d=0.5,afade=t=out:st=0.55:d=0.15",
};
for (const [name, graph] of Object.entries(fx)) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-filter_complex", graph, "-ar", "48000", "-ac", "2", `public/sfx/${name}.wav`]);
  console.log("sfx", name);
}
