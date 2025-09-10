const mongoose = require('mongoose');
const Exam = require('../models/exam.model');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function resetExamForStudent() {
  try {
    console.log('🔄 Resetting exam for student...');
    
    const examId = '68b06a175900df68a7065ee6';
    
    // Check if exam exists
    const existingExam = await Exam.findById(examId);
    if (!existingExam) {
      console.log('❌ Exam not found!');
      return;
    }
    
    console.log('📋 Current Exam Details:');
    console.log(` Title: ${existingExam.title}`);
    console.log(` Status: ${existingExam.status}`);
    console.log(` Start Time: ${existingExam.startTime}`);
    console.log(` End Time: ${existingExam.endTime}`);
    console.log(` Class: ${existingExam.classId}`);
    console.log(` Subject: ${existingExam.subjectId}`);
    
    // Set exam to be available now
    const now = new Date();
    const endTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      {
        status: 'published',
        startTime: now,
        endTime: endTime,
        updatedAt: now
      },
      { new: true }
    );
    
    console.log('\n✅ Exam Reset Successfully!');
    console.log('📋 Updated Exam Details:');
    console.log(` Title: ${updatedExam.title}`);
    console.log(` Status: ${updatedExam.status}`);
    console.log(` Start Time: ${updatedExam.startTime}`);
    console.log(` End Time: ${updatedExam.endTime}`);
    console.log(` Duration: ${updatedExam.duration} minutes`);
    console.log(` Total Marks: ${updatedExam.totalMarks}`);
    
    console.log('\n🎯 Exam is now available for students to take!');
    console.log(`⏰ Available until: ${endTime.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error resetting exam:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

resetExamForStudent();





















