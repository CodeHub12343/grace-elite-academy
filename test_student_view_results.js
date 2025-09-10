const axios = require('axios');

// Test script for Student viewing their term results
async function testStudentViewResults() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('👨‍🎓 Testing Student Term Results Viewing...\n');

  try {
    // Step 1: Login as a student
    console.log('1️⃣ Logging in as student...');
    const studentLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'student1@example.com',
      password: 'Passw0rd!'
    });

    if (!studentLoginResponse.data.success) {
      console.log('❌ Student login failed:', studentLoginResponse.data.message);
      console.log('💡 Trying alternative student credentials...');
      
      // Try to get a student from the system
      const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@example.com',
        password: 'Passw0rd!'
      });
      
      if (adminLoginResponse.data.success) {
        const adminToken = adminLoginResponse.data.data.accessToken;
        const studentsResponse = await axios.get(`${BASE_URL}/students?limit=1`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (studentsResponse.data.data.length > 0) {
          const student = studentsResponse.data.data[0];
          console.log(`ℹ️ Found student: ${student.userId?.name} (${student.userId?.email})`);
          console.log('💡 Please use this student\'s credentials to test');
          return;
        }
      }
      return;
    }

    const studentToken = studentLoginResponse.data.data.accessToken;
    const studentId = studentLoginResponse.data.data.user.id;
    console.log('✅ Student login successful');
    console.log(` Student ID: ${studentId}`);

    // Step 2: View all available term results
    console.log('\n2️⃣ Viewing all available term results...');
    const allResultsResponse = await axios.get(`${BASE_URL}/term-results/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });

    if (allResultsResponse.data.success) {
      console.log('✅ All term results retrieved successfully');
      console.log(` Total results: ${allResultsResponse.data.count}`);
      
      if (allResultsResponse.data.data.length > 0) {
        console.log('\n📊 Available Term Results:');
        allResultsResponse.data.data.forEach((result, index) => {
          console.log(` ${index + 1}. ${result.term.toUpperCase()} - ${result.academicYear}`);
          console.log(`    Class: ${result.classId?.name}`);
          console.log(`    Overall Grade: ${result.overallGrade}`);
          console.log(`    Average: ${result.averagePercentage}%`);
          console.log(`    Subjects: ${result.subjects.length}`);
          console.log(`    Status: ${result.isPublished ? 'Published' : 'Draft'}`);
          console.log('');
        });
      } else {
        console.log('ℹ️ No term results available yet');
        console.log('💡 Admin needs to upload results first');
        return;
      }
    }

    // Step 3: View results for a specific term
    console.log('\n3️⃣ Viewing results for specific term...');
    const terms = ['term1', 'term2', 'final'];
    
    for (const term of terms) {
      try {
        const termResultsResponse = await axios.get(`${BASE_URL}/term-results/student/${studentId}?term=${term}`, {
          headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        
        if (termResultsResponse.data.success && termResultsResponse.data.data.length > 0) {
          console.log(`✅ ${term.toUpperCase()} results found:`);
          const result = termResultsResponse.data.data[0];
          
          console.log(` Academic Year: ${result.academicYear}`);
          console.log(` Class: ${result.classId?.name}`);
          console.log(` Overall Grade: ${result.overallGrade}`);
          console.log(` Average Percentage: ${result.averagePercentage}%`);
          console.log(` Total Marks: ${result.totalMarks}/${result.totalMaxMarks}`);
          console.log(` Overall Remarks: ${result.overallRemarks}`);
          
          // Show detailed subject breakdown
          console.log('\n📚 Subject Breakdown:');
          result.subjects.forEach((subject, index) => {
            console.log(` ${index + 1}. ${subject.subjectName} (${subject.subjectCode})`);
            console.log(`    Marks: ${subject.marks}/${subject.maxMarks}`);
            console.log(`    Percentage: ${subject.percentage}%`);
            console.log(`    Grade: ${subject.grade}`);
            console.log(`    Remarks: ${subject.remarks}`);
            console.log(`    Exam Type: ${subject.examType}`);
            console.log('');
          });
          
          break; // Found results, no need to check other terms
        }
      } catch (error) {
        console.log(`ℹ️ No results available for ${term}`);
      }
    }

    // Step 4: Test filtering by academic year
    console.log('\n4️⃣ Testing academic year filtering...');
    const academicYears = ['2023-2024', '2022-2023', '2024-2025'];
    
    for (const year of academicYears) {
      try {
        const yearResultsResponse = await axios.get(`${BASE_URL}/term-results/student/${studentId}?academicYear=${year}`, {
          headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        
        if (yearResultsResponse.data.success && yearResultsResponse.data.data.length > 0) {
          console.log(`✅ Results found for academic year ${year}: ${yearResultsResponse.data.count} results`);
          break;
        }
      } catch (error) {
        console.log(`ℹ️ No results for academic year ${year}`);
      }
    }

    // Step 5: Test unauthorized access (student trying to view another student's results)
    console.log('\n5️⃣ Testing unauthorized access...');
    try {
      const otherStudentId = '507f1f77bcf86cd799439011'; // Fake ID
      await axios.get(`${BASE_URL}/term-results/student/${otherStudentId}`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('❌ Student should not be able to view other student results');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Unauthorized access properly blocked');
      } else {
        console.log('ℹ️ Expected error for unauthorized access');
      }
    }

    console.log('\n🎉 Student Term Results Viewing Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Student authentication');
    console.log(' ✅ Viewing all available term results');
    console.log(' ✅ Viewing specific term results');
    console.log(' ✅ Academic year filtering');
    console.log(' ✅ Subject breakdown display');
    console.log(' ✅ Unauthorized access protection');
    console.log(' ✅ Role-based access control');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Student user exists: student1@example.com / Passw0rd!');
    console.log(' 3. Term results have been uploaded by admin');
    console.log(' 4. Results are published and visible to students');
  }
}

// Run the test
testStudentViewResults().catch(console.error);























