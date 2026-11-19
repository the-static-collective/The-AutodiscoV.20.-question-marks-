#!/usr/bin/env node
/* HUMKIN ↔ V20 ↔ MOTIF return loop.
 * Owner-only local artifacts. No listener identifiers, live uploads or auto-airing.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {buildMotifAccidentCase,runNativeMotifCase} from "./motif-accident-lab.mjs";
import {buildReturnEvidence} from "./accident-return-core.mjs";

async function optionalJSON(file) {
  try{return JSON.parse(await fs.readFile(file,"utf8"))}
  catch(e){if(e.code==="ENOENT")return null;throw e}
}
function argsFromFlags(flags) {
  const found={};
  for(const flag of flags){
    const m=/^--(before|after|reviews)=(.+)$/.exec(flag);
    if(!m||found[m[1]])throw Error("UNRECOGNIZED_OR_DUPLICATE_OPTION");
    found[m[1]]=m[2];
  }
  if(Boolean(found.before)!==Boolean(found.after))
    throw Error("BOTH_FEEDBACK_SNAPSHOTS_REQUIRED");
  return found;
}
export async function runReturnLoop({handoff,trackId,v20={},before=null,after=null,reviews=[],
  motifDir,outputDir,python=process.platform==="win32"?"py -3":"python3"}={}) {
  if(!motifDir||!outputDir)throw Error("MOTIF_AND_PRIVATE_OUTPUT_REQUIRED");
  const out=path.resolve(outputDir);
  if(out===path.parse(out).root)throw Error("OUTPUT_MUST_NOT_BE_FILESYSTEM_ROOT");
  const evidence=buildReturnEvidence({handoff,trackId,v20,before,after,reviews});
  const initial=buildMotifAccidentCase(handoff,trackId,[]);
  const updated=buildMotifAccidentCase(handoff,trackId,evidence.reports);
  await fs.mkdir(out,{recursive:true});
  const write=(file,data)=>fs.writeFile(path.join(out,file),
    JSON.stringify(data,null,2)+"\n","utf8");
  await write("return-evidence.json",evidence);
  await write("motif-baseline-case.json",initial);
  await write("motif-updated-case.json",updated);
  const baseline=await runNativeMotifCase(initial,{
    motifDir,casePath:path.join(out,"motif-baseline-case.json"),python});
  const next=await runNativeMotifCase(updated,{
    motifDir,casePath:path.join(out,"motif-updated-case.json"),python});
  await write("motif-baseline-compare.json",baseline);
  await write("motif-updated-compare.json",next);
  const beforeHypotheses=baseline.motif_spine.remaining_hypotheses;
  const afterHypotheses=next.motif_spine.remaining_hypotheses;
  const reviewed=evidence.reports.filter(r=>r.status==="reviewed").length;
  const packet={
    schema:"autodisco.accident.next-experiment/v1",
    status:reviewed?"UPDATED_ON_DECLARED_REVIEW":"PROVISIONAL_REPORTS_AWAIT_REVIEW",
    selected_track_id:trackId,
    evidence_digest:evidence.evidence_digest,
    reports_seen:evidence.reports.length,
    declared_reviews:reviewed,
    holds:evidence.held_questions,
    hypotheses_before:beforeHypotheses,
    hypotheses_after:afterHypotheses,
    changed_hypothesis_set:JSON.stringify(beforeHypotheses)!==JSON.stringify(afterHypotheses),
    motif_next_probe:next.motif_spine.next_probe,
    classical_next_probe:next.strong_classical_ig.next_probe,
    motif_status:next.motif_spine.result,
    human_review_required:true,
    action:"PROPOSE_ONLY",
    public_broadcast:"NONE",
    new_audio_first_listens:"NONE",
    change_listening_rotation:"NONE",
    note:"Native MOTIF updated from declared evidence. This is not causal proof, model performance improvement, consent to broadcast or a verified real-world intervention."
  };
  await write("next-experiment.json",packet);
  return packet;
}

async function main() {
  const [handoffFile,trackId,v20Dir,motifDir,outDir,...flags]=process.argv.slice(2);
  if(!handoffFile||!trackId||!v20Dir||!motifDir||!outDir)throw Error(
    "Usage: node scripts/accident-return-loop.mjs handoff.json track-id /private/v20-run /path/to/MOTIF /private/output [--before=before.json --after=after.json] [--reviews=reviews.json]");
  const options=argsFromFlags(flags);
  const handoff=JSON.parse(await fs.readFile(handoffFile,"utf8"));
  const v20={};
  for(const name of ["operator","window","pair","encounter","dialogue"]) {
    const file=name==="operator"?"operator-context.json":name+".json";
    v20[name]=await optionalJSON(path.join(v20Dir,file));
  }
  const [before,after,reviews]=await Promise.all([
    options.before?optionalJSON(options.before):null,
    options.after?optionalJSON(options.after):null,
    options.reviews?optionalJSON(options.reviews):[]
  ]);
  if(options.reviews&&!Array.isArray(reviews))
    throw Error("INVALID_REVIEW_FILE");
  if(options.before&&(!before||!after))throw Error("SNAPSHOTS_NOT_FOUND");
  const packet=await runReturnLoop({handoff,trackId,v20,before,after,reviews,
    motifDir,outputDir:outDir,python:process.env.MOTIF_PYTHON||(process.platform==="win32"?"py -3":"python3")});
  process.stdout.write(JSON.stringify(packet,null,2)+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  main().catch(error=>{
    process.stderr.write(JSON.stringify({error:error instanceof Error?error.message:"Return loop failed"})+"\n");
    process.exitCode=1;
  });
}
