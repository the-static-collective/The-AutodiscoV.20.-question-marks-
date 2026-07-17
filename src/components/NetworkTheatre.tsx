import React, { useState } from "react";
import { Users, Radio, Ghost, Server, ShieldCheck, Wifi, WifiOff, Plus, Check } from "lucide-react";

interface PeerNode {
  id: string;
  name: string;
  status: "online" | "offline";
  latency: string;
  key: string;
  lineage: string;
}

interface Attestation {
  id: string;
  topic: string;
  signers: string[];
  consensusScore: number; // calculated locally
}

interface NetworkTheatreProps {
  onDjMessage: (msg: string) => void;
}

export default function NetworkTheatre({ onDjMessage }: NetworkTheatreProps) {
  const [activeTab, setActiveTab] = useState<"consensus" | "ghost">("consensus");

  // State for Consensus Theatre
  const [attestations, setAttestations] = useState<Attestation[]>([
    {
      id: "at1",
      topic: "The voltage remembers the peach on channel A4",
      signers: ["Peer Node 0x3B82", "Peer Node 0x7C2D"],
      consensusScore: 66,
    },
    {
      id: "at2",
      topic: "Kettle boiling matched 440Hz standard pitch",
      signers: ["Local Key 0x1A4B"],
      consensusScore: 33,
    },
    {
      id: "at3",
      topic: "Grace gates successfully held for 3.5 seconds",
      signers: ["Peer Node 0x3B82", "Local Key 0x1A4B", "Model Scribe 0xFC32"],
      consensusScore: 100,
    }
  ]);

  const [newTopic, setNewTopic] = useState("");
  const [selectedAttestationId, setSelectedAttestationId] = useState<string>("at1");
  const selectedAttestation = attestations.find(a => a.id === selectedAttestationId) || attestations[0];

  // State for Architecture of a Ghost
  const [peers, setPeers] = useState<PeerNode[]>([
    { id: "p1", name: "Gardener Node", status: "online", latency: "12ms", key: "0x1A4B", lineage: "S. Collective human-editor" },
    { id: "p2", name: "Basement Server (Swamp)", status: "online", latency: "88ms", key: "0x3B82", lineage: "Perplexity-assisted layout" },
    { id: "p3", name: "Attic Kettle Sensor", status: "offline", latency: "N/A", key: "0x7C2D", lineage: "Offline porch lights" },
    { id: "p4", name: "Third Floor Ghost Path", status: "offline", latency: "N/A", key: "0x9B2E", lineage: "Fossilized commit indexer" },
  ]);

  const handleAddAttestation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    const newAt: Attestation = {
      id: "at_" + Math.random().toString(36).substr(2, 9),
      topic: newTopic,
      signers: ["Local Key 0x1A4B"], // Initial local signature
      consensusScore: 33,
    };

    setAttestations(prev => [...prev, newAt]);
    setSelectedAttestationId(newAt.id);
    setNewTopic("");
    onDjMessage(`New consensus topic proposed: '${newTopic}'. Locally attested by Local Key 0x1A4B.`);
  };

  const handleAddPeerSignature = () => {
    // Simulate peer signing
    const peerSignatures = ["Peer Node 0x3B82", "Peer Node 0x7C2D", "Model Scribe 0xFC32"];
    const unsignedPeers = peerSignatures.filter(p => !selectedAttestation.signers.includes(p));

    if (unsignedPeers.length === 0) {
      onDjMessage("All verified active and ghost peers have already attested to this statement.");
      return;
    }

    const nextSigner = unsignedPeers[0];
    setAttestations(prev => prev.map(a => {
      if (a.id === selectedAttestation.id) {
        const nextSigners = [...a.signers, nextSigner];
        const nextScore = Math.min(100, Math.round((nextSigners.length / 4) * 100));
        return {
          ...a,
          signers: nextSigners,
          consensusScore: nextScore
        };
      }
      return a;
    }));

    onDjMessage(`Independent attestation added to '${selectedAttestation.topic}' by ${nextSigner}. Alignment increased.`);
  };

  return (
    <div id="network-theatre" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background visual halo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-2xl" />

      <div>
        {/* Tabs switcher */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-800/60">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("consensus")}
              className={`px-3 py-1.5 rounded-xl font-sans text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "consensus"
                  ? "bg-stone-800 text-orange-400 border border-stone-700/60 shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Consensus Theatre
            </button>
            <button
              onClick={() => setActiveTab("ghost")}
              className={`px-3 py-1.5 rounded-xl font-sans text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "ghost"
                  ? "bg-stone-800 text-orange-400 border border-stone-700/60 shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Ghost className="w-3.5 h-3.5" /> Architecture of a Ghost
            </button>
          </div>

          <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest hidden sm:inline">
            Verified Peers: {peers.filter(p => p.status === "online").length}
          </span>
        </div>

        {/* Tab Content 1: Consensus Theatre */}
        {activeTab === "consensus" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* List left */}
              <div className="md:col-span-5 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {attestations.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAttestationId(a.id)}
                    className={`w-full text-left p-2 rounded-xl text-[11px] font-sans border block ${
                      a.id === selectedAttestation.id
                        ? "bg-stone-950 text-orange-300 border-orange-500/20"
                        : "bg-stone-950/40 text-stone-400 border-transparent hover:border-stone-850"
                    }`}
                  >
                    <span className="font-medium block truncate">{a.topic}</span>
                    <span className="font-mono text-[8px] text-stone-500 block mt-0.5">
                      Attestations: {a.signers.length} signatures
                    </span>
                  </button>
                ))}
              </div>

              {/* Details right */}
              <div className="md:col-span-7 bg-stone-950/60 border border-stone-950 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[8px] text-stone-500 uppercase block mb-1">
                    Independent Signatures (Audit list)
                  </span>
                  <div className="space-y-1 max-h-[84px] overflow-y-auto">
                    {selectedAttestation.signers.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 font-mono text-[9px] text-stone-300">
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-900 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between font-mono text-[8px] text-stone-400 mb-1">
                      <span>ALIGNMENT SPECTRUM</span>
                      <span className="font-bold text-orange-400">{selectedAttestation.consensusScore}%</span>
                    </div>
                    {/* Retro line spectrum (Not truth achieved) */}
                    <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                      <div className="bg-orange-500 h-full" style={{ width: `${selectedAttestation.consensusScore}%` }} />
                    </div>
                  </div>

                  <button
                    onClick={handleAddPeerSignature}
                    className="ml-3 px-2 py-1 bg-stone-800 hover:bg-stone-750 border border-stone-700/60 rounded-lg text-[9px] font-mono text-stone-200 cursor-pointer"
                  >
                    Co-Sign
                  </button>
                </div>
              </div>
            </div>

            {/* Quick propose form */}
            <form onSubmit={handleAddAttestation} className="flex gap-2 bg-stone-950/40 p-2 border border-stone-900 rounded-xl">
              <input
                type="text"
                placeholder="Propose attestation topic (e.g., spoon angle matches sunset)"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-800/60 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none placeholder-stone-600 font-sans"
              />
              <button
                type="submit"
                disabled={!newTopic.trim()}
                className="px-3 py-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 rounded-lg text-stone-950 font-sans font-bold text-xs cursor-pointer"
              >
                Propose
              </button>
            </form>

            <p className="font-mono text-[9px] text-stone-500 italic text-center">
              "We never display a simplistic 'truth achieved' indicator. Only locally verified independent alignments."
            </p>
          </div>
        )}

        {/* Tab Content 2: Architecture of a Ghost */}
        {activeTab === "ghost" && (
          <div className="space-y-4">
            <p className="font-sans text-xs text-stone-400 leading-normal">
              Continuity across distributed, unreliable, and fragmented peer signals. Showing author lineage and offline/missing paths honestly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[210px] overflow-y-auto">
              {peers.map(p => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-start justify-between ${
                    p.status === "online"
                      ? "bg-stone-950/40 border-stone-900 hover:border-stone-800"
                      : "bg-red-950/5 border-red-950/20 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {p.status === "online" ? (
                        <Wifi className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-sans text-xs font-bold text-stone-200">{p.name}</h4>
                      <p className="font-mono text-[8px] text-stone-500 mt-0.5">KEY: {p.key}</p>
                      <p className="font-mono text-[8px] text-stone-400 mt-1 uppercase tracking-wide">{p.lineage}</p>
                    </div>
                  </div>

                  <span className={`font-mono text-[8px] font-bold ${p.status === "online" ? "text-emerald-500" : "text-red-500"}`}>
                    {p.status.toUpperCase()} {p.status === "online" && `(${p.latency})`}
                  </span>
                </div>
              ))}
            </div>

            <p className="font-mono text-[9px] text-stone-500 italic text-center">
              "Building walls of ghosts, hoping the signal survives the cold rain..."
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
