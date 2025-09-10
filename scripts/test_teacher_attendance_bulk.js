/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000/api';

  try {
    // 1) Login as admin to get access token
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@school.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    const token = loginRes.data?.tokens?.accessToken;
    if (!token) throw new Error('No access token from login');
    console.log('✅ Logged in as admin');

    const headers = { Authorization: `Bearer ${token}` };

    // 2) Fetch some teachers
    let teachers = [];
    try {
      const tRes = await axios.get(`${baseUrl}/teachers?limit=5`, { headers });
      teachers = tRes.data?.data || tRes.data || [];
      console.log(`👩‍🏫 Teachers fetched: ${teachers.length}`);
    } catch (e) {
      console.log('⚠️ Could not fetch teachers via API, proceeding with empty list');
    }

    if (!Array.isArray(teachers) || teachers.length === 0) {
      throw new Error('No teachers found to mark attendance for');
    }

    // 3) Build records for bulk attendance
    const records = teachers.slice(0, 3).map((t) => ({
      teacherId: String(t._id || t.id),
      status: 'present',
      remarks: 'Automated bulk mark',
    }));

    const payload = {
      date: new Date().toISOString(),
      records,
    };

    // 4) Call bulk endpoint
    const bulkRes = await axios.post(`${baseUrl}/teacher-attendance/bulk`, payload, { headers });
    console.log('✅ Bulk attendance response:', bulkRes.status, bulkRes.data);
  } catch (err) {
    if (err.response) {
      console.error('❌ Request failed:', err.response.status, err.response.data);
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  }
}

main();






