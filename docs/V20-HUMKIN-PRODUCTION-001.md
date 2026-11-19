# Auto Disco V20 → genuine HUMKIN broadcast master 001

**Actual requirement:** the original Auto Disco V20 application and First-Listen Radio machinery produce the content of a dedicated V20 frequency. HUMKIN's Tower is a transmitter/distribution system, not the writer of fake V20 dialogue. The Accident Lab is a separate editorial intake.

## What is implemented

- `scripts/humkin-accident-intake.mjs` already consumes a HUMKIN editorial shortlist and independently approved local source MP3, creates canonical bounded V20 audio, and (when a genuine GEMINI_API_KEY exists) runs the two isolated first-listen AI models and sealed dialogue. Without a key, returns packets-only; no simulation is promoted.
- `scripts/build-v20-station-episode.mjs` now takes the *real produced* `window.json`, `pair.json`, `encounter.json`, `dialogue.json`, `operator-context.json` from that intake; requires the independent expected source hash and verified sealed-first-response chain, invokes original BROADCAST ASSEMBLY 001, and creates a portable episode bundle: `episode.json`, `window.wav`, `index.html`, `station-candidate.json`. It does **not** generate DJ claims.
- `scripts/render-voice-assets.ps1` can render that episode's exact speaking segments with installed Windows OS speech synthesis. This is **noncanonical** reference voice, not a performer-originated DJ voice or an authorized voice model.
- `scripts/render-radio-master.mjs` validates the unchanged episode digest, source WAV and every audio/voice asset digest, then executes FFmpeg to concatenate exactly those segments into **one actual MP3 radio master** and emits an `autodisco.radio-master-receipt/v1`. It does not synthesize or alter the transcript.
- No script creates an R2 upload, changes database state, clears third-party rights, authorizes AI voice identity, or declares confirmed airplay.

## Actual production sequence

On the owner workstation, install Node.js, Python if using native MOTIF, FFmpeg/ffprobe, and PowerShell 5.1 on Windows (only for the optional noncanonical preview voice). The following are illustrative paths, not evidence of a deployed station.

1. **Choose material** in HUMKIN Accident Lab and export a candidate handoff. Get the source audio through your approved local ingest and independently verify its SHA-256.
2. **Run original V20 first listens** from the V20 project folder. A configured and supported audio-capable Gemini model, paid/free quota as applicable, and `GEMINI_API_KEY` are needed for the two independent model calls:

       node scripts/humkin-accident-intake.mjs C:\HUMKIN\handoff.json crate-track-id C:\Audio\approved.mp3 C:\V20\intake-001 --expected-sha256=64_HEX_CHARACTER_DIGEST --listen

   Inspect `encounter.json` and `dialogue.json`. Both must say `two-first-responses-sealed` and `dialogue-sealed`. If either is packet-only, **stop**. The model is not yet ready; a fake response is prohibited.

3. **Assemble original V20 output**, without rewriting its sealed DJ conversations:

       node scripts/build-v20-station-episode.mjs C:\V20\intake-001 episode-001 "Episode One — The Strange Listen" C:\V20\bundles

   Review `bundles/episode-001/index.html` and its receipts. This is the original V20 player bundle, not a transmission-ready MP3.

4. **Render voiced parts.** For an immediate *noncanonical preview* using installed Windows voices:

       powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\render-voice-assets.ps1 -BundleDir C:\V20\bundles\episode-001

   The script writes WAVs and `voice-assets.json`. For the intended canon, replace OS TTS WAVs with the artist's own recorded performances or their expressly authorized voice-model renders of the **unchanged** transcript, and update SHA-256 hashes plus `voice_type`/`voice_identity` claims. The author controls admission.

5. **Produce the real MP3 master**, with FFmpeg on PATH:

       node scripts/render-radio-master.mjs C:\V20\bundles\episode-001 C:\V20\bundles\episode-001\voice-assets.json C:\V20\masters

   The master is `v20-episode-001.mp3`, accompanied by `v20-episode-001.receipt.json`, tagged `RENDERED_AWAITING_EDITORIAL_APPROVAL`.

6. **Review and publish deliberately.** Verify voice rights, source sampling/broadcast permissions, loudness and complete file, then upload/admit it through existing owner-reviewed HUMKIN R2 radio ingest with **artist `Auto Disco V20`**, **album `First-Listen Radio`**, `kind = song`, enabled and published. Retain original episode, source/digests and review record. That precise catalog metadata is what the dedicated Worker filter selects. It does not select ordinary HUMKIN songs.

7. Once the companion HUMKIN station PR's Worker routes are deployed, `/stations/autodisco-v20/live.mp3` becomes an independent per-listener continuous MP3 frequency. The `/fm/v20/` receiver checks `/stations/autodisco-v20/health` and refuses to invent a station if there are no approved matches.

## Distinguish current, partial, and future

**Already implemented in V20:** two independent audio-listen AI calls, sealed replies, model cross-read, portable browser playback, script-based audio-master encoding. **Requires real operator input:** model credential/quota, authorized audio, source digest, voice clips, editorial consent and upload. **Not yet implemented:** an always-running unattended DJ producer, a scheduler making 30–60-minute composite shows from 6–12 songs, automatic voice model creation, synchronized broadcast, live global metadata from Acer or automated radio-publication approvals.

The V20 app also contains `/api/podcast/generate` and a PodcastWidget with browser speech synthesis and synthetic/fallback telemetry. That's a **separate fictional/poetic production lane**. Its existing fallback text must not be called a genuine first listen. Later it can export its own explicitly fictional audio segments using this master-rendering transport without rewriting the evidence semantics.

CI runs the real FFmpeg output test on entirely labeled synthetic WAV/episode fixtures. That verifies mechanical audio rendering, not that real models listened, a human performed the character, or an episode aired.

Companion HUMKIN production station: see `feature/autodisco-v20-real-dial-station`, based on `integration/radio-tower-council-20261118`.