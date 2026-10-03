#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_FRAME = CHANNELS * (BITS_PER_SAMPLE / 8);
const MAX_WINDOW_MS = 45_000;
const MAX_INLINE_BYTES = 12 * 1024 * 1024;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value) {
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

function mimeFromPath(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === ".wav" || ext === ".wave") return "audio/wav";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".ogg" || ext === ".oga") return "audio/ogg";
  return "application/octet-stream";
}

function wavHeader(dataBytes) {
  const buffer = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * BYTES_PER_FRAME;
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(BYTES_PER_FRAME, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

function canonicalWavFromPcm(pcm) {
  if (!Buffer.isBuffer(pcm) || pcm.length % BYTES_PER_FRAME !== 0) {
    throw new TypeError("INVALID_CANONICAL_PCM");
  }
  return Buffer.concat([wavHeader(pcm.length), pcm]);
}

function parseCanonicalWav(source) {
  if (!Buffer.isBuffer(source) || source.length < 44) return null;
  if (
    source.toString("ascii", 0, 4) !== "RIFF" ||
    source.toString("ascii", 8, 12) !== "WAVE"
  ) return null;

  let offset = 12;
  let format = null;
  let pcm = null;
  while (offset + 8 <= source.length) {
    const id = source.toString("ascii", offset, offset + 4);
    const size = source.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (body + size > source.length) break;
    if (id === "fmt " && size >= 16) {
      format = {
        audio_format: source.readUInt16LE(body),
        channels: source.readUInt16LE(body + 2),
        sample_rate: source.readUInt32LE(body + 4),
        bits_per_sample: source.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      pcm = source.subarray(body, body + size);
    }
    offset = body + size + (size % 2);
  }
  if (!format || !pcm) return null;
  if (
    format.audio_format !== 1 ||
    format.channels !== CHANNELS ||
    format.sample_rate !== SAMPLE_RATE ||
    format.bits_per_sample !== BITS_PER_SAMPLE ||
    pcm.length % BYTES_PER_FRAME !== 0
  ) return null;
  return { format, pcm };
}

function quantizedBounds(startMs, endMs) {
  const startFrame = Math.round((startMs * SAMPLE_RATE) / 1000);
  const endFrame = Math.round((endMs * SAMPLE_RATE) / 1000);
  if (endFrame <= startFrame) throw new TypeError("AUDIO_WINDOW_EMPTY_AFTER_QUANTIZATION");
  return {
    start_frame: startFrame,
    end_frame: endFrame,
    actual_start_ms: (startFrame * 1000) / SAMPLE_RATE,
    actual_end_ms: (endFrame * 1000) / SAMPLE_RATE,
  };
}

async function ffmpegWindow(sourcePath, startMs, endMs) {
  const bounds = quantizedBounds(startMs, endMs);
  const args = [
    "-hide_banner", "-loglevel", "error",
    "-i", sourcePath,
    "-vn",
    "-af",
    `aresample=${SAMPLE_RATE},atrim=start_sample=${bounds.start_frame}:end_sample=${bounds.end_frame},asetpts=PTS-STARTPTS`,
    "-ac", String(CHANNELS),
    "-ar", String(SAMPLE_RATE),
    "-c:a", "pcm_s16le",
    "-f", "s16le",
    "pipe:1",
  ];

  return await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      if (error?.code === "ENOENT") {
        reject(new Error("FFMPEG_REQUIRED_FOR_NONCANONICAL_AUDIO"));
      } else {
        reject(error);
      }
    });
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFMPEG_AUDIO_WINDOW_FAILED: ${stderr.trim() || code}`));
        return;
      }
      resolve(Buffer.concat(stdout));
    });
  });
}

function validateRequest(request) {
  exactKeys(
    request,
    ["schema", "source_path", "start_ms", "end_ms", "declared_metadata"],
    "INVALID_AUDIO_WINDOW_REQUEST",
  );
  if (request.schema !== "autodisco.audio-window-request/v0") {
    throw new TypeError("INVALID_AUDIO_WINDOW_SCHEMA");
  }
  if (typeof request.source_path !== "string" || !request.source_path.trim()) {
    throw new TypeError("INVALID_AUDIO_WINDOW_SOURCE_PATH");
  }
  if (!Number.isInteger(request.start_ms) || request.start_ms < 0) {
    throw new TypeError("INVALID_AUDIO_WINDOW_START");
  }
  if (!Number.isInteger(request.end_ms) || request.end_ms <= request.start_ms) {
    throw new TypeError("INVALID_AUDIO_WINDOW_END");
  }
  if (request.end_ms - request.start_ms > MAX_WINDOW_MS) {
    throw new TypeError("AUDIO_WINDOW_TOO_LONG");
  }
  exactKeys(
    request.declared_metadata,
    ["window_label"],
    "INVALID_AUDIO_WINDOW_DECLARED_METADATA",
  );
  if (
    typeof request.declared_metadata.window_label !== "string" ||
    !request.declared_metadata.window_label.trim() ||
    request.declared_metadata.window_label.length > 120
  ) {
    throw new TypeError("INVALID_AUDIO_WINDOW_LABEL");
  }
}

export function verifyAudioWindow(value) {
  exactKeys(
    value,
    [
      "schema", "source", "requested_bounds", "canonical_audio", "extraction",
      "declared_metadata", "laws", "window_id",
    ],
    "INVALID_AUDIO_WINDOW",
  );
  if (value.schema !== "autodisco.audio-window/v0") {
    throw new TypeError("INVALID_AUDIO_WINDOW_SCHEMA");
  }
  exactKeys(
    value.source,
    ["sha256", "media_type", "basename"],
    "INVALID_AUDIO_WINDOW_SOURCE",
  );
  if (!/^[0-9a-f]{64}$/.test(value.source.sha256)) {
    throw new TypeError("INVALID_AUDIO_WINDOW_SOURCE_DIGEST");
  }
  exactKeys(
    value.requested_bounds,
    ["start_ms", "end_ms"],
    "INVALID_AUDIO_WINDOW_BOUNDS",
  );
  if (
    !Number.isInteger(value.requested_bounds.start_ms) ||
    !Number.isInteger(value.requested_bounds.end_ms) ||
    value.requested_bounds.start_ms < 0 ||
    value.requested_bounds.end_ms <= value.requested_bounds.start_ms ||
    value.requested_bounds.end_ms - value.requested_bounds.start_ms > MAX_WINDOW_MS
  ) {
    throw new TypeError("INVALID_AUDIO_WINDOW_BOUNDS");
  }
  exactKeys(
    value.canonical_audio,
    [
      "media_type", "sha256", "size_bytes", "sample_rate_hz", "channels",
      "bits_per_sample", "frame_count", "duration_ms", "base64",
    ],
    "INVALID_AUDIO_WINDOW_CANONICAL_AUDIO",
  );
  if (
    value.canonical_audio.media_type !== "audio/wav" ||
    value.canonical_audio.sample_rate_hz !== SAMPLE_RATE ||
    value.canonical_audio.channels !== CHANNELS ||
    value.canonical_audio.bits_per_sample !== BITS_PER_SAMPLE ||
    !Number.isInteger(value.canonical_audio.frame_count) ||
    value.canonical_audio.frame_count <= 0 ||
    !Number.isInteger(value.canonical_audio.size_bytes) ||
    value.canonical_audio.size_bytes <= 44 ||
    value.canonical_audio.size_bytes > MAX_INLINE_BYTES ||
    typeof value.canonical_audio.base64 !== "string"
  ) {
    throw new TypeError("INVALID_AUDIO_WINDOW_CANONICAL_AUDIO");
  }
  const audioBytes = Buffer.from(value.canonical_audio.base64, "base64");
  if (
    audioBytes.length !== value.canonical_audio.size_bytes ||
    sha256Bytes(audioBytes) !== value.canonical_audio.sha256
  ) {
    throw new TypeError("AUDIO_WINDOW_BYTES_DIGEST_MISMATCH");
  }
  const parsed = parseCanonicalWav(audioBytes);
  if (
    !parsed ||
    parsed.pcm.length / BYTES_PER_FRAME !== value.canonical_audio.frame_count
  ) {
    throw new TypeError("AUDIO_WINDOW_BYTES_NOT_CANONICAL");
  }
  const expectedDuration = (
    value.canonical_audio.frame_count * 1000
  ) / SAMPLE_RATE;
  if (Math.abs(expectedDuration - value.canonical_audio.duration_ms) > 1e-9) {
    throw new TypeError("AUDIO_WINDOW_DURATION_MISMATCH");
  }
  exactKeys(
    value.declared_metadata,
    ["window_label"],
    "INVALID_AUDIO_WINDOW_DECLARED_METADATA",
  );
  if (
    typeof value.declared_metadata.window_label !== "string" ||
    !value.declared_metadata.window_label.trim()
  ) {
    throw new TypeError("INVALID_AUDIO_WINDOW_LABEL");
  }
  if (!Array.isArray(value.laws)) {
    throw new TypeError("INVALID_AUDIO_WINDOW_LAWS");
  }
  const identityBody = structuredClone(value);
  delete identityBody.window_id;
  identityBody.canonical_audio = {
    ...identityBody.canonical_audio,
    base64_sha256: sha256Text(identityBody.canonical_audio.base64),
  };
  delete identityBody.canonical_audio.base64;
  const expectedId = `autodisco-audio-window-v0:${sha256Text(canonical(identityBody))}`;
  if (value.window_id !== expectedId) {
    throw new TypeError("AUDIO_WINDOW_ID_MISMATCH");
  }
  return value;
}

export async function buildAudioWindow(request) {
  validateRequest(request);
  const sourcePath = path.resolve(request.source_path);
  const sourceBytes = await fs.readFile(sourcePath);
  const sourceSha256 = sha256Bytes(sourceBytes);
  const sourceMimeType = mimeFromPath(sourcePath);

  let pcm;
  let extraction;
  const parsed = parseCanonicalWav(sourceBytes);
  if (parsed) {
    const bounds = quantizedBounds(request.start_ms, request.end_ms);
    if (bounds.end_frame > parsed.pcm.length / BYTES_PER_FRAME) {
      throw new TypeError("AUDIO_WINDOW_EXCEEDS_SOURCE_DURATION");
    }
    pcm = parsed.pcm.subarray(
      bounds.start_frame * BYTES_PER_FRAME,
      bounds.end_frame * BYTES_PER_FRAME,
    );
    extraction = {
      method: "direct-canonical-wav-slice",
      ...bounds,
    };
  } else {
    pcm = await ffmpegWindow(sourcePath, request.start_ms, request.end_ms);
    if (!Buffer.isBuffer(pcm) || pcm.length === 0 || pcm.length % BYTES_PER_FRAME !== 0) {
      throw new TypeError("INVALID_FFMPEG_AUDIO_WINDOW");
    }
    const frameCount = pcm.length / BYTES_PER_FRAME;
    const bounds = quantizedBounds(request.start_ms, request.end_ms);
    const expectedFrames = bounds.end_frame - bounds.start_frame;
    if (frameCount !== expectedFrames) {
      throw new TypeError("AUDIO_WINDOW_EXCEEDS_SOURCE_DURATION");
    }
    extraction = {
      method: "ffmpeg-sample-exact-to-canonical-pcm",
      ...bounds,
    };
  }

  const wav = canonicalWavFromPcm(pcm);
  if (wav.length > MAX_INLINE_BYTES) {
    throw new TypeError("AUDIO_WINDOW_EXCEEDS_INLINE_LIMIT");
  }
  const audioSha256 = sha256Bytes(wav);
  const frameCount = pcm.length / BYTES_PER_FRAME;
  const body = {
    schema: "autodisco.audio-window/v0",
    source: {
      sha256: sourceSha256,
      media_type: sourceMimeType,
      basename: path.basename(sourcePath),
    },
    requested_bounds: {
      start_ms: request.start_ms,
      end_ms: request.end_ms,
    },
    canonical_audio: {
      media_type: "audio/wav",
      sha256: audioSha256,
      size_bytes: wav.length,
      sample_rate_hz: SAMPLE_RATE,
      channels: CHANNELS,
      bits_per_sample: BITS_PER_SAMPLE,
      frame_count: frameCount,
      duration_ms: (frameCount * 1000) / SAMPLE_RATE,
      base64: wav.toString("base64"),
    },
    extraction,
    declared_metadata: {
      window_label: request.declared_metadata.window_label.trim(),
    },
    laws: [
      "WINDOW != WHOLE TRACK",
      "SOURCE DIGEST != WINDOW DIGEST",
      "TIME BOUNDS != INTERPRETATION",
      "DECLARED METADATA != CATALOG HISTORY",
      "AUDIO BYTES HEARD != STATION MEMORY",
    ],
  };
  const identityBody = structuredClone(body);
  identityBody.canonical_audio = {
    ...identityBody.canonical_audio,
    base64_sha256: sha256Text(identityBody.canonical_audio.base64),
  };
  delete identityBody.canonical_audio.base64;
  return {
    ...body,
    window_id: `autodisco-audio-window-v0:${sha256Text(canonical(identityBody))}`,
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
    const result = await buildAudioWindow(JSON.parse(raw));
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "audio window failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
