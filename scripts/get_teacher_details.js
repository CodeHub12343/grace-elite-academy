const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const Grade = require('../models/grade.model');
const User = require('../models/user.model');

async function getTeacherDetails() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    
    const teacher = await Teacher.findOne({ 'userId.email': 'sarah.johnson@school.com' }).populate('userId', 'email name');
    
    if (!teacher) {
      console.log('Teacher not found');
      process.exit(0);
    }
    
    const grades = await Grade.find({ teacherId: teacher._id }).limit(10);
    
    console.log('Teacher:', teacher.userId.email);
    console.log('Grades found:', grades.length);
    console.log('Sample grades:');
    
    grades.forEach((grade, i) => {
      console.log(`${i+1}. term=${grade.term}, academicYear=${grade.academicYear}, examType=${grade.examType}, classId=${grade.classId}, subjectId=${grade.subjectId}`);
    });
    
    // Get unique combinations
    const uniqueTerms = [...new Set(grades.map(g => g.term))];
    const uniqueAcademicYears = [...new Set(grades.map(g => g.academicYear))];
    const uniqueExamTypes = [...new Set(grades.map(g => g.examType))];
    const uniqueClassIds = [...new Set(grades.map(g => g.classId.toString()))];
    const uniqueSubjectIds = [...new Set(grades.map(g => g.subjectId.toString()))];
    
    console.log('\nUnique values:');
    console.log('Terms:', uniqueTerms);
    console.log('Academic Years:', uniqueAcademicYears);
    console.log('Exam Types:', uniqueExamTypes);
    console.log('Class IDs:', uniqueClassIds);
    console.log('Subject IDs:', uniqueSubjectIds);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getTeacherDetails();
