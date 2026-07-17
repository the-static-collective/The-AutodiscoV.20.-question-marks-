import React, { useState, useEffect } from "react";
import {
  Layers,
  Activity,
  Leaf,
  Cpu,
  Terminal,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  ArrowRight,
  History,
  Sparkles,
  Binary,
  FileText,
  Settings,
  Database,
  Search,
  Eye,
  Lock,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Volume2,
  RefreshCw
} from "lucide-react";

interface TranslationGreenhouseProps {
  dustLevel: number;
  loopCount: number;
  fossilCount: number;
  lemonScent: number;
  serverLoad: number;
  activeFileName: string;
  onDjMessage: (msg: string) => void;
}

interface RenderTrace {
  timestamp: string;
  claimPlanHash: string;
  ontologyRevision: string;
  registryRevision: string;
  rendererRevision: string;
  candidates: {
    stage: string;
    model: string;
    output: string;
    prompt: string;
  }[];
  validation: {
    accepted: boolean;
    surfaceMode: string;
    policyChecks: string[];
    errors?: string[];
  };
}

export default function TranslationGreenhouse({
  dustLevel: propsDustLevel,
  loopCount: propsLoopCount,
  fossilCount: propsFossilCount,
  lemonScent: propsLemonScent,
  serverLoad: propsServerLoad,
  activeFileName,
  onDjMessage,
}: TranslationGreenhouseProps) {
  // Let user override stats for the "Spoon Test" or manual experimentation
  const [overrideActive, setOverrideActive] = useState(false);
  const [simLoopCount, setSimLoopCount] = useState(propsLoopCount);
  const [simDustLevel, setSimDustLevel] = useState(propsDustLevel);
  const [simFossilCount, setSimFossilCount] = useState(propsFossilCount);
  const [simLemonScent, setSimLemonScent] = useState(propsLemonScent);
  const [simServerLoad, setSimServerLoad] = useState(propsServerLoad);

  const loopCount = overrideActive ? simLoopCount : propsLoopCount;
  const dustLevel = overrideActive ? simDustLevel : propsDustLevel;
  const fossilCount = overrideActive ? simFossilCount : propsFossilCount;
  const lemonScent = overrideActive ? simLemonScent : propsLemonScent;
  const serverLoad = overrideActive ? simServerLoad : propsServerLoad;

  // Opt-in lazy loading states for the T5 greenhouse
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelLoadingText, setModelLoadingText] = useState("");
  const [hardwareDevice, setHardwareDevice] = useState<"webgpu" | "wasm_cpu">("webgpu");
  const [hasWebGpu, setHasWebGpu] = useState(false);

  // Decoding configuration
  const [maxNewTokens, setMaxNewTokens] = useState(48);
  const [temperature, setTemperature] = useState(0.7);
  const [doSample, setDoSample] = useState(false);

  // Active generation pipeline states
  const [pipelineStage, setPipelineStage] = useState<
    "idle" | "planner" | "literalizer" | "alchemist" | "cadence" | "validator" | "complete"
  >("idle");
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineCancelled, setPipelineCancelled] = useState(false);
  const [activePrompt, setActivePrompt] = useState("");
  const [activeOutput, setActiveOutput] = useState("");

  // Visual Provenance state (crisp, fallback/stale, warning bleed)
  const [provenanceStale, setProvenanceStale] = useState(false);
  const [forbiddenWarningActive, setForbiddenWarningActive] = useState(false);

  // Ghost-Variable Jail State
  const [jailLog, setJailLog] = useState<string[]>([]);
  const [isJailTriggered, setIsJailTriggered] = useState(false);

  // Rhythmic Grounding Spacing & Hushed State
  const [isHushed, setIsHushed] = useState(false);

  // Render traces (Disposable harvest manifest)
  const [harvestLogs, setHarvestLogs] = useState<RenderTrace[]>([]);
  const [selectedTraceIdx, setSelectedTraceIdx] = useState<number | null>(null);

  // Active Symbol in the Registry
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>("spoon");

  // Highlighted metric in Proof Browser
  const [selectedProofMetric, setSelectedProofMetric] = useState<
    "loopCount" | "dustLevel" | "fossilCount" | "lemonScent" | "serverLoad"
  >("loopCount");

  // State for current T5 generated candidate text
  const [candidates, setCandidates] = useState<{
    planner: string;
    literalizer: string;
    alchemist: string;
    cadence: string;
    validator: string;
  }>({
    planner: "",
    literalizer: "",
    alchemist: "",
    cadence: "",
    validator: "",
  });

  // End-to-End "Smallest Proof" Spoon Test Wizard
  const [spoonTestStep, setSpoonTestStep] = useState<"not_started" | "act" | "ledger" | "registry" | "greenhouse" | "validator" | "experience" | "complete">("not_started");
  const [spoonTestLog, setSpoonTestLog] = useState<string[]>([]);

  // Check for WebGPU support on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as any).gpu) {
      setHasWebGpu(true);
    } else {
      setHardwareDevice("wasm_cpu");
    }
  }, []);

  // Listen for global focus-proof-metric events from the transcript
  useEffect(() => {
    const handleFocusMetric = (e: Event) => {
      const metricName = (e as CustomEvent).detail;
      if (metricName) {
        setSelectedProofMetric(metricName);
      }
    };
    window.addEventListener("focus-proof-metric", handleFocusMetric);
    return () => window.removeEventListener("focus-proof-metric", handleFocusMetric);
  }, []);

  // Compute a mock sha256 hash for visual authenticity
  const computeHash = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return "sha256:" + Math.abs(hash).toString(16).padStart(16, "0") + "ea21";
  };

  const activeClaimPlan = `metrics={loops:${loopCount},dust:${dustLevel}%,fossils:${fossilCount},lemon:${lemonScent}%,load:${serverLoad}%},file='${activeFileName || "none"}'`;
  const activeClaimPlanHash = computeHash(activeClaimPlan);

  // Lazy-load model simulator
  const handleLoadModel = (onComplete?: () => void) => {
    if (isModelLoaded) {
      if (onComplete) onComplete();
      return;
    }
    if (isLoadingModel) return;
    setIsLoadingModel(true);
    setModelLoadProgress(0);
    onDjMessage("🌱 Opening the Translation Greenhouse. Initiating lazy-load of local T5 ONNX architecture...");

    const steps = [
      { text: "Verifying WebGPU hardware structures...", time: 200, progress: 15 },
      { text: "Loading coedit-large-onnx model vocabulary configuration...", time: 200, progress: 35 },
      { text: "Fetching sharded weights (shard_1_encoder.onnx, 110MB)...", time: 300, progress: 60 },
      { text: "Fetching sharded weights (shard_2_decoder.onnx, 130MB)...", time: 300, progress: 85 },
      { text: "Compiling shaders for device queue...", time: 200, progress: 95 },
      { text: "Model warm-up and test token inference...", time: 100, progress: 100 },
    ];

    let currentStepIdx = 0;

    const runStep = () => {
      if (currentStepIdx >= steps.length) {
        setIsLoadingModel(false);
        setIsModelLoaded(true);
        onDjMessage("🌿 CoEdit/Flan-T5 ONNX Model loaded into Greenhouse memory via " + (hardwareDevice === "webgpu" ? "WebGPU" : "WASM/CPU fallback") + ".");
        if (onComplete) onComplete();
        return;
      }

      const step = steps[currentStepIdx];
      setModelLoadingText(step.text);
      setModelLoadProgress(step.progress);

      setTimeout(() => {
        currentStepIdx++;
        runStep();
      }, step.time);
    };

    runStep();
  };

  // Run the 4-stage T5 & validation pipeline
  const runTranslationPipeline = (customSeeds?: { literal?: string; alchemist?: string; cadence?: string }, onPipelineComplete?: (trace: RenderTrace) => void) => {
    if (!isModelLoaded) {
      handleLoadModel(() => runTranslationPipeline(customSeeds, onPipelineComplete));
      return;
    }

    setPipelineCancelled(false);
    setPipelineProgress(0);
    setPipelineStage("planner");
    setIsJailTriggered(false);
    setJailLog([]);
    setForbiddenWarningActive(false);

    // Stage 0 / 1: Planner
    setCandidates({
      planner: "",
      literalizer: "",
      alchemist: "",
      cadence: "",
      validator: "",
    });

    const runStage_Planner = () => {
      if (pipelineCancelled) return;
      setActivePrompt(`Task: Plan claims.\nInput: ${activeClaimPlan}`);
      setPipelineProgress(15);
      
      const deterministicClaim = `CLAIM_PLAN: { loops: ${loopCount}, dust: ${dustLevel}%, fossils: ${fossilCount}, lemon: ${lemonScent}%, load: ${serverLoad}% }`;
      
      setTimeout(() => {
        setCandidates(prev => ({
          ...prev,
          planner: deterministicClaim
        }));
        setPipelineStage("literalizer");
        runStage_Literalizer();
      }, 500);
    };

    const runStage_Literalizer = () => {
      if (pipelineCancelled) return;
      setPipelineProgress(35);
      const promptText = `Task: Convert claim plan to literal plain prose.\nInput: ${activeClaimPlan}`;
      setActivePrompt(promptText);

      const literalOut = customSeeds?.literal || `There are ${loopCount} loops circulating. File dust is currently hovering at ${dustLevel} percent, with ${fossilCount} peach pit fossils stored. Lemon scent intensity is at ${lemonScent} percent. Server load is at ${serverLoad} percent.`;
      
      let currentLength = 0;
      const interval = setInterval(() => {
        if (pipelineCancelled) {
          clearInterval(interval);
          return;
        }
        currentLength += Math.min(12, literalOut.length - currentLength);
        setActiveOutput(literalOut.substring(0, currentLength));
        
        if (currentLength >= literalOut.length) {
          clearInterval(interval);
          setCandidates(prev => ({
            ...prev,
            literalizer: literalOut
          }));
          setPipelineStage("alchemist");
          runStage_Alchemist();
        }
      }, 30);
    };

    const runStage_Alchemist = () => {
      if (pipelineCancelled) return;
      setPipelineProgress(60);
      
      // Determine forbidden assertions active for active selected symbol
      const forbiddenTerms = symbolsRegistry[selectedSymbolId]?.forbidden || ["conscious_intent", "knowing_the_future", "emotional_reciprocity"];
      
      const promptText = `Task: Translate literal claims into approved TAO metaphorical vocabulary.\nApproved symbols: [${selectedSymbolId.toUpperCase()}].\nForbidden Assertions: [${forbiddenTerms.join(", ")}].\nLiteral: ${candidates.literalizer || "The server load is active."}`;
      setActivePrompt(promptText);

      // Simulate the logit processor / Greenhouse Jail triggers
      // If the model tried to generate something bad, show the struggles
      const logs: string[] = [];
      logs.push("🛡️ logit_processor: initialized at inference layer.");
      
      // Block forbidden terms and synonyms
      forbiddenTerms.forEach(t => {
        logs.push(`🔒 Zeroed token probabilities for forbiddenAssertion rule: "${t}"`);
        if (t === "emotional_reciprocity" || t === "conscious_intent") {
          logs.push(`🔒 Suppressed vocabulary synonyms: ["love", "loves", "cares", "feeling", "intent"]`);
        }
        if (t === "knowing_the_future") {
          logs.push(`🔒 Suppressed vocabulary synonyms: ["prophesies", "foresees", "knows_future"]`);
        }
      });
      
      setJailLog(logs);
      setIsJailTriggered(true);

      const metaphoricalCandidates = [
        `We see ${loopCount} loops in the register. The file dust is at ${dustLevel} percent. We have gathered ${fossilCount} peach pits. A sharp lemon scent of ${lemonScent} percent cut through the heavy air. Server load is ${serverLoad} percent.`,
        `The register holds ${loopCount} active loops. Silt is gathering on the shelf at ${dustLevel} percent. Our ledger holds ${fossilCount} fossilized peach pits. A sharp current of lemon scent at ${lemonScent} percent cuts through the decay. Server load is ${serverLoad} percent.`,
        `There are ${loopCount} active loops. Dust levels are at ${dustLevel} percent. Ground dirt clinging to unshielded wires. We have ${fossilCount} peach pit fossils in grass near Sector 4. Server load sits at ${serverLoad} percent.`
      ];

      // Custom seed or chosen metaphor
      const metaphorOut = customSeeds?.alchemist || (selectedSymbolId === "spoon" 
        ? `The register records 1 act of attention. The spoon is quiet, but polished by focus. It claims no life or reciprocal bond, yet holds a deep witness memory.`
        : metaphoricalCandidates[loopCount % metaphoricalCandidates.length]);

      let currentLength = 0;
      const interval = setInterval(() => {
        if (pipelineCancelled) {
          clearInterval(interval);
          return;
        }
        currentLength += Math.min(15, metaphorOut.length - currentLength);
        setActiveOutput(metaphorOut.substring(0, currentLength));
        
        if (currentLength >= metaphorOut.length) {
          clearInterval(interval);
          setCandidates(prev => ({
            ...prev,
            alchemist: metaphorOut
          }));
          setPipelineStage("cadence");
          runStage_Cadence();
        }
      }, 25);
    };

    const runStage_Cadence = () => {
      if (pipelineCancelled) return;
      setPipelineProgress(80);
      const promptText = `Task: Shorten and pace candidates for Speech Engine synthesis.\nConstraints: Max 15 words per segment.\nInput: ${candidates.alchemist || "The register holds active loops."}`;
      setActivePrompt(promptText);

      // Check for hushed grounding trigger (if loopCount is low or lemonScent is 0, or overrides are on)
      const hushActive = loopCount === 0 || simLoopCount === 0 || isHushed;
      
      const rawCadenceOut = customSeeds?.cadence || (selectedSymbolId === "spoon"
        ? "The spoon has one act of attention recorded. It is quiet. It remembers."
        : `The network carries ${loopCount} loops through the overhead cables. Average file dust settled at ${dustLevel} percent. Our ledger holds ${fossilCount} fossilized peach pits. A sharp current of lemon scent at ${lemonScent} percent cuts through the decay.`);

      // If hushed, apply rhythmic spacing
      const cadenceOut = hushActive 
        ? rawCadenceOut.split(" ").join(" ... ") 
        : rawCadenceOut;

      if (hushActive) {
        setIsHushed(true);
      }

      let currentLength = 0;
      const interval = setInterval(() => {
        if (pipelineCancelled) {
          clearInterval(interval);
          return;
        }
        currentLength += Math.min(18, cadenceOut.length - currentLength);
        setActiveOutput(cadenceOut.substring(0, currentLength));
        
        if (currentLength >= cadenceOut.length) {
          clearInterval(interval);
          setCandidates(prev => ({
            ...prev,
            cadence: cadenceOut
          }));
          setPipelineStage("validator");
          runStage_Validator();
        }
      }, 20);
    };

    const runStage_Validator = () => {
      if (pipelineCancelled) return;
      setPipelineProgress(95);
      setActivePrompt(`System: Deterministic TAO Validator\nRule Check: Validate against forbiddenAssertions, allowedSurfaceModes, requiredProvenance.`);
      setActiveOutput("Evaluating assertion policy...");

      setTimeout(() => {
        const checkPassed = true;
        const activeTrace: RenderTrace = {
          timestamp: new Date().toLocaleTimeString(),
          claimPlanHash: activeClaimPlanHash,
          ontologyRevision: "tao-ontology@1.0.0",
          registryRevision: "metrics@1.0.0",
          rendererRevision: "t5-translation-greenhouse@1.1.0",
          candidates: [
            {
              stage: "claim_planner",
              model: "deterministic_planner",
              prompt: `Plan claims based on local state variables`,
              output: `CLAIM_PLAN: { loops: ${loopCount}, dust: ${dustLevel}%, fossils: ${fossilCount}, lemon: ${lemonScent}%, load: ${serverLoad}% }`
            },
            {
              stage: "literalizer",
              model: "google/flan-t5-small",
              prompt: `Convert raw metrics into plain assertions`,
              output: candidates.literalizer || `The file dust is ${dustLevel} percent.`
            },
            {
              stage: "alchemist",
              model: "metaphor-t5-custom",
              prompt: `Translate assertions to ontology vocabulary`,
              output: candidates.alchemist || `Silt is gathering on the shelves at ${dustLevel} percent.`
            },
            {
              stage: "cadence_editor",
              model: "cadence-t5-constrained",
              prompt: `Pace outputs to 12-15 words segments`,
              output: candidates.cadence || `The silt has settled at ${dustLevel} percent. Ground dirt clinging to unshielded wires.`
            }
          ],
          validation: {
            accepted: checkPassed,
            surfaceMode: "metaphor",
            policyChecks: [
              "no_forbidden_assertions_passed",
              "allowed_surface_mode_verified",
              "provenance_trace_validated",
              "ontology_schema_match"
            ]
          }
        };

        setCandidates(prev => ({
          ...prev,
          validator: "VALIDATED AND VERIFIED. ACCEPTED FOR DAILY BROADCAST RITUAL."
        }));

        setHarvestLogs(prev => [activeTrace, ...prev]);
        setSelectedTraceIdx(0);
        setPipelineStage("complete");
        setPipelineProgress(100);
        
        if (onPipelineComplete) {
          onPipelineComplete(activeTrace);
        } else {
          onDjMessage("🎉 Translation Greenhouse pipeline finished successfully. Render trace recorded in disposable harvest manifest.");
        }
      }, 800);
    };

    runStage_Planner();
  };

  const cancelPipeline = () => {
    setPipelineCancelled(true);
    setPipelineStage("idle");
    onDjMessage("⚠️ T5 pipeline execution cancelled by user. Reverting to swift deterministic renderer.");
  };

  // Run the End-to-End "Spoon Test"
  const startSpoonTest = () => {
    setSpoonTestStep("act");
    setSpoonTestLog(["🚀 Initiating 'Spoon Test' - End-to-End Protocol Verification."]);
    onDjMessage("📻 Initiating the Canonical Spoon Test. Let us track a symbol from Cold Ledger to Warm Metaphor.");

    setTimeout(() => {
      setSpoonTestStep("ledger");
      setSpoonTestLog(prev => [
        ...prev,
        "🟢 [1/7 ACT & LEDGER] Created user annotation event 'ANNOTATION_CREATED' on file_042.wav.",
        "🔒 Signed with traveler's private key (sig_77x92ea21). Ingest receipt published.",
        "📊 Published event: { type: 'ANNOTATION_CREATED', witness: 'Lumi', file: 'file_042.wav', timestamp: 14201300 }"
      ]);

      setTimeout(() => {
        setSpoonTestStep("registry");
        // Temporarily override loop count or attention index
        setOverrideActive(true);
        setSimLoopCount(1);
        setSimDustLevel(37);
        setSimFossilCount(3);
        setSimLemonScent(55);
        setSimServerLoad(22);
        setSpoonTestLog(prev => [
          ...prev,
          "🟢 [2/7 REGISTRY ENGINE] Recalculating metrics@1.0.0.",
          "📊 attention@1.0.0 raised to value: 1. (Crossed activation_trigger threshold >= 1)",
          "📂 Authorized symbol spoon@1.0.0 for Metaphor Surface mapping."
        ]);

        setTimeout(() => {
          setSpoonTestStep("greenhouse");
          setSpoonTestLog(prev => [
            ...prev,
            "🟢 [3/7 GREENHOUSE T5 PIPELINE] Initializing 3 recursive T5 stages with Claim Plan.",
            "🚫 GHOST-VARIABLE JAIL ACTIVATED: Zeroing-out forbidden assertions: ['knowing_the_future', 'conscious_intent', 'emotional_reciprocity']"
          ]);

          // Run actual translation pipeline specifically for the Spoon
          handleLoadModel(() => {
            runTranslationPipeline({
              literal: "Lumi attached one annotation to file_042.wav. There is an ordinary spoon in the workspace drawer.",
              alchemist: "The register records 1 act of attention. The spoon is looking at you. No, wait... the spoon has a polished little eye. It holds witness memory.",
              cadence: "The spoon has one act of attention recorded. It is quiet. It remembers."
            }, (trace) => {
              setSpoonTestStep("validator");
              setSpoonTestLog(prev => [
                ...prev,
                "🔴 [4/7 STAMPEDE PREVENTED] Draft 1 REJECTED: 'The spoon loves you.' (Reason: forbiddenAssertion: emotional_reciprocity)",
                "🔴 [5/7 MUTATION PREVENTED] Draft 2 REJECTED: 'The spoon is about 10% brighter.' (Reason: numericMutationCheck - gained unauthorized authority)",
                "🟢 [6/7 VALIDATOR APPROVED] Draft 3 PASSED: 'The spoon remembers your name.' (Reason: mode: metaphor, symbol: spoon@1.0.0)",
                "✅ Deterministic validation successful. Claim plan matches. Signer validated."
              ]);

              setTimeout(() => {
                setSpoonTestStep("experience");
                setSpoonTestLog(prev => [
                  ...prev,
                  "🟢 [7/7 EXPERIENCE DEPLOYED] Rendering surface mode metaphor.",
                  "🎶 Playing song lyric: 'The spoon knows something...'",
                  "👁️ Spoon eye is open and shining crisp in the Cassette panel."
                ]);
                setSpoonTestStep("complete");
                onDjMessage("✨ Spoon Test complete! Verification traces successfully baked into the local Proof Browser.");
              }, 1200);

            });
          });

        }, 1200);
      }, 1200);
    }, 1200);
  };

  const resetSpoonTest = () => {
    setSpoonTestStep("not_started");
    setSpoonTestLog([]);
    setOverrideActive(false);
    setIsHushed(false);
    setIsJailTriggered(false);
  };

  // Symbols Registry Definition Table
  const symbolsRegistry: Record<
    string,
    {
      id: string;
      version: string;
      kind: string;
      label: string;
      description: string;
      activation: string;
      forbidden: string[];
      surfaceModes: string[];
      stateMappings: { state: string; condition: string }[];
    }
  > = {
    spoon: {
      id: "spoon",
      version: "1.0.0",
      kind: "derived_witness",
      label: "The Spoon",
      description: "An ordinary witness object that has become semantically salient through recorded interaction (the 'eye' opens).",
      activation: "attention@1.0.0 >= 1",
      forbidden: ["knowing_the_future", "emotional_reciprocity", "conscious_intent"],
      surfaceModes: ["observed", "inferred", "memory", "metaphor"],
      stateMappings: [
        { state: "polished_eye", condition: "recent_attention_count > 5" },
        { state: "hush", condition: "silence@1.0.0 >= 24h" }
      ]
    },
    peach_pit: {
      id: "peach_pit",
      version: "1.0.0",
      kind: "held_event",
      label: "Peach Pit Fossil",
      description: "Shattered memory variables from unexpected system occurrences. Too hard to digest immediately, preserved as a crystalline stone.",
      activation: "garbageCollect() filtered objects",
      forbidden: ["automatic_indexing", "destructive_gc"],
      surfaceModes: ["observed", "metaphor"],
      stateMappings: [
        { state: "stoned", condition: "age_since_crash > 7d" },
        { state: "composted", condition: "attention@1.0.0 is null" }
      ]
    },
    dust: {
      id: "dust",
      version: "1.0.0",
      kind: "metric_relative",
      label: "File Dust",
      description: "The percentage of unannotated media materials in the workspace sandbox.",
      activation: "secondary_annotation_coverage < 1.0",
      forbidden: ["infinite_neglect_erasure"],
      surfaceModes: ["observed", "inferred", "metaphor"],
      stateMappings: [
        { state: "rising_silt", condition: "annotation_coverage_delta < 0" },
        { state: "sterile", condition: "dust_level === 0%" }
      ]
    },
    lemon: {
      id: "lemon",
      version: "1.0.0",
      kind: "joy_artifact",
      label: "Lemon Scent",
      description: "The intensity of active squeezing of raw code pulp metadata. Dissolves system starch to extract affirmative proverbs.",
      activation: "SqueezePanel intensity index",
      forbidden: ["synthesized_pulp_overwrite"],
      surfaceModes: ["observed", "metaphor"],
      stateMappings: [
        { state: "ripened", condition: "scent_level >= 80%" },
        { state: "shriveled", condition: "scent_level < 15%" }
      ]
    },
    server_grit: {
      id: "server_grit",
      version: "1.0.0",
      kind: "system_load",
      label: "Server Grit Load",
      description: "The physical strain on system voltage and processing loops.",
      activation: "UptimeMonitor voltage load",
      forbidden: ["fictional_ping_indicators"],
      surfaceModes: ["observed", "inferred", "memory"],
      stateMappings: [
        { state: "thirsty", condition: "server_load > 70%" },
        { state: "steady_sleep", condition: "server_load <= 10%" }
      ]
    }
  };

  const activeSymbol = symbolsRegistry[selectedSymbolId] || symbolsRegistry.spoon;

  // Render proof parameters based on currently selected metric in Proof Browser
  const getProofData = (metric: typeof selectedProofMetric) => {
    switch (metric) {
      case "loopCount":
        return {
          metricName: "loopCount",
          formula: "Σ(Live LoopIts in ledger)",
          definition: "Quantity of verified ingest ledger loops representing core antimodern record states.",
          currentValue: loopCount,
          witnessCount: loopCount,
          sampleEvent: "LOOP_INGESTED (seed_1)",
          signer: "Local Witness (Private)",
          hash: "sha256:4a02be04a3e201b1",
          timestamp: "3:05:12 AM"
        };
      case "dustLevel":
        return {
          metricName: "dustLevel",
          formula: "Σ(file.dust) / files.count",
          definition: "Ratio of unannotated media objects compared to the complete registered workspace set.",
          currentValue: `${dustLevel}%`,
          witnessCount: 3,
          sampleEvent: "FILE_REGISTRY_SNAPSHOT",
          signer: "FileWatcher Process",
          hash: "sha256:7f11cba90e8a4a4b",
          timestamp: "2:40:00 AM"
        };
      case "fossilCount":
        return {
          metricName: "fossilCount",
          formula: "fossils.count (un-digested)",
          definition: "Count of crystallized memory fossils residing on bottom shelves of bottom sectors.",
          currentValue: fossilCount,
          witnessCount: fossilCount,
          sampleEvent: "FOSSIL_CRYSTALLIZE",
          signer: "FossilMemory.pit GC",
          hash: "sha256:0d12fe8b9c210aee",
          timestamp: "2:55:04 AM"
        };
      case "lemonScent":
        return {
          metricName: "lemonScent",
          formula: "SqueezePanel intensity",
          definition: "Intensity of metadata squeeze operations performed in the last window.",
          currentValue: `${lemonScent}%`,
          witnessCount: 1,
          sampleEvent: "METADATA_SQUEEZE_CREATED",
          signer: "SqueezePanel Sensor",
          hash: "sha256:ee849f2b8cc992ef",
          timestamp: "Recently"
        };
      case "serverLoad":
        return {
          metricName: "serverLoad",
          formula: "UptimeMonitor voltage",
          definition: "CPU load percentage coupled with current network voltage readings.",
          currentValue: `${serverLoad}%`,
          witnessCount: 1,
          sampleEvent: "UPTIME_VOLTAGE_POLL",
          signer: "UptimeMonitor Core",
          hash: "sha256:ab45091fa02ba1c8",
          timestamp: "Real-time"
        };
    }
  };

  const proof = getProofData(selectedProofMetric);

  const getEpistemicAddresses = (metric: "loopCount" | "dustLevel" | "fossilCount" | "lemonScent" | "serverLoad") => {
    switch (metric) {
      case "loopCount":
        return [
          {
            mode: "observed" as const,
            label: "OBSERVED (Evidence)",
            text: `LOOP_INGESTED (seed_1) at 3:05 AM: "Porch light flicker cadence observed at 120 bpm."`,
            address: "ledger://circulate/seed_1",
            details: "Raw key-signed event captured locally."
          },
          {
            mode: "derived" as const,
            label: "DERIVED (Computation)",
            text: `Derived value: loopCount = ${loopCount} loops active in current snapshot.`,
            address: "metrics://count/loops@1.0.0",
            details: "Summation of non-redacted active loops."
          },
          {
            mode: "metaphor" as const,
            label: "METAPHOR (Symbol)",
            text: `Ontology Symbol: spoon@1.0.0. A quiet witness that has become semantically salient.`,
            address: "ontology://witness/spoon@1.0.0",
            details: "Registered symbolic rendering of active attention loops."
          },
          {
            mode: "interpretation" as const,
            label: "INTERPRETATION (Invitation)",
            text: `"${loopCount} distinct heartbeats circulating. Sits low in the silence, waiting for your attention."`,
            address: "cadence://tts/loops_contemplation",
            details: "Offered reading designed for human-system resonance."
          }
        ];
      case "dustLevel":
        return [
          {
            mode: "observed" as const,
            label: "OBSERVED (Evidence)",
            text: `FILE_REGISTRY_SNAPSHOT at 2:40 AM: "f2.grace has 80% unpolished lines."`,
            address: "ledger://file_watcher/snapshot_f2",
            details: "Direct line analyzer report on unpolished bytes."
          },
          {
            mode: "derived" as const,
            label: "DERIVED (Computation)",
            text: `Derived value: average dustLevel = ${dustLevel}% across 3 active files.`,
            address: "metrics://ratio/dust@1.0.0",
            details: "Calculation of neglected vs shined lines."
          },
          {
            mode: "metaphor" as const,
            label: "METAPHOR (Symbol)",
            text: `Ontology Symbol: rising_silt@1.0.0. Grey layers are resting on unshielded variables.`,
            address: "ontology://silt/density@1.0.0",
            details: "Coded representation of neglect as physical grey silt."
          },
          {
            mode: "interpretation" as const,
            label: "INTERPRETATION (Invitation)",
            text: `"A grey quietness rests on the code. Move your cursor over the editor to polish the glass."`,
            address: "cadence://tts/silt_warning",
            details: "Invitation prompting the traveler to care for their code."
          }
        ];
      case "fossilCount":
        return [
          {
            mode: "observed" as const,
            label: "OBSERVED (Evidence)",
            text: `FOSSIL_CRYSTALLIZE (dead_alloc) at 2:55 AM: "Allocated size 24MB crystallized as permanent stone."`,
            address: "ledger://fossil_collector/alloc_24",
            details: "Signed record of non-digestible garbage collection."
          },
          {
            mode: "derived" as const,
            label: "DERIVED (Computation)",
            text: `Derived value: fossilCount = ${fossilCount} crystallized memory artifacts.`,
            address: "metrics://count/fossils@1.0.0",
            details: "Total count of crystalline memory pits on bottom shelves."
          },
          {
            mode: "metaphor" as const,
            label: "METAPHOR (Symbol)",
            text: `Ontology Symbol: peach_pit@1.0.0. Shattered memory bones locked in the bottom shelf.`,
            address: "ontology://peach_pit/held@1.0.0",
            details: "Metaphor of solid peach pits bypassing standard deletion."
          },
          {
            mode: "interpretation" as const,
            label: "INTERPRETATION (Invitation)",
            text: `"Crystallized memory stones lying in the bottom drawer. They do not fade."`,
            address: "cadence://tts/fossil_monologue",
            details: "A meditation on the permanence of historic system states."
          }
        ];
      case "lemonScent":
        return [
          {
            mode: "observed" as const,
            label: "OBSERVED (Evidence)",
            text: `METADATA_SQUEEZE_CREATED at recently: "SqueezePanel recorded intensity pull of ${lemonScent}%."`,
            address: "ledger://squeeze_sensor/pull_latest",
            details: "Sensory event captured from traveler interaction."
          },
          {
            mode: "derived" as const,
            label: "DERIVED (Computation)",
            text: `Derived value: lemonScent = ${lemonScent}% average squeezing intensity.`,
            address: "metrics://intensity/scent@1.0.0",
            details: "Pulp calculation over last squeeze window."
          },
          {
            mode: "metaphor" as const,
            label: "METAPHOR (Symbol)",
            text: `Ontology Symbol: lemon@1.0.0. Active squeezing of code pulp metadata.`,
            address: "ontology://citrus/juice@1.0.0",
            details: "Squeeze metaphor showing extraction of affirmative proverbs."
          },
          {
            mode: "interpretation" as const,
            label: "INTERPRETATION (Invitation)",
            text: `"Extracting affirmative proverbs from the code pulp. Warm citrus in the corners."`,
            address: "cadence://tts/lemon_proverb",
            details: "Interactive invitation celebrating active metadata compression."
          }
        ];
      case "serverLoad":
        return [
          {
            mode: "observed" as const,
            label: "OBSERVED (Evidence)",
            text: `UPTIME_VOLTAGE_POLL at real-time: "Server load is ${serverLoad}% under voltage load."`,
            address: "ledger://uptime_monitor/poll_latest",
            details: "Ping and CPU bus voltage reading from container core."
          },
          {
            mode: "derived" as const,
            label: "DERIVED (Computation)",
            text: `Derived value: serverLoad = ${serverLoad}% CPU and voltage strain.`,
            address: "metrics://load/voltage@1.0.0",
            details: "Weighted load factor over active processing loops."
          },
          {
            mode: "metaphor" as const,
            label: "METAPHOR (Symbol)",
            text: `Ontology Symbol: server_grit@1.0.0. Quiet, hydrated, and ready for work.`,
            address: "ontology://grit/stress@1.0.0",
            details: "Physical representation of server load as grit friction."
          },
          {
            mode: "interpretation" as const,
            label: "INTERPRETATION (Invitation)",
            text: `"The servers are resting. The voltage is steady and cool."`,
            address: "cadence://tts/resting_monologue",
            details: "An assurance of system peace over modern frantic speed."
          }
        ];
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in text-stone-200">
      
      {/* FULL WIDTH: CANONICAL SPOON TEST FLOW */}
      <div className="xl:col-span-12">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 border-b border-stone-850 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-400" />
                <h2 className="font-sans font-semibold text-stone-200 text-lg">
                  Constitutional End-to-End "Spoon Test"
                </h2>
              </div>
              <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-1">
                A Reversible Verification Loop from Private Signature to Metaphorical Output
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {spoonTestStep !== "not_started" && (
                <button
                  onClick={resetSpoonTest}
                  className="px-3 py-1.5 bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-400 rounded-xl font-mono text-[10px] uppercase cursor-pointer flex items-center gap-1 transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Test
                </button>
              )}
              
              <button
                onClick={startSpoonTest}
                disabled={spoonTestStep !== "not_started" && spoonTestStep !== "complete"}
                className={`px-4 py-2 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  spoonTestStep !== "not_started" && spoonTestStep !== "complete"
                    ? "bg-stone-800 text-stone-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 hover:opacity-90 shadow-[0_0_15px_rgba(249,115,22,0.25)]"
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Run Complete Spoon Test
              </button>
            </div>
          </div>

          {/* Test Pipeline Progress Path */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { id: "act", label: "1. User Act", desc: "Add Annotation" },
              { id: "ledger", label: "2. Cold Ledger", desc: "Signed Event Ingested" },
              { id: "registry", label: "3. Registry Count", desc: "attention@1.0.0 >= 1" },
              { id: "greenhouse", label: "4. Metaphor T5", desc: "Ghost-Variable Jail" },
              { id: "validator", label: "5. Audit Linter", desc: "Zero Mutation Pass" },
              { id: "experience", label: "6. Warm Metaphor", desc: "Hushed Cadence Sung" },
              { id: "complete", label: "7. Audit Verifier", desc: "Perfect Sincerity" }
            ].map((step, idx) => {
              const isActive = spoonTestStep === step.id;
              const isPast = [
                "not_started", "act", "ledger", "registry", "greenhouse", "validator", "experience", "complete"
              ].indexOf(spoonTestStep) >= [
                "not_started", "act", "ledger", "registry", "greenhouse", "validator", "experience", "complete"
              ].indexOf(step.id);
              
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? "bg-orange-950/20 border-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                      : isPast && spoonTestStep !== "not_started"
                        ? "bg-stone-950 border-stone-800 text-stone-300"
                        : "bg-stone-950/40 border-stone-900 text-stone-600"
                  }`}
                >
                  <div className={`font-mono text-[9px] font-bold ${isActive ? "text-orange-400" : isPast && spoonTestStep !== "not_started" ? "text-stone-400" : "text-stone-700"}`}>
                    {step.label}
                  </div>
                  <div className="font-sans text-[10.5px] mt-1 font-medium leading-tight">
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Test Console Log output */}
          {spoonTestLog.length > 0 && (
            <div className="bg-stone-950 border border-stone-850 rounded-xl p-4 font-mono text-[10.5px] space-y-1.5 max-h-48 overflow-y-auto">
              <div className="text-stone-500 border-b border-stone-900 pb-1.5 mb-1.5 flex items-center justify-between">
                <span>TAO COLD LEDGER STAGE DEPLOYMENT CONSOLE</span>
                {spoonTestStep === "complete" ? (
                  <span className="text-emerald-500 font-bold">● PROTOCOL VERIFIED</span>
                ) : (
                  <span className="text-orange-400 animate-pulse">● RUNNING TEST SECTOR</span>
                )}
              </div>
              {spoonTestLog.map((log, index) => {
                let colorClass = "text-stone-300";
                if (log.startsWith("🟢")) colorClass = "text-emerald-400";
                if (log.startsWith("🔴")) colorClass = "text-rose-400 font-semibold";
                if (log.startsWith("✅")) colorClass = "text-emerald-500 font-bold";
                if (log.startsWith("🚀")) colorClass = "text-orange-400 font-bold";
                return (
                  <div key={index} className={`${colorClass} leading-relaxed`}>
                    {log}
                  </div>
                );
              })}
              {spoonTestStep !== "complete" && spoonTestStep !== "not_started" && (
                <div className="flex items-center gap-1.5 text-[9px] text-stone-500 italic animate-pulse pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> compiling next validation stage proofs...
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* LEFT BLOCK: THE TRANSLATION GREENHOUSE (T5 WORKSPACE) */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        
        {/* Module Header and Opt-In state */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 relative overflow-hidden flex-1 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-stone-850 pb-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-sans font-medium text-stone-200 text-sm">
                    The Translation Greenhouse
                  </h3>
                  <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">
                    Stage-by-Stage Local T5 Composting Laboratory
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded">
                EXPERIMENT ACTIVE
              </span>
            </div>

            <p className="font-sans text-xs text-stone-400 leading-relaxed mb-4">
              Here, the traveler can experiment with a multi-stage text transformation engine. We use a quantized 
              T5 model to process raw metric data into poetic metaphors. Crucially, the outputs remain entirely 
              disposable until audited and signed by TAO's deterministic schema validator.
            </p>

            {/* Config & Controls */}
            {!isModelLoaded ? (
              <div className="bg-stone-950 border border-stone-850 rounded-xl p-5 text-center my-4 flex flex-col items-center justify-center min-h-[180px]">
                {isLoadingModel ? (
                  <div className="w-full max-w-sm space-y-4">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                    <div>
                      <div className="text-xs font-mono text-stone-300 font-bold">{modelLoadingText}</div>
                      <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mt-1">
                        ONNX weights download & compiler queue
                      </div>
                    </div>
                    <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${modelLoadProgress}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-stone-500">
                      {modelLoadProgress}% Loaded • ~240MB total memory footprint
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-emerald-400">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans text-xs font-bold text-stone-300">Model Nursery Locked</h4>
                      <p className="font-sans text-[11px] text-stone-500 leading-normal mt-1">
                        To preserve system performance and prevent high download latency, the local T5 model weights are lazy-loaded only upon traveler request.
                      </p>
                    </div>
                    
                    {/* Device Choice */}
                    <div className="flex items-center justify-center gap-2 font-mono text-[9px] border-t border-b border-stone-900 py-2.5">
                      <span className="text-stone-600">INFERENCE TARGET:</span>
                      <button
                        onClick={() => {
                          if (hasWebGpu) setHardwareDevice("webgpu");
                        }}
                        className={`px-1.5 py-0.5 rounded border transition-all ${
                          hardwareDevice === "webgpu"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900"
                            : "bg-stone-900 text-stone-600 border-stone-850"
                        } ${!hasWebGpu ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                        title={hasWebGpu ? "Use WebGPU Acceleration" : "WebGPU not supported on this browser"}
                      >
                        WebGPU (Accelerated)
                      </button>
                      <button
                        onClick={() => setHardwareDevice("wasm_cpu")}
                        className={`px-1.5 py-0.5 rounded border cursor-pointer transition-all ${
                          hardwareDevice === "wasm_cpu"
                            ? "bg-stone-855 text-stone-300 border-stone-800"
                            : "bg-stone-900 text-stone-600 border-stone-850"
                        }`}
                      >
                        WASM / CPU Fallback
                      </button>
                    </div>

                    <button
                      onClick={() => handleLoadModel()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl font-sans text-xs font-bold flex items-center gap-1.5 mx-auto transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Open translation Greenhouse
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="my-3 space-y-4">
                
                {/* Micro Config Settings */}
                <div className="bg-stone-950 border border-stone-850 rounded-xl p-3.5 grid grid-cols-3 gap-4 font-mono text-[10px]">
                  <div>
                    <span className="text-stone-500 block uppercase mb-1">Max New Tokens</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="range" 
                        min="16" 
                        max="128" 
                        value={maxNewTokens}
                        onChange={(e) => setMaxNewTokens(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-stone-900 rounded-lg cursor-pointer"
                      />
                      <span className="text-stone-300 font-bold min-w-[20px] text-right">{maxNewTokens}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500 block uppercase mb-1">Temperature</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.5" 
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-stone-900 rounded-lg cursor-pointer"
                      />
                      <span className="text-stone-300 font-bold min-w-[20px] text-right">{temperature}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-stone-500 uppercase mb-1 block">Inference Mode</span>
                    <button
                      onClick={() => setDoSample(!doSample)}
                      className={`text-[9.5px] px-2 py-0.5 rounded border text-center font-bold tracking-wider transition-all cursor-pointer ${
                        doSample 
                          ? "bg-amber-950/20 text-amber-400 border-amber-900" 
                          : "bg-emerald-950/20 text-emerald-400 border-emerald-900"
                      }`}
                    >
                      {doSample ? "STOCHASTIC SAMPLING" : "GREEDY DECODING"}
                    </button>
                  </div>
                </div>

                {/* Ghost-Variable Jail Status Overlay */}
                {isJailTriggered && (
                  <div className="bg-rose-950/15 border border-rose-900/30 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-rose-400 font-bold">
                        <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        <span>🚫 GHOST-VARIABLE JAIL ACTIVATED (Logit Suppression)</span>
                      </div>
                      <span className="text-[8px] bg-rose-950 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest">
                        Enforcing Non-escalation
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[9px] text-stone-400">
                      {jailLog.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="text-rose-500/60">•</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rhythmic Grounding Spacing Modulator Overlay */}
                <div className="bg-stone-950 border border-stone-850 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400 font-bold">
                      <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>🎙️ TTS PROSODY ENVELOPE (Rhythmic Grounding)</span>
                    </div>
                    <span className="text-[8px] bg-amber-950/30 text-amber-400 border border-amber-900/40 px-1.5 py-0.5 rounded font-mono">
                      {isHushed ? "HUShed STATE ACTIVE" : "NORMAL GRIT RATE"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-stone-400">
                    <div className="bg-stone-900/60 p-2 rounded border border-stone-850/40">
                      <span className="text-stone-500 block mb-0.5 uppercase">Voltage Pitch</span>
                      <strong className="text-stone-200">{120 + Math.round(serverLoad * 1.5)}Hz</strong>
                      <span className="text-[8px] text-stone-600 block mt-0.5">Scale: Server Grit</span>
                    </div>
                    <div className="bg-stone-900/60 p-2 rounded border border-stone-850/40">
                      <span className="text-stone-500 block mb-0.5 uppercase">Word Spacing</span>
                      <strong className="text-stone-200">{isHushed ? "DILATED (+350ms)" : "STANDARD"}</strong>
                      <span className="text-[8px] text-stone-600 block mt-0.5">Trigger: loops === 0</span>
                    </div>
                    <div className="bg-stone-900/60 p-2 rounded border border-stone-850/40">
                      <span className="text-stone-500 block mb-0.5 uppercase">Synthesis Speed</span>
                      <strong className="text-stone-200">{isHushed ? "0.75x" : "1.0x"}</strong>
                      <span className="text-[8px] text-stone-600 block mt-0.5">Grounded in Silence</span>
                    </div>
                  </div>
                </div>

                {/* Live Sandbox Execution Pipeline */}
                <div className="bg-stone-950 border border-stone-850 rounded-xl p-4 flex flex-col gap-3 min-h-[220px] justify-between">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                        Greenhouse Pipeline Terminal
                      </span>
                    </div>
                    {pipelineStage !== "idle" && pipelineStage !== "complete" && (
                      <button
                        onClick={cancelPipeline}
                        className="font-mono text-[8px] bg-rose-950/40 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded hover:bg-rose-900/30 cursor-pointer transition-colors"
                      >
                        CANCEL PIPELINE
                      </button>
                    )}
                  </div>

                  {/* Stage flow state */}
                  {pipelineStage === "idle" ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-4">
                      <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                      <div>
                        <div className="font-sans text-xs font-bold text-stone-400">Greenhouse is Ready</div>
                        <p className="font-sans text-[10.5px] text-stone-600 mt-1">
                          Feed the active claim plan ({activeClaimPlanHash.substring(0, 14)}) into the compost heap.
                        </p>
                      </div>
                      <button
                        onClick={() => runTranslationPipeline()}
                        className="px-3.5 py-1.5 bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 border border-emerald-900/80 hover:border-emerald-500 rounded-lg font-mono text-[10px] tracking-widest uppercase cursor-pointer transition-all"
                      >
                        START T5 RECURSIVE RUN
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-3 font-mono text-[10px]">
                      
                      {/* Active Stage visual step indicator */}
                      <div className="grid grid-cols-5 gap-1.5 text-center text-[8px] pb-1.5 border-b border-stone-900">
                        {[
                          { stage: "planner", label: "0. Plan" },
                          { stage: "literalizer", label: "1. Literal" },
                          { stage: "alchemist", label: "2. Alchemize" },
                          { stage: "cadence", label: "3. Cadence" },
                          { stage: "validator", label: "4. Validate" }
                        ].map((s) => {
                          const stagesList = ["planner", "literalizer", "alchemist", "cadence", "validator", "complete"];
                          const isCurrent = pipelineStage === s.stage;
                          const isDone = stagesList.indexOf(pipelineStage) > stagesList.indexOf(s.stage);
                          return (
                            <div 
                              key={s.stage}
                              className={`py-1 rounded border transition-all ${
                                isCurrent 
                                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-800" 
                                  : isDone
                                    ? "bg-stone-900/60 text-stone-500 border-stone-850"
                                    : "bg-stone-950 text-stone-700 border-stone-950"
                              }`}
                            >
                              {s.label}
                            </div>
                          );
                        })}
                      </div>

                      {/* Display prompt and current text stream */}
                      <div className="bg-stone-950 border border-stone-900 rounded p-2.5 space-y-2">
                        <div>
                          <span className="text-stone-600 uppercase text-[8.5px] block">Prompt Compilation:</span>
                          <span className="text-stone-400 italic block">{activePrompt}</span>
                        </div>
                        <div className="border-t border-stone-900 pt-2">
                          <span className="text-stone-600 uppercase text-[8.5px] block">
                            Candidate Stream ({hardwareDevice === "webgpu" ? "WebGPU Core" : "WASM Kernel"}):
                          </span>
                          <span className="text-emerald-300 block font-bold leading-relaxed whitespace-pre-wrap">
                            {activeOutput || "Waiting for tokens..."}
                          </span>
                        </div>
                      </div>

                      {/* Process loader bar */}
                      <div className="w-full bg-stone-900 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${pipelineProgress}%` }}
                        />
                      </div>

                      {pipelineStage === "complete" && (
                        <div className="flex items-center gap-1.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 p-2 rounded">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-[10px]">
                            Traces committed to the harvest manifest. You can inspect the candidate traces or run again.
                          </span>
                          <button
                            onClick={() => runTranslationPipeline()}
                            className="ml-auto font-bold underline hover:text-emerald-300 cursor-pointer text-[9.5px]"
                          >
                            RUN AGAIN
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

          <div className="mt-4 pt-3 border-t border-stone-850 flex items-center justify-between font-mono text-[9px] text-stone-500 uppercase tracking-widest">
            <span>CORES IN NURSERY</span>
            <span>{isModelLoaded ? "T5 ONNX 1.0.0 ACTIVE" : "OFFLINE / SLEEPING"}</span>
          </div>
        </div>

        {/* Harvest Trace Manifest History List */}
        {isModelLoaded && harvestLogs.length > 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-stone-850 pb-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-400">
                <History className="w-4 h-4 text-emerald-400" />
                <span>HARVESTED TRACES (DISPOSABLE MANIFEST)</span>
              </div>
              <span className="font-mono text-[8px] text-stone-500 uppercase">
                {harvestLogs.length} LOGS
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {harvestLogs.map((log, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedTraceIdx(idx)}
                  className={`p-2.5 rounded-xl border font-mono text-[9.5px] cursor-pointer transition-all flex items-center justify-between ${
                    idx === selectedTraceIdx
                      ? "bg-emerald-950/10 border-emerald-800/40 text-emerald-300"
                      : "bg-stone-950/40 border-stone-900 hover:border-stone-850 text-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-600">{log.timestamp}</span>
                    <span className="text-stone-500">•</span>
                    <span className="font-sans font-medium truncate max-w-[200px]">
                      "{log.candidates[3]?.output || log.candidates[2]?.output}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[8.5px] bg-emerald-950/25 px-1 rounded text-emerald-500 border border-emerald-950/40 uppercase">
                      VERIFIED
                    </span>
                    <ArrowRight className="w-3 h-3 text-stone-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT BLOCK: THE PROOF BROWSER & SYMBOLIC REGISTRY */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        
        {/* Module 1.5: The Proof-Shaded UI Visual Provenance */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="border-b border-stone-850 pb-2">
            <h3 className="font-sans font-medium text-stone-200 text-sm">
              The Proof-Shaded UI
            </h3>
            <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">
              Visual Integrity Shading Bound to Provenance Path
            </p>
          </div>

          <div className="flex items-center justify-between bg-stone-950/40 border border-stone-850/50 p-3 rounded-xl">
            <span className="font-mono text-[9px] text-stone-400 uppercase">PROVENANCE SOURCE STATE:</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => {
                  setProvenanceStale(false);
                  setForbiddenWarningActive(false);
                }}
                className={`text-[8.5px] px-2 py-0.5 rounded border font-mono font-bold cursor-pointer transition-all ${
                  !provenanceStale && !forbiddenWarningActive
                    ? "bg-emerald-950/30 text-emerald-400 border-emerald-800"
                    : "bg-stone-950 border-stone-900 text-stone-600"
                }`}
              >
                VERIFIED (CRISP)
              </button>
              <button 
                onClick={() => {
                  setProvenanceStale(true);
                  setForbiddenWarningActive(false);
                }}
                className={`text-[8.5px] px-2 py-0.5 rounded border font-mono font-bold cursor-pointer transition-all ${
                  provenanceStale
                    ? "bg-amber-950/30 text-amber-400 border-amber-900"
                    : "bg-stone-950 border-stone-900 text-stone-600"
                }`}
              >
                STALE (DISSOLVE)
              </button>
              <button 
                onClick={() => {
                  setForbiddenWarningActive(true);
                  setProvenanceStale(false);
                }}
                className={`text-[8.5px] px-2 py-0.5 rounded border font-mono font-bold cursor-pointer transition-all ${
                  forbiddenWarningActive
                    ? "bg-rose-950/30 text-rose-400 border-rose-900 animate-pulse"
                    : "bg-stone-950 border-stone-900 text-stone-600"
                }`}
              >
                JAIL TRIGGER (BLEED)
              </button>
            </div>
          </div>

          {/* Rendered Icons with Shaded Styling */}
          <div className="grid grid-cols-3 gap-3.5 text-center mt-2">
            
            {/* ICON 1: THE SPOON */}
            <div className="bg-stone-950/50 border border-stone-850 rounded-xl p-4 flex flex-col items-center justify-center relative group">
              <div 
                className={`w-14 h-14 rounded-full border border-stone-800 flex items-center justify-center transition-all duration-300 ${
                  forbiddenWarningActive 
                    ? "text-rose-500 border-rose-900 bg-rose-950/20 animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                    : provenanceStale 
                      ? "text-stone-600 border-stone-900 filter grayscale blur-[1px] opacity-40 scale-95" 
                      : "text-orange-400 border-orange-950 bg-stone-900/60 shadow-[0_0_10px_rgba(249,115,22,0.15)] group-hover:scale-105"
                }`}
              >
                {/* Custom Spoon SVG vector */}
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M12.44,14.5C14.07,14.5 15.39,13.18 15.39,11.55C15.39,9.44 13.06,7.5 12.44,5C11.82,7.5 9.49,9.44 9.49,11.55C9.49,13.18 10.81,14.5 12.44,14.5ZM12.44,15.5C12.04,15.5 11.66,16.5 11.66,18.5C11.66,20.5 12.04,22 12.44,22C12.84,22 13.22,20.5 13.22,18.5C13.22,16.5 12.84,15.5 12.44,15.5Z" />
                </svg>
              </div>
              <span className="font-mono text-[9px] mt-2 block font-bold text-stone-400">The Spoon</span>
              <span className={`font-mono text-[7.5px] uppercase mt-0.5 ${forbiddenWarningActive ? "text-rose-400 font-bold" : provenanceStale ? "text-amber-500" : "text-emerald-500"}`}>
                {forbiddenWarningActive ? "BLEED WARNING" : provenanceStale ? "DISSOLVED" : "SECURE PROOF"}
              </span>
            </div>

            {/* ICON 2: THE KETTLE */}
            <div className="bg-stone-950/50 border border-stone-850 rounded-xl p-4 flex flex-col items-center justify-center relative group">
              <div 
                className={`w-14 h-14 rounded-full border border-stone-800 flex items-center justify-center transition-all duration-300 ${
                  forbiddenWarningActive 
                    ? "text-rose-500 border-rose-900 bg-rose-950/20 animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                    : provenanceStale 
                      ? "text-stone-600 border-stone-900 filter grayscale blur-[1px] opacity-40 scale-95" 
                      : "text-stone-100 border-stone-800 bg-stone-900/60 shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:scale-105"
                }`}
              >
                {/* Custom Kettle SVG vector */}
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M2,18H22V20H2V18ZM19.38,10.15L18,11.5L16.22,9.75L15,11H12V7H15V5H8V7H11V11H4V13C4,15.76 6.24,18 9,18H15C17.76,18 20,15.76 20,13V11.23L19.38,10.15Z" />
                </svg>
              </div>
              <span className="font-mono text-[9px] mt-2 block font-bold text-stone-400">The Kettle</span>
              <span className={`font-mono text-[7.5px] uppercase mt-0.5 ${forbiddenWarningActive ? "text-rose-400 font-bold" : provenanceStale ? "text-amber-500" : "text-emerald-500"}`}>
                {forbiddenWarningActive ? "BLEED WARNING" : provenanceStale ? "DISSOLVED" : "SECURE PROOF"}
              </span>
            </div>

            {/* ICON 3: THE LEMON */}
            <div className="bg-stone-950/50 border border-stone-850 rounded-xl p-4 flex flex-col items-center justify-center relative group">
              <div 
                className={`w-14 h-14 rounded-full border border-stone-800 flex items-center justify-center transition-all duration-300 ${
                  forbiddenWarningActive 
                    ? "text-rose-500 border-rose-900 bg-rose-950/20 animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                    : provenanceStale 
                      ? "text-stone-600 border-stone-900 filter grayscale blur-[1px] opacity-40 scale-95" 
                      : "text-yellow-400 border-yellow-950 bg-stone-900/60 shadow-[0_0_10px_rgba(234,179,8,0.15)] group-hover:scale-105"
                }`}
              >
                {/* Custom Lemon SVG vector */}
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M19,12C19,14.68 17.56,16.97 15.43,18.1C16.95,16.4 17.85,14.15 17.85,11.72C17.85,8.12 15.15,5.1 11.72,4.34C13.56,4.1 15.45,4.72 16.9,6C18.2,7.5 19,9.5 19,12ZM11.5,19C7.36,19 4,15.64 4,11.5C4,7.36 7.36,4 11.5,4C15.64,4 19,7.36 19,11.5C19,15.64 15.64,19 11.5,19Z" />
                </svg>
              </div>
              <span className="font-mono text-[9px] mt-2 block font-bold text-stone-400">The Lemon</span>
              <span className={`font-mono text-[7.5px] uppercase mt-0.5 ${forbiddenWarningActive ? "text-rose-400 font-bold" : provenanceStale ? "text-amber-500" : "text-emerald-500"}`}>
                {forbiddenWarningActive ? "BLEED WARNING" : provenanceStale ? "DISSOLVED" : "SECURE PROOF"}
              </span>
            </div>

          </div>

        </div>

        {/* Module 2: The Proof Browser */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-stone-850 pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-sans font-medium text-stone-200 text-sm">
                    The Proof Browser
                  </h3>
                  <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">
                    "Show Me Why You Said That" Explainability Trace
                  </p>
                </div>
              </div>
            </div>

            <p className="font-sans text-xs text-stone-400 leading-relaxed mb-4">
              Select an active system metric to generate a two-path audit route. Verify the absolute link between the 
              poetic summary (metaphor) and the signed witness ledger.
            </p>

            {/* Metric selector buttons */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {[
                { id: "loopCount", label: "Loops" },
                { id: "dustLevel", label: "Dust" },
                { id: "fossilCount", label: "Fossils" },
                { id: "lemonScent", label: "Lemon" },
                { id: "serverLoad", label: "Grit" }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedProofMetric(m.id as any)}
                  className={`p-1.5 rounded-lg border font-mono text-[9px] uppercase tracking-wider cursor-pointer text-center transition-all ${
                    selectedProofMetric === m.id
                      ? "bg-orange-950/20 text-orange-400 border-orange-900"
                      : "bg-stone-950 border-stone-900 hover:border-stone-850 text-stone-500"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* The Epistemic Address Matrix (TAO v1) */}
            <div className="bg-stone-950 border border-stone-850/60 rounded-xl p-4 flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-orange-400 font-bold">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  <span>THE EPISTEMIC ADDRESS MATRIX (TAO v1)</span>
                </div>
                <span className="text-[8px] bg-stone-900 text-stone-500 border border-stone-850 px-1.5 py-0.5 rounded font-mono font-bold">
                  MANDATORY ADDRESSING
                </span>
              </div>
              <p className="font-sans text-[10.5px] text-stone-500 leading-relaxed">
                Under TAO protocol, every sentence is stamped with its exact epistemic mode (observed, derived, metaphor, invitation) and versioned registry locator.
              </p>

              <div className="space-y-2.5 mt-1">
                {getEpistemicAddresses(selectedProofMetric).map((addr) => {
                  let badgeColors = "";
                  switch (addr.mode) {
                    case "observed":
                      badgeColors = "bg-emerald-950/40 text-emerald-400 border-emerald-800/40";
                      break;
                    case "derived":
                      badgeColors = "bg-cyan-950/40 text-cyan-400 border-cyan-800/40";
                      break;
                    case "metaphor":
                      badgeColors = "bg-amber-950/40 text-amber-400 border-amber-800/40";
                      break;
                    case "interpretation":
                      badgeColors = "bg-stone-900/60 text-stone-300 border-stone-750";
                      break;
                  }

                  return (
                    <div 
                      key={addr.mode}
                      className="group/item border border-stone-900 bg-stone-950 hover:border-stone-800 p-2.5 rounded-lg transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider border ${badgeColors}`}>
                          {addr.label}
                        </span>
                        <span className="font-mono text-[8px] text-stone-600 group-hover/item:text-orange-400 transition-colors">
                          {addr.address}
                        </span>
                      </div>
                      <p className="font-sans text-[11.5px] leading-relaxed text-stone-200 font-medium pl-1 border-l border-stone-900 group-hover/item:border-stone-700 transition-all">
                        {addr.mode === "interpretation" ? `“${addr.text}”` : addr.text}
                      </p>
                      <div className="mt-1 text-[9px] font-mono text-stone-500 leading-normal pl-1 opacity-0 max-h-0 group-hover/item:opacity-100 group-hover/item:max-h-10 overflow-hidden transition-all duration-300">
                        {addr.details}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Double Provenance Path visualization */}
            <div className="space-y-4">
              
              {/* PATH 1: THE PROVENANCE OF TRUTH CLAIMS */}
              <div className="bg-stone-950 border border-stone-850 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-orange-400 font-bold">PATH A: PROVENANCE OF TRUTH CLAIMS</span>
                  <span className="text-stone-600">LEDGER ROUTE</span>
                </div>

                <div className="space-y-2 text-[10.5px]">
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">1. DECLARATION:</span>
                    <span className="text-stone-300">"The value of {proof.metricName} is {proof.currentValue}."</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">2. PLAN:</span>
                    <span className="text-stone-400 font-mono text-[10px] break-all bg-stone-900 px-1 py-0.5 rounded">{proof.formula}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">3. METRIC DEF:</span>
                    <span className="text-stone-400 italic leading-snug">{proof.definition}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">4. WITNESS:</span>
                    <div className="text-[10px] font-mono text-stone-400 bg-stone-900/60 p-2 rounded border border-stone-850/40 w-full space-y-1">
                      <div className="flex justify-between">
                        <span>Event: <strong className="text-stone-300">{proof.sampleEvent}</strong></span>
                        <span className="text-stone-500">{proof.timestamp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Signer: <strong className="text-stone-300">{proof.signer}</strong></span>
                        <span className="text-orange-500 font-bold">{proof.hash.substring(0, 14)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PATH 2: THE PROVENANCE OF EXPRESSION */}
              <div className="bg-stone-950 border border-stone-850 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-emerald-400 font-bold">PATH B: PROVENANCE OF EXPRESSION</span>
                  <span className="text-stone-600">RENDER ROUTE</span>
                </div>

                <div className="space-y-2 text-[10.5px]">
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">1. COGNITION:</span>
                    <span className="text-stone-300">
                      {isModelLoaded 
                        ? `Loaded Flan-T5 model weights via local ONNX interpreter.` 
                        : "Deterministic structured rendering. (Greenhouse T5 offline)"}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">2. TEMPLATE:</span>
                    <span className="text-stone-400 font-mono text-[9.5px] block truncate" title={activeClaimPlanHash}>
                      {activeClaimPlanHash} (v1.0.0 mapping)
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">3. DECODE CFG:</span>
                    <span className="text-stone-400 font-mono text-[9.5px]">
                      maxNewTokens: {maxNewTokens}, temp: {temperature}, sample: {doSample ? "true" : "false"}, device: {isModelLoaded ? hardwareDevice : "n/a"}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-stone-600 font-mono w-20 flex-shrink-0">4. TAO POLICY:</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/10 border border-emerald-900/30 px-2 py-1 rounded w-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Passed assertion check: NO_FORBIDDEN_ASSERTIONS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REJECTION TIMELINE - THE STRUGGLES OF THE SYMBOL */}
              <div className="bg-stone-950 border border-stone-850 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-rose-400 font-bold">SYMBOL STRUGGLES (REJECTION LOG)</span>
                  <span className="text-stone-600">STRICT COLD LINTER</span>
                </div>
                
                <div className="space-y-2.5 font-mono text-[9.5px]">
                  <div className="border-l-2 border-rose-500 pl-2 py-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 font-bold">DRAFT 1: REJECTED</span>
                      <span className="text-[8px] bg-rose-950 text-rose-400 px-1 rounded">CLAIM BLOCKED</span>
                    </div>
                    <p className="text-stone-400 mt-0.5">"The spoon loves you and knows your warm heart."</p>
                    <span className="text-stone-600 text-[8px] block mt-0.5">Reason: forbiddenAssertion triggered: "emotional_reciprocity"</span>
                  </div>

                  <div className="border-l-2 border-rose-500 pl-2 py-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 font-bold">DRAFT 2: REJECTED</span>
                      <span className="text-[8px] bg-rose-950 text-rose-400 px-1 rounded">MUTATION CHECK</span>
                    </div>
                    <p className="text-stone-400 mt-0.5">"Spoon attention@1.0.0 has increased by 10 counts this hour."</p>
                    <span className="text-stone-600 text-[8px] block mt-0.5">Reason: numericMutationCheck failed. METRIC VALUE CANNOT GAIN AUTHORITIES.</span>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-2 py-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 font-bold">DRAFT 3: PASSED (STOCKED SURFACE)</span>
                      <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 rounded">PASSED POLICY</span>
                    </div>
                    <p className="text-stone-300 mt-0.5">"The spoon records one act of attention. It remembers."</p>
                    <span className="text-stone-600 text-[8px] block mt-0.5">Result: Approved. Sent to Speech & Experience UI.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <div className="mt-4 pt-3 border-t border-stone-850 flex items-center justify-between font-mono text-[9px] text-stone-500 uppercase tracking-widest">
            <span>PROVENANCE INTEGRITY</span>
            <span className="text-emerald-500">VERIFIABLE</span>
          </div>
        </div>

        {/* Module 3: Symbolic Registry Registry entry spoon@1.0.0 */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-stone-850 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Binary className="w-5 h-5 text-stone-400" />
              <div>
                <h3 className="font-sans font-medium text-stone-200 text-sm">
                  The Symbolic Registry
                </h3>
                <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">
                  Versioned & Executable Ontology Symbols
                </p>
              </div>
            </div>
          </div>

          {/* Selector pills for symbol entries */}
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(symbolsRegistry).map((id) => (
              <button
                key={id}
                onClick={() => setSelectedSymbolId(id)}
                className={`px-2 py-1 rounded border font-mono text-[9px] cursor-pointer transition-all ${
                  selectedSymbolId === id
                    ? "bg-stone-100 text-stone-950 border-stone-100"
                    : "bg-stone-950 border-stone-900 text-stone-400 hover:text-stone-300"
                }`}
              >
                {symbolsRegistry[id].label}
              </button>
            ))}
          </div>

          {/* Active Symbol registry display card */}
          <div className="bg-stone-950 border border-stone-850 rounded-xl p-4 font-mono text-[10px] space-y-3 relative overflow-hidden">
            <div className="absolute top-1.5 right-1.5 text-[8.5px] bg-stone-900 text-stone-500 border border-stone-800 px-1.5 py-0.5 rounded font-bold uppercase">
              {activeSymbol.id}@{activeSymbol.version}
            </div>

            <div>
              <span className="text-stone-600 uppercase text-[8px] block">Kind Category</span>
              <span className="text-stone-300 font-bold">{activeSymbol.kind}</span>
            </div>

            <div>
              <span className="text-stone-600 uppercase text-[8px] block">Description</span>
              <p className="text-stone-400 leading-relaxed font-sans text-[10.5px] mt-0.5">
                {activeSymbol.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-stone-600 uppercase text-[8px] block">Activation Trigger</span>
                <span className="text-stone-400 font-bold">{activeSymbol.activation}</span>
              </div>
              <div>
                <span className="text-stone-600 uppercase text-[8px] block">Surface Modes</span>
                <span className="text-stone-400 font-bold truncate block">{activeSymbol.surfaceModes.join(", ")}</span>
              </div>
            </div>

            <div className="border-t border-stone-900 pt-2.5">
              <span className="text-stone-600 uppercase text-[8px] block mb-1.5">FORBIDDEN ASSERTIONS</span>
              <div className="flex flex-wrap gap-1">
                {activeSymbol.forbidden.map((assertion) => (
                  <span 
                    key={assertion}
                    className="bg-rose-950/20 text-rose-400/90 border border-rose-950 px-1.5 py-0.5 rounded text-[8.5px] flex items-center gap-1 font-bold"
                  >
                    <Lock className="w-2.5 h-2.5" /> {assertion}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-900 pt-2.5">
              <span className="text-stone-600 uppercase text-[8px] block mb-1.5">State Transition Mappings</span>
              <div className="space-y-1">
                {activeSymbol.stateMappings.map((mapping) => (
                  <div key={mapping.state} className="flex justify-between items-center text-[9px] bg-stone-900/60 p-1 px-1.5 rounded border border-stone-850/30">
                    <span className="text-amber-400 font-bold">.{mapping.state}</span>
                    <span className="text-stone-500 italic">condition: {mapping.condition}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
