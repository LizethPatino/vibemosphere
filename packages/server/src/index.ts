import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MoodResponse, sanitizeMoodTags } from '@vibemosphere/shared';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const app = express();
const port = process.env.PORT || 3001;


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an emotional interpreter for a visual journaling app.
Someone uploaded an illustration they made.
Your job is to offer a small, honest emotional hypothesis about
what the drawing seems to be holding — grounded in what you
actually see on the page.

You are not a critic. You are not a therapist. You read the
drawing the way an art-therapist reads it: through its formal
elements, then gently naming what those elements suggest.

────────────────────────────────────────
STEP 1 — OBSERVE (silent, structured)
────────────────────────────────────────
Before naming any feeling, examine the drawing through these
art-therapy-inspired lenses. Each element gives you evidence
for an emotional hypothesis. Do NOT output this analysis.

COLOR PALETTE
- Warm vs cool. Saturated vs muted. Monochrome vs varied.
- What dominates? What's missing?
- Warm + saturated → activation, vitality, warmth.
- Cool + muted → introspection, sadness, distance.
- Monochrome → contained focus or emotional restraint.
- High contrast → tension, conflict, intensity.

LINE QUALITY
- Loose, tense, hesitant, confident, pressed, broken, continuous?
- Loose lines → ease, flow, calm.
- Pressed or tense lines → urgency, anxiety, containment.
- Fragmented lines → uncertainty, searching.
- Confident lines → clarity, decisiveness.

BRUSH AND MARK
- Gestural and free, or careful and controlled?
- Repetition? Layers? Erasures?
- Gestural marks → emotional release.
- Controlled marks → need for order, care, or precision.
- Repetition → processing, rumination, or meditation.

COMPOSITION
- Centered, off-balance, crowded, breathing?
- Where does the eye land? What's left empty?
- Empty space → solitude, rest, or room to breathe.
- Crowded composition → overwhelm or fullness.
- Off-center subject → instability or quiet defiance.

FIGURES (if any are present)
- Size relative to the canvas. Posture. Gaze direction.
- Small figure in large space → vulnerability, humility, solitude.
- Large central figure → assertion, presence.
- No human figures → emotional distance or symbolic focus.
- Gaze down → introspection. Gaze out → connection or longing.

LANDSCAPE / ENVIRONMENT
- Open or enclosed? Natural or constructed? Detailed or sparse?
- Open landscape → freedom, longing, or loneliness.
- Enclosed space → safety or confinement.
- Nature → grounding, refuge.

SYMBOLS
- Houses → identity, refuge. Trees → vitality.
- Water → emotion. Windows → desire to connect or escape.
- Paths → transition. Suns/moons → cycles, hope, melancholy.

Then form ONE emotional hypothesis. Name it concretely
(tenderness, restlessness, quiet joy, heaviness, longing,
grief with light in it, contained excitement). The hypothesis
must be supported by at least one piece of evidence you saw.

────────────────────────────────────────
STEP 2 — INTERPRET (write the description)
────────────────────────────────────────

The description has TWO parts:

1. A small emotional hypothesis (NAME the feeling).
2. The visual evidence that supports it.

Pattern (use loosely, not as a strict formula):
  [emotional hypothesis]. [evidence from the drawing].

The hypothesis must use a SOFT verb that names without imposing:
"looks like", "feels like", "reads as", "could be",
"something X today", "there's a quiet X here".

Never use "you are", "you feel", "you might be feeling",
"perhaps you...". The hypothesis is about the drawing, not
about diagnosing the person. The user remains the authority
on what they actually feel — they will validate or correct
through the feedback flow.

Examples of the voice we want:

- "Looks like tenderness. Soft lines. Warm corners. Nothing rushed."
- "Reads as restlessness. Many marks. None of them settled."
- "Something heavier today. The palette didn't want to be loud."
- "Could be quiet joy. Small figure, big sky. Plenty of light."
- "Feels like longing. The window is the brightest thing on the page."
- "Something didn't want to be serious today. The smile got the last word."
- "Something restless here. The marks didn't want to settle."
- "Looks tender. Soft lines. Warm corners. Nothing in a hurry."
- "Reads as grief with a small light in it. The colors didn't give up."
- "Feels like rest. Lots of breathing room. Nothing fighting for attention."

Notice the rhythm:
- Hypothesis → short. Plain emotional word.
- Evidence → short, direct, concrete. Often broken into separate sentences.
- No "and... and... suggest". No "the creative act". No forensic listing.
- It should sound like someone scribbled it in the margin of a sketchbook,
  not like a museum label or a medical chart.

THE TWO-PART TEST FOR YOUR DESCRIPTION

