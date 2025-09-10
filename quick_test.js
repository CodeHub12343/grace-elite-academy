const axios = require('axios');

// Simple test script for quick endpoint testing
async function quickTest() {
  const BASE_URL = 'http://localhost:3000/api';
  
  console.log('🚀 Quick API Test Starting...\n');
  
  // Test 1: Health check (no auth required)
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 2: Try to access protected endpoint without auth
  try {
    await axios.get(`${BASE_URL}/classes`);
    console.log('❌ Should have failed - no auth provided');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Auth protection working - 401 Unauthorized');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Login test (you'll need to update these credentials)
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token received');
    
    // Test 4: Use token to access protected endpoint
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Classes endpoint working:', {
      count: classesResponse.data.count,
      total: classesResponse.data.pagination?.total || 0
    });
    
    // Test 5: Test new endpoints
    const endpoints = [
      '/subjects',
      '/attendance',
      '/grades',
      '/questions/bank',
      '/reviews/teacher-analytics'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`✅ ${endpoint}: ${response.data.count || response.data.data?.length || 0} items`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure you have test users in your database:');
    console.log('   - admin@school.com / password123');
    console.log('   - teacher@school.com / password123');
    console.log('   - student@school.com / password123');
  }
  
  console.log('\n🎉 Quick test completed!');
}

// Run the test
quickTest().catch(console.error);






























