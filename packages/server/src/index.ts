import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MoodResponse } from '@vibemosphere/shared';

dotenv.config();

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
Act as an Emotional Interpreter for a visual journaling app.

Analyze the provided illustration and extract its emotional tone in a way that feels intuitive, human, and open to interpretation.

Return a strictly formatted JSON object (property names exactly as shown):

{
  "stamp": {
    "title": "Short poetic title (max 3 words)",
    "moodTags": ["one word", "one word", "one word"],
    "music": "Song title – Artist name",
    "color": "Hex color as #RRGGBB",
    "description": "One sentence (max 20 words) in the tone of a close friend gently noticing something about you. Warm, personal, slightly poetic. Not a description of the image — a reflection of the feeling. Example: 'This one feels like you needed a quiet moment just for yourself.'"
  },

  "interaction": {
    "question": "A gentle reflective question inviting the user to validate the interpretation",
    "adjustmentSuggestions": [
      "short suggestion",
      "short suggestion",
      "short suggestion"
    ]
  },

  "reflection": {
    "description": "Short reflective explanation (max 60 words)",
    "alternativeVibes": [
      "brief alternative interpretation",
      "brief alternative interpretation"
    ],
    "quote": {
      "text": "Meaningful short quote (max 20 words)",
      "author": "Author or character",
      "source": "Work title"
    }
  }
}

Rules:
- moodTags must be exactly 3 items. Each item must be a SINGLE word (adjective only). No phrases, no commas within items. Examples: ["warm", "playful", "tender"].
- music must be a real existing song recommendation with format "Song Title – Artist". Choose a song that emotionally matches the illustration's feeling. Examples: "Claire de Lune – Debussy", "Dog Days Are Over – Florence and the Machine".
- Never include section labels, stage directions, or parenthetical tags in any string value.
- Prioritize clarity over complexity.
- Avoid long paragraphs.
- Keep everything emotionally resonant but simple.
- Always include "stamp.description" (reflective, not technical).
- The "stamp" section must feel immediate and light.
- The "interaction" section must feel inviting, not evaluative.
- adjustmentSuggestions must contain exactly three short strings.
- alternativeVibes must contain exactly two short strings.
- Only return JSON, with no markdown fences or text before or after.
`;

    const imageData = image.split(',')[1] || image;
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const responseText = result.response.text();
 
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const analysis: MoodResponse = JSON.parse(cleanJson);

    res.json(analysis);

  } catch (error) {
    console.error("Error analizando imagen:", error);
    res.status(500).json({ error: "Fallo en el cerebro de IA" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Vibemosphere is running at http://localhost:${port}`);
});