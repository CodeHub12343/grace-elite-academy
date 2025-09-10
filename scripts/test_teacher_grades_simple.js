/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000/api';

  try {
    console.log('🔐 Logging in as teacher...');
    
    // 1) Login as teacher
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: 'teacher.1@school.test',
      password: 'teacher123',
    });
    const token = loginRes.data?.tokens?.accessToken;
    if (!token) throw new Error('No access token from login');
    console.log('✅ Logged in as teacher');

    const headers = { Authorization: `Bearer ${token}` };

    // 2) Try to upload a grade with the validated combination
    const gradeData = {
      studentId: '68b06a0c5900df68a7065c95', // Valid student from validation script
      classId: '68b069b65900df68a70658be',   // Valid class from validation script
      subjectId: '68b069b75900df68a70658e0', // Valid subject from validation script
      term: 'term1',
      academicYear: '2024-2025',
      marks: 85,
      maxMarks: 100,
      remarks: 'Test grade upload',
      examType: 'final',
      examTitle: 'Test Exam',
      examDate: new Date().toISOString(),
      isPublished: false
    };

    console.log('📝 Attempting grade upload...');
    console.log('Data:', JSON.stringify(gradeData, null, 2));

    // 3) Upload grade
    const uploadRes = await axios.post(`${baseUrl}/teacher-grades/upload`, gradeData, { headers });
    console.log('✅ Grade upload successful!');
    console.log('Response:', uploadRes.data);

  } catch (err) {
    if (err.response) {
      console.error('❌ Request failed:', err.response.status);
      console.error('Response data:', err.response.data);
    } else {
      console.error('❌ Error:', err.message);
      if (err.stack) console.error('Stack:', err.stack);
    }
    process.exit(1);
  }
}

main();