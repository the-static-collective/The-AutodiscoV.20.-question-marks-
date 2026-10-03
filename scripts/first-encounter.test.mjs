import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildFirstEncounterPacket,
  runFirstEncounter,
} from "./first-encounter.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>';
const DIGEST = crypto.createHash("sha256").update(SVG, "utf8").digest("hex");
const REQUEST = {
  schema: "autodisco.first-encounter-request/v0",
  artifact: {
    media_type: "image/svg+xml",
    sha256: DIGEST,
    text: SVG,
  },
};

test("packet contains only the bounded artifact and explicit isolation law", () => {
  const packet = buildFirstEncounterPacket(REQUEST);
  assert.equal(packet.source.sha256, DIGEST);
  assert.equal(packet.content, SVG);
  assert.equal(packet.listener.memory_mode, "isolated-first-encounter");
  assert.equal(Object.hasOwn(packet, "history"), false);
  assert.equal(Object.hasOwn(packet, "prior_interpretations"), false);
  assert.ok(packet.prohibitions.includes("NO HIDDEN HOUSE HISTORY"));
});

test("extra context fields are refused rather than silently fed to the listener", () => {
  assert.throws(
    () => buildFirstEncounterPacket({ ...REQUEST, history: ["secret"] }),
    /INVALID_FIRST_ENCOUNTER_REQUEST/,
  );
});

test("without a real Gemini key, the result is packet-only and never simulated", async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await runFirstEncounter(REQUEST);
    assert.equal(result.status, "packet-only");
    assert.equal(result.response, null);
    assert.equal(result.model_used, null);
    assert.ok(result.laws.includes("SIMULATION != FIRST ENCOUNTER"));
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
  }
});

test("CLI preserves packet-only truth when key is unavailable", async () => {
  const child = spawn(
    process.execPath,
    [path.join(HERE, "first-encounter.mjs")],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, GEMINI_API_KEY: "" },
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const closed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  child.stdin.end(JSON.stringify(REQUEST));
  const code = await closed;
  assert.equal(code, 0, stderr);
  const result = JSON.parse(stdout);
  assert.equal(result.status, "packet-only");
  assert.equal(result.packet.source.sha256, DIGEST);
});
