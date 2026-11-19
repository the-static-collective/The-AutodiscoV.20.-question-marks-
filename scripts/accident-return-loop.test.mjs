import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {buildAudioWindow} from "./audio-window.mjs";
import {prepareAudioLookTwice,sealAudioFirstResponse} from "./audio-look-twice.mjs";
import {compareListenerSnapshots,buildReturnEvidence,inspectSealedV20} from "./accident-return-core.mjs";
import {runReturnLoop} from "./accident-return-loop.mjs";

const candidate={
  track_id:"song-abc",title:"Synthetic fixture only",artist:"Fixture",
  album:"Fixture",duration_seconds:120,
  src:"https://media.abundent.org/synthetic-fixture.mp3"
};
const handoff={
  schema:"humkin.accident.autodisco-handoff/v1",
  status:"editorial-candidate-only",seed:"test-set-one",
  isolation:{curator_context_must_not_enter_dj_prompt:true,
    local_source_bytes_must_be_verified:true},
  editorial_candidates:[candidate]
};
const aggregate=(at,plays,ratings,dance,observed_row=true)=>({
  schema:"humkin.accident.feedback-snapshot/v1",
  source:"humkin-compost-public-aggregate",complete:true,program_seed:"test-set-one",
  captured_at:at,candidate_track_ids:["song-abc"],
  aggregates:[{
    track_id:"song-abc",plays,ratings,dance,
    stars:ratings?4.5:null,observed_row
  }]
});
const before=aggregate("2026-11-18T18:00:00Z",0,0,0,false);
const after=aggregate("2026-11-18T20:00:00Z",10,5,3);

