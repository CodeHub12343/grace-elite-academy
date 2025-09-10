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

    // 2) Get teacher profile
    const teacherRes = await axios.get(`${baseUrl}/teachers/me`, { headers });
    const teacher = teacherRes.data?.data || teacherRes.data;
    console.log('👩‍🏫 Teacher ID:', teacher._id);
    console.log('📚 Assigned subjects:', teacher.subjects);
    console.log('🏫 Assigned classes:', teacher.classes);

    // 3) Get subjects with details
    const subjectsRes = await axios.get(`${baseUrl}/subjects?scope=mine`, { headers });
    const subjects = subjectsRes.data?.data || subjectsRes.data || [];
    console.log('\n📖 Teacher\'s subjects:');
    subjects.forEach(subject => {
      console.log(`  - ${subject.name} (ID: ${subject._id}, Class: ${subject.classId})`);
    });

    // 4) Get classes with details
    const classesRes = await axios.get(`${baseUrl}/classes?scope=mine`, { headers });
    const classes = classesRes.data?.data || classesRes.data || [];
    console.log('\n🏫 Teacher\'s classes:');
    classes.forEach(cls => {
      console.log(`  - ${cls.name} (ID: ${cls._id})`);
    });

    // 5) Check if teacher is assigned to both subject and class for each subject
    console.log('\n🔍 Authorization check:');
    for (const subject of subjects) {
      const hasSubject = teacher.subjects && teacher.subjects.includes(subject._id);
      const hasClass = teacher.classes && teacher.classes.includes(subject.classId);
      console.log(`  Subject: ${subject.name}`);
      console.log(`    - Has subject: ${hasSubject}`);
      console.log(`    - Has class: ${hasClass}`);
      console.log(`    - Authorized: ${hasSubject && hasClass}`);
    }

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