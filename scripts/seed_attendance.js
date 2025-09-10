/* eslint-disable no-console */
const baseUrl = 'http://localhost:5000';

async function request(path, method = 'GET', body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return json;
}

async function main() {
  // Login as admin
  const login = await request('/api/auth/login', 'POST', { email: 'admin@example.com', password: 'Passw0rd!' });
  const accessToken = login.tokens.accessToken;
  console.log('Admin logged in');

  // Get first class
  const classes = await request('/api/classes?page=1&limit=1&sort=-createdAt', 'GET', undefined, accessToken);
  if (!classes.data || classes.data.length === 0) throw new Error('No classes found');
  const cls = classes.data[0];
  console.log('Using class:', cls._id, cls.name);

  // Get students for class (first 20)
  const students = await request(`/api/students?classId=${cls._id}&page=1&limit=20`, 'GET', undefined, accessToken);
  if (!students.data || students.data.length === 0) throw new Error('No students found in class');
  const records = students.data.map((s, idx) => ({ studentId: s._id, status: idx % 5 === 0 ? 'absent' : 'present' }));

  // Mark attendance for today
  const mark = await request('/api/attendance/mark', 'POST', { classId: cls._id, records }, accessToken);
  console.log('Marked attendance:', mark.data);

  // Get class report for this month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const report = await request(`/api/attendance/report?classId=${cls._id}&startDate=${start}&endDate=${end}`, 'GET', undefined, accessToken);
  console.log('Report count:', report.count);
  console.log(JSON.stringify(report.data.slice(0, 3), null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});


