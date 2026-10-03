#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { verifyAudioWindow } from "./audio-window.mjs";
import {
  verifyAudioPair,
  verifyAudioFirstResponses,
} from "./audio-look-twice.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(code);
  }
  const actual = Object.keys(value).sort().join("|");
  const expected = [...keys].sort().join("|");
  if (actual !== expected) throw new TypeError(code);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeStem(value) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(text)) {
    throw new TypeError("INVALID_BROADCAST_EPISODE_STEM");
  }
  return text;
}

function validateDialogue(pair, dialogueResult) {
  exactKeys(
    dialogueResult,
    [
      "schema", "status", "dialogue_packet", "dialogue", "dialogue_sha256",
      "model_used", "laws", "dialogue_id",
    ],
    "INVALID_BROADCAST_DIALOGUE_RESULT",
  );
  if (
    dialogueResult.schema !== "autodisco.audio-look-twice-dialogue-result/v0" ||
    dialogueResult.status !== "dialogue-sealed"
  ) {
    throw new TypeError("BROADCAST_REQUIRES_SEALED_AUDIO_DIALOGUE");
  }
  const packet = dialogueResult.dialogue_packet;
  if (
    !packet ||
    packet.schema !== "autodisco.audio-look-twice-dialogue-packet/v0" ||
    packet.pair_id !== pair.pair_id ||
    packet.window_ref?.window_id !== pair.window_ref.window_id ||
    packet.window_ref?.audio_sha256 !== pair.window_ref.audio_sha256
  ) {
    throw new TypeError("BROADCAST_DIALOGUE_BINDING_MISMATCH");
  }
  const serialized = JSON.stringify(packet);
  if (serialized.includes('"base64"') || serialized.includes("UklGR")) {
    throw new TypeError("BROADCAST_DIALOGUE_REOPENED_AUDIO");
  }
  const dialogue = dialogueResult.dialogue;
  if (!dialogue || typeof dialogue !== "object" || Array.isArray(dialogue)) {
    throw new TypeError("INVALID_BROADCAST_DIALOGUE");
  }
  if (
    typeof dialogue.lingering_intrigue !== "boolean" ||
    typeof dialogue.intrigue_statement !== "string"
  ) {
    throw new TypeError("INVALID_BROADCAST_DIALOGUE");
  }
  return dialogue;
}

function firstListenSegments(firstResponses) {
  return [...firstResponses]
    .sort((a, b) => a.listener.id.localeCompare(b.listener.id))
    .map((sealed) => ({
      kind: "first-listen",
      listener_id: sealed.listener.id,
      listener_role: sealed.listener.role,
      first_response_id: sealed.first_response_id,
      response_sha256: sealed.response_sha256,
      text: sealed.response.closing_line,
    }));
}

function dialogueSegments(dialogue) {
  return dialogue.turns.map((turn, index) => ({
    kind: "cross-read",
    sequence: index + 1,
    listener_id: turn.listener_id,
    text: turn.text,
  }));
}

