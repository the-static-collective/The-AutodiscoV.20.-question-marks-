import React, { useState, useEffect } from "react";
import { Sparkles, Radio, MessageSquare, Volume2, ShieldAlert, ArrowUpRight, Compass, LayoutDashboard, Disc, Leaf } from "lucide-react";
import { FileEntry, Fossil, RadioMessage, LoopIt, LoopLifecycleState } from "./types";
import UptimeMonitor from "./components/UptimeMonitor";
import PoeticSandbox from "./components/PoeticSandbox";
import SqueezePanel from "./components/SqueezePanel";
import MemoryMap from "./components/MemoryMap";
import CommitTimeline from "./components/CommitTimeline";
import ProtocolPanel from "./components/ProtocolPanel";
import AlbumCompanion from "./components/AlbumCompanion";
import DigestiveLifecycle from "./components/DigestiveLifecycle";
import NetworkTheatre from "./components/NetworkTheatre";
import PodcastWidget from "./components/PodcastWidget";
import TranslationGreenhouse from "./components/TranslationGreenhouse";

export default function App() {
  // Shared States
  const [serverLoad, setServerLoad] = useState<number>(15);
  const [lemonScent, setLemonScent] = useState<number>(40);
  const [activeFileId, setActiveFileId] = useState<string>("f1");
  const [fossils, setFossils] = useState<Fossil[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<"gardener" | "companion" | "greenhouse">("companion");

  // LoopIts state initialized with rich seeded lifecycle items
  const [loops, setLoops] = useState<LoopIt[]>([
    {
      id: "seed_1",
      trackId: "t1",
      title: "Porch light flicker cadence",
      observation: "Observed light pulsing at exactly 120 beats per minute, harmonizing with the kettle whistle in the kitchen. Hand-recorded, non-digitized.",
      lifecycle: "LOOP_HELD",
      timestamp: "3:05 AM",
      signer: "Local Witness (Private)",
      retentionDays: 30,
      isPrivate: true,
      history: ["[3:05 AM] Ingested. Held in Spoon Mode privately."]
    },
    {
      id: "seed_2",
      trackId: "t5",
      title: "Shattered memory shard trace",
      observation: "Shattered variables from the last sudden system crash. Too hard to digest or compost immediately, keeping as a raw crystalline stone.",
      lifecycle: "LOOP_HELD",
      timestamp: "3:10 AM",
      signer: "Peer Node Key 0x2A1F",
      retentionDays: 90,
      isPrivate: false,
      history: ["[3:10 AM] Raw crash data ingested. Moved to non-digestible HELD state to avoid automatic indexing."]
    },
    {
      id: "seed_3",
      trackId: "t7",
      title: "Shared table cup alignment",
      observation: "Alignment of coffee cups on the shared wood table. Checked and verified by 3 adjacent peers.",
      lifecycle: "LOOP_ANALYZED",
      timestamp: "2:55 AM",
      signer: "Peer Node Key 0x2A1F",
      retentionDays: 14,
      isPrivate: false,
      history: ["[2:55 AM] Ingested.", "[2:58 AM] Consensus verified. Upgraded to ANALYZED."]
    },
    {
      id: "seed_4",
      trackId: "t8",
      title: "Redacted visitor signature",
      observation: "Media item with expired consent. Erased fully.",
      lifecycle: "LOOP_REDACTED",
      timestamp: "2:40 AM",
      signer: "Redacted Peer Node",
      retentionDays: 0,
      isPrivate: false,
      history: ["[2:40 AM] Ingested.", "[2:45 AM] Access withdrawn. Original data payload erased."]
    }
  ]);

  // Initial Poetic Code Files
  const [files, setFiles] = useState<FileEntry[]>([
    {
      id: "f1",
      name: "UptimeMonitor.v",
      content: `// The Voltage Remembers The Peach
// E major Open Tuning chord synthesis definition
import { voltScale, openE } from "grid-grid";

function monitorGridHealth() {
  const currentVoltage = voltScale.readBusLine("A4");
  
  if (currentVoltage === 0) {
    // The voltage remembers the peach even when the grid fails
    return openE.harmonicProfile("peach-glow");
  }
  
  return openE.drone({
    grit: serverThirst.toSaturation(),
    sparkle: lemonScent.toHarmonics(),
    lfoCutoff: systemQuiet.corners()
  });
}`,
      dust: 45,
      isPolished: false,
    },
    {
      id: "f2",
      name: "GraceLogic.grace",
      content: `// Grace Asynchronous Logic Gates
// Priority for System Peace over Speed

async function awaitGraceData(sourceStream) {
  const data = await sourceStream.pullRaw();
  
  // Mandatory Stillness period
  // Even if ready, code "sits low" and "leans in"
  const quietCorners = await system.detectQuietCorners();
  
  if (!quietCorners.isQuiet) {
    await system.stillnessPeriod({
      durationSeconds: 3.5,
      attitude: "fierce-and-steady"
    });
  }
  
  return data.digest();
}`,
      dust: 80,
      isPolished: false,
    },
    {
      id: "f3",
      name: "FossilMemory.pit",
      content: `// Peach Pit Garbage Collection
// Memory layout as a historic landscape

function garbageCollect(memoryMap) {
  const deadObjects = memoryMap.filter(obj => !obj.isReferenced);
  
  deadObjects.forEach(obj => {
    // Crystallize instead of deleting!
    const pit = FossilMemory.crystallize(obj);
    gridSector.cement(pit);
    
    // Future allocations must flow around the pits
    newAllocations.pathfindAround(pit);
  });
  
  return "Enoughness";
}`,
      dust: 12,
      isPolished: false,
    },
  ]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Computing stats
  const averageDust = Math.round(files.reduce((acc, f) => acc + f.dust, 0) / files.length);
  const polishedCount = files.filter((f) => f.dust === 0).length;

  // Radio dialogue feed
  const [djMessages, setDjMessages] = useState<RadioMessage[]>([
    {
      id: "m0",
      timestamp: "3:01 AM",
      sender: "system",
      text: "The Autodisco broadcast channel initiated.",
    },
    {
      id: "m1",
      timestamp: "3:02 AM",
      sender: "dj",
      text: "Hello, traveler. You're tuned into the low-frequency drone. It's 3 AM. Polish some files, squeeze a lemon, let your code sit low, and see if the voltage remembers the peach...",
    },
  ]);
  const [djInput, setDjInput] = useState("");
  const [djLoading, setDjLoading] = useState(false);

  // Trigger global allocation function (used inside sandbox)
  const triggerMemoryAllocation = (name: string, size: number) => {
    if ((window as any).triggerMemoryAllocation) {
      (window as any).triggerMemoryAllocation(name, size);
    }
  };

  // DJ Broadcaster service caller
  const triggerDjSpeech = async (action: string) => {
    setDjLoading(true);
    try {
      const response = await fetch("/api/radio/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAction: action,
          codeSnippet: activeFile.content,
          dustLevel: averageDust,
          history: djMessages.slice(-3).map((m) => m.text),
        }),
      });

      const data = await response.json();
      const newMsg: RadioMessage = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: "dj",
        text: data.text,
      };
      setDjMessages((prev) => [...prev, newMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setDjLoading(false);
    }
  };

  // Helper to add a message manually or from components
  const addRadioMessage = (text: string) => {
    const newMsg: RadioMessage = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "dj",
      text: text,
    };
    setDjMessages((prev) => [...prev, newMsg]);
  };

  const handleMetricClick = (metricName: "loopCount" | "dustLevel" | "fossilCount" | "lemonScent" | "serverLoad") => {
    setActiveWorkspace("greenhouse");
    addRadioMessage(`🔍 Ref Segment Trace: Opening the Translation Greenhouse and Proof Browser to audit the dual provenance of "${metricName}".`);
    
    // Dispatch global event for instant focus in the Proof Browser
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus-proof-metric", { detail: metricName }));
    }, 50);
  };

  // Periodically prompt DJ feedback based on dust or load
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerDjSpeech("gently watching the room");
    }, 15000); // 15 seconds after initial render

    return () => clearTimeout(timer);
  }, []);

  const handleDjRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!djInput.trim() || djLoading) return;

    const userText = djInput;
    setDjInput("");

    // Add user message to log
    const userMsg: RadioMessage = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "system",
      text: `Traveler: ${userText}`,
    };
    setDjMessages((prev) => [...prev, userMsg]);

    setDjLoading(true);
    try {
      const response = await fetch("/api/radio/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAction: `responding to traveler query: "${userText}"`,
          codeSnippet: activeFile.content,
          dustLevel: averageDust,
          history: djMessages.slice(-3).map((m) => m.text),
        }),
      });

      const data = await response.json();
      const djMsg: RadioMessage = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: "dj",
        text: data.text,
      };
      setDjMessages((prev) => [...prev, djMsg]);
    } catch (e) {
      console.error(e);
      addRadioMessage("The radio wave broke. Only white noise responds.");
    } finally {
      setDjLoading(false);
    }
  };

  // Loop handlers
  const handleAddLoopIt = (newLoop: LoopIt) => {
    setLoops((prev) => [newLoop, ...prev]);
  };

  const handleUpdateLoop = (
    loopId: string,
    newState: LoopLifecycleState,
    actionLog: string
  ) => {
    setLoops((prev) =>
      prev.map((l) =>
        l.id === loopId
          ? {
              ...l,
              lifecycle: newState,
              history: [...l.history, actionLog],
            }
          : l
      )
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header/Banner Area */}
      <header className="border-b border-stone-900 bg-stone-900/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Radio className="w-5 h-5 text-orange-400 animate-pulse" />
              <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-sm scale-150 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-medium text-stone-100 tracking-tight text-sm flex items-center gap-1.5">
                The Autodisco
                <span className="text-[10px] font-mono font-normal text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-800/40">
                  VOLTAGE & PEACH
                </span>
              </h1>
              <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mt-0.5">
                Procedural Software Studio • 3:00 AM
              </p>
            </div>
          </div>

          {/* Daily Podcast Player Widget */}
          <PodcastWidget
            dustLevel={averageDust}
            loopCount={loops.length}
            fossilCount={fossils.length}
            lemonScent={lemonScent}
            serverLoad={serverLoad}
            activeFileName={activeFile.name}
            onDjMessage={addRadioMessage}
            onMetricClick={handleMetricClick}
          />

          {/* Core Workspace Switcher */}
          <div className="flex items-center bg-stone-950 border border-stone-850 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveWorkspace("companion")}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeWorkspace === "companion"
                  ? "bg-stone-900 text-orange-400 border border-stone-800"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <Disc className="w-3.5 h-3.5" /> Album Companion
            </button>
            <button
              onClick={() => setActiveWorkspace("gardener")}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeWorkspace === "gardener"
                  ? "bg-stone-900 text-orange-400 border border-stone-800"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Gardener Surface
            </button>
            <button
              onClick={() => setActiveWorkspace("greenhouse")}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeWorkspace === "greenhouse"
                  ? "bg-stone-900 text-orange-400 border border-stone-800"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <Leaf className="w-3.5 h-3.5" /> Translation Greenhouse
            </button>
          </div>

          {/* Quick global statistics ticker */}
          <div className="hidden md:flex items-center gap-6 font-mono text-[10px] text-stone-400">
            <div className="flex items-center gap-2 border-r border-stone-800 pr-6">
              <span className="text-stone-500">AVG DUST:</span>
              <span className={`font-bold ${averageDust > 50 ? 'text-amber-500' : 'text-stone-300'}`}>
                {averageDust}%
              </span>
            </div>
            <div className="flex items-center gap-2 border-r border-stone-800 pr-6">
              <span className="text-stone-500">SHINED:</span>
              <span className={`font-bold ${polishedCount > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
                {polishedCount} files
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-500">FOSSILS:</span>
              <span className="font-bold text-rose-400">{fossils.length} pits</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Top Feature: The Sovereign Scribe DJ Ticker & Microphone Input */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 relative overflow-hidden group">
          {/* Radial amber backdrop */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

          <div className="flex items-start gap-4 flex-1 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-orange-950/40 border border-orange-800/60 flex items-center justify-center flex-shrink-0 text-orange-400">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-sans font-bold text-stone-200 text-xs">The Sovereign Scribe DJ</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">Live Broadcast</span>
              </div>

              {/* Speech message scrolling ticker */}
              <div className="max-h-20 overflow-y-auto pr-2 space-y-2">
                {djMessages.slice(-2).map((msg, index) => (
                  <p
                    key={msg.id}
                    className={`font-sans text-xs leading-relaxed ${
                      msg.sender === "dj"
                        ? "text-orange-300 italic font-medium pl-3 border-l border-orange-800/60"
                        : "text-stone-400 pl-3 border-l border-stone-800"
                    }`}
                  >
                    {msg.text}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Quick talk feedback controls */}
          <form
            onSubmit={handleDjRequest}
            className="flex items-center gap-2 lg:w-96 flex-shrink-0 relative z-10"
          >
            <input
              type="text"
              value={djInput}
              onChange={(e) => setDjInput(e.target.value)}
              placeholder="Ask the Scribe a philosophical question..."
              className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-sans text-stone-300 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              disabled={djLoading}
            />
            <button
              type="submit"
              disabled={djLoading}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-sans font-medium flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
            >
              Talk <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* WORKSPACE CONTENT ROUTING */}
        {activeWorkspace === "companion" ? (
          /* Public Companion view */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12">
                <AlbumCompanion
                  onDjMessage={addRadioMessage}
                  onAddLoopIt={handleAddLoopIt}
                />
              </div>

              <div className="lg:col-span-7 h-full">
                <DigestiveLifecycle
                  onDjMessage={addRadioMessage}
                  loops={loops}
                  onUpdateLoop={handleUpdateLoop}
                />
              </div>

              <div className="lg:col-span-5 h-full">
                <NetworkTheatre onDjMessage={addRadioMessage} />
              </div>
            </div>
          </div>
        ) : activeWorkspace === "greenhouse" ? (
          /* Translation Greenhouse & Proof Browser */
          <TranslationGreenhouse
            dustLevel={averageDust}
            loopCount={loops.length}
            fossilCount={fossils.length}
            lemonScent={lemonScent}
            serverLoad={serverLoad}
            activeFileName={activeFile?.name || "none"}
            onDjMessage={addRadioMessage}
          />
        ) : (
          /* Authenticated Gardener surface */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Box 1: The "Open E" Uptime drone synth */}
            <div className="lg:col-span-1 h-full">
              <UptimeMonitor
                serverLoad={serverLoad}
                setServerLoad={setServerLoad}
                lemonScent={lemonScent}
                setLemonScent={setLemonScent}
                isQuiet={averageDust > 50} // quietness depends on dust/neglect of files
                onDjMessage={addRadioMessage}
              />
            </div>

            {/* Box 2: Poetic Sandbox and Code editor */}
            <div className="md:col-span-2 lg:col-span-2 h-full">
              <PoeticSandbox
                files={files}
                setFiles={setFiles}
                activeFileId={activeFileId}
                setActiveFileId={setActiveFileId}
                onDjMessage={addRadioMessage}
                triggerMemoryAllocation={triggerMemoryAllocation}
              />
            </div>

            {/* Box 3: Fossil Memory Map (Peach Pit GC) */}
            <div className="lg:col-span-1 h-full">
              <MemoryMap
                onDjMessage={addRadioMessage}
                fossils={fossils}
                setFossils={setFossils}
              />
            </div>

            {/* Box 4: The "Squeeze It" API Lemon */}
            <div className="lg:col-span-1 h-full">
              <SqueezePanel
                onDjMessage={addRadioMessage}
                setLemonScent={lemonScent => {
                  setLemonScent(lemonScent);
                  // Slightly refresh server load on squeeze too
                  setServerLoad(l => Math.max(10, l - 3));
                }}
                setServerLoad={setServerLoad}
              />
            </div>

            {/* Box 5: Notebook Batman git history */}
            <div className="lg:col-span-1 h-full">
              <CommitTimeline onDjMessage={addRadioMessage} />
            </div>

            {/* Box 6: Finalizers and emergency restart (Smoke sunset & Crash) */}
            <div className="md:col-span-2 lg:col-span-3 h-full">
              <ProtocolPanel
                onDjMessage={addRadioMessage}
                fossilCount={fossils.length}
                polishedCount={polishedCount}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Global Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-stone-600">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>AUTHENTIC ANTIMODERN SOFTWARE • METAPHOR DESIGN INC.</span>
          </div>
          <p className="text-[10px] font-mono text-stone-500">
            "What looked like waiting was a holy way."
          </p>
        </div>
      </footer>
    </div>
  );
}

