const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model');
const TeacherGrade = require('../models/teacherGrade.model');
const Grade = require('../models/grade.model');
const User = require('../models/user.model');

async function scanTeachersWithData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    console.log('Scanning database for teachers with populated data...\n');

    const teachers = await Teacher.find().populate('userId', 'email name').limit(10);
    
    for (const teacher of teachers) {
      const teacherGrades = await TeacherGrade.find({ teacherId: teacher._id }).limit(5);
      const regularGrades = await Grade.find({ teacherId: teacher._id }).limit(5);
      
      console.log(`Teacher: ${teacher.userId.email} (${teacher.userId.name})`);
      console.log(`- Teacher Grades: ${teacherGrades.length}`);
      console.log(`- Regular Grades: ${regularGrades.length}`);
      
      if (teacherGrades.length > 0) {
        console.log('  Sample Teacher Grade:', {
          term: teacherGrades[0].term,
          academicYear: teacherGrades[0].academicYear,
          examType: teacherGrades[0].examType,
          classId: teacherGrades[0].classId,
          subjectId: teacherGrades[0].subjectId
        });
      }
      
      if (regularGrades.length > 0) {
        console.log('  Sample Regular Grade:', {
          term: regularGrades[0].term,
          examType: regularGrades[0].examType,
          classId: regularGrades[0].classId,
          subjectId: regularGrades[0].subjectId
        });
      }
      
      console.log('---');
    }

    // Find teachers with the most data
    console.log('\n=== TEACHERS WITH MOST DATA ===');
    const teachersWithData = await Teacher.aggregate([
      {
        $lookup: {
          from: 'teachergrades',
          localField: '_id',
          foreignField: 'teacherId',
          as: 'teacherGrades'
        }
      },
      {
        $lookup: {
          from: 'grades',
          localField: '_id',
          foreignField: 'teacherId',
          as: 'regularGrades'
        }
      },
      {
        $addFields: {
          totalGrades: { $add: [{ $size: '$teacherGrades' }, { $size: '$regularGrades' }] }
        }
      },
      {
        $sort: { totalGrades: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    for (const teacher of teachersWithData) {
      console.log(`\nTeacher: ${teacher.user[0].email} (${teacher.user[0].name})`);
      console.log(`- Total Grades: ${teacher.totalGrades}`);
      console.log(`- Teacher Grades: ${teacher.teacherGrades.length}`);
      console.log(`- Regular Grades: ${teacher.regularGrades.length}`);
      
      if (teacher.teacherGrades.length > 0) {
        const sample = teacher.teacherGrades[0];
        console.log(`- Sample Data: term=${sample.term}, academicYear=${sample.academicYear}, examType=${sample.examType}`);
        console.log(`- ClassId: ${sample.classId}, SubjectId: ${sample.subjectId}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

scanTeachersWithData();
