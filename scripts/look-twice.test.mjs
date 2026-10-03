import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildDialoguePacket,
  prepareLookTwice,
  runDialogue,
  runIsolatedEncounters,
  sealFirstResponse,
  verifySealedResponses,
} from "./look-twice.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>';
const DIGEST = crypto.createHash("sha256").update(SVG, "utf8").digest("hex");
const PREPARE = {
  schema: "autodisco.look-twice-prepare-request/v0",
  artifact: {
    media_type: "image/svg+xml",
    sha256: DIGEST,
    text: SVG,
  },
};

function response(label) {
  return {
    observations: [
      { mode: "OBSERVED", text: `${label}: a diagonal line occupies the field.` },
      { mode: "DERIVED", text: `${label}: the composition emphasizes direction.` },
      { mode: "METAPHOR", text: `${label}: it feels like a road beginning.` },
      { mode: "INTERPRETATION", text: `${label}: I read it as a departure.` },
    ],
    lingering_intrigue: true,
    closing_line: `${label}: I want to know what lies beyond the edge.`,
  };
}

function sealedPair() {
  const pair = prepareLookTwice(PREPARE);
  const responses = pair.packets.map((packet, index) =>
    sealFirstResponse(pair, packet.packet_id, response(String(index)), "model-test")
  );
  return { pair, responses };
}

test("prepare creates two isolated packets over the exact same artifact", () => {
  const pair = prepareLookTwice(PREPARE);
  assert.equal(pair.packets.length, 2);
  assert.equal(pair.packets[0].source.sha256, DIGEST);
  assert.equal(pair.packets[1].source.sha256, DIGEST);
  assert.notEqual(pair.packets[0].listener.id, pair.packets[1].listener.id);
  assert.notEqual(pair.packets[0].packet_id, pair.packets[1].packet_id);
  for (const packet of pair.packets) {
    assert.equal(packet.content, SVG);
    assert.equal(Object.hasOwn(packet, "other_response"), false);
    assert.ok(packet.prohibitions.includes("NO OTHER LISTENER RESPONSE"));
  }
});

test("prepare refuses hidden context instead of silently admitting it", () => {
  assert.throws(
    () => prepareLookTwice({ ...PREPARE, history: ["secret"] }),
    /INVALID_LOOK_TWICE_PREPARE_REQUEST/,
  );
});

test("sealed first response identity binds pair packet listener model and response", () => {
  const pair = prepareLookTwice(PREPARE);
  const packet = pair.packets[0];
  const a = sealFirstResponse(pair, packet.packet_id, response("a"), "model-test");
  const b = sealFirstResponse(pair, packet.packet_id, response("a"), "model-test");
  const changed = sealFirstResponse(pair, packet.packet_id, response("b"), "model-test");
  assert.equal(a.first_response_id, b.first_response_id);
  assert.notEqual(a.first_response_id, changed.first_response_id);
  assert.equal(a.listener.id, packet.listener.id);
});

test("dialogue cannot be built until two distinct first responses are sealed", () => {
  const pair = prepareLookTwice(PREPARE);
  const one = sealFirstResponse(
    pair,
    pair.packets[0].packet_id,
    response("only"),
    "model-test",
  );
  assert.throws(
    () => verifySealedResponses(pair, [one]),
    /LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES/,
  );
  assert.throws(
    () => buildDialoguePacket(pair, [one]),
    /LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES/,
  );
});

test("dialogue packet cross-reads sealed responses without reopening source artifact", () => {
  const { pair, responses } = sealedPair();
  const packet = buildDialoguePacket(pair, responses);
  assert.equal(packet.sealed_first_responses.length, 2);
  assert.equal(packet.source_sha256, DIGEST);
  assert.equal(Object.hasOwn(packet, "content"), false);
  assert.equal(Object.hasOwn(packet, "artifact"), false);
  assert.ok(packet.rules.includes("ORIGINAL ARTIFACT IS NOT REOPENED"));
});

test("without a real model key, encounter stage returns zero responses and never simulates", async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const pair = prepareLookTwice(PREPARE);
    const result = await runIsolatedEncounters({
      schema: "autodisco.look-twice-encounter-request/v0",
      pair,
    });
    assert.equal(result.status, "packets-only");
    assert.deepEqual(result.first_responses, []);
    assert.equal(result.model_used, null);
    assert.ok(result.laws.includes("SIMULATION != FIRST ENCOUNTER"));
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
  }
});

test("without a real model key, dialogue preserves a packet but invents no exchange", async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const { pair, responses } = sealedPair();
    const result = await runDialogue({
      schema: "autodisco.look-twice-dialogue-request/v0",
      pair,
      first_responses: responses,
    });
    assert.equal(result.status, "dialogue-packet-only");
    assert.equal(result.dialogue, null);
    assert.equal(result.model_used, null);
    assert.ok(result.laws.includes("SIMULATION != DIALOGUE"));
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
  }
});

test("CLI prepare emits strict machine JSON", async () => {
  const child = spawn(process.execPath, [path.join(HERE, "look-twice.mjs")], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, GEMINI_API_KEY: "" },
  });
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
  child.stdin.end(JSON.stringify({ action: "prepare", request: PREPARE }));
  const code = await closed;
  assert.equal(code, 0, stderr);
  const result = JSON.parse(stdout);
  assert.equal(result.schema, "autodisco.look-twice-pair/v0");
  assert.equal(result.packets.length, 2);
});
