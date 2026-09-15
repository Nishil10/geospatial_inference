import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Report from './models/Report.js';

/** Sample civic reports so a fresh install has a feed worth looking at.
 *  `agoHours` is turned into a real createdAt at seed time, so the cards show
 *  a sensible spread of "2h ago / 3d ago" rather than all landing at once.
 *  None of these carry an `author` id — they read as other citizens' posts and
 *  so stay out of the signed-in user's "My Reports". */
const SAMPLES = [
  {
    authorName: 'Duke Fernandes',
    title: 'Pothole swallowing half the lane',
    body: 'Huge pothole right where the lane narrows near the school gate. Two-wheelers swerve into oncoming traffic to get around it, and it is worse after rain when you cannot see how deep it is. #road #pothole',
    location: 'School Lane 14, 110001 New Delhi',
    tags: ['road', 'pothole'],
    status: 'PENDING',
    agoHours: 5,
  },
  {
    authorName: 'Mira Krishnan',
    title: 'Street lights out along the canal path',
    body: 'The entire stretch past the footbridge has been dark for three weeks. People still use it as a shortcut after work, so it needs sorting before winter. Ward office has acknowledged the ticket. #streetlight #publicissue',
    location: 'Canal Road, 560038 Bengaluru',
    tags: ['streetlight', 'publicissue'],
    status: 'IN REVIEW',
    agoHours: 30,
  },
  {
    authorName: 'Arjun Rao',
    title: 'Saplings planted on the old dump site',
    body: 'Follow-up on last month’s cleanup — 40 saplings in, mostly neem and gulmohar. The canopy layer should start showing on the map within a couple of survey cycles. #greencover #cleanup',
    location: 'Sector 21, 400703 Navi Mumbai',
    tags: ['greencover', 'cleanup'],
    status: 'RESOLVED',
    agoHours: 52,
  },
  {
    authorName: 'Priya Nair',
    title: 'Drain overflows onto the junction every monsoon',
    body: 'Same corner floods ankle-deep within twenty minutes of heavy rain. The inlet grate is completely choked with silt and plastic. Marking it now so it is on record before June. #flooding #drainage #publicissue',
    location: 'MG Road Junction, 682016 Kochi',
    tags: ['flooding', 'drainage', 'publicissue'],
    status: 'PENDING',
    agoHours: 78,
  },
  {
    authorName: 'Sameer Joshi',
    title: 'Garbage piling up behind the market',
    body: 'Collection has been skipped for about ten days behind the vegetable market. It has started to smell and stray dogs are pulling it into the road. #waste #publicissue',
    location: 'Ravivar Peth, 411002 Pune',
    tags: ['waste', 'publicissue'],
    status: 'IN REVIEW',
    agoHours: 120,
  },
  {
    authorName: 'Ananya Bose',
    title: 'Signal timing fixed at the crossing',
    body: 'Reported in March that the pedestrian phase was far too short to cross six lanes. Timing has been extended to 28 seconds and the countdown display works again. Thanks to whoever pushed this through. #traffic #road',
    location: 'Park Street, 700016 Kolkata',
    tags: ['traffic', 'road'],
    status: 'RESOLVED',
    agoHours: 200,
  },
  {
    authorName: 'Imran Qureshi',
    title: 'Footpath blocked by construction debris',
    body: 'Builder has been storing sand and broken slabs on the footpath for over a month, so everyone walks in the road instead. Wheelchair users cannot get past it at all. #footpath #publicissue',
    location: 'Banjara Hills Road 3, 500034 Hyderabad',
    tags: ['footpath', 'publicissue'],
    status: 'PENDING',
    agoHours: 340,
  },
];

/**
 * Inserts the sample reports, but only into an empty collection — so it is safe
 * to call on every boot and will never duplicate or overwrite real posts.
 * Pass { force: true } to wipe and re-seed.
 */
export async function seedReports({ force = false } = {}) {
  try {
    if (force) {
      await Report.deleteMany({});
    } else if (await Report.countDocuments({})) {
      return 0;
    }

    const now = Date.now();
    const docs = SAMPLES.map(({ agoHours, ...r }) => {
      const at = new Date(now - agoHours * 3600 * 1000);
      return { ...r, createdAt: at, updatedAt: at };
    });

    // timestamps:false so the staggered createdAt above survives the insert
    // instead of being overwritten with "now".
    await Report.insertMany(docs, { timestamps: false });
    console.log(`Seeded ${docs.length} sample reports`);
    return docs.length;
  } catch (err) {
    // A seeding failure must never stop the API from coming up.
    console.error('Report seeding skipped:', err.message);
    return 0;
  }
}

// `npm run seed` — standalone re-seed, wiping whatever is there first.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config();
  await mongoose.connect(process.env.MONGO_URI);
  await seedReports({ force: true });
  await mongoose.disconnect();
}
