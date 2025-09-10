const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const Grade = require('../models/grade.model');
const User = require('../models/user.model');

async function findTeacherWithData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    
    console.log('Finding teachers with data...\n');
    
    // Find teachers with grades
    const teachersWithGrades = await Teacher.aggregate([
      {
        $lookup: {
          from: 'grades',
          localField: '_id',
          foreignField: 'teacherId',
          as: 'grades'
        }
      },
      {
        $match: {
          'grades.0': { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $limit: 3
      }
    ]);
    
    for (const teacher of teachersWithGrades) {
      console.log(`Teacher: ${teacher.user[0].email} (${teacher.user[0].name})`);
      console.log(`- Total Grades: ${teacher.grades.length}`);
      
      if (teacher.grades.length > 0) {
        const sample = teacher.grades[0];
        console.log(`- Sample Grade: term=${sample.term}, examType=${sample.examType}, classId=${sample.classId}, subjectId=${sample.subjectId}`);
        
        // Get unique values
        const uniqueTerms = [...new Set(teacher.grades.map(g => g.term))];
        const uniqueExamTypes = [...new Set(teacher.grades.map(g => g.examType))];
        const uniqueClassIds = [...new Set(teacher.grades.map(g => g.classId.toString()))];
        const uniqueSubjectIds = [...new Set(teacher.grades.map(g => g.subjectId.toString()))];
        
        console.log(`- Unique Terms: ${uniqueTerms.join(', ')}`);
        console.log(`- Unique Exam Types: ${uniqueExamTypes.join(', ')}`);
        console.log(`- Unique Class IDs: ${uniqueClassIds.slice(0, 3).join(', ')}...`);
        console.log(`- Unique Subject IDs: ${uniqueSubjectIds.slice(0, 3).join(', ')}...`);
        console.log('---');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findTeacherWithData();










