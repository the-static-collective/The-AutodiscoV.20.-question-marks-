#!/usr/bin/env node
/* Auto Disco V20 Broadcast Master 001
 * Exact episode transcript + verified local voiced clips + witnessed WAV ->
 * review-only MP3 master. It does NOT generate DJs or approve airplay.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const DIGEST=/^[a-f0-9]{64}$/;
const STEM=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const CLIP=/^voices\/[a-zA-Z0-9._-]{1,120}\.wav$/;
const TYPES=new Set(["owner-recorded","authorized-voice-model","noncanonical-os-tts"]);
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
const required=(p,reason)=>{if(!p)throw Error(reason)};
function canonical(x){
  if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
  if(x&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>
    JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";
  return JSON.stringify(x);
}
export function inspectEpisode(episode,voices){
  required(episode?.schema==="autodisco.broadcast-episode/v0"&&
    DIGEST.test(episode.episode_digest||""),"INVALID_BROADCAST_EPISODE");
  const body={...episode};delete body.episode_digest;
  required(hash(canonical(body))===episode.episode_digest,"EPISODE_DIGEST_MISMATCH");
  required(STEM.test(episode.episode?.id||"")&&
    typeof episode.episode?.title==="string"&&episode.episode.title.trim(),
    "INVALID_EPISODE_METADATA");
  const segments=episode.segments;
  required(Array.isArray(segments)&&segments.length>=4&&segments.length<=40,
    "INVALID_BROADCAST_SEGMENTS");
  const windows=segments.filter(s=>s.kind==="audio-window");
  required(windows.length===1&&windows[0].audio_sha256===episode.window_ref?.audio_sha256&&
    DIGEST.test(episode.window_ref.audio_sha256),"INVALID_AUDIO_WINDOW_BINDING");
  required(voices?.schema==="autodisco.radio-voice-assets/v1"&&
    voices.episode_digest===episode.episode_digest&&Array.isArray(voices.assets),
    "INVALID_VOICE_MANIFEST");
  const expected=segments.map((s,i)=>({s,i})).filter(x=>x.s.kind!=="audio-window");
  required(voices.assets.length===expected.length,"VOICE_ASSET_COUNT_MISMATCH");
  const found=new Map();
  for(const asset of voices.assets){
    required(asset&&Number.isInteger(asset.segment_index)&&
      asset.segment_index>=0&&asset.segment_index<segments.length&&
      !found.has(asset.segment_index)&&CLIP.test(asset.path||"")&&
      DIGEST.test(asset.sha256||"")&&TYPES.has(asset.voice_type)&&
      typeof asset.voice_identity==="string"&&
      asset.voice_identity.length>=3&&asset.voice_identity.length<=120,
      "INVALID_VOICE_ASSET");
    required(segments[asset.segment_index].kind!=="audio-window",
      "VOICE_MUST_NOT_REPLACE_WITNESSED_AUDIO");
    found.set(asset.segment_index,asset);
  }
  for(const {s,i} of expected)
    required(typeof s.text==="string"&&s.text.trim()&&found.has(i),
      "MISSING_SPOKEN_SEGMENT");
  return {episode_id:episode.episode.id,episode_digest:episode.episode_digest,
    ordered:segments.map((s,i)=>s.kind==="audio-window"?
      {segment_index:i,kind:"audio-window",path:"window.wav",
       sha256:episode.window_ref.audio_sha256,voice_type:null}:
      {segment_index:i,kind:s.kind,...found.get(i)}),
    voice_types:[...new Set(voices.assets.map(x=>x.voice_type))]};
}
export async function verifyAssets(bundleDir,manifestPath) {
  const root=await fs.realpath(bundleDir);
  const episode=JSON.parse(await fs.readFile(path.join(root,"episode.json"),"utf8"));
  const voices=JSON.parse(await fs.readFile(manifestPath,"utf8"));
  const plan=inspectEpisode(episode,voices);
  const audio=[];
  for(const asset of plan.ordered){
    const actual=await fs.realpath(path.resolve(root,asset.path));
    required(actual.startsWith(root+path.sep)&&
      path.extname(actual).toLowerCase()===".wav","AUDIO_OUTSIDE_PRIVATE_BUNDLE");
    const bytes=await fs.readFile(actual);
    required(bytes.length>=44&&bytes.toString("ascii",0,4)==="RIFF"&&
      bytes.toString("ascii",8,12)==="WAVE","NOT_WAV_AUDIO");
    required(hash(bytes)===asset.sha256,"WAV_DIGEST_MISMATCH");
    audio.push({...asset,real:actual});
  }
  return {plan,audio};
}
async function run(executable,args,timeout=180000){
  return new Promise((resolve,reject)=>{
    let stdout="",stderr="",closed=false,timedOut=false;
    const child=spawn(executable,args,{shell:false,windowsHide:true,
      stdio:["ignore","pipe","pipe"]});
    const timer=setTimeout(()=>{timedOut=true;child.kill("SIGKILL")},timeout);
    child.stdout.on("data",b=>{stdout+=b.toString();if(stdout.length>30000)child.kill("SIGKILL")});
    child.stderr.on("data",b=>{stderr+=b.toString();if(stderr.length>30000)child.kill("SIGKILL")});
    function done(error) {
      if(closed)return;
      closed=true;clearTimeout(timer);
      if(error)reject(error);else resolve({stdout,stderr});
    }
    child.on("error",done);
    child.on("close",code=>done(code===0&&!timedOut?null:
      Error(timedOut?"MASTER_RENDER_TIMEOUT":"MASTER_RENDER_FAILED "+stderr.slice(0,350))));
  });
}
export async function renderMaster({bundleDir,voiceManifestPath,outputDir,
  ffmpeg="ffmpeg",ffprobe="ffprobe"}={}){
  required(bundleDir&&voiceManifestPath&&outputDir,"MASTER_RENDER_ARGS_REQUIRED");
  const out=path.resolve(outputDir);
  required(out!==path.parse(out).root,"PRIVATE_OUTPUT_DIRECTORY_REQUIRED");
  const {plan,audio}=await verifyAssets(bundleDir,voiceManifestPath);
  await fs.mkdir(out,{recursive:true});
  const stem="v20-"+plan.episode_id;
  const temp=path.join(out,stem+".tmp.mp3");
  const target=path.join(out,stem+".mp3");
  const args=["-hide_banner","-loglevel","error","-nostdin","-y"];
  for(const a of audio)args.push("-i",a.real);
  const filters=audio.map((_,i)=>"["+i+":a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a"+i+"]");
  const joined=audio.map((_,i)=>"[a"+i+"]").join("");
  filters.push(joined+"concat=n="+audio.length+":v=0:a=1[master]");
  args.push("-filter_complex",filters.join(";"),"-map","[master]",
    "-c:a","libmp3lame","-b:a","160k","-ar","44100","-ac","2","-f","mp3",temp);
  try{
    await run(ffmpeg,args);
    const probe=await run(ffprobe,["-v","error","-select_streams","a:0",
      "-show_entries","stream=codec_name:format=duration","-of","json",temp]);
    const meta=JSON.parse(probe.stdout);
    required(meta.streams?.[0]?.codec_name==="mp3"&&
      Number.isFinite(Number(meta.format?.duration))&&
      Number(meta.format.duration)>1,"INVALID_RENDERED_MP3");
    const bytes=await fs.readFile(temp);
    required(bytes.length>1024,"EMPTY_RENDERED_MP3");
    await fs.rename(temp,target);
    const receipt={
      schema:"autodisco.radio-master-receipt/v1",
      status:"RENDERED_AWAITING_EDITORIAL_APPROVAL",
      episode_id:plan.episode_id,episode_digest:plan.episode_digest,
      master_filename:path.basename(target),master_sha256:hash(bytes),
      master_size_bytes:bytes.length,master_duration_seconds:Number(meta.format.duration),
      codec:"mp3",voice_types:plan.voice_types,
      segments:audio.map(a=>({segment_index:a.segment_index,kind:a.kind,
        sha256:a.sha256,voice_type:a.voice_type||null,voice_identity:a.voice_identity||null})),
      proposed_catalog:{artist:"Auto Disco V20",album:"First-Listen Radio",
        kind:"song",destination_station:"autodisco-v20"},
      voice_rights_review:"REQUIRED",publication:"NOT_PERFORMED",owner_publication:"NOT_PERFORMED",
      broadcast_occurrence:"NOT_OBSERVED",
      canonical_artist_derived_voice:"NOT_PROVEN",
      note:"Local OS speech is noncanonical, not the original performer's authorized voice model."
    };
    const receiptPath=path.join(out,stem+".receipt.json");
    await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+"\n");
    return {master_path:target,receipt_path:receiptPath,receipt};
  }catch(error){await fs.rm(temp,{force:true});throw error}
}
async function main(){
 const [bundleDir,voiceManifestPath,outputDir]=process.argv.slice(2);
 if(!bundleDir||!voiceManifestPath||!outputDir)throw Error(
   "Usage: node scripts/render-radio-master.mjs <bundle-dir> <voice-assets.json> <private-output-dir>");
 const result=await renderMaster({bundleDir,voiceManifestPath,outputDir});
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))
  main().catch(error=>{process.stderr.write(JSON.stringify({error:String(error.message||error)})+"\n");process.exitCode=1});
