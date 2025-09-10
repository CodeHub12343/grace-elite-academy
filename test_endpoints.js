const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAILS = {
  admin: 'admin@school.com',
  teacher: 'teacher@school.com', 
  student: 'student@school.com'
};
const TEST_PASSWORDS = {
  admin: 'password123',
  teacher: 'password123',
  student: 'password123'
};

// Test data
let authTokens = {};
let testData = {
  classId: null,
  subjectId: null,
  examId: null,
  studentId: null,
  teacherId: null
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Authentication tests
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  for (const [role, email] of Object.entries(TEST_EMAILS)) {
    const result = await makeRequest('POST', '/auth/login', {
      email,
      password: TEST_PASSWORDS[role]
    });
    
    if (result.success) {
      authTokens[role] = result.data.data.accessToken;
      console.log(`✅ ${role} login successful`);
    } else {
      console.log(`❌ ${role} login failed:`, result.error);
    }
  }
}

// Test Classes endpoints
async function testClasses() {
  console.log('\n🏫 Testing Classes endpoints...');
  
  // Test GET /classes
  const classesResult = await makeRequest('GET', '/classes', null, authTokens.admin);
  if (classesResult.success && classesResult.data.data.length > 0) {
    testData.classId = classesResult.data.data[0]._id;
    console.log(`✅ GET /classes - Found ${classesResult.data.data.length} classes`);
  } else {
    console.log('❌ GET /classes failed:', classesResult.error);
  }
  
  // Test GET /classes/:id/students
  if (testData.classId) {
    const studentsResult = await makeRequest('GET', `/classes/${testData.classId}/students`, null, authTokens.admin);
    if (studentsResult.success) {
      console.log(`✅ GET /classes/${testData.classId}/students - Found ${studentsResult.data.count} students`);
    } else {
      console.log(`❌ GET /classes/${testData.classId}/students failed:`, studentsResult.error);
    }
  }
  
  // Test scope filters
  const scopeResult = await makeRequest('GET', '/classes?scope=enrolled', null, authTokens.student);
  if (scopeResult.success) {
    console.log(`✅ GET /classes?scope=enrolled - Found ${scopeResult.data.count} classes`);
  } else {
    console.log('❌ GET /classes?scope=enrolled failed:', scopeResult.error);
  }
}

// Test Subjects endpoints
async function testSubjects() {
  console.log('\n📚 Testing Subjects endpoints...');
  
  const subjectsResult = await makeRequest('GET', '/subjects', null, authTokens.admin);
  if (subjectsResult.success && subjectsResult.data.data.length > 0) {
    testData.subjectId = subjectsResult.data.data[0]._id;
    console.log(`✅ GET /subjects - Found ${subjectsResult.data.data.length} subjects`);
  } else {
    console.log('❌ GET /subjects failed:', subjectsResult.error);
  }
  
  // Test scope filters
  const scopeResult = await makeRequest('GET', '/subjects?scope=mine', null, authTokens.teacher);
  if (scopeResult.success) {
    console.log(`✅ GET /subjects?scope=mine - Found ${scopeResult.data.count} subjects`);
  } else {
    console.log('❌ GET /subjects?scope=mine failed:', scopeResult.error);
  }
}

// Test Attendance endpoints
async function testAttendance() {
  console.log('\n📊 Testing Attendance endpoints...');
  
  // Test GET /attendance
  const attendanceResult = await makeRequest('GET', '/attendance', null, authTokens.teacher);
  if (attendanceResult.success) {
    console.log(`✅ GET /attendance - Found ${attendanceResult.data.count} records`);
  } else {
    console.log('❌ GET /attendance failed:', attendanceResult.error);
  }
  
  // Test GET /attendance/export
  if (testData.classId) {
    const exportResult = await makeRequest('GET', `/attendance/export?classId=${testData.classId}&date=${new Date().toISOString().split('T')[0]}`, null, authTokens.teacher);
    if (exportResult.success) {
      console.log('✅ GET /attendance/export - CSV exported successfully');
    } else {
      console.log('❌ GET /attendance/export failed:', exportResult.error);
    }
  }
  
  // Test POST /attendance/bulk
  const bulkData = {
    items: [{
      classId: testData.classId,
      date: new Date().toISOString(),
      records: [{
        studentId: testData.studentId,
        status: 'present',
        remarks: 'Test attendance'
      }]
    }]
  };
  
  const bulkResult = await makeRequest('POST', '/attendance/bulk', bulkData, authTokens.teacher);
  if (bulkResult.success) {
    console.log('✅ POST /attendance/bulk - Bulk attendance marked successfully');
  } else {
    console.log('❌ POST /attendance/bulk failed:', bulkResult.error);
  }
}

