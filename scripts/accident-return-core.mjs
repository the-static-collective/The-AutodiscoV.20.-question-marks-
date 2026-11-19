/* Accident Engine feedback receipts: public aggregate deltas and sealed V20 reports.
 * A recommendation is not a validated experiment. Returns DECLARED reports only.
 */
import crypto from "node:crypto";
import {selectHandoffTrack} from "./humkin-accident-intake.mjs";
import {verifyAudioWindow} from "./audio-window.mjs";
import {verifyAudioPair,verifyAudioFirstResponses} from "./audio-look-twice.mjs";
import {compileBroadcastEpisode} from "./broadcast-assembly.mjs";

export const SNAPSHOT_SCHEMA="humkin.accident.feedback-snapshot/v1";
export const EVIDENCE_SCHEMA="autodisco.accident.return-evidence/v1";
const DIGEST=/^[a-f0-9]{64}$/;
const KEYS=["plays","ratings","dance"];
const TESTS=new Set(["dj_intrigue","dj_disagreement","listener_move"]);
const sha=data=>crypto.createHash("sha256").update(data).digest("hex");
function canonical(v) {
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  return JSON.stringify(v);
}
function invariant(cond,code){if(!cond)throw Error(code)}

export function validateAggregateSnapshot(snapshot,handoff,trackId) {
  selectHandoffTrack(handoff,trackId);
  invariant(snapshot?.schema===SNAPSHOT_SCHEMA,"INVALID_FEEDBACK_SCHEMA");
  invariant(snapshot.source==="humkin-compost-public-aggregate"&&
    snapshot.complete===true&&snapshot.program_seed===handoff.seed,
    "FEEDBACK_SOURCE_OR_PROGRAM_MISMATCH");
  invariant(typeof snapshot.captured_at==="string"&&
    Number.isFinite(Date.parse(snapshot.captured_at))&&
    !Number.isNaN(Date.parse(snapshot.captured_at)),"INVALID_FEEDBACK_CAPTURE_TIME");
  const expected=handoff.editorial_candidates.map(c=>c.track_id);
  invariant(Array.isArray(snapshot.candidate_track_ids)&&
    canonical(snapshot.candidate_track_ids)===canonical(expected),
    "FEEDBACK_CANDIDATE_SCOPE_MISMATCH");
  invariant(Array.isArray(snapshot.aggregates)&&
    snapshot.aggregates.length===expected.length,"INCOMPLETE_FEEDBACK_AGGREGATES");
  const records=new Map();
  for(const r of snapshot.aggregates) {
    invariant(r&&expected.includes(r.track_id)&&!records.has(r.track_id)&&
      typeof r.observed_row==="boolean","INVALID_FEEDBACK_TRACK_AGGREGATE");
    for(const field of KEYS) {
      invariant(Number.isSafeInteger(r[field])&&r[field]>=0,
        "INVALID_FEEDBACK_COUNT_"+field.toUpperCase());
    }
    invariant(r.dance<=r.ratings,"INCONSISTENT_FEEDBACK_REACTIONS");
    invariant(r.stars===null||(typeof r.stars==="number"&&
      Number.isFinite(r.stars)&&r.stars>=1&&r.stars<=5),"INVALID_FEEDBACK_STARS");
    if(!r.observed_row) {
      invariant(KEYS.every(key=>r[key]===0)&&r.stars===null,
        "ABSENT_FEEDBACK_ROW_NOT_ZERO");
    }
    records.set(r.track_id,r);
  }
  return records.get(trackId);
}

