#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const DIGEST_RE = /^[0-9a-f]{64}$/;
const MODES = new Set(["OBSERVED", "DERIVED", "METAPHOR", "INTERPRETATION"]);
const LISTENERS = Object.freeze([
  Object.freeze({
    id: "static-sam",
    role: "Static Sam",
    brief: "Dry, intimate, attentive to continuity and formal residue. Do not pretend prior familiarity.",
  }),
  Object.freeze({
    id: "juniper",
    role: "Juniper",
    brief: "Emotionally exact and unhurried. Distinguish visible fact from felt interpretation.",
  }),
]);

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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(code);
  }
  const actual = Object.keys(value).sort().join("|");
  const expected = [...keys].sort().join("|");
  if (actual !== expected) throw new TypeError(code);
}

function validateArtifact(artifact) {
  exactKeys(artifact, ["media_type", "sha256", "text"], "INVALID_LOOK_TWICE_ARTIFACT");
  if (artifact.media_type !== "image/svg+xml") {
    throw new TypeError("LOOK_TWICE_REQUIRES_SVG");
  }
  if (!DIGEST_RE.test(artifact.sha256)) {
    throw new TypeError("INVALID_LOOK_TWICE_DIGEST");
  }
  if (
    typeof artifact.text !== "string" ||
    artifact.text.length === 0 ||
    artifact.text.length > 200_000
  ) {
    throw new TypeError("INVALID_LOOK_TWICE_CONTENT");
  }
  if (sha256(artifact.text) !== artifact.sha256) {
    throw new TypeError("LOOK_TWICE_ARTIFACT_HASH_MISMATCH");
  }
}

function packetBody(artifact, listener) {
  return {
    schema: "autodisco.look-twice-first-packet/v0",
    listener,
    source: {
      media_type: artifact.media_type,
      sha256: artifact.sha256,
    },
    content: artifact.text,
    prohibitions: [
      "NO CATALOG HISTORY",
      "NO PRIOR DJ TRANSCRIPTS",
      "NO OTHER LISTENER RESPONSE",
      "NO MOTIF RETRIEVAL",
      "NO HIDDEN HOUSE HISTORY",
      "NO SIMULATED FIRST RESPONSE",
    ],
  };
}

function withPacketId(body) {
  return {
    ...body,
    packet_id: `autodisco-look-twice-first-v0:${sha256(canonical(body))}`,
  };
}

export function prepareLookTwice(request) {
  exactKeys(request, ["schema", "artifact"], "INVALID_LOOK_TWICE_PREPARE_REQUEST");
  if (request.schema !== "autodisco.look-twice-prepare-request/v0") {
    throw new TypeError("INVALID_LOOK_TWICE_PREPARE_SCHEMA");
  }
  validateArtifact(request.artifact);

  const packets = LISTENERS.map((listener) =>
    withPacketId(packetBody(request.artifact, listener))
  );
  const pairBody = {
    schema: "autodisco.look-twice-pair/v0",
    source: {
      media_type: request.artifact.media_type,
      sha256: request.artifact.sha256,
    },
    packets,
    laws: [
      "SAME ARTIFACT != SHARED CONTEXT",
      "FIRST RESPONSE PRECEDES CROSS-READ",
      "STATION MEMORY != DJ MEMORY",
      "PAIR != DIALOGUE",
    ],
  };
  return {
    ...pairBody,
    pair_id: `autodisco-look-twice-pair-v0:${sha256(canonical(pairBody))}`,
  };
}

