const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testTeacherResultsEndpoints() {
  let token = null;
  let headers = null;
  let classId = null;
  let subjectId = null;
  let term = null;
  let academicYear = null;

  try {
    console.log('🚀 Testing Teacher Results Endpoints\n');

    // Step 1: Login as teacher
    console.log('1. Logging in as teacher...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'teacher.28@school.test',
      password: 'teacher123'
    });
    
    token = loginResponse.data.tokens.accessToken;
    headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Teacher login successful\n');

    // Step 2: Get classes
    console.log('2. Testing GET /api/teacher-results/classes');
    const classesResponse = await axios.get(`${BASE_URL}/teacher-results/classes`, { headers });
    console.log('✅ Classes endpoint successful');
    console.log('Classes:', JSON.stringify(classesResponse.data, null, 2));
    
    // Get first class ID for subsequent tests
    const firstClass = classesResponse.data.data?.[0];
    classId = firstClass?._id;
    console.log(`Using classId: ${classId}\n`);
    
    if (!classId) {
      console.log('❌ No classes found, cannot continue with other tests\n');
      return;
    }

    // Step 3: Get subjects for the class
    console.log('3. Testing GET /api/teacher-results/subjects');
    const subjectsResponse = await axios.get(`${BASE_URL}/teacher-results/subjects?classId=${classId}`, { headers });
    console.log('✅ Subjects endpoint successful');
    console.log('Subjects:', JSON.stringify(subjectsResponse.data, null, 2));
    
    // Get first subject ID for subsequent tests
    const firstSubject = subjectsResponse.data.data?.[0];
    subjectId = firstSubject?._id;
    console.log(`Using subjectId: ${subjectId}\n`);
    
    if (!subjectId) {
      console.log('❌ No subjects found, cannot continue with other tests\n');
      return;
    }

    // Step 4: Get available terms
    console.log('4. Testing GET /api/teacher-results/terms');
    const termsResponse = await axios.get(`${BASE_URL}/teacher-results/terms?classId=${classId}&subjectId=${subjectId}`, { headers });
    console.log('✅ Terms endpoint successful');
    console.log('Terms:', JSON.stringify(termsResponse.data, null, 2));
    
    // Get first term for subsequent tests
    const firstTerm = termsResponse.data.data?.[0];
    term = firstTerm?.term;
    academicYear = firstTerm?.academicYear;
    console.log(`Using term: ${term}, academicYear: ${academicYear}\n`);
    
    if (!term || !academicYear) {
      console.log('❌ No terms found, cannot continue with other tests\n');
      return;
    }

    // Step 5: Get available exam types
    console.log('5. Testing GET /api/teacher-results/exam-types');
    try {
      const examTypesResponse = await axios.get(`${BASE_URL}/teacher-results/exam-types?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}`, { headers });
      console.log('✅ Exam types endpoint successful');
      console.log('Exam Types:', JSON.stringify(examTypesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Exam types endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 6: Get available exam titles
    console.log('6. Testing GET /api/teacher-results/exam-titles');
    try {
      const examTitlesResponse = await axios.get(`${BASE_URL}/teacher-results/exam-titles?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}`, { headers });
      console.log('✅ Exam titles endpoint successful');
      console.log('Exam Titles:', JSON.stringify(examTitlesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Exam titles endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 7: Get results (basic)
    console.log('7. Testing GET /api/teacher-results/results (basic)');
    try {
      const resultsResponse = await axios.get(`${BASE_URL}/teacher-results/results?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}`, { headers });
      console.log('✅ Results endpoint successful');
      console.log('Results:', JSON.stringify(resultsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Results endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 8: Test results with exam type filter
    console.log('8. Testing GET /api/teacher-results/results with examType filter');
    try {
      const resultsWithExamTypeResponse = await axios.get(`${BASE_URL}/teacher-results/results?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}&examType=assignment`, { headers });
      console.log('✅ Results with examType filter successful');
      console.log('Results (examType=assignment):', JSON.stringify(resultsWithExamTypeResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Results with examType filter failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 9: Test results with exam title filter
    console.log('9. Testing GET /api/teacher-results/results with examTitle filter');
    try {
      const resultsWithExamTitleResponse = await axios.get(`${BASE_URL}/teacher-results/results?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}&examTitle=Test`, { headers });
      console.log('✅ Results with examTitle filter successful');
      console.log('Results (examTitle=Test):', JSON.stringify(resultsWithExamTitleResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Results with examTitle filter failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 10: Test combined filtering
    console.log('10. Testing GET /api/teacher-results/results with combined filters');
    try {
      const resultsCombinedResponse = await axios.get(`${BASE_URL}/teacher-results/results?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}&examType=assignment&examTitle=Test`, { headers });
      console.log('✅ Results with combined filters successful');
      console.log('Results (combined filters):', JSON.stringify(resultsCombinedResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Results with combined filters failed:', error.response?.data || error.message);
    }
    console.log();

    // Step 11: Test additional endpoints
    console.log('11. Testing additional endpoints...');
    
    // Test students endpoint
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/teacher-results/students/${classId}`, { headers });
      console.log('✅ Students endpoint successful');
      console.log('Students:', JSON.stringify(studentsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Students endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    // Test export endpoint
    try {
      const exportResponse = await axios.get(`${BASE_URL}/teacher-results/export?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}`, { headers });
      console.log('✅ Export endpoint successful');
      console.log('Export:', JSON.stringify(exportResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Export endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    // Test summary endpoint
    try {
      const summaryResponse = await axios.get(`${BASE_URL}/teacher-results/summary?classId=${classId}&subjectId=${subjectId}&term=${term}&academicYear=${academicYear}`, { headers });
      console.log('✅ Summary endpoint successful');
      console.log('Summary:', JSON.stringify(summaryResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Summary endpoint failed:', error.response?.data || error.message);
    }
    console.log();

    console.log('🎉 All teacher results endpoints tested!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

// Run the test
testTeacherResultsEndpoints();










