import React, { useState } from "react";
import { Disc, FileText, Sparkles, Plus, ShieldCheck, HelpCircle, Compass, Check } from "lucide-react";
import { Track, LoopIt, LoopLifecycleState } from "../types";

interface AlbumCompanionProps {
  onDjMessage: (msg: string) => void;
  onAddLoopIt: (loop: LoopIt) => void;
}

export default function AlbumCompanion({ onDjMessage, onAddLoopIt }: AlbumCompanionProps) {
  // Autodiscography Track Database with detailed lyrics, role mappings, and provenance
  const tracks: Track[] = [
    {
      id: "t1",
      title: "The Spoon Remembers",
      role: "Spoon Mode (First Witness)",
      insight: "Focuses on small, local, non-instrumental attention. Kettle, recipe cards, porch lights. Keeps data strictly private by default.",
      lyrics: "The spoon has an eye in the drawer, it watches the ceiling fold. The stove knows the heat of the match before the wood turns cold. What we notice stays; what we neglect gathers the quiet grey.",
      duration: "3:42",
      contributors: [
        { name: "S. Collective", role: "Acoustic layout & lyrical concept", type: "human" },
        { name: "Sovereign Scribe", role: "Introductory broadcast drone", type: "model" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t2",
      title: "Lemon Set",
      role: "Lemon Set (Derived Readiness)",
      insight: "A state where the system sits low and leans in—not idle, but active stillness awaiting consensus.",
      lyrics: "Don't rush the gate, the corners are quiet now. The lemon rind is dry, but the aroma waits. What looked like waiting was a holy way. Fierce and steady, locked into the silence.",
      duration: "4:15",
      contributors: [
        { name: "S. Collective", role: "Harmonium & modular synthesis", type: "human" },
        { name: "Perplexity", role: "AI-assisted lyric refinement", type: "model" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t3",
      title: "The Voltage Remembers the Peach",
      role: "Human-Machine Collaboration",
      insight: "Acknowledge the machine's role without pretending it has human experiences. Voltage is responsive; humans witness.",
      lyrics: "The grid can forget to reach, but the voltage remembers the peach. A spark of current through the branch, a memory the wire couldn't wash. It's not a heartbeat, just a mirror of your touch.",
      duration: "5:01",
      contributors: [
        { name: "S. Collective", role: "Electric guitar drones & engineering", type: "human" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t4",
      title: "The Architecture of a Ghost",
      role: "Peer Identity & Signal Continuity",
      insight: "Continuity across distributed, unreliable, and fragmented peer signals. Highlights offline paths honestly.",
      lyrics: "A fence of pixels to keep you from falling into the math. The wire hums a broken name. We're building walls of ghosts, hoping the signal survives the cold rain.",
      duration: "3:58",
      contributors: [
        { name: "S. Collective", role: "Vocal tracks & mixing", type: "human" },
        { name: "Claude-3-Sonnet", role: "Co-lyricist (Ghost metaphor design)", type: "model" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t5",
      title: "The Things We Could Not Digest",
      role: "The Non-Compostable Holding State",
      insight: "A stubborn refusal to force every event into instant compost or abstract analysis. Some things must remain as raw stones.",
      lyrics: "Not everything becomes fruit. Some things are just too hard to grind. We leave the stone in the stream, the shape the water learns to sing around. We don't digest the crash.",
      duration: "6:12",
      contributors: [
        { name: "S. Collective", role: "Guitar feedback & field recordings", type: "human" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t6",
      title: "Notebook Batman",
      role: "Personal Lineage Protection",
      insight: "Preserving strange, raw, human imperfections in commit comments rather than sanitizing them into corporate dry metrics.",
      lyrics: "A messy note is a time machine or a strange success. Half-sharp pen points in the margin, explaining the whole universe with a stupid Batman joke at 4:15 in the morning.",
      duration: "2:44",
      contributors: [
        { name: "S. Collective", role: "Acoustic chord sequence & diary entries", type: "human" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t7",
      title: "Lemon Juice",
      role: "Excess & Consensus Theatre",
      insight: "Consent, unrefined abundance, and direct participation at the open table. Wet hands, real pulp, real community.",
      lyrics: "The ministry isn't clean, the ministry is juice. Squeeze it till your fingers get sticky. An open table set in the gravel, where everyone shares the tart new sound.",
      duration: "4:33",
      contributors: [
        { name: "S. Collective", role: "Synthesizer programming", type: "human" },
        { name: "Gemini-1.5", role: "Poetic rhythm matching suggestions", type: "model" }
      ],
      rights: "CC BY-NC-SA"
    },
    {
      id: "t8",
      title: "The Smoke Remembers the Shape",
      role: "Durable Lifecycle Receipt",
      insight: "Preserves the shape of the fire even after the combustion is completely black. Authentic receipts of things deleted.",
      lyrics: "The table is set and the ashes are bright. When the form goes to black, the smoke remembers the shape of the fire. A receipt signed in soot, proof that we were once warm.",
      duration: "5:40",
      contributors: [
        { name: "S. Collective", role: "Analog synth & tape-loop saturation", type: "human" },
        { name: "Sovereign Scribe", role: "Voiceover & finalizer bells", type: "model" }
      ],
      rights: "CC BY-NC-SA"
    }
  ];

  const [activeTrackId, setActiveTrackId] = useState<string>("t1");
  const activeTrack = tracks.find(t => t.id === activeTrackId) || tracks[0];

  // LoopIt Creation State
  const [newTitle, setNewTitle] = useState("");
  const [newObs, setNewObs] = useState("");
  const [creationMode, setCreationMode] = useState<"spoon" | "lemon" | "digest">("spoon");
  const [successMsg, setSuccessMsg] = useState("");

  const handleTrackSelect = (track: Track) => {
    setActiveTrackId(track.id);
    onDjMessage(`Now exploring '${track.title}'. Role in TranchNode: ${track.role}.`);
  };

  const handleCreateLoopIt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newObs.trim()) return;

    let targetState: LoopLifecycleState = "LOOP_INGESTED";
    let isPrivate = false;

    if (creationMode === "spoon") {
      targetState = "LOOP_HELD";
      isPrivate = true;
      onDjMessage(`Spoon Mode active: observation '${newTitle}' captured locally. Kept offline & private by default.`);
    } else if (creationMode === "lemon") {
      targetState = "LOOP_INGESTED";
      isPrivate = false;
      onDjMessage(`Lemon Set active: '${newTitle}' queued as pending. Sits low, awaiting verification.`);
    } else if (creationMode === "digest") {
      targetState = "LOOP_HELD";
      isPrivate = false;
      onDjMessage(`The Things We Could Not Digest: '${newTitle}' locked in protected holding state with no automated analysis.`);
    }

    const loop: LoopIt = {
      id: "loop_" + Math.random().toString(36).substr(2, 9),
      trackId: activeTrack.id,
      title: newTitle,
      observation: newObs,
      lifecycle: targetState,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      signer: isPrivate ? "Local Witness (Private)" : "Peer Node Key 0x2A1F",
      retentionDays: 30,
      isPrivate: isPrivate,
      history: [`[${new Date().toLocaleTimeString()}] Created in ${creationMode.toUpperCase()} mode.`]
    };

    onAddLoopIt(loop);
    setNewTitle("");
    setNewObs("");
    setSuccessMsg(`LoopIt successfully registered under ${trackModeLabel(creationMode)}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const trackModeLabel = (mode: string) => {
    if (mode === "spoon") return "Spoon Mode (Private)";
    if (mode === "lemon") return "Lemon Set (Queued)";
    return "Not Digestible (Protected)";
  };

  return (
    <div id="album-companion" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col h-full relative overflow-hidden group">
      {/* Background visual vintage disc */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-orange-500/5 rounded-full blur-3xl" />

      <div className="flex items-center gap-2 mb-4">
        <Disc className="w-5 h-5 text-orange-400 animate-spin-slow" />
        <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
          Album-to-Node Companion Page
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Track Selection List */}
        <div className="md:col-span-5 border-r border-stone-800/60 pr-4 max-h-[460px] overflow-y-auto space-y-2">
          <span className="font-mono text-[9px] text-stone-500 uppercase tracking-wider block mb-2">
            The Autodiscography Tracklist
          </span>
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer block border ${
                track.id === activeTrackId
                  ? "bg-orange-950/20 border-orange-500/30"
                  : "bg-stone-950/40 border-transparent hover:border-stone-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-stone-200">{track.title}</span>
                <span className="font-mono text-[9px] text-stone-500">{track.duration}</span>
              </div>
              <span className="font-mono text-[8px] text-orange-400 mt-1 block uppercase tracking-wide">
                {track.role}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Track Details & LoopIt Generator */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4 max-h-[460px] overflow-y-auto">
          {/* Top lyric panel */}
          <div className="bg-stone-950/60 border border-stone-950 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-sans text-xs font-bold text-stone-100">{activeTrack.title}</h4>
                <p className="font-mono text-[9px] text-stone-500 uppercase mt-0.5">{activeTrack.role}</p>
              </div>
              <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-0.5 rounded-md">
                {activeTrack.duration}
              </span>
            </div>

            {/* Lyric Card */}
            <p className="font-serif italic text-xs text-orange-200/90 leading-relaxed bg-stone-900/30 border-l border-orange-500/20 pl-3.5 py-1 mb-3">
              "{activeTrack.lyrics}"
            </p>

            {/* Insight */}
            <div className="text-[10px] font-sans text-stone-400 leading-normal mb-3.5">
              <strong className="text-stone-300">System Insight:</strong> {activeTrack.insight}
            </div>

            {/* Provenance list */}
            <div className="border-t border-stone-800/40 pt-2.5">
              <span className="font-mono text-[8px] text-stone-500 uppercase tracking-widest block mb-1">
                Authentic Provenance
              </span>
              <div className="flex flex-wrap gap-2">
                {activeTrack.contributors.map((c, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[9px] text-stone-400 bg-stone-900 border border-stone-800/60 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.type === 'human' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                    {c.name} ({c.role})
                  </span>
                ))}
                <span className="font-mono text-[9px] text-stone-500 bg-stone-900 border border-stone-800/20 px-2 py-0.5 rounded">
                  {activeTrack.rights}
                </span>
              </div>
            </div>
          </div>

          {/* Form to submit custom LoopIt */}
          <form onSubmit={handleCreateLoopIt} className="bg-stone-950/40 border border-stone-900 rounded-xl p-4">
            <span className="font-mono text-[9px] text-stone-500 uppercase tracking-wider block mb-2">
              Witness & Create LoopIt
            </span>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-900 p-1 rounded-xl mb-3">
              {(["spoon", "lemon", "digest"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCreationMode(m)}
                  className={`py-1 text-[9px] font-mono rounded-lg transition-all cursor-pointer ${
                    creationMode === m
                      ? "bg-stone-800 text-orange-400 border border-stone-700/60 shadow-sm"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {m === "spoon" ? "Spoon (Private)" : m === "lemon" ? "Lemon (Queued)" : "Not Digest"}
                </button>
              ))}
            </div>

            {/* Title & Obs Inputs */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Observation Title (e.g., matching kettle whistle)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20 font-sans"
              />
              <textarea
                placeholder="Describe your local witness or raw sensory data. (Kept protected based on selected mode)."
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20 font-sans h-14 resize-none"
              />
            </div>

            {successMsg && (
              <div className="mt-2 text-[10px] text-emerald-400 font-sans flex items-center gap-1 bg-emerald-950/30 border border-emerald-900/40 p-1.5 rounded-lg">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!newTitle.trim() || !newObs.trim()}
              className="mt-3 w-full py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 rounded-xl font-sans text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> LoopIt locally
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
