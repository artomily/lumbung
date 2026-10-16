// Generates narration WAVs with the local macOS `say` voice and writes durations for the composition.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const voice = process.env.VOICE ?? "Samantha";
const rate = process.env.RATE ?? "175";
const lines = JSON.parse(readFileSync("src/narration.json", "utf8"));
const durations = {};
for (const { id, text } of lines) {
  const aiff = `public/voice/${id}.aiff`;
  const wav = `public/voice/${id}.wav`;
  execFileSync("say", ["-v", voice, "-r", rate, "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "48000", "-ac", "2", wav]);
  execFileSync("rm", [aiff]);
  const sec = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString());
  durations[id] = Math.round(sec * 1000) / 1000;
  console.log(id.padEnd(10), durations[id] + "s");
}
writeFileSync("src/durations.json", JSON.stringify(durations, null, 2) + "\n");
