import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MoodResponse, sanitizeMoodTags } from '@vibemosphere/shared';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { ANALYZE_PROMPT } from './analyzeImagePrompt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const app = express();
const port = process.env.PORT || 3001;


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const moodJsonModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const prompt = ANALYZE_PROMPT;

    const imageData = image.split(',')[1] || image;
    const result = await moodJsonModel.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const parsed: MoodResponse = JSON.parse(
      result.response.text().trim()
    ) as MoodResponse;
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
    const result = await moodJsonModel.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
    ]);

    const parsed: MoodResponse = JSON.parse(
      result.response.text().trim()
    ) as MoodResponse;
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