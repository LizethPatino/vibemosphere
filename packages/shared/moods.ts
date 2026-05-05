export const MOOD_TAGS = [
  // High energy · Positive valence
  'joyful', 'energetic', 'playful', 'vibrant', 'hopeful', 'excited',
  // High energy · Negative valence
  'anxious', 'tense', 'restless', 'overwhelmed',
  // Low energy · Negative valence
  'melancholic', 'lonely', 'somber', 'heavy',
  // Low energy · Positive valence
  'peaceful', 'serene', 'cozy', 'tender', 'content', 'nostalgic',
  // Aesthetic-emotional
  'wistful', 'dreamlike', 'mysterious', 'bittersweet', 'whimsical',
] as const;

export type MoodTag = typeof MOOD_TAGS[number];

export function sanitizeMoodTags(tags: string[]): MoodTag[] {
  return tags
    .filter((t): t is MoodTag =>
      (MOOD_TAGS as readonly string[]).includes(t)
    )
    .slice(0, 3);
}
