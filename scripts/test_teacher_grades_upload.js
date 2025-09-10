/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000/api';

  try {
    // 1) Login as teacher
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: 'teacher.1@school.test',
      password: 'teacher123',
    });
    const token = loginRes.data?.tokens?.accessToken;
    if (!token) throw new Error('No access token from login');
    console.log('✅ Logged in as teacher');

    const headers = { Authorization: `Bearer ${token}` };

    // 2) Get teacher profile to find assigned subjects and classes
    const teacherRes = await axios.get(`${baseUrl}/teachers/me`, { headers });
    const teacher = teacherRes.data?.data || teacherRes.data;
    console.log('👩‍🏫 Teacher profile:', teacher.name);
    console.log('📚 Assigned subjects:', teacher.subjects?.length || 0);
    console.log('🏫 Assigned classes:', teacher.classes?.length || 0);

    if (!teacher.subjects || teacher.subjects.length === 0) {
      throw new Error('Teacher has no assigned subjects');
    }

    // 3) Get students from teacher's classes
    const studentsRes = await axios.get(`${baseUrl}/students?scope=mine&limit=5`, { headers });
    const students = studentsRes.data?.data || studentsRes.data || [];
    console.log('👨‍🎓 Students in teacher\'s classes:', students.length);

    if (students.length === 0) {
      throw new Error('No students found in teacher\'s classes');
    }

    // 4) Get subjects assigned to teacher
    const subjectsRes = await axios.get(`${baseUrl}/subjects?scope=mine&limit=5`, { headers });
    const subjects = subjectsRes.data?.data || subjectsRes.data || [];
    console.log('📖 Teacher\'s subjects:', subjects.length);

    if (subjects.length === 0) {
      throw new Error('No subjects found for teacher');
    }

    // 5) Find a valid subject-class combination for this teacher
    let validSubject = null;
    let validStudent = null;
    
    // Check each subject to see if teacher is assigned to its class
    for (const subject of subjects) {
      console.log(`🔍 Checking subject: ${subject.name} (classId: ${subject.classId})`);
      
      // Find a student in this subject's class
      const studentInClass = students.find(s => String(s.classId) === String(subject.classId));
      if (studentInClass) {
        validSubject = subject;
        validStudent = studentInClass;
        console.log(`✅ Found valid combination: ${subject.name} + Class ${subject.classId}`);
        break;
      }
    }
    
    if (!validSubject || !validStudent) {
      throw new Error('No valid subject-class combination found for this teacher');
    }
    
    const gradeData = {
      studentId: validStudent._id,
      classId: validSubject.classId,
      subjectId: validSubject._id,
      term: 'term1',
      academicYear: '2024-2025',
      marks: 85,
      maxMarks: 100,
      remarks: 'Excellent performance in test',
      examType: 'final',
      examTitle: 'Term 1 Final Examination',
      examDate: new Date().toISOString(),
      isPublished: false
    };

    console.log('📝 Uploading grade for:', {
      student: validStudent.name || validStudent._id,
      subject: validSubject.name,
      class: validSubject.classId,
      marks: `${gradeData.marks}/${gradeData.maxMarks}`
    });

    // 6) Upload grade
    const uploadRes = await axios.post(`${baseUrl}/teacher-grades/upload`, gradeData, { headers });
    console.log('✅ Grade upload response:', uploadRes.status, uploadRes.data);

  } catch (err) {
    if (err.response) {
      console.error('❌ Request failed:', err.response.status, err.response.data);
    } else {
      console.error('❌ Error:', err.message);
      console.error('Stack:', err.stack);
    }
    process.exit(1);
  }
}

main();