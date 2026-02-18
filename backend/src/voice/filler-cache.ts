import { synthesizeSpeech } from "./tts-synthesize.js";

export type FillerCategory = "general" | "fleet" | "driver" | "risk" | "insurance" | "wellness" | "dispatch" | "load";

interface FillerPhrase {
  text: string;
  category: FillerCategory;
  audio: Buffer | null;
}

const FILLER_PHRASES: Array<{ text: string; category: FillerCategory }> = [
  // General
  { text: "Alright, let me check that.", category: "general" },
  { text: "Hold on one second.", category: "general" },
  { text: "Yeah, give me just a moment.", category: "general" },
  { text: "Okay, let me see here.", category: "general" },

  // Fleet
  { text: "Let me pull up the fleet data.", category: "fleet" },
  { text: "Checking the fleet overview now.", category: "fleet" },
  { text: "Let me see how the fleet is doing.", category: "fleet" },

  // Driver
  { text: "Let me check that driver's profile.", category: "driver" },
  { text: "Pulling up the driver data now.", category: "driver" },
  { text: "Let me see their safety record.", category: "driver" },

  // Risk
  { text: "Let me analyze the risk data.", category: "risk" },
  { text: "Checking the safety scores.", category: "risk" },
  { text: "Let me look at the risk profile.", category: "risk" },

  // Insurance
  { text: "Let me pull up the insurance score.", category: "insurance" },
  { text: "Checking the fleet score now.", category: "insurance" },
  { text: "Let me see the premium impact.", category: "insurance" },

  // Wellness
  { text: "Let me check the wellness data.", category: "wellness" },
  { text: "Looking at the burnout indicators.", category: "wellness" },
  { text: "Let me see the wellness signals.", category: "wellness" },

  // Dispatch
  { text: "Let me check with dispatch.", category: "dispatch" },
  { text: "Reaching out to the dispatcher now.", category: "dispatch" },
  { text: "Let me get an update on that.", category: "dispatch" },

  // Load
  { text: "Let me check the load status.", category: "load" },
  { text: "Pulling up load information.", category: "load" },
  { text: "Let me see what loads are available.", category: "load" },
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
  private lastUsedIndex: Map<FillerCategory, number> = new Map();

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

  getSmartFiller(toolName?: string): { text: string; audio: Buffer | null } | null {
    if (!this.ready || this.fillers.length === 0) return null;

    const category: FillerCategory = toolName
      ? TOOL_CATEGORY_MAP[toolName] || "general"
      : "general";

    // Get fillers for the category
    const categoryFillers = this.fillers.filter((f) => f.category === category);
    if (categoryFillers.length === 0) {
      // Fallback to general
      const generalFillers = this.fillers.filter((f) => f.category === "general");
      if (generalFillers.length === 0) return null;
      return this.pickRoundRobin(generalFillers, "general");
    }

    return this.pickRoundRobin(categoryFillers, category);
  }

  private pickRoundRobin(
    fillers: FillerPhrase[],
    category: FillerCategory
  ): { text: string; audio: Buffer | null } {
    const lastIndex = this.lastUsedIndex.get(category) ?? -1;
    const nextIndex = (lastIndex + 1) % fillers.length;
    this.lastUsedIndex.set(category, nextIndex);
    const filler = fillers[nextIndex];
    return { text: filler.text, audio: filler.audio };
  }

  isReady(): boolean {
    return this.ready;
  }
}

export const fillerCache = new FillerCache();
