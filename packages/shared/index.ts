export type MoodResponse = {
  stamp: {
    title: string;
    moodTags: string[];
    music: string;
    color: string;
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
