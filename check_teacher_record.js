const mongoose = require('mongoose');
const Teacher = require('./models/teacher.model');
const User = require('./models/user.model');

async function checkTeacherRecord() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check teacher user
    const userId = '68b069b45900df68a70655b1';
    const user = await User.findById(userId);
    
    if (user) {
      console.log('✅ User found:', user.name, user.email, user.role);
    } else {
      console.log('❌ User not found');
      return;
    }

    // Check teacher record
    const teacher = await Teacher.findOne({ userId: userId })
      .populate('subjects', 'name code classId')
      .populate('classes', 'name');
    
    if (teacher) {
      console.log('✅ Teacher record found:', teacher._id);
      console.log('Subjects:', teacher.subjects?.length || 0);
      console.log('Classes:', teacher.classes?.length || 0);
      
      if (teacher.subjects && teacher.subjects.length > 0) {
        console.log('Subject details:');
        teacher.subjects.forEach(subject => {
          console.log(`  - ${subject.name} (${subject._id}) - ClassId: ${subject.classId}`);
        });
      }
      
      if (teacher.classes && teacher.classes.length > 0) {
        console.log('Class details:');
        teacher.classes.forEach(cls => {
          console.log(`  - ${cls.name} (${cls._id})`);
        });
      }
    } else {
      console.log('❌ Teacher record not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTeacherRecord().catch(console.error);







