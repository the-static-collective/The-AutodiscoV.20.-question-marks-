import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAudioWindow } from "./audio-window.mjs";

const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const BITS = 16;
const BYTES_PER_FRAME = CHANNELS * (BITS / 8);

function header(dataBytes) {
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * BYTES_PER_FRAME, 28);
  buffer.writeUInt16LE(BYTES_PER_FRAME, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

function makeCanonicalWav(durationMs) {
  const frames = Math.round((durationMs * SAMPLE_RATE) / 1000);
  const pcm = Buffer.alloc(frames * BYTES_PER_FRAME);
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = Math.round(Math.sin(frame / 20) * 12000);
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      pcm.writeInt16LE(sample, (frame * CHANNELS + channel) * 2);
    }
  }
  return Buffer.concat([header(pcm.length), pcm]);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

test("canonical WAV is sliced by exact sample-quantized bounds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autodisco-window-"));
  try {
    const sourcePath = path.join(root, "source.wav");
    const source = makeCanonicalWav(3_000);
    await fs.writeFile(sourcePath, source);

    const result = await buildAudioWindow({
      schema: "autodisco.audio-window-request/v0",
      source_path: sourcePath,
      start_ms: 500,
      end_ms: 1_500,
      declared_metadata: { window_label: "specimen-001" },
    });

    assert.equal(result.schema, "autodisco.audio-window/v0");
    assert.match(result.window_id, /^autodisco-audio-window-v0:/);
    assert.equal(result.source.sha256, sha256(source));
    assert.equal(result.requested_bounds.start_ms, 500);
    assert.equal(result.requested_bounds.end_ms, 1500);
    assert.equal(result.extraction.method, "direct-canonical-wav-slice");
    assert.equal(result.canonical_audio.sample_rate_hz, SAMPLE_RATE);
    assert.equal(result.canonical_audio.channels, CHANNELS);
    assert.equal(result.canonical_audio.bits_per_sample, BITS);
    assert.equal(result.canonical_audio.frame_count, SAMPLE_RATE);
    assert.equal(result.canonical_audio.duration_ms, 1000);

    const heard = Buffer.from(result.canonical_audio.base64, "base64");
    assert.equal(sha256(heard), result.canonical_audio.sha256);
    assert.equal(heard.length, result.canonical_audio.size_bytes);
    assert.ok(result.laws.includes("WINDOW != WHOLE TRACK"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("same source bounds and label produce the same window identity", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autodisco-window-repeat-"));
  try {
    const sourcePath = path.join(root, "source.wav");
    await fs.writeFile(sourcePath, makeCanonicalWav(2_000));
    const request = {
      schema: "autodisco.audio-window-request/v0",
      source_path: sourcePath,
      start_ms: 250,
      end_ms: 1_250,
      declared_metadata: { window_label: "same" },
    };
    const a = await buildAudioWindow(request);
    const b = await buildAudioWindow(request);
    assert.equal(a.window_id, b.window_id);
    assert.equal(a.canonical_audio.sha256, b.canonical_audio.sha256);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("window refuses hidden metadata fields", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autodisco-window-hidden-"));
  try {
    const sourcePath = path.join(root, "source.wav");
    await fs.writeFile(sourcePath, makeCanonicalWav(2_000));
    await assert.rejects(
      buildAudioWindow({
        schema: "autodisco.audio-window-request/v0",
        source_path: sourcePath,
        start_ms: 0,
        end_ms: 1000,
        declared_metadata: {
          window_label: "first listen",
          artist_history: "secret",
        },
      }),
      /INVALID_AUDIO_WINDOW_DECLARED_METADATA/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("window hard-caps duration before reading interpretation into the request", async () => {
  await assert.rejects(
    buildAudioWindow({
      schema: "autodisco.audio-window-request/v0",
      source_path: "/does/not/matter.wav",
      start_ms: 0,
      end_ms: 45_001,
      declared_metadata: { window_label: "too-long" },
    }),
    /AUDIO_WINDOW_TOO_LONG/,
  );
});
