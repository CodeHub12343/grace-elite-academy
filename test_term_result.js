const axios = require('axios');

// Test script for term-specific academic result endpoint
async function testTermSpecificResult() {
  const BASE_URL = 'http://localhost:5000/api';
  const STUDENT_ID = '64f1234567890abcdef12345'; // The student ID from the request
  
  console.log('📚 Testing Term-Specific Academic Result Endpoint...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Passw0rd!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');
    
    // Step 2: Test term-specific results
    const terms = ['term1', 'term2', 'final'];
    
    for (const term of terms) {
      console.log(`\n2️⃣ Testing ${term.toUpperCase()} results...`);
      
      try {
        const termResultResponse = await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}?term=${term}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`✅ ${term.toUpperCase()} result retrieved successfully!`);
        
        const result = termResultResponse.data.data;
        
        // Display student info
        console.log(`\n👤 Student: ${result.student.name}`);
        console.log(`🎓 Class: ${result.student.class}`);
        console.log(`📋 Roll Number: ${result.student.rollNumber}`);
        console.log(`📅 Term: ${result.term}`);
        console.log(`🎯 Academic Year: ${result.academicYear}`);
        
        // Display term-specific summary
        console.log('\n📈 Term Summary:');
        console.log('================');
        console.log(`📚 Total Subjects: ${result.summary.totalSubjects}`);
        console.log(`📊 Total Marks: ${result.summary.totalMarks}/${result.summary.totalMaxMarks}`);
        console.log(`📈 Overall Percentage: ${result.summary.overallPercentage}%`);
        console.log(`🏆 Overall Grade: ${result.summary.overallGrade}`);
        console.log(`💬 Remarks: ${result.summary.remarks}`);
        
        // Display subject-wise breakdown for this term
        console.log('\n📖 Subject-wise Performance:');
        console.log('============================');
        
        result.subjects.forEach((subject, index) => {
          console.log(`\n${index + 1}. ${subject.subjectName}`);
          
          // Show term-specific performance
          const termData = subject.terms[term];
          if (termData) {
            console.log(`   📊 ${term}: ${termData.totalMarks}/${termData.maxMarks} (${termData.percentage}%) - Grade: ${termData.grade}`);
            
            // Show individual exams in this term
            termData.exams.forEach(exam => {
              console.log(`      📝 ${exam.examType}: ${exam.marks}/${exam.maxMarks} (${exam.percentage}%) - Grade: ${exam.grade}`);
              if (exam.examTitle) {
                console.log(`         Exam: ${exam.examTitle}`);
              }
              if (exam.teacherName) {
                console.log(`         Teacher: ${exam.teacherName}`);
              }
            });
          } else {
            console.log(`   ⚠️  No data available for ${term}`);
          }
        });
        
        console.log('\n📅 Generated at:', result.generatedAt);
        
      } catch (error) {
        console.log(`❌ ${term.toUpperCase()} test failed:`, error.response?.status || error.message);
        if (error.response?.data) {
          console.log('   Error details:', error.response.data);
        }
      }
    }
    
    // Step 3: Test invalid term
    console.log('\n3️⃣ Testing invalid term...');
    try {
      await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}?term=invalidterm`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Should have failed with invalid term');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid term handled correctly - 400 Bad Request');
      } else if (error.response?.status === 404) {
        console.log('✅ No results found for invalid term - 404 Not Found');
      } else {
        console.log('✅ Invalid term handled appropriately');
      }
    }
    
    // Step 4: Test without term parameter (should return all terms)
    console.log('\n4️⃣ Testing without term parameter (all terms)...');
    try {
      const allTermsResponse = await axios.get(`${BASE_URL}/grades/academic-result/${STUDENT_ID}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ All terms result retrieved successfully!');
      const allTermsResult = allTermsResponse.data.data;
      console.log(`📚 Total subjects across all terms: ${allTermsResult.summary.totalSubjects}`);
      console.log(`📊 Overall performance: ${allTermsResult.summary.overallPercentage}% - Grade: ${allTermsResult.summary.overallGrade}`);
      
    } catch (error) {
      console.log('❌ All terms test failed:', error.response?.status || error.message);
    }
    
    console.log('\n🎉 Term-Specific Academic Result Test Completed!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running on http://localhost:5000');
    console.log('   2. Admin user exists: admin@example.com / Passw0rd!');
    console.log('   3. Student ID exists in database');
    console.log('   4. Student has grades recorded for different terms');
  }
}

// Run the test
testTermSpecificResult().catch(console.error);
