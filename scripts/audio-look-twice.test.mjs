import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAudioWindow } from "./audio-window.mjs";
import {
  buildAudioDialoguePacket,
  prepareAudioLookTwice,
  runAudioDialogue,
  runAudioIsolatedEncounters,
  sealAudioFirstResponse,
  verifyAudioFirstResponses,
} from "./audio-look-twice.mjs";

const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const BYTES_PER_FRAME = 4;

function header(dataBytes) {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(CHANNELS, 22);
  b.writeUInt32LE(SAMPLE_RATE, 24);
  b.writeUInt32LE(SAMPLE_RATE * BYTES_PER_FRAME, 28);
  b.writeUInt16LE(BYTES_PER_FRAME, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36, "ascii");
  b.writeUInt32LE(dataBytes, 40);
  return b;
}

function wav(durationMs = 2000) {
  const frames = Math.round(durationMs * SAMPLE_RATE / 1000);
  const pcm = Buffer.alloc(frames * BYTES_PER_FRAME);
  for (let i = 0; i < frames; i += 1) {
    const sample = Math.round(Math.sin(i / 17) * 10000);
    pcm.writeInt16LE(sample, i * 4);
    pcm.writeInt16LE(-sample, i * 4 + 2);
  }
  return Buffer.concat([header(pcm.length), pcm]);
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "audio-look-twice-"));
  const sourcePath = path.join(root, "track.wav");
  await fs.writeFile(sourcePath, wav());
  const window = await buildAudioWindow({
    schema: "autodisco.audio-window-request/v0",
    source_path: sourcePath,
    start_ms: 250,
    end_ms: 1250,
    declared_metadata: { window_label: "window-001" },
  });
  const pair = prepareAudioLookTwice({
    schema: "autodisco.audio-look-twice-prepare-request/v0",
    window,
  });
  return { root, window, pair };
}

function response(label) {
  return {
    observations: [
      { mode: "OBSERVED", text: `${label}: a repeating pulse and stereo motion are audible.` },
      { mode: "DERIVED", text: `${label}: the excerpt seems to be building tension.` },
      { mode: "METAPHOR", text: `${label}: it feels like a corridor narrowing.` },
      { mode: "INTERPRETATION", text: `${label}: I hear anticipation rather than arrival.` },
    ],
    lingering_intrigue: true,
    closing_line: `${label}: I want to hear what happens after this window.`,
  };
}

test("pair gives two listeners the same exact audio digest without whole-track bytes", async () => {
  const { root, window, pair } = await fixture();
  try {
    assert.equal(pair.packets.length, 2);
    assert.equal(pair.window_ref.window_id, window.window_id);
    assert.equal(pair.window_ref.audio_sha256, window.canonical_audio.sha256);
    assert.equal(
      new Set(pair.packets.map((item) => item.listener.id)).size,
      2,
    );
    for (const packet of pair.packets) {
      assert.equal(packet.window_ref.audio_sha256, window.canonical_audio.sha256);
      assert.equal(Object.hasOwn(packet, "audio"), false);
      assert.equal(Object.hasOwn(packet, "base64"), false);
      assert.ok(packet.prohibitions.includes("NO WHOLE TRACK"));
      assert.ok(packet.prohibitions.includes("NO OTHER LISTENER RESPONSE"));
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("without a real key, both audio booths stay silent rather than simulating listens", async () => {
  const { root, window, pair } = await fixture();
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await runAudioIsolatedEncounters({
      schema: "autodisco.audio-look-twice-encounter-request/v0",
      pair,
      window,
    });
    assert.equal(result.status, "packets-only");
    assert.deepEqual(result.first_responses, []);
    assert.equal(result.model_used, null);
    assert.ok(result.laws.includes("SIMULATION != FIRST LISTEN"));
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("cross-read refuses one sealed first listen", async () => {
  const { root, pair } = await fixture();
  try {
    const one = sealAudioFirstResponse(
      pair,
      pair.packets[0].packet_id,
      response("a"),
      "model-test",
    );
    assert.throws(
      () => verifyAudioFirstResponses(pair, [one]),
      /AUDIO_LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("dialogue packet contains sealed listens but no audio bytes", async () => {
  const { root, pair } = await fixture();
  try {
    const responses = pair.packets.map((packet, index) =>
      sealAudioFirstResponse(
        pair,
        packet.packet_id,
        response(String(index)),
        "model-test",
      )
    );
    const packet = buildAudioDialoguePacket(pair, responses);
    const serialized = JSON.stringify(packet);
    assert.equal(packet.sealed_first_responses.length, 2);
    assert.equal(Object.hasOwn(packet, "audio"), false);
    assert.equal(Object.hasOwn(packet.window_ref, "base64"), false);
    assert.equal(serialized.includes("UklGR"), false);
    assert.ok(packet.rules.includes("AUDIO WINDOW IS NOT REOPENED"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("without a real key, valid first listens produce a dialogue packet but no fake exchange", async () => {
  const { root, pair } = await fixture();
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const responses = pair.packets.map((packet, index) =>
      sealAudioFirstResponse(
        pair,
        packet.packet_id,
        response(String(index)),
        "model-test",
      )
    );
    const result = await runAudioDialogue({
      schema: "autodisco.audio-look-twice-dialogue-request/v0",
      pair,
      first_responses: responses,
    });
    assert.equal(result.status, "dialogue-packet-only");
    assert.equal(result.dialogue, null);
    assert.equal(result.model_used, null);
    assert.ok(result.laws.includes("SIMULATION != AUDIO DIALOGUE"));
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
    await fs.rm(root, { recursive: true, force: true });
  }
});
