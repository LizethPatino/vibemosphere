export type MoodResponse = {
  stamp: {
    title: string;
    moodTags: string[];
    music: string;
    musicUrl?: string;
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

export { MOOD_TAGS, MOOD_COORDINATES, sanitizeMoodTags, getEntryCoordinates } from './moods';
export type { MoodTag } from './moods';
