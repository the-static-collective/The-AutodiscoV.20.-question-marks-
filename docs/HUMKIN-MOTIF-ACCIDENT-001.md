# MOTIF × Accident Frequency — Native Experimental Director 001

**Status:** owner-invoked, local, read-only experiment proposal. It runs MOTIF's actual original Python Reasoning Spine module pinned in CI at `9593b0b8e1f9e70bfc09e72adc49ee64e567609b`. It is not an LLM, automatic audio listener, or live station server.

## Exact seam

1. Export HUMKIN Accident Frequency's editorial handoff, which names six already approved music candidates.
2. The original V20 bridge separately uses those candidates for privately prepared blind AUDIO WINDOW → LOOK TWICE first listens. Model inputs exclude catalog history.
3. The new `scripts/motif-accident-lab.mjs` produces an explicit `motif.reason-case/v1` that does **not** contain song identity, title, audio, source URI, artist, play counts or feedback texts. Four **operator-authored** rival hypotheses (hidden gem, context unlock, productive strangeness, weak signal) predict four tests (blind listener response, delayed replay, contextual pairing, independent DJ disagreement). The assumptions are provisional, not learned musical knowledge.
4. It launches the actual local MOTIF source through `python -m motif.cli compare --case` (Python 3.11, standard library) and preserves `motif.reason-spine-comparison/v1`. This compares fixed order, strong classical information gain and MOTIF cost/risk-aware proposals. A highest-ranked probe is a candidate voluntary **experiment**, not an automatic broadcast decision.
5. Optionally pass a separate reports JSON array of declared `source_root`, `test`, `outcome` and `status` fields. A `reviewed` status requires `review_receipt`; neither identity nor review string is authenticated by this tool. Contradictory inputs are preserved for MOTIF to hold rather than silently overwriting.
6. Output is `motif-case.json` and `motif-advice.json` in a private folder. MOTIF never changes playlists, runs DJ encounters, executes external actions, publishes, or mints chart points.

## Example

Clone/update `the-static-collective/MOTIF` separately, at the CI-pin commit if reproducibility matters, and place its path below.

    node scripts/motif-accident-lab.mjs /private/humkin-v20-editorial-handoff.json song-123 /path/to/MOTIF /private/motif-experiment

For a second assessment after actual feedback, add a fifth argument: `/private/reports.json`. A report might declare `{"source_root":"reviewed-station-week-2026w47","test":"delayed_replay","outcome":"yes","status":"reported"}`. This is a claim, not independent attestation.

## Hard boundary

**MOTIF is an experimental inquiry planner, not the audio perceptual model.** Its native Reasoning Spine does not examine audio waveforms, encode learned music embeddings, or automatically detect styles. V20's isolated audio first-listen model is the perceptual component; HUMKIN supplies the playable source catalog and listeners' self-reported reactions.

The strongest near-term use is choosing between **real-world experiments** using inspectable competing hypotheses, not claiming that MOTIF has acquired music taste. Future stages can expand to source-pinned graph features, observed relationships and post-listen graph transformations after measuring each against classical controls.

## Verification

CI checks out the original native MOTIF implementation at pinned commit and actually runs the comparator through the Node bridge. The Node tests also assert that title/artist/album/audio/source URL/track ID cannot enter MOTIF's case, and that reported observations are not silently promoted to verified truth.

Neither this bridge nor HUMKIN PR #154 has yet proved a field deployment. Merge, install, supply local source audio and do a genuine first-listen run before advertising a model-hosted DJ station.

Related review: https://github.com/the-static-collective/HUMKIN/pull/154