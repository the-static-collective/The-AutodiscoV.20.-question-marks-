#!/usr/bin/env node
/* A real V20 sealed first-listen -> reviewable episode bundle.
 * No model invocation here; it consumes authentic upstream artifact files.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {writeBroadcastBundle} from "./broadcast-assembly.mjs";
import {inspectSealedV20} from "./accident-return-core.mjs";

const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
async function readJson(dir,file){
  return JSON.parse(await fs.readFile(path.join(dir,file),"utf8"));
}
export async function buildV20StationEpisode({intakeDir,episodeId,title,outputDir}={}){
  if(!intakeDir||!outputDir||!ID.test(episodeId||"")||
      typeof title!=="string"||!title.trim()||title.length>160)
    throw Error("INVALID_EPISODE_REQUEST");
  const dir=path.resolve(intakeDir);
  const [operator,window,pair,encounter,dialogue]=await Promise.all([
    readJson(dir,"operator-context.json"),readJson(dir,"window.json"),
    readJson(dir,"pair.json"),readJson(dir,"encounter.json"),
    readJson(dir,"dialogue.json")
  ]);
  if(operator.source_identity_confirmed!==true||!operator.editorial_candidate?.track_id)
    throw Error("INDEPENDENT_SOURCE_HASH_APPROVAL_REQUIRED");
  if(encounter.status!=="two-first-responses-sealed"||
      dialogue.status!=="dialogue-sealed")
    throw Error("GENUINE_TWO_LISTENS_AND_DIALOGUE_REQUIRED");
  const verified=inspectSealedV20({operator,window,pair,encounter,dialogue},
    operator.editorial_candidate.track_id);
  if(verified.reports.length<1||
     !verified.receipts.some(r=>r.kind==="sealed-v20-dialogue"))
    throw Error("V20_SEALED_EVIDENCE_INCOMPLETE");
  const request={
    schema:"autodisco.broadcast-bundle-request/v0",
    basename:episodeId,
    output_dir:outputDir,
    assembly:{
      schema:"autodisco.broadcast-assembly-request/v0",
      station:{name:"Auto Disco V20"},
      episode:{id:episodeId,title:title.trim()},
      window,pair,first_responses:encounter.first_responses,dialogue_result:dialogue
    }
  };
  const bundle=await writeBroadcastBundle(request);
  const candidate={
    schema:"autodisco.station-episode-candidate/v1",
    status:"TRANSCRIPT_AND_WITNESSED_AUDIO_READY_NOT_VOICED",
    episode_id:episodeId,episode_digest:bundle.episode_digest,
    first_listen_pair_id:pair.pair_id,
    first_response_ids:encounter.first_responses.map(x=>x.first_response_id),
    dialogue_id:dialogue.dialogue_id,
    window_sha256:window.canonical_audio.sha256,
    editorial_source_track_id:operator.editorial_candidate.track_id,
    next_step:"Render the exact spoken segments into approved voice clips; create an MP3 broadcast master; review rights and station admission.",
    voice_rendered:false,approved_for_publication:false,
    airtime_confirmed:false
  };
  await fs.writeFile(path.join(bundle.bundle_dir,"station-candidate.json"),
    JSON.stringify(candidate,null,2)+"\n");
  return {...bundle,station_candidate:candidate};
}
async function main(){
  const [intakeDir,episodeId,title,outputDir]=process.argv.slice(2);
  if(!intakeDir||!episodeId||!title||!outputDir)
    throw Error("Usage: node scripts/build-v20-station-episode.mjs <private-intake-output> <episode-id> <episode-title> <private-bundle-output>");
  const result=await buildV20StationEpisode({intakeDir,episodeId,title,outputDir});
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))
  main().catch(error=>{process.stderr.write(JSON.stringify({error:String(error.message||error)})+"\n");process.exitCode=1});
