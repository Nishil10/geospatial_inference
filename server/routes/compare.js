import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = express.Router();

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

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
      description: 'Individual differences over time, most significant first.',
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
    recommendations: {
      type: Type.ARRAY,
      description: 'Actionable urban design and infrastructure recommendations for better access to public facilities, transit, and pedestrian equity.',
      items: {
        type: Type.OBJECT,
        properties: {
          targetArea: {
            type: Type.STRING,
            enum: [
              'public_transit_access',       // Bus stops, shelters, boarding platforms
              'ada_and_universal_access',    // Curb ramps, tactile paving, clear sidewalk widths
              'pedestrian_safety',           // Crosswalks, curb extensions, refuge islands
              'active_mobility_lanes',       // Protected bike lanes vs. sharrows
              'streetscape_amenities',       // Lighting, wayfinding, shade, trash receptacles
              'road_geometry_and_traffic',   // Speed calming, lane narrowing, intersection radius
            ],
            description: 'The urban domain being targeted.',
          },
          priority: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'Urgency based on safety and public access needs.',
          },
          currentDeficiency: {
            type: Type.STRING,
            description: 'Current barrier or deficiency visible in the newer image.',
          },
          proposedSolution: {
            type: Type.STRING,
            description: 'Specific physical intervention to improve access and utility.',
          },
          publicBenefit: {
            type: Type.STRING,
            description: 'Concrete impact on mobility, safety, or access to public facilities.',
          },
        },
        required: ['targetArea', 'priority', 'currentDeficiency', 'proposedSolution', 'publicBenefit'],
      },
    },
  },
  required: ['sceneMatch', 'summary', 'changes', 'recommendations'],
};

const buildPrompt = (olderDate, newerDate) => `You are an expert urban planner, civil engineer, and public accessibility specialist analyzing street-level imagery over time.

Image 1 (earlier): ${olderDate || 'Unknown date'}
Image 2 (later): ${newerDate || 'Unknown date'}

Determine if both images capture the same physical location and set sceneMatch.

Provide your response in two parts:
1. CHANGES: Concrete built-environment changes between Image 1 and Image 2.
2. RECOMMENDATIONS: Provide 3 to 5 high-impact, actionable physical interventions based on Image 2 to maximize accessibility to public facilities, public transport, and street infrastructure:
   - Universal & ADA Accessibility: Sidewalk widths, curb ramps, tactile paving for vision-impaired pedestrians, driveway apron levelness.
   - Public Transit & Amenities: Bus stop enhancements, boarding pads, weather shelters, wayfinding to nearby transit/civic hubs.
   - Active Transportation: Upgrading painted sharrows to protected/separated bike lanes, daylighting intersections.
   - Traffic Calming & Safety: Curb extensions (bulb-outs), mid-block crossings, pedestrian refuge islands, and pedestrian-scale street lighting.`;

router.post('/', async (req, res) => {
  try {
    const { olderUrl, newerUrl, olderDate, newerDate } = req.body;

    if (!olderUrl || !newerUrl) {
      return res.status(400).json({ message: 'Both olderUrl and newerUrl are required' });
    }

    const ai = getClient();
    if (!ai) {
      return res.status(503).json({ message: 'Gemini API key is not configured.' });
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