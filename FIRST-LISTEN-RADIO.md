# LOOK TWICE: First-Listen Radio

> **The station remembers. The DJs arrive.**

This repository is a likely implementation surface for **Static Collective Radio**: a continuous broadcast from The Autodiscography with AI DJs who genuinely hear each bounded playlist window for the first time.

The governing canon currently lives in:

- Repository: `the-static-collective/the-autodisco`
- File: `canon/FIRST-LISTEN-RADIO.md`
- Canon seed commit: `83f032b438e7264d3dfdfd2f0b3eb2b3f05484d0`

## Why this file is at the repository root

Someone opening this project later should not mistake it for merely another AI Studio app.

Autodisco 20 may become the first place where the station actually speaks.

## The core mechanism

Two or more models receive the same bounded listening packet in isolated sessions. Each produces an independent first response before seeing any other DJ's interpretation. Only after those responses are sealed may a brief exchange occur.

The voices are not generic announcers. The human artist performs original DJ characters, records seed scripts, and uses those authorized performances to seed voice models.

The language model supplies the observation. The performer-originated voice model supplies the sound.

## Initial implementation target

Build one prerecorded thirty- to sixty-minute broadcast containing:

- six to twelve catalog tracks;
- two isolated first-listen DJs;
- one artist-originated voice per DJ;
- four to eight short interstitials;
- sealed independent first responses before dialogue;
- visible provenance and generation receipts;
- no requirement for live twenty-four-hour generation.

## Non-negotiable invariant

A first-listen DJ must not receive hidden catalog history, prior DJ transcripts, motif retrieval, or any other memory that turns "first hearing" into theater.

The station may remember. Ordinary DJs may not, unless their role explicitly declares otherwise.

## Initial cast seeds

- **Static Sam** — late-night continuity witness; dry, intimate, quietly delighted.
- **Juniper** — emotionally exact pattern-reader; calm and unhurried.
- **The New Listener** — candid audience surrogate; skeptical but persuadable.
- **The Archivist** — rare, declared exception with verifiable lineage access.

## First code question

Where in the current app can we insert a reversible `radio` route or mode without disturbing existing Autodisco behavior?

Any future contributor who notices this file should inspect the canon before deleting, renaming, or flattening the idea.