export function compareListenerSnapshots(before,after,handoff,trackId,
  {minDanceIncrease=3}={}) {
  const first=validateAggregateSnapshot(before,handoff,trackId);
  const last=validateAggregateSnapshot(after,handoff,trackId);
  invariant(Date.parse(after.captured_at)>Date.parse(before.captured_at),
    "FEEDBACK_TIME_NOT_FORWARD");
  invariant(Number.isInteger(minDanceIncrease)&&minDanceIncrease>=1&&
    minDanceIncrease<=20,"INVALID_FEEDBACK_THRESHOLD");
  const delta={};
  for(const key of KEYS)delta[key]=last[key]-first[key];
  const evidence={
    kind:"cumulative-aggregate-change",track_id:trackId,
    source:"humkin-compost-public-aggregate",
    scope:"same program and selected track",
    before_at:before.captured_at,after_at:after.captured_at,
    before:{plays:first.plays,ratings:first.ratings,dance:first.dance},
    after:{plays:last.plays,ratings:last.ratings,dance:last.dance},
    delta,
    thresholds:{dance_increase:minDanceIncrease},
    attribution:"NONE; cumulative feedback is not a controlled audience experiment",
    person_uniqueness:"NOT_ESTABLISHED; device keys are not distinct people",
    replay_inference:"NONE; total play events are not verified delayed replays",
    rating_edits:"POSSIBLE; cumulative dance classification may change",
  };
  evidence.digest="sha256:"+sha(canonical(evidence));
  const inconsistent=KEYS.some(key=>delta[key]<0)||delta.dance>delta.ratings;
  const qualifying=!inconsistent&&delta.dance>=minDanceIncrease;
  return {evidence,status:inconsistent?"HOLD_NON_MONOTONIC_OR_EDITED_COUNTS":
    qualifying?"REPORTED_LISTENER_MOVE_INCREASE":"HOLD_NOT_ENOUGH_EVIDENCE",
    report:qualifying?{
      source_root:"humkin-aggregate:"+evidence.digest.slice(7),
      test:"listener_move",outcome:"yes",status:"reported",
    }:null};
}

export function inspectSealedV20({window,pair,encounter,dialogue,operator},trackId) {
  const results={reports:[],receipts:[],holds:[]};
  if(!window||!pair||!encounter) {
    results.holds.push("HOLD_NO_SEALED_V20_ENCOUNTER");
    return results;
  }
  invariant(operator?.schema==="humkin.accident.operator-context/v1"&&
    operator.editorial_candidate?.track_id===trackId,"V20_OPERATOR_TRACK_MISMATCH");
  invariant(operator.local_sha256===window.source?.sha256,
    "V20_OPERATOR_SOURCE_MISMATCH");
  verifyAudioWindow(window);
  verifyAudioPair(pair,window);
  if(encounter.status!=="two-first-responses-sealed") {
    results.holds.push("HOLD_V20_NOT_TWO_SEALED_RESPONSES");
    return results;
  }
  invariant(encounter.pair_id===pair.pair_id&&encounter.window_id===window.window_id,
    "V20_ENCOUNTER_BINDING_MISMATCH");
  verifyAudioFirstResponses(pair,encounter.first_responses);
  const responses=encounter.first_responses;
  const intrigue=responses.map(r=>r.response.lingering_intrigue);
  invariant(intrigue.every(x=>typeof x==="boolean"),"INVALID_SEALED_INTRIGUE");
  results.receipts.push({
    kind:"sealed-v20-pair",
    pair_id:pair.pair_id,window_id:window.window_id,
    first_response_ids:responses.map(x=>x.first_response_id),
    status:"MODEL_RESPONSES_ONLY_NOT_HUMAN_REACTIONS",
  });
  if(intrigue.every(x=>x===intrigue[0])) {
    results.reports.push({
      source_root:"v20-pair:"+sha(pair.pair_id),test:"dj_intrigue",
      outcome:intrigue[0]?"yes":"no",status:"reported",
    });
  } else {
    results.holds.push("HOLD_DJ_INTRIGUE_DIFFERING_RESPONSES");
  }
  if(!dialogue||dialogue.status!=="dialogue-sealed") {
    results.holds.push("HOLD_NO_SEALED_DJ_DIALOGUE");
    return results;
  }
  // The existing episode compiler checks the whole evidence chain.
  compileBroadcastEpisode({
    schema:"autodisco.broadcast-assembly-request/v0",
    station:{name:"V20 Evidence Review"},
    episode:{id:"review-only",title:"Evidence not for air"},
    window,pair,first_responses:responses,dialogue_result:dialogue,
  });
  invariant(dialogue.dialogue_sha256===sha(canonical(dialogue.dialogue)),
    "V20_DIALOGUE_SHA256_MISMATCH");
  const body={...dialogue};delete body.dialogue_id;
  invariant(dialogue.dialogue_id===
    "autodisco-audio-look-twice-dialogue-result-v0:"+sha(canonical(body)),
    "V20_DIALOGUE_ID_MISMATCH");
  results.receipts.push({
    kind:"sealed-v20-dialogue",dialogue_id:dialogue.dialogue_id,
    declared_difference_count:dialogue.dialogue.differences.length,
    status:"MODEL_REPORTED_DIFFERENCES_NOT_VERIFIED_FACTS",
  });
  if(dialogue.dialogue.differences.length>0) {
    results.reports.push({
      source_root:"v20-dialogue:"+sha(dialogue.dialogue_id),
      test:"dj_disagreement",outcome:"yes",status:"reported",
    });
  } else {
    results.holds.push("HOLD_DIALOGUE_NO_DECLARED_DIFFERENCES");
  }
  return results;
}