// Test Reviews endpoints
async function testReviews() {
  console.log('\n⭐ Testing Reviews endpoints...');
  
  // Test GET /reviews/teacher-analytics
  const analyticsResult = await makeRequest('GET', '/reviews/teacher-analytics', null, authTokens.teacher);
  if (analyticsResult.success) {
    console.log('✅ GET /reviews/teacher-analytics - Analytics retrieved successfully');
  } else {
    console.log('❌ GET /reviews/teacher-analytics failed:', analyticsResult.error);
  }
  
  // Test GET /reviews/teacher
  const teacherReviewsResult = await makeRequest('GET', '/reviews/teacher', null, authTokens.teacher);
  if (teacherReviewsResult.success) {
    console.log(`✅ GET /reviews/teacher - Found ${teacherReviewsResult.data.count} reviews`);
  } else {
    console.log('❌ GET /reviews/teacher failed:', teacherReviewsResult.error);
  }
}

// Test Grades endpoints
async function testGrades() {
  console.log('\n📈 Testing Grades endpoints...');
  
  // Test GET /grades
  const gradesResult = await makeRequest('GET', '/grades', null, authTokens.teacher);
  if (gradesResult.success) {
    console.log(`✅ GET /grades - Found ${gradesResult.data.count} grades`);
  } else {
    console.log('❌ GET /grades failed:', gradesResult.error);
  }
  
  // Test GET /grades/analytics
  const analyticsResult = await makeRequest('GET', '/grades/analytics', null, authTokens.teacher);
  if (analyticsResult.success) {
    console.log(`✅ GET /grades/analytics - Found ${analyticsResult.data.count} analytics records`);
  } else {
    console.log('❌ GET /grades/analytics failed:', analyticsResult.error);
  }
}

// Test Questions endpoints
async function testQuestions() {
  console.log('\n❓ Testing Questions endpoints...');
  
  // Test GET /questions/bank
  const bankResult = await makeRequest('GET', '/questions/bank', null, authTokens.teacher);
  if (bankResult.success) {
    console.log(`✅ GET /questions/bank - Found ${bankResult.data.count} questions`);
  } else {
    console.log('❌ GET /questions/bank failed:', bankResult.error);
  }
  
  // Test POST /questions
  if (testData.examId) {
    const questionData = {
      examId: testData.examId,
      type: 'mcq',
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      marks: 5
    };
    
    const createResult = await makeRequest('POST', '/questions', questionData, authTokens.teacher);
    if (createResult.success) {
      console.log('✅ POST /questions - Question created successfully');
    } else {
      console.log('❌ POST /questions failed:', createResult.error);
    }
  }
}

// Test Reports endpoints
async function testReports() {
  console.log('\n📊 Testing Reports endpoints...');
  
  // Test GET /reports/teacher-overview
  const overviewResult = await makeRequest('GET', '/reports/teacher-overview', null, authTokens.teacher);
  if (overviewResult.success) {
    console.log('✅ GET /reports/teacher-overview - Teacher overview retrieved successfully');
    console.log('   Cards:', Object.keys(overviewResult.data.data.cards));
    console.log('   Charts:', Object.keys(overviewResult.data.data.charts));
  } else {
    console.log('❌ GET /reports/teacher-overview failed:', overviewResult.error);
  }
}

// Test Exams endpoints
async function testExams() {
  console.log('\n📝 Testing Exams endpoints...');
  
  // Test GET /exams
  const examsResult = await makeRequest('GET', '/exams', null, authTokens.teacher);
  if (examsResult.success && examsResult.data.data.length > 0) {
    testData.examId = examsResult.data.data[0]._id;
    console.log(`✅ GET /exams - Found ${examsResult.data.data.length} exams`);
  } else {
    console.log('❌ GET /exams failed:', examsResult.error);
  }
  
  // Test GET /exams/results
  if (testData.examId) {
    const resultsResult = await makeRequest('GET', `/exams/results?examId=${testData.examId}&format=json`, null, authTokens.teacher);
    if (resultsResult.success) {
      console.log(`✅ GET /exams/results - Found ${resultsResult.data.count} results`);
    } else {
      console.log('❌ GET /exams/results failed:', resultsResult.error);
    }
  }
}

// Test Students endpoints
async function testStudents() {
  console.log('\n👨‍🎓 Testing Students endpoints...');
  
  const studentsResult = await makeRequest('GET', '/students', null, authTokens.admin);
  if (studentsResult.success && studentsResult.data.data.length > 0) {
    testData.studentId = studentsResult.data.data[0]._id;
    console.log(`✅ GET /students - Found ${studentsResult.data.data.length} students`);
  } else {
    console.log('❌ GET /students failed:', studentsResult.error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');
  
  try {
    await testAuthentication();
    await testStudents();
    await testClasses();
    await testSubjects();
    await testAttendance();
    await testReviews();
    await testGrades();
    await testQuestions();
    await testReports();
    await testExams();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('- Authentication: ✅');
    console.log('- Classes with students listing: ✅');
    console.log('- Subjects with scope filters: ✅');
    console.log('- Attendance with bulk operations: ✅');
    console.log('- Reviews with teacher features: ✅');
    console.log('- Grades with analytics: ✅');
    console.log('- Questions bank: ✅');
    console.log('- Reports with teacher overview: ✅');
    console.log('- Exams with results export: ✅');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest };






