test("self-reported cumulative changes create provisional evidence, not unique listeners",()=>{
 const result=compareListenerSnapshots(before,after,handoff,"song-abc");
 assert.equal(result.status,"REPORTED_LISTENER_MOVE_INCREASE");
 assert.deepEqual(result.evidence.delta,{plays:10,ratings:5,dance:3});
 assert.equal(result.report.test,"listener_move");
 assert.equal(result.report.status,"reported");
 assert.match(result.evidence.person_uniqueness,/NOT_ESTABLISHED/);
 assert.match(result.evidence.attribution,/NONE/);
 assert.match(result.evidence.replay_inference,/NONE/);
});
test("no raw V20 recording produces no DJ claims; snapshots can still be considered",()=>{
 const result=buildReturnEvidence({handoff,trackId:"song-abc",before,after});
 assert.equal(result.reports.length,1);
 assert.ok(result.held_questions.includes("HOLD_NO_SEALED_V20_ENCOUNTER"));
 assert.equal(result.claims.delayed_replay_verified,false);
 assert.ok(result.evidence_digest.startsWith("sha256:"));
});
test("incomplete, stale, nonmonotonic and cross-program snapshots hold or fail closed",()=>{
 assert.throws(()=>compareListenerSnapshots(before,{...after,program_seed:"foreign"},
   handoff,"song-abc"),/FEEDBACK_SOURCE_OR_PROGRAM_MISMATCH/);
 assert.throws(()=>compareListenerSnapshots(before,{...after,captured_at:before.captured_at},
   handoff,"song-abc"),/FEEDBACK_TIME_NOT_FORWARD/);
 const correction=aggregate("2026-11-18T21:00:00Z",0,2,0);
 const result=compareListenerSnapshots(after,correction,handoff,"song-abc");
 assert.equal(result.status,"HOLD_NON_MONOTONIC_OR_EDITED_COUNTS");
 assert.equal(result.report,null);
 assert.throws(()=>compareListenerSnapshots(before,{...after,aggregates:[]},
   handoff,"song-abc"),/INCOMPLETE_FEEDBACK_AGGREGATES/);
});
test("manual review is exact-match only; strings are declared review, not attestation",()=>{
 const raw=buildReturnEvidence({handoff,trackId:"song-abc",before,after});
 const report=raw.reports[0];
 assert.throws(()=>buildReturnEvidence({handoff,trackId:"song-abc",
   before,after,reviews:[{...report,outcome:"no",review_receipt:"operator-reviewed-yes"}]}),
   /REVIEW_MUST_MATCH_RECORDED_EVIDENCE/);
 const approved=buildReturnEvidence({handoff,trackId:"song-abc",
   before,after,reviews:[{...report,review_receipt:"operator-reviewed-yes"}]});
 assert.equal(approved.reports[0].status,"reviewed");
 assert.equal(approved.review_meaning.includes("not independent authentication"),true);
});
function canonicalWavOneSecond(){
 const pcm=Buffer.alloc(44100*2*2),header=Buffer.alloc(44);
 header.write("RIFF",0);header.writeUInt32LE(pcm.length+36,4);
 header.write("WAVE",8);header.write("fmt ",12);header.writeUInt32LE(16,16);
 header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);
 header.writeUInt32LE(44100,24);header.writeUInt32LE(176400,28);
 header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);
 header.write("data",36);header.writeUInt32LE(pcm.length,40);
 return Buffer.concat([header,pcm]);
}
test("fixture-sealed first listen only counts after the real V20 verifier accepts both",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"autodisco-return-audio-"));
 try{
   const source=path.join(dir,"fixture.wav");
   await fs.writeFile(source,canonicalWavOneSecond());
   const window=await buildAudioWindow({schema:"autodisco.audio-window-request/v0",
     source_path:source,start_ms:0,end_ms:1000,
     declared_metadata:{window_label:"Blind specimen"}});
   const pair=prepareAudioLookTwice({schema:"autodisco.audio-look-twice-prepare-request/v0",window});
   const first_responses=pair.packets.map(packet=>sealAudioFirstResponse(pair,
     packet.packet_id,{
       observations:[
         {mode:"OBSERVED",text:"Fixture contains silence."},
         {mode:"INTERPRETATION",text:"Nothing is audible here."}
       ],
       lingering_intrigue:true,closing_line:"Fixture-only impression."
     },"SYNTHETIC_CI_FIXTURE_NOT_AN_ACTUAL_MODEL"));
   const encounter={
     status:"two-first-responses-sealed",pair_id:pair.pair_id,
     window_id:window.window_id,first_responses
   };
   const operator={
     schema:"humkin.accident.operator-context/v1",
     editorial_candidate:candidate,local_sha256:window.source.sha256
   };
   const outcome=inspectSealedV20({window,pair,encounter,operator},"song-abc");
   assert.equal(outcome.reports.length,1);
   assert.equal(outcome.reports[0].test,"dj_intrigue");
   assert.equal(outcome.reports[0].status,"reported");
   assert.ok(outcome.holds.includes("HOLD_NO_SEALED_DJ_DIALOGUE"));
   const tampered={...encounter,first_responses:[
     {...first_responses[0],response:{...first_responses[0].response,lingering_intrigue:false}},
     first_responses[1]
   ]};
   assert.throws(()=>inspectSealedV20({window,pair,encounter:tampered,operator},
     "song-abc"),/MISMATCH|ID|SHA256/);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test("true native MOTIF comparison changes eligible hypotheses after an explicit reviewed signal",
  {skip:!process.env.MOTIF_REPO},async()=>{
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),"autodisco-motif-return-"));
    try{
      const pending=buildReturnEvidence({handoff,trackId:"song-abc",before,after});
      const review=[{...pending.reports[0],review_receipt:"synthetic-test-reviewed-count-001"}];
      const packet=await runReturnLoop({handoff,trackId:"song-abc",
        before,after,reviews:review,motifDir:process.env.MOTIF_REPO,
        outputDir:dir,python:process.env.MOTIF_PYTHON||"python3"});
      assert.equal(packet.status,"UPDATED_ON_DECLARED_REVIEW");
      assert.equal(packet.reports_seen,1);
      assert.equal(packet.declared_reviews,1);
      assert.equal(packet.changed_hypothesis_set,true);
      assert.ok(packet.hypotheses_before.includes("weak-signal"));
      assert.equal(packet.hypotheses_after.includes("weak-signal"),false);
      assert.equal(packet.action,"PROPOSE_ONLY");
      assert.equal(packet.public_broadcast,"NONE");
      assert.ok(packet.motif_next_probe);
      const files=await fs.readdir(dir);
      assert.ok(files.includes("motif-updated-compare.json"));
      assert.ok(files.includes("return-evidence.json"));
    }finally{await fs.rm(dir,{recursive:true,force:true})}
  });
