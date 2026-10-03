# AUDIO WINDOW 001 — The First Real Radio Carrier

AUDIO WINDOW 001 replaces the visual proof carrier with a bounded piece of actual sound while preserving the same temporal-isolation law.

```text
local audio source
      ↓
exact requested bounds
      ↓
canonical PCM WAV window
      ↓
window digest + source digest + bounds
      ↓
two isolated first-listen booths
      ↓
two sealed first responses
      ↓
audio closes
      ↓
cross-read over responses only
```

## Canonical carrier

The v0 carrier is:

- 44.1 kHz;
- stereo;
- 16-bit signed PCM;
- WAV;
- maximum requested duration: 45 seconds;
- maximum inline payload: 12 MiB.

Canonical WAV sources with this exact format are sliced directly by sample frame.

Other common audio sources may be decoded through local `ffmpeg` into the canonical carrier.

The produced window records:

- source SHA-256;
- source MIME type and basename;
- requested start/end milliseconds;
- extraction method;
- canonical frame count and duration;
- canonical audio SHA-256;
- exact canonical WAV bytes;
- one opaque `window_label`.

No artist biography, album history, lyrics, genre tags, prior interpretation, or catalog context is admitted through the declared metadata schema.

## Identity

The window id binds:

- source digest;
- requested bounds;
- canonical audio digest;
- canonical format facts;
- extraction facts;
- declared window label;
- protocol laws.

The base64 transport is reduced to its own digest before identity calculation.

```text
WINDOW != WHOLE TRACK
SOURCE DIGEST != WINDOW DIGEST
TIME BOUNDS != INTERPRETATION
DECLARED METADATA != CATALOG HISTORY
```

## Audio LOOK TWICE

Two packets are generated from the same `window_ref`.

Static Sam and Juniper receive distinct packet identities but the same exact canonical audio digest.

When a real Gemini key is available, the implementation makes two independent `generateContent` calls and attaches the same bounded WAV bytes to each call.

The first-listen prompt allows only claims about what is audibly present inside that window.

Each sealed first response binds:

- pair id;
- packet id;
- listener identity;
- window id;
- audio digest;
- model identity;
- response digest;
- response body.

## Cross-read

The dialogue packet contains:

- window reference;
- sealed first response A;
- sealed first response B.

It deliberately contains no audio bytes.

```text
FIRST LISTEN PRECEDES CROSS-READ
AUDIO WINDOW IS NOT REOPENED
DIALOGUE != RETROACTIVE FIRST LISTEN
```

The exchange may yield lingering intrigue and a proposed door seed, but neither is source truth or automatic authority.

## Honest absence

Without a real model key:

```text
audio pair exists
first_responses = []
dialogue locked
```

With two already sealed first responses but no dialogue model:

```text
dialogue packet exists
dialogue = null
```

No simulated listening or simulated conversation is substituted.

## Current proof boundary

CI proves:

- deterministic canonical WAV slicing;
- sample-bound identity;
- audio-byte digest verification;
- hidden metadata rejection;
- two distinct listener packets over one audio digest;
- no-key silence;
- two-response dialogue gate;
- dialogue packet contains no audio bytes.

A live model listen remains runtime evidence and is not fabricated in CI.
