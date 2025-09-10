const axios = require('axios');

async function testSimpleStudentEndpoint() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    // Login as student
    console.log('Logging in as student...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'student.343@school.test',
      password: 'student123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Student login successful');
    
    // Test a simple endpoint first
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, { headers });
    console.log('✅ Health endpoint works:', healthResponse.data);
    
    // Test student dashboard overview
    console.log('Testing student dashboard overview...');
    const dashboardResponse = await axios.get(`${BASE_URL}/student-dashboard/overview`, { headers });
    console.log('✅ Dashboard overview works:', dashboardResponse.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.log('Status:', error.response.status);
    }
  }
}

testSimpleStudentEndpoint().catch(console.error);








