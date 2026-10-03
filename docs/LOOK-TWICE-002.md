# LOOK TWICE 002 — Two Sealed First Encounters Before Dialogue

LOOK TWICE 002 makes the central First-Listen Radio law executable for one bounded visual artifact.

```text
same artifact
   ├──→ Static Sam packet
   │       ↓ isolated model call
   │    sealed first response A
   │
   └──→ Juniper packet
           ↓ isolated model call
        sealed first response B

ONLY AFTER A + B ARE SEALED
           ↓
      dialogue packet
           ↓
      short cross-read
           ↓
 lingering intrigue?
           ↓
       future door seed
```

## Three resumable stages

### 1. Prepare

`prepareLookTwice()` accepts only:

- schema;
- exact artifact media type;
- artifact SHA-256;
- exact artifact bytes.

It produces two distinct first-encounter packets over the same artifact.

Each packet explicitly prohibits:

- catalog history;
- prior DJ transcripts;
- the other listener's response;
- motif retrieval;
- hidden House history;
- simulated first response.

### 2. Encounter

`runIsolatedEncounters()` launches two independent model calls.

Static Sam cannot see Juniper's packet or response.

Juniper cannot see Static Sam's packet or response.

Each response is sealed into a content-addressed identity binding:

- pair id;
- exact packet id;
- listener identity;
- source digest;
- model identity;
- response digest;
- response body.

The first-response identity is immutable.

If no real model key exists:

```text
status = packets-only
first_responses = []
```

No simulated response is substituted.

### 3. Dialogue

`buildDialoguePacket()` refuses to exist until exactly two distinct first responses verify against the exact pair.

The dialogue packet contains the sealed first responses but deliberately does **not** reopen the original artifact.

That makes the temporal claim inspectable:

```text
FIRST RESPONSE PRECEDES CROSS-READ
```

The dialogue cannot alter either first-response identity.

If no real model key exists:

```text
status = dialogue-packet-only
dialogue = null
```

Again, no simulated exchange is substituted.

## Lingering intrigue

A real dialogue may return:

- short alternating turns;
- explicit convergences;
- explicit differences;
- `lingering_intrigue`;
- an intrigue statement;
- one optional `door_seed`.

A door seed is a proposal, not a crossing.

```text
LINGERING INTRIGUE != SOURCE TRUTH
DOOR SEED != CROSSING
```

## Laws

```text
SAME ARTIFACT != SHARED CONTEXT
FIRST RESPONSE PRECEDES CROSS-READ
ISOLATED CALL A != ISOLATED CALL B
SEALED != SHARED
DIALOGUE != RETROACTIVE FIRST IMPRESSION
STATION MEMORY != DJ MEMORY
SIMULATION != FIRST ENCOUNTER
SIMULATION != DIALOGUE
```

## Next carrier

The visual artifact is intentionally small.

Once this temporal isolation protocol is stable, the same three-stage architecture can carry a bounded audio window without changing the authority law.
