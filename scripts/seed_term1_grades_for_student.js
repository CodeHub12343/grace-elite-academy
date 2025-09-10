/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const TeacherGrade = require('../models/teacherGrade.model');
const Student = require('../models/student.model');
const Subject = require('../models/subject.model');
const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');

function computeGrade(pct) {
  if (pct >= 85) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

async function connect() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school';
  await mongoose.connect(uri, { autoIndex: true });
}

async function main() {
  const studentId = process.argv.find((a) => a.startsWith('--studentId='))?.split('=')[1];
  const classId = process.argv.find((a) => a.startsWith('--classId='))?.split('=')[1];
  const teacherEmail = process.argv.find((a) => a.startsWith('--teacherEmail='))?.split('=')[1];
  const academicYear = process.argv.find((a) => a.startsWith('--academicYear='))?.split('=')[1];
  const marksBase = parseInt(process.argv.find((a) => a.startsWith('--marksBase='))?.split('=')[1] || '60', 10);
  const publish = process.argv.includes('--publish');
  const limitSubjects = parseInt(process.argv.find((a) => a.startsWith('--subjectsCount='))?.split('=')[1] || '4', 10);

  if (!studentId || !classId) {
    throw new Error('Usage: node scripts/seed_term1_grades_for_student.js --studentId=<id> --classId=<id> [--teacherEmail=<email>] --academicYear=YYYY-YYYY [--subjectsCount=4] [--marksBase=60] [--publish]');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const ay = academicYear || `${currentYear}-${currentYear + 1}`;

  await connect();
  console.log('Connected');

  const student = await Student.findById(studentId).select('_id');
  if (!student) throw new Error('Student not found');

  let teacher = null;
  if (teacherEmail) {
    const user = await User.findOne({ email: teacherEmail }).select('_id');
    if (!user) throw new Error('Teacher user not found');
    teacher = await Teacher.findOne({ userId: user._id }).select('_id userId');
  }

  // Subjects in the class
  const subjects = await Subject.find({ classId }).select('_id name code teacherIds');
  if (subjects.length === 0) throw new Error('No subjects found for class');

  const chosen = subjects.slice(0, Math.min(limitSubjects, subjects.length));
  let inserted = 0;
  let duplicates = 0;
  const errors = [];

  for (let i = 0; i < chosen.length; i += 1) {
    const subj = chosen[i];
    const teacherId = teacher?._id || (subj.teacherIds && subj.teacherIds.length > 0 ? subj.teacherIds[0] : null);
    if (!teacherId) {
      errors.push(`No teacherId for subject ${subj._id}`);
      continue;
    }

    const maxMarks = 100;
    const marks = Math.min(100, Math.max(35, marksBase + (i * 5)));
    const percentage = Math.round((marks / maxMarks) * 100);
    const grade = computeGrade(percentage);

    const doc = {
      teacherId,
      studentId,
      classId,
      subjectId: subj._id,
      term: 'term1',
      academicYear: ay,
      marks,
      maxMarks,
      percentage,
      grade,
      remarks: percentage >= 70 ? 'Good performance' : 'Keep improving',
      examType: 'final',
      examTitle: 'Term 1 Final',
      examDate: now,
      isPublished: publish,
      status: publish ? 'published' : 'draft',
      createdBy: teacher?.userId || teacherId,
      updatedBy: teacher?.userId || teacherId
    };

    try {
      await TeacherGrade.create(doc);
      inserted += 1;
    } catch (err) {
      if (err && err.code === 11000) {
        duplicates += 1;
      } else {
        errors.push(err.message || String(err));
      }
    }
  }

  console.log('Seed summary:', { inserted, duplicates, errors });
  await mongoose.disconnect();
  console.log('Done');
}

main().catch(async (err) => {
  console.error('Error:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