export function verifyPair(pair) {
  exactKeys(
    pair,
    ["schema", "source", "packets", "laws", "pair_id"],
    "INVALID_LOOK_TWICE_PAIR",
  );
  if (pair.schema !== "autodisco.look-twice-pair/v0") {
    throw new TypeError("INVALID_LOOK_TWICE_PAIR_SCHEMA");
  }
  if (!Array.isArray(pair.packets) || pair.packets.length !== 2) {
    throw new TypeError("LOOK_TWICE_REQUIRES_TWO_PACKETS");
  }
  const listenerIds = new Set();
  for (const packet of pair.packets) {
    exactKeys(
      packet,
      ["schema", "listener", "source", "content", "prohibitions", "packet_id"],
      "INVALID_LOOK_TWICE_FIRST_PACKET",
    );
    if (packet.schema !== "autodisco.look-twice-first-packet/v0") {
      throw new TypeError("INVALID_LOOK_TWICE_FIRST_PACKET_SCHEMA");
    }
    if (packet.source?.sha256 !== pair.source?.sha256) {
      throw new TypeError("LOOK_TWICE_SOURCE_MISMATCH");
    }
    const expectedPacket = withPacketId({
      schema: packet.schema,
      listener: packet.listener,
      source: packet.source,
      content: packet.content,
      prohibitions: packet.prohibitions,
    });
    if (packet.packet_id !== expectedPacket.packet_id) {
      throw new TypeError("LOOK_TWICE_PACKET_ID_MISMATCH");
    }
    if (!packet.listener?.id || listenerIds.has(packet.listener.id)) {
      throw new TypeError("LOOK_TWICE_LISTENER_IDENTITY_COLLISION");
    }
    listenerIds.add(packet.listener.id);
  }
  const expectedPair = {
    schema: pair.schema,
    source: pair.source,
    packets: pair.packets,
    laws: pair.laws,
  };
  const expectedId = `autodisco-look-twice-pair-v0:${sha256(canonical(expectedPair))}`;
  if (pair.pair_id !== expectedId) {
    throw new TypeError("LOOK_TWICE_PAIR_ID_MISMATCH");
  }
  return pair;
}

function validateFirstResponse(value) {
  exactKeys(
    value,
    ["observations", "lingering_intrigue", "closing_line"],
    "INVALID_LOOK_TWICE_FIRST_RESPONSE",
  );
  if (
    !Array.isArray(value.observations) ||
    value.observations.length < 2 ||
    value.observations.length > 8
  ) {
    throw new TypeError("INVALID_LOOK_TWICE_FIRST_OBSERVATIONS");
  }
  for (const item of value.observations) {
    exactKeys(item, ["mode", "text"], "INVALID_LOOK_TWICE_OBSERVATION");
    if (
      !MODES.has(item.mode) ||
      typeof item.text !== "string" ||
      !item.text.trim()
    ) {
      throw new TypeError("INVALID_LOOK_TWICE_OBSERVATION");
    }
  }
  if (typeof value.lingering_intrigue !== "boolean") {
    throw new TypeError("INVALID_LOOK_TWICE_FIRST_INTRIGUE");
  }
  if (typeof value.closing_line !== "string" || !value.closing_line.trim()) {
    throw new TypeError("INVALID_LOOK_TWICE_FIRST_CLOSING");
  }
  return value;
}

export function sealFirstResponse(pair, packetId, response, modelUsed) {
  verifyPair(pair);
  const packet = pair.packets.find((item) => item.packet_id === packetId);
  if (!packet) throw new TypeError("LOOK_TWICE_RESPONSE_PACKET_NOT_IN_PAIR");
  if (typeof modelUsed !== "string" || !modelUsed.trim()) {
    throw new TypeError("LOOK_TWICE_RESPONSE_MODEL_REQUIRED");
  }
  const validated = validateFirstResponse(response);
  const responseSha256 = sha256(canonical(validated));
  const body = {
    schema: "autodisco.look-twice-first-response/v0",
    pair_id: pair.pair_id,
    packet_id: packet.packet_id,
    listener: packet.listener,
    source_sha256: packet.source.sha256,
    model_used: modelUsed,
    response_sha256: responseSha256,
    response: validated,
    laws: [
      "SEALED FIRST RESPONSE != DIALOGUE",
      "FIRST RESPONSE IDENTITY IS IMMUTABLE",
      "OBSERVATION != INTERPRETATION",
    ],
  };
  return {
    ...body,
    first_response_id: `autodisco-look-twice-response-v0:${sha256(canonical(body))}`,
  };
}

