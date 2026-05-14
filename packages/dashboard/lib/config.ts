import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PulseConfig } from "./types";

let cached: PulseConfig | null = null;

export function getPulseConfig(): PulseConfig {
  if (cached) return cached;
  const path = join(process.cwd(), "pulse.config.json");
  cached = JSON.parse(readFileSync(path, "utf8")) as PulseConfig;
  return cached;
}
