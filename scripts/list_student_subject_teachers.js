/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const TermResult = require('../models/termResult.model');
const Subject = require('../models/subject.model');
const Teacher = require('../models/teacher.model');
// Ensure User model is registered for population
require('../models/user.model');

async function connect() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school';
  await mongoose.connect(uri, { autoIndex: true });
}

async function main() {
  const studentId = process.argv.find((a) => a.startsWith('--studentId='))?.split('=')[1];
  const classId = process.argv.find((a) => a.startsWith('--classId='))?.split('=')[1];
  const term = process.argv.find((a) => a.startsWith('--term='))?.split('=')[1] || 'term1';
  const academicYear = process.argv.find((a) => a.startsWith('--academicYear='))?.split('=')[1];
  if (!studentId || !classId || !academicYear) {
    throw new Error('Usage: node scripts/list_student_subject_teachers.js --studentId=<id> --classId=<id> --term=term1 --academicYear=YYYY-YYYY');
  }

  await connect();

  const tr = await TermResult.findOne({ studentId, classId, term, academicYear }).lean();
  if (!tr || !tr.subjects || tr.subjects.length === 0) {
    console.log('No term result or subjects found.');
    await mongoose.disconnect();
    return;
  }

  const subjectIds = tr.subjects.map((s) => s.subjectId);
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id name code teacherIds').lean();

  const teacherIdSet = new Set();
  subjects.forEach((s) => (s.teacherIds || []).forEach((tid) => teacherIdSet.add(String(tid))));
  const teacherIds = Array.from(teacherIdSet);
  const teachers = await Teacher.find({ _id: { $in: teacherIds } })
    .populate({ path: 'userId', select: 'name email' })
    .select('_id userId')
    .lean();
  const teacherMap = new Map(teachers.map((t) => [String(t._id), t]));

  const result = subjects.map((s) => ({
    subjectId: String(s._id),
    subjectName: s.name,
    subjectCode: s.code,
    teachers: (s.teacherIds || []).map((tid) => {
      const t = teacherMap.get(String(tid));
      return t ? { teacherId: String(t._id), name: t.userId?.name, email: t.userId?.email } : { teacherId: String(tid) };
    })
  }));

  console.log(JSON.stringify({ success: true, data: result }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Error:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

