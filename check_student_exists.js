const mongoose = require('mongoose');
const Student = require('./models/student.model');
const User = require('./models/user.model');

async function checkStudentExists() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if student exists
    const studentId = '68b069b45900df68a7065818';
    const student = await Student.findById(studentId);
    
    if (student) {
      console.log('✅ Student found:', student);
    } else {
      console.log('❌ Student not found with ID:', studentId);
      
      // Check if there are any students in the database
      const allStudents = await Student.find().limit(5);
      console.log('Available students:', allStudents.map(s => ({ id: s._id, userId: s.userId })));
    }

    // Check the user
    const user = await User.findById(studentId);
    if (user) {
      console.log('✅ User found:', user);
    } else {
      console.log('❌ User not found with ID:', studentId);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentExists().catch(console.error);








