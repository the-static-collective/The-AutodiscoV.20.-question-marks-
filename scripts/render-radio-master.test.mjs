import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {inspectEpisode,verifyAssets,renderMaster} from "./render-radio-master.mjs";

const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
function canonical(x){
  if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
  if(x&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>
    JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";
  return JSON.stringify(x);
}
function wav(){
 const sampleRate=16000,frames=sampleRate,pcm=Buffer.alloc(frames*2);
 for(let i=0;i<frames;i++)pcm.writeInt16LE(Math.floor(Math.sin(i*.05)*3000),i*2);
 const h=Buffer.alloc(44);
 h.write("RIFF",0);h.writeUInt32LE(pcm.length+36,4);
 h.write("WAVE",8);h.write("fmt ",12);h.writeUInt32LE(16,16);
 h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);
 h.writeUInt32LE(sampleRate,24);h.writeUInt32LE(sampleRate*2,28);
 h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);
 h.write("data",36);h.writeUInt32LE(pcm.length,40);
 return Buffer.concat([h,pcm]);
}
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"v20-master-"));
 await fs.mkdir(path.join(root,"voices"));
 const bytes=wav(),digest=hash(bytes);
 await fs.writeFile(path.join(root,"window.wav"),bytes);
 const segments=[
  {kind:"station-intro",text:"V20, first listen."},
  {kind:"audio-window",audio_sha256:digest},
  {kind:"first-listen",listener_id:"static-sam",text:"The rhythm was unexpected."},
  {kind:"station-outro",text:"The sound leaves a question."}
 ];
 const body={
  schema:"autodisco.broadcast-episode/v0",station:{name:"Auto Disco V20"},
  episode:{id:"fixture-001",title:"Synthetic V20 Fixture"},
  window_ref:{audio_sha256:digest},segments,
  editorial_receipts:{pair_id:"synthetic-test-pair",dialogue_id:"synthetic-test-dialogue"}
 };
 const episode={...body,episode_digest:hash(canonical(body))};
 await fs.writeFile(path.join(root,"episode.json"),JSON.stringify(episode));
 const assets=[];
 for(const i of [0,2,3]){
   const name="voices/seg-"+String(i).padStart(3,"0")+".wav";
   await fs.writeFile(path.join(root,name),bytes);
   assets.push({segment_index:i,path:name,sha256:digest,
     voice_type:"noncanonical-os-tts",voice_identity:"Fixture OS voice"});
 }
 const voiceManifest={schema:"autodisco.radio-voice-assets/v1",
   episode_digest:episode.episode_digest,assets};
 const file=path.join(root,"voice-assets.json");
 await fs.writeFile(file,JSON.stringify(voiceManifest));
 return {root,file,episode,voiceManifest};
}
test("voice production requires all spoken segments and preserves witnessed original window",async()=>{
 const f=await fixture();
 try{
  const p=inspectEpisode(f.episode,f.voiceManifest);
  assert.equal(p.ordered.length,4);
  assert.equal(p.ordered[1].kind,"audio-window");
  assert.equal(p.ordered[1].path,"window.wav");
  assert.equal(p.ordered[0].voice_type,"noncanonical-os-tts");
  const valid=await verifyAssets(f.root,f.file);
  assert.equal(valid.audio.length,4);
  const bad={...f.voiceManifest,assets:f.voiceManifest.assets.slice(1)};
  assert.throws(()=>inspectEpisode(f.episode,bad),/VOICE_ASSET_COUNT_MISMATCH/);
  const altered={...f.episode,episode:{...f.episode.episode,title:"Tampered after assembly"}};
  assert.throws(()=>inspectEpisode(altered,f.voiceManifest),/EPISODE_DIGEST_MISMATCH/);
  const asWindow={...f.voiceManifest,assets:f.voiceManifest.assets.map((a,i)=>
    i===0?{...a,segment_index:1}:a)};
  assert.throws(()=>inspectEpisode(f.episode,asWindow),/VOICE_MUST_NOT_REPLACE_WITNESSED_AUDIO/);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test("a changed rendered voice byte fails closed, no MP3 is produced",async()=>{
 const f=await fixture();
 try{
  await fs.appendFile(path.join(f.root,"voices","seg-000.wav"),Buffer.from("changed"));
  await assert.rejects(()=>verifyAssets(f.root,f.file),/WAV_DIGEST_MISMATCH/);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test("real ffmpeg converts V20 segment sequence into one labeled, unapproved MP3",{
 skip:spawnSync("ffmpeg",["-version"],{stdio:"ignore"}).status!==0||
      spawnSync("ffprobe",["-version"],{stdio:"ignore"}).status!==0
},async()=>{
 const f=await fixture();
 try{
  const out=path.join(f.root,"masters");
  const result=await renderMaster({bundleDir:f.root,voiceManifestPath:f.file,outputDir:out});
  assert.equal(result.receipt.schema,"autodisco.radio-master-receipt/v1");
  assert.equal(result.receipt.status,"RENDERED_AWAITING_EDITORIAL_APPROVAL");
  assert.equal(result.receipt.proposed_catalog.destination_station,"autodisco-v20");
  assert.equal(result.receipt.publication,"NOT_PERFORMED");
  assert.equal(result.receipt.broadcast_occurrence,"NOT_OBSERVED");
  const bytes=await fs.readFile(result.master_path);
  assert.equal(hash(bytes),result.receipt.master_sha256);
  assert.ok(result.receipt.master_duration_seconds>3.5);
  assert.equal(result.receipt.segments.length,4);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