export function verifySealedResponses(pair, responses) {
  verifyPair(pair);
  if (!Array.isArray(responses) || responses.length !== 2) {
    throw new TypeError("LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES");
  }
  const ids = new Set();
  const packetIds = new Set();
  for (const sealed of responses) {
    exactKeys(
      sealed,
      [
        "schema", "pair_id", "packet_id", "listener", "source_sha256",
        "model_used", "response_sha256", "response", "laws", "first_response_id",
      ],
      "INVALID_LOOK_TWICE_SEALED_RESPONSE",
    );
    if (
      sealed.schema !== "autodisco.look-twice-first-response/v0" ||
      sealed.pair_id !== pair.pair_id ||
      sealed.source_sha256 !== pair.source.sha256
    ) {
      throw new TypeError("LOOK_TWICE_SEALED_RESPONSE_BINDING_MISMATCH");
    }
    const packet = pair.packets.find((item) => item.packet_id === sealed.packet_id);
    if (!packet || packet.listener.id !== sealed.listener?.id) {
      throw new TypeError("LOOK_TWICE_SEALED_RESPONSE_LISTENER_MISMATCH");
    }
    const expected = sealFirstResponse(
      pair,
      sealed.packet_id,
      sealed.response,
      sealed.model_used,
    );
    if (
      expected.response_sha256 !== sealed.response_sha256 ||
      expected.first_response_id !== sealed.first_response_id
    ) {
      throw new TypeError("LOOK_TWICE_SEALED_RESPONSE_ID_MISMATCH");
    }
    if (ids.has(sealed.first_response_id) || packetIds.has(sealed.packet_id)) {
      throw new TypeError("LOOK_TWICE_DUPLICATE_SEALED_RESPONSE");
    }
    ids.add(sealed.first_response_id);
    packetIds.add(sealed.packet_id);
  }
  return responses;
}

