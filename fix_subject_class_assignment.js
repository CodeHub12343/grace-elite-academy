const mongoose = require('mongoose');
const Subject = require('./models/subject.model');
const Teacher = require('./models/teacher.model');

async function fixSubjectClassAssignment() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get teacher and their classes
    const teacher = await Teacher.findOne({ userId: '68b069b45900df68a70655b1' })
      .populate('classes', 'name');
    
    if (!teacher) {
      console.log('❌ Teacher not found');
      return;
    }

    console.log('Teacher classes:', teacher.classes.map(c => ({ id: c._id, name: c.name })));

    // Get the first subject (Physics 21) and update its classId to match the first class
    const subjectId = '68b069b75900df68a70658f4'; // Physics 21
    const classId = teacher.classes[0]._id; // Class 19

    const subject = await Subject.findById(subjectId);
    if (subject) {
      console.log(`Updating subject ${subject.name} classId from ${subject.classId} to ${classId}`);
      
      subject.classId = classId;
      await subject.save();
      
      console.log('✅ Subject classId updated successfully');
    } else {
      console.log('❌ Subject not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixSubjectClassAssignment().catch(console.error);







