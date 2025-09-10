const mongoose = require('mongoose');
const Teacher = require('./models/teacher.model');
const Subject = require('./models/subject.model');
const Class = require('./models/class.model');

async function debugTeacherAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find teacher by email
    const teacher = await Teacher.findOne({ userId: '68b069b85900df68a7065a40' })
      .populate('subjects', 'name code classId')
      .populate('classes', 'name');
    
    if (!teacher) {
      console.log('❌ Teacher not found');
      return;
    }

    console.log('✅ Teacher found:', teacher.userId);
    console.log('Teacher subjects:', teacher.subjects);
    console.log('Teacher classes:', teacher.classes);

    // Check each subject's classId
    for (const subject of teacher.subjects) {
      console.log(`\nSubject: ${subject.name} (${subject._id})`);
      console.log(`  ClassId: ${subject.classId}`);
      
      // Check if this classId matches any of the teacher's classes
      const matchesClass = teacher.classes.some(c => String(c._id) === String(subject.classId));
      console.log(`  Matches teacher's classes: ${matchesClass}`);
    }

    // Check the specific subject and class from the test
    const subjectId = '68b069b75900df68a70658f4';
    const classId = '68b069b65900df68a70658c9';
    
    console.log(`\n🔍 Checking specific combination:`);
    console.log(`Subject ID: ${subjectId}`);
    console.log(`Class ID: ${classId}`);
    
    const subject = await Subject.findById(subjectId).select('name classId');
    if (subject) {
      console.log(`Subject name: ${subject.name}`);
      console.log(`Subject's classId: ${subject.classId}`);
      console.log(`Matches requested classId: ${String(subject.classId) === String(classId)}`);
    } else {
      console.log('❌ Subject not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugTeacherAssignments().catch(console.error);







