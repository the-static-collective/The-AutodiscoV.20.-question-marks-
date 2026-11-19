import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import {buildMotifAccidentCase,runNativeMotifCase} from "./motif-accident-lab.mjs";

const source={
  schema:"humkin.accident.autodisco-handoff/v1",
  status:"editorial-candidate-only",
  isolation:{curator_context_must_not_enter_dj_prompt:true,
    local_source_bytes_must_be_verified:true},
  editorial_candidates:[{
    track_id:"obscure-001",title:"SECRET SONG TITLE",artist:"SECRET ARTIST",
    src:"https://media.abundent.org/audio/original.mp3",album:"SECRET ALBUM",
    duration_seconds:180,observed_play_count:0
  }]
};
test("MOTIF case remains blind to editorial data and authored assumptions stay explicit",()=>{
  const caseData=buildMotifAccidentCase(source,"obscure-001");
  assert.equal(caseData.schema,"motif.reason-case/v1");
  assert.equal(caseData.hypotheses.length,4);
  assert.equal(caseData.tests.length,6);
  assert.deepEqual(caseData.reports,[]);
  const serialized=JSON.stringify(caseData);
  for(const token of ["SECRET SONG TITLE","SECRET ARTIST","SECRET ALBUM",
    "obscure-001","original.mp3","observed_play_count"])
    assert.equal(serialized.includes(token),false);
  assert.ok(caseData.context.includes("operator-authored"));
});
test("provenance is a declared report, not an invented verified result",()=>{
  const reports=[{source_root:"listener-claim-A",test:"delayed_replay",outcome:"yes",status:"reported"}];
  const result=buildMotifAccidentCase(source,"obscure-001",reports);
  assert.deepEqual(result.reports,reports);
  assert.throws(()=>buildMotifAccidentCase(source,"obscure-001",
    [{...reports[0],status:"reviewed"}]),/REVIEW_RECEIPT_REQUIRED/);
  assert.throws(()=>buildMotifAccidentCase(source,"wrong-id"),/CANDIDATE_NOT_IN_HANDOFF/);
});
test("original native MOTIF Python comparator actually runs when checkout is provided",
  {skip:!process.env.MOTIF_REPO},async()=>{
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),"motif-accident-test-"));
    try {
      const caseData=buildMotifAccidentCase(source,"obscure-001");
      const file=path.join(dir,"case.json");
      await fs.writeFile(file,JSON.stringify(caseData));
      const result=await runNativeMotifCase(caseData,{
        motifDir:process.env.MOTIF_REPO,casePath:file,python:process.env.MOTIF_PYTHON||"python3"
      });
      assert.equal(result.schema,"motif.reason-spine-comparison/v1");
      assert.equal(result.motif_spine.external_action,"NONE");
      assert.equal(result.motif_spine.human_review_required,true);
      assert.ok(result.motif_spine.next_probe);
      assert.equal(result.real_pretrained_llm.status.startsWith("NOT_RUN"),true);
      assert.ok(result.strong_classical_ig.next_probe);
    } finally { await fs.rm(dir,{recursive:true,force:true}); }
  });
