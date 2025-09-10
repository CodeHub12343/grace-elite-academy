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
  // Login admin and student
  const adminLogin = await request('/api/auth/login', 'POST', { email: 'admin@example.com', password: 'Passw0rd!' });
  const adminToken = adminLogin.tokens.accessToken;
  // Find student user we created earlier
  // We need student profile id, get first student
  const classes = await request('/api/classes?page=1&limit=1&sort=-createdAt', 'GET', undefined, adminToken);
  if (!classes.data?.length) throw new Error('No classes');
  const classId = classes.data[0]._id;
  const students = await request(`/api/students?classId=${classId}&page=1&limit=1`, 'GET', undefined, adminToken);
  if (!students.data?.length) throw new Error('No students');
  const student = students.data[0];
  const studentUserEmail = student.userId?.email || 'student1@example.com';
  const studentLogin = await request('/api/auth/login', 'POST', { email: studentUserEmail, password: 'Passw0rd!' });
  const studentToken = studentLogin.tokens.accessToken;

  // Get a subject and teacher for the class
  const subjects = await request(`/api/subjects?classId=${classId}&page=1&limit=1`, 'GET', undefined, adminToken);
  if (!subjects.data?.length) throw new Error('No subjects');
  const subjectId = subjects.data[0]._id;
  const teachers = await request('/api/teachers?page=1&limit=1', 'GET', undefined, adminToken);
  if (!teachers.data?.length) throw new Error('No teachers');
  const teacherId = teachers.data[0]._id;

  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  // 1) Create exam (draft)
  const exam = await request('/api/exams', 'POST', {
    title: 'Math Quick Quiz',
    description: 'CBT sample exam',
    classId,
    subjectId,
    teacherId: teachers.data[0].userId?._id || teachers.data[0]._id,
    startTime,
    endTime,
    duration: 15,
  }, adminToken);
  const examId = exam.data._id;
  console.log('Exam created:', examId);

  // 2) Add questions
  const qres = await request(`/api/exams/${examId}/questions`, 'POST', {
    questions: [
      { type: 'mcq', questionText: '2 + 2 = ?', options: ['3','4','5'], correctAnswer: '4', marks: 5 },
      { type: 'true_false', questionText: '10 is greater than 5', options: ['True','False'], correctAnswer: 'True', marks: 5 },
      { type: 'mcq', questionText: '5 * 3 = ?', options: ['15','10','20'], correctAnswer: '15', marks: 5 },
    ],
  }, adminToken);
  console.log('Questions added:', qres.count);

  // 3) Publish exam
  await request(`/api/exams/${examId}/status`, 'PATCH', { status: 'published' }, adminToken);
  console.log('Exam published');

  // 4) Student fetch questions (randomized)
  const fetchQ = await request(`/api/cbt/exams/${examId}/questions`, 'GET', undefined, studentToken);
  console.log('Student fetched questions:', fetchQ.data.questions.length);

  // 5) Student submit answers (pick first options to simulate)
  const answers = fetchQ.data.questions.map((q) => ({ questionId: q._id, selectedOption: q.options?.[0] || 'True' }));
  const submit = await request(`/api/cbt/exams/${examId}/submit`, 'POST', { answers, studentId: student._id }, studentToken);
  console.log('Submission:', submit.data);

  // 6) Class results
  const classRes = await request(`/api/cbt/results/class/${examId}`, 'GET', undefined, adminToken);
  console.log('Class results:', classRes.data);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});


