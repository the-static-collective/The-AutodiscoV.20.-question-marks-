#!/usr/bin/env node
/* MOTIF x Accident Frequency: optional operator-invoked experimental director.
 * Calls ORIGINAL MOTIF local Python source, never simulates MOTIF and never
 * inserts editorial history into V20 blind-listening model prompts.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {selectHandoffTrack} from "./humkin-accident-intake.mjs";

const CASE_SCHEMA="motif.reason-case/v1";
const METHODS=Object.freeze([
  {
    id:"hidden-gem",
    description:"Neglected recordings contain durable listener appeal.",
    predictions:{blind_excitement:"yes",delayed_replay:"yes",contextual_pairing:"no",dj_disagreement:"no",dj_intrigue:"yes",listener_move:"yes"},
  },
  {
    id:"context-unlock",
    description:"An unexpected neighbor makes the recording meaningful.",
    predictions:{blind_excitement:"no",delayed_replay:"no",contextual_pairing:"yes",dj_disagreement:"no",dj_intrigue:"no",listener_move:"yes"},
  },
  {
    id:"productive-strangeness",
    description:"Differences between listeners expose a useful creative frontier.",
    predictions:{blind_excitement:"yes",delayed_replay:"no",contextual_pairing:"yes",dj_disagreement:"yes",dj_intrigue:"yes",listener_move:"yes"},
  },
  {
    id:"weak-signal",
    description:"Low exposure alone does not predict a rediscovery.",
    predictions:{blind_excitement:"no",delayed_replay:"no",contextual_pairing:"no",dj_disagreement:"no",dj_intrigue:"no",listener_move:"no"},
  },
]);
const PROBES=Object.freeze([
  {id:"blind_excitement",cost:0.10,risk:0.01,description:"Obtain one independent, unprimed response to the approved sound."},
  {id:"delayed_replay",cost:0.40,risk:0.01,description:"Observe a voluntary replay after a time gap."},
  {id:"contextual_pairing",cost:0.20,risk:0.02,description:"Compare the same song alongside an unexpected approved neighbor."},
  {id:"dj_disagreement",cost:0.15,risk:0.01,description:"Compare sealed independent V20 observations; do not synthesize disagreement."},
  {id:"dj_intrigue",cost:0.09,risk:0.01,description:"Read whether both verified V20 first-listen responses declare lingering intrigue; model opinion only."},
  {id:"listener_move",cost:0.18,risk:0.02,description:"Compare two same-program public aggregate snapshots for an increase of at least three self-reported dance classifications; not unique listeners or causation."},
]);

export function buildMotifAccidentCase(handoff,trackId,reports=[]) {
  selectHandoffTrack(handoff,trackId); // trusted editorial membership; NEVER sent to MOTIF
  if(!Array.isArray(reports)||reports.length>48)throw Error("INVALID_EXPERIMENT_REPORTS");
  const allowed=new Set(PROBES.map(p=>p.id));
  const entries=[];
  for(const r of reports){
    if(!r||!allowed.has(r.test)||!["yes","no","unknown"].includes(r.outcome)||
       typeof r.source_root!=="string"||!r.source_root||
       !["reported","reviewed"].includes(r.status))throw Error("INVALID_EXPERIMENT_REPORT");
    if(r.status==="reviewed"&&(!r.review_receipt||typeof r.review_receipt!=="string"))
      throw Error("REVIEW_RECEIPT_REQUIRED");
    // This is a claimed source label, not a verified independent listener.
    entries.push({source_root:r.source_root,test:r.test,outcome:r.outcome,status:r.status,
      ...(r.status==="reviewed"?{review_receipt:r.review_receipt}:{})});
  }
  return {
    schema:CASE_SCHEMA,
    question:"Which of four explicitly authored theories should the Accident Frequency test next?",
    goal:"Choose a bounded, voluntary probe that distinguishes how overlooked approved music can find an audience.",
    context:"Working hypotheses only. Predictions are operator-authored, not learned or established; this case intentionally contains no catalog metadata, track title, artist, audio or personal listener data.",
    hypotheses:METHODS.map(m=>({id:m.id,predictions:{...m.predictions},
      plan:m.description})),
    tests:PROBES.map(p=>({...p})),
    reports:entries,
  };
}

function runProcess(binary,args,cwd,timeout=10000) {
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{cwd,stdio:["ignore","pipe","pipe"],shell:false,
      env:{PATH:process.env.PATH||"",SYSTEMROOT:process.env.SYSTEMROOT||"",
        HOME:process.env.HOME||"",PYTHONPATH:"",PYTHONDONTWRITEBYTECODE:"1"}});
    let stdout="",stderr="";
    const timer=setTimeout(()=>child.kill("SIGKILL"),timeout);
    child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
    child.stdout.on("data",c=>{stdout+=c;if(stdout.length>600000)child.kill("SIGKILL")});
    child.stderr.on("data",c=>{stderr+=c;if(stderr.length>20000)child.kill("SIGKILL")});
    child.on("error",error=>{clearTimeout(timer);reject(error)});
    child.on("close",code=>{
      clearTimeout(timer);
      if(code!==0)return reject(Error("NATIVE_MOTIF_HELD: "+stderr.slice(0,500)));
      resolve(stdout);
    });
  });
}

export async function runNativeMotifCase(caseData,{motifDir,casePath,python=process.platform==="win32"?"py -3":"python3"}={}) {
  if(!motifDir||!casePath)throw Error("LOCAL_MOTIF_REPO_AND_CASE_FILE_REQUIRED");
  const root=path.resolve(motifDir);
  const source=path.join(root,"motif","reason_spine.py");
  const stat=await fs.stat(source).catch(()=>null);
  if(!stat?.isFile())throw Error("NATIVE_MOTIF_SOURCE_NOT_FOUND");
  // Invokes the original MOTIF Python CLI; no reimplementation, web API or credentials.
  const py=(python==="py -3"?{bin:"py",args:["-3"]}:{bin:python,args:[]});
  const stdout=await runProcess(py.bin,[...py.args,"-m","motif.cli","compare","--case",path.resolve(casePath)],root);
  const result=JSON.parse(stdout);
  if(result.schema!=="motif.reason-spine-comparison/v1"||
     result.motif_spine?.schema!=="motif.reason-spine/v1"||
     result.motif_spine.external_action!=="NONE")throw Error("UNEXPECTED_NATIVE_MOTIF_RESULT");
  return result;
}

async function main() {
  const [handoffFile,trackId,motifDir,outputDir,...flags]=process.argv.slice(2);
  if(!handoffFile||!trackId||!motifDir||!outputDir)throw Error(
    "Usage: node scripts/motif-accident-lab.mjs handoff.json track-id /path/to/MOTIF /private/output [reports.json]");
  if(flags.length>1)throw Error("TOO_MANY_ARGUMENTS");
  const handoff=JSON.parse(await fs.readFile(handoffFile,"utf8"));
  const reports=flags.length?JSON.parse(await fs.readFile(flags[0],"utf8")):[];
  const caseData=buildMotifAccidentCase(handoff,trackId,reports);
  const out=path.resolve(outputDir);
  if(out===path.parse(out).root)throw Error("OUTPUT_DIRECTORY_REQUIRED");
  await fs.mkdir(out,{recursive:true});
  const casePath=path.join(out,"motif-case.json");
  await fs.writeFile(casePath,JSON.stringify(caseData,null,2)+"\n");
  const result=await runNativeMotifCase(caseData,{motifDir,casePath,
    python:process.env.MOTIF_PYTHON||(process.platform==="win32"?"py -3":"python3")});
  const receipt={
    schema:"autodisco.accident.native-motif/v1",
    status:"EXPERIMENT_PROPOSED_NOT_EXECUTED",
    selected_track_id:trackId,
    native_motif:result,
    chosen_probe:result.motif_spine.next_probe?.id||null,
    competing_classical_probe:result.strong_classical_ig.next_probe?.id||null,
    safety:{
      model_first_listens_executed:false,publication:"NONE",playlist_change:"NONE",
      causal_claim:"NONE",author_assumptions_only:true,
      operator_context_not_in_blind_dj_packet:true,
    }
  };
  await fs.writeFile(path.join(out,"motif-advice.json"),JSON.stringify(receipt,null,2)+"\n");
  process.stdout.write(JSON.stringify({status:receipt.status,chosen_probe:receipt.chosen_probe,
    output_dir:out,native_motif:true},null,2)+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  main().catch(error=>{
    process.stderr.write(JSON.stringify({error:error instanceof Error?error.message:"MOTIF unavailable"})+"\n");
    process.exitCode=1;
  });
}
