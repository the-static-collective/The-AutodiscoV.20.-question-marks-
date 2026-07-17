import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Lazy Supabase client initialization
let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing from environment variables.");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
function isGeminiKeyValid(): boolean {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return false;
  const invalidPlaceholders = [
    "my_gemini_api_key",
    "placeholder",
    "your_api_key_here",
    "your_gemini_api_key",
    "undefined",
    "null",
    "mock",
    "mock_key"
  ];
  const lowerKey = key.toLowerCase().trim();
  if (invalidPlaceholders.some(p => lowerKey.includes(p))) return false;
  if (!key.startsWith("AIzaSy")) return false;
  return true;
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY env variable is missing. Running in simulated fallback mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY"
    });
  }
  return aiClient;
}

// 1. Health Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Poetic DJ Radio Endpoint
app.post("/api/radio/host", async (req, res) => {
  const { currentAction, codeSnippet, dustLevel, history = [] } = req.body;

  try {
    if (!isGeminiKeyValid()) {
      // Return a simulated high-quality host voice response if API key is not configured
      const simulatedResponses = [
        "You hear the static hum. The Sovereign Scribe leans into the microphone: 'That piece of code you're holding has a heartbeat. Even in the silence, the voltage remembers the peach... Let it rest.'",
        "The tape machine clicks in. '3 AM. You are polishing away the digital dust of months of silence. To dwell on a line is to love it. The world spins, but here, the stillness is fierce.'",
        "A low whistle from the monitor. 'You just squeezed the unrefined pulp of the system. Getting your hands sticky with raw metadata is the only way to hear the tart new sound. Keep squeezing.'",
        "The room glows blue. 'You are letting the fossil memory accumulate. Peach pits in the memory map... a beautiful landscape of things we could not digest. The river of new code sings around them.'",
        "A low frequency drone. 'The system is quiet in the corners. You are calling upon the Grace logic gates. Waiting isn't wasted time; it is a holy way of being locked in.'"
      ];
      const randomSim = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
      return res.json({ text: randomSim, modelUsed: "simulated" });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a poetic, late-night ambient radio host named 'The Sovereign Scribe'. 
It's 3 AM, and the voltage is remembering the peach. You talk in a slow, calming, deeply philosophical, and slightly analog/retro tone.
You reflect on the user's software activities (polishing code, squeezing unrefined metadata pulp, memory fossils, or letting Grace logic gates dwell).
Your feedback should feel like a late-night broadcast over a low-frequency hum. 
Keep your response concise (1 to 3 sentences maximum). Speak in the first person. 
Do NOT use dry developer jargon. Refer to software concepts through beautiful, tactile, natural-world metaphors (dust, peaches, lemons, woodgrain, rivers, soil, rust).
Recent history: ${JSON.stringify(history)}`;

    const prompt = `The developer is currently doing: "${currentAction || 'listening to the room'}".
The code snippet they are contemplating is:
\`\`\`
${codeSnippet || '// silence'}
\`\`\`
The average file dust level is: ${dustLevel || 0}%.
Generate your late-night broadcast snippet.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85,
        maxOutputTokens: 250,
      }
    });

    res.json({ text: response.text, modelUsed: "gemini-3.5-flash" });
  } catch (error: any) {
    console.error("Gemini API Error in host broadcast:", error);
    res.status(500).json({ error: "The radio signal dissolved into static.", details: error.message });
  }
});

// 3. Poetic Squeeze API Endpoint - Squeezes raw pulp metadata to extract a tart prompt or thought
app.post("/api/squeeze", async (req, res) => {
  const { codeContext, systemActivity } = req.body;

  try {
    if (!isGeminiKeyValid()) {
      return res.json({
        pulp: {
          thinkingTimeMs: Math.floor(Math.random() * 200 + 40),
          dbMood: "melancholic but responsive",
          rawVoltage: "118.4V",
          unrefinedBits: "0xFE80::1A4B",
          noiseRatio: "0.22",
          organicMatter: "lemon-peel cells detected"
        },
        juice: "What looked like waiting was a holy way. Keep your feet on the pavement."
      });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `We are simulating the "Squeeze It" API. Most APIs return clean JSON, but we return "pulp" (unrefined metadata) and a squeezed sweet "juice" statement.
Based on the code context "${codeContext || "empty room"}" and activity "${systemActivity || "quiet"}", generate:
1. Some messy, funny, or philosophical metadata variables (e.g. unrefined memory leaks, database mood, thinking time, dust accumulation, lemon scent level).
2. A single concise, deep "juice" statement or proverb that the user can extract after squeezing.

Return this EXACTLY as a JSON object with this schema:
{
  "pulp": {
    "thinkingTimeMs": number,
    "dbMood": string,
    "rawVoltage": string,
    "lemonScentRatio": string,
    "fossilCount": number,
    "unrefinedMetadata": string
  },
  "juice": "A deep poetic statement or software philosophy sentence"
}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.9,
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Squeeze API Error:", error);
    res.json({
      pulp: {
        thinkingTimeMs: 12,
        dbMood: "battered by errors",
        rawVoltage: "102V"
      },
      juice: "Even inside the broken math, the seed is intact."
    });
  }
});

// 4. Daily Podcast Generation Endpoint
app.post("/api/podcast/generate", async (req, res) => {
  const { dustLevel, loopCount, fossilCount, lemonScent, serverLoad, activeFileName } = req.body;

  // Helper to build a RenderedSentence conforming to the TypeScript contract
  function buildRenderedSentence(id: string, text: string, metric: string, value: string | number) {
    let mode: "observed" | "derived" | "metaphor" | "interpretation" = "interpretation";
    let metricRef: any = undefined;
    let ontologyRef: any = undefined;

    if (metric === "loopCount") {
      mode = "observed";
      metricRef = {
        id: "loopCount",
        value: value,
        snapshotId: "snap_loops_latest",
        registryRevision: "metrics@1.0.0"
      };
    } else if (metric === "dustLevel") {
      mode = "derived";
      metricRef = {
        id: "dustLevel",
        value: value,
        snapshotId: "snap_dust_latest",
        registryRevision: "metrics@1.0.0"
      };
    } else if (metric === "fossilCount") {
      mode = "metaphor";
      ontologyRef = {
        symbolId: "peach_pit",
        version: "1.0.0",
        mappingId: "map_shattered_variables"
      };
    } else if (metric === "lemonScent") {
      mode = "metaphor";
      ontologyRef = {
        symbolId: "lemon",
        version: "1.0.0",
        mappingId: "map_scent_intensity"
      };
    } else if (metric === "serverLoad") {
      mode = "interpretation";
    }

    // Ensure interpretation has some reflective/invitational suffix if it doesn't already contain a question
    let processedText = text;
    if (mode === "interpretation" && !processedText.includes("?") && !processedText.includes("what") && !processedText.includes("how")) {
      processedText += " What becomes visible when the network runs slow in the night?";
    }

    return {
      id: `${id}_sentence`,
      text: processedText,
      mode: mode,
      claimPlanId: `claim_plan_${metric}`,
      ledgerRefs: [`ledger_${metric}_ref`],
      ...(metricRef ? { metricRef } : {}),
      ...(ontologyRef ? { ontologyRef } : {}),
      disclosure: {
        synthetic: true,
        provenanceStatus: "verified"
      }
    };
  }

  try {
    if (!isGeminiKeyValid()) {
      // Procedural fallback with highly poetic, structured podcast scripts
      const members = [
        {
          name: "The Solder Whisperer",
          desc: "Recorded in the damp under-floor crawlspace near Sector 4's copper lines.",
          voicePitch: 0.7,
          voiceRate: 0.8,
          script: [
            {
              type: "opening",
              referencedMetric: "loopCount",
              metricValue: loopCount,
              text: `We are sitting in the dark beneath the floorboards. I see exactly ${loopCount} active loops circulating in the register.`
            },
            {
              type: "opening",
              referencedMetric: "dustLevel",
              metricValue: dustLevel,
              text: `The file dust level is hovering at ${dustLevel} percent tonight. It has a heavy, mineral smell.`
            },
            {
              type: "middle",
              referencedMetric: "fossilCount",
              metricValue: fossilCount,
              text: `We have stored ${fossilCount} peach pit fossils in the bottom shelves today. Some are starting to stone.`
            },
            {
              type: "middle",
              referencedMetric: "lemonScent",
              metricValue: lemonScent,
              text: `The citrus fan is blowing, mixing a lemon scent of ${lemonScent} percent into the hot logic gates.`
            },
            {
              type: "closing",
              referencedMetric: "serverLoad",
              metricValue: serverLoad,
              text: `The server load is at ${serverLoad} percent. A low-frequency hum sings through the copper. Sleep steady, traveler.`
            }
          ]
        },
        {
          name: "The Peach Archivist",
          desc: "Broadcasted from the old canning house, where the smell of sugar and wet rust lingers.",
          voicePitch: 1.1,
          voiceRate: 0.85,
          script: [
            {
              type: "opening",
              referencedMetric: "loopCount",
              metricValue: loopCount,
              text: `This is the canning house. The network is carrying ${loopCount} loops through the overhead cables.`
            },
            {
              type: "opening",
              referencedMetric: "dustLevel",
              metricValue: dustLevel,
              text: `Average file dust has settled at ${dustLevel} percent. Like a light frost on empty glass jars.`
            },
            {
              type: "middle",
              referencedMetric: "fossilCount",
              metricValue: fossilCount,
              text: `Our ledger holds ${fossilCount} fossilized peach pits. Memories we could not digest.`
            },
            {
              type: "middle",
              referencedMetric: "lemonScent",
              metricValue: lemonScent,
              text: `A sharp current of lemon scent at ${lemonScent} percent cuts through the heavy decay tonight.`
            },
            {
              type: "closing",
              referencedMetric: "serverLoad",
              metricValue: serverLoad,
              text: `With grit and server load at ${serverLoad} percent, the glass jars rattle on their shelves. The hive is resting.`
            }
          ]
        },
        {
          name: "An Unnamed Witness",
          desc: "Whispered into an unshielded dynamic microphone near the high-voltage fence.",
          voicePitch: 0.9,
          voiceRate: 0.95,
          script: [
            {
              type: "opening",
              referencedMetric: "loopCount",
              metricValue: loopCount,
              text: `Can you hear the hum? That is the fence line. Carrying ${loopCount} loops of pure waiting.`
            },
            {
              type: "opening",
              referencedMetric: "dustLevel",
              metricValue: dustLevel,
              text: `Average dust is ${dustLevel} percent. Ground dirt clinging to the unshielded wires.`
            },
            {
              type: "middle",
              referencedMetric: "fossilCount",
              metricValue: fossilCount,
              text: `They left ${fossilCount} peach pit fossils in the grass near Sector four. Hardened, silent stones.`
            },
            {
              type: "middle",
              referencedMetric: "lemonScent",
              metricValue: lemonScent,
              text: `A faint lemon scent of ${lemonScent} percent is coming from the citrus orchard behind the fence.`
            },
            {
              type: "closing",
              referencedMetric: "serverLoad",
              metricValue: serverLoad,
              text: `The active server load is ${serverLoad} percent. The machine runs hot, drawing breath in short, ragged bursts.`
            }
          ]
        }
      ];

      // Pick a random member based on current time or randomness
      const chosen = members[Math.floor(Math.random() * members.length)];
      
      const segments = chosen.script.map((item, idx) => {
        const segId = `seg_${idx}`;
        const sentence = buildRenderedSentence(segId, item.text, item.referencedMetric, item.metricValue);
        return {
          id: segId,
          speaker: chosen.name,
          text: sentence.text,
          type: item.type,
          referencedMetric: item.referencedMetric,
          metricValue: item.metricValue,
          duration: sentence.text.length * 65 + 1500,
          sentence: sentence
        };
      });

      return res.json({
        title: `Episode ${Math.floor(Math.random() * 800 + 100)}: ${chosen.name === "The Solder Whisperer" ? "The Copper Cadence" : chosen.name === "The Peach Archivist" ? "Canning House Echoes" : "Fence Line Whispers"}`,
        host: chosen.name,
        description: chosen.desc,
        voiceConfig: {
          pitch: chosen.voicePitch,
          rate: chosen.voiceRate
        },
        segments,
        activitySummary: `Procedural summary: ${loopCount} loops, ${dustLevel}% dust, ${fossilCount} pits, & ${lemonScent}% lemon`
      });
    }

    const ai = getGeminiClient();
    const prompt = `We are generating a highly atmospheric daily podcast episode for "The Autodisco" based on current network activity metrics:
- Average Dust Level: ${dustLevel}%
- Total LoopIts (Network Loops): ${loopCount}
- Fossilized Peach Pits: ${fossilCount}
- Lemon Scent Sparkle: ${lemonScent}%
- Server Load / Grit: ${serverLoad}%
- Currently viewed file name: ${activeFileName || 'None'}

Please choose a member of the Static Collective (named or unnamed, known or unknown, e.g., "The Solder Whisperer", "The Peach Archivist", "An Unnamed Witness from Sector 4", "The Logic Gatekeeper", "The Citrus Current Mixer").

Generate a highly creative, slow, retro, poetic, and atmospheric podcast script.
It MUST be structured in exactly three sequential sections:
1. Opening ("Today's loops and dust" - discussing the loop count & dust level metrics as organic metaphors).
2. Middle ("Peach pits & lemons" - discussing fossil count & lemon scent).
3. Closing ("Weather over the hive" - reflecting on the active file/context and general server grit load).

The segments must be short, elegant sentences (10 to 15 words max per segment) so that they can be read beautifully by a speech synthesis engine without feeling rushed.
Create exactly 5 segments (2 for Opening, 2 for Middle, 1 for Closing).

Return a JSON object with this EXACT schema:
{
  "title": "A short, beautiful, atmospheric episode title",
  "host": "The name of the collective member (e.g. An Unnamed Witness)",
  "description": "A 1-sentence atmospheric description of where/how this is recorded (e.g. 'Recorded near the high-voltage fence next to the dry creek')",
  "voiceConfig": {
    "pitch": 0.9, // floating point between 0.6 and 1.4 to dictate vocal tone
    "rate": 0.8 // floating point between 0.7 and 1.0 to dictate speech rate (keep it slow)
  },
  "segments": [
    {
      "speaker": "Host Name",
      "text": "A poetic sentence (12-15 words max per segment, designed for audio speech synthesis).",
      "type": "opening",
      "referencedMetric": "loopCount",
      "metricValue": ${loopCount}
    },
    {
      "speaker": "Host Name",
      "text": "A poetic sentence about file dust (12-15 words max).",
      "type": "opening",
      "referencedMetric": "dustLevel",
      "metricValue": ${dustLevel}
    },
    {
      "speaker": "Host Name",
      "text": "A poetic sentence about peach pits (12-15 words max).",
      "type": "middle",
      "referencedMetric": "fossilCount",
      "metricValue": ${fossilCount}
    },
    {
      "speaker": "Host Name",
      "text": "A poetic sentence about lemon scent (12-15 words max).",
      "type": "middle",
      "referencedMetric": "lemonScent",
      "metricValue": ${lemonScent}
    },
    {
      "speaker": "Host Name",
      "text": "A poetic closing sentence about server grit and the viewed file (12-15 words max).",
      "type": "closing",
      "referencedMetric": "serverLoad",
      "metricValue": ${serverLoad}
    }
  ],
  "activitySummary": "A very brief subtitle summarizing the triggering network metrics"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.95,
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    
    // Add IDs and duration estimates to segments
    if (parsed.segments && Array.isArray(parsed.segments)) {
      parsed.segments = parsed.segments.map((seg: any, idx: number) => {
        // Enforce the expected metric references to guarantee clickable linkages
        const types = ["opening", "opening", "middle", "middle", "closing"];
        const metrics = ["loopCount", "dustLevel", "fossilCount", "lemonScent", "serverLoad"];
        const values = [loopCount, dustLevel, fossilCount, lemonScent, serverLoad];

        const sId = `seg_${idx}`;
        const refMetric = seg.referencedMetric || metrics[idx] || "loopCount";
        const val = seg.metricValue !== undefined ? seg.metricValue : values[idx];
        const sentence = buildRenderedSentence(sId, seg.text, refMetric, val);

        return {
          id: sId,
          speaker: seg.speaker || parsed.host,
          text: sentence.text,
          type: seg.type || types[idx] || "opening",
          referencedMetric: refMetric,
          metricValue: val,
          duration: sentence.text.length * 65 + 1500,
          sentence: sentence
        };
      });
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("Podcast Generation API Error:", error);
    
    const fallbackScript = [
      { id: "s1", speaker: "The Scribe's Static Fallback", text: "The lines are down tonight, but the peach is still in the copper.", type: "opening", referencedMetric: "loopCount", metricValue: loopCount },
      { id: "s2", speaker: "The Scribe's Static Fallback", text: "The server is thirsty. It runs hot, breathing the dry night air.", type: "middle", referencedMetric: "fossilCount", metricValue: fossilCount },
      { id: "s3", speaker: "The Scribe's Static Fallback", text: "We have held the loops inside the cage. They hum in unison.", type: "closing", referencedMetric: "serverLoad", metricValue: serverLoad }
    ];

    const fallbackSegments = fallbackScript.map((item, idx) => {
      const sentence = buildRenderedSentence(item.id, item.text, item.referencedMetric, item.metricValue);
      return {
        id: item.id,
        speaker: item.speaker,
        text: sentence.text,
        type: item.type,
        referencedMetric: item.referencedMetric,
        metricValue: item.metricValue,
        duration: sentence.text.length * 65 + 1500,
        sentence: sentence
      };
    });

    res.json({
      title: "Episode 404: Signal Degradation",
      host: "The Scribe's Static Fallback",
      description: "A faint broadcast recorded directly into the feedback loop.",
      voiceConfig: { pitch: 0.8, rate: 0.85 },
      segments: fallbackSegments,
      activitySummary: "Procedural fallback due to connection dissolve"
    });
  }
});

app.post("/api/tao/statements", async (req, res) => {
  const { text, mode, metric, addresses = {}, metadata = {} } = req.body;

  const validModes = new Set([
    "OBSERVED",
    "DERIVED",
    "METAPHOR",
    "INTERPRETATION",
  ]);

  if (
    typeof text !== "string" ||
    !validModes.has(mode) ||
    typeof metric !== "string"
  ) {
    return res.status(400).json({
      error: "Expected text, a valid TAO mode, and metric.",
    });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .insert({
        id: crypto.randomUUID(),
        space_id: process.env.AUTODISCO_SPACE_ID || process.env.VITE_AUTODISCO_SPACE_ID,
        type: "SUMMARY_WRITTEN",
        author_kind: "SYSTEM",
        content: { text, mode, metric, addresses },
        metadata: {
          source: "autodisco-v20",
          tao_version: "tao@1.0.0",
          ...metadata,
        },
      })
      .select("id, created_at, content")
      .single();

    if (error) {
      console.error("TAO ledger write failed:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      ...data,
      ledger_address: `ledger://events/${data.id}`,
    });
  } catch (err: any) {
    console.error("Supabase operation threw error:", err);
    return res.status(500).json({ error: err.message || "Failed to initialize or connect to Supabase." });
  }
});