export function compileBroadcastEpisode(request) {
  exactKeys(
    request,
    [
      "schema", "station", "episode", "window", "pair", "first_responses",
      "dialogue_result",
    ],
    "INVALID_BROADCAST_ASSEMBLY_REQUEST",
  );
  if (request.schema !== "autodisco.broadcast-assembly-request/v0") {
    throw new TypeError("INVALID_BROADCAST_ASSEMBLY_SCHEMA");
  }
  exactKeys(
    request.station,
    ["name"],
    "INVALID_BROADCAST_STATION",
  );
  exactKeys(
    request.episode,
    ["id", "title"],
    "INVALID_BROADCAST_EPISODE",
  );
  if (
    typeof request.station.name !== "string" ||
    !request.station.name.trim() ||
    typeof request.episode.id !== "string" ||
    !request.episode.id.trim() ||
    typeof request.episode.title !== "string" ||
    !request.episode.title.trim()
  ) {
    throw new TypeError("INVALID_BROADCAST_METADATA");
  }

  const window = verifyAudioWindow(request.window);
  const pair = verifyAudioPair(request.pair, window);
  const firstResponses = verifyAudioFirstResponses(pair, request.first_responses);
  const dialogue = validateDialogue(pair, request.dialogue_result);

  const orderedFirsts = firstListenSegments(firstResponses);
  const segments = [
    {
      kind: "station-intro",
      text: `${request.station.name.trim()}. First-Listen Radio. ${window.declared_metadata.window_label}.`,
    },
    {
      kind: "audio-window",
      window_id: window.window_id,
      audio_sha256: window.canonical_audio.sha256,
      requested_bounds: window.requested_bounds,
      duration_ms: window.canonical_audio.duration_ms,
    },
    ...orderedFirsts,
    ...dialogueSegments(dialogue),
    {
      kind: "station-outro",
      text: dialogue.lingering_intrigue
        ? `Still ringing: ${dialogue.intrigue_statement}`
        : "The exchange closed without lingering intrigue.",
      door_seed: dialogue.lingering_intrigue ? dialogue.door_seed : null,
    },
  ];

  const body = {
    schema: "autodisco.broadcast-episode/v0",
    station: {
      name: request.station.name.trim(),
    },
    episode: {
      id: request.episode.id.trim(),
      title: request.episode.title.trim(),
    },
    window_ref: {
      window_id: window.window_id,
      source_sha256: window.source.sha256,
      audio_sha256: window.canonical_audio.sha256,
      requested_bounds: window.requested_bounds,
      duration_ms: window.canonical_audio.duration_ms,
      window_label: window.declared_metadata.window_label,
    },
    editorial_receipts: {
      pair_id: pair.pair_id,
      first_response_ids: orderedFirsts.map((item) => item.first_response_id),
      dialogue_id: request.dialogue_result.dialogue_id,
      dialogue_sha256: request.dialogue_result.dialogue_sha256,
    },
    segments,
    laws: [
      "ASSEMBLY != FIRST LISTEN",
      "ASSEMBLY != DIALOGUE",
      "ASSEMBLY != VOICE RENDER",
      "BROWSER VOICE != SEALED LISTENER",
      "WINDOW != WHOLE TRACK",
      "EPISODE != BROADCAST OCCURRENCE",
      "PLAYBACK != REMOTE DELIVERY",
    ],
  };
  return {
    ...body,
    episode_digest: sha256Text(canonical(body)),
  };
}

