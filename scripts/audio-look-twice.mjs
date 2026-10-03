#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyAudioWindow } from "./audio-window.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const MODES = new Set(["OBSERVED", "DERIVED", "METAPHOR", "INTERPRETATION"]);
const LISTENERS = Object.freeze([
  Object.freeze({
    id: "static-sam",
    role: "Static Sam",
    brief: "Dry and attentive to structure, motion, texture, and continuity. Never pretend prior familiarity.",
  }),
  Object.freeze({
    id: "juniper",
    role: "Juniper",
    brief: "Emotionally exact and unhurried. Keep heard fact separate from felt interpretation.",
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
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(code);
  const actual = Object.keys(value).sort().join("|");
  const expected = [...keys].sort().join("|");
  if (actual !== expected) throw new TypeError(code);
}

function windowRef(window) {
  return {
    window_id: window.window_id,
    source_sha256: window.source.sha256,
    audio_sha256: window.canonical_audio.sha256,
    media_type: window.canonical_audio.media_type,
    requested_bounds: window.requested_bounds,
    duration_ms: window.canonical_audio.duration_ms,
    declared_metadata: window.declared_metadata,
  };
}

function packetBody(ref, listener) {
  return {
    schema: "autodisco.audio-look-twice-first-packet/v0",
    listener,
    window_ref: ref,
    prohibitions: [
      "NO WHOLE TRACK",
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
    packet_id: `autodisco-audio-look-twice-first-v0:${sha256(canonical(body))}`,
  };
}

export function prepareAudioLookTwice(request) {
  exactKeys(request, ["schema", "window"], "INVALID_AUDIO_LOOK_TWICE_PREPARE_REQUEST");
  if (request.schema !== "autodisco.audio-look-twice-prepare-request/v0") {
    throw new TypeError("INVALID_AUDIO_LOOK_TWICE_PREPARE_SCHEMA");
  }
  const window = verifyAudioWindow(request.window);
  const ref = windowRef(window);
  const packets = LISTENERS.map((listener) =>
    withPacketId(packetBody(ref, listener))
  );
  const body = {
    schema: "autodisco.audio-look-twice-pair/v0",
    window_ref: ref,
    packets,
    laws: [
      "WINDOW != WHOLE TRACK",
      "SAME AUDIO WINDOW != SHARED CONTEXT",
      "FIRST LISTEN PRECEDES CROSS-READ",
      "STATION MEMORY != DJ MEMORY",
      "PAIR != DIALOGUE",
    ],
  };
  return {
    ...body,
    pair_id: `autodisco-audio-look-twice-pair-v0:${sha256(canonical(body))}`,
  };
}

export function verifyAudioPair(pair, window = null) {
  exactKeys(
    pair,
    ["schema", "window_ref", "packets", "laws", "pair_id"],
    "INVALID_AUDIO_LOOK_TWICE_PAIR",
  );
  if (pair.schema !== "autodisco.audio-look-twice-pair/v0") {
    throw new TypeError("INVALID_AUDIO_LOOK_TWICE_PAIR_SCHEMA");
  }
  if (!Array.isArray(pair.packets) || pair.packets.length !== 2) {
    throw new TypeError("AUDIO_LOOK_TWICE_REQUIRES_TWO_PACKETS");
  }
  const ids = new Set();
  for (const packet of pair.packets) {
    exactKeys(
      packet,
      ["schema", "listener", "window_ref", "prohibitions", "packet_id"],
      "INVALID_AUDIO_LOOK_TWICE_PACKET",
    );
    if (packet.schema !== "autodisco.audio-look-twice-first-packet/v0") {
      throw new TypeError("INVALID_AUDIO_LOOK_TWICE_PACKET_SCHEMA");
    }
    if (canonical(packet.window_ref) !== canonical(pair.window_ref)) {
      throw new TypeError("AUDIO_LOOK_TWICE_WINDOW_REF_MISMATCH");
    }
    const expected = withPacketId({
      schema: packet.schema,
      listener: packet.listener,
      window_ref: packet.window_ref,
      prohibitions: packet.prohibitions,
    });
    if (packet.packet_id !== expected.packet_id) {
      throw new TypeError("AUDIO_LOOK_TWICE_PACKET_ID_MISMATCH");
    }
    const listenerId = packet.listener?.id;
    if (!listenerId || ids.has(listenerId)) {
      throw new TypeError("AUDIO_LOOK_TWICE_LISTENER_COLLISION");
    }
    ids.add(listenerId);
  }
  const expectedPair = {
    schema: pair.schema,
    window_ref: pair.window_ref,
    packets: pair.packets,
    laws: pair.laws,
  };
  const expectedId = `autodisco-audio-look-twice-pair-v0:${sha256(canonical(expectedPair))}`;
  if (pair.pair_id !== expectedId) {
    throw new TypeError("AUDIO_LOOK_TWICE_PAIR_ID_MISMATCH");
  }
  if (window !== null) {
    const verifiedWindow = verifyAudioWindow(window);
    if (canonical(windowRef(verifiedWindow)) !== canonical(pair.window_ref)) {
      throw new TypeError("AUDIO_LOOK_TWICE_PAIR_WINDOW_BINDING_MISMATCH");
    }
  }
  return pair;
}

function validateFirstResponse(value) {
  exactKeys(
    value,
    ["observations", "lingering_intrigue", "closing_line"],
    "INVALID_AUDIO_FIRST_RESPONSE",
  );
  if (!Array.isArray(value.observations) || value.observations.length < 2 || value.observations.length > 8) {
    throw new TypeError("INVALID_AUDIO_FIRST_OBSERVATIONS");
  }
  for (const item of value.observations) {
    exactKeys(item, ["mode", "text"], "INVALID_AUDIO_FIRST_OBSERVATION");
    if (!MODES.has(item.mode) || typeof item.text !== "string" || !item.text.trim()) {
      throw new TypeError("INVALID_AUDIO_FIRST_OBSERVATION");
    }
  }
  if (typeof value.lingering_intrigue !== "boolean") {
    throw new TypeError("INVALID_AUDIO_FIRST_INTRIGUE");
  }
  if (typeof value.closing_line !== "string" || !value.closing_line.trim()) {
    throw new TypeError("INVALID_AUDIO_FIRST_CLOSING");
  }
  return value;
}

export function sealAudioFirstResponse(pair, packetId, response, modelUsed) {
  verifyAudioPair(pair);
  const packet = pair.packets.find((item) => item.packet_id === packetId);
  if (!packet) throw new TypeError("AUDIO_FIRST_RESPONSE_PACKET_NOT_IN_PAIR");
  if (typeof modelUsed !== "string" || !modelUsed.trim()) {
    throw new TypeError("AUDIO_FIRST_RESPONSE_MODEL_REQUIRED");
  }
  const validated = validateFirstResponse(response);
  const responseSha256 = sha256(canonical(validated));
  const body = {
    schema: "autodisco.audio-look-twice-first-response/v0",
    pair_id: pair.pair_id,
    packet_id: packet.packet_id,
    listener: packet.listener,
    window_id: pair.window_ref.window_id,
    audio_sha256: pair.window_ref.audio_sha256,
    model_used: modelUsed,
    response_sha256: responseSha256,
    response: validated,
    laws: [
      "FIRST LISTEN PRECEDES DIALOGUE",
      "SEALED FIRST LISTEN != DIALOGUE",
      "HEARD != INTERPRETED",
    ],
  };
  return {
    ...body,
    first_response_id: `autodisco-audio-look-twice-response-v0:${sha256(canonical(body))}`,
  };
}

export function verifyAudioFirstResponses(pair, responses) {
  verifyAudioPair(pair);
  if (!Array.isArray(responses) || responses.length !== 2) {
    throw new TypeError("AUDIO_LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES");
  }
  const packetIds = new Set();
  const listenerIds = new Set();
  for (const sealed of responses) {
    exactKeys(
      sealed,
      [
        "schema", "pair_id", "packet_id", "listener", "window_id", "audio_sha256",
        "model_used", "response_sha256", "response", "laws", "first_response_id",
      ],
      "INVALID_AUDIO_SEALED_RESPONSE",
    );
    if (
      sealed.schema !== "autodisco.audio-look-twice-first-response/v0" ||
      sealed.pair_id !== pair.pair_id ||
      sealed.window_id !== pair.window_ref.window_id ||
      sealed.audio_sha256 !== pair.window_ref.audio_sha256
    ) {
      throw new TypeError("AUDIO_SEALED_RESPONSE_BINDING_MISMATCH");
    }
    const packet = pair.packets.find((item) => item.packet_id === sealed.packet_id);
    if (!packet || packet.listener.id !== sealed.listener?.id) {
      throw new TypeError("AUDIO_SEALED_RESPONSE_LISTENER_MISMATCH");
    }
    const expected = sealAudioFirstResponse(
      pair,
      sealed.packet_id,
      sealed.response,
      sealed.model_used,
    );
    if (
      expected.response_sha256 !== sealed.response_sha256 ||
      expected.first_response_id !== sealed.first_response_id
    ) {
      throw new TypeError("AUDIO_SEALED_RESPONSE_ID_MISMATCH");
    }
    if (
      packetIds.has(sealed.packet_id) ||
      listenerIds.has(sealed.listener.id)
    ) {
      throw new TypeError("AUDIO_DUPLICATE_SEALED_RESPONSE");
    }
    packetIds.add(sealed.packet_id);
    listenerIds.add(sealed.listener.id);
  }
  return responses;
}

export function buildAudioDialoguePacket(pair, responses) {
  verifyAudioFirstResponses(pair, responses);
  const ordered = [...responses].sort((a, b) =>
    a.listener.id.localeCompare(b.listener.id)
  );
  const body = {
    schema: "autodisco.audio-look-twice-dialogue-packet/v0",
    pair_id: pair.pair_id,
    window_ref: pair.window_ref,
    sealed_first_responses: ordered.map((sealed) => ({
      first_response_id: sealed.first_response_id,
      listener: sealed.listener,
      response_sha256: sealed.response_sha256,
      response: sealed.response,
    })),
    rules: [
      "ONLY SEALED FIRST LISTENS MAY ENTER",
      "AUDIO WINDOW IS NOT REOPENED",
      "NO WHOLE TRACK",
      "NO CATALOG HISTORY",
      "DIALOGUE CANNOT ALTER FIRST LISTEN IDENTITY",
    ],
  };
  return {
    ...body,
    dialogue_packet_id: `autodisco-audio-look-twice-dialogue-v0:${sha256(canonical(body))}`,
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

function firstListenPrompt(packet) {
  const ref = packet.window_ref;
  return `You are ${packet.listener.role}.
Role brief: ${packet.listener.brief}

This is your first and only exposure to one bounded audio window. You do NOT have the whole track, catalog history, prior DJ transcripts, the other listener's response, artist biography, motif retrieval, or hidden conversation context.

Window label: ${ref.declared_metadata.window_label}
Requested source bounds: ${ref.requested_bounds.start_ms}ms to ${ref.requested_bounds.end_ms}ms
Canonical window duration: ${ref.duration_ms}ms
Canonical audio SHA-256: ${ref.audio_sha256}

Listen only to the attached audio window.

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

Use OBSERVED for what is audibly present: timing, texture, instrumentation, dynamics, voice qualities, repetition, transitions. Keep DERIVED cautious. Mark figurative language METAPHOR. Mark subjective reading INTERPRETATION.`;
}

export async function runAudioIsolatedEncounters(request) {
  exactKeys(
    request,
    ["schema", "pair", "window"],
    "INVALID_AUDIO_ENCOUNTER_REQUEST",
  );
  if (request.schema !== "autodisco.audio-look-twice-encounter-request/v0") {
    throw new TypeError("INVALID_AUDIO_ENCOUNTER_SCHEMA");
  }
  const window = verifyAudioWindow(request.window);
  const pair = verifyAudioPair(request.pair, window);
  if (!validGeminiKey()) {
    return {
      schema: "autodisco.audio-look-twice-encounter-result/v0",
      status: "packets-only",
      pair_id: pair.pair_id,
      window_id: window.window_id,
      first_responses: [],
      model_used: null,
      laws: [
        "SIMULATION != FIRST LISTEN",
        "ZERO RESPONSES != TWO RESPONSES",
        "NO CROSS-READ BEFORE TWO SEALED FIRST LISTENS",
      ],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const model = process.env.AUDIO_LOOK_TWICE_MODEL || "gemini-3.8-flash";
  const audioPart = {
    inlineData: {
      mimeType: window.canonical_audio.media_type,
      data: window.canonical_audio.base64,
    },
  };

  const raw = await Promise.all(
    pair.packets.map(async (packet) => {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await client.models.generateContent({
        model,
        contents: [{
          role: "user",
          parts: [
            { text: firstListenPrompt(packet) },
            audioPart,
          ],
        }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.5,
          maxOutputTokens: 750,
        },
      });
      return {
        packet,
        response: validateFirstResponse(JSON.parse(result.text || "{}")),
      };
    }),
  );

  const firstResponses = raw.map(({ packet, response }) =>
    sealAudioFirstResponse(pair, packet.packet_id, response, model)
  );
  verifyAudioFirstResponses(pair, firstResponses);
  return {
    schema: "autodisco.audio-look-twice-encounter-result/v0",
    status: "two-first-responses-sealed",
    pair_id: pair.pair_id,
    window_id: window.window_id,
    first_responses: firstResponses,
    model_used: model,
    laws: [
      "FIRST LISTEN PRECEDES CROSS-READ",
      "ISOLATED AUDIO CALL A != ISOLATED AUDIO CALL B",
      "SEALED != SHARED",
    ],
  };
}

function validateDialogue(value, listenerIds) {
  exactKeys(
    value,
    ["turns", "convergences", "differences", "lingering_intrigue", "intrigue_statement", "door_seed"],
    "INVALID_AUDIO_DIALOGUE",
  );
  if (!Array.isArray(value.turns) || value.turns.length < 2 || value.turns.length > 6) {
    throw new TypeError("INVALID_AUDIO_DIALOGUE_TURNS");
  }
  for (const turn of value.turns) {
    exactKeys(turn, ["listener_id", "text"], "INVALID_AUDIO_DIALOGUE_TURN");
    if (!listenerIds.has(turn.listener_id) || typeof turn.text !== "string" || !turn.text.trim()) {
      throw new TypeError("INVALID_AUDIO_DIALOGUE_TURN");
    }
  }
  for (const key of ["convergences", "differences"]) {
    if (!Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string")) {
      throw new TypeError("INVALID_AUDIO_DIALOGUE_SUMMARY");
    }
  }
  if (typeof value.lingering_intrigue !== "boolean") {
    throw new TypeError("INVALID_AUDIO_DIALOGUE_INTRIGUE");
  }
  if (typeof value.intrigue_statement !== "string") {
    throw new TypeError("INVALID_AUDIO_INTRIGUE_STATEMENT");
  }
  if (!(value.door_seed === null || typeof value.door_seed === "string")) {
    throw new TypeError("INVALID_AUDIO_DOOR_SEED");
  }
  if (!value.lingering_intrigue && value.door_seed !== null) {
    throw new TypeError("AUDIO_DOOR_SEED_REQUIRES_INTRIGUE");
  }
  return value;
}

function dialoguePrompt(packet) {
  const [a, b] = packet.sealed_first_responses;
  return `Two independent first listens to the same bounded audio window have already been sealed. The audio is deliberately NOT attached now. Compose one short cross-read between those listener roles without rewriting either first listen.

Window id: ${packet.window_ref.window_id}
Audio SHA-256: ${packet.window_ref.audio_sha256}
Window bounds: ${packet.window_ref.requested_bounds.start_ms}ms to ${packet.window_ref.requested_bounds.end_ms}ms

SEALED FIRST LISTEN A
ID: ${a.first_response_id}
Listener: ${a.listener.role} (${a.listener.id})
${JSON.stringify(a.response)}

SEALED FIRST LISTEN B
ID: ${b.first_response_id}
Listener: ${b.listener.role} (${b.listener.id})
${JSON.stringify(b.response)}

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

Do not invent whole-track context, catalog history, lyrics outside the window, or author intent. A door seed is permitted only when lingering intrigue is true.`;
}

export async function runAudioDialogue(request) {
  exactKeys(
    request,
    ["schema", "pair", "first_responses"],
    "INVALID_AUDIO_DIALOGUE_REQUEST",
  );
  if (request.schema !== "autodisco.audio-look-twice-dialogue-request/v0") {
    throw new TypeError("INVALID_AUDIO_DIALOGUE_REQUEST_SCHEMA");
  }
  const pair = verifyAudioPair(request.pair);
  const responses = verifyAudioFirstResponses(pair, request.first_responses);
  const packet = buildAudioDialoguePacket(pair, responses);

  if (!validGeminiKey()) {
    return {
      schema: "autodisco.audio-look-twice-dialogue-result/v0",
      status: "dialogue-packet-only",
      dialogue_packet: packet,
      dialogue: null,
      model_used: null,
      laws: [
        "SIMULATION != AUDIO DIALOGUE",
        "AUDIO WINDOW IS NOT REOPENED",
        "SEALED FIRST LISTENS REMAIN INTACT",
      ],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model =
    process.env.AUDIO_LOOK_TWICE_DIALOGUE_MODEL ||
    process.env.AUDIO_LOOK_TWICE_MODEL ||
    "gemini-3.8-flash";
  const result = await client.models.generateContent({
    model,
    contents: dialoguePrompt(packet),
    config: {
      responseMimeType: "application/json",
      temperature: 0.55,
      maxOutputTokens: 900,
    },
  });
  const listenerIds = new Set(
    packet.sealed_first_responses.map((item) => item.listener.id)
  );
  const dialogue = validateDialogue(
    JSON.parse(result.text || "{}"),
    listenerIds,
  );
  const dialogueSha256 = sha256(canonical(dialogue));
  const body = {
    schema: "autodisco.audio-look-twice-dialogue-result/v0",
    status: "dialogue-sealed",
    dialogue_packet: packet,
    dialogue,
    dialogue_sha256: dialogueSha256,
    model_used: model,
    laws: [
      "DIALOGUE FOLLOWS TWO SEALED FIRST LISTENS",
      "AUDIO DIALOGUE != RETROACTIVE FIRST LISTEN",
      "LINGERING INTRIGUE != SOURCE TRUTH",
      "DOOR SEED != CROSSING",
    ],
  };
  return {
    ...body,
    dialogue_id: `autodisco-audio-look-twice-dialogue-result-v0:${sha256(canonical(body))}`,
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
    let result;
    if (request.action === "prepare") {
      exactKeys(request, ["action", "request"], "INVALID_AUDIO_LOOK_TWICE_CLI_PREPARE");
      result = prepareAudioLookTwice(request.request);
    } else if (request.action === "encounter") {
      exactKeys(request, ["action", "request"], "INVALID_AUDIO_LOOK_TWICE_CLI_ENCOUNTER");
      result = await runAudioIsolatedEncounters(request.request);
    } else if (request.action === "dialogue") {
      exactKeys(request, ["action", "request"], "INVALID_AUDIO_LOOK_TWICE_CLI_DIALOGUE");
      result = await runAudioDialogue(request.request);
    } else {
      throw new TypeError("action must be prepare, encounter, or dialogue");
    }
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "audio look twice failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
