const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const TeacherGrade = require('../models/teacherGrade.model');
const Grade = require('../models/grade.model');
const User = require('../models/user.model');

async function checkTeacherData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    
    const teacher = await Teacher.findOne({ 'userId.email': 'teacher.28@school.test' }).populate('userId', 'email name');
    
    if (!teacher) {
      console.log('Teacher not found');
      process.exit(0);
    }
    
    console.log('Teacher:', teacher.userId.email, 'ID:', teacher._id);
    
    const teacherGrades = await TeacherGrade.find({ teacherId: teacher._id });
    const regularGrades = await Grade.find({ teacherId: teacher._id });
    
    console.log('Teacher Grades:', teacherGrades.length);
    console.log('Regular Grades:', regularGrades.length);
    
    if (regularGrades.length > 0) {
      console.log('Sample regular grade:', {
        term: regularGrades[0].term,
        academicYear: regularGrades[0].academicYear,
        examType: regularGrades[0].examType,
        classId: regularGrades[0].classId,
        subjectId: regularGrades[0].subjectId
      });
      
      // Get unique values
      const uniqueTerms = [...new Set(regularGrades.map(g => g.term))];
      const uniqueAcademicYears = [...new Set(regularGrades.map(g => g.academicYear))];
      const uniqueExamTypes = [...new Set(regularGrades.map(g => g.examType))];
      
      console.log('Unique Terms:', uniqueTerms);
      console.log('Unique Academic Years:', uniqueAcademicYears);
      console.log('Unique Exam Types:', uniqueExamTypes);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeacherData();










