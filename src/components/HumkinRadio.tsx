import React, { useState } from 'react';
import { Radio, ArrowUpRight, ShieldCheck } from 'lucide-react';
import manifest from '../radio/humkin-radio.json';

const SITE = 'https://humkin.abundent.org';
type Channel = 'beautiful' | 'strange' | 'home';
const channels: Channel[] = ['beautiful', 'strange', 'home'];
const names: Record<Channel, string> = { beautiful: 'Something beautiful', strange: 'Something strange', home: 'Something like home' };

/**
 * Public-sidecar preview ONLY. V20's actual first-listen booth remains
 * scripts/audio-window.mjs -> audio-look-twice.mjs -> broadcast-assembly.mjs.
 * No imagined DJ analysis, AI voice, hidden artist history, or server state here.
 */
export default function HumkinRadio() {
  const [channel, setChannel] = useState<Channel>('strange');
  const [shareStatus, setShareStatus] = useState('');
  const transmission = manifest.transmissions.find(item => item.channel === channel)!;
  const shareLink = `${SITE}/radio/?channel=${channel}&signal=${transmission.id}`;

  async function copySignal() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareStatus('Station frequency link copied.');
    } catch {
      setShareStatus(`Share this link: ${shareLink}`);
    }
  }

  return <section className="rounded-2xl border border-pink-500/30 bg-stone-900/70 p-4 md:p-7 space-y-5">
    <div className="flex flex-wrap justify-between items-start gap-4">
      <div>
        <div className="flex items-center gap-2 text-pink-400 text-xs font-mono tracking-widest uppercase"><Radio size={17}/> HUMKIN RADIO 001 · Public music porch</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">The song that found you.</h2>
        <p className="text-stone-400 text-sm mt-2 max-w-xl">Auto Disco V20 already has real first-listen infrastructure. This additional door is a public, on-demand station: pick a feeling, listen to an authorized album preview, and share an invented shortwave story.</p>
      </div>
      <a className="text-pink-300 border border-pink-800 rounded-xl px-4 py-3 text-sm hover:bg-pink-950/40 flex items-center gap-2" href={`${SITE}/radio/`} target="_blank" rel="noopener noreferrer">Open public radio <ArrowUpRight size={15}/></a>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="p-5 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
        <p className="font-mono text-xs text-amber-400 tracking-wider">YOU NEED A LITTLE MORE…</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select radio channel">
          {channels.map(id => <button key={id} type="button" aria-pressed={channel === id} onClick={() => {setChannel(id);setShareStatus('');}}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${channel === id ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-700 bg-stone-800 text-stone-300 hover:text-white'}`}>{names[id]}</button>)}
        </div>
        <p className="text-4xl font-mono text-amber-400 font-bold">{transmission.frequency} <span className="text-stone-500 text-xs">FICTIONAL DIAL</span></p>
        <p className="text-stone-200 font-semibold">{transmission.track_title} · HUMKIN</p>
        <audio key={transmission.id} controls preload="none" src={`${SITE}${transmission.preview}`} className="w-full" aria-label={`${transmission.track_title} short preview`}/>
        <p className="text-xs text-stone-500">This is a preview excerpt. It starts only after you press play.</p>
      </div>
      <div className="p-5 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
        <p className="font-mono text-xs tracking-widest text-emerald-300 uppercase">{transmission.id} · fictional transmission</p>
        <h3 className="text-xl font-bold text-stone-100">{transmission.title}</h3>
        <blockquote className="border-l-4 border-pink-500 pl-3 text-stone-200">{transmission.line}</blockquote>
        <p className="text-sm text-stone-400 leading-relaxed">{transmission.story}</p>
        <button type="button" onClick={copySignal} className="rounded-lg bg-pink-500 hover:bg-pink-400 text-stone-950 px-4 py-2 font-bold text-xs">↗ Send this frequency</button>
        <div className="text-stone-400 text-xs" role="status" aria-live="polite">{shareStatus}</div>
      </div>
    </div>
    <p className="text-stone-400 text-xs flex gap-2 items-start"><ShieldCheck size={15} className="shrink-0"/> Separate truth modes: these stories are FICTIONAL_INTERPRETATION, not observed broadcasts. Station memory is distinct from independently sealed DJ first-listen results. The public site stores preferences only with explicit local-device opt-in. No listener history is passed into V20's isolated first-listen system.</p>
  </section>;
}