function episodeHtml(episode) {
  const manifest = JSON.stringify(episode).replaceAll("<", "\\u003c");
  const title = escapeHtml(episode.episode.title);
  const station = escapeHtml(episode.station.name);
  const transcriptRows = episode.segments
    .filter((segment) => !["audio-window"].includes(segment.kind))
    .map((segment) => {
      const speaker = segment.listener_role || segment.listener_id || (
        segment.kind.startsWith("station-") ? episode.station.name : segment.kind
      );
      return `<article class="line" data-kind="${escapeHtml(segment.kind)}"><small>${escapeHtml(speaker)}</small><p>${escapeHtml(segment.text || "")}</p></article>`;
    }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${title} — ${station}</title>
<style>
:root{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:dark;background:#0b0f0d;color:#edf4ed}
body{max-width:880px;margin:0 auto;padding:28px}
header{border:1px solid #2b3831;border-radius:18px;padding:24px;background:#111914}
.eyebrow{font-size:11px;letter-spacing:.16em;color:#a9c9a9}.meta{color:#91a397;font-size:12px}
button{border:1px solid #405347;background:#1a2a20;color:#eff8ef;border-radius:10px;padding:12px 16px;font:inherit;cursor:pointer}
button:hover{border-color:#9dce9d}button:disabled{opacity:.5}
audio{width:100%;margin:16px 0}.line{border-left:2px solid #33463a;padding:0 0 0 14px;margin:18px 0}.line small{color:#a6c6a6}.line p{line-height:1.55}
#now{min-height:1.5em;color:#bfd8bf}.law{margin-top:24px;font-size:11px;color:#839087}
</style>
</head>
<body>
<header>
<div class="eyebrow">FIRST-LISTEN RADIO / BROADCAST ASSEMBLY 001</div>
<h1>${title}</h1>
<div class="meta">${station} · window ${escapeHtml(episode.window_ref.window_label)} · ${escapeHtml(episode.window_ref.audio_sha256.slice(0,16))}…</div>
<p id="now">Ready. Local browser voice is a playback projection, not a sealed listener identity.</p>
<button id="play">PLAY EPISODE</button>
<button id="stop">STOP</button>
<audio id="window" preload="auto" src="window.wav"></audio>
</header>
<section>${transcriptRows}</section>
<p class="law">ASSEMBLY != VOICE RENDER · BROWSER VOICE != SEALED LISTENER · PLAYBACK != BROADCAST OCCURRENCE</p>
<script type="application/json" id="episode-manifest">${manifest}</script>
<script>
const episode=JSON.parse(document.querySelector('#episode-manifest').textContent);
const play=document.querySelector('#play');
const stop=document.querySelector('#stop');
const audio=document.querySelector('#window');
const now=document.querySelector('#now');
let cancelled=false;
function speak(text,label){
  return new Promise((resolve)=>{
    if(cancelled||!text){resolve();return;}
    if(!('speechSynthesis' in window)){
      now.textContent=(label?label+': ':'')+text;
      setTimeout(resolve,Math.min(5000,Math.max(1000,text.length*35)));
      return;
    }
    const u=new SpeechSynthesisUtterance(text);
    u.rate=1.0;
    u.pitch=1.0;
    u.onstart=()=>{now.textContent=(label?label+': ':'')+text;};
    u.onend=resolve;u.onerror=resolve;
    speechSynthesis.speak(u);
  });
}
function playAudio(){
  return new Promise((resolve)=>{
    if(cancelled){resolve();return;}
    now.textContent='Playing the exact witnessed audio window.';
    const done=()=>{audio.removeEventListener('ended',done);resolve();};
    audio.addEventListener('ended',done);
    audio.currentTime=0;
    audio.play().catch(()=>resolve());
  });
}
async function run(){
  cancelled=false; play.disabled=true;
  if('speechSynthesis' in window) speechSynthesis.cancel();
  for(const segment of episode.segments){
    if(cancelled) break;
    if(segment.kind==='audio-window'){await playAudio();continue;}
    const label=segment.listener_role||segment.listener_id||(segment.kind.startsWith('station-')?episode.station.name:segment.kind);
    await speak(segment.text,label);
  }
  now.textContent=cancelled?'Stopped.':'Episode complete.';
  play.disabled=false;
}
play.addEventListener('click',run);
stop.addEventListener('click',()=>{
  cancelled=true;audio.pause();
  if('speechSynthesis' in window) speechSynthesis.cancel();
  now.textContent='Stopped.';play.disabled=false;
});
</script>
</body>
</html>`;
}

export async function writeBroadcastBundle(request) {
  exactKeys(
    request,
    ["schema", "assembly", "output_dir", "basename"],
    "INVALID_BROADCAST_BUNDLE_REQUEST",
  );
  if (request.schema !== "autodisco.broadcast-bundle-request/v0") {
    throw new TypeError("INVALID_BROADCAST_BUNDLE_SCHEMA");
  }
  const episode = compileBroadcastEpisode(request.assembly);
  const window = verifyAudioWindow(request.assembly.window);
  const basename = safeStem(request.basename);
  const outputDir = path.resolve(String(request.output_dir || ""));
  if (!request.output_dir || outputDir === path.parse(outputDir).root) {
    throw new TypeError("INVALID_BROADCAST_OUTPUT_DIR");
  }

  const bundleDir = path.join(outputDir, basename);
  await fs.mkdir(bundleDir, { recursive: true });
  const audioBytes = Buffer.from(window.canonical_audio.base64, "base64");
  if (sha256Bytes(audioBytes) !== window.canonical_audio.sha256) {
    throw new TypeError("BROADCAST_AUDIO_DIGEST_MISMATCH");
  }

  const manifestPath = path.join(bundleDir, "episode.json");
  const audioPath = path.join(bundleDir, "window.wav");
  const htmlPath = path.join(bundleDir, "index.html");
  const manifestText = JSON.stringify(episode, null, 2) + "\n";
  const htmlText = episodeHtml(episode);

  await fs.writeFile(manifestPath, manifestText, "utf8");
  await fs.writeFile(audioPath, audioBytes);
  await fs.writeFile(htmlPath, htmlText, "utf8");

  return {
    schema: "autodisco.broadcast-bundle-result/v0",
    episode_id: episode.episode.id,
    episode_digest: episode.episode_digest,
    bundle_dir: bundleDir,
    manifest_path: manifestPath,
    manifest_sha256: sha256Text(manifestText),
    audio_path: audioPath,
    audio_sha256: sha256Bytes(audioBytes),
    html_path: htmlPath,
    html_sha256: sha256Text(htmlText),
    laws: [
      "BUNDLE != BROADCAST OCCURRENCE",
      "HTML PLAYER != CANONICAL VOICE RENDER",
      "AUDIO DIGEST MUST SURVIVE ASSEMBLY",
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
    const request = JSON.parse(raw);
    let result;
    if (request.action === "compile") {
      exactKeys(request, ["action", "request"], "INVALID_BROADCAST_CLI_COMPILE");
      result = compileBroadcastEpisode(request.request);
    } else if (request.action === "bundle") {
      exactKeys(request, ["action", "request"], "INVALID_BROADCAST_CLI_BUNDLE");
      result = await writeBroadcastBundle(request.request);
    } else {
      throw new TypeError("action must be compile or bundle");
    }
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "broadcast assembly failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
