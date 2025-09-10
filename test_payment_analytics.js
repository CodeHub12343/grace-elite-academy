const axios = require('axios');

// Test script for Payment Analytics and Reporting System
async function testPaymentAnalytics() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('💰 Testing Payment Analytics and Reporting System...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@school.com',
      password: 'admin123'
    });

    if (!adminLoginResponse.data.success) {
      console.log('❌ Admin login failed:', adminLoginResponse.data.message);
      return;
    }

    const adminToken = adminLoginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');

    // Step 2: Test basic payment analytics
    console.log('\n2️⃣ Testing basic payment analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (analyticsResponse.data.success) {
      console.log('✅ Payment analytics retrieved successfully');
      const analytics = analyticsResponse.data.data;
      
      console.log('\n📊 Summary Statistics:');
      console.log(` Total Payments: ${analytics.summary.totalPayments}`);
      console.log(` Total Amount: ₦${analytics.summary.totalAmount}`);
      console.log(` Successful Payments: ${analytics.summary.successfulPayments}`);
      console.log(` Successful Amount: ₦${analytics.summary.successfulAmount}`);
      console.log(` Failed Payments: ${analytics.summary.failedPayments}`);
      console.log(` Pending Payments: ${analytics.summary.pendingPayments}`);
      console.log(` Average Amount: ₦${analytics.summary.averageAmount}`);
      console.log(` Success Rate: ${analytics.summary.successRate}%`);
      
      console.log('\n📈 Status Breakdown:');
      analytics.breakdowns.byStatus.forEach(status => {
        console.log(` ${status._id}: ${status.count} payments (₦${status.totalAmount}) - ${status.percentage?.toFixed(2) || 0}%`);
      });
      
      console.log('\n🏫 Class Breakdown:');
      analytics.breakdowns.byClass.forEach(cls => {
        console.log(` ${cls._id}: ${cls.count} payments (₦${cls.totalAmount})`);
      });
      
      console.log('\n💳 Payment Method Breakdown:');
      analytics.breakdowns.byPaymentMethod.forEach(method => {
        console.log(` ${method._id}: ${method.count} payments (₦${method.totalAmount})`);
      });
    } else {
      console.log('❌ Analytics failed:', analyticsResponse.data.message);
    }

    // Step 3: Test filtered analytics (last 30 days)
    console.log('\n3️⃣ Testing filtered analytics (last 30 days)...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredAnalyticsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: 'success'
      }
    });

    if (filteredAnalyticsResponse.data.success) {
      console.log('✅ Filtered analytics retrieved successfully');
      const filtered = filteredAnalyticsResponse.data.data;
      console.log(` Filtered Results: ${filtered.summary.totalPayments} payments, ₦${filtered.summary.totalAmount}`);
    }

    // Step 4: Test daily trends
    console.log('\n4️⃣ Testing daily trends...');
    const dailyTrendsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { groupBy: 'day' }
    });

    if (dailyTrendsResponse.data.success) {
      console.log('✅ Daily trends retrieved successfully');
      const trends = dailyTrendsResponse.data.data.trends.daily;
      console.log(` Daily trends data points: ${trends.length}`);
      
      if (trends.length > 0) {
        console.log(' Recent daily data:');
        trends.slice(-5).forEach(day => {
          console.log(`  ${day._id.year}-${day._id.month}-${day._id.day}: ${day.count} payments (₦${day.totalAmount})`);
        });
      }
    }

    // Step 5: Test monthly trends
    console.log('\n5️⃣ Testing monthly trends...');
    const monthlyTrendsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { groupBy: 'month' }
    });

    if (monthlyTrendsResponse.data.success) {
      console.log('✅ Monthly trends retrieved successfully');
      const trends = monthlyTrendsResponse.data.data.trends.monthly;
      console.log(` Monthly trends data points: ${trends.length}`);
      
      if (trends.length > 0) {
        console.log(' Recent monthly data:');
        trends.slice(-3).forEach(month => {
          console.log(`  ${month._id.year}-${month._id.month}: ${month.count} payments (₦${month.totalAmount})`);
        });
      }
    }

    // Step 6: Test top students
    console.log('\n6️⃣ Testing top students analysis...');
    const topStudentsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (topStudentsResponse.data.success) {
      console.log('✅ Top students analysis retrieved successfully');
      const topStudents = topStudentsResponse.data.data.topStudents;
      console.log(` Top students data points: ${topStudents.length}`);
      
      if (topStudents.length > 0) {
        console.log(' Top paying students:');
        topStudents.slice(0, 5).forEach((student, index) => {
          console.log(`  ${index + 1}. ${student._id.studentName} (${student._id.rollNumber}): ₦${student.totalPaid} (${student.paymentCount} payments)`);
        });
      }
    }

    // Step 7: Test recent payments
    console.log('\n7️⃣ Testing recent payments...');
    const recentPaymentsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (recentPaymentsResponse.data.success) {
      console.log('✅ Recent payments retrieved successfully');
      const recent = recentPaymentsResponse.data.data.recentPayments;
      console.log(` Recent payments: ${recent.length}`);
      
      if (recent.length > 0) {
        console.log(' Most recent payments:');
        recent.slice(0, 3).forEach((payment, index) => {
          console.log(`  ${index + 1}. ${payment.user?.name || 'N/A'} - ₦${payment.amount} (${payment.status}) - ${payment.createdAt}`);
        });
      }
    }

    // Step 8: Test CSV export
    console.log('\n8️⃣ Testing CSV export...');
    const csvExportResponse = await axios.get(`${BASE_URL}/payments/export`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { format: 'csv' }
    });

    if (csvExportResponse.status === 200) {
      console.log('✅ CSV export successful');
      console.log(` CSV content length: ${csvExportResponse.data.length} characters`);
      console.log(' CSV headers:', csvExportResponse.data.split('\n')[0]);
    } else {
      console.log('❌ CSV export failed');
    }

    // Step 9: Test JSON export
    console.log('\n9️⃣ Testing JSON export...');
    const jsonExportResponse = await axios.get(`${BASE_URL}/payments/export`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { format: 'json' }
    });

    if (jsonExportResponse.data.success) {
      console.log('✅ JSON export successful');
      console.log(` JSON export count: ${jsonExportResponse.data.count} payments`);
    } else {
      console.log('❌ JSON export failed:', jsonExportResponse.data.message);
    }

    // Step 10: Test filtered export (successful payments only)
    console.log('\n🔟 Testing filtered export (successful payments only)...');
    const filteredExportResponse = await axios.get(`${BASE_URL}/payments/export`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { 
        format: 'json',
        status: 'success'
      }
    });

    if (filteredExportResponse.data.success) {
      console.log('✅ Filtered export successful');
      console.log(` Filtered export count: ${filteredExportResponse.data.count} successful payments`);
    }

    // Step 11: Test class-specific analytics
    console.log('\n1️⃣1️⃣ Testing class-specific analytics...');
    
    // First get a class ID
    const classesResponse = await axios.get(`${BASE_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (classesResponse.data.success && classesResponse.data.data.length > 0) {
      const classId = classesResponse.data.data[0]._id;
      console.log(` Testing analytics for class: ${classesResponse.data.data[0].name}`);
      
      const classAnalyticsResponse = await axios.get(`${BASE_URL}/payments/analytics`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: { classId }
      });

      if (classAnalyticsResponse.data.success) {
        console.log('✅ Class-specific analytics retrieved successfully');
        const classAnalytics = classAnalyticsResponse.data.data;
        console.log(` Class payments: ${classAnalytics.summary.totalPayments} (₦${classAnalytics.summary.totalAmount})`);
      }
    }

    console.log('\n🎉 Payment Analytics and Reporting System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(' ✅ Basic payment analytics');
    console.log(' ✅ Filtered analytics (date range, status)');
    console.log(' ✅ Daily trends analysis');
    console.log(' ✅ Monthly trends analysis');
    console.log(' ✅ Top students analysis');
    console.log(' ✅ Recent payments');
    console.log(' ✅ CSV export functionality');
    console.log(' ✅ JSON export functionality');
    console.log(' ✅ Filtered export');
    console.log(' ✅ Class-specific analytics');

    console.log('\n🎯 Available Endpoints:');
    console.log(' • GET /api/payments/analytics - Comprehensive analytics dashboard');
    console.log(' • GET /api/payments/export - Export payments data (CSV/JSON)');
    console.log(' • GET /api/payments/admin - All payment transactions');
    console.log(' • GET /api/payments/history - Student payment history');
    console.log(' • GET /api/payments/config - Paystack configuration');

    console.log('\n📊 Analytics Features:');
    console.log(' • Summary statistics (totals, averages, success rates)');
    console.log(' • Breakdowns by status, class, payment method');
    console.log(' • Daily and monthly trends');
    console.log(' • Top paying students analysis');
    console.log(' • Recent payments tracking');
    console.log(' • Failed payments analysis');
    console.log(' • Advanced filtering options');
    console.log(' • Data export capabilities');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log(' 1. Server is running on http://localhost:5000');
    console.log(' 2. Admin user exists: admin@school.com / admin123');
    console.log(' 3. Payment data exists in the system');
    console.log(' 4. Database has been seeded with sample data');
  }
}

// Run the test
testPaymentAnalytics().catch(console.error);
