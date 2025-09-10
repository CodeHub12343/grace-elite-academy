/*
  Fix exam windows for testing by ensuring exams are active right now.
  - Sets startTime to a few minutes in the past and endTime a couple hours in the future
  - Publishes the exam (status = 'published')
  - Targets exams with invalid windows (endTime < startTime), already expired, or not yet started
  - Optionally limit to specific examIds via CLI: `node scripts/fix_exams_active_now.js <id1> <id2> ...`
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Exam = require('../models/exam.model');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
  });

  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

  const ids = process.argv.slice(2).filter(Boolean);

  const baseCriteria = ids.length
    ? { _id: { $in: ids } }
    : {
        $or: [
          // invalid window: end < start
          { $expr: { $lt: ['$endTime', '$startTime'] } },
          // already expired
          { endTime: { $lt: now } },
          // not yet started
          { startTime: { $gt: now } },
        ],
      };

  const update = {
    $set: {
      startTime: start,
      endTime: end,
      status: 'published',
      updatedAt: now,
    },
  };

  // Find affected exams first for logging
  const affected = await Exam.find(baseCriteria).select('_id title startTime endTime status').limit(50);
  console.log(`Exams to update: ${affected.length}`);
  if (affected.length) {
    console.table(
      affected.map((e) => ({
        id: String(e._id),
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        status: e.status,
      }))
    );
  }

  const res = await Exam.updateMany(baseCriteria, update);
  console.log('Matched exams:', res.matchedCount ?? res.n);
  console.log('Modified exams:', res.modifiedCount ?? res.nModified);

  // Quick verify a few
  if (affected.length) {
    const sampleIds = affected.slice(0, 5).map((e) => e._id);
    const verified = await Exam.find({ _id: { $in: sampleIds } }).select('_id startTime endTime status');
    console.log('Post-update sample:');
    console.table(
      verified.map((e) => ({ id: String(e._id), startTime: e.startTime, endTime: e.endTime, status: e.status }))
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
































