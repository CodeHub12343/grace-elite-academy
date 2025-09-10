/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../models/exam.model');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    const [, , examId] = process.argv;
    if (!examId) {
      console.error('Usage: node scripts/fix_exam_window.js <examId>');
      process.exit(1);
    }
    await mongoose.connect(MONGO_URI);
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000);
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const updated = await Exam.findByIdAndUpdate(
      examId,
      { startTime, endTime, status: 'published' },
      { new: true }
    );
    if (!updated) {
      console.error('Exam not found:', examId);
      process.exit(2);
    }
    console.log('✅ Updated exam window:', {
      id: updated._id.toString(),
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: updated.status,
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(3);
  }
}

run();































