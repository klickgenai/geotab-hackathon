import { synthesizeSpeech } from "./tts-synthesize.js";

export type FillerCategory = "general" | "fleet" | "driver" | "risk" | "insurance" | "wellness" | "dispatch" | "load";
export type FillerStage = "initial" | "continuation" | "patience";

interface FillerPhrase {
  text: string;
  category: FillerCategory;
  stage: FillerStage;
  audio: Buffer | null;
}

const FILLER_PHRASES: Array<{ text: string; category: FillerCategory; stage: FillerStage }> = [
  // ── General: initial ──
  { text: "Alright, let me check that.", category: "general", stage: "initial" },
  { text: "Hold on one second.", category: "general", stage: "initial" },
  { text: "Yeah, give me just a moment.", category: "general", stage: "initial" },
  { text: "Okay, let me see here.", category: "general", stage: "initial" },
  { text: "Hmm, let me take a look.", category: "general", stage: "initial" },
  { text: "Sure thing, one moment.", category: "general", stage: "initial" },
  { text: "Great question, let me check.", category: "general", stage: "initial" },
  { text: "Oh interesting, let me look into that.", category: "general", stage: "initial" },
  { text: "Right, let me pull that up.", category: "general", stage: "initial" },
  { text: "Okay, working on that now.", category: "general", stage: "initial" },
  { text: "Good question. One moment.", category: "general", stage: "initial" },
  { text: "Let me dig into that for you.", category: "general", stage: "initial" },

  // ── General: continuation (3-6s wait) ──
  { text: "Still pulling that together.", category: "general", stage: "continuation" },
  { text: "Almost there, just a sec.", category: "general", stage: "continuation" },
  { text: "Still looking into it.", category: "general", stage: "continuation" },
  { text: "Getting the details now.", category: "general", stage: "continuation" },
  { text: "Crunching the numbers.", category: "general", stage: "continuation" },
  { text: "Just a moment longer.", category: "general", stage: "continuation" },

  // ── General: patience (6s+) ──
  { text: "Almost got it, hang tight.", category: "general", stage: "patience" },
  { text: "This one's a bit detailed, bear with me.", category: "general", stage: "patience" },
  { text: "Nearly done processing.", category: "general", stage: "patience" },
  { text: "Thanks for waiting, almost ready.", category: "general", stage: "patience" },

  // ── Fleet: initial ──
  { text: "Let me pull up the fleet data.", category: "fleet", stage: "initial" },
  { text: "Checking the fleet overview now.", category: "fleet", stage: "initial" },
  { text: "Let me see how the fleet is doing.", category: "fleet", stage: "initial" },
  { text: "Sure, checking fleet status.", category: "fleet", stage: "initial" },
  { text: "Right, let me look at the fleet.", category: "fleet", stage: "initial" },
  { text: "Okay, pulling fleet metrics.", category: "fleet", stage: "initial" },
  // Fleet: continuation
  { text: "Still loading the fleet data.", category: "fleet", stage: "continuation" },
  { text: "Gathering fleet metrics, almost there.", category: "fleet", stage: "continuation" },

  // ── Driver: initial ──
  { text: "Let me check that driver's profile.", category: "driver", stage: "initial" },
  { text: "Pulling up the driver data now.", category: "driver", stage: "initial" },
  { text: "Let me see their safety record.", category: "driver", stage: "initial" },
  { text: "Sure, looking at that driver.", category: "driver", stage: "initial" },
  { text: "Okay, checking driver details.", category: "driver", stage: "initial" },
  { text: "Hmm, let me review their history.", category: "driver", stage: "initial" },
  // Driver: continuation
  { text: "Still reviewing the driver data.", category: "driver", stage: "continuation" },
  { text: "Going through their records now.", category: "driver", stage: "continuation" },

  // ── Risk: initial ──
  { text: "Let me analyze the risk data.", category: "risk", stage: "initial" },
  { text: "Checking the safety scores.", category: "risk", stage: "initial" },
  { text: "Let me look at the risk profile.", category: "risk", stage: "initial" },
  { text: "Sure, assessing the risk factors.", category: "risk", stage: "initial" },
  { text: "Right, let me evaluate the risks.", category: "risk", stage: "initial" },
  { text: "Okay, running the risk analysis.", category: "risk", stage: "initial" },
  // Risk: continuation
  { text: "Still analyzing risk factors.", category: "risk", stage: "continuation" },
  { text: "The analysis is running, almost done.", category: "risk", stage: "continuation" },

  // ── Insurance: initial ──
  { text: "Let me pull up the insurance score.", category: "insurance", stage: "initial" },
  { text: "Checking the fleet score now.", category: "insurance", stage: "initial" },
  { text: "Let me see the premium impact.", category: "insurance", stage: "initial" },
  { text: "Sure, reviewing the insurance data.", category: "insurance", stage: "initial" },
  { text: "Okay, looking at insurance metrics.", category: "insurance", stage: "initial" },
  { text: "Right, checking insurance details.", category: "insurance", stage: "initial" },
  // Insurance: continuation
  { text: "Still calculating the scores.", category: "insurance", stage: "continuation" },
  { text: "Running the premium analysis.", category: "insurance", stage: "continuation" },

  // ── Wellness: initial ──
  { text: "Let me check the wellness data.", category: "wellness", stage: "initial" },
  { text: "Looking at the burnout indicators.", category: "wellness", stage: "initial" },
  { text: "Let me see the wellness signals.", category: "wellness", stage: "initial" },
  { text: "Sure, checking wellness scores.", category: "wellness", stage: "initial" },
  { text: "Hmm, let me look at the fatigue data.", category: "wellness", stage: "initial" },
  { text: "Okay, reviewing wellness metrics.", category: "wellness", stage: "initial" },
  // Wellness: continuation
  { text: "Still reviewing wellness indicators.", category: "wellness", stage: "continuation" },
  { text: "Analyzing the patterns, one moment.", category: "wellness", stage: "continuation" },

  // ── Dispatch: initial ──
  { text: "Let me check with dispatch.", category: "dispatch", stage: "initial" },
  { text: "Reaching out to the dispatcher now.", category: "dispatch", stage: "initial" },
  { text: "Let me get an update on that.", category: "dispatch", stage: "initial" },
  { text: "Sure, connecting with dispatch.", category: "dispatch", stage: "initial" },
  { text: "Okay, checking dispatch status.", category: "dispatch", stage: "initial" },
  { text: "Right, getting dispatch info.", category: "dispatch", stage: "initial" },
  // Dispatch: continuation
  { text: "Still coordinating with dispatch.", category: "dispatch", stage: "continuation" },
  { text: "Getting the latest from dispatch.", category: "dispatch", stage: "continuation" },

  // ── Load: initial ──
  { text: "Let me check the load status.", category: "load", stage: "initial" },
  { text: "Pulling up load information.", category: "load", stage: "initial" },
  { text: "Let me see what loads are available.", category: "load", stage: "initial" },
  { text: "Sure, checking load details.", category: "load", stage: "initial" },
  { text: "Okay, looking at the load board.", category: "load", stage: "initial" },
  { text: "Right, let me review the loads.", category: "load", stage: "initial" },
  // Load: continuation
  { text: "Still checking load availability.", category: "load", stage: "continuation" },
  { text: "Gathering load details now.", category: "load", stage: "continuation" },
];

