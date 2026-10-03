import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAudioWindow } from "./audio-window.mjs";
import {
  prepareAudioLookTwice,
  sealAudioFirstResponse,
} from "./audio-look-twice.mjs";
import {
  compileBroadcastEpisode,
  writeBroadcastBundle,
} from "./broadcast-assembly.mjs";

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
    const sample = Math.round(Math.sin(i / 19) * 9000);
    pcm.writeInt16LE(sample, i * 4);
    pcm.writeInt16LE(-sample, i * 4 + 2);
  }
  return Buffer.concat([header(pcm.length), pcm]);
}

function response(label) {
  return {
    observations: [
      { mode: "OBSERVED", text: `${label}: a pulse repeats and the stereo field shifts.` },
      { mode: "DERIVED", text: `${label}: the excerpt builds toward an unresolved edge.` },
      { mode: "METAPHOR", text: `${label}: it feels like a doorway held open.` },
      { mode: "INTERPRETATION", text: `${label}: I hear anticipation.` },
    ],
    lingering_intrigue: true,
    closing_line: `${label}: the cutoff makes me want the next window.`,
  };
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "broadcast-assembly-"));
  const sourcePath = path.join(root, "track.wav");
  await fs.writeFile(sourcePath, wav());
  const window = await buildAudioWindow({
    schema: "autodisco.audio-window-request/v0",
    source_path: sourcePath,
    start_ms: 250,
    end_ms: 1250,
    declared_metadata: { window_label: "episode-window-001" },
  });
  const pair = prepareAudioLookTwice({
    schema: "autodisco.audio-look-twice-prepare-request/v0",
    window,
  });
  const firstResponses = pair.packets.map((packet, index) =>
    sealAudioFirstResponse(
      pair,
      packet.packet_id,
      response(index === 0 ? "Sam" : "Juniper"),
      "model-test",
    )
  );
  const dialogue = {
    turns: [
      { listener_id: "static-sam", text: "We both heard the cutoff, but I heard it as architecture." },
      { listener_id: "juniper", text: "I heard the same edge as emotional pressure." },
    ],
    convergences: ["Both listeners hear unresolved continuation."],
    differences: ["They locate the unresolvedness differently."],
    lingering_intrigue: true,
    intrigue_statement: "The next few seconds matter because both readings point past the cut.",
    door_seed: "Move the window forward and listen again.",
  };
  const dialogueResult = {
    schema: "autodisco.audio-look-twice-dialogue-result/v0",
    status: "dialogue-sealed",
    dialogue_packet: {
      schema: "autodisco.audio-look-twice-dialogue-packet/v0",
      pair_id: pair.pair_id,
      window_ref: pair.window_ref,
      sealed_first_responses: firstResponses.map((sealed) => ({
        first_response_id: sealed.first_response_id,
        listener: sealed.listener,
        response_sha256: sealed.response_sha256,
        response: sealed.response,
      })),
      rules: [
        "ONLY SEALED FIRST LISTENS MAY ENTER",
        "AUDIO WINDOW IS NOT REOPENED",
      ],
      dialogue_packet_id: "autodisco-audio-look-twice-dialogue-v0:" + "a".repeat(64),
    },
    dialogue,
    dialogue_sha256: "b".repeat(64),
    model_used: "model-test",
    laws: ["DIALOGUE != RETROACTIVE FIRST LISTEN"],
    dialogue_id: "autodisco-audio-look-twice-dialogue-result-v0:" + "c".repeat(64),
  };
  const assembly = {
    schema: "autodisco.broadcast-assembly-request/v0",
    station: { name: "Static Collective Radio" },
    episode: { id: "episode-001", title: "First Signal" },
    window,
    pair,
    first_responses: firstResponses,
    dialogue_result: dialogueResult,
  };
  return { root, window, pair, firstResponses, dialogueResult, assembly };
}

test("episode compilation binds exact editorial receipts without carrying audio bytes", async () => {
  const { root, window, pair, firstResponses, dialogueResult, assembly } = await fixture();
  try {
    const episode = compileBroadcastEpisode(assembly);
    assert.equal(episode.schema, "autodisco.broadcast-episode/v0");
    assert.equal(episode.window_ref.window_id, window.window_id);
    assert.equal(episode.window_ref.audio_sha256, window.canonical_audio.sha256);
    assert.equal(episode.editorial_receipts.pair_id, pair.pair_id);
    assert.deepEqual(
      new Set(episode.editorial_receipts.first_response_ids),
      new Set(firstResponses.map((item) => item.first_response_id)),
    );
    assert.equal(episode.editorial_receipts.dialogue_id, dialogueResult.dialogue_id);
    assert.equal(JSON.stringify(episode).includes('"base64"'), false);
    assert.ok(episode.laws.includes("ASSEMBLY != VOICE RENDER"));
    assert.equal(episode.segments.filter((item) => item.kind === "audio-window").length, 1);
    assert.equal(episode.segments.filter((item) => item.kind === "first-listen").length, 2);
    assert.equal(episode.segments.filter((item) => item.kind === "cross-read").length, 2);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("episode digest is deterministic for the same sealed evidence", async () => {
  const { root, assembly } = await fixture();
  try {
    const a = compileBroadcastEpisode(assembly);
    const b = compileBroadcastEpisode(assembly);
    assert.equal(a.episode_digest, b.episode_digest);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("assembler refuses packet-only dialogue and incomplete first-listen evidence", async () => {
  const { root, assembly } = await fixture();
  try {
    const packetOnly = structuredClone(assembly);
    packetOnly.dialogue_result.status = "dialogue-packet-only";
    packetOnly.dialogue_result.dialogue = null;
    assert.throws(
      () => compileBroadcastEpisode(packetOnly),
      /BROADCAST_REQUIRES_SEALED_AUDIO_DIALOGUE/,
    );

    const one = structuredClone(assembly);
    one.first_responses = [one.first_responses[0]];
    assert.throws(
      () => compileBroadcastEpisode(one),
      /AUDIO_LOOK_TWICE_REQUIRES_TWO_SEALED_RESPONSES/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("portable bundle preserves exact WAV digest and ships a one-button browser player", async () => {
  const { root, assembly, window } = await fixture();
  try {
    const result = await writeBroadcastBundle({
      schema: "autodisco.broadcast-bundle-request/v0",
      assembly,
      output_dir: root,
      basename: "episode-001",
    });
    const manifest = JSON.parse(await fs.readFile(result.manifest_path, "utf8"));
    const html = await fs.readFile(result.html_path, "utf8");
    const audio = await fs.readFile(result.audio_path);

    assert.equal(manifest.episode_digest, result.episode_digest);
    assert.equal(result.audio_sha256, window.canonical_audio.sha256);
    assert.equal(audio.length, window.canonical_audio.size_bytes);
    assert.match(html, /PLAY EPISODE/);
    assert.match(html, /speechSynthesis/);
    assert.match(html, /BROWSER VOICE != SEALED LISTENER/);
    assert.equal(html.includes(window.canonical_audio.base64), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
