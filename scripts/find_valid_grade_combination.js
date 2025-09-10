/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const Subject = require('../models/subject.model');
const Student = require('../models/student.model');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

async function findValidCombination() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find teacher.1@school.test
    const teacher = await Teacher.findOne({}).populate('userId');
    if (!teacher) {
      console.log('❌ No teacher found');
      return;
    }

    console.log('👩‍🏫 Found teacher:', teacher.userId?.email);
    console.log('📚 Teacher subjects:', teacher.subjects);
    console.log('🏫 Teacher classes:', teacher.classes);

    // Find a subject that the teacher is assigned to
    const subject = await Subject.findOne({ _id: { $in: teacher.subjects } });
    if (!subject) {
      console.log('❌ No subject found for teacher');
      return;
    }

    console.log('📖 Found subject:', subject.name, 'in class:', subject.classId);

    // Find a student in that class
    const student = await Student.findOne({ classId: subject.classId });
    if (!student) {
      console.log('❌ No student found in class:', subject.classId);
      return;
    }

    console.log('👨‍🎓 Found student:', student._id, 'in class:', student.classId);

    // Verify the combination
    const hasSubject = teacher.subjects.includes(subject._id);
    const hasClass = teacher.classes.includes(subject.classId);
    
    console.log('🔍 Validation:');
    console.log('  - Teacher has subject:', hasSubject);
    console.log('  - Teacher has class:', hasClass);
    console.log('  - Student in class:', String(student.classId) === String(subject.classId));
    console.log('  - Valid combination:', hasSubject && hasClass);

    if (hasSubject && hasClass) {
      console.log('\n✅ Valid combination found:');
      console.log(`  Teacher: ${teacher._id}`);
      console.log(`  Student: ${student._id}`);
      console.log(`  Subject: ${subject._id}`);
      console.log(`  Class: ${subject.classId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findValidCombination();