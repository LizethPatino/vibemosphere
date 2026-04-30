export type MoodResponse = {
  stamp: {
    title: string;
    microDescription: string;
    music: string;
    color: string;
    /** Longer reflective "why this vibe" (may duplicate reflection tone; UI prefers this in expand). */
    description?: string;
  };
  interaction: {
    question: string;
    adjustmentSuggestions: string[];
  };
  reflection: {
    description: string;
    alternativeVibes: string[];
    quote: {
      text: string;
      author: string;
      source: string;
    };
  };
};
