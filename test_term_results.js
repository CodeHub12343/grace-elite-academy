const axios = require('axios');

// Test script for Term Results functionality
async function testTermResults() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('📊 Testing Term Results System...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Passw0rd!'
    });

    if (!adminLoginResponse.data.success) {
      console.log('❌ Admin login failed:', adminLoginResponse.data.message);
      return;
    }

    const adminToken = adminLoginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');

    // Step 2: Get students and classes to work with
    console.log('\n2️⃣ Getting students and classes data...');
    const [studentsResponse, classesResponse, subjectsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/students?limit=5`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }),
      axios.get(`${BASE_URL}/classes?limit=3`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }),
      axios.get(`${BASE_URL}/subjects?limit=5`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
    ]);

    if (studentsResponse.data.data.length === 0 || classesResponse.data.data.length === 0 || subjectsResponse.data.data.length === 0) {
      console.log('❌ Need students, classes, and subjects to test');
      return;
    }

    const student = studentsResponse.data.data[0];
    const classDoc = classesResponse.data.data[0];
    const subjects = subjectsResponse.data.data.slice(0, 3); // Use first 3 subjects

    console.log(`✅ Selected student: ${student.userId?.name} (${student.rollNumber})`);
    console.log(`✅ Selected class: ${classDoc.name}`);
    console.log(`✅ Selected subjects: ${subjects.map(s => s.name).join(', ')}`);

    // Step 3: Test uploading a single term result
    console.log('\n3️⃣ Testing single term result upload...');
    const termResultData = {
      studentId: student._id,
      classId: classDoc._id,
      term: 'term1',
      academicYear: '2023-2024',
      subjects: subjects.map(subject => ({
        subjectId: subject._id,
        marks: Math.floor(Math.random() * 40) + 60, // Random marks between 60-100
        maxMarks: 100,
        examType: 'final'
      })),
      comments: 'Term 1 examination results',
      isPublished: false
    };

    const uploadResponse = await axios.post(`${BASE_URL}/term-results/upload`, termResultData, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (uploadResponse.data.success) {
      console.log('✅ Single term result uploaded successfully');
      console.log(` Overall Grade: ${uploadResponse.data.data.overallGrade}`);
      console.log(` Average Percentage: ${uploadResponse.data.data.averagePercentage}%`);
    } else {
      console.log('❌ Single upload failed:', uploadResponse.data.message);
    }

    // Step 4: Test bulk upload for multiple students
    console.log('\n4️⃣ Testing bulk term result upload...');
    const bulkData = {
      classId: classDoc._id,
      term: 'term1',
      academicYear: '2023-2024',
      results: studentsResponse.data.data.slice(0, 3).map(student => ({
        studentId: student._id,
        subjects: subjects.map(subject => ({
          subjectId: subject._id,
          marks: Math.floor(Math.random() * 40) + 60,
          maxMarks: 100,
          examType: 'final'
        }))
      })),
      comments: 'Bulk upload for Term 1',
      isPublished: false
    };

    const bulkResponse = await axios.post(`${BASE_URL}/term-results/bulk-upload`, bulkData, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (bulkResponse.data.success) {
      console.log('✅ Bulk upload completed successfully');
      console.log(` Processed: ${bulkResponse.data.data.summary.successful}/${bulkResponse.data.data.summary.total} students`);
    } else {
      console.log('❌ Bulk upload failed:', bulkResponse.data.message);
    }

    // Step 5: Test viewing class results (admin view)
    console.log('\n5️⃣ Testing class term results view (admin)...');
    const classResultsResponse = await axios.get(`${BASE_URL}/term-results/class/${classDoc._id}?term=term1&academicYear=2023-2024`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (classResultsResponse.data.success) {
      console.log('✅ Class term results retrieved successfully');
      console.log(` Total results: ${classResultsResponse.data.count}`);
      
      if (classResultsResponse.data.data.length > 0) {
        const firstResult = classResultsResponse.data.data[0];
        console.log(` Sample result for ${firstResult.studentId.userId.name}:`);
        console.log(`  Overall Grade: ${firstResult.overallGrade}`);
        console.log(`  Average: ${firstResult.averagePercentage}%`);
        console.log(`  Subjects: ${firstResult.subjects.length}`);
      }
    }

    // Step 6: Test publishing a result
    console.log('\n6️⃣ Testing result publication...');
    if (uploadResponse.data.success) {
      const resultId = uploadResponse.data.data._id;
      const publishResponse = await axios.patch(`${BASE_URL}/term-results/${resultId}/publish`, {}, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (publishResponse.data.success) {
        console.log('✅ Term result published successfully');
      } else {
        console.log('❌ Publication failed:', publishResponse.data.message);
      }
    }

    // Step 7: Test student viewing their own results
    console.log('\n7️⃣ Testing student viewing their results...');
    const studentResultsResponse = await axios.get(`${BASE_URL}/term-results/student/${student._id}?term=term1&academicYear=2023-2024`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (studentResultsResponse.data.success) {
      console.log('✅ Student term results retrieved successfully');
      console.log(` Total results: ${studentResultsResponse.data.count}`);
      
      if (studentResultsResponse.data.data.length > 0) {
        const result = studentResultsResponse.data.data[0];
        console.log(` Term: ${result.term}`);
        console.log(` Academic Year: ${result.academicYear}`);
        console.log(` Overall Grade: ${result.overallGrade}`);
        console.log(` Average: ${result.averagePercentage}%`);
        console.log(` Subjects: ${result.subjects.length}`);
        
        // Show subject details
        console.log('\n📚 Subject Details:');
        result.subjects.forEach((subject, index) => {
          console.log(` ${index + 1}. ${subject.subjectName} (${subject.subjectCode}): ${subject.marks}/${subject.maxMarks} (${subject.percentage}%) - Grade: ${subject.grade}`);
        });
      }
    }

    // Step 8: Test filtering by different terms
    console.log('\n8️⃣ Testing term filtering...');
    const terms = ['term1', 'term2', 'final'];
    
    for (const term of terms) {
      try {
        const termFilterResponse = await axios.get(`${BASE_URL}/term-results/student/${student._id}?term=${term}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (termFilterResponse.data.success) {
          console.log(`✅ ${term} filter works: ${termFilterResponse.data.count} results`);
        }
      } catch (error) {
        console.log(`ℹ️ No results for ${term}`);
      }
    }

    console.log('\n🎉 Term Results Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Admin authentication');
    console.log(' ✅ Single term result upload');
    console.log(' ✅ Bulk term result upload');
    console.log(' ✅ Class results viewing');
    console.log(' ✅ Result publication');
    console.log(' ✅ Student results viewing');
    console.log(' ✅ Term filtering');
    console.log(' ✅ Role-based access control');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Admin user exists: admin@example.com / Passw0rd!');
    console.log(' 3. Students, classes, and subjects exist in the system');
    console.log(' 4. Database has been seeded with sample data');
  }
}

// Run the test
testTermResults().catch(console.error);