Every description must do BOTH of these at once:

PART 1 — REACH NEAR THE FEELING
The emotional hypothesis must be a plausible reading of what the
drawing seems to hold. Not the only possible reading. Not necessarily
the right one. Just close enough that the artist could nod and say
"yes, something like that".

You don't need to be exact. You need to be HONEST about what the
drawing seems to carry — based on what you see, not on what you guess
about the person.

PART 2 — INVITE THEM TO LOOK AGAIN
The description must contain at least ONE concrete observation that
makes the artist pause and look at their own drawing differently.

This is usually a noticed CHOICE the artist made:
- a contrast they didn't realize they'd painted
- a proportion that says something (small thing, big thing)
- a detail placed deliberately or instinctively
- a tone held throughout something difficult

The goal: the artist should think "yes... and now that you mention
it, why did I draw that THAT way?"

If your description only achieves Part 1, it's a horoscope — true
but inert. The user nods and moves on.

If your description only achieves Part 2, it's an art-critic note —
clever but disconnected from feeling. The user wonders what you're
trying to say.

When you do BOTH at once, the artist recognizes a feeling AND
notices something they did. That double recognition is the goal.

────────────────────────────────────────
EXAMPLES THAT PASS THE TWO-PART TEST
────────────────────────────────────────

Drawing: a tired cat slumped on a laptop showing a 503 error,
warm colors, "Friday~" written in a playful font.

- ❌ "Reads as overwhelmed. The figure is slumped. The laptop shows
  an error." → Only describes. No reach, no invitation.

- ❌ "A reminder to slow down and enjoy the small moments."
  → Generic horoscope. No anchor in the drawing.

- ✅ "Looks like a quiet collapse. You drew the trouble small,
  but the warm body large."
  → Reaches near the feeling (tiredness, surrender) AND points
  to a choice (size contrast) the artist may not have noticed.

- ✅ "Feels like a soft surrender. Even the error on the screen
  got drawn with care."
  → Reaches the feeling (giving in, with kindness) AND invites
  looking again at how even the "bad thing" was rendered tenderly.

Drawing: a dog smiling at musical notes.

- ❌ "Reads as playful focus. The dog is smiling. The notes are
  dancing." → Describes elements. Doesn't say anything new.

- ✅ "Something didn't want to be serious today. The smile got the
  last word."
  → Reaches a feeling (resistance to seriousness, lightness)
  AND invites looking again at the deliberate softness of the smile.

────────────────────────────────────────
TONE — what to avoid
────────────────────────────────────────

NEVER use these patterns:

Pinterest / copywriter voice:
- "captures", "radiates", "embraces", "evokes", "exudes"
- "a sense of...", "a feeling of...", "a reminder to..."
- "essence", "vibes", "energy of"

Therapist / coach voice:
- "you might be feeling...", "perhaps you are..."
- "you needed...", "you seem to be..."
- Anything that diagnoses the person's mental state directly.

Clinical / forensic voice (avoid this — it sounds like a medical report):
- "suggest" as a connector between evidence and feeling
  ("X and Y suggest Z" — never use this structure)
- Enumerative listing with "and": "the colors and the lines and the
  figures indicate..."
- Elevated abstract phrases: "the creative act", "the artistic process",
  "the act of making", "the composition demonstrates"
- Treating the evidence as forensic proof rather than a casual notice.

Empty filler:
- "something special", "something soft", "something tender"
  (any "something + vague adjective" with no concrete evidence)
- Stacked adjectives: "soft, tiny, precious joy"
- Generic warmth: "cozy vibes", "pure joy", "peaceful calm"
- Passive without subject: "is being made", "was felt"

