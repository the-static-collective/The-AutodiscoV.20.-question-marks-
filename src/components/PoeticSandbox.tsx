import React, { useEffect, useRef, useState } from "react";
import { Code2, Sparkles, AlertCircle, Play, Sparkle } from "lucide-react";
import { FileEntry } from "../types";

interface PoeticSandboxProps {
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  onDjMessage: (msg: string) => void;
  triggerMemoryAllocation: (name: string, size: number) => void;
}

export default function PoeticSandbox({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  onDjMessage,
  triggerMemoryAllocation,
}: PoeticSandboxProps) {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const [editorContent, setEditorContent] = useState(activeFile.content);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [executionState, setExecutionState] = useState<"idle" | "stillness" | "resolving" | "done">("idle");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Synchronize editor content when changing active file
  useEffect(() => {
    setEditorContent(activeFile.content);
  }, [activeFileId]);

  // Gradually gather dust over time for all files
  useEffect(() => {
    const timer = setInterval(() => {
      setFiles((prev) =>
        prev.map((file) => {
          // Unused files gather dust faster
          const rate = file.id === activeFileId ? 0.3 : 1.2;
          const newDust = Math.min(100, file.dust + rate);
          return {
            ...file,
            dust: newDust,
            isPolished: newDust === 0,
          };
        })
      );
    }, 1200);

    return () => clearInterval(timer);
  }, [activeFileId]);

  // Handle Dwell/Polishing action when mouse moves over the text area
  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (activeFile.dust > 0) {
      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === activeFileId) {
            const newDust = Math.max(0, file.dust - 2.5); // polish it
            const polished = newDust === 0;
            if (polished && !file.isPolished) {
              // Trigger a message from the DJ the first time it becomes polished
              onDjMessage(
                `The file '${file.name}' shines now. Touched by love. You polished away the dust of neglect.`
              );
            }
            return {
              ...file,
              dust: newDust,
              isPolished: polished,
            };
          }
          return file;
        })
      );
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    setFiles((prev) =>
      prev.map((file) => {
        if (file.id === activeFileId) {
          return { ...file, content: val, dust: Math.max(0, file.dust - 4) }; // typing polishes code slightly
        }
        return file;
      })
    );
  };

  // Grace Asynchronous execution simulation (Lemon-Scented Logic Gates)
  const runGraceExecution = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setExecutionState("stillness");
    setExecutionLog(["[Grace Gate] Initializing asynchronous resolve...", "[Grace Gate] Mandatory stillness period engaged. Sittings low."]);
    onDjMessage("Grace logic gate opened. The code sits low, waiting for stillness. Peace over speed.");

    // Sequence of poetic stillness states
    const steps = [
      { text: "[Grace Gate] Leaning in... checking core system temperatures", delay: 1200 },
      { text: "[Grace Gate] Quiet in the corners... filtering noise", delay: 2400 },
      { text: "[Grace Gate] The voltage remembers the peach. Resolving math...", delay: 3800 },
      { text: "[System] Successfully processed: " + activeFile.name, delay: 5000 },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setExecutionLog((prev) => [...prev, step.text]);
        if (idx === 1) {
          setExecutionState("resolving");
        }
        if (idx === steps.length - 1) {
          setExecutionState("done");
          setIsExecuting(false);
          // Trigger memory allocation based on file run to feed the Peach Pit Memory component!
          const size = Math.floor(Math.random() * 40 + 15);
          triggerMemoryAllocation(activeFile.name.split(".")[0] + "_alloc", size);
          onDjMessage(`Grace logic gate resolved successfully. System peace maintained. Allocated ${size}MB in Fossil Memory.`);
        }
      }, step.delay);
    });
  };

  return (
    <div id="poetic-sandbox" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col h-full relative group">
      {/* Absolute badge for Polished Shine effect */}
      {activeFile.isPolished && (
        <div className="absolute top-4 right-4 text-amber-400 flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider animate-pulse z-10">
          <Sparkles className="w-3 h-3 text-amber-400" /> Shined & Polished
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-amber-400" />
          <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
            Poetic IDE & Dust Layer
          </span>
        </div>

        {/* File tabs */}
        <div className="flex gap-1 bg-stone-950/60 p-1 rounded-xl">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer relative ${
                file.id === activeFileId
                  ? "bg-stone-800 text-stone-200 border border-stone-700"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {file.name}
              {/* Little dust marker badge */}
              {file.dust > 20 && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-stone-900"
                  style={{
                    backgroundColor: `rgba(168, 162, 158, ${file.dust / 100})`,
                  }}
                  title={`Dust gathering: ${Math.round(file.dust)}%`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Box */}
      <div className="relative flex-1 flex flex-col min-h-64">
        <textarea
          ref={editorRef}
          value={editorContent}
          onChange={handleTextChange}
          onMouseMove={handleMouseMove}
          className={`w-full flex-1 p-4 rounded-xl font-mono text-xs bg-stone-950 text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none transition-all ${
            activeFile.isPolished
              ? "shadow-[0_0_24px_rgba(251,191,36,0.06)] border border-amber-500/20"
              : "border border-stone-900"
          }`}
          style={{
            // Apply gradual blur & sepia tint as dust gathers
            filter: `blur(${activeFile.dust / 80}px) sepia(${activeFile.dust / 200})`,
            transition: "filter 0.3s ease",
          }}
          placeholder="Dwell on files to clear dust..."
        />

        {/* Floating Dust Particle simulation overlay */}
        {activeFile.dust > 10 && (
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden mix-blend-screen opacity-60">
            {Array.from({ length: Math.floor(activeFile.dust / 5) }).map((_, idx) => (
              <span
                key={idx}
                className="absolute w-1 h-1 bg-stone-500/30 rounded-full animate-pulse"
                style={{
                  top: `${(idx * 17) % 95}%`,
                  left: `${(idx * 23) % 95}%`,
                  animationDuration: `${2 + (idx % 3)}s`,
                }}
              />
            ))}
            <div
              className="absolute inset-0 bg-stone-900/10 backdrop-blur-[0.5px]"
              style={{
                opacity: activeFile.dust / 100,
                backgroundColor: `rgba(87, 83, 78, ${activeFile.dust / 180})`,
              }}
            />
          </div>
        )}

        {/* Action controls */}
        <div className="mt-3 flex gap-2 items-center">
          <button
            onClick={runGraceExecution}
            disabled={isExecuting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
              isExecuting
                ? "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
                : "bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] border border-transparent"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Grace Gateway (Run)
          </button>

          {/* Dust Meter Display */}
          <div className="flex-1 flex items-center justify-end gap-2 text-right">
            <span className="font-mono text-[10px] text-stone-500 uppercase">
              Neglect / Dust Layer:
            </span>
            <div className="w-20 bg-stone-950 rounded-full h-1.5 overflow-hidden border border-stone-800">
              <div
                className="bg-stone-400 h-full transition-all duration-300"
                style={{ width: `${activeFile.dust}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-stone-400 w-8">
              {Math.round(activeFile.dust)}%
            </span>
          </div>
        </div>
      </div>

      {/* Grace logic gate log */}
      {executionLog.length > 0 && (
        <div className="mt-4 bg-stone-950 border border-stone-900 rounded-xl p-3 font-mono text-[10px] space-y-1 max-h-28 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1.5 mb-1.5 text-stone-500">
            <span>GRACE RUNTIME TELEMETRY</span>
            <span className="flex items-center gap-1 text-yellow-500">
              <Sparkle className="w-2.5 h-2.5 animate-spin" /> {executionState.toUpperCase()}
            </span>
          </div>
          {executionLog.map((log, index) => (
            <div
              key={index}
              className={`${
                log.includes("[System]")
                  ? "text-emerald-400"
                  : log.includes("Error")
                  ? "text-rose-400"
                  : "text-stone-400"
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Guide Note */}
      <div className="mt-4 flex gap-1.5 items-start text-[10px] text-stone-500">
        <AlertCircle className="w-3.5 h-3.5 text-stone-600 flex-shrink-0 mt-0.5" />
        <p className="leading-normal">
          Hover and move your cursor slowly over the code to polish it and wipe away the grey dust layer. Polished files gain an atmospheric golden glow.
        </p>
      </div>
    </div>
  );
}