export function buildReturnEvidence({handoff,trackId,v20={},before=null,after=null,
  reviews=[],minDanceIncrease=3}={}) {
  selectHandoffTrack(handoff,trackId);
  invariant(Array.isArray(reviews)&&reviews.length<=16,"INVALID_REVIEW_DECISIONS");
  const observations=[],holds=[],provenance=[];
  const dj=inspectSealedV20(v20,trackId);
  observations.push(...dj.reports);
  holds.push(...dj.holds);provenance.push(...dj.receipts);
  if(before!==null||after!==null) {
    invariant(before!==null&&after!==null,"FEEDBACK_REQUIRES_BOTH_SNAPSHOTS");
    const feedback=compareListenerSnapshots(before,after,handoff,trackId,{minDanceIncrease});
    provenance.push(feedback.evidence);
    if(feedback.report)observations.push(feedback.report);
    else holds.push(feedback.status);
  } else holds.push("HOLD_NO_COMPARABLE_LISTENER_SNAPSHOTS");
  const reviewKeys=new Set(),reviewed=[];
  for(const decision of reviews) {
    invariant(decision&&TESTS.has(decision.test)&&
      typeof decision.source_root==="string"&&
      ["yes","no"].includes(decision.outcome)&&
      typeof decision.review_receipt==="string"&&
      decision.review_receipt.trim().length>=8,
      "INVALID_DECLARED_REVIEW_DECISION");
    const key=[decision.test,decision.source_root,decision.outcome].join("|");
    invariant(!reviewKeys.has(key),"DUPLICATE_REVIEW_DECISION");
    reviewKeys.add(key);
    invariant(observations.some(r=>
      [r.test,r.source_root,r.outcome].join("|")===key),
      "REVIEW_MUST_MATCH_RECORDED_EVIDENCE");
    reviewed.push({...observations.find(r=>[r.test,r.source_root,r.outcome].join("|")===key),
      status:"reviewed",review_receipt:decision.review_receipt});
  }
  const keyed=new Map(reviewed.map(r=>[
    [r.test,r.source_root,r.outcome].join("|"),r]));
  const reports=observations.map(r=>keyed.get(
    [r.test,r.source_root,r.outcome].join("|"))||r);
  const artifact={
    schema:EVIDENCE_SCHEMA,
    selected_track_id:trackId,
    program_seed:handoff.seed,
    reports,
    held_questions:holds,
    provenance,
    review_meaning:"Operator-declared review only; receipt strings are not independent authentication",
    methods:["V20 content-hash verification","Compost cumulative aggregate difference","MOTIF native compare follows separately"],
    claims:{automatic_publication:false,causation_proven:false,
      real_humans_uniquely_counted:false,delayed_replay_verified:false}
  };
  return {...artifact,evidence_digest:"sha256:"+sha(canonical(artifact))};
}
