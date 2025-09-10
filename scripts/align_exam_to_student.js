/*
  Align a given exam to a student's class and make it active/published now.
  Usage:
    node scripts/align_exam_to_student.js <studentEmail> <examId>
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/user.model');
const Student = require('../models/student.model');
const Exam = require('../models/exam.model');

async function main() {
  const [studentEmail, examId] = process.argv.slice(2);
  if (!studentEmail || !examId) {
    console.error('Usage: node scripts/align_exam_to_student.js <studentEmail> <examId>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { maxPoolSize: 10 });

  const user = await User.findOne({ email: studentEmail }).select('_id email');
  if (!user) {
    throw new Error(`No user found for ${studentEmail}`);
  }

  const student = await Student.findOne({ userId: user._id }).select('_id classId');
  if (!student || !student.classId) {
    throw new Error(`No student/class found for ${studentEmail}`);
  }

  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000);
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const exam = await Exam.findByIdAndUpdate(
    examId,
    {
      $set: {
        classId: student.classId,
        startTime: start,
        endTime: end,
        status: 'published',
        updatedAt: now,
      },
    },
    { new: true }
  ).select('_id title classId startTime endTime status');

  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  console.log('Aligned exam:', {
    id: String(exam._id),
    title: exam.title,
    classId: String(exam.classId),
    startTime: exam.startTime,
    endTime: exam.endTime,
    status: exam.status,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
































