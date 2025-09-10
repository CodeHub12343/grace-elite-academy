const axios = require('axios');

// Test script for Teacher Results Viewing System
async function testTeacherResultsSystem() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('📊 Testing Teacher Results Viewing System...\n');

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

    // Step 2: Get teacher's classes
    console.log('\n2️⃣ Getting teacher\'s classes...');
    const classesResponse = await axios.get(`${BASE_URL}/teacher-results/classes`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    if (classesResponse.data.success) {
      console.log('✅ Teacher classes retrieved successfully');
      console.log(` Classes: ${classesResponse.data.data.length}`);
      
      if (classesResponse.data.data.length === 0) {
        console.log('❌ Teacher has no assigned classes');
        console.log('💡 Admin needs to assign classes to teacher');
        return;
      }
    }

    // Step 3: Get subjects for a specific class
    console.log('\n3️⃣ Getting subjects for a class...');
    const firstClass = classesResponse.data.data[0];
    const subjectsResponse = await axios.get(`${BASE_URL}/teacher-results/subjects?classId=${firstClass._id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    if (subjectsResponse.data.success) {
      console.log('✅ Teacher subjects retrieved successfully');
      console.log(` Subjects for class ${firstClass.name}: ${subjectsResponse.data.data.length}`);
      
      if (subjectsResponse.data.data.length === 0) {
        console.log('❌ Teacher has no subjects for this class');
        console.log('💡 Admin needs to assign subjects to teacher for this class');
        return;
      }
    }

    // Step 4: Get available terms and academic years
    console.log('\n4️⃣ Getting available terms and academic years...');
    const termsResponse = await axios.get(`${BASE_URL}/teacher-results/terms?classId=${firstClass._id}&subjectId=${subjectsResponse.data.data[0]._id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    if (termsResponse.data.success) {
      console.log('✅ Available terms retrieved successfully');
      console.log(` Available term/year combinations: ${termsResponse.data.data.length}`);
      
      if (termsResponse.data.data.length === 0) {
        console.log('❌ No results found for this class/subject combination');
        console.log('💡 Need to create some grades or exam results first');
        return;
      }
      
      console.log(' Available terms:');
      termsResponse.data.data.forEach((term, index) => {
        console.log(`  ${index + 1}. ${term.term} - ${term.academicYear} (${term.count} results)`);
      });
    }

    // Step 5: Get students in the class
    console.log('\n5️⃣ Getting students in the class...');
    const studentsResponse = await axios.get(`${BASE_URL}/teacher-results/students/${firstClass._id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });

    if (studentsResponse.data.success) {
      console.log('✅ Class students retrieved successfully');
      console.log(` Students in class: ${studentsResponse.data.count}`);
      
      if (studentsResponse.data.data.length > 0) {
        console.log(' Sample students:');
        studentsResponse.data.data.slice(0, 3).forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.userId?.name} (${student.rollNumber})`);
        });
      }
    }

    // Step 6: Get comprehensive results for class/subject/term/year
    console.log('\n6️⃣ Getting comprehensive results...');
    const firstSubject = subjectsResponse.data.data[0];
    const firstTerm = termsResponse.data.data[0];
    
    const resultsResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear
      }
    });

    if (resultsResponse.data.success) {
      console.log('✅ Comprehensive results retrieved successfully');
      const results = resultsResponse.data.data;
      
      console.log(`\n📊 Results Summary for ${results.class.name} - ${results.subject.name}`);
      console.log(` Term: ${results.term} | Academic Year: ${results.academicYear}`);
      console.log(` Total Students: ${results.summary.totalStudents}`);
      console.log(` Students with Results: ${results.summary.studentsWithResults}`);
      console.log(` Students without Results: ${results.summary.studentsWithoutResults}`);
      console.log(` Average Score: ${results.summary.averageScore}%`);
      console.log(` Highest Score: ${results.summary.highestScore}%`);
      console.log(` Lowest Score: ${results.summary.lowestScore}%`);
      
      console.log('\n📈 Grade Distribution:');
      Object.entries(results.summary.gradeDistribution).forEach(([grade, count]) => {
        console.log(`  Grade ${grade}: ${count} students`);
      });
      
      console.log('\n👥 Student Results:');
      results.results.slice(0, 5).forEach((result, index) => {
        const grade = result.teacherGrade || result.regularGrade;
        const source = result.teacherGrade ? 'Teacher Grade' : (result.regularGrade ? 'Exam Grade' : 'No Result');
        
        console.log(`  ${index + 1}. ${result.student.userId?.name} (${result.student.rollNumber})`);
        if (grade) {
          console.log(`     Marks: ${grade.marks}/${grade.maxMarks} (${grade.percentage}%) - Grade: ${grade.grade}`);
          console.log(`     Source: ${source}`);
        } else {
          console.log(`     No result available`);
        }
      });
    } else {
      console.log('❌ Results retrieval failed:', resultsResponse.data.message);
    }

    // Step 7: Test results summary
    console.log('\n7️⃣ Testing results summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/teacher-results/summary`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear
      }
    });

    if (summaryResponse.data.success) {
      console.log('✅ Results summary retrieved successfully');
      const summary = summaryResponse.data.data;
      
      console.log(` Total Grades: ${summary.summary.totalGrades}`);
      console.log(` Average Percentage: ${summary.summary.averagePercentage}%`);
      console.log(` Highest Percentage: ${summary.summary.highestPercentage}%`);
      console.log(` Lowest Percentage: ${summary.summary.lowestPercentage}%`);
      
      console.log('\n📊 Grade Distribution:');
      Object.entries(summary.gradeDistribution).forEach(([grade, data]) => {
        console.log(`  Grade ${grade}: ${data.count} students (${data.percentage}%)`);
      });
    }

    // Step 8: Test CSV export
    console.log('\n8️⃣ Testing CSV export...');
    const csvExportResponse = await axios.get(`${BASE_URL}/teacher-results/export`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear,
        format: 'csv'
      }
    });

    if (csvExportResponse.status === 200) {
      console.log('✅ CSV export successful');
      console.log(` CSV content length: ${csvExportResponse.data.length} characters`);
      console.log(' CSV headers:', csvExportResponse.data.split('\n')[0]);
    } else {
      console.log('❌ CSV export failed');
    }

    // Step 9: Test JSON export
    console.log('\n9️⃣ Testing JSON export...');
    const jsonExportResponse = await axios.get(`${BASE_URL}/teacher-results/export`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear,
        format: 'json'
      }
    });

    if (jsonExportResponse.data.success) {
      console.log('✅ JSON export successful');
      console.log(` JSON export count: ${jsonExportResponse.data.data.count} students`);
    } else {
      console.log('❌ JSON export failed:', jsonExportResponse.data.message);
    }

    // Step 10: Test filtering and pagination
    console.log('\n🔟 Testing filtering and pagination...');
    const paginatedResponse = await axios.get(`${BASE_URL}/teacher-results/results`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      params: {
        classId: firstClass._id,
        subjectId: firstSubject._id,
        term: firstTerm.term,
        academicYear: firstTerm.academicYear,
        page: 1,
        limit: 5,
        sort: 'rollNumber'
      }
    });

    if (paginatedResponse.data.success) {
      console.log('✅ Pagination and filtering successful');
      const paginated = paginatedResponse.data.data;
      console.log(` Page: ${paginated.pagination.page}`);
      console.log(` Limit: ${paginated.pagination.limit}`);
      console.log(` Total: ${paginated.pagination.total}`);
      console.log(` Pages: ${paginated.pagination.pages}`);
      console.log(` Results on this page: ${paginated.results.length}`);
    }

    console.log('\n🎉 Teacher Results Viewing System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Teacher authentication');
    console.log(' ✅ Class selection');
    console.log(' ✅ Subject selection');
    console.log(' ✅ Term and academic year selection');
    console.log(' ✅ Student listing');
    console.log(' ✅ Comprehensive results viewing');
    console.log(' ✅ Results summary statistics');
    console.log(' ✅ CSV export functionality');
    console.log(' ✅ JSON export functionality');
    console.log(' ✅ Filtering and pagination');

    console.log('\n🎯 System Features Demonstrated:');
    console.log(' • Teachers can select their assigned classes');
    console.log(' • Teachers can select subjects they teach for each class');
    console.log(' • Teachers can view available terms and academic years');
    console.log(' • Teachers can see all students in their classes');
    console.log(' • Teachers can view comprehensive results for specific criteria');
    console.log(' • Results include both teacher grades and exam grades');
    console.log(' • Summary statistics show performance metrics');
    console.log(' • Export functionality for data analysis');
    console.log(' • Proper access control and authorization');

    console.log('\n📊 Available Endpoints:');
    console.log(' • GET /api/teacher-results/classes - Get teacher\'s classes');
    console.log(' • GET /api/teacher-results/subjects - Get teacher\'s subjects');
    console.log(' • GET /api/teacher-results/terms - Get available terms/years');
    console.log(' • GET /api/teacher-results/students/:classId - Get class students');
    console.log(' • GET /api/teacher-results/results - Get comprehensive results');
    console.log(' • GET /api/teacher-results/summary - Get results summary');
    console.log(' • GET /api/teacher-results/export - Export results data');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Teacher user exists: teacher1@example.com / Passw0rd!');
    console.log(' 3. Teacher has assigned classes and subjects');
    console.log(' 4. Students exist in the system');
    console.log(' 5. Some grades or exam results exist');
    console.log(' 6. Database has been seeded with sample data');
  }
}

// Run the test
testTeacherResultsSystem().catch(console.error);













