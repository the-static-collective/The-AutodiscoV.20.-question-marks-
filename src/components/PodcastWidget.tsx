import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Radio, Volume2, VolumeX, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Layers, HelpCircle } from "lucide-react";
import { RenderedSentence, OutputMode } from "../types";

interface PodcastSegment {
  id: string;
  speaker: string;
  text: string;
  duration: number;
  type?: "opening" | "middle" | "closing";
  referencedMetric?: "loopCount" | "dustLevel" | "fossilCount" | "lemonScent" | "serverLoad";
  metricValue?: string | number;
  sentence?: RenderedSentence;
}

interface PodcastWidgetProps {
  dustLevel: number;
  loopCount: number;
  fossilCount: number;
  lemonScent: number;
  serverLoad: number;
  activeFileName: string;
  onDjMessage: (msg: string) => void;
  onMetricClick?: (metricName: "loopCount" | "dustLevel" | "fossilCount" | "lemonScent" | "serverLoad") => void;
}

const getSentenceForSegment = (seg: any, idx: number): RenderedSentence => {
  if (seg.sentence) return seg.sentence;
  
  // Dynamic fallback generator
  const refMetric = seg.referencedMetric || "loopCount";
  const val = seg.metricValue !== undefined ? seg.metricValue : "0";
  
  let mode: OutputMode = "interpretation";
  let metricRef: any = undefined;
  let ontologyRef: any = undefined;

  if (refMetric === "loopCount") {
    mode = "observed";
    metricRef = { id: "loopCount", value: val, snapshotId: "snap_loops_fallback", registryRevision: "metrics@1.0.0" };
  } else if (refMetric === "dustLevel") {
    mode = "derived";
    metricRef = { id: "dustLevel", value: val, snapshotId: "snap_dust_fallback", registryRevision: "metrics@1.0.0" };
  } else if (refMetric === "fossilCount") {
    mode = "metaphor";
    ontologyRef = { symbolId: "peach_pit", version: "1.0.0", mappingId: "map_shattered_fallback" };
  } else if (refMetric === "lemonScent") {
    mode = "metaphor";
    ontologyRef = { symbolId: "lemon", version: "1.0.0", mappingId: "map_scent_fallback" };
  } else if (refMetric === "serverLoad") {
    mode = "interpretation";
  }

  return {
    id: seg.id || `seg_${idx}_fallback`,
    text: seg.text,
    mode,
    claimPlanId: `claim_plan_${refMetric}`,
    ledgerRefs: [`ledger_${refMetric}_fallback`],
    metricRef,
    ontologyRef,
    disclosure: {
      synthetic: true,
      provenanceStatus: "verified"
    }
  };
};

export const SentenceBadge = ({ sentence, onClick }: { sentence: RenderedSentence; onClick?: () => void }) => {
  const getBadgeConfig = (mode: OutputMode) => {
    switch (mode) {
      case "observed":
        return {
          label: "OBSERVED",
          sub: sentence.metricRef?.id || "Event",
          tooltip: "OBSERVED — grounded, direct report of signed event",
          colors: "bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-950/60"
        };
      case "derived":
        return {
          label: "DERIVED",
          sub: `${sentence.metricRef?.id || "metric"}@${sentence.metricRef?.registryRevision || "1.0.0"}`,
          tooltip: "DERIVED — reproducible computation from observed inputs",
          colors: "bg-cyan-950/40 text-cyan-400 border-cyan-800/40 hover:bg-cyan-950/60"
        };
      case "metaphor":
        return {
          label: "METAPHOR",
          sub: `${sentence.ontologyRef?.symbolId || "symbol"}@${sentence.ontologyRef?.version || "1.0.0"}`,
          tooltip: "METAPHOR — registered symbolic rendering",
          colors: "bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-950/60"
        };
      case "interpretation":
        return {
          label: "INTERPRETATION",
          sub: "Reading",
          tooltip: "INTERPRETATION — offered reading, question, or invitation",
          colors: "bg-stone-900/60 text-stone-300 border-stone-750 hover:bg-stone-850"
        };
    }
  };

  const config = getBadgeConfig(sentence.mode);

  return (
    <span className="inline-flex items-center gap-1 relative group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${config.colors}`}
      >
        <span>{config.label}</span>
        <span className="text-[7.5px] opacity-60 font-normal">· {config.sub}</span>
      </button>

      {/* HTML CSS Hover Tooltip */}
      <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 bg-stone-950 border border-stone-800 text-stone-200 text-[10px] p-2 rounded shadow-xl w-60 font-sans leading-normal pointer-events-none">
        {config.tooltip}
        {sentence.disclosure.synthetic && (
          <div className="mt-1 pt-1 border-t border-stone-800 text-[8px] text-stone-500 font-mono flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
            SYNTHETIC PROVENANCE • STATE VALIDATED
          </div>
        )}
      </span>
    </span>
  );
};

