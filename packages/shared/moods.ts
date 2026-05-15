export const MOOD_TAGS = [
  // High arousal · Pleasant valence
  'joyful', 'energetic', 'playful', 'vibrant', 'hopeful', 'excited',
  // High arousal · Unpleasant valence
  'anxious', 'tense', 'restless', 'overwhelmed', 'agitated', 'frantic',
  // Low arousal · Unpleasant valence
  'melancholic', 'lonely', 'somber', 'heavy', 'weary', 'subdued',
  // Low arousal · Pleasant valence
  'peaceful', 'serene', 'cozy', 'tender', 'content',
  // Transversals of valence (low-arousal, mixed)
  'nostalgic', 'bittersweet', 'wistful',
  // Atmospheric transversals (any quadrant)
  'dreamlike', 'mysterious', 'whimsical',
] as const;

export type MoodTag = typeof MOOD_TAGS[number];

export function sanitizeMoodTags(tags: string[]): MoodTag[] {
  return tags
    .filter((t): t is MoodTag =>
      (MOOD_TAGS as readonly string[]).includes(t)
    )
    .slice(0, 3);
}
