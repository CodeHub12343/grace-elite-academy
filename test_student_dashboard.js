const axios = require('axios');

// Test script for student dashboard endpoints
async function testStudentDashboard() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🎓 Testing Student Dashboard Endpoints...\n');

  try {
    // Step 1: Login as a student
    console.log('1️⃣ Logging in as student...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'student.343@school.test',
      password: 'student123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Student login successful');

    // Step 2: Test all student dashboard endpoints
    const endpoints = [
      { name: 'Dashboard Overview', url: '/student-dashboard/overview' },
      { name: 'Academic Performance', url: '/student-dashboard/academic' },
      { name: 'Attendance Tracking', url: '/student-dashboard/attendance' },
      { name: 'Exam Schedule', url: '/student-dashboard/exams' },
      { name: 'Assignments', url: '/student-dashboard/assignments' },
      { name: 'Fee Status', url: '/student-dashboard/fees' },
      { name: 'Notifications', url: '/student-dashboard/notifications' },
      { name: 'Study Progress', url: '/student-dashboard/progress' },
      { name: 'Teacher Information', url: '/student-dashboard/teachers' },
      { name: 'Academic Calendar', url: '/student-dashboard/calendar' },
      { name: 'Export Data', url: '/student-dashboard/export' }
    ];

    console.log('\n2️⃣ Testing Student Dashboard Endpoints...\n');
    
    let workingEndpoints = 0;
    let totalEndpoints = endpoints.length;

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`);
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, { headers });
        
        console.log(`✅ ${endpoint.name} - Status: ${response.data.success}`);
        console.log(`   Data keys: ${Object.keys(response.data.data || {}).join(', ')}`);
        
        // Show some sample data for key endpoints
        if (endpoint.name === 'Dashboard Overview' && response.data.data) {
          const data = response.data.data;
          console.log(`   📊 Total Grades: ${data.totalGrades || 0}`);
          console.log(`   📈 Average Score: ${data.averageScore || 0}%`);
          console.log(`   📅 Upcoming Exams: ${data.upcomingExams || 0}`);
        }
        
        workingEndpoints++;
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} - Error: ${error.response?.data?.message || error.message}`);
        console.log('');
      }
    }

    // Summary
    console.log('📋 SUMMARY OF STUDENT DASHBOARD ENDPOINTS');
    console.log('==========================================');
    console.log(`✅ Working Endpoints: ${workingEndpoints}/${totalEndpoints}`);
    console.log(`📊 Success Rate: ${Math.round((workingEndpoints/totalEndpoints)*100)}%`);
    
    if (workingEndpoints === totalEndpoints) {
      console.log('\n🎉 All student dashboard endpoints are working perfectly!');
    } else {
      console.log(`\n⚠️  ${totalEndpoints - workingEndpoints} endpoints need attention.`);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('Full error:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running on http://localhost:5000');
    console.log('   2. Student user exists: student.343@school.test / student123');
    console.log('   3. Database has been seeded with sample data');
  }
}

// Run the test
testStudentDashboard().catch(console.error);
