# BROADCAST ASSEMBLY 001 — Press Play Without Rewriting the Witness

BROADCAST ASSEMBLY 001 is the first playback projection built from a completed First-Listen Radio evidence chain.

It does not create first listens or dialogue. It consumes them only after they have been sealed.

```text
exact AUDIO WINDOW
      ↓
sealed Static Sam first listen
sealed Juniper first listen
      ↓
sealed audio cross-read
      ↓
BROADCAST ASSEMBLY
      ↓
episode.json
window.wav
index.html
      ↓
PLAY EPISODE
```

## Required evidence

Assembly refuses to run unless all of these verify together:

- canonical audio window;
- exact audio LOOK TWICE pair;
- exactly two sealed first-listen responses;
- sealed audio dialogue bound to that pair and window.

Packet-only states cannot become a DJ episode.

```text
PACKETS ONLY != FIRST LISTENS
DIALOGUE PACKET != DIALOGUE
ASSEMBLY != MISSING EVIDENCE
```

## Deterministic editorial sequence

The first assembly version does not ask a new model to rewrite the material.

It deterministically composes:

1. a station intro identifying the bounded window;
2. the exact witnessed WAV;
3. each listener's already-sealed closing line;
4. the already-sealed dialogue turns;
5. the sealed lingering-intrigue statement and optional door seed.

The episode manifest carries only references and text. It does not duplicate the audio bytes.

## Portable bundle

The bundle directory contains:

```text
episode.json
window.wav
index.html
```

The copied `window.wav` must preserve the exact canonical audio digest from the original AUDIO WINDOW witness.

The HTML player contains one **PLAY EPISODE** control.

It uses the browser's local Speech Synthesis API to project preserved text around the exact WAV.

That voice is deliberately noncanonical.

```text
ASSEMBLY != VOICE RENDER
BROWSER VOICE != SEALED LISTENER
TEXT IDENTITY != SYNTHESIZED VOICE IDENTITY
```

If speech synthesis is unavailable, the player still advances through the preserved text and plays the canonical audio window.

## Episode identity

The episode digest binds:

- station name;
- episode id/title;
- window identity and audio digest;
- pair id;
- both first-response ids;
- dialogue id/digest;
- deterministic segment sequence;
- assembly laws.

It does not claim a playback happened.

```text
EPISODE != BROADCAST OCCURRENCE
PLAYBACK != REMOTE DELIVERY
BUNDLE != LIVE EVENT
```

## Why this is useful before canonical voice rendering

The first radio episode can become inspectable and playable without introducing a new TTS authority layer.

Later, a voice renderer may replace browser speech with witnessed voice assets. That future renderer must preserve the same transcript and episode identity relationship rather than silently rewriting the editorial record.

## Next crossing

Once a real episode bundle exists, Static Live may admit it as declared broadcast media.

Static Live remains the authority for broadcast occurrence, recording, streaming, scene control, and preservation receipts.

Autodisco remains the authority for the episode assembly artifact.

```text
AUTODISCO EPISODE != STATIC LIVE OCCURRENCE
DECLARED MEDIA != ACTUAL PLAYBACK
```
