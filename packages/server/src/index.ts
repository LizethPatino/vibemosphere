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
      Actúa como una curadora de arte y atmósfera experta en cine de culto y literatura. 
      Analiza esta imagen y devuelve un JSON estrictamente con este formato:
      {
        "hexColor": "Un color hexadecimal que capture la esencia de la imagen",
        "quote": {
          "text": "Una cita profunda de un libro, película o poema que encaje",
          "author": "Nombre del autor",
          "source": "Título de la obra"
        },
        "vibe": {
          "label": "Un título corto para esta vibra (ej: 'Nostalgia de Domingo')",
          "description": "Una breve explicación de por qué elegiste esto"
        },
        "musicSearchQuery": "Un término de búsqueda para Spotify (ej: 'French 60s pop' o 'Slow reverb indie')"
      }
      Solo devuelve el JSON, sin texto extra.
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