export function buildDialoguePacket(pair, responses) {
  verifySealedResponses(pair, responses);
  const ordered = [...responses].sort((a, b) =>
    a.listener.id.localeCompare(b.listener.id)
  );
  const body = {
    schema: "autodisco.look-twice-dialogue-packet/v0",
    pair_id: pair.pair_id,
    source_sha256: pair.source.sha256,
    sealed_first_responses: ordered.map((sealed) => ({
      first_response_id: sealed.first_response_id,
      listener: sealed.listener,
      response_sha256: sealed.response_sha256,
      response: sealed.response,
    })),
    rules: [
      "ONLY SEALED FIRST RESPONSES MAY ENTER",
      "ORIGINAL ARTIFACT IS NOT REOPENED",
      "NO NEW CATALOG HISTORY",
      "DIALOGUE CANNOT ALTER FIRST RESPONSE IDENTITY",
    ],
  };
  return {
    ...body,
    dialogue_packet_id: `autodisco-look-twice-dialogue-v0:${sha256(canonical(body))}`,
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

function firstPrompt(packet) {
  return `You are ${packet.listener.role}.
Role brief: ${packet.listener.brief}

This is your first and only exposure to this artifact. You have NO catalog history, NO prior interpretations, NO other listener response, NO author biography, NO motif retrieval, and NO hidden conversation context.

Artifact media type: ${packet.source.media_type}
Artifact SHA-256: ${packet.source.sha256}

---BEGIN ARTIFACT---
${packet.content}
---END ARTIFACT---

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

Keep OBSERVED strictly formal/visible. Keep DERIVED cautious. Mark figurative language METAPHOR. Mark subjective reading INTERPRETATION.`;
}

export async function runIsolatedEncounters(request) {
  exactKeys(request, ["schema", "pair"], "INVALID_LOOK_TWICE_ENCOUNTER_REQUEST");
  if (request.schema !== "autodisco.look-twice-encounter-request/v0") {
    throw new TypeError("INVALID_LOOK_TWICE_ENCOUNTER_SCHEMA");
  }
  const pair = verifyPair(request.pair);
  if (!validGeminiKey()) {
    return {
      schema: "autodisco.look-twice-encounter-result/v0",
      status: "packets-only",
      pair_id: pair.pair_id,
      first_responses: [],
      model_used: null,
      laws: [
        "SIMULATION != FIRST ENCOUNTER",
        "ZERO RESPONSES != TWO RESPONSES",
        "NO DIALOGUE BEFORE TWO SEALED RESPONSES",
      ],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const model = process.env.LOOK_TWICE_MODEL || "gemini-3.5-flash";
  const makeClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const rawResponses = await Promise.all(
    pair.packets.map(async (packet) => {
      const client = makeClient();
      const result = await client.models.generateContent({
        model,
        contents: firstPrompt(packet),
        config: {
          responseMimeType: "application/json",
          temperature: 0.5,
          maxOutputTokens: 700,
        },
      });
      return {
        packet,
        response: validateFirstResponse(JSON.parse(result.text || "{}")),
      };
    }),
  );

  const firstResponses = rawResponses.map(({ packet, response }) =>
    sealFirstResponse(pair, packet.packet_id, response, model)
  );
  verifySealedResponses(pair, firstResponses);
  return {
    schema: "autodisco.look-twice-encounter-result/v0",
    status: "two-first-responses-sealed",
    pair_id: pair.pair_id,
    first_responses: firstResponses,
    model_used: model,
    laws: [
      "FIRST RESPONSE PRECEDES CROSS-READ",
      "ISOLATED CALL A != ISOLATED CALL B",
      "SEALED != SHARED",
    ],
  };
}

function validateDialogue(value, listenerIds) {
  exactKeys(
    value,
    ["turns", "convergences", "differences", "lingering_intrigue", "intrigue_statement", "door_seed"],
    "INVALID_LOOK_TWICE_DIALOGUE",
  );
  if (!Array.isArray(value.turns) || value.turns.length < 2 || value.turns.length > 6) {
    throw new TypeError("INVALID_LOOK_TWICE_DIALOGUE_TURNS");
  }
  for (const turn of value.turns) {
    exactKeys(turn, ["listener_id", "text"], "INVALID_LOOK_TWICE_DIALOGUE_TURN");
    if (!listenerIds.has(turn.listener_id) || typeof turn.text !== "string" || !turn.text.trim()) {
      throw new TypeError("INVALID_LOOK_TWICE_DIALOGUE_TURN");
    }
  }
  for (const key of ["convergences", "differences"]) {
    if (!Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string")) {
      throw new TypeError("INVALID_LOOK_TWICE_DIALOGUE_SUMMARY");
    }
  }
  if (typeof value.lingering_intrigue !== "boolean") {
    throw new TypeError("INVALID_LOOK_TWICE_DIALOGUE_INTRIGUE");
  }
  if (typeof value.intrigue_statement !== "string") {
    throw new TypeError("INVALID_LOOK_TWICE_INTRIGUE_STATEMENT");
  }
  if (!(value.door_seed === null || typeof value.door_seed === "string")) {
    throw new TypeError("INVALID_LOOK_TWICE_DOOR_SEED");
  }
  if (!value.lingering_intrigue && value.door_seed !== null) {
    throw new TypeError("LOOK_TWICE_DOOR_SEED_REQUIRES_INTRIGUE");
  }
  return value;
}

function dialoguePrompt(packet) {
  const [a, b] = packet.sealed_first_responses;
  return `Two first responses have already been independently sealed. You are now composing a SHORT cross-read between those same listener roles. Their original first responses are immutable and may not be rewritten.

Source artifact SHA-256: ${packet.source_sha256}

SEALED RESPONSE A
ID: ${a.first_response_id}
Listener: ${a.listener.role} (${a.listener.id})
${JSON.stringify(a.response)}

SEALED RESPONSE B
ID: ${b.first_response_id}
Listener: ${b.listener.role} (${b.listener.id})
${JSON.stringify(b.response)}

The original artifact is deliberately NOT available during this exchange.

Return JSON only:
{
  "turns": [
    {"listener_id":"${a.listener.id}","text":"..."},
    {"listener_id":"${b.listener.id}","text":"..."}
  ],
  "convergences": ["..."],
  "differences": ["..."],
  "lingering_intrigue": true,
  "intrigue_statement": "what still pulls after the exchange",
  "door_seed": "one concise future question or null"
}

Keep the exchange brief. Do not invent source history. A door seed is allowed only when lingering intrigue is true.`;
}

export async function runDialogue(request) {
  exactKeys(
    request,
    ["schema", "pair", "first_responses"],
    "INVALID_LOOK_TWICE_DIALOGUE_REQUEST",
  );
  if (request.schema !== "autodisco.look-twice-dialogue-request/v0") {
    throw new TypeError("INVALID_LOOK_TWICE_DIALOGUE_REQUEST_SCHEMA");
  }
  const pair = verifyPair(request.pair);
  const responses = verifySealedResponses(pair, request.first_responses);
  const packet = buildDialoguePacket(pair, responses);

  if (!validGeminiKey()) {
    return {
      schema: "autodisco.look-twice-dialogue-result/v0",
      status: "dialogue-packet-only",
      dialogue_packet: packet,
      dialogue: null,
      model_used: null,
      laws: [
        "SIMULATION != DIALOGUE",
        "SEALED FIRST RESPONSES REMAIN INTACT",
        "PACKET != EXCHANGE",
      ],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.LOOK_TWICE_DIALOGUE_MODEL || process.env.LOOK_TWICE_MODEL || "gemini-3.5-flash";
  const result = await client.models.generateContent({
    model,
    contents: dialoguePrompt(packet),
    config: {
      responseMimeType: "application/json",
      temperature: 0.55,
      maxOutputTokens: 900,
    },
  });
  const listenerIds = new Set(packet.sealed_first_responses.map((item) => item.listener.id));
  const dialogue = validateDialogue(JSON.parse(result.text || "{}"), listenerIds);
  const dialogueSha256 = sha256(canonical(dialogue));
  const body = {
    schema: "autodisco.look-twice-dialogue-result/v0",
    status: "dialogue-sealed",
    dialogue_packet: packet,
    dialogue,
    dialogue_sha256: dialogueSha256,
    model_used: model,
    laws: [
      "DIALOGUE FOLLOWS TWO SEALED FIRST RESPONSES",
      "DIALOGUE != RETROACTIVE FIRST IMPRESSION",
      "LINGERING INTRIGUE != SOURCE TRUTH",
      "DOOR SEED != CROSSING",
    ],
  };
  return {
    ...body,
    dialogue_id: `autodisco-look-twice-dialogue-result-v0:${sha256(canonical(body))}`,
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
    const request = JSON.parse(raw);
    const action = request?.action;
    let result;
    if (action === "prepare") {
      exactKeys(request, ["action", "request"], "INVALID_LOOK_TWICE_CLI_PREPARE");
      result = prepareLookTwice(request.request);
    } else if (action === "encounter") {
      exactKeys(request, ["action", "request"], "INVALID_LOOK_TWICE_CLI_ENCOUNTER");
      result = await runIsolatedEncounters(request.request);
    } else if (action === "dialogue") {
      exactKeys(request, ["action", "request"], "INVALID_LOOK_TWICE_CLI_DIALOGUE");
      result = await runDialogue(request.request);
    } else {
      throw new TypeError("action must be prepare, encounter, or dialogue");
    }
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "look twice failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
