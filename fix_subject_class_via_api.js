const axios = require('axios');

async function fixSubjectClassViaAPI() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    // Login as admin to update the subject
    console.log('Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Admin login successful');

    // Update Physics 21 subject to belong to Class 19
    const subjectId = '68b069b75900df68a70658f4'; // Physics 21
    const classId = '68b069b65900df68a70658c9'; // Class 19
    
    console.log(`Updating subject ${subjectId} to class ${classId}...`);
    
    const updateResponse = await axios.put(`${BASE_URL}/subjects/${subjectId}`, {
      classId: classId
    }, { headers });
    
    console.log('✅ Subject updated successfully:', updateResponse.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

fixSubjectClassViaAPI().catch(console.error);







