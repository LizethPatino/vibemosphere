export type MoodResponse = {
  stamp: {
    title: string;
    moodTags: string[];
    music: string;
    description?: string;
  };
  reflection: {
    quote: {
      text: string;
      author: string;
      source: string;
    };
  };
};

export { MOOD_TAGS, sanitizeMoodTags } from './moods';
export type { MoodTag } from './moods';
