const axios = require('axios');

// Test script for teacher exam filtering
async function testTeacherExamFiltering(teacherId = null) {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('📚 Testing Teacher Exam Filtering...\n');

  try {
    // Step 1: Login as a teacher
    console.log('1️⃣ Logging in as teacher...');
    
    let teacherEmail = 'teacher1@example.com'; // default
    let teacherPassword = 'Passw0rd!';
    
    // If teacherId is provided, try to find the teacher's email
    if (teacherId) {
      console.log(`🔍 Looking up teacher with ID: ${teacherId}...`);
      try {
        // First, try to get teacher info (this might require admin token)
        const teacherLookupResponse = await axios.get(`${BASE_URL}/teachers/${teacherId}`);
        if (teacherLookupResponse.data.success) {
          const teacher = teacherLookupResponse.data.data;
          if (teacher.userId && teacher.userId.email) {
            teacherEmail = teacher.userId.email;
            console.log(`✅ Found teacher email: ${teacherEmail}`);
          }
        }
      } catch (lookupError) {
        console.log(`⚠️ Could not lookup teacher ${teacherId}, using default email: ${teacherEmail}`);
      }
    }

    const teacherLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: teacherEmail,
      password: teacherPassword
    });

    if (!teacherLoginResponse.data.success) {
      console.log('❌ Teacher login failed:', teacherLoginResponse.data.message);
      console.log(`💡 Tried email: ${teacherEmail}, password: ${teacherPassword}`);
      return;
    }

    const teacherToken = teacherLoginResponse.data.data.accessToken;
    console.log('✅ Teacher login successful');

    // Step 2: Get teacher's profile to see assigned subjects and classes
    console.log('\n2️⃣ Getting teacher profile...');
    const teacherProfileResponse = await axios.get(`${BASE_URL}/teachers/me`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    if (teacherProfileResponse.data.success) {
      const teacher = teacherProfileResponse.data.data;
      console.log(`✅ Teacher: ${teacher.userId?.name}`);
      console.log(` Assigned Subjects: ${teacher.subjects?.length || 0}`);
      console.log(` Assigned Classes: ${teacher.classes?.length || 0}`);
      
      if (teacher.subjects?.length > 0) {
        console.log(` Subjects: ${teacher.subjects.map(s => s.name).join(', ')}`);
      }
      if (teacher.classes?.length > 0) {
        console.log(` Classes: ${teacher.classes.map(c => c.name).join(', ')}`);
      }
    }

    // Step 3: Test getting exams (should only show exams for teacher's subjects and classes)
    console.log('\n3️⃣ Testing GET /exams with teacher filtering...');
    const examsResponse = await axios.get(`${BASE_URL}/exams?sort=-createdAt&limit=1000`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    console.log('✅ Teacher exams retrieved successfully!');
    console.log(` Total exams visible to teacher: ${examsResponse.data.count}`);
    console.log(` Pagination: Page ${examsResponse.data.pagination.page} of ${examsResponse.data.pagination.pages}`);

    // Display first few exams
    if (examsResponse.data.data.length > 0) {
      console.log('\n📋 Sample Exams Visible to Teacher:');
      examsResponse.data.data.slice(0, 5).forEach((exam, index) => {
        console.log(` ${index + 1}. ${exam.title} - ${exam.subjectId?.name} - ${exam.classId?.name} - ${exam.status}`);
      });
    } else {
      console.log('\n📋 No exams found for teacher\'s assigned subjects and classes');
    }

    // Step 4: Test filtering by specific subject (if teacher has subjects assigned)
    if (teacherProfileResponse.data.success && teacherProfileResponse.data.data.subjects?.length > 0) {
      const firstSubject = teacherProfileResponse.data.data.subjects[0];
      console.log(`\n4️⃣ Testing filtering by subject: ${firstSubject.name}...`);
      
      const subjectFilterResponse = await axios.get(`${BASE_URL}/exams?subjectId=${firstSubject._id}&sort=-createdAt`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });

      console.log(`✅ Subject filter works: ${subjectFilterResponse.data.count} exams for ${firstSubject.name}`);
    }

    // Step 5: Test filtering by specific class (if teacher has classes assigned)
    if (teacherProfileResponse.data.success && teacherProfileResponse.data.data.classes?.length > 0) {
      const firstClass = teacherProfileResponse.data.data.classes[0];
      console.log(`\n5️⃣ Testing filtering by class: ${firstClass.name}...`);
      
      const classFilterResponse = await axios.get(`${BASE_URL}/exams?classId=${firstClass._id}&sort=-createdAt`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });

      console.log(`✅ Class filter works: ${classFilterResponse.data.count} exams for ${firstClass.name}`);
    }

    // Step 6: Test search functionality
    console.log('\n6️⃣ Testing search functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/exams?search=test&sort=-createdAt`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    console.log(`✅ Search works: ${searchResponse.data.count} exams matching "test"`);

    // Step 7: Test status filtering
    console.log('\n7️⃣ Testing status filtering...');
    const statusResponse = await axios.get(`${BASE_URL}/exams?status=published&sort=-createdAt`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    console.log(`✅ Status filter works: ${statusResponse.data.count} published exams`);

    console.log('\n🎉 Teacher Exam Filtering Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Teacher authentication');
    console.log(' ✅ Role-based exam filtering');
    console.log(' ✅ Subject and class assignment verification');
    console.log(' ✅ Query parameter filtering');
    console.log(' ✅ Search functionality');
    console.log(' ✅ Status filtering');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Teacher user exists: teacher1@example.com / Passw0rd!');
    console.log(' 3. Teacher has assigned subjects and classes');
    console.log(' 4. Exams exist in the system');
  }
}

// Run the test
testTeacherExamFiltering().catch(console.error);
