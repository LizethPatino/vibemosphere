export type MoodResponse = {
  hexColor: string;
  quote: {
    text: string;
    author: string;
    source: string;
  };
  vibe: {
    label: string;
    description: string;
  };
  musicSearchQuery: string;
};
