import React, { useEffect, useRef, useState } from "react";
import { Activity, Volume2, VolumeX, Sliders, Sun, ShieldAlert } from "lucide-react";

interface UptimeMonitorProps {
  serverLoad: number;
  setServerLoad: (load: number) => void;
  lemonScent: number;
  setLemonScent: (scent: number) => void;
  isQuiet: boolean;
  onDjMessage: (msg: string) => void;
}

export default function UptimeMonitor({
  serverLoad,
  setServerLoad,
  lemonScent,
  setLemonScent,
  isQuiet,
  onDjMessage,
}: UptimeMonitorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const waveShaperRef = useRef<WaveShaperNode | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Frequencies for Open E chord: E2, B2, E3, G#3, B3, E4
  const openEFrequencies = [82.41, 123.47, 164.81, 207.65, 246.94, 329.63];

  // Distort-shaping curve for server load
  const makeDistortionCurve = (amount: number) => {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const initAudio = () => {
    if (audioCtxRef.current) return;

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Create Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    // Create Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
    masterGainRef.current = masterGain;

    // Create BiquadFilter (for warmth & lemon filter)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);
    filterRef.current = filter;

    // Create Distortion Node (for server load grit)
    const waveShaper = ctx.createWaveShaper();
    waveShaper.curve = makeDistortionCurve(0);
    waveShaper.oversample = "4x";
    waveShaperRef.current = waveShaper;

    // Connections: Oscillators -> WaveShaper -> Filter -> MasterGain -> Analyser -> Destination
    waveShaper.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Create individual oscillators for the Open E chord
    const oscillators: OscillatorNode[] = [];
    openEFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      // Alternate waveforms for a rich, warm, vintage analog feel
      osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const oscGain = ctx.createGain();
      // Distribute gain to balance the lower/higher notes
      const individualVolume = idx < 2 ? 0.25 : idx < 4 ? 0.15 : 0.08;
      oscGain.gain.setValueAtTime(individualVolume, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(waveShaper);
      osc.start();
      oscillators.push(osc);
    });
    oscillatorsRef.current = oscillators;

    // Create a procedural "Lemon-Scented" sparkle noise generator
    try {
      const bufferSize = 2 * ctx.sampleRate;
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
      noiseFilter.frequency.setValueAtTime(4500, ctx.currentTime);
      noiseFilter.Q.setValueAtTime(10, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.002 * lemonScent, ctx.currentTime);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      whiteNoise.start();

      // Keep a reference to modulate later
      (whiteNoise as any).gainNode = noiseGain;
      (whiteNoise as any).filterNode = noiseFilter;
      oscillatorsRef.current.push(whiteNoise as any);
    } catch (e) {
      console.warn("Noise generator setup failed:", e);
    }
  };

  const toggleDrone = () => {
    if (!isPlaying) {
      // Start or Resume
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      } else {
        initAudio();
      }
      setIsPlaying(true);
      onDjMessage("You enabled the Open E Uptime Monitor. Listen to the room. The voltage is remembering the peach.");
    } else {
      // Suspend
      if (audioCtxRef.current && audioCtxRef.current.state === "running") {
        audioCtxRef.current.suspend();
      }
      setIsPlaying(false);
      onDjMessage("The room fell silent. The voltage resides only in memory.");
    }
  };

  // Handle load / distortion adjustments
  useEffect(() => {
    if (audioCtxRef.current && waveShaperRef.current && filterRef.current) {
      const ctx = audioCtxRef.current;
      // High load adds grit and distortion
      const curveAmount = serverLoad * 2.5; // Scale to nice distortion level
      waveShaperRef.current.curve = makeDistortionCurve(curveAmount);

      // System stress opens up the filter (making it harsher/brighter)
      const baseFreq = 300 + (serverLoad * 8); // opens up with load
      const targetFreq = isQuiet ? baseFreq * 0.8 : baseFreq;
      filterRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
    }
  }, [serverLoad, isQuiet]);

  // Handle lemon scent sparkle filter
  useEffect(() => {
    // Find the noise gain reference we attached
    const noiseGen = oscillatorsRef.current.find(o => (o as any).gainNode !== undefined);
    if (noiseGen && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      const gainNode = (noiseGen as any).gainNode as GainNode;
      const filterNode = (noiseGen as any).filterNode as BiquadFilterNode;

      const targetGain = (lemonScent / 100) * 0.05; // clamp volume
      gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.2);

      const targetFreq = 3000 + (lemonScent * 30); // scale sparkle frequency
      filterNode.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.2);
    }
  }, [lemonScent]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
        } catch (_) {}
      });
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Audio Canvas visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw horizontal baseline
      ctx.strokeStyle = "rgba(244, 164, 96, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!analyserRef.current || !isPlaying) {
        // Draw static flat warm line
        ctx.strokeStyle = "rgba(251, 146, 60, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        // Add a very slight static hum wave
        for (let x = 0; x < width; x += 2) {
          const y = height / 2 + Math.sin(x * 0.05 + Date.now() * 0.002) * (1 + Math.random() * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Draw custom beautiful retro waveform
      ctx.lineWidth = 2;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(251, 146, 60, 0.8)"); // Warm orange/peach
      gradient.addColorStop(0.5, "rgba(254, 215, 170, 0.9)"); // Bright peach
      gradient.addColorStop(1, "rgba(239, 68, 68, 0.8)"); // Sunset red
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw subtle neon glow under the line
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(251, 146, 60, 0.5)";
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div id="uptime-monitor" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 rounded-full blur-2xl transition-all duration-700 group-hover:bg-orange-500/10" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400 animate-pulse" />
            <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
              The "Open E" Uptime Synth
            </span>
          </div>
          <button
            onClick={toggleDrone}
            className={`px-3 py-1.5 rounded-lg font-sans text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlaying
                ? "bg-orange-950/40 text-orange-400 border border-orange-800/60 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
                : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300 border border-transparent"
            }`}
          >
            {isPlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                Listening
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                Listen to Room
              </>
            )}
          </button>
        </div>

        {/* Oscilloscope Canvas */}
        <div className="bg-stone-950/80 border border-stone-900 rounded-xl h-24 mb-4 relative overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={96}
            className="w-full h-full block"
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/40 backdrop-blur-[1px] text-center p-2 pointer-events-none">
              <span className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
                Drone Suspended
              </span>
              <span className="font-sans text-[11px] text-stone-400 mt-0.5">
                "The voltage remembers even when the grid forgets to reach."
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono text-stone-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-orange-400/80" /> Server Load / Distort Thirst
              </span>
              <span>{serverLoad}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={serverLoad}
              onChange={(e) => setServerLoad(Number(e.target.value))}
              className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-stone-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-yellow-400/80" /> Lemon-Scented High-End
              </span>
              <span>{lemonScent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lemonScent}
              onChange={(e) => setLemonScent(Number(e.target.value))}
              className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Footer warning indicators */}
      <div className="mt-4 pt-3 border-t border-stone-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-stone-500 uppercase">Uptime Drone Status</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-400">
          <ShieldAlert className="w-3 h-3 text-orange-400" />
          <span>Volt: 118.4V</span>
        </div>
      </div>
    </div>
  );
}
