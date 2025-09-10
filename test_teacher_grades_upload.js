const axios = require('axios');

async function testTeacherGradesUpload() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🎓 Testing Teacher Grades Upload Endpoint...\n');

  try {
    // Step 1: Login as a teacher
    console.log('1️⃣ Logging in as teacher...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'teacher.28@school.test',
      password: 'teacher123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Teacher login successful');

    // Step 2: Get teacher's assignments to find valid subject/class combination
    console.log('\n2️⃣ Getting teacher assignments...');
    const teacherResponse = await axios.get(`${BASE_URL}/teachers/me`, { headers });
    const teacher = teacherResponse.data.data;
    
    console.log('Teacher data:', JSON.stringify(teacher, null, 2));
    
    if (!teacher.subjects || teacher.subjects.length === 0) {
      console.log('❌ Teacher has no subjects assigned');
      return;
    }
    
    if (!teacher.classes || teacher.classes.length === 0) {
      console.log('❌ Teacher has no classes assigned');
      return;
    }

    // Find a subject that matches one of the teacher's classes
    let validSubject = null;
    let validClass = null;
    
    for (const subject of teacher.subjects) {
      for (const cls of teacher.classes) {
        if (String(subject.classId) === String(cls._id)) {
          validSubject = subject;
          validClass = cls;
          break;
        }
      }
      if (validSubject) break;
    }
    
    if (!validSubject) {
      console.log('❌ No valid subject/class combination found');
      console.log('Available subjects and their classIds:');
      teacher.subjects.forEach(subject => {
        console.log(`  - ${subject.name}: classId ${subject.classId}`);
      });
      console.log('Available classes:');
      teacher.classes.forEach(cls => {
        console.log(`  - ${cls.name}: ${cls._id}`);
      });
      return;
    }
    
    const subjectId = validSubject._id;
    const classId = validClass._id;
    
    console.log(`✅ Using subject: ${validSubject.name} (${subjectId})`);
    console.log(`✅ Using class: ${validClass.name} (${classId})`);

    // Step 3: Get students in the class
    console.log('\n3️⃣ Getting students in class...');
    const studentsResponse = await axios.get(`${BASE_URL}/students?classId=${classId}`, { headers });
    const students = studentsResponse.data.data;
    
    if (!students || students.length === 0) {
      console.log('❌ No students found in class');
      return;
    }
    
    const studentId = students[0]._id;
    console.log(`✅ Using student: ${students[0].userId?.name || students[0].rollNumber} (${studentId})`);

    // Step 4: Upload a grade
    console.log('\n4️⃣ Uploading grade...');
    const gradeData = {
      studentId: studentId,
      classId: classId,
      subjectId: subjectId,
      term: 'term1',
      academicYear: '2024-2025',
      marks: 85,
      maxMarks: 100,
      remarks: 'Good performance',
      examType: 'midterm',
      examTitle: 'Midterm Exam',
      examDate: new Date().toISOString().split('T')[0],
      isPublished: false
    };

    console.log('Grade data:', JSON.stringify(gradeData, null, 2));

    const uploadResponse = await axios.post(`${BASE_URL}/teacher-grades/upload`, gradeData, { headers });
    
    console.log('✅ Grade upload successful!');
    console.log('Response:', JSON.stringify(uploadResponse.data, null, 2));

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.log('Status:', error.response.status);
    }
  }
}

testTeacherGradesUpload().catch(console.error);
