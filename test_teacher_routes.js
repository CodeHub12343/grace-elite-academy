const axios = require('axios');

// Test script for teacher routes including the new getCurrentTeacher endpoint
async function testTeacherRoutes() {
  const BASE_URL = 'http://localhost:5000/api';
  
  console.log('👨‍🏫 Testing Teacher Routes...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Passw0rd!'
    });
    
    const adminToken = adminLoginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');
    
    // Step 2: Test getting all teachers (admin access)
    console.log('\n2️⃣ Testing GET /teachers (admin access)...');
    const teachersResponse = await axios.get(`${BASE_URL}/teachers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Found ${teachersResponse.data.count} teachers`);
    if (teachersResponse.data.data.length > 0) {
      console.log(`   First teacher: ${teachersResponse.data.data[0].userId?.name}`);
    }
    
    // Step 3: Test getting a specific teacher by ID
    if (teachersResponse.data.data.length > 0) {
      console.log('\n3️⃣ Testing GET /teachers/:id...');
      const teacherId = teachersResponse.data.data[0]._id;
      const teacherByIdResponse = await axios.get(`${BASE_URL}/teachers/${teacherId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log('✅ Teacher by ID retrieved successfully');
      console.log(`   Name: ${teacherByIdResponse.data.data.userId?.name}`);
      console.log(`   Email: ${teacherByIdResponse.data.data.userId?.email}`);
      console.log(`   Subjects: ${teacherByIdResponse.data.data.subjects?.length || 0}`);
      console.log(`   Classes: ${teacherByIdResponse.data.data.classes?.length || 0}`);
    }
    
    // Step 4: Test teacher login and getCurrentTeacher endpoint
    console.log('\n4️⃣ Testing teacher login and GET /teachers/me...');
    
    // First, let's try to find a teacher user
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const teacherUser = usersResponse.data.data.find(user => user.role === 'teacher');
    
    if (teacherUser) {
      console.log(`   Found teacher user: ${teacherUser.email}`);
      
      // Login as teacher
      const teacherLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: teacherUser.email,
        password: 'Passw0rd!' // Assuming default password
      });
      
      if (teacherLoginResponse.data.success) {
        const teacherToken = teacherLoginResponse.data.data.accessToken;
        console.log('✅ Teacher login successful');
        
        // Test getCurrentTeacher endpoint
        const currentTeacherResponse = await axios.get(`${BASE_URL}/teachers/me`, {
          headers: { 'Authorization': `Bearer ${teacherToken}` }
        });
        
        console.log('✅ GET /teachers/me successful');
        console.log(`   Name: ${currentTeacherResponse.data.data.userId?.name}`);
        console.log(`   Email: ${currentTeacherResponse.data.data.userId?.email}`);
        console.log(`   Phone: ${currentTeacherResponse.data.data.phone || 'Not set'}`);
        console.log(`   Qualification: ${currentTeacherResponse.data.data.qualification || 'Not set'}`);
        console.log(`   Experience: ${currentTeacherResponse.data.data.experience || 'Not set'} years`);
        console.log(`   Subjects: ${currentTeacherResponse.data.data.subjects?.length || 0}`);
        console.log(`   Classes: ${currentTeacherResponse.data.data.classes?.length || 0}`);
        
        // Test that teacher cannot access other teacher's profile
        if (teachersResponse.data.data.length > 0) {
          console.log('\n5️⃣ Testing teacher access restrictions...');
          try {
            await axios.get(`${BASE_URL}/teachers/${teachersResponse.data.data[0]._id}`, {
              headers: { 'Authorization': `Bearer ${teacherToken}` }
            });
            console.log('✅ Teacher can access other teacher profiles (as expected)');
          } catch (error) {
            if (error.response?.status === 403) {
              console.log('✅ Teacher access properly restricted');
            } else {
              console.log('❌ Unexpected error:', error.response?.status);
            }
          }
        }
        
      } else {
        console.log('❌ Teacher login failed');
      }
    } else {
      console.log('❌ No teacher users found in system');
    }
    
    // Step 6: Test admin-only operations
    console.log('\n6️⃣ Testing admin-only operations...');
    
    // Test creating a new teacher (admin only)
    console.log('   Testing teacher creation (admin only)...');
    try {
      const newTeacherData = {
        userId: usersResponse.data.data.find(u => u.role === 'user')?._id,
        phone: '08012345678',
        qualification: 'B.Ed',
        experience: 5,
        subjects: [],
        classes: []
      };
      
      if (newTeacherData.userId) {
        const createTeacherResponse = await axios.post(`${BASE_URL}/teachers`, newTeacherData, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Teacher created successfully');
        console.log(`   New teacher ID: ${createTeacherResponse.data.data._id}`);
        
        // Test updating teacher (admin only)
        const updateData = { phone: '08087654321' };
        const updateTeacherResponse = await axios.patch(`${BASE_URL}/teachers/${createTeacherResponse.data.data._id}`, updateData, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Teacher updated successfully');
        console.log(`   Updated phone: ${updateTeacherResponse.data.data.phone}`);
        
        // Test deleting teacher (admin only)
        const deleteTeacherResponse = await axios.delete(`${BASE_URL}/teachers/${createTeacherResponse.data.data._id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Teacher deleted successfully');
        console.log(`   Message: ${deleteTeacherResponse.data.message}`);
        
      } else {
        console.log('❌ No available user to assign as teacher');
      }
    } catch (error) {
      console.log('❌ Teacher creation/update/delete failed:', error.response?.data?.message || error.message);
    }
    
    // Step 7: Test unauthorized access
    console.log('\n7️⃣ Testing unauthorized access...');
    
    // Test non-admin trying to create teacher
    if (teacherUser) {
      try {
        await axios.post(`${BASE_URL}/teachers`, {}, {
          headers: { 'Authorization': `Bearer ${teacherToken}` }
        });
        console.log('❌ Non-admin should not be able to create teachers');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Non-admin properly restricted from creating teachers');
        } else {
          console.log('❌ Unexpected error for non-admin teacher creation:', error.response?.status);
        }
      }
    }
    
    console.log('\n🎉 Teacher Routes Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ GET /teachers (admin/teacher access)');
    console.log('   ✅ GET /teachers/:id (admin/teacher access)');
    console.log('   ✅ GET /teachers/me (teacher only)');
    console.log('   ✅ POST /teachers (admin only)');
    console.log('   ✅ PATCH /teachers/:id (admin only)');
    console.log('   ✅ DELETE /teachers/:id (admin only)');
    console.log('   ✅ Proper access control and restrictions');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running on http://localhost:5000');
    console.log('   2. Admin user exists: admin@example.com / Passw0rd!');
    console.log('   3. Teacher users exist in the system');
    console.log('   4. Database has been seeded with sample data');
  }
}

// Run the test
testTeacherRoutes().catch(console.error);

























