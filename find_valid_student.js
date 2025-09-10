const mongoose = require('mongoose');
const Student = require('./models/student.model');
const User = require('./models/user.model');

async function findValidStudent() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all users with role 'student'
    const studentUsers = await User.find({ role: 'student' }).limit(10);
    console.log('Student users found:', studentUsers.length);
    
    for (const user of studentUsers) {
      console.log(`User: ${user.name} (${user.email}) - ID: ${user._id}`);
      
      // Check if student record exists
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        console.log(`  ✅ Student record exists: ${student.rollNumber}`);
      } else {
        console.log(`  ❌ No student record found`);
      }
    }

    // Find all students
    const students = await Student.find().limit(10);
    console.log('\nStudents found:', students.length);
    
    for (const student of students) {
      console.log(`Student: ${student.rollNumber} - User ID: ${student.userId}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

findValidStudent().catch(console.error);








