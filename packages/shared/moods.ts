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

export const MOOD_COORDINATES: Record<MoodTag, { x: number; y: number }> = {
  // High arousal · Pleasant
  excited: { x: 0.45, y: 0.9 },
  energetic: { x: 0.4, y: 0.82 },
  vibrant: { x: 0.6, y: 0.72 },
  joyful: { x: 0.72, y: 0.62 },
  playful: { x: 0.68, y: 0.48 },
  hopeful: { x: 0.55, y: 0.38 },
  // High arousal · Unpleasant
  frantic: { x: -0.5, y: 0.92 },
  agitated: { x: -0.55, y: 0.8 },
  overwhelmed: { x: -0.6, y: 0.68 },
  tense: { x: -0.65, y: 0.55 },
  anxious: { x: -0.7, y: 0.5 },
  restless: { x: -0.4, y: 0.45 },
  // Low arousal · Unpleasant
  heavy: { x: -0.6, y: -0.55 },
  somber: { x: -0.65, y: -0.5 },
  melancholic: { x: -0.55, y: -0.6 },
  lonely: { x: -0.7, y: -0.45 },
  weary: { x: -0.45, y: -0.7 },
  subdued: { x: -0.4, y: -0.5 },
  // Low arousal · Pleasant
  content: { x: 0.6, y: -0.45 },
  cozy: { x: 0.65, y: -0.55 },
  tender: { x: 0.55, y: -0.5 },
  peaceful: { x: 0.7, y: -0.6 },
  serene: { x: 0.72, y: -0.68 },
  // Transversals
  nostalgic: { x: 0.1, y: -0.4 },
  bittersweet: { x: 0.0, y: -0.45 },
  wistful: { x: -0.1, y: -0.5 },
  // Atmospheric
  dreamlike: { x: 0.05, y: 0.1 },
  mysterious: { x: -0.15, y: 0.15 },
  whimsical: { x: 0.2, y: 0.2 },
};

export function sanitizeMoodTags(tags: string[]): MoodTag[] {
  return tags
    .filter((t): t is MoodTag =>
      (MOOD_TAGS as readonly string[]).includes(t)
    )
    .slice(0, 3);
}

export function getEntryCoordinates(tags: MoodTag[]): { x: number; y: number } {
  const coords = tags.map((t) => MOOD_COORDINATES[t]).filter(Boolean);
  if (coords.length === 0) return { x: 0, y: 0 };
  return {
    x: coords.reduce((s, c) => s + c.x, 0) / coords.length,
    y: coords.reduce((s, c) => s + c.y, 0) / coords.length,
  };
}
