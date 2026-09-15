import express from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report.js';

const router = express.Router();

const MAX_TAGS = 5;
const MAX_TITLE = 120;
const MAX_BODY = 2000;
const MAX_LOCATION = 160;

/** '#Road' / 'Road ' / 'ro-ad' all collapse to 'road'. Normalising on the way in
 *  AND on the way out of a query is what makes tag search an exact match. The
 *  result is [a-z0-9_] only, so it is also safe to drop straight into a RegExp. */
const normaliseTag = (raw) =>
  String(raw ?? '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);

/** Tags come from the hashtags the user typed in the body, plus anything the
 *  client passed explicitly. The server re-parses rather than trusting the
 *  client's list, so what is stored always matches what was written. */
const tagsFrom = (body, extra = []) => {
  const found = String(body ?? '').match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const all = [...found, ...extra].map(normaliseTag).filter(Boolean);
  return [...new Set(all)].slice(0, MAX_TAGS);
};

// @route   GET /api/reports
// @desc    Feed, newest first. ?tag= filters by tag prefix, ?author= to one user.
router.get('/', async (req, res) => {
  try {
    const { tag, author, limit } = req.query;
    const filter = {};

    const t = normaliseTag(tag);
    // Prefix match so the search box narrows as the user types ('ro' -> 'road'),
    // rather than only matching once the tag is spelled out in full.
    if (t) filter.tags = new RegExp(`^${t}`);

    if (author && mongoose.isValidObjectId(author)) filter.author = author;

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .lean();

    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Could not load the feed' });
  }
});

// @route   GET /api/reports/meta
// @desc    Counters and the tag leaderboard that drive the right-hand rail.
router.get('/meta', async (req, res) => {
  try {
    const [total, resolved, tags] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: 'RESOLVED' }),
      Report.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),
    ]);

    res.json({
      total,
      resolved,
      tags: tags.map((t) => ({ tag: t._id, count: t.count })),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Could not load feed stats' });
  }
});

// @route   POST /api/reports
// @desc    File a report.
router.post('/', async (req, res) => {
  try {
    const { title, body, location, userId, authorName, tags } = req.body;

    const cleanTitle = String(title ?? '').trim().slice(0, MAX_TITLE);
    if (!cleanTitle) {
      return res.status(400).json({ message: 'A title is required' });
    }

    const cleanBody = String(body ?? '').trim().slice(0, MAX_BODY);

    const report = await Report.create({
      // An invalid id is dropped rather than rejected — the post is still worth
      // keeping, it just loses its "My Reports" attribution.
      author: mongoose.isValidObjectId(userId) ? userId : undefined,
      authorName: String(authorName ?? '').trim().slice(0, 60) || 'Anonymous',
      title: cleanTitle,
      body: cleanBody,
      location: String(location ?? '').trim().slice(0, MAX_LOCATION),
      tags: tagsFrom(cleanBody, Array.isArray(tags) ? tags : []),
    });

    res.status(201).json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Could not save the report' });
  }
});

export default router;
