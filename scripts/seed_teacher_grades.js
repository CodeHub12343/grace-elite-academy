/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const TeacherGrade = require('../models/teacherGrade.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const Subject = require('../models/subject.model');
const ClassModel = require('../models/class.model');
const User = require('../models/user.model');

function computeGrade(percentage) {
  if (percentage >= 85) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

async function connect() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school';
  await mongoose.connect(uri, { autoIndex: true });
}

async function findTeacher({ teacherEmail }) {
  if (teacherEmail) {
    const user = await User.findOne({ email: teacherEmail }).select('_id');
    if (!user) throw new Error(`User with email ${teacherEmail} not found`);
    const teacher = await Teacher.findOne({ userId: user._id }).populate([
      { path: 'subjects', select: 'name classId' },
      { path: 'classes', select: 'name' }
    ]);
    if (!teacher) throw new Error(`Teacher profile not found for ${teacherEmail}`);
    return teacher;
  }

  const teacher = await Teacher.findOne({}).populate([
    { path: 'subjects', select: 'name classId' },
    { path: 'classes', select: 'name' }
  ]);
  if (!teacher) throw new Error('No teacher found in database');
  return teacher;
}

async function pickContext(teacher) {
  // Prefer a subject that has a classId and a class with students
  const candidateSubjects = teacher.subjects || [];
  for (const subj of candidateSubjects) {
    if (!subj.classId) continue;
    const cls = await ClassModel.findById(subj.classId).select('_id name');
    if (!cls) continue;
    const students = await Student.find({ classId: cls._id }).select('_id userId');
    if (students.length > 0) {
      return { subject: subj, cls, students };
    }
  }

  // Fallback: use first class in teacher.classes
  if (teacher.classes && teacher.classes.length > 0) {
    const cls = teacher.classes[0];
    const students = await Student.find({ classId: cls._id }).select('_id userId');
    // pick any subject that maps to this class
    const subject = await Subject.findOne({ classId: cls._id }).select('_id name classId');
    if (subject && students.length > 0) {
      return { subject, cls, students };
    }
  }

  throw new Error('Could not find a subject/class with enrolled students for this teacher');
}

function buildGradeDocs({ teacher, subject, cls, students, options }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicYear = options.academicYear || `${currentYear}-${currentYear + 1}`;
  const term = options.term || 'term1';
  const examType = options.examType || 'final';
  const examTitle = options.examTitle || 'Seeded Test Exam';
  const isPublished = options.isPublished ?? false;

  const desiredCount = options.count || students.length;

  // Multi-year and multi-term support
  const years = options.years && options.years > 0 ? options.years : 1;
  const startYear = options.startYear || currentYear;
  const allTerms = options.allTerms === true;
  const terms = allTerms ? ['term1', 'term2', 'final'] : [term];

  const docs = [];
  let generated = 0;
  for (let y = 0; y < years && generated < desiredCount; y += 1) {
    const baseYear = startYear + y;
    const ay = `${baseYear}-${baseYear + 1}`;
    for (const t of terms) {
      if (generated >= desiredCount) break;
      const studentsToUse = students;
      for (let idx = 0; idx < studentsToUse.length && generated < desiredCount; idx += 1) {
        const student = studentsToUse[idx];
        const maxMarks = 100;
        const marks = 50 + ((generated * 7) % 51); // pseudo-random but deterministic
        const percentage = Math.round((marks / maxMarks) * 100);
        const grade = computeGrade(percentage);

        docs.push({
          teacherId: teacher._id,
          studentId: student._id,
          classId: cls._id,
          subjectId: subject._id,
          term: t,
          academicYear: ay,
          marks,
          maxMarks,
          percentage,
          grade,
          remarks: percentage >= 70 ? 'Good performance' : 'Keep improving',
          examType,
          examTitle,
          examDate: now,
          isPublished,
          status: isPublished ? 'published' : 'draft',
          createdBy: teacher.userId || teacher._id,
          updatedBy: teacher.userId || teacher._id
        });
        generated += 1;
      }
    }
  }
  return docs;
}

async function insertGrades(docs) {
  const results = { inserted: 0, duplicates: 0, errors: [] };
  for (const doc of docs) {
    try {
      await TeacherGrade.create(doc);
      results.inserted += 1;
    } catch (err) {
      if (err && err.code === 11000) {
        // Unique index constraint hit; treat as duplicate and continue
        results.duplicates += 1;
        continue;
      }
      results.errors.push(err.message || String(err));
    }
  }
  return results;
}

async function main() {
  const teacherEmail = process.env.SEED_TEACHER_EMAIL || process.argv.find((a) => a.startsWith('--teacherEmail='))?.split('=')[1];
  const countArg = process.argv.find((a) => a.startsWith('--count='))?.split('=')[1];
  const count = countArg ? parseInt(countArg, 10) : undefined;
  const publishArg = process.argv.find((a) => a === '--publish');
  const yearsArg = process.argv.find((a) => a.startsWith('--years='))?.split('=')[1];
  const years = yearsArg ? parseInt(yearsArg, 10) : undefined;
  const startYearArg = process.argv.find((a) => a.startsWith('--startYear='))?.split('=')[1];
  const startYear = startYearArg ? parseInt(startYearArg, 10) : undefined;
  const allTerms = process.argv.includes('--allTerms');

  await connect();
  console.log('Connected to MongoDB');

  const teacher = await findTeacher({ teacherEmail });
  console.log('Using teacher:', teacher._id?.toString());

  const { subject, cls, students } = await pickContext(teacher);
  console.log('Context:', { subject: subject._id?.toString(), class: cls._id?.toString(), students: students.length });

  const docs = buildGradeDocs({
    teacher,
    subject,
    cls,
    students,
    options: { count: count || 15, isPublished: !!publishArg, years, startYear, allTerms }
  });

  const result = await insertGrades(docs);
  console.log('Insert summary:', result);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

