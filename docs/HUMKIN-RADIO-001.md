# HUMKIN RADIO 001 — The Station Remembers; the DJs Arrive

**Status:** public static on-demand experiment + source-owned editorial handoff. Not a live broadcast, not a radio license, not first-listen DJ generation.

## Why V20 is the parent, not a duplicate

Auto Disco V20 already owns `/api/radio/host`, `PodcastWidget`, `scripts/audio-window.mjs`, `scripts/audio-look-twice.mjs`, and `scripts/broadcast-assembly.mjs`. Existing `FIRST-LISTEN-RADIO.md` explicitly protects isolated first listens, two sealed responses, human-originated DJ voices, editorial receipts, and no secret memory in the first-listen booth. This HUMKIN sidecar adds what was missing **for the public front door**, without substituting its fictional writing for actual heard audio:

1. Three listener-selected *moment* doors: beautiful / strange / home.
2. Three clearly fictional shortwave transmissions leading to three already-published HUMKIN album preview excerpts.
3. Human-readable, shareable channel URLs, with no registration and no data sent to the station.
4. Optional, explicitly consented local-only history (browser storage only). The station remembers locally; a first-listen DJ never receives that history.
5. A versioned manifest and deterministic, metadata-only editorial handoff into the *existing* V20 audio-window → isolated listens → sealed exchange → broadcast assembly pipeline.

## Inputs and limitations

The site uses only the three **previously posted public teaser MP3s** (not twelve master files): `/previews/A-noontime-bloom.mp3`, `/previews/B-we-are-still-here.mp3`, `/previews/C-first-light-finds-your-face.mp3`. Promotional rights for the public previews are distinct from downstream sublicensing or DSP distribution rights and need independent clearance. No model calls, geolocation, advertising pixels, cookies, server-side visitor accounts, or fabricated reception claims. Track choice is deterministic and **not** a learned recommendation model.

## Public vs. private surfaces

- Public: website `/radio/` reads `manifest.json`; plays user-initiated previews; offers copy/share of a channel link. Transmissions are visibly marked `FICTION` and prewritten. The optional local browser history is opt-in and erasable.
- Editorial V20: `scripts/humkin-station.mjs` creates the same manifest and a *metadata-only* `autodisco.humkin-editorial-handoff/v1` that can initiate V20's authorized audio-window work later. Neither preview URL nor fictional transmission is automatically passed to a sealed first-listen model.
- Future: first-listen DJ content must originate from true bounded audio listening, sealed and audited by V20; not from website narratives. Performer-originated voices require actual human performances and separate permission.

## Reproduce and test

```sh
node scripts/humkin-station.mjs manifest > /tmp/humkin-station.json
node scripts/humkin-station.mjs handoff beautiful
node --test scripts/humkin-station.test.mjs
npm run test:radio-isolation
```

The public `radio/manifest.json` is generated from the manifest command. It must stay byte-identical to the source of truth; **do not hand-edit its claims**. Existing V20 radio tests continue to be authoritative for DJ semantics.

## Public editor's next gate

Before a full hour-long episode: collect authorized master audio and human DJ voice seeds, use V20's bounded window tool, run two genuine isolated first listens, seal them before their dialogue, then assemble and audit a prerecorded station artifact. Do not call the three public transmissions a full episode or an actual AI observation.