import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStationManifest, CHANNELS, SCHEMA, selectTransmission, createShareUrl, editorialHandoff } from './humkin-station.mjs';

test('exactly three independent station doors, each mapped to a real preview', () => {
  const manifest = buildStationManifest();
  assert.equal(manifest.schema, SCHEMA);
  assert.deepEqual(manifest.channels, CHANNELS);
  assert.equal(manifest.transmissions.length, 3);
  assert.equal(new Set(manifest.transmissions.map(x=>x.id)).size, 3);
  assert.equal(new Set(manifest.transmissions.map(x=>x.preview)).size, 3);
  for (const s of manifest.transmissions) {
    assert.equal(selectTransmission(s.channel).id,s.id);
    assert.match(s.preview,/^\/previews\/[\w-]+\.mp3$/);
    assert.equal(s.claim_type,'FICTIONAL_INTERPRETATION');
    assert.equal(s.first_listen_status, 'NOT_ATTEMPTED');
    assert.ok(s.story.length > 20);
  }
});

test('repeat manifest byte identity is stable for cross-site source checks', () => {
  assert.deepEqual(buildStationManifest(),buildStationManifest());
  assert.match(buildStationManifest().manifest_sha256,/^[0-9a-f]{64}$/);
});

test('reject unknown channels and unsafe share URL schemes', () => {
  assert.throws(()=>selectTransmission('secret'),/UNKNOWN_HUMKIN_CHANNEL/);
  assert.throws(()=>createShareUrl('javascript:alert(1)','home'),/INVALID_RADIO_URL_PROTOCOL/);
  assert.equal(createShareUrl('https://humkin.abundent.org/radio/?secret=1#foo','home'),'https://humkin.abundent.org/radio/?channel=home&signal=signal-003');
});

test('public visitor/fiction context never enters isolated V20 first-listen packet', () => {
  const manifest=buildStationManifest();
  assert.equal(manifest.provenance.listeners, 'NO FIRST-LISTEN DJ SESSION HAS BEEN RUN BY THIS PUBLIC WIDGET');
  assert.ok(manifest.laws.includes('STATION MEMORY != FIRST LISTENER MEMORY'));
  const handoff=editorialHandoff('strange');
  assert.equal(handoff.first_listen_status,'NOT_ATTEMPTED');
  assert.equal(handoff.source_track_title,'Noontime Bloom');
  assert.equal(Object.hasOwn(handoff,'story'),false);
  assert.equal(Object.hasOwn(handoff,'audience_history'),false);
  assert.equal(Object.hasOwn(handoff,'first_response'),false);
});