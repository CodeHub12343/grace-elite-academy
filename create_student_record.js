const mongoose = require('mongoose');
const Student = require('./models/student.model');
const User = require('./models/user.model');
const Class = require('./models/class.model');
const Subject = require('./models/subject.model');

async function createStudentRecord() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if user exists
    const userId = '68b069b45900df68a7065818';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found. Creating user first...');
      return;
    }
    
    console.log('✅ User found:', user.name, user.email);

    // Check if student record exists
    let student = await Student.findOne({ userId: userId });
    
    if (student) {
      console.log('✅ Student record already exists:', student);
      return;
    }

    // Get a class and subjects to assign to the student
    const classes = await Class.find().limit(1);
    const subjects = await Subject.find().limit(3);
    
    if (classes.length === 0) {
      console.log('❌ No classes found in database');
      return;
    }
    
    if (subjects.length === 0) {
      console.log('❌ No subjects found in database');
      return;
    }

    // Create student record
    student = new Student({
      userId: userId,
      classId: classes[0]._id,
      subjects: subjects.map(s => s._id),
      rollNumber: 'STU343',
      admissionDate: new Date(),
      parentName: 'Parent of Student 343',
      parentPhone: '1234567890',
      address: '123 Student Street'
    });

    await student.save();
    console.log('✅ Student record created:', student);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createStudentRecord().catch(console.error);








