/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const Subject = require('../models/subject.model');
const ClassModel = require('../models/class.model');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

async function fixTeacherAssignments() {
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

    // Get a subject and its class
    const subject = await Subject.findOne({});
    if (!subject) {
      console.log('❌ No subject found');
      return;
    }

    console.log('📚 Found subject:', subject.name, 'in class:', subject.classId);

    // Ensure teacher is assigned to this subject
    if (!teacher.subjects.includes(subject._id)) {
      teacher.subjects.push(subject._id);
      console.log('✅ Added subject to teacher');
    }

    // Ensure teacher is assigned to this class
    if (!teacher.classes.includes(subject.classId)) {
      teacher.classes.push(subject.classId);
      console.log('✅ Added class to teacher');
    }

    await teacher.save();
    console.log('✅ Teacher assignments updated');

    // Verify the assignments
    const updatedTeacher = await Teacher.findById(teacher._id);
    console.log('📚 Teacher subjects:', updatedTeacher.subjects.length);
    console.log('🏫 Teacher classes:', updatedTeacher.classes.length);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {GET /api/teacher-results/terms: Returns available terms (empty for test data)
✅ GET /api/teacher-results/exam-types: Returns available exam types (empty for test data)
✅ GET /api/teacher-results/exam-titles: Returns available exam titles (empty for test data)
    await mongoose.disconnect();
  }
}

fixTeacherAssignments();