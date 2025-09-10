const mongoose = require('mongoose');
const Teacher = require('./models/teacher.model');
const User = require('./models/user.model');

async function findTeachers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all teachers
    const teachers = await Teacher.find().populate('userId', 'name email').limit(10);
    console.log('Teachers found:', teachers.length);
    
    for (const teacher of teachers) {
      console.log(`Teacher: ${teacher.userId?.name} (${teacher.userId?.email}) - ID: ${teacher._id}`);
      console.log(`  User ID: ${teacher.userId?._id}`);
      console.log(`  Subjects: ${teacher.subjects?.length || 0}`);
      console.log(`  Classes: ${teacher.classes?.length || 0}`);
    }

    // Find teacher by email
    const teacherUser = await User.findOne({ email: 'teacher.28@school.test' });
    if (teacherUser) {
      console.log(`\n✅ Found teacher user: ${teacherUser.name} (${teacherUser.email}) - ID: ${teacherUser._id}`);
      
      const teacher = await Teacher.findOne({ userId: teacherUser._id });
      if (teacher) {
        console.log(`✅ Found teacher record: ${teacher._id}`);
      } else {
        console.log('❌ No teacher record found for this user');
      }
    } else {
      console.log('❌ Teacher user not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

findTeachers().catch(console.error);







