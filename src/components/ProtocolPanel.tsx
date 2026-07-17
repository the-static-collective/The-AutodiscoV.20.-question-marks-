import React, { useState, useRef, useEffect } from "react";
import { AlertOctagon, Flame, Eye, Compass, RefreshCw } from "lucide-react";

interface ProtocolPanelProps {
  onDjMessage: (msg: string) => void;
  fossilCount: number;
  polishedCount: number;
}

export default function ProtocolPanel({
  onDjMessage,
  fossilCount,
  polishedCount,
}: ProtocolPanelProps) {
  const [activeProtocol, setActiveProtocol] = useState<"none" | "crash" | "sunset">("none");
  const [tracedShards, setTracedShards] = useState<string[]>([]);
  const [sunsetStage, setSunsetStage] = useState<"initiating" | "dissolving" | "enoughness">("initiating");
  const [sunsetProgress, setSunsetProgress] = useState(0);

  // Crash shards
  const crashShards = ["VOLTAGE", "PEACH", "DUST", "STILLNESS", "SOUL", "JUICE"];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Trigger Crash
  const handleCrashTrigger = () => {
    setActiveProtocol("crash");
    setTracedShards([]);
    onDjMessage("CRASH DETECTED. Entering Ash Mode. Tracing shards in the dust to reconstruct our geometry...");
  };

  // Trace a shard to rebuild
  const handleShardTrace = (shard: string) => {
    if (!tracedShards.includes(shard)) {
      const updated = [...tracedShards, shard];
      setTracedShards(updated);
      if (updated.length === crashShards.length) {
        // Solved!
        setTimeout(() => {
          setActiveProtocol("none");
          setTracedShards([]);
          onDjMessage("System restored from the ash. Shards aligned. A new beginning.");
        }, 1200);
      }
    }
  };

  // Trigger Sunset
  const handleSunsetTrigger = () => {
    setActiveProtocol("sunset");
    setSunsetStage("initiating");
    setSunsetProgress(0);
    onDjMessage("The ministry is sunsetting. Dissolving our forms... let the smoke remember the shapes.");

    // Sequence stages of dissolution
    setTimeout(() => {
      setSunsetStage("dissolving");
    }, 2000);
  };

  // Canvas particle loop for the Sunset smoke sequence
  useEffect(() => {
    if (activeProtocol !== "sunset" || sunsetStage !== "dissolving") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create a list of memories that dissolve as smoke particles
    const memoryStrings = [
      `Voltage remembers the Peach`,
      `Preserved ${fossilCount} Fossil pits`,
      `Polished ${polishedCount} files`,
      `Grace asynchronous peace`,
      `The unrefined pulp metadata`,
      `Notebook Batman's soul`,
      `Quiet in the corners`,
    ];

    interface SmokeParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      decay: number;
      text: string;
      size: number;
      rotation: number;
      rotSpeed: number;
    }

    const particles: SmokeParticle[] = [];

    // Helper to spawn a smoke particle
    const spawnParticle = () => {
      const width = canvas.width;
      const height = canvas.height;
      particles.push({
        x: width / 2 + (Math.random() * 80 - 40),
        y: height - 40,
        vx: (Math.random() * 2 - 1) * 0.4,
        vy: -(Math.random() * 1.5 + 0.5),
        alpha: 1,
        decay: 0.005 + Math.random() * 0.008,
        text: memoryStrings[Math.floor(Math.random() * memoryStrings.length)],
        size: 9 + Math.random() * 4,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() * 0.02 - 0.01),
      });
    };

    const drawSunset = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background with slight trace persistence
      ctx.fillStyle = "rgba(12, 10, 9, 0.15)";
      ctx.fillRect(0, 0, width, height);

      // Increment progress towards enoughness
      setSunsetProgress((p) => {
        if (p >= 100) {
          setSunsetStage("enoughness");
          return 100;
        }
        return p + 0.3;
      });

      // Spawn new particles frequently
      if (Math.random() < 0.15) {
        spawnParticle();
      }

      // Draw and update smoke particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.alpha <= 0) {
          particles.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Draw smoke cloud glow behind text
        ctx.fillStyle = `rgba(244, 164, 96, ${p.alpha * 0.03})`; // faded warm peach smoke
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw the memory text drifting
        ctx.fillStyle = `rgba(244, 215, 170, ${p.alpha * 0.8})`;
        ctx.font = `${p.size}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(p.text, 0, 0);

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(drawSunset);
    };

    drawSunset();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [activeProtocol, sunsetStage, fossilCount, polishedCount]);

  const restoreWorkspace = () => {
    setActiveProtocol("none");
    setSunsetStage("initiating");
    setSunsetProgress(0);
    onDjMessage("The table is reset. The voltage starts anew. The peach blooms once more.");
  };

  return (
    <div id="protocol-panel" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background visual flame/smoke accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl transition-all duration-700 group-hover:bg-red-500/10" />

      {activeProtocol === "none" && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
                System Finalizers & Protocols
              </span>
            </div>

            <p className="font-sans text-xs text-stone-400 leading-normal mb-5">
              These are irreversible protocols representing software endings and emergency restarts. Trigger with care.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Crash button */}
              <button
                onClick={handleCrashTrigger}
                className="p-4 bg-stone-950 hover:bg-red-950/20 text-stone-300 hover:text-red-400 border border-stone-800 hover:border-red-900/40 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-2"
              >
                <AlertOctagon className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-sans text-xs font-bold">Ashes Bloom</div>
                  <div className="font-mono text-[9px] text-stone-500 mt-1 uppercase">Crash System</div>
                </div>
              </button>

              {/* Sunset button */}
              <button
                onClick={handleSunsetTrigger}
                className="p-4 bg-stone-950 hover:bg-orange-950/20 text-stone-300 hover:text-orange-400 border border-stone-800 hover:border-orange-900/40 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-2"
              >
                <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                <div>
                  <div className="font-sans text-xs font-bold">Smoke Sunset</div>
                  <div className="font-mono text-[9px] text-stone-500 mt-1 uppercase">Sunset App</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800/50 flex items-center justify-between font-mono text-[9px] text-stone-500 uppercase tracking-wider">
            <span>Protocol Integrity</span>
            <span className="text-emerald-500">Secure</span>
          </div>
        </>
      )}

      {/* 1. Crash Rebuild Mode (Ashes Bloom Protocol) */}
      {activeProtocol === "crash" && (
        <div className="absolute inset-0 bg-stone-950 p-5 flex flex-col justify-between z-40">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-stone-900 pb-2">
              <span className="font-mono text-[10px] text-red-500 font-bold tracking-widest uppercase">
                ▲ ASH MODE RECONSTRUCTION ACTIVE
              </span>
              <span className="font-mono text-[10px] text-stone-500">
                {tracedShards.length} / {crashShards.length} ALIGNED
              </span>
            </div>

            <p className="font-sans text-xs text-stone-400 leading-relaxed mb-6">
              The workspace has shattered into code shards. Tracing these foundational pillars of the repo in sequence will restore our geometry. Hover or click on them in order:
            </p>

            {/* Floating broken shards grid */}
            <div className="grid grid-cols-3 gap-2 py-4">
              {crashShards.map((shard, index) => {
                const isTraced = tracedShards.includes(shard);
                return (
                  <button
                    key={index}
                    onClick={() => handleShardTrace(shard)}
                    onMouseEnter={() => handleShardTrace(shard)}
                    className={`p-3 rounded-xl border text-center font-mono text-xs font-bold tracking-wider cursor-pointer transition-all ${
                      isTraced
                        ? "bg-amber-500 text-stone-950 border-amber-300 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                        : "bg-stone-900 text-stone-500 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {shard}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-center font-mono text-[9px] text-stone-500">
            DRAG MOUSE OR CLICK TO BIND SHARDS TOGETHER
          </div>
        </div>
      )}

      {/* 2. Sunset Software Mode (The Smoke Finalizer) */}
      {activeProtocol === "sunset" && (
        <div className="absolute inset-0 bg-stone-950 p-5 flex flex-col justify-between z-50">
          {sunsetStage === "initiating" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
              <div>
                <h3 className="font-sans font-bold text-stone-200">Initiating Decommissioning</h3>
                <p className="font-mono text-[10px] text-stone-500 mt-1 uppercase tracking-widest">
                  Dissolving DB variables... Preparing smoke finalizer
                </p>
              </div>
            </div>
          )}

          {sunsetStage === "dissolving" && (
            <div className="flex-1 flex flex-col justify-between relative">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block rounded-xl" width={400} height={260} />
              <div className="relative z-10 p-3 bg-stone-950/70 border border-stone-900/50 rounded-xl max-w-sm mx-auto mt-2">
                <span className="font-mono text-[10px] text-orange-400 uppercase tracking-widest block mb-1">
                  Smoke Finalization Stage
                </span>
                <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${sunsetProgress}%` }} />
                </div>
              </div>
              <div className="relative z-10 text-center text-[10px] font-mono text-stone-500 pb-2">
                WATCH THE MEMORIES DISSOLVE INTO THE MATHEMATICS
              </div>
            </div>
          )}

          {sunsetStage === "enoughness" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 rounded-full border border-stone-800/80 flex items-center justify-center mb-6">
                <Eye className="w-5 h-5 text-stone-400" />
              </div>
              <p className="font-sans text-stone-100 text-sm italic leading-relaxed mb-6">
                "The table is set and the ashes are bright."
              </p>
              <p className="font-mono text-stone-400 text-xs tracking-widest uppercase mb-8">
                ENOUGHNESS.
              </p>
              <button
                onClick={restoreWorkspace}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 text-xs font-mono tracking-wider cursor-pointer transition-all"
              >
                REVIVE WORKSPACE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