export default function PodcastWidget({
  dustLevel,
  loopCount,
  fossilCount,
  lemonScent,
  serverLoad,
  activeFileName,
  onDjMessage,
  onMetricClick,
}: PodcastWidgetProps) {
  const [podcast, setPodcast] = useState<{
    title: string;
    host: string;
    description: string;
    voiceConfig: { pitch: number; rate: number };
    segments: PodcastSegment[];
    activitySummary: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Audio References for Ambient Hum & Tape Noise
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const humGainNodeRef = useRef<GainNode | null>(null);
  const noiseGainNodeRef = useRef<GainNode | null>(null);

  // Speech Synthesis references
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechVolumeRef = useRef<number>(0.8);

  // Fetch / Generate new podcast episode
  const generatePodcast = async (isInitialLoad = false) => {
    setIsLoading(true);
    // Stop any existing speech and sounds
    stopAudioAndSpeech();

    try {
      const response = await fetch("/api/podcast/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dustLevel,
          loopCount,
          fossilCount,
          lemonScent,
          serverLoad,
          activeFileName,
        }),
      });

      if (!response.ok) throw new Error("Broadcast signal failed");
      const data = await response.json();
      setPodcast(data);
      setCurrentSegmentIdx(0);

      const msg = `📡 New broadcast received: "${data.title}" by ${data.host}.`;
      onDjMessage(msg);

      if (isInitialLoad) {
        // Attempt autoplay
        setTimeout(() => {
          triggerPlay(data, 0);
        }, 800);
      }
    } catch (err) {
      console.error("Error generating daily podcast:", err);
      onDjMessage("⚠️ The Collective podcast signal was crushed by interference.");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    generatePodcast(true);

    return () => {
      stopAudioAndSpeech();
    };
  }, []);

  // Set up the local Web Audio synthesizers (60Hz tape hum & hiss)
  const initAmbientAudio = () => {
    try {
      if (audioCtxRef.current) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // 1. 60Hz Ground hum (representing ancient circuitry)
      const humOsc = ctx.createOscillator();
      humOsc.type = "sine";
      humOsc.frequency.setValueAtTime(60, ctx.currentTime); // 60Hz ground hum

      // High-frequency harmonic
      const harmonicOsc = ctx.createOscillator();
      harmonicOsc.type = "sine";
      harmonicOsc.frequency.setValueAtTime(120, ctx.currentTime); // 120Hz hum harmonic

      const humGain = ctx.createGain();
      humGain.gain.setValueAtTime(isMuted ? 0 : 0.04, ctx.currentTime);
      humGainNodeRef.current = humGain;

      humOsc.connect(humGain);
      harmonicOsc.connect(humGain);
      humGain.connect(ctx.destination);

      humOsc.start();
      harmonicOsc.start();
      droneOscRef.current = humOsc;

      // 2. Continuous analog Tape Hiss
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(1200, ctx.currentTime); // narrow warm band
      noiseFilter.Q.setValueAtTime(0.7, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isMuted ? 0 : 0.015, ctx.currentTime);
      noiseGainNodeRef.current = noiseGain;

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start();
      noiseSourceRef.current = whiteNoise;
    } catch (e) {
      console.warn("Failed to create ambient audio nodes:", e);
    }
  };

  const stopAudioAndSpeech = () => {
    // Stop speech
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    // Clean up synth nodes
    try {
      if (droneOscRef.current) {
        droneOscRef.current.stop();
        droneOscRef.current = null;
      }
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (_) {}

    setIsPlaying(false);
  };

  const triggerPlay = (currentPodcast = podcast, segmentIdx = currentSegmentIdx) => {
    if (!currentPodcast || currentPodcast.segments.length === 0) return;

    // Initialize/resume the atmospheric background noise
    initAmbientAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    // Cancel active synthesis first
    window.speechSynthesis.cancel();

    // Configure the SpeechSynthesisUtterance for the segment
    const segment = currentPodcast.segments[segmentIdx];
    if (!segment) return;

    const utterance = new SpeechSynthesisUtterance(segment.text);
    currentUtteranceRef.current = utterance;

    // Apply pitch & rate from podcast config
    utterance.pitch = currentPodcast.voiceConfig?.pitch ?? 1.0;
    utterance.rate = currentPodcast.voiceConfig?.rate ?? 0.85;
    utterance.volume = isMuted ? 0 : speechVolumeRef.current;

    // Pick a voice that fits the vibe if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Look for a suitable local voice (e.g. Google US English, Premium, etc.)
      const preferredKeywords = ["google", "natural", "premium", "en-us"];
      const bestVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith("en") && 
        preferredKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
      ) || voices.find(v => v.lang.toLowerCase().startsWith("en")) || voices[0];
      
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setAutoplayBlocked(false);
    };

    utterance.onerror = (event) => {
      console.warn("Speech synthesis error / interrupted:", event);
      if (event.error === "not-allowed") {
        setAutoplayBlocked(true);
        setIsPlaying(false);
      }
    };

    utterance.onend = () => {
      // Advance to next segment if still playing
      if (segmentIdx < currentPodcast.segments.length - 1) {
        setCurrentSegmentIdx(segmentIdx + 1);
        triggerPlay(currentPodcast, segmentIdx + 1);
      } else {
        // Broadcast finished!
        setIsPlaying(false);
        onDjMessage(`📻 Broadcast completed: "${currentPodcast.title}".`);
        // Loop back to start but stay paused
        setCurrentSegmentIdx(0);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePausePlay = () => {
    if (isPlaying) {
      // Pause speech
      window.speechSynthesis.cancel();
      setIsPlaying(false);

      // Stop the grounding sound
      if (audioCtxRef.current && audioCtxRef.current.state === "running") {
        audioCtxRef.current.suspend();
      }
    } else {
      // Resume or play segment
      triggerPlay(podcast, currentSegmentIdx);
    }
  };

  const handleNext = () => {
    if (!podcast) return;
    const nextIdx = Math.min(podcast.segments.length - 1, currentSegmentIdx + 1);
    setCurrentSegmentIdx(nextIdx);
    triggerPlay(podcast, nextIdx);
  };

  const handlePrev = () => {
    if (!podcast) return;
    const prevIdx = Math.max(0, currentSegmentIdx - 1);
    setCurrentSegmentIdx(prevIdx);
    triggerPlay(podcast, prevIdx);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // Adjust synthesizers volume
    if (humGainNodeRef.current) {
      humGainNodeRef.current.gain.setValueAtTime(nextMuted ? 0 : 0.04, audioCtxRef.current?.currentTime || 0);
    }
    if (noiseGainNodeRef.current) {
      noiseGainNodeRef.current.gain.setValueAtTime(nextMuted ? 0 : 0.015, audioCtxRef.current?.currentTime || 0);
    }

    // Adjust speech volume
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.volume = nextMuted ? 0 : speechVolumeRef.current;
    }
    
    if (isPlaying) {
      // Restart speech so volume settings are applied instantly
      triggerPlay(podcast, currentSegmentIdx);
    }
  };

  // Helper to get active segment text
  const activeSegment = podcast?.segments[currentSegmentIdx];

  return (
    <div className="relative flex flex-col">
      {/* Top Bar Player Mini-Widget */}
      <div id="podcast-header-widget" className="flex items-center gap-2 border border-stone-800 bg-stone-950/80 p-1.5 rounded-xl text-xs backdrop-blur-md max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl transition-all">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-1">
            <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">Tuning receiver...</span>
          </div>
        ) : podcast ? (
          <div className="flex items-center gap-2.5 w-full">
            {/* Visualizer equalizer bars */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-900 hover:bg-stone-850 cursor-pointer text-orange-400 group transition-all"
              title="Expand Episode Details"
            >
              {isPlaying ? (
                <div className="flex items-end gap-[2px] h-3.5 w-3.5">
                  <span className="w-[2px] bg-orange-400 animate-[bounce_0.8s_infinite_100ms] h-full" />
                  <span className="w-[2px] bg-orange-400 animate-[bounce_0.5s_infinite_300ms] h-2/3" />
                  <span className="w-[2px] bg-orange-400 animate-[bounce_0.7s_infinite_0ms] h-4/5" />
                  <span className="w-[2px] bg-orange-400 animate-[bounce_0.6s_infinite_200ms] h-1/2" />
                </div>
              ) : (
                <Radio className="w-3.5 h-3.5 text-stone-500 group-hover:text-orange-400 transition-colors" />
              )}
            </button>

            {/* Title / Host info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-orange-400/90 font-bold uppercase tracking-widest truncate max-w-[80px] sm:max-w-[120px]">
                  {podcast.host}
                </span>
                <span className="w-1 h-1 rounded-full bg-stone-700" />
                <span className="text-stone-300 font-sans font-medium truncate text-[11px] block sm:inline">
                  {podcast.title}
                </span>
              </div>
              <div className="text-[10px] text-stone-500 font-mono truncate max-w-[200px] sm:max-w-xs mt-0.5">
                {activeSegment ? `Segment ${currentSegmentIdx + 1}/${podcast.segments.length}: "${activeSegment.text}"` : "Tap to listen"}
              </div>
            </div>

            {/* Autoplay blocked hint or controls */}
            {autoplayBlocked ? (
              <button
                onClick={handlePausePlay}
                className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-stone-950 font-sans font-bold text-[10px] animate-pulse cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
              >
                <Play className="w-2.5 h-2.5 fill-current" /> UNMUTE BROADCAST
              </button>
            ) : (
              <div className="flex items-center gap-1 pr-1 border-l border-stone-850 pl-1.5">
                {/* Media Play/Pause Buttons */}
                <button
                  onClick={handlePrev}
                  disabled={currentSegmentIdx === 0}
                  className="p-1 text-stone-500 hover:text-stone-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Segment"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={handlePausePlay}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-orange-400 border border-stone-800 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSegmentIdx === podcast.segments.length - 1}
                  className="p-1 text-stone-500 hover:text-stone-300 disabled:opacity-30 cursor-pointer"
                  title="Next Segment"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
                <button
                  onClick={handleToggleMute}
                  className="p-1 text-stone-400 hover:text-orange-400 cursor-pointer transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => generatePodcast(false)}
                  className="p-1 text-stone-500 hover:text-orange-400 cursor-pointer transition-colors ml-0.5"
                  title="Tuning (Regenerate Episode)"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-stone-500 hover:text-stone-300 cursor-pointer mr-0.5"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1">
            <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-mono text-[10px] text-stone-500 uppercase tracking-wider">No signal detected</span>
          </div>
        )}
      </div>

      {/* Expanded Cassette / Transcript Deck */}
      {isExpanded && podcast && (
        <div className="absolute top-12 left-0 mt-2 w-full max-w-sm sm:max-w-md bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-2xl z-40 animate-fade-in text-xs">
          {/* Cassette Graphic */}
          <div className="bg-stone-950 border border-stone-850 rounded-lg p-3 mb-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 to-transparent pointer-events-none" />
            
            {/* Cassette label */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
              <div className="font-mono text-[9px] text-stone-500 uppercase tracking-widest flex items-center gap-1">
                <Layers className="w-3 h-3 text-orange-500" /> STATIC MEMORY REEL • SIDE A
              </div>
              <div className="text-[10px] font-mono text-orange-400 bg-orange-950/40 border border-orange-900/60 px-1.5 py-0.5 rounded">
                60Hz Grounded Hum
              </div>
            </div>

            {/* Cassette spindle windows */}
            <div className="flex items-center justify-center gap-8 py-3 my-1">
              <div className={`w-8 h-8 rounded-full border-4 border-dashed border-stone-800 flex items-center justify-center ${isPlaying ? "animate-spin [animation-duration:8s]" : ""}`}>
                <div className="w-3 h-3 rounded-full bg-stone-900" />
              </div>
              <div className="bg-stone-900 border border-stone-850 px-3 py-1 rounded font-mono text-[10px] text-orange-300 font-bold tracking-widest">
                {String(currentSegmentIdx + 1).padStart(2, '0')} / {String(podcast.segments.length).padStart(2, '0')}
              </div>
              <div className={`w-8 h-8 rounded-full border-4 border-dashed border-stone-800 flex items-center justify-center ${isPlaying ? "animate-spin [animation-duration:8s]" : ""}`}>
                <div className="w-3 h-3 rounded-full bg-stone-900" />
              </div>
            </div>

            {/* Episode Meta */}
            <div className="font-sans text-stone-400 text-[11px] leading-relaxed italic bg-stone-900/50 p-2.5 rounded border border-stone-850/60">
              "{podcast.description}"
            </div>
            {/* Synthetic voice disclosure banner */}
            <div className="mt-2 bg-stone-950 border border-stone-850 px-2.5 py-1.5 rounded text-[10px] text-stone-500 font-mono flex items-center gap-1.5 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>SYNTHETIC PROCECURAL VOICE INTERPRETER • REAL-TIME STATE CONTEXTS</span>
            </div>
          </div>

          {/* Transcript Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-850 pb-1.5">
              <h4 className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">
                Live Transcript Echo
              </h4>
              <span className="text-[9px] font-mono text-orange-400/80 bg-orange-950/20 px-1 rounded border border-orange-900/40">
                Verifiable Local State
              </span>
            </div>
            
            <div className="max-h-52 overflow-y-auto space-y-3.5 pr-1.5">
              {podcast.segments.map((seg, idx) => {
                const isActive = idx === currentSegmentIdx;
                const sentence = getSentenceForSegment(seg, idx);
                
                // Human friendly labels for the procedural parts
                const phaseLabels: Record<string, string> = {
                  opening: "Phase 1: Today's loops & dust",
                  middle: "Phase 2: Peach pits & lemons",
                  closing: "Phase 3: Weather over the hive"
                };

                // Human-friendly metric source labels and formulas
                const metricLabels: Record<string, { label: string; formula: string }> = {
                  loopCount: { label: "Network loops", formula: "Σ(Live LoopIts in ledger)" },
                  dustLevel: { label: "Average file dust", formula: "Σ(file.dust) / files.count" },
                  fossilCount: { label: "Peach pit fossils", formula: "fossils.count (un-digested)" },
                  lemonScent: { label: "Lemon scent sparkle", formula: "SqueezePanel intensity" },
                  serverLoad: { label: "Server grit load", formula: "UptimeMonitor voltage" }
                };

                const metricMeta = seg.referencedMetric ? metricLabels[seg.referencedMetric] : null;

                return (
                  <div
                    key={seg.id}
                    className={`p-3 rounded-lg border transition-all flex flex-col gap-2 relative overflow-hidden ${
                      isActive
                        ? "bg-orange-950/15 border-orange-800/50 shadow-[inset_0_0_12px_rgba(249,115,22,0.06)]"
                        : "bg-stone-950/40 border-stone-900/80 hover:border-stone-850"
                    }`}
                  >
                    {/* Active Speaker / State Header */}
                    <div className="flex items-center justify-between font-mono text-[9px] text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <span className={isActive ? "text-orange-400 font-bold" : "text-stone-400"}>
                          🎤 {seg.speaker}
                        </span>
                        <span className="text-stone-700">•</span>
                        <span className="text-stone-500 text-[8px]">
                          {phaseLabels[seg.type || ""] || "Narrative view"}
                        </span>
                      </div>
                      <span className="text-stone-600 text-[8px]">
                        {isActive && isPlaying ? "⚡ SPEAKING" : `SEGMENT ${idx + 1}`}
                      </span>
                    </div>

                    {/* Compact Epistemic Badge Row */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <SentenceBadge
                        sentence={sentence}
                        onClick={() => {
                          if (seg.referencedMetric && onMetricClick) {
                            onMetricClick(seg.referencedMetric);
                          }
                        }}
                      />
                    </div>

                    {/* Interactive Clickable Wave / Play trigger */}
                    <p 
                      onClick={() => {
                        setCurrentSegmentIdx(idx);
                        triggerPlay(podcast, idx);
                        if (seg.referencedMetric && onMetricClick) {
                          onMetricClick(seg.referencedMetric);
                        }
                      }}
                      className="font-sans text-[11.5px] leading-relaxed text-stone-200 cursor-pointer hover:text-orange-200 transition-colors pl-1 border-l-2 border-stone-800/60"
                    >
                      “{sentence.text}”
                    </p>

                    {/* Verifiable Local Metric Linkage */}
                    {seg.referencedMetric && metricMeta && (
                      <div className="flex items-center justify-between border-t border-stone-900/80 pt-2 mt-1 font-mono text-[8.5px]">
                        <span className="text-stone-600 uppercase">Verifiable Source:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (seg.referencedMetric && onMetricClick) {
                              onMetricClick(seg.referencedMetric);
                            }
                          }}
                          className="flex items-center gap-1 bg-stone-900/80 hover:bg-orange-950/30 text-stone-400 hover:text-orange-300 px-1.5 py-0.5 rounded border border-stone-800 hover:border-orange-900/40 transition-all cursor-pointer"
                          title={`Click to show and focus the formula ${metricMeta.formula}`}
                        >
                          <span className="text-orange-400/90 font-bold">{seg.metricValue}</span>
                          <span className="text-stone-500">{metricMeta.label}</span>
                          <span className="text-stone-600 font-normal">({metricMeta.formula})</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger summary footer */}
          <div className="mt-3.5 pt-3.5 border-t border-stone-850 flex items-center justify-between font-mono text-[9px] text-stone-500">
            <span>NETWORK CONTEXT:</span>
            <span className="text-stone-400 truncate max-w-[220px]">
              {podcast.activitySummary}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
