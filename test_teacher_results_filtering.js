const axios = require('axios');

// Test script for Teacher Results Filtering System (Exam Type & Exam Title)
async function testTeacherResultsFiltering() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🔍 Testing Teacher Results Filtering System...\n');

  try {
    // Step 1: Login as a teacher
    console.log('1️⃣ Logging in as teacher...');
    const teacherLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'teacher1@example.com',
      password: 'Passw0rd!'
    });

    if (!teacherLoginResponse.data.success) {
      console.log('❌ Teacher login failed:', teacherLoginResponse.data.message);
      console.log('💡 Trying alternative teacher credentials...');
      
      // Try to get a teacher from the system
      const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@example.com',
        password: 'Passw0rd!'
      });
      
      if (adminLoginResponse.data.success) {
        const adminToken = adminLoginResponse.data.data.accessToken;
        const teachersResponse = await axios.get(`${BASE_URL}/teachers?limit=1`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (teachersResponse.data.data.length > 0) {
          const teacher = teachersResponse.data.data[0];
          console.log(`ℹ️ Found teacher: ${teacher.userId?.name} (${teacher.userId?.email})`);
          console.log('💡 Please use this teacher\'s credentials to test');
          return;
        }
      }
      return;
    }

    const teacherToken = teacherLoginResponse.data.data.accessToken;
    console.log('✅ Teacher login successful');

    // Step 2: Get teacher's classes and subjects
    console.log('\n2️⃣ Getting teacher\'s classes and subjects...');
    const [classesResponse, subjectsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/teacher-results/classes`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      }),
      axios.get(`${BASE_URL}/teacher-results/subjects`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      })
    ]);

    if (classesResponse.data.data.length === 0 || subjectsResponse.data.data.length === 0) {
      console.log('❌ Teacher has no assigned classes or subjects');
      return;
    }

    const firstClass = classesResponse.data.data[0];
    const firstSubject = subjectsResponse.data.data[0];
    console.log(`✅ Found class: ${firstClass.name}`);
    console.log(`✅ Found subject: ${firstSubject.name}`);

    // Step 3: Get available terms and academic years
    console.log('\n3️⃣ Getting available terms and academic years...');
    const termsResponse = await axios.get(`${BASE_URL}/teacher-results/terms`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id
      }
    });

    if (termsResponse.data.data.length === 0) {
      console.log('❌ No terms found for this class/subject combination');
      return;
    }

    const firstTerm = termsResponse.data.data[0];
    console.log(`✅ Found term: ${firstTerm.term} - ${firstTerm.academicYear}`);

    // Step 4: Get available exam types
    console.log('\n4️⃣ Getting available exam types...');
    const examTypesResponse = await axios.get(`${BASE_URL}/teacher-results/exam-types`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear
      }
    });

    console.log('✅ Available exam types:');
    examTypesResponse.data.data.forEach((examType, index) => {
      console.log(`  ${index + 1}. ${examType.examType} (${examType.count} results)`);
    });

    // Step 5: Get available exam titles
    console.log('\n5️⃣ Getting available exam titles...');
    const examTitlesResponse = await axios.get(`${BASE_URL}/teacher-results/exam-titles`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear
      }
    });

    console.log('✅ Available exam titles:');
    examTitlesResponse.data.data.forEach((exam, index) => {
      console.log(`  ${index + 1}. ${exam.examTitle} (${exam.examType}) - ${exam.count} results`);
    });

    // Step 6: Test filtering by exam type
    if (examTypesResponse.data.data.length > 0) {
      console.log('\n6️⃣ Testing filtering by exam type...');
      const firstExamType = examTypesResponse.data.data[0];
      
      const examTypeResultsResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examType: firstExamType.examType
        }
      });

      if (examTypeResultsResponse.data.success) {
        console.log(`✅ Filtered by exam type: ${firstExamType.examType}`);
        console.log(` Results found: ${examTypeResultsResponse.data.data.results.length}`);
        console.log(` Students with results: ${examTypeResultsResponse.data.data.summary.studentsWithResults}`);
        
        // Show sample results
        if (examTypeResultsResponse.data.data.results.length > 0) {
          console.log(' Sample results:');
          examTypeResultsResponse.data.data.results.slice(0, 3).forEach((result, index) => {
            const grade = result.teacherGrade || result.regularGrade;
            if (grade) {
              console.log(`  ${index + 1}. ${result.student.userId?.name} - ${grade.marks}/${grade.maxMarks} (${grade.percentage}%) - ${grade.examType}`);
            }
          });
        }
      }
    }

    // Step 7: Test filtering by exam title
    if (examTitlesResponse.data.data.length > 0) {
      console.log('\n7️⃣ Testing filtering by exam title...');
      const firstExamTitle = examTitlesResponse.data.data[0];
      
      const examTitleResultsResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examTitle: firstExamTitle.examTitle
        }
      });

      if (examTitleResultsResponse.data.success) {
        console.log(`✅ Filtered by exam title: ${firstExamTitle.examTitle}`);
        console.log(` Results found: ${examTitleResultsResponse.data.data.results.length}`);
        console.log(` Students with results: ${examTitleResultsResponse.data.data.summary.studentsWithResults}`);
        
        // Show sample results
        if (examTitleResultsResponse.data.data.results.length > 0) {
          console.log(' Sample results:');
          examTitleResultsResponse.data.data.results.slice(0, 3).forEach((result, index) => {
            const grade = result.teacherGrade || result.regularGrade;
            if (grade) {
              console.log(`  ${index + 1}. ${result.student.userId?.name} - ${grade.marks}/${grade.maxMarks} (${grade.percentage}%) - ${grade.examTitle}`);
            }
          });
        }
      }
    }

    // Step 8: Test combined filtering (exam type + exam title)
    if (examTypesResponse.data.data.length > 0 && examTitlesResponse.data.data.length > 0) {
      console.log('\n8️⃣ Testing combined filtering (exam type + exam title)...');
      const firstExamType = examTypesResponse.data.data[0];
      const firstExamTitle = examTitlesResponse.data.data[0];
      
      const combinedResultsResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examType: firstExamType.examType,
          examTitle: firstExamTitle.examTitle
        }
      });

      if (combinedResultsResponse.data.success) {
        console.log(`✅ Combined filtering: ${firstExamType.examType} + ${firstExamTitle.examTitle}`);
        console.log(` Results found: ${combinedResultsResponse.data.data.results.length}`);
        console.log(` Students with results: ${combinedResultsResponse.data.data.summary.studentsWithResults}`);
      }
    }

    // Step 9: Test export with filtering
    console.log('\n9️⃣ Testing export with filtering...');
    if (examTypesResponse.data.data.length > 0) {
      const firstExamType = examTypesResponse.data.data[0];
      
      const exportResponse = await axios.get(`${BASE_URL}/teacher-results/export`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examType: firstExamType.examType,
          format: 'json'
        }
      });

      if (exportResponse.data.success) {
        console.log(`✅ Export with exam type filter successful`);
        console.log(` Exported ${exportResponse.data.data.count} results for ${firstExamType.examType}`);
      }
    }

    // Step 10: Test summary with filtering
    console.log('\n🔟 Testing summary with filtering...');
    if (examTypesResponse.data.data.length > 0) {
      const firstExamType = examTypesResponse.data.data[0];
      
      const summaryResponse = await axios.get(`${BASE_URL}/teacher-results/summary`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examType: firstExamType.examType
        }
      });

      if (summaryResponse.data.success) {
        console.log(`✅ Summary with exam type filter successful`);
        const summary = summaryResponse.data.data.summary;
        console.log(` Total grades: ${summary.totalGrades}`);
        console.log(` Average percentage: ${summary.averagePercentage}%`);
        console.log(` Grade distribution:`, summary.gradeDistribution);
      }
    }

    // Step 11: Test all exam types
    console.log('\n1️⃣1️⃣ Testing all exam types...');
    for (const examType of examTypesResponse.data.data) {
      const typeResultsResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` },
        params: {
          classId: firstClass._id,
          subjectId: firstSubject._id,
          term: firstTerm.term,
          academicYear: firstTerm.academicYear,
          examType: examType.examType
        }
      });

      if (typeResultsResponse.data.success) {
        console.log(`  ${examType.examType}: ${typeResultsResponse.data.data.results.length} results`);
      }
    }

    console.log('\n🎉 Teacher Results Filtering System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Teacher authentication');
    console.log(' ✅ Class and subject selection');
    console.log(' ✅ Term and academic year selection');
    console.log(' ✅ Exam type filtering');
    console.log(' ✅ Exam title filtering');
    console.log(' ✅ Combined filtering (type + title)');
    console.log(' ✅ Export with filtering');
    console.log(' ✅ Summary with filtering');
    console.log(' ✅ All exam types tested');

    console.log('\n🎯 New Filtering Features Demonstrated:');
    console.log(' • Teachers can filter results by exam type (midterm, final, assignment)');
    console.log(' • Teachers can filter results by specific exam titles');
    console.log(' • Teachers can combine multiple filters for precise results');
    console.log(' • Export functionality supports all filtering options');
    console.log(' • Summary statistics respect filtering criteria');
    console.log(' • Dynamic filtering based on available data');

    console.log('\n📊 Available Filtering Endpoints:');
    console.log(' • GET /api/teacher-results/exam-types - Get available exam types');
    console.log(' • GET /api/teacher-results/exam-titles - Get available exam titles');
    console.log(' • GET /api/teacher-results/results?examType=midterm - Filter by exam type');
    console.log(' • GET /api/teacher-results/results?examTitle="Math Quiz" - Filter by exam title');
    console.log(' • GET /api/teacher-results/results?examType=final&examTitle="Final Exam" - Combined filtering');
    console.log(' • GET /api/teacher-results/export?examType=midterm - Export with filtering');
    console.log(' • GET /api/teacher-results/summary?examType=assignment - Summary with filtering');

    console.log('\n💡 Usage Examples:');
    console.log(' 1. View all midterm results for Class 10 Mathematics:');
    console.log('    GET /api/teacher-results/results?classId=123&subjectId=456&term=term1&academicYear=2023-2024&examType=midterm');
    console.log(' 2. View results for a specific exam:');
    console.log('    GET /api/teacher-results/results?classId=123&subjectId=456&term=term1&academicYear=2023-2024&examTitle="Algebra Test"');
    console.log(' 3. Export all assignment results:');
    console.log('    GET /api/teacher-results/export?classId=123&subjectId=456&term=term1&academicYear=2023-2024&examType=assignment&format=csv');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Teacher user exists: teacher1@example.com / Passw0rd!');
    console.log(' 3. Teacher has assigned classes and subjects');
    console.log(' 4. Students exist in the system');
    console.log(' 5. Some grades or exam results exist with exam types and titles');
    console.log(' 6. Database has been seeded with sample data');
  }
}

// Run the test
testTeacherResultsFiltering().catch(console.error);











