export type MoodResponse = {
  stamp: {
    title: string;
    microDescription: string;
    music: string;
    color: string;
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