// Map tool names to filler categories
const TOOL_CATEGORY_MAP: Record<string, FillerCategory> = {
  getFleetOverview: "fleet",
  getDriverRiskScore: "driver",
  getFleetInsuranceScore: "insurance",
  getDriverWellness: "wellness",
  getSafetyEvents: "risk",
  getFinancialImpact: "insurance",
  getCoachingRecommendations: "driver",
  generateInsuranceReport: "insurance",
  getDriverDashboard: "driver",
  getLoadUpdates: "load",
  initiateDispatcherCall: "dispatch",
  queryAceAnalytics: "general",
  getFleetComparison: "fleet",
};

class FillerCache {
  private fillers: FillerPhrase[] = [];
  private ready = false;
  private recentlyUsed: string[] = [];  // Track last N used filler texts
  private readonly HISTORY_WINDOW = 5;

  async initialize(): Promise<void> {
    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) {
      console.warn("[FillerCache] No SMALLEST_API_KEY — fillers will be text-only");
      this.fillers = FILLER_PHRASES.map((p) => ({ ...p, audio: null }));
      this.ready = true;
      return;
    }

    console.log(`[FillerCache] Pre-generating ${FILLER_PHRASES.length} filler phrases...`);
    const startTime = Date.now();

    // Generate fillers in small batches to avoid rate limits
    const BATCH_SIZE = 3;
    for (let i = 0; i < FILLER_PHRASES.length; i += BATCH_SIZE) {
      const batch = FILLER_PHRASES.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (phrase) => {
          const buffer = await synthesizeSpeech(apiKey, {
            text: phrase.text,
            voiceId: "sophia",
            sampleRate: 24000,
            speed: 1.0,
            addWavHeader: true,
          });
          return { ...phrase, audio: buffer };
        })
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const phrase = batch[j];
        if (r.status === "fulfilled") {
          this.fillers.push(r.value);
        } else {
          console.warn(`[FillerCache] Failed: "${phrase.text}"`);
          this.fillers.push({ ...phrase, audio: null });
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < FILLER_PHRASES.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const successCount = this.fillers.filter((f) => f.audio !== null).length;
    console.log(
      `[FillerCache] Ready: ${successCount}/${FILLER_PHRASES.length} cached in ${Date.now() - startTime}ms`
    );
    this.ready = true;
  }

  getSmartFiller(toolName?: string, stage: FillerStage = "initial"): { text: string; audio: Buffer | null } | null {
    if (!this.ready || this.fillers.length === 0) return null;

    const category: FillerCategory = toolName
      ? TOOL_CATEGORY_MAP[toolName] || "general"
      : "general";

    // Get fillers for the category + stage
    let candidates = this.fillers.filter((f) => f.category === category && f.stage === stage);

    // Fallback: try general category with same stage
    if (candidates.length === 0) {
      candidates = this.fillers.filter((f) => f.category === "general" && f.stage === stage);
    }

    // Final fallback: any general initial filler
    if (candidates.length === 0) {
      candidates = this.fillers.filter((f) => f.category === "general" && f.stage === "initial");
    }

    if (candidates.length === 0) return null;

    return this.pickWeightedRandom(candidates);
  }

  /**
   * Weighted random selection — avoids recently used fillers.
   * Phrases not in the history window get higher weight.
   */
  private pickWeightedRandom(
    fillers: FillerPhrase[]
  ): { text: string; audio: Buffer | null } {
    // Filter out recently used if possible
    const notRecent = fillers.filter((f) => !this.recentlyUsed.includes(f.text));
    const pool = notRecent.length > 0 ? notRecent : fillers;

    // Random selection from pool
    const index = Math.floor(Math.random() * pool.length);
    const filler = pool[index];

    // Track usage
    this.recentlyUsed.push(filler.text);
    if (this.recentlyUsed.length > this.HISTORY_WINDOW) {
      this.recentlyUsed.shift();
    }

    return { text: filler.text, audio: filler.audio };
  }

  isReady(): boolean {
    return this.ready;
  }
}

export const fillerCache = new FillerCache();
