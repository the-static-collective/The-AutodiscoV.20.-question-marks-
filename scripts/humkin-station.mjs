#!/usr/bin/env node
/**
 * HUMKIN Radio 001 — public, editorial sidecar to Auto Disco V20.
 * No network, credentials, tracking, synthetic sealed listeners, or auto-play.
 * The station remembers its editorial sequence; first-listen DJs do not.
 */
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'autodisco.humkin-radio-station/v1';
export const CHANNELS = Object.freeze(['beautiful', 'strange', 'home']);
const STORIES = Object.freeze([
  {
    id: 'signal-001', channel: 'beautiful', title: 'A little more daylight',
    track_id: 'humkin-mutant-pop-10', track_title: 'First Light Finds Your Face',
    preview: '/previews/C-first-light-finds-your-face.mp3',
    frequency: '88.1', dj: 'The Station',
    line: 'TRANSMISSION 001 // The morning was early, but the radio was already awake.',
    story: 'Someone left a window open on the far side of the night. The light crossed it anyway. This is a fictional transmission, not a recovered event.',
    door_text: 'Send a little daylight',
  },
  {
    id: 'signal-002', channel: 'strange', title: 'The greenhouse frequency',
    track_id: 'humkin-mutant-pop-01', track_title: 'Noontime Bloom',
    preview: '/previews/A-noontime-bloom.mp3',
    frequency: '92.7', dj: 'The Station',
    line: 'TRANSMISSION 002 // The plants learned to hum before the radio learned to listen.',
    story: 'At exactly noon, three blue flowers appeared where the speakers should have been. Nobody thought to ask if it was impossible. This is fiction.',
    door_text: 'Pass the strange signal',
  },
  {
    id: 'signal-003', channel: 'home', title: 'The cup remembers warmth',
    track_id: 'humkin-mutant-pop-06', track_title: 'We Are Still Here',
    preview: '/previews/B-we-are-still-here.mp3',
    frequency: '104.3', dj: 'The Station',
    line: 'TRANSMISSION 003 // A blue cup remained on the table. So did the invitation.',
    story: 'Every road had a different name for home. The kettle just kept the water warm. Nothing in this transmission claims to document a real person or event.',
    door_text: 'Save a place for somebody',
  },
]);

function publicStory(item) {
  // Do not include any house memory, contributor identity, generation secret or DJ transcript.
  return {
    id: item.id, channel: item.channel, title: item.title,
    track_id: item.track_id, track_title: item.track_title,
    preview: item.preview, frequency: item.frequency, dj: item.dj,
    line: item.line, story: item.story, door_text: item.door_text,
    claim_type: 'FICTIONAL_INTERPRETATION',
    source_role: 'PROMOTIONAL_PREVIEW',
    first_listen_status: 'NOT_ATTEMPTED',
  };
}

export function buildStationManifest() {
  const body = {
    schema: SCHEMA,
    station: 'HUMKIN RADIO', album: 'MUTANT POP', artist: 'HUMKIN',
    presentation: 'ON_DEMAND_INTERACTIVE_STATION_NOT_LIVE_BROADCAST',
    provenance: {
      editorial_origin: 'HUMKIN / Auto Disco V20 sidecar',
      musical_assets: 'HUMKIN MUTANT POP authorized release previews; rights verification for external sublicensing remains separate',
      fiction: 'TRANSMISSIONS ARE INVENTED, NOT RECOVERED EVENTS',
      listeners: 'NO FIRST-LISTEN DJ SESSION HAS BEEN RUN BY THIS PUBLIC WIDGET',
      audio: 'PREVIEW EXCERPTS, NOT COMPLETE SONGS',
    },
    channels: CHANNELS,
    transmissions: STORIES.map(publicStory),
    laws: [
      'STATION MEMORY != FIRST LISTENER MEMORY',
      'FICTION != OBSERVED EVENT',
      'PREVIEW != FULL SONG',
      'BROWSER PLAYBACK != SEALED FIRST LISTEN',
      'USER SELECTION != AUTOMATIC CONSENT',
      'NO SERVER-SIDE LISTENER TRACKING',
    ],
  };
  const digest = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return { ...body, manifest_sha256: digest };
}

export function selectTransmission(channel, manifest = buildStationManifest()) {
  if (!CHANNELS.includes(channel)) throw new TypeError('UNKNOWN_HUMKIN_CHANNEL');
  const item = manifest.transmissions.find(x => x.channel === channel);
  if (!item) throw new TypeError('MISSING_HUMKIN_TRANSMISSION');
  return item;
}

export function createShareUrl(baseUrl, channel) {
  const radio = new URL(baseUrl);
  if (!['https:', 'http:'].includes(radio.protocol)) throw new TypeError('INVALID_RADIO_URL_PROTOCOL');
  radio.search = '';
  radio.hash = '';
  const item = selectTransmission(channel);
  radio.searchParams.set('channel', item.channel);
  radio.searchParams.set('signal', item.id);
  return radio.href;
}

export function editorialHandoff(channel) {
  const item = selectTransmission(channel);
  return {
    schema: 'autodisco.humkin-editorial-handoff/v1',
    input_kind: 'PUBLIC_PREVIEW_EDITORIAL_LEAD',
    station: 'HUMKIN RADIO',
    source_track_id: item.track_id,
    source_track_title: item.track_title,
    preview_path: item.preview,
    station_transmission_id: item.id,
    first_listen_status: 'NOT_ATTEMPTED',
    required_next_step: 'Obtain authorized local audio source; build canonical bounded WAV using audio-window.mjs; run isolated audio-look-twice; seal both first responses BEFORE cross-read or broadcast assembly.',
    prohibitions: ['DO NOT IMPORT PUBLIC STORY INTO FIRST-LISTEN DJ PACKETS', 'DO NOT CLAIM A BROWSER TTS VOICE IS AN ARTIST-ORIGINATED DJ', 'NO STORY OR STATION MEMORY MAY BE SMUGGLED INTO ISOLATED AUDIO PACKETS'],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv[2] === 'manifest') process.stdout.write(JSON.stringify(buildStationManifest(), null, 2) + '\n');
  else if (process.argv[2] === 'handoff') process.stdout.write(JSON.stringify(editorialHandoff(process.argv[3] || 'strange'), null, 2) + '\n');
  else { process.stderr.write('Usage: node scripts/humkin-station.mjs manifest | handoff <beautiful|strange|home>\n'); process.exitCode = 2; }
}