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
    "microDescription": "Very concise emotional description (max 10 words)",
    "music": "Short music vibe (max 5 words)",
    "color": "Hex color as #RRGGBB"
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
- Prioritize clarity over complexity.
- Avoid long paragraphs.
- Keep everything emotionally resonant but simple.
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
  console.log(`🚀 Vibemosphere Brain running at http://localhost:${port}`);
});