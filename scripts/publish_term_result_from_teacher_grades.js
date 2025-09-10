/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const TeacherGrade = require('../models/teacherGrade.model');
const TermResult = require('../models/termResult.model');
const Student = require('../models/student.model');
const ClassModel = require('../models/class.model');
// Ensure Subject model is registered for population
require('../models/subject.model');

function computeOverallGrade(percentage) {
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

async function main() {
  const studentId = process.argv.find((a) => a.startsWith('--studentId='))?.split('=')[1];
  const classId = process.argv.find((a) => a.startsWith('--classId='))?.split('=')[1];
  const term = process.argv.find((a) => a.startsWith('--term='))?.split('=')[1] || 'term1';
  const academicYear = process.argv.find((a) => a.startsWith('--academicYear='))?.split('=')[1];
  const publish = process.argv.includes('--publish');

  if (!studentId || !classId) {
    throw new Error('Usage: node scripts/publish_term_result_from_teacher_grades.js --studentId=<id> --classId=<id> --term=term1 --academicYear=YYYY-YYYY [--publish]');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const ay = academicYear || `${currentYear}-${currentYear + 1}`;

  await connect();
  console.log('Connected');

  // Validate student/class
  const student = await Student.findById(studentId).select('_id classId');
  if (!student) throw new Error('Student not found');
  const cls = await ClassModel.findById(classId).select('_id name');
  if (!cls) throw new Error('Class not found');

  // Fetch teacher grades for this student/term/year/class
  const grades = await TeacherGrade.find({ studentId, classId, term, academicYear: ay })
    .populate([{ path: 'subjectId', select: 'name code' }]);

  if (grades.length === 0) {
    console.log('No teacher grades found for the specified filters. Nothing to publish.');
    await mongoose.disconnect();
    return;
  }

  const subjects = grades.map((g) => ({
    subjectId: g.subjectId?._id || g.subjectId,
    subjectName: g.subjectId?.name || 'Unknown',
    subjectCode: g.subjectId?.code || 'NA',
    marks: g.marks,
    maxMarks: g.maxMarks,
    percentage: g.percentage,
    grade: g.grade,
    remarks: g.remarks,
    examType: g.examType,
    examTitle: g.examTitle
  }));

  const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
  const totalMaxMarks = subjects.reduce((sum, s) => sum + (s.maxMarks || 0), 0);
  const averagePercentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 10000) / 100 : 0;
  const overallGrade = computeOverallGrade(averagePercentage);
  const overallRemarks = overallGrade === 'A' ? 'Excellent' : overallGrade === 'B' ? 'Very Good' : overallGrade === 'C' ? 'Good' : overallGrade === 'D' ? 'Pass' : 'Needs Improvement';

  // Upsert term result
  const update = {
    subjects,
    totalMarks,
    totalMaxMarks,
    averagePercentage,
    overallGrade,
    overallRemarks,
    uploadedBy: null,
    status: publish ? 'published' : 'draft',
    isPublished: !!publish,
    publishedAt: publish ? new Date() : undefined
  };

  const result = await TermResult.findOneAndUpdate(
    { studentId, classId, term, academicYear: ay },
    { $set: update, $setOnInsert: { studentId, classId, term, academicYear: ay } },
    { upsert: true, new: true }
  );

  console.log('TermResult upserted:', {
    id: result._id.toString(),
    subjects: result.subjects.length,
    averagePercentage: result.averagePercentage,
    overallGrade: result.overallGrade,
    isPublished: result.isPublished
  });

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(async (err) => {
  console.error('Error:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