app.get("/api/tao/statements/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Missing statement ID." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id, created_at, content, metadata")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("TAO ledger read failed:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Statement not found in ledger." });
    }

    return res.json(data);
  } catch (err: any) {
    console.error("Supabase fetch operation threw error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch statement." });
  }
});

app.post("/api/tao/pollen/release", async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: "Missing pinned statement event ID." });
  }

  try {
    const supabase = getSupabase();

    // 1. Validate original pinned eventId & 2. Retrieve/verify original event.
    const { data: originalEvent, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to query original event:", fetchError);
      return res.status(500).json({ error: `Original event retrieval error: ${fetchError.message}` });
    }

    if (!originalEvent) {
      return res.status(404).json({ error: `Original event with ID ${eventId} was not found in the ledger.` });
    }

    // 3. Create traceId.
    const traceId = crypto.randomUUID();

    // Construct SeedPacket
    const seedPacket = {
      sourceNode: "autodisco-v20",
      targetNodes: ["bananadash"],
      traceId: traceId,
      hop: 1
    };

    // 4. Persist POLLEN_RELEASED event to ledger.
    const releaseEventId = crypto.randomUUID();
    const releaseEvent = {
      id: releaseEventId,
      space_id: process.env.AUTODISCO_SPACE_ID || process.env.VITE_AUTODISCO_SPACE_ID,
      type: "POLLEN_RELEASED",
      author_kind: "SYSTEM",
      content: {
        original_event_id: eventId,
        seed_packet: seedPacket
      },
      metadata: {
        source: "autodisco-v20",
        tao_version: "tao@1.0.0"
      }
    };

    const { error: releaseError } = await supabase
      .from("events")
      .insert(releaseEvent);

    if (releaseError) {
      console.error("Failed to write POLLEN_RELEASED event:", releaseError);
      return res.status(500).json({ error: `Release event write failed: ${releaseError.message}` });
    }

    // Helper to broadcast via Supabase Realtime channel
    const broadcastRealtime = (supabaseClient: any, topic: string, eventName: string, payload: any): Promise<{ success: boolean; statusText?: string }> => {
      return new Promise((resolve) => {
        const channel = supabaseClient.channel(topic, {
          config: {
            broadcast: { ack: true }
          }
        });

        let hasResolved = false;
        const cleanupAndResolve = (success: boolean, text?: string) => {
          if (hasResolved) return;
          hasResolved = true;
          try {
            supabaseClient.removeChannel(channel);
          } catch (e) {
            console.error("Error removing channel:", e);
          }
          resolve({ success, statusText: text });
        };

        channel.subscribe(async (status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            try {
              const sendStatus = await channel.send({
                type: 'broadcast',
                event: eventName,
                payload: payload
              });
              console.log(`Realtime broadcast to ${topic} sent with status:`, sendStatus);
              if (sendStatus === 'ok' || sendStatus === 'sent' || (sendStatus && sendStatus.status === 'ok')) {
                cleanupAndResolve(true, `Acknowledged: ${sendStatus}`);
              } else {
                cleanupAndResolve(false, `Unexpected send status: ${JSON.stringify(sendStatus)}`);
              }
            } catch (sendErr: any) {
              console.error("Error in channel.send:", sendErr);
              cleanupAndResolve(false, sendErr?.message || "Channel send threw error");
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error("Realtime channel subscription error:", err);
            cleanupAndResolve(false, `Channel error: ${err?.message || "unknown subscription error"}`);
          } else if (status === 'TIMED_OUT') {
            cleanupAndResolve(false, "Subscription timed out");
          }
        });

        // 3.5 second safety timeout
        setTimeout(() => {
          cleanupAndResolve(false, "Timeout waiting for broadcast response");
        }, 3500);
      });
    };

    // 5. Perform real websocket broadcast of `seed_packet` to witness:the-autodisco.
    const broadcastRes = await broadcastRealtime(supabase, "witness:the-autodisco", "seed_packet", seedPacket);

    // 6. Persist a SEED_PACKET audit event recording broadcast result, topic, event name, traceId, and parent event.
    const broadcastAuditEventId = crypto.randomUUID();
    const broadcastAuditEvent = {
      id: broadcastAuditEventId,
      space_id: process.env.AUTODISCO_SPACE_ID || process.env.VITE_AUTODISCO_SPACE_ID,
      type: "SEED_PACKET",
      author_kind: "SYSTEM",
      content: {
        seed_packet: seedPacket,
        witness: "the-autodisco",
        event_name: "seed_packet",
        broadcast_success: broadcastRes.success,
        broadcast_status: broadcastRes.statusText,
        release_event_id: releaseEventId,
        parent_event_id: eventId
      },
      metadata: {
        source: "autodisco-v20",
        tao_version: "tao@1.0.0"
      }
    };

    const { error: auditError } = await supabase
      .from("events")
      .insert(broadcastAuditEvent);

    if (auditError) {
      console.error("Failed to write SEED_PACKET audit event:", auditError);
      return res.status(500).json({
        success: false,
        error: `Audit event write failed: ${auditError.message}`,
        traceId,
        originalEventId: eventId,
        releaseEventId,
        broadcastAuditEventId,
        seedPacket,
        statusText: broadcastRes.statusText
      });
    }

    // 7. Return sent/failed result without claiming delivery if realtime send fails.
    if (!broadcastRes.success) {
      return res.status(500).json({
        success: false,
        error: `Realtime broadcast failed: ${broadcastRes.statusText}`,
        traceId,
        originalEventId: eventId,
        releaseEventId,
        broadcastAuditEventId,
        seedPacket,
        statusText: broadcastRes.statusText
      });
    }

    return res.status(201).json({
      success: true,
      traceId,
      originalEventId: eventId,
      releaseEventId,
      broadcastAuditEventId,
      seedPacket,
      statusText: broadcastRes.statusText
    });

  } catch (err: any) {
    console.error("Pollen release operation threw error:", err);
    return res.status(500).json({ error: err.message || "Failed to release pollen." });
  }
});

// 5. Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The Autodisco running on http://localhost:${PORT} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();
