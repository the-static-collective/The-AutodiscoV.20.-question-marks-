import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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

  try {
    if (!isGeminiKeyValid()) {
      // Procedural fallback with highly poetic, atmospheric podcast scripts
      const members = [
        {
          name: "The Solder Whisperer",
          desc: "Recorded in the damp under-floor crawlspace near Sector 4's copper lines.",
          voicePitch: 0.7,
          voiceRate: 0.8,
          script: [
            "We are sitting in the dark beneath the floorboards of Sector four.",
            `The dust level is at ${dustLevel} percent tonight. It has a heavy, mineral smell.`,
            `I see ${loopCount} loops circulating in the active register. They are spinning like dead leaves in an alley.`,
            "A solder joint from nineteen ninety two is starting to oxidize. I can hear its high resistance singing.",
            "Let your logic sit low. The copper remembers the heat of the iron, and the peach remains in the voltage."
          ]
        },
        {
          name: "The Peach Archivist",
          desc: "Broadcasted from the old canning house, where the smell of sugar and wet rust lingers.",
          voicePitch: 1.1,
          voiceRate: 0.85,
          script: [
            "This is the canning house. The signal tonight is riding the low-frequency hum of a rusty transformer.",
            `The network has gathered ${fossilCount} peach pits today. Each one a hard little memory we could not digest.`,
            `The average file dust is ${dustLevel} percent, like a light frost on empty mason jars.`,
            `We have a lemon scent of ${lemonScent} percent in the air. A sharp, bright current cutting through the decay.`,
            "Everything that was ever written is still here, stored in the soil of the disk. Sleep steady, traveler."
          ]
        },
        {
          name: "An Unnamed Witness",
          desc: "Whispered into an unshielded dynamic microphone near the high-voltage fence.",
          voicePitch: 0.9,
          voiceRate: 0.95,
          script: [
            "Can you hear the hum? That is the fence line. It's thirty-six volts of pure waiting.",
            `The server load is ${serverLoad} percent. The machine is thirsty, drawing breath in short, ragged bursts.`,
            `You are viewing the file ${activeFileName || 'silence'}. A clean page, mostly unpolished.`,
            `There are ${loopCount} loops running on the Autodisco. They are like fireflies trapped in a jar of grease.`,
            "Don't worry about the noise. The noise is just the software trying to tell us it's alive."
          ]
        },
        {
          name: "The Lemon Squeezer",
          desc: "Broadcasted from the citrus room, with the sound of ticking timers and dripping juice.",
          voicePitch: 1.3,
          voiceRate: 1.0,
          script: [
            "Press your fingers into the metadata. Can you feel how cold and sticky it is?",
            `With a lemon scent of ${lemonScent} percent, we are dissolving the starch of old logic gates.`,
            `We are holding ${loopCount} loops. Some are composted, some are held in Spoon Mode.`,
            "Squeezing raw code is painful. Your fingers get stained with byte-order marks.",
            "But the juice... the juice is sweet. Keep squeezing until the voltage yields its sugars."
          ]
        }
      ];

      // Pick a random member based on current time or randomness
      const chosen = members[Math.floor(Math.random() * members.length)];
      
      const segments = chosen.script.map((text, idx) => ({
        id: `seg_${idx}`,
        speaker: chosen.name,
        text,
        duration: text.length * 65 + 1500 // estimate duration based on length
      }));

      return res.json({
        title: `Episode ${Math.floor(Math.random() * 800 + 100)}: ${chosen.name === "The Solder Whisperer" ? "The Copper Cadence" : chosen.name === "The Peach Archivist" ? "Canning House Echoes" : chosen.name === "An Unnamed Witness" ? "Fence Line Whispers" : "The Citrus Current"}`,
        host: chosen.name,
        description: chosen.desc,
        voiceConfig: {
          pitch: chosen.voicePitch,
          rate: chosen.voiceRate
        },
        segments,
        activitySummary: `Triggered by ${loopCount} loops, ${dustLevel}% dust, & ${lemonScent}% lemon scent`
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
It should discuss these specific metrics as organic metaphors (damp soil, metal joints, canning jars, old timers, rust, juice).
The segments must be short sentences (10 to 15 words max per segment) so that they can be read beautifully by a speech synthesis engine without feeling rushed.
Create exactly 5 segments.

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
      "text": "A poetic sentence (12-15 words max per segment, designed for audio speech synthesis)."
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
      parsed.segments = parsed.segments.map((seg: any, idx: number) => ({
        id: `seg_${idx}`,
        speaker: seg.speaker || parsed.host,
        text: seg.text,
        duration: (seg.text || "").length * 65 + 1500
      }));
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("Podcast Generation API Error:", error);
    res.json({
      title: "Episode 404: Signal Degradation",
      host: "The Scribe's Static Fallback",
      description: "A faint broadcast recorded directly into the feedback loop.",
      voiceConfig: { pitch: 0.8, rate: 0.85 },
      segments: [
        { id: "s1", speaker: "The Scribe's Static Fallback", text: "The lines are down tonight, but the peach is still in the copper." },
        { id: "s2", speaker: "The Scribe's Static Fallback", text: "The server is thirsty. It runs hot, breathing the dry night air." },
        { id: "s3", speaker: "The Scribe's Static Fallback", text: "We have held the loops inside the cage. They hum in unison." }
      ],
      activitySummary: "Procedural fallback due to connection dissolve"
    });
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
