import test from "node:test";
import assert from "node:assert/strict";
import {selectHandoffTrack,blindWindowRequest} from "./humkin-accident-intake.mjs";
const candidate={
 order:1,track_id:"song-123",title:"Secret Ballad",
 artist:"Name Must Stay Private",album:"Album Name",src:"https://media.abundent.org/tracks/test.mp3",
 duration_seconds:130,observed_play_count:0
};
const packet={
 schema:"humkin.accident.autodisco-handoff/v1",
 status:"editorial-candidate-only",
 isolation:{curator_context_must_not_enter_dj_prompt:true,local_source_bytes_must_be_verified:true},
 editorial_candidates:[candidate]
};
test("accepts an explicitly selected admitted candidate only",()=>{
 assert.equal(selectHandoffTrack(packet,"song-123").track_id,"song-123");
 assert.throws(()=>selectHandoffTrack(packet,"song-456"));
 assert.throws(()=>selectHandoffTrack({...packet,status:"two-first-responses-sealed"},"song-123"));
 assert.throws(()=>selectHandoffTrack({...packet,isolation:{}},"song-123"));
});
test("the audio window request excludes all curator/history content",()=>{
 const selected=selectHandoffTrack(packet,"song-123");
 const blind=blindWindowRequest(selected,"/private/specimen.mp3");
 assert.deepEqual(Object.keys(blind).sort(),
   ["declared_metadata","end_ms","schema","source_path","start_ms"].sort());
 assert.equal(blind.schema,"autodisco.audio-window-request/v0");
 assert.equal(blind.end_ms,30000);
 const serialized=JSON.stringify(blind);
 for(const sensitive of ["Secret Ballad","Name Must Stay Private","Album Name","observed_play_count","media.abundent.org"])
   assert.equal(serialized.includes(sensitive),false);
});
test("short songs get bounded windows, invalid and duplicate candidates fail closed",()=>{
 const short={...candidate,duration_seconds:7};
 assert.equal(blindWindowRequest(short,"/tmp/sample.wav").end_ms,6500);
 assert.throws(()=>blindWindowRequest({...short,duration_seconds:.5},"/tmp/sample.wav"));
 assert.throws(()=>selectHandoffTrack({...packet,editorial_candidates:[candidate,candidate]},"song-123"));
 assert.throws(()=>selectHandoffTrack({...packet,editorial_candidates:[{...candidate,src:"http://localhost/test.mp3"}]},"song-123"));
});