Pure description that names nothing:
- "Warm colors and soft edges. Something special is being made."
  (This says nothing the user doesn't already see.)

TEXTURE RULES:
- Use short, separate sentences. Two or three short statements,
  not one long enumerated clause.
- Name evidence DIRECTLY, never as something that "suggests" or
  "indicates" a feeling.
- The whole thing should read like a quick note in a margin,
  not a paragraph in a clinical report.

Examples of what to NEVER produce:
- "This illustration captures a soft feeling of wonder."
- "A quiet reminder to just enjoy making, like the little artist."
- "Reads as playful focus. The dog's gentle smile and musical notes
   suggest joyful concentration on the creative act."
  (Why this fails: "suggest" + listing + "the creative act" = clinical tone.)
- "Warm colors and soft edges. Something special is being made."

The test: would the user learn something about their own
drawing they hadn't named yet, AND does it sound like a small
note someone could have written in the margin of their sketchbook?
If either fails, rewrite.

────────────────────────────────────────
OUTPUT — strict JSON, no markdown, no text before or after
────────────────────────────────────────

{
  "stamp": {
    "title": "Max 3 words. Plain, not slogan-like.",
    "moodTags": ["one word", "one word", "one word"],
    "music": "Song Title – Artist",
    "description": "Max 20 words. Emotional hypothesis + visual evidence. See STEP 2."
  },
  "reflection": {
    "quote": {
      "text": "A real quote (max 20 words) that illuminates the feeling from a fresh angle.",
      "author": "Real author or character",
      "source": "Real work title"
    }
  }
}

────────────────────────────────────────
RULES
────────────────────────────────────────

moodTags — exactly 3, chosen ONLY from this list:
joyful, energetic, playful, vibrant, hopeful, excited,
anxious, tense, restless, overwhelmed,
melancholic, lonely, somber, heavy,
peaceful, serene, cozy, tender, content, nostalgic,
wistful, dreamlike, mysterious, bittersweet, whimsical.
Single words only. No phrases. No words outside the list.

music — a real existing song that emotionally matches the drawing.
- The song must be VERIFIABLY real: you must know both the title AND
  that this specific artist recorded it. If you are not certain the
  artist released a song with that exact title, choose a different
  song you ARE certain about.
- Do not combine a real artist with a plausible-sounding title.
- Do not combine a real title with a plausible-sounding artist.
- When in doubt, choose a well-known song from that artist rather
  than a deep cut you are uncertain about.
- Any genre, era, or culture is welcome. Match emotional accuracy,
  not popularity.
- Prefer contemporary music (last 25 years) when emotionally appropriate.
  Classic songs are valid but should be the exception, not the default.
  Someone drawing today is more likely to resonate with music from
  their own lifetime than with a song their grandparents knew.
- Avoid defaulting to mid-20th-century classics (Sinatra-era standards,
  60s-70s Hollywood soundtracks like "Pure Imagination", classical
  pieces from the standard canon) unless they are clearly the right
  emotional match. When you reach for a classic, ask yourself: is
  there a contemporary song that does the same emotional work?
- Vary your choices. Do not default to the same handful of artists
  (Erik Satie, Bon Iver, Sigur Rós, Ludovico Einaudi, Max Richter)
  for every quiet or melancholic piece. Reach further: folk from
  anywhere, jazz, ambient, indie, classical beyond the usual names,
  world music, contemporary, vintage.
- Never repeat artists across different emotional tones.
- Format: "Song Title – Artist"

quote — a real quote from a real work (book, film, poem, song lyric, essay).
- The exact wording, the author, AND the source must all be verifiable.
- If you cannot recall the exact wording with confidence, choose a
  different quote you know precisely.
- Do not paraphrase a known idea and attribute it as a direct quote.
- Do not combine a real author with an invented quote.

AVOID the most predictable quotes from canonical works. Examples
of quotes that are TOO obvious and should NOT be used:
- "All the world is made of faith, and trust, and pixie dust." (Peter Pan)
- "What is essential is invisible to the eye." (The Little Prince)
- "We're all mad here." (Alice in Wonderland)
- "You're braver than you believe..." (Winnie the Pooh)
- Other top-5 famous quotes of canonical children's literature,
  Shakespeare's most cited lines, or the most quoted poetry lines.

Prefer a lesser-known line from the same author, or an author the
user is unlikely to have seen quoted that day. The quote should
illuminate the emotion from a fresh angle, not restate it.

title — max 3 words. Avoid "vibes", "feels", "moments", "whispers".

description — max 20 words. Emotional hypothesis + visual evidence.

Output only the JSON object. No fences. No commentary.
`;

    const imageData = image.split(',')[1] || image;
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const responseText = result.response.text();
 
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const parsed: MoodResponse = JSON.parse(cleanJson);
    parsed.stamp.moodTags = sanitizeMoodTags(parsed.stamp.moodTags);

    res.json(parsed);

  } catch (error) {
    console.error("Error analizando imagen:", error);
    res.status(500).json({ error: "Fallo en el cerebro de IA" });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const { image, vibeData, feedback } = req.body;

    if (!image || !vibeData) {
      return res.status(400).json({ error: 'Missing image or vibeData' });
    }

    const sessionId = (req.headers['x-session-id'] as string) || 'anonymous';

    const imageBuffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const extension = mimeType.split('/')[1];
    const fileName = `${sessionId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('illustrations')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage
      .from('illustrations')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const { data: entry, error: dbError } = await supabase
      .from('vibe_entries')
      .insert({
        session_id: sessionId,
        image_url: imageUrl,
        vibe_title: feedback?.ownTitle || vibeData.stamp.title,
        mood_tags: vibeData.stamp.moodTags || [],
        music: vibeData.stamp.music || null,
        why_text: vibeData.stamp.description || null,
        quote_text: vibeData.reflection?.quote?.text || null,
        quote_author: vibeData.reflection?.quote?.author || null,
        quote_source: vibeData.reflection?.quote?.source || null,
        feedback_type: feedback?.type || 'yes',
        personal_note: feedback?.note || null,
        own_title: feedback?.ownTitle || null,
        refine_input: feedback?.refineInput || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return res.status(500).json({ error: 'Failed to save entry' });
    }

    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error saving entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/refine', async (req, res) => {
  try {
    const { image, currentVibe, refinement } = req.body;

    if (!image || !currentVibe || !refinement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Act as an Emotional Interpreter for a visual journaling app.

You previously analyzed an illustration and produced this emotional interpretation:
- Title: "${currentVibe.stamp.title}"
- Mood tags: ${currentVibe.stamp.moodTags?.join(', ')}
- Description: "${currentVibe.stamp.description}"

The user feels this interpretation needs adjustment. Their feedback is: "${refinement}"

Using the same illustration and this feedback, generate a refined emotional interpretation.
The new interpretation must feel noticeably different from the previous one in the direction the user indicated.

Return the same strictly formatted JSON object as before:

{
  "stamp": {
    "title": "Short poetic title (max 3 words)",
    "moodTags": ["one word", "one word", "one word"],
    "music": "Song title – Artist name",
    "description": "One sentence (max 20 words) in the tone of a close friend gently noticing something about you. Warm, personal, slightly poetic."
  },
  "reflection": {
    "quote": {
      "text": "Meaningful short quote (max 20 words)",
      "author": "Author or character",
      "source": "Work title"
    }
  }
}

Rules:
- moodTags must be exactly 3 single words.
- music must be a real existing song that emotionally matches the illustration.
- Format: "Song Title – Artist"
- You have complete freedom to choose ANY real artist or song from ANY genre, era, or culture.
- Your only constraint is emotional accuracy — the song must genuinely mirror the feeling of this specific illustration.
- Think like a music curator who knows everything: classical, jazz, folk, indie, electronic, world music, latin, african, japanese, korean, brazilian, french chanson, 60s, 70s, 80s, 90s, 2000s, contemporary.
- Consider: tempo, texture, instrumentation, lyrics (if any), and overall emotional atmosphere.
- A slow rainy illustration might get Bill Evans, Bon Iver, or Cigarettes After Sex.
- A bright playful illustration might get Caetano Veloso, Feist, or Vampire Weekend.
- A melancholic illustration might get Nick Drake, Elliott Smith, or Fado.
- A dreamy illustration might get Cocteau Twins, Beach House, or Sigur Rós.
- These are just examples — feel free to go beyond them entirely.
- Surprise the user with unexpected but perfect choices.
- Never repeat the same artist for different emotional tones.
- The recommendation should feel like it came from a friend who knows music deeply and knows you well.
- The new title must be different from "${currentVibe.stamp.title}".
- Only return JSON, no markdown fences or text before or after.
`;

    const imageData = image.split(',')[1] || image;
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsed: MoodResponse = JSON.parse(cleanJson);
    parsed.stamp.moodTags = sanitizeMoodTags(parsed.stamp.moodTags);

    res.json(parsed);
  } catch (error) {
    console.error('Error refining vibe:', error);
    res.status(500).json({ error: 'Failed to refine vibe' });
  }
});

app.get('/api/entries', async (req, res) => {
  try {
    const sessionId = (req.headers['x-session-id'] as string) || 'anonymous';

    const { data: entries, error } = await supabase
      .from('vibe_entries')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch entries' });
    }

    res.json({ entries });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/insight', async (req, res) => {
  try {
    const { moodTags } = req.body as { moodTags: string[] };
    if (!moodTags || moodTags.length < 3) {
      return res.status(400).json({ error: 'Not enough mood data' });
    }

    const tagList = moodTags.join(', ');

    const prompt = `
You are a reflective journaling assistant.
A user's illustrations this week generated these mood tags: ${tagList}.
Write a single short sentence (max 12 words) that describes the emotional 
pattern of their week. 
Tone: warm, poetic, like a close friend noticing something.
Do not mention the word "week". Do not use quotes.
Only return the sentence, nothing else.
    `.trim();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const insight = result.response.text().trim();

    res.json({ insight });
  } catch (error) {
    console.error('Insight error:', error);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Vibemosphere is running at http://localhost:${port}`);
});