import React, { useState, useEffect, useRef } from "react";
import { Hand, RefreshCw, Zap, Flame, Compass } from "lucide-react";

interface SqueezePanelProps {
  onDjMessage: (msg: string) => void;
  setLemonScent: React.Dispatch<React.SetStateAction<number>>;
  setServerLoad: React.Dispatch<React.SetStateAction<number>>;
}

export default function SqueezePanel({
  onDjMessage,
  setLemonScent,
  setServerLoad,
}: SqueezePanelProps) {
  const [squeezeProgress, setSqueezeProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulp, setPulp] = useState<any | null>(null);
  const [juice, setJuice] = useState<string | null>(null);
  const pressTimerRef = useRef<number | null>(null);

  // Pressing down on the lemon
  useEffect(() => {
    if (isPressing) {
      pressTimerRef.current = window.setInterval(() => {
        setSqueezeProgress((prev) => {
          if (prev >= 100) {
            setIsPressing(false);
            triggerSqueezeAPI();
            return 100;
          }
          return prev + 6; // quick squeeze
        });
      }, 50);
    } else {
      if (pressTimerRef.current) {
        clearInterval(pressTimerRef.current);
      }
      // Slowly decay squeeze progress if released early
      pressTimerRef.current = window.setInterval(() => {
        setSqueezeProgress((prev) => {
          if (prev <= 0) {
            if (pressTimerRef.current) clearInterval(pressTimerRef.current);
            return 0;
          }
          return prev - 8;
        });
      }, 80);
    }

    return () => {
      if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    };
  }, [isPressing]);

  const triggerSqueezeAPI = async () => {
    setLoading(true);
    setPulp(null);
    setJuice(null);

    try {
      const response = await fetch("/api/squeeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeContext: "The ministry isn't clean. The ministry is juice.",
          systemActivity: "Interactive Lemon Squeeze Session"
        }),
      });

      const data = await response.json();
      setPulp(data.pulp);
      setJuice(data.juice);

      // Squeezing releases lemon scent in the uptime drone!
      setLemonScent((prev) => Math.min(100, prev + 25));
      // Squeezing briefly spikes server load due to calculation
      setServerLoad((prev) => Math.min(100, prev + 12));

      onDjMessage(
        `You squeezed the API. Out came the unrefined pulp—${data.pulp.dbMood || 'raw energy'}—and a drop of pure, sweet software juice: "${data.juice}"`
      );
    } catch (e) {
      console.error(e);
      setPulp({
        thinkingTimeMs: 44,
        dbMood: "turbulent",
        rawVoltage: "112V",
        lemonScentRatio: "85%"
      });
      setJuice("The math failed, but the lemon peel still smells sweet. Keep pressing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="squeeze-panel" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Visual background lemon accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl transition-all duration-700 group-hover:bg-yellow-400/10" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Hand className="w-5 h-5 text-yellow-400" />
          <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
            The "Squeeze It" Lemon API
          </span>
        </div>

        {/* Lemon Visual Squeezer */}
        <div className="flex flex-col items-center justify-center py-6 bg-stone-950/60 rounded-xl relative overflow-hidden border border-stone-950">
          <div
            className="relative cursor-pointer select-none touch-none"
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            onTouchStart={() => setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
          >
            {/* The Lemon representation */}
            <div
              className="w-24 h-16 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 rounded-full flex items-center justify-center border-t border-yellow-200 shadow-lg relative transition-transform"
              style={{
                transform: `scale(${1 - (squeezeProgress / 100) * 0.25}) rotate(${isPressing ? (Math.random() * 4 - 2) : 0}deg)`,
                boxShadow: isPressing
                  ? `0 0 ${10 + squeezeProgress / 5}px rgba(250, 204, 21, 0.4)`
                  : "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Lemon Tips */}
              <div className="absolute -left-1.5 w-3 h-3 bg-yellow-500 rounded-full border border-yellow-400" />
              <div className="absolute -right-1.5 w-3 h-3 bg-yellow-500 rounded-full border border-yellow-400" />

              <span className="font-sans text-[10px] text-stone-950 font-bold uppercase tracking-wider">
                {squeezeProgress > 0 ? `${Math.round(squeezeProgress)}%` : "Squeeze Me"}
              </span>

              {/* Juice droplets animation */}
              {isPressing && squeezeProgress > 20 && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 space-y-1">
                  <span className="block w-1.5 h-3 bg-yellow-400/80 rounded-full animate-bounce" />
                  <span className="block w-1 h-2 bg-yellow-300/80 rounded-full animate-pulse delay-75" />
                </div>
              )}
            </div>
          </div>

          <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-6">
            Hold Click to Squeeze Juice
          </p>
        </div>
      </div>

      {/* Outputs */}
      <div className="mt-4 flex-1 flex flex-col justify-end space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-stone-400 font-mono text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            <span>Squeezing out pulp metadata...</span>
          </div>
        )}

        {/* Render pulp (unrefined messy variables) */}
        {pulp && (
          <div className="bg-stone-950/90 border border-stone-900 rounded-xl p-3 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-stone-500 font-bold mb-1.5 border-b border-stone-900 pb-1">
              <Compass className="w-3.5 h-3.5 text-yellow-500/80" /> UNREFINED PULP METADATA
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-400">
              <div className="flex justify-between">
                <span className="text-stone-600">think_time:</span>
                <span>{pulp.thinkingTimeMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">db_mood:</span>
                <span className="truncate max-w-[80px]">{pulp.dbMood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">raw_voltage:</span>
                <span>{pulp.rawVoltage || "118.4V"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">scent:</span>
                <span>{pulp.lemonScentRatio || "high"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Render pure juice quotation */}
        {juice && (
          <div className="bg-gradient-to-r from-yellow-950/20 via-yellow-950/35 to-amber-950/20 border border-yellow-900/30 rounded-xl p-3 relative overflow-hidden">
            <span className="absolute -top-3 -left-2 text-yellow-500/10 font-serif text-5xl font-black pointer-events-none">
              “
            </span>
            <p className="font-sans italic text-stone-300 text-xs leading-relaxed relative z-10 pl-2">
              {juice}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
