/*
  Check if a submission exists for <studentEmail> and <examId>
  Usage: node scripts/check_submission.js <studentEmail> <examId>
*/
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model');
const Student = require('../models/student.model');
const Submission = require('../models/submission.model');

async function main() {
  const [studentEmail, examId] = process.argv.slice(2);
  if (!studentEmail || !examId) {
    console.error('Usage: node scripts/check_submission.js <studentEmail> <examId>');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const user = await User.findOne({ email: studentEmail }).select('_id email');
  if (!user) throw new Error('User not found');
  const student = await Student.findOne({ userId: user._id }).select('_id userId classId');
  if (!student) throw new Error('Student profile not found');

  const sub = await Submission.findOne({ examId, studentId: student._id });
  if (!sub) {
    console.log('No submission record.');
  } else {
    console.log('Submission found:', {
      id: String(sub._id),
      status: sub.status,
      score: sub.score,
      submittedAt: sub.submittedAt,
      answersCount: Array.isArray(sub.answers) ? sub.answers.length : 0,
    });
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
































