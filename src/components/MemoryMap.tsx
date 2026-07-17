import React, { useEffect, useRef, useState } from "react";
import { Trash2, AlertTriangle, Compass, RefreshCcw } from "lucide-react";
import { Fossil, MemoryBlock } from "../types";

interface MemoryMapProps {
  onDjMessage: (msg: string) => void;
  fossils: Fossil[];
  setFossils: React.Dispatch<React.SetStateAction<Fossil[]>>;
}

export default function MemoryMap({ onDjMessage, fossils, setFossils }: MemoryMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeBlocks, setActiveBlocks] = useState<MemoryBlock[]>([]);
  const activeBlocksRef = useRef<MemoryBlock[]>([]);
  const fossilsRef = useRef<Fossil[]>([]);

  // Synchronize refs to use inside the high-frequency physics animation loop
  useEffect(() => {
    activeBlocksRef.current = activeBlocks;
  }, [activeBlocks]);

  useEffect(() => {
    fossilsRef.current = fossils;
  }, [fossils]);

  // Initial seed blocks
  useEffect(() => {
    const initialBlocks: MemoryBlock[] = [
      { id: "1", name: "temp_audio_buffer", size: 18, x: 80, y: 50, color: "#f43f5e", vx: 0.5, vy: -0.6 },
      { id: "2", name: "ui_state_scratchpad", size: 24, x: 180, y: 120, color: "#3b82f6", vx: -0.4, vy: 0.4 },
      { id: "3", name: "lemon_scent_lut", size: 15, x: 250, y: 80, color: "#fbbf24", vx: 0.6, vy: 0.3 },
    ];
    setActiveBlocks(initialBlocks);
  }, []);

  // Expose allocation trigger globally or through window for PoeticSandbox usage
  useEffect(() => {
    (window as any).triggerMemoryAllocation = (name: string, size: number) => {
      const colors = ["#f43f5e", "#3b82f6", "#fbbf24", "#10b981", "#a855f7", "#ec4899"];
      const randColor = colors[Math.floor(Math.random() * colors.length)];
      const newBlock: MemoryBlock = {
        id: Math.random().toString(),
        name: name,
        size: Math.min(35, Math.max(12, size)),
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 100,
        color: randColor,
        vx: (Math.random() * 2 - 1) * 0.8,
        vy: (Math.random() * 2 - 1) * 0.8,
      };
      setActiveBlocks((prev) => [...prev, newBlock]);
    };

    return () => {
      delete (window as any).triggerMemoryAllocation;
    };
  }, []);

  // Run Physics & Drawing Loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;

    const updatePhysics = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Update positions of active floating blocks
      const currentBlocks = activeBlocksRef.current.map((block) => {
        let nextX = block.x + block.vx;
        let nextY = block.y + block.vy;
        let nextVx = block.vx;
        let nextVy = block.vy;

        const radius = block.size / 2;

        // Wall collisions
        if (nextX - radius < 0) {
          nextX = radius;
          nextVx = -nextVx;
        } else if (nextX + radius > width) {
          nextX = width - radius;
          nextVx = -nextVx;
        }

        if (nextY - radius < 0) {
          nextY = radius;
          nextVy = -nextVy;
        } else if (nextY + radius > height) {
          nextY = height - radius;
          nextVy = -nextVy;
        }

        // Steer/Bounce off Peach Pit Fossils (rigid circles)
        fossilsRef.current.forEach((fossil) => {
          const dx = nextX - fossil.x;
          const dy = nextY - fossil.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = radius + fossil.size / 2 + 6; // buffer spacing

          if (dist < minDist) {
            // Calculate rebound angle and force block to bounce away
            const angle = Math.atan2(dy, dx);
            nextX = fossil.x + Math.cos(angle) * minDist;
            nextY = fossil.y + Math.sin(angle) * minDist;

            // Reflect velocity vector
            const bounceStrength = 0.8;
            nextVx = Math.cos(angle) * Math.abs(nextVx) * bounceStrength;
            nextVy = Math.sin(angle) * Math.abs(nextVy) * bounceStrength;
          }
        });

        return {
          ...block,
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
        };
      });

      // Quick internal collision logic between active blocks
      for (let i = 0; i < currentBlocks.length; i++) {
        for (let j = i + 1; j < currentBlocks.length; j++) {
          const b1 = currentBlocks[i];
          const b2 = currentBlocks[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radiusSum = (b1.size + b2.size) / 2;

          if (dist < radiusSum) {
            // swap velocities roughly
            const tempVx = b1.vx;
            const tempVy = b1.vy;
            b1.vx = b2.vx;
            b1.vy = b2.vy;
            b2.vx = tempVx;
            b2.vy = tempVy;
          }
        }
      }

      // Update local state without breaking loop
      activeBlocksRef.current = currentBlocks;
    };

    const draw = () => {
      updatePhysics();

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw Grid Matrix Background lines
      ctx.strokeStyle = "rgba(41, 37, 36, 0.5)";
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Peach Pit Fossils (frozen sector logs)
      fossilsRef.current.forEach((fossil) => {
        // Outer frozen shockwave halo
        ctx.strokeStyle = "rgba(239, 68, 68, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fossil.x, fossil.y, fossil.size / 2 + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Inner peach pit core (wooden/orange texture)
        const radGrad = ctx.createRadialGradient(
          fossil.x - 2,
          fossil.y - 2,
          1,
          fossil.x,
          fossil.y,
          fossil.size / 2
        );
        radGrad.addColorStop(0, "#fed7aa"); // bright peach peach highlight
        radGrad.addColorStop(0.5, "#ea580c"); // dark orange orange
        radGrad.addColorStop(1, "#7c2d12"); // brown pit core
        ctx.fillStyle = radGrad;

        ctx.beginPath();
        ctx.arc(fossil.x, fossil.y, fossil.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw star or fossilized crosshairs in center
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fossil.x - 4, fossil.y);
        ctx.lineTo(fossil.x + 4, fossil.y);
        ctx.moveTo(fossil.x, fossil.y - 4);
        ctx.lineTo(fossil.x, fossil.y + 4);
        ctx.stroke();

        // Label for fossil block (faded)
        ctx.fillStyle = "rgba(168, 162, 158, 0.45)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(fossil.name, fossil.x, fossil.y - fossil.size / 2 - 3);
      });

      // Draw Active Floating Blocks
      activeBlocksRef.current.forEach((block) => {
        ctx.fillStyle = block.color;
        const radius = block.size / 2;

        ctx.beginPath();
        ctx.arc(block.x, block.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Label name
        ctx.fillStyle = "rgba(224, 224, 224, 0.75)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(block.name, block.x, block.y - radius - 2);
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // GC Triggering: Crystallizes active blocks into fossils
  const runGarbageCollection = () => {
    const currentActive = activeBlocksRef.current;
    if (currentActive.length === 0) {
      onDjMessage("You ran Garbage Collection. The memory sectors are clean; no debris left to crystallize.");
      return;
    }

    // Convert all active blocks to fixed fossils!
    const newFossils: Fossil[] = currentActive.map((block) => {
      return {
        id: block.id,
        name: block.name + "_fossil",
        size: block.size,
        x: block.x,
        y: block.y,
        color: block.color,
        birthTime: Date.now(),
      };
    });

    setFossils((prev) => [...prev, ...newFossils]);
    setActiveBlocks([]); // clear active allocations
    activeBlocksRef.current = [];

    onDjMessage(
      `Garbage collector triggered. Dissolved objects crystallized into 'Peach Pit' Fossils. New objects must flow around them.`
    );
  };

  // Re-allocate default blocks
  const resetActiveAllocations = () => {
    const fresh: MemoryBlock[] = [
      { id: "4", name: "new_session_state", size: 16, x: 50, y: 60, color: "#10b981", vx: 0.4, vy: 0.5 },
      { id: "5", name: "audio_fft_output", size: 28, x: 220, y: 110, color: "#a855f7", vx: -0.5, vy: -0.4 },
    ];
    setActiveBlocks(fresh);
  };

  return (
    <div id="memory-map" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background visual pit accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl transition-all duration-700 group-hover:bg-rose-500/10" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
              "Peach Pit" Fossil Memory
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetActiveAllocations}
              className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300 transition-all cursor-pointer"
              title="Spawn active allocations"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={runGarbageCollection}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-800/60 rounded-xl font-sans text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge Memory (GC)
            </button>
          </div>
        </div>

        {/* Physics Canvas Area */}
        <div className="bg-stone-950 border border-stone-900 rounded-xl h-48 relative overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={380}
            height={192}
            className="w-full h-full block"
          />
          {activeBlocks.length === 0 && fossils.length === 0 && (
            <div className="absolute pointer-events-none text-center">
              <span className="font-mono text-[9px] text-stone-600 uppercase tracking-widest">
                Sectors Empty
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fossils counter and description */}
      <div className="mt-4 pt-3 border-t border-stone-800/50 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-stone-500">Peach Pit Fossils:</span>
          <span className="text-rose-400 font-bold bg-rose-950/20 px-2 py-0.5 rounded-md border border-rose-900/30">
            {fossils.length} items preserved
          </span>
        </div>
        <p className="font-sans text-[10px] text-stone-500 leading-normal">
          Instead of destroying "dead" variables, garbage collection freezes them forever as peach pit obstacles. New running memory allocations are forced to bend and bounce around them.
        </p>
      </div>
    </div>
  );
}
