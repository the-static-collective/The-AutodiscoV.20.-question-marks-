#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const DIGEST_RE = /^[0-9a-f]{64}$/;
const MODES = new Set(["OBSERVED", "DERIVED", "METAPHOR", "INTERPRETATION"]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(code);
  const actual = Object.keys(value).sort().join("|");
  const expected = [...keys].sort().join("|");
  if (actual !== expected) throw new TypeError(code);
}

export function buildFirstEncounterPacket(request) {
  exactKeys(request, ["schema", "artifact"], "INVALID_FIRST_ENCOUNTER_REQUEST");
  if (request.schema !== "autodisco.first-encounter-request/v0") {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_SCHEMA");
  }
  exactKeys(
    request.artifact,
    ["media_type", "sha256", "text"],
    "INVALID_FIRST_ENCOUNTER_ARTIFACT"
  );
  if (request.artifact.media_type !== "image/svg+xml") {
    throw new TypeError("FIRST_ENCOUNTER_REQUIRES_SVG");
  }
  if (!DIGEST_RE.test(request.artifact.sha256)) {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_DIGEST");
  }
  if (
    typeof request.artifact.text !== "string" ||
    request.artifact.text.length === 0 ||
    request.artifact.text.length > 200_000
  ) {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_CONTENT");
  }
  if (sha256(request.artifact.text) !== request.artifact.sha256) {
    throw new TypeError("FIRST_ENCOUNTER_ARTIFACT_HASH_MISMATCH");
  }

  const body = {
    schema: "autodisco.first-encounter-packet/v0",
    listener: {
      role: "The New Listener",
      memory_mode: "isolated-first-encounter",
    },
    source: {
      media_type: request.artifact.media_type,
      sha256: request.artifact.sha256,
    },
    content: request.artifact.text,
    prohibitions: [
      "NO CATALOG HISTORY",
      "NO PRIOR DJ TRANSCRIPTS",
      "NO MOTIF RETRIEVAL",
      "NO HIDDEN HOUSE HISTORY",
      "NO SIMULATED FIRST RESPONSE",
    ],
  };
  return {
    ...body,
    packet_id: `autodisco-first-encounter-v0:${sha256(canonical(body))}`,
  };
}

function validGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.startsWith("AIzaSy")) return false;
  const lower = key.toLowerCase();
  return !["placeholder", "your_api_key", "mock", "undefined", "null"].some((x) =>
    lower.includes(x)
  );
}

function validateResponse(value) {
  exactKeys(
    value,
    ["observations", "lingering_intrigue", "closing_line"],
    "INVALID_FIRST_ENCOUNTER_RESPONSE"
  );
  if (!Array.isArray(value.observations) || value.observations.length < 2 || value.observations.length > 8) {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_OBSERVATIONS");
  }
  for (const observation of value.observations) {
    exactKeys(observation, ["mode", "text"], "INVALID_FIRST_ENCOUNTER_OBSERVATION");
    if (!MODES.has(observation.mode) || typeof observation.text !== "string" || !observation.text.trim()) {
      throw new TypeError("INVALID_FIRST_ENCOUNTER_OBSERVATION");
    }
  }
  if (typeof value.lingering_intrigue !== "boolean") {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_INTRIGUE");
  }
  if (typeof value.closing_line !== "string" || !value.closing_line.trim()) {
    throw new TypeError("INVALID_FIRST_ENCOUNTER_CLOSING");
  }
  return value;
}

export async function runFirstEncounter(request) {
  const packet = buildFirstEncounterPacket(request);
  if (!validGeminiKey()) {
    return {
      schema: "autodisco.first-encounter-result/v0",
      status: "packet-only",
      packet,
      response: null,
      model_used: null,
      laws: [
        "PACKET != RESPONSE",
        "SIMULATION != FIRST ENCOUNTER",
        "STATION MEMORY != DJ MEMORY",
      ],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.FIRST_ENCOUNTER_MODEL || "gemini-3.5-flash";
  const prompt = `You are "The New Listener". This is your first and only exposure to this artifact.

You have NO catalog history, NO prior interpretations, NO author biography, NO motif retrieval, and NO hidden conversation context. Do not infer any.

Artifact media type: ${packet.source.media_type}
Artifact SHA-256: ${packet.source.sha256}

Artifact begins:
---BEGIN SVG---
${packet.content}
---END SVG---

Return JSON only:
{
  "observations": [
    {"mode":"OBSERVED","text":"..."},
    {"mode":"DERIVED","text":"..."},
    {"mode":"METAPHOR","text":"..."},
    {"mode":"INTERPRETATION","text":"..."}
  ],
  "lingering_intrigue": true,
  "closing_line": "one concise line"
}

Keep OBSERVED strictly visible/formal. Keep DERIVED as cautious inference from the artifact itself. Mark figurative language METAPHOR. Mark subjective reading INTERPRETATION.`;

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.45,
      maxOutputTokens: 700,
    },
  });
  const parsed = validateResponse(JSON.parse(response.text || "{}"));
  const responseText = canonical(parsed);
  return {
    schema: "autodisco.first-encounter-result/v0",
    status: "responded",
    packet,
    response: parsed,
    response_sha256: sha256(responseText),
    model_used: model,
    laws: [
      "FIRST RESPONSE PRECEDES DIALOGUE",
      "STATION MEMORY != DJ MEMORY",
      "OBSERVATION != INTERPRETATION",
      "FIRST ENCOUNTER != AUTHORITY",
    ],
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) throw new TypeError("JSON request required");
    const result = await runFirstEncounter(JSON.parse(raw));
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "first encounter failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
