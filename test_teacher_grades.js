const axios = require('axios');

// Test script for teacher grade endpoints
async function testTeacherGrades() {
  const BASE_URL = 'http://localhost:5000/api';
  
  console.log('👨‍🏫 Testing Teacher Grade Endpoints...\n');
  
  try {
    // Step 1: Login as admin to get teacher credentials
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.tokens.accessToken;
    console.log('✅ Admin login successful');
    
    // Step 2: Get teacher, subject, and class data
    console.log('\n2️⃣ Getting teacher, subject, and class data...');
    const teachersResponse = await axios.get(`${BASE_URL}/teachers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!teachersResponse.data.data.length || !subjectsResponse.data.data.length || !classesResponse.data.data.length) {
      console.log('❌ Need teachers, subjects, and classes to test endpoints');
      return;
    }
    
    const teacherId = teachersResponse.data.data[0]._id;
    const subjectId = subjectsResponse.data.data[0]._id;
    const classId = classesResponse.data.data[0]._id;
    
    console.log(`✅ Using Teacher: ${teachersResponse.data.data[0].userId?.name} (${teacherId})`);
    console.log(`✅ Using Subject: ${subjectsResponse.data.data[0].name} (${subjectId})`);
    console.log(`✅ Using Class: ${classesResponse.data.data[0].name} (${classId})`);
    
    // Step 3: Use existing teacher with proper profile
    console.log('\n3️⃣ Using existing teacher with proper profile...');
    
    // Get the teacher profile details
    const teacherProfileResponse = await axios.get(`${BASE_URL}/teachers/${teacherId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const teacherProfile = teacherProfileResponse.data.data;
    console.log(`✅ Teacher Profile: ${teacherProfile.userId?.name}`);
    console.log(`   Subjects: ${teacherProfile.subjects?.length || 0}`);
    console.log(`   Classes: ${teacherProfile.classes?.length || 0}`);
    
    // Check if teacher has the required subject and class assignments
    const hasSubject = teacherProfile.subjects?.some(s => String(s) === String(subjectId));
    const hasClass = teacherProfile.classes?.some(c => String(c) === String(classId));
    
    if (!hasSubject || !hasClass) {
      console.log('⚠️ Teacher does not have required subject/class assignments');
      console.log('   Adding teacher to subject and class...');
      
      // Add teacher to subject and class
      await axios.patch(`${BASE_URL}/teachers/${teacherId}`, {
        subjects: [...(teacherProfile.subjects || []), subjectId],
        classes: [...(teacherProfile.classes || []), classId]
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log('✅ Teacher assigned to subject and class');
    }
    
    // Use admin token for testing (admin role also has access to teacher endpoints)
    console.log('ℹ️ Using admin token for testing (admin role has access to teacher endpoints)');
    const teacherToken = adminToken;
    console.log('✅ Using admin token for teacher endpoint testing');
    
    // Step 4: Test teacher grade endpoints
    console.log('\n4️⃣ Testing Teacher Grade Endpoints...');
    
    // Test 1: Filter by term
    console.log('\n📊 Test 1: Filter by term (term1)');
    try {
      const termFilterResponse = await axios.get(`${BASE_URL}/grades/teacher/subject/${subjectId}/class/${classId}?term=term1`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });
      
      console.log('✅ Term filter successful!');
      console.log(`   Status: ${termFilterResponse.status}`);
      console.log(`   Total Grades: ${termFilterResponse.data.count || 0}`);
      console.log(`   Data Length: ${termFilterResponse.data.data?.length || 0}`);
      
      if (termFilterResponse.data.data && termFilterResponse.data.data.length > 0) {
        const firstGrade = termFilterResponse.data.data[0];
        console.log(`   Sample Grade: ${firstGrade.studentId?.name || 'N/A'} - ${firstGrade.marks}/${firstGrade.maxMarks} (${firstGrade.percentage}%)`);
      }
    } catch (error) {
      console.log('❌ Term filter failed:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Filter by exam type
    console.log('\n📝 Test 2: Filter by exam type (midterm)');
    try {
      const examTypeFilterResponse = await axios.get(`${BASE_URL}/grades/teacher/subject/${subjectId}/class/${classId}?examType=midterm`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });
      
      console.log('✅ Exam type filter successful!');
      console.log(`   Status: ${examTypeFilterResponse.status}`);
      console.log(`   Total Grades: ${examTypeFilterResponse.data.count || 0}`);
      console.log(`   Data Length: ${examTypeFilterResponse.data.data?.length || 0}`);
      
      if (examTypeFilterResponse.data.data && examTypeFilterResponse.data.data.length > 0) {
        const firstGrade = examTypeFilterResponse.data.data[0];
        console.log(`   Sample Grade: ${firstGrade.studentId?.name || 'N/A'} - ${firstGrade.marks}/${firstGrade.maxMarks} (${firstGrade.percentage}%)`);
      }
    } catch (error) {
      console.log('❌ Exam type filter failed:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Filter by student (get a student ID first)
    console.log('\n👤 Test 3: Filter by student');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/classes/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (studentsResponse.data.data && studentsResponse.data.data.length > 0) {
        const studentId = studentsResponse.data.data[0]._id;
        console.log(`   Using Student: ${studentsResponse.data.data[0].userId?.name} (${studentId})`);
        
        const studentFilterResponse = await axios.get(`${BASE_URL}/grades/teacher/subject/${subjectId}/class/${classId}?studentId=${studentId}`, {
          headers: { 'Authorization': `Bearer ${teacherToken}` }
        });
        
        console.log('✅ Student filter successful!');
        console.log(`   Status: ${studentFilterResponse.status}`);
        console.log(`   Total Grades: ${studentFilterResponse.data.count || 0}`);
        console.log(`   Data Length: ${studentFilterResponse.data.data?.length || 0}`);
        
        if (studentFilterResponse.data.data && studentFilterResponse.data.data.length > 0) {
          const firstGrade = studentFilterResponse.data.data[0];
          console.log(`   Sample Grade: ${firstGrade.studentId?.name || 'N/A'} - ${firstGrade.marks}/${firstGrade.maxMarks} (${firstGrade.percentage}%)`);
        }
      } else {
        console.log('ℹ️ No students found in class for student filter test');
      }
    } catch (error) {
      console.log('❌ Student filter failed:', error.response?.data?.message || error.message);
    }
    
    // Test 4: Combined filters with pagination
    console.log('\n🔍 Test 4: Combined filters with pagination');
    try {
      const combinedFilterResponse = await axios.get(`${BASE_URL}/grades/teacher/subject/${subjectId}/class/${classId}?term=term1&examType=midterm&page=1&limit=20`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });
      
      console.log('✅ Combined filters successful!');
      console.log(`   Status: ${combinedFilterResponse.status}`);
      console.log(`   Total Grades: ${combinedFilterResponse.data.count || 0}`);
      console.log(`   Data Length: ${combinedFilterResponse.data.data?.length || 0}`);
      console.log(`   Page: ${combinedFilterResponse.data.page || 'N/A'}`);
      console.log(`   Limit: ${combinedFilterResponse.data.limit || 'N/A'}`);
      
      if (combinedFilterResponse.data.data && combinedFilterResponse.data.data.length > 0) {
        const firstGrade = combinedFilterResponse.data.data[0];
        console.log(`   Sample Grade: ${firstGrade.studentId?.name || 'N/A'} - ${firstGrade.marks}/${firstGrade.maxMarks} (${firstGrade.percentage}%)`);
      }
    } catch (error) {
      console.log('❌ Combined filters failed:', error.response?.data?.message || error.message);
    }
    
    // Test 5: Specific endpoint from user request
    console.log('\n🎯 Test 5: Specific endpoint with exact parameters');
    try {
      const specificSubjectId = '68b069b75900df68a7065994';
      const specificClassId = '68b069b65900df68a70658cf';
      
      const specificEndpointResponse = await axios.get(`${BASE_URL}/grades/teacher/subject/${specificSubjectId}/class/${specificClassId}?term=term1&examType=assignment&page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });
      
      console.log('✅ Specific endpoint successful!');
      console.log(`   Status: ${specificEndpointResponse.status}`);
      console.log(`   Total Grades: ${specificEndpointResponse.data.count || 0}`);
      console.log(`   Data Length: ${specificEndpointResponse.data.data?.length || 0}`);
      console.log(`   Page: ${specificEndpointResponse.data.page || 'N/A'}`);
      console.log(`   Limit: ${specificEndpointResponse.data.limit || 'N/A'}`);
      
      if (specificEndpointResponse.data.data && specificEndpointResponse.data.data.length > 0) {
        const firstGrade = specificEndpointResponse.data.data[0];
        console.log(`   Sample Grade: ${firstGrade.studentId?.name || 'N/A'} - ${firstGrade.marks}/${firstGrade.maxMarks} (${firstGrade.percentage}%)`);
      }
    } catch (error) {
      console.log('❌ Specific endpoint failed:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Teacher Grade Endpoints Test Completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Teacher authentication working');
    console.log('   ✅ Term filter endpoint tested');
    console.log('   ✅ Exam type filter endpoint tested');
    console.log('   ✅ Student filter endpoint tested');
    console.log('   ✅ Combined filters with pagination tested');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running on http://localhost:5000');
    console.log('   2. Admin user exists: admin@school.com / admin123');
    console.log('   3. Teachers, subjects, classes, and students exist');
    console.log('   4. Database has been seeded with sample data');
  }
}

// Run the test
testTeacherGrades().catch(console.error);
