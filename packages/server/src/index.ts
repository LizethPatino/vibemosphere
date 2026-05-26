import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MoodResponse, sanitizeMoodTags } from '@vibemosphere/shared';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { ANALYZE_PROMPT } from './analyzeImagePrompt';
import { buildRefinePrompt } from './refineImagePrompt';

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
    const { image, currentVibe, refinement } = req.body as {
      image?: string;
      currentVibe?: MoodResponse;
      refinement?: string;
    };

    if (!image || !currentVibe || !refinement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prompt = buildRefinePrompt(currentVibe, refinement);

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