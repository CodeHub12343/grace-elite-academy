const mongoose = require('mongoose');
const Exam = require('../models/exam.model');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/school_management');

async function checkExamExists() {
  try {
    console.log('🔍 Checking exam existence...');
    
    const examId = '68b06a175900df68a7065ee6';
    
    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.log('❌ Exam not found with ID:', examId);
      
      // List some recent exams to help find the correct ID
      console.log('\n📋 Recent Exams in Database:');
      const recentExams = await Exam.find().sort({ createdAt: -1 }).limit(10);
      
      if (recentExams.length === 0) {
        console.log('❌ No exams found in database');
      } else {
        recentExams.forEach((exam, index) => {
          console.log(`${index + 1}. ID: ${exam._id}`);
          console.log(`   Title: ${exam.title}`);
          console.log(`   Status: ${exam.status}`);
          console.log(`   Class: ${exam.classId}`);
          console.log(`   Subject: ${exam.subjectId}`);
          console.log(`   Created: ${exam.createdAt}`);
          console.log('');
        });
      }
    } else {
      console.log('✅ Exam found!');
      console.log('📋 Exam Details:');
      console.log(` ID: ${exam._id}`);
      console.log(` Title: ${exam.title}`);
      console.log(` Status: ${exam.status}`);
      console.log(` Start Time: ${exam.startTime}`);
      console.log(` End Time: ${exam.endTime}`);
      console.log(` Class: ${exam.classId}`);
      console.log(` Subject: ${exam.subjectId}`);
      console.log(` Teacher: ${exam.teacherId}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking exam:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkExamExists();





















