const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
const MODEL_ID = process.env.GEMINI_IMAGE_MODEL || 'models/gemini-2.5-flash-image-preview';

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Serve static client
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory sessions for chat context (simple demo)
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

// Helper to convert base64 data URL to inlineData parts for Gemini
function dataUrlToInlinePart(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const mimeType = match[1];
  const data = match[2];
  return { inlineData: { data, mimeType } };
}

app.post('/api/generate', async (req, res) => {
  try {
    const { sessionId, prompt, imageDataUrl } = req.body || {};
    if (!prompt && !imageDataUrl) {
      return res.status(400).json({ error: 'Provide prompt or image' });
    }

    const history = getSession(sessionId || 'default');

    // Build content parts: optional user image + text prompt
    const userParts = [];
    if (imageDataUrl) {
      const inlinePart = dataUrlToInlinePart(imageDataUrl);
      if (inlinePart) userParts.push(inlinePart);
    }
    if (prompt) userParts.push({ text: prompt });

    // Append user turn to history
    history.push({ role: 'user', parts: userParts });

    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Use a simple multi-turn generateContent with accumulated history
    const result = await model.generateContent({ contents: history });

    // Extract image part(s) from response
    const response = await result.response;
    const candidates = response.candidates || [];
    let returnedParts = [];
    if (candidates[0]?.content?.parts) {
      returnedParts = candidates[0].content.parts;
    }

    // Find first image or fallback to text
    const imagePart = returnedParts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));
    const textPart = returnedParts.find(p => typeof p.text === 'string' && p.text.length > 0);

    // Append model turn to history
    history.push({ role: 'model', parts: returnedParts });

    if (imagePart) {
      const dataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      return res.json({ imageDataUrl: dataUrl, text: textPart?.text || null, history });
    }

    // Some models return only text explanations; surface that
    return res.json({ imageDataUrl: null, text: textPart?.text || 'No image returned', history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Generation failed', details: err?.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

