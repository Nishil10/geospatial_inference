import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = express.Router();

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

// Gemini takes images as inline base64. Fetching them here rather than in the
// browser also sidesteps CORS on the Mapillary CDN.
const fetchAsInlineData = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download image (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large to analyse');
  }

  return {
    inlineData: {
      mimeType: response.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
      data: buffer.toString('base64'),
    },
  };
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sceneMatch: {
      type: Type.STRING,
      enum: ['same', 'partial', 'different'],
      description: 'Whether both photos show the same physical scene.',
    },
    summary: {
      type: Type.STRING,
      description: 'One or two sentences describing how the location changed.',
    },
    changes: {
      type: Type.ARRAY,
      description: 'Individual differences, most significant first.',
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ['building', 'road', 'vegetation', 'vehicle', 'signage', 'infrastructure', 'other'],
          },
          description: { type: Type.STRING },
          significance: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        },
        required: ['category', 'description', 'significance'],
      },
    },
  },
  required: ['sceneMatch', 'summary', 'changes'],
};

const buildPrompt = (olderDate, newerDate) => `You are analysing urban change from two street-level photographs of approximately the same location.

Image 1 was captured earlier${olderDate ? ` (${olderDate})` : ''}.
Image 2 was captured later${newerDate ? ` (${newerDate})` : ''}.

These are crowd-sourced photos, so the camera position, heading and weather usually differ. First judge whether they actually show the same physical scene and set sceneMatch accordingly. If they do not, say so in the summary and return few or no changes rather than inventing them.

When they do overlap, report durable changes to the built environment: new or demolished buildings, construction, road and pavement work, changed vegetation, new signage or infrastructure. Ignore transient differences such as parked cars, pedestrians, lighting, season and weather unless they are the only notable difference. Describe only what is visible in the images.`;

// @route   POST /api/compare
// @desc    Compare two street view images and describe what changed
router.post('/', async (req, res) => {
  try {
    const { olderUrl, newerUrl, olderDate, newerDate } = req.body;

    if (!olderUrl || !newerUrl) {
      return res.status(400).json({ message: 'Both olderUrl and newerUrl are required' });
    }

    const ai = getClient();
    if (!ai) {
      return res.status(503).json({ message: 'Image comparison is not configured. Add GEMINI_API_KEY to .env.' });
    }

    const [olderPart, newerPart] = await Promise.all([
      fetchAsInlineData(olderUrl),
      fetchAsInlineData(newerUrl),
    ]);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(olderDate, newerDate) },
            { text: 'Image 1 (earlier):' },
            olderPart,
            { text: 'Image 2 (later):' },
            newerPart,
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ message: 'Gemini returned an empty response' });
    }

    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Comparison failed:', err.message);
    res.status(500).json({ message: err.message || 'Failed to compare images' });
  }
});

export default router;
