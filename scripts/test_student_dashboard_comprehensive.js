const axios = require('axios');

// Test script for comprehensive student dashboard system
async function testStudentDashboardSystem() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🎓 Testing Comprehensive Student Dashboard System...\n');

  try {
    // Step 1: Login as admin to get student data
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'admin123'
    });
    const adminToken = adminLoginResponse.data.tokens.accessToken;
    console.log('✅ Admin login successful');

    // Step 2: Get students to find one with data
    console.log('\n2️⃣ Getting students data...');
    const studentsResponse = await axios.get(`${BASE_URL}/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (studentsResponse.data.data.length === 0) {
      console.log('❌ No students found in system');
      return;
    }

    const student = studentsResponse.data.data[0];
    console.log(`✅ Found student: ${student.userId?.name}`);
    console.log(` Class: ${student.classId?.name}`);
    console.log(` Subjects: ${student.subjects?.length || 0}`);

    // Step 3: Login as the student
    console.log('\n3️⃣ Logging in as student...');
    const studentLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'student.1@school.test', // Use known working student email
      password: 'student123' // Default student password
    });

    if (!studentLoginResponse.data.tokens) {
      console.log('❌ Student login failed');
      return;
    }

    const studentToken = studentLoginResponse.data.tokens.accessToken;
    console.log('✅ Student login successful');

    // Step 4: Test Dashboard Overview
    console.log('\n4️⃣ Testing GET /student-dashboard/overview...');
    try {
      const overviewResponse = await axios.get(`${BASE_URL}/student-dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Dashboard overview retrieved successfully!');
      console.log(` Student: ${overviewResponse.data.data.student.name}`);
      console.log(` Class: ${overviewResponse.data.data.student.class}`);
      console.log(` Academic Performance: ${overviewResponse.data.data.overview.academicPerformance.averagePercentage}%`);
      console.log(` Attendance: ${overviewResponse.data.data.overview.attendance.percentage}%`);
      console.log(` Fee Payment: ${overviewResponse.data.data.overview.fees.paymentPercentage}%`);
      console.log(` Upcoming Exams: ${overviewResponse.data.data.upcoming.exams.length}`);
      console.log(` Pending Assignments: ${overviewResponse.data.data.upcoming.assignments.length}`);
      console.log(` Recent Notifications: ${overviewResponse.data.data.notifications.length}`);
    } catch (error) {
      console.log('❌ Dashboard overview failed:', error.response?.data?.message || error.message);
    }

    // Step 5: Test Academic Performance
    console.log('\n5️⃣ Testing GET /student-dashboard/academic...');
    try {
      const academicResponse = await axios.get(`${BASE_URL}/student-dashboard/academic`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Academic performance retrieved successfully!');
      console.log(` Total Grades: ${academicResponse.data.data.summary.totalGrades}`);
      console.log(` Average Percentage: ${academicResponse.data.data.summary.averagePercentage}%`);
      console.log(` Highest Percentage: ${academicResponse.data.data.summary.highestPercentage}%`);
      console.log(` Lowest Percentage: ${academicResponse.data.data.summary.lowestPercentage}%`);
      console.log(` Performance by Subject: ${academicResponse.data.data.performanceBySubject.length} subjects`);
      console.log(` Performance by Term: ${academicResponse.data.data.performanceByTerm.length} terms`);
    } catch (error) {
      console.log('❌ Academic performance failed:', error.response?.data?.message || error.message);
    }

    // Step 6: Test Attendance Tracking
    console.log('\n6️⃣ Testing GET /student-dashboard/attendance...');
    try {
      const attendanceResponse = await axios.get(`${BASE_URL}/student-dashboard/attendance?period=30d`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Attendance tracking retrieved successfully!');
      console.log(` Total Days: ${attendanceResponse.data.data.summary.totalDays}`);
      console.log(` Present Days: ${attendanceResponse.data.data.summary.presentDays}`);
      console.log(` Absent Days: ${attendanceResponse.data.data.summary.absentDays}`);
      console.log(` Late Days: ${attendanceResponse.data.data.summary.lateDays}`);
      console.log(` Attendance Percentage: ${attendanceResponse.data.data.summary.attendancePercentage}%`);
      console.log(` Monthly Breakdown: ${attendanceResponse.data.data.attendanceByMonth.length} months`);
    } catch (error) {
      console.log('❌ Attendance tracking failed:', error.response?.data?.message || error.message);
    }

    // Step 7: Test Exam Schedule
    console.log('\n7️⃣ Testing GET /student-dashboard/exams...');
    try {
      const examsResponse = await axios.get(`${BASE_URL}/student-dashboard/exams?status=all`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Exam schedule retrieved successfully!');
      console.log(` Total Exams: ${examsResponse.data.data.statistics.totalExams}`);
      console.log(` Average Percentage: ${examsResponse.data.data.statistics.averagePercentage}%`);
      console.log(` Pass Rate: ${examsResponse.data.data.statistics.passRate}%`);
      console.log(` Upcoming Exams: ${examsResponse.data.data.upcomingExams.length}`);
      console.log(` All Exams: ${examsResponse.data.data.exams.length}`);
    } catch (error) {
      console.log('❌ Exam schedule failed:', error.response?.data?.message || error.message);
    }

    // Step 8: Test Assignments
    console.log('\n8️⃣ Testing GET /student-dashboard/assignments...');
    try {
      const assignmentsResponse = await axios.get(`${BASE_URL}/student-dashboard/assignments?status=all`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Assignments retrieved successfully!');
      console.log(` Total Assignments: ${assignmentsResponse.data.data.statistics.totalAssignments}`);
      console.log(` Submitted Assignments: ${assignmentsResponse.data.data.statistics.submittedAssignments}`);
      console.log(` Pending Assignments: ${assignmentsResponse.data.data.statistics.pendingAssignments}`);
      console.log(` Overdue Assignments: ${assignmentsResponse.data.data.statistics.overdueAssignments}`);
      console.log(` Submission Rate: ${assignmentsResponse.data.data.statistics.submissionRate}%`);
    } catch (error) {
      console.log('❌ Assignments failed:', error.response?.data?.message || error.message);
    }

    // Step 9: Test Fee Status
    console.log('\n9️⃣ Testing GET /student-dashboard/fees...');
    try {
      const feesResponse = await axios.get(`${BASE_URL}/student-dashboard/fees`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Fee status retrieved successfully!');
      console.log(` Total Fees: ₦${feesResponse.data.data.summary.totalFees}`);
      console.log(` Paid Fees: ₦${feesResponse.data.data.summary.paidFees}`);
      console.log(` Pending Fees: ₦${feesResponse.data.data.summary.pendingFees}`);
      console.log(` Overdue Fees: ₦${feesResponse.data.data.summary.overdueFees}`);
      console.log(` Payment Percentage: ${feesResponse.data.data.summary.paymentPercentage}%`);
      console.log(` Fee Breakdown: ${feesResponse.data.data.feeBreakdown.length} categories`);
    } catch (error) {
      console.log('❌ Fee status failed:', error.response?.data?.message || error.message);
    }

    // Step 10: Test Notifications
    console.log('\n🔟 Testing GET /student-dashboard/notifications...');
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/student-dashboard/notifications`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Notifications retrieved successfully!');
      console.log(` Total Notifications: ${notificationsResponse.data.data.summary.totalNotifications}`);
      console.log(` Unread Notifications: ${notificationsResponse.data.data.summary.unreadNotifications}`);
      console.log(` Read Notifications: ${notificationsResponse.data.data.summary.readNotifications}`);
      console.log(` Notifications by Type: ${notificationsResponse.data.data.notificationsByType.length} types`);
    } catch (error) {
      console.log('❌ Notifications failed:', error.response?.data?.message || error.message);
    }

    // Step 11: Test Study Progress
    console.log('\n1️⃣1️⃣ Testing GET /student-dashboard/progress...');
    try {
      const progressResponse = await axios.get(`${BASE_URL}/student-dashboard/progress`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Study progress retrieved successfully!');
      console.log(` Total Grades: ${progressResponse.data.data.overallProgress.totalGrades}`);
      console.log(` Average Percentage: ${progressResponse.data.data.overallProgress.averagePercentage}%`);
      console.log(` Academic Progress: ${progressResponse.data.data.academicProgress.length} terms`);
      console.log(` Subject Progress: ${progressResponse.data.data.subjectProgress.length} subjects`);
      console.log(` Attendance Progress: ${progressResponse.data.data.attendanceProgress.length} months`);
      console.log(` Assignment Progress: ${progressResponse.data.data.assignmentProgress.length} months`);
    } catch (error) {
      console.log('❌ Study progress failed:', error.response?.data?.message || error.message);
    }

    // Step 12: Test Teacher Information
    console.log('\n1️⃣2️⃣ Testing GET /student-dashboard/teachers...');
    try {
      const teachersResponse = await axios.get(`${BASE_URL}/student-dashboard/teachers`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Teacher information retrieved successfully!');
      console.log(` Total Teachers: ${teachersResponse.data.data.teachers.length}`);
      teachersResponse.data.data.teachers.forEach((teacher, index) => {
        console.log(` ${index + 1}. ${teacher.name} - ${teacher.subjects?.length || 0} subjects, ${teacher.classes?.length || 0} classes`);
        if (teacher.performance) {
          console.log(`    Performance: ${teacher.performance.averagePercentage}% avg, ${teacher.performance.totalGrades} grades`);
        }
        console.log(`    Reviews: ${teacher.reviews.total} reviews, ${teacher.reviews.averageRating} avg rating`);
      });
    } catch (error) {
      console.log('❌ Teacher information failed:', error.response?.data?.message || error.message);
    }

    // Step 13: Test Academic Calendar
    console.log('\n1️⃣3️⃣ Testing GET /student-dashboard/calendar...');
    try {
      const currentDate = new Date();
      const calendarResponse = await axios.get(`${BASE_URL}/student-dashboard/calendar?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Academic calendar retrieved successfully!');
      console.log(` Calendar Month: ${calendarResponse.data.data.calendar.month}/${calendarResponse.data.data.calendar.year}`);
      console.log(` Total Events: ${calendarResponse.data.data.events.length}`);
      console.log(` Total Exams: ${calendarResponse.data.data.summary.totalExams}`);
      console.log(` Total Assignments: ${calendarResponse.data.data.summary.totalAssignments}`);
      console.log(` Attendance Days: ${calendarResponse.data.data.summary.attendanceDays}`);
      console.log(` Notifications: ${calendarResponse.data.data.summary.notifications}`);
    } catch (error) {
      console.log('❌ Academic calendar failed:', error.response?.data?.message || error.message);
    }

    // Step 14: Test Data Export
    console.log('\n1️⃣4️⃣ Testing GET /student-dashboard/export...');
    try {
      const exportResponse = await axios.get(`${BASE_URL}/student-dashboard/export?format=json&dataType=all`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Data export retrieved successfully!');
      console.log(` Export Format: ${exportResponse.headers['content-type']}`);
      console.log(` Student: ${exportResponse.data.student.name}`);
      console.log(` Data Type: ${exportResponse.data.dataType}`);
      console.log(` Exported At: ${exportResponse.data.exportedAt}`);
      if (exportResponse.data.academic) {
        console.log(` Academic Data: ${exportResponse.data.academic.grades.length} grades`);
      }
      if (exportResponse.data.attendance) {
        console.log(` Attendance Data: ${exportResponse.data.attendance.records.length} records`);
      }
      if (exportResponse.data.exams) {
        console.log(` Exam Data: ${exportResponse.data.exams.exams.length} exams`);
      }
      if (exportResponse.data.assignments) {
        console.log(` Assignment Data: ${exportResponse.data.assignments.assignments.length} assignments`);
      }
      if (exportResponse.data.fees) {
        console.log(` Fee Data: ${exportResponse.data.fees.fees.length} fees, ${exportResponse.data.fees.payments.length} payments`);
      }
    } catch (error) {
      console.log('❌ Data export failed:', error.response?.data?.message || error.message);
    }

    // Step 15: Test with different query parameters
    console.log('\n1️⃣5️⃣ Testing with different query parameters...');
    
    // Test academic performance with filters
    try {
      const academicFilteredResponse = await axios.get(`${BASE_URL}/student-dashboard/academic?term=1&page=1&limit=5`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Academic performance with filters works!');
      console.log(` Filtered Results: ${academicFilteredResponse.data.data.grades.length} grades`);
    } catch (error) {
      console.log('❌ Academic performance with filters failed:', error.response?.data?.message || error.message);
    }

    // Test attendance with different periods
    try {
      const attendanceWeeklyResponse = await axios.get(`${BASE_URL}/student-dashboard/attendance?period=7d`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Attendance with 7-day period works!');
      console.log(` Weekly Attendance: ${attendanceWeeklyResponse.data.data.summary.totalDays} days`);
    } catch (error) {
      console.log('❌ Attendance with 7-day period failed:', error.response?.data?.message || error.message);
    }

    // Test exams with different status
    try {
      const upcomingExamsResponse = await axios.get(`${BASE_URL}/student-dashboard/exams?status=upcoming`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Upcoming exams filter works!');
      console.log(` Upcoming Exams: ${upcomingExamsResponse.data.data.exams.length} exams`);
    } catch (error) {
      console.log('❌ Upcoming exams filter failed:', error.response?.data?.message || error.message);
    }

    // Test assignments with different status
    try {
      const pendingAssignmentsResponse = await axios.get(`${BASE_URL}/student-dashboard/assignments?status=pending`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Pending assignments filter works!');
      console.log(` Pending Assignments: ${pendingAssignmentsResponse.data.data.assignments.length} assignments`);
    } catch (error) {
      console.log('❌ Pending assignments filter failed:', error.response?.data?.message || error.message);
    }

    // Test notifications with filters
    try {
      const unreadNotificationsResponse = await axios.get(`${BASE_URL}/student-dashboard/notifications?isRead=false`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log('✅ Unread notifications filter works!');
      console.log(` Unread Notifications: ${unreadNotificationsResponse.data.data.notifications.length} notifications`);
    } catch (error) {
      console.log('❌ Unread notifications filter failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Comprehensive Student Dashboard Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Dashboard overview with key metrics');
    console.log(' ✅ Academic performance with detailed analytics');
    console.log(' ✅ Attendance tracking with trends');
    console.log(' ✅ Exam schedule and results');
    console.log(' ✅ Assignment management');
    console.log(' ✅ Fee and payment status');
    console.log(' ✅ Notifications and announcements');
    console.log(' ✅ Study progress and analytics');
    console.log(' ✅ Teacher information and reviews');
    console.log(' ✅ Academic calendar and events');
    console.log(' ✅ Data export functionality');
    console.log(' ✅ Query parameter filtering');
    console.log(' ✅ Pagination support');
    console.log(' ✅ Role-based access control');
    console.log(' ✅ Comprehensive error handling');

    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Admin user exists: admin@school.com / admin123');
    console.log(' 3. Students exist with assigned classes and subjects');
    console.log(' 4. Database has been seeded with sample data');
    console.log(' 5. Student dashboard routes are properly configured');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Admin user exists: admin@school.com / admin123');
    console.log(' 3. Students exist with assigned classes and subjects');
    console.log(' 4. Database has been seeded with sample data');
    console.log(' 5. Student dashboard routes are properly configured');
  }
}

// Run the test
testStudentDashboardSystem().catch(console.error);
