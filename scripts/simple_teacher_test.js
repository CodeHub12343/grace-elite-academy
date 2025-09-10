const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing teacher login...');
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'teacher.28@school.test',
      password: 'teacher123'
    });
    console.log('Login successful:', response.data);
    
    const token = response.data.tokens.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('\nTesting classes endpoint...');
    const classesResponse = await axios.get('http://localhost:5000/api/teacher-results/classes', { headers });
    console.log('Classes response:', JSON.stringify(classesResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error details:');
    console.error('Message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Full error:', error);
  }
}

testLogin();










