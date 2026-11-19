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

## RETURN LOOP 002 — listen, compare, decide what to test next

HUMKIN's Auto Disco experimental station now exports an **aggregate-only** feedback snapshot from its existing `humkin-compost` public stats. The first export pins that six-track set for the current page session; repeat the export later before changing frequencies or starting a new experiment. Files contain the six source track IDs, cumulative plays, ratings and `dance` classifications, not individual listener/device/network identifiers. Keep the first and second exports together with the **same handoff**.

1. On `/fm/autodisco/`, export `humkin-v20-editorial-handoff.json`. Export a feedback snapshot before a listening period. After listeners have had an opportunity to respond, export a second snapshot from the same six-track program.
2. Separately run the first-listen intake for one specific track with independently reviewed source audio and expected SHA-256. It can create `operator-context.json`, `window.json`, `pair.json`, and, if real models are configured and executed, `encounter.json` / `dialogue.json` in a private folder.
3. Run the actual feedback-to-MOTIF bridge against the ORIGINAL local MOTIF checkout:

    node scripts/accident-return-loop.mjs /private/humkin-v20-editorial-handoff.json song-123 /private/v20-run /path/to/MOTIF /private/round-001 --before=/private/before.json --after=/private/after.json

The CLI validates that both aggregate snapshots refer to the **same program seed, same complete selected-track list and increasing capture times**. It accepts only a quantitative increase in cumulative `dance` classifications of at least three as a provisional `listener_move=yes` report; it does not infer verified distinct humans, causal impact, real delayed replay, or negative audience sentiment from missing data. Decreasing or inconsistent aggregate totals are HELD, because ratings can be edited.

For V20, it reuses the original protocol's audio-window, pair, sealed-first-response and episode-assembly verifiers, checks source-identity binding and the dialogue digests, and records two narrowly scoped observations: whether the *models* both declared `lingering_intrigue`, and whether their sealed cross-read declared differences. A model's artistic interpretation is **not** human reaction or established truth. If no real model encounter exists, V20 contributes **no** first-listen report.

4. Inspect `return-evidence.json` and its `provenance`, `held_questions`, source roots and statuses. They default to `reported`, so the MOTIF Reasoning Spine will preserve but not treat them as verified ground truth. Its baseline and updated policy comparisons are written to separate artifacts. `next-experiment.json` states the next voluntary probe and whether any authored hypotheses actually changed.
5. To explicitly *declare a human review*, create a local `reviews.json` containing **only matching** `test`, `source_root`, `outcome`, `review_receipt` from the raw evidence. Example review is not an authenticated signature, outside auditing, confirmed model truth, human consent or station publishing. Repeat with `--reviews=/private/reviews.json`. Only exact matches to a source-linked report may advance its `status` to `reviewed`; MOTIF's original model-family filter can then revise hypothetical candidates.

    node scripts/accident-return-loop.mjs /private/humkin-v20-editorial-handoff.json song-123 /private/v20-run /path/to/MOTIF /private/round-002 --before=/private/before.json --after=/private/after.json --reviews=/private/reviews.json

### Outputs and independence

`return-evidence.json` is the source-linked record; `motif-baseline-case.json`/`motif-updated-case.json` are intentionally **source-agnostic** proposals; `motif-baseline-compare.json`/`motif-updated-compare.json` contain real native MOTIF and strong classical comparisons; `next-experiment.json` compares before/after eligible hypotheses and supplies the proposed next test.

**Deliberate HOLD:** listeners may react for reasons unrelated to the radio's editorial placement, and all public totals are cumulative. A change is a measured count difference under the tool's self-described API, not a randomized experiment. First-listen model dialogue and human feedback are recorded as distinct source families; one does not certify the other. A declared review is a human-entered decision, not a cryptographically trusted attestation.

CI verifies the full synthetic-data return loop using the actual pinned MOTIF Python source and native classical controls. The synthetic fixtures do **not** claim that two real AI DJs listened or that real people provided feedback.

**Current deployment status:** local owner-run workflow proposed by draft PR. No automatic recurring cloud run, no private service-role credentials in the browser, and no auto-created station carts, vinyl lists, broadcast episodes or published programs.
