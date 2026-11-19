# HUMKIN Accident Frequency → Auto Disco V20 intake

This owner-invoked terminal bridge consumes the unsigned editorial JSON exported at HUMKIN `/fm/autodisco/`. It does not fetch source URLs, ingest public R2 buckets, auto-publish, or expose curation metadata to first-listen DJs.

## Steps

1. Export **V20 editorial handoff** from the HUMKIN experimental station.
2. Download an authorized recording to your computer; independently obtain its expected SHA-256 from the approved source/ingest record. This manifest alone does not attest source bytes.
3. Run `node scripts/humkin-accident-intake.mjs handoff.json song-id /local/private/audio.mp3 /local/private/v20-run --expected-sha256=YOUR_64_CHARACTER_HASH` to create one canonical audio-window artifact and an isolated pair of blind first-listen packets. No AI call yet.
4. Once you have explicitly approved that source and have an available model, repeat the invocation with `--listen`. The existing V20 audio LOOK TWICE code will call two independent first-listen booths, seal real responses if successful, and perform cross-read only after both responses verify. Without a real configured model key, it returns `packets-only`; never fabricated dialogue.
5. The output directory contains `operator-context.json` (curation labels and source hash), `window.json` (bounded actual canonical audio), `pair.json`, and only when attempted, `encounter.json` and possibly `dialogue.json`.
6. For a genuine `dialogue-sealed` result, use the existing BROADCAST ASSEMBLY 001 to compile/review an episode. This bridge does not broadcast or publish anything.

## Privacy and first-listen separation

- The editorial manifest contains names, history and play counts and is read **only** by the operator tool. No candidate title/artist/album/rank enters the V20 audio window request or first-listen prompt.
- The blind window label is constant: `Blind specimen`. The exact audio bytes, bounds, source/audio digests and listener roles are the only relevant first-listen context.
- No file downloading by URI is performed by this script. The operator must provide a local path and, for model listening, its independently sourced expected SHA-256.
- Output may include model dialogue and canonical audio bytes; store in a private location outside the public website and source-controlled fixtures.
- The code never claims a source license, audience, Top 42 vote, canonical voice, broadcast occurrence or auto-authorization.

## Validation

Run `node --test scripts/humkin-accident-intake.test.mjs` or use the First Encounter CI job.

Source bridge: https://github.com/the-static-collective/HUMKIN/pull/154
Existing contracts: `FIRST-LISTEN-RADIO.md`, `docs/AUDIO-WINDOW-001.md`, `docs/BROADCAST-ASSEMBLY-001.md`.