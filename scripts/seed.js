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
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} ${text}`);
  }
  return json;
}

async function main() {
  // 1) Ensure admin exists from earlier; login
  const login = await request('/api/auth/login', 'POST', { email: 'admin@example.com', password: 'Passw0rd!' });
  const accessToken = login.tokens.accessToken;
  console.log('Admin login ok');

  // 2) Create teacher and student users via auth register
  let teacherUser, studentUser;
  try {
    teacherUser = await request('/api/auth/register', 'POST', { name: 'Teacher One', email: 'teacher1@example.com', password: 'Passw0rd!', role: 'teacher' });
  } catch (e) {
    console.warn('Teacher user may already exist, proceeding');
    // fetch user not implemented; proceed to create profile assuming manual linking will succeed when userId known
  }
  try {
    studentUser = await request('/api/auth/register', 'POST', { name: 'Student One', email: 'student1@example.com', password: 'Passw0rd!', role: 'student' });
  } catch (e) {
    console.warn('Student user may already exist, proceeding');
  }

  // If just created, ids are present
  const teacherUserId = teacherUser?.user?.id;
  const studentUserId = studentUser?.user?.id;
  if (!teacherUserId || !studentUserId) {
    console.log('Seed requires fresh users to link profiles. Please ensure teacher1@student1 exist and rerun.');
  }

  // 3) Create class
  const cls = await request('/api/classes', 'POST', { name: 'Grade 10A' }, accessToken);
  const classId = cls.data._id;
  console.log('Class created:', classId);

  // 4) Create subject for the class
  const subj = await request('/api/subjects', 'POST', { name: 'Mathematics', code: 'MATH101', classId }, accessToken);
  const subjectId = subj.data._id;
  console.log('Subject created:', subjectId);

  // 5) Create teacher profile linked to user and assign class/subject
  if (teacherUserId) {
    const teacher = await request('/api/teachers', 'POST', { userId: teacherUserId, classes: [classId], subjects: [subjectId], phone: '08012345678', qualification: 'B.Ed', experience: 5 }, accessToken);
    console.log('Teacher profile created:', teacher.data._id);
  } else {
    console.warn('Skipped teacher profile creation: missing teacherUserId');
  }

  // 6) Create student profile linked to user and enroll in class
  if (studentUserId) {
    const student = await request('/api/students', 'POST', { userId: studentUserId, classId, rollNumber: 'G10A-001', parentName: 'Parent One', parentContact: '08099999999' }, accessToken);
    console.log('Student profile created:', student.data._id);
  } else {
    console.warn('Skipped student profile creation: missing studentUserId');
  }

  // 7) Read back
  const classes = await request('/api/classes', 'GET', undefined, accessToken);
  console.log('Classes count:', classes.data.length);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});


