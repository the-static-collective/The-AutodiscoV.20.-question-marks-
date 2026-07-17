import React, { useState } from "react";
import { Hammer, Ban, Trash2, CheckCircle, RefreshCcw, EyeOff, Clipboard, AlertCircle, Compass } from "lucide-react";
import { LoopIt, LoopLifecycleState } from "../types";

interface DigestiveLifecycleProps {
  onDjMessage: (msg: string) => void;
  loops: LoopIt[];
  onUpdateLoop: (loopId: string, newState: LoopLifecycleState, actionLog: string) => void;
}

export default function DigestiveLifecycle({
  onDjMessage,
  loops,
  onUpdateLoop,
}: DigestiveLifecycleProps) {
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);

  // Filter loops list
  const activeLoop = loops.find((l) => l.id === selectedLoopId) || loops[0] || null;

  // Lifecycle states details
  const statesList: { name: LoopLifecycleState; desc: string; color: string }[] = [
    { name: "LOOP_INGESTED", desc: "Raw observation submitted. Private queue.", color: "bg-stone-800 text-stone-400" },
    { name: "LOOP_HELD", desc: "No analysis, no sharing, completely secure holding state.", color: "bg-blue-950/50 text-blue-400 border border-blue-900/40" },
    { name: "LOOP_ANALYZED", desc: "Explicitly authorized analysis or alignment policy permits.", color: "bg-amber-950/30 text-amber-400 border border-amber-800/30" },
    { name: "LOOP_REDACTED", desc: "Media/access withdrawn. Faded into the background.", color: "bg-red-950/40 text-red-400 border border-red-900/30" },
    { name: "LOOP_COMPOSTED", desc: "Local storage retention period ended. Pure soil.", color: "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" },
  ];

  const handleStateTransition = (loopId: string, nextState: LoopLifecycleState) => {
    const timeStr = new Date().toLocaleTimeString();
    let actionLog = "";
    if (nextState === "LOOP_HELD") {
      actionLog = `[${timeStr}] Held: Kept as non-digestible raw observation.`;
      onDjMessage(`LoopIt moved to HELD state. No analysis will run. We leave the stone in the stream.`);
    } else if (nextState === "LOOP_ANALYZED") {
      actionLog = `[${timeStr}] Analyzed: Consented alignment review complete.`;
      onDjMessage(`LoopIt moved to ANALYZED. Alignment checks completed.`);
    } else if (nextState === "LOOP_REDACTED") {
      actionLog = `[${timeStr}] Redacted: Access withdrawn. Erased media payload.`;
      onDjMessage(`LoopIt moved to REDACTED. Smoke receipt generated.`);
    } else if (nextState === "LOOP_COMPOSTED") {
      actionLog = `[${timeStr}] Composted: Local retention completed. Returned to soil.`;
      onDjMessage(`LoopIt moved to COMPOSTED. Returned safely to soil.`);
    }

    onUpdateLoop(loopId, nextState, actionLog);
  };

  return (
    <div id="digestive-lifecycle" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col h-full relative overflow-hidden group">
      {/* Background visual detail */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-2xl" />

      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-stone-400" />
        <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
          "The Things We Could Not Digest" Lifecycle Station
        </span>
      </div>

      {/* State visual flow map */}
      <div className="grid grid-cols-5 gap-1.5 p-1 bg-stone-950 rounded-xl mb-5 text-[8px] font-mono text-center">
        {statesList.map((st) => (
          <div
            key={st.name}
            className={`p-2 rounded-lg flex flex-col justify-between h-14 ${st.color}`}
          >
            <span className="font-bold tracking-tight block truncate">{st.name.replace("LOOP_", "")}</span>
            <span className="text-[7px] text-stone-500 leading-tight line-clamp-2 block mt-1">{st.desc}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Loops List */}
        <div className="md:col-span-5 border-r border-stone-800/60 pr-4 max-h-[340px] overflow-y-auto space-y-2">
          <span className="font-mono text-[9px] text-stone-500 uppercase tracking-wider block mb-2">
            Ingested Loops & Stones
          </span>
          {loops.length === 0 ? (
            <div className="text-center py-6 text-stone-600 font-sans text-xs italic">
              No LoopIts created yet. Choose a track above to witness.
            </div>
          ) : (
            loops.map((loop) => (
              <button
                key={loop.id}
                onClick={() => setSelectedLoopId(loop.id)}
                className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer block border ${
                  loop.id === (activeLoop?.id || "")
                    ? "bg-stone-800/60 border-stone-700"
                    : "bg-stone-950/40 border-transparent hover:border-stone-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-bold text-stone-300 truncate max-w-[120px]">{loop.title}</span>
                  <span className="font-mono text-[8px] text-stone-500">{loop.timestamp}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="font-mono text-[7px] bg-stone-900 px-1.5 py-0.5 rounded text-stone-400">
                    {loop.lifecycle}
                  </span>
                  {loop.isPrivate && (
                    <span className="font-mono text-[7px] bg-amber-950/40 text-amber-400 px-1.5 py-0.5 rounded">
                      SPOON
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected Loop Operations / Smoke Receipt */}
        <div className="md:col-span-7 flex flex-col justify-between min-h-0">
          {activeLoop ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Display details based on state */}
              {activeLoop.lifecycle === "LOOP_REDACTED" || activeLoop.lifecycle === "LOOP_COMPOSTED" ? (
                /* Smoke Receipt Mode */
                <div className="bg-gradient-to-b from-stone-950 to-stone-900 border border-stone-800/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-800/60 pb-2 mb-3">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-orange-400 font-bold uppercase tracking-widest">
                        <EyeOff className="w-3.5 h-3.5" /> Smoke Receipt (Durable proof)
                      </div>
                      <span className="font-mono text-[8px] text-stone-500">ID: {activeLoop.id}</span>
                    </div>

                    <p className="font-sans italic text-[11px] text-stone-400 leading-normal mb-4 bg-stone-900/40 p-2.5 rounded-lg border border-stone-950">
                      "The original media payload has been composted safely into local soil. The original files no longer exist. Only the durable metadata receipt is preserved."
                    </p>

                    <div className="space-y-1.5 font-mono text-[9px] text-stone-500">
                      <div className="flex justify-between">
                        <span>Original Signer:</span>
                        <span className="text-stone-400">{activeLoop.signer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retention Policy:</span>
                        <span className="text-stone-400">Composted (0 remaining days)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lifecycle Status:</span>
                        <span className="text-emerald-400 font-bold">{activeLoop.lifecycle}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs list */}
                  <div className="mt-4 pt-2 border-t border-stone-800/40">
                    <span className="font-mono text-[8px] text-stone-600 uppercase block mb-1">
                      Event audit logs
                    </span>
                    <div className="max-h-20 overflow-y-auto space-y-1 font-mono text-[8px] text-stone-500">
                      {activeLoop.history.map((log, idx) => (
                        <div key={idx} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active loop details with operations */
                <div className="bg-stone-950 p-4 border border-stone-900 rounded-xl flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between border-b border-stone-900 pb-2 mb-3">
                      <div>
                        <h4 className="font-sans text-xs font-bold text-stone-200">{activeLoop.title}</h4>
                        <span className="font-mono text-[8px] text-stone-500">{activeLoop.signer}</span>
                      </div>
                      <span className="font-mono text-[8px] bg-stone-900 px-2 py-0.5 rounded text-orange-400 uppercase">
                        {activeLoop.lifecycle}
                      </span>
                    </div>

                    <p className="font-sans text-xs text-stone-400 leading-relaxed mb-4">
                      "{activeLoop.observation}"
                    </p>
                  </div>

                  {/* Operational actions to transition states */}
                  <div>
                    <span className="font-mono text-[8px] text-stone-500 uppercase tracking-widest block mb-2">
                      Transition Lifecycle State
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        onClick={() => handleStateTransition(activeLoop.id, "LOOP_HELD")}
                        disabled={activeLoop.lifecycle === "LOOP_HELD"}
                        className="py-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded text-[9px] font-mono text-stone-300 border border-stone-800/60 cursor-pointer"
                        title="Dwell on item / Hold without analysis"
                      >
                        Hold (Dwell)
                      </button>
                      <button
                        onClick={() => handleStateTransition(activeLoop.id, "LOOP_ANALYZED")}
                        disabled={activeLoop.lifecycle === "LOOP_ANALYZED"}
                        className="py-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded text-[9px] font-mono text-stone-300 border border-stone-800/60 cursor-pointer"
                        title="Explicit Authorized Review"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={() => handleStateTransition(activeLoop.id, "LOOP_REDACTED")}
                        className="py-1 bg-red-950/20 hover:bg-red-900/20 rounded text-[9px] font-mono text-red-400 border border-red-900/30 cursor-pointer"
                        title="Withdraw Access"
                      >
                        Redact
                      </button>
                      <button
                        onClick={() => handleStateTransition(activeLoop.id, "LOOP_COMPOSTED")}
                        className="py-1 bg-emerald-950/20 hover:bg-emerald-900/20 rounded text-[9px] font-mono text-emerald-400 border border-emerald-900/30 cursor-pointer"
                        title="Compost locally"
                      >
                        Compost
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-stone-950/40 p-6 border border-stone-900 rounded-xl text-center flex-1 flex flex-col justify-center items-center text-stone-500">
              <Clipboard className="w-8 h-8 text-stone-700 mb-2" />
              <p className="font-sans text-xs italic">
                Select a LoopIt from the side drawer to manage its unrefined lifecycle.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
