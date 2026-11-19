#!/usr/bin/env node
/* Auto Disco V20: owner-invoked receiver for HUMKIN editorial experiments.
 * The public playlist never becomes a DJ prompt or hidden first-listen memory.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {buildAudioWindow} from "./audio-window.mjs";
import {prepareAudioLookTwice,runAudioIsolatedEncounters,runAudioDialogue} from "./audio-look-twice.mjs";

const SCHEMA="humkin.accident.autodisco-handoff/v1";
const DIGEST=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9-]{3,90}$/;

export function selectHandoffTrack(handoff,trackId) {
  if(handoff?.schema!==SCHEMA||handoff.status!=="editorial-candidate-only"||
     handoff.isolation?.curator_context_must_not_enter_dj_prompt!==true||
     handoff.isolation?.local_source_bytes_must_be_verified!==true||
     !Array.isArray(handoff.editorial_candidates)||
     handoff.editorial_candidates.length<1||handoff.editorial_candidates.length>12)
    throw Error("INVALID_HUMKIN_EDITORIAL_HANDOFF");
  const ids=new Set();
  for(const item of handoff.editorial_candidates) {
    if(!item||!ID.test(item.track_id)||ids.has(item.track_id)||
       typeof item.src!=="string"||typeof item.title!=="string"||
       !Number.isFinite(item.duration_seconds)||item.duration_seconds<=0||
       item.duration_seconds>14400)
      throw Error("INVALID_HUMKIN_CANDIDATE");
    const u=new URL(item.src);
    if(u.protocol!=="https:"||!["humkin.abundent.org","media.abundent.org",
       "kbhqacsdvjsstzyplqij.supabase.co"].includes(u.hostname))
      throw Error("UNTRUSTED_HUMKIN_SOURCE");
    ids.add(item.track_id);
  }
  const candidate=handoff.editorial_candidates.find(item=>item.track_id===trackId);
  if(!candidate)throw Error("CANDIDATE_NOT_IN_HANDOFF");
  return candidate;
}

export function blindWindowRequest(candidate,sourcePath) {
  if(!candidate||!ID.test(candidate.track_id)||typeof sourcePath!=="string"||
     !sourcePath.trim()||!Number.isFinite(candidate.duration_seconds))
    throw Error("INVALID_AUDIO_CANDIDATE_INPUT");
  const max=Math.min(45000,Math.floor(candidate.duration_seconds*1000)-500);
  if(max<1000)throw Error("SOURCE_TOO_SHORT_FOR_AUDIO_WINDOW");
  // Deliberately no titles, artist, album, origin URL, score or curation reason.
  return {
    schema:"autodisco.audio-window-request/v0",
    source_path:sourcePath,
    start_ms:0,
    end_ms:Math.min(30000,max),
    declared_metadata:{window_label:"Blind specimen"}
  };
}

async function run(handoffPath,trackId,sourcePath,outputDir,options={}) {
  const handoff=JSON.parse(await fs.readFile(handoffPath,"utf8"));
  const selected=selectHandoffTrack(handoff,trackId);
  if(!outputDir||path.resolve(outputDir)===path.parse(path.resolve(outputDir)).root)
    throw Error("PRIVATE_OUTPUT_DIRECTORY_REQUIRED");
  const actual=crypto.createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex");
  const expected=options.expectedSha256;
  if(expected&&(!DIGEST.test(expected)||actual!==expected))
    throw Error("SOURCE_SHA256_MISMATCH");
  if(options.listen&&!expected)throw Error("EXPECTED_SOURCE_SHA256_REQUIRED_FOR_MODEL_LISTEN");

  const window=await buildAudioWindow(blindWindowRequest(selected,sourcePath));
  if(window.source.sha256!==actual)throw Error("SOURCE_CHANGED_DURING_WINDOW_BUILD");
  const pair=prepareAudioLookTwice({
    schema:"autodisco.audio-look-twice-prepare-request/v0",window
  });
  const out=path.resolve(outputDir);
  await fs.mkdir(out,{recursive:true});
  const write=(name,data)=>fs.writeFile(path.join(out,name),JSON.stringify(data,null,2)+"\n","utf8");

  // Editorial history lives ONLY in this separate operator file.
  await write("operator-context.json",{
    schema:"humkin.accident.operator-context/v1",
    editorial_candidate:selected,source_manifest_schema:SCHEMA,
    local_sha256:actual,source_identity_confirmed:!!expected,
    status:"local-review-artifact",not_a_first_listen:true
  });
  await write("window.json",window);
  await write("pair.json",pair);
  let status="blind-packets-prepared";
  if(options.listen) {
    const encounter=await runAudioIsolatedEncounters({
      schema:"autodisco.audio-look-twice-encounter-request/v0",window,pair
    });
    await write("encounter.json",encounter);
    status=encounter.status;
    if(encounter.status==="two-first-responses-sealed") {
      const dialogue=await runAudioDialogue({
        schema:"autodisco.audio-look-twice-dialogue-request/v0",
        pair,first_responses:encounter.first_responses
      });
      await write("dialogue.json",dialogue);
      status=dialogue.status;
    }
  }
  return {status,track_id:selected.track_id,source_sha256:actual,
    source_identity_confirmed:!!expected,window_id:window.window_id,pair_id:pair.pair_id,
    output_dir:out,published:false,on_air:false};
}

async function main(){
  const [handoffPath,trackId,sourcePath,outputDir,...flags]=process.argv.slice(2);
  if(!handoffPath||!trackId||!sourcePath||!outputDir)
    throw Error("Usage: node scripts/humkin-accident-intake.mjs <handoff.json> <track-id> <local-audio> <private-output-dir> [--expected-sha256=HEX] [--listen]");
  const listen=flags.includes("--listen");
  const hashFlag=flags.find(f=>f.startsWith("--expected-sha256="));
  if(flags.some(f=>f!=="--listen"&&!f.startsWith("--expected-sha256=")))
    throw Error("UNKNOWN_OPTION");
  const result=await run(handoffPath,trackId,sourcePath,outputDir,
    {listen,expectedSha256:hashFlag?.slice("--expected-sha256=".length)});
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  main().catch(error=>{
    process.stderr.write(JSON.stringify({error:error instanceof Error?error.message:"intake failed"})+"\n");
    process.exitCode=1;
  });
}
