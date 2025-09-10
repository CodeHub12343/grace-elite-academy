const axios = require('axios');

// Test script for academic result endpoint
async function testAcademicResult() {
  const BASE_URL = 'http://localhost:5000/api';
  const STUDENT_ID = '64f1234567890abcdef12345'; // The student ID from the request
  
  console.log('🎓 Testing Academic Result Endpoint...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');
    
    // Step 2: Test the academic result endpoint
    console.log('\n2️⃣ Testing academic result endpoint...');
    const academicResultResponse = await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Academic result retrieved successfully!');
    console.log('\n📊 Academic Result Summary:');
    console.log('============================');
    
    const result = academicResultResponse.data.data;
    
    // Display student info
    console.log(`👤 Student: ${result.student.name}`);
    console.log(`📧 Email: ${result.student.email}`);
    console.log(`🎓 Class: ${result.student.class}`);
    console.log(`📋 Roll Number: ${result.student.rollNumber}`);
    console.log(`👨‍👩‍👧‍👦 Parent: ${result.student.parentName}`);
    console.log(`📞 Contact: ${result.student.parentContact}`);
    
    // Display academic summary
    console.log('\n📈 Academic Summary:');
    console.log('===================');
    console.log(`📚 Total Subjects: ${result.summary.totalSubjects}`);
    console.log(`📊 Total Marks: ${result.summary.totalMarks}/${result.summary.totalMaxMarks}`);
    console.log(`📈 Overall Percentage: ${result.summary.overallPercentage}%`);
    console.log(`🏆 Overall Grade: ${result.summary.overallGrade}`);
    console.log(`💬 Remarks: ${result.summary.remarks}`);
    
    // Display subject-wise breakdown
    console.log('\n📖 Subject-wise Performance:');
    console.log('============================');
    
    result.subjects.forEach((subject, index) => {
      console.log(`\n${index + 1}. ${subject.subjectName}`);
      console.log(`   Overall: ${subject.overall.totalMarks}/${subject.overall.maxMarks} (${subject.overall.percentage}%) - Grade: ${subject.overall.grade}`);
      
      // Display term-wise breakdown
      Object.values(subject.terms).forEach(term => {
        console.log(`   📅 ${term.term}: ${term.totalMarks}/${term.maxMarks} (${term.percentage}%) - Grade: ${term.grade}`);
        
        // Display individual exams
        term.exams.forEach(exam => {
          console.log(`      📝 ${exam.examType}: ${exam.marks}/${exam.maxMarks} (${exam.percentage}%) - Grade: ${exam.grade}`);
          if (exam.examTitle) {
            console.log(`         Exam: ${exam.examTitle}`);
          }
          if (exam.teacherName) {
            console.log(`         Teacher: ${exam.teacherName}`);
          }
        });
      });
    });
    
    console.log('\n📅 Generated at:', result.generatedAt);
    console.log('🎯 Academic Year:', result.academicYear);
    
    // Step 3: Test with different query parameters
    console.log('\n3️⃣ Testing with query parameters...');
    
    // Test with term filter
    try {
      const termFilterResponse = await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}?term=term1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Term filter working - term1 results retrieved');
    } catch (error) {
      console.log('❌ Term filter failed:', error.response?.status || error.message);
    }
    
    // Test with class filter
    try {
      const classFilterResponse = await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}?classId=64f1234567890abcdef12346`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Class filter working - filtered results retrieved');
    } catch (error) {
      console.log('❌ Class filter failed:', error.response?.status || error.message);
    }
    
    // Step 4: Test error cases
    console.log('\n4️⃣ Testing error cases...');
    
    // Test with invalid student ID
    try {
      await axios.get(`${BASE_URL}/grades/academic-result/invalid-id`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Should have failed with invalid student ID');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Invalid student ID handled correctly - 404 Not Found');
      } else {
        console.log('❌ Unexpected error for invalid student ID:', error.response?.status);
      }
    }
    
    // Test without authentication
    try {
      await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}`);
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication required - 401 Unauthorized');
      } else {
        console.log('❌ Unexpected error for no auth:', error.response?.status);
      }
    }
    
    console.log('\n🎉 Academic Result Test Completed Successfully!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running on http://localhost:5000');
    console.log('   2. Admin user exists: admin@school.com / password123');
    console.log('   3. Student ID exists in database');
    console.log('   4. Student has grades recorded');
  }
}

// Run the test
testAcademicResult().catch(console.error);
