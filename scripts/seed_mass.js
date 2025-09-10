/* eslint-disable no-console */
// Mass seeding script: generates thousands of records across all models, with configurable counts
// Usage examples (PowerShell):
//   npm run seed:mass -- --students 2000 --teachers 150 --classes 30 --subjects 200 --exams 120 --assignments 800 --attendanceDays 60 --feeCategories 6
// Or directly:
//   node scripts/seed_mass.js --students 2000 --teachers 150 --classes 30 --subjects 200

require('dotenv').config();
const mongoose = require('mongoose');
// Note: Do not pre-hash passwords here; the User model pre-save hook handles hashing

// Models
const User = require('../models/user.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const ClassModel = require('../models/class.model');
const Subject = require('../models/subject.model');
const Attendance = require('../models/attendance.model');
const Grade = require('../models/grade.model');
const TeacherReview = require('../models/teacherReview.model');
const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const Submission = require('../models/submission.model');
const Assignment = require('../models/assignment.model');
const AssignmentSubmission = require('../models/assignmentSubmission.model');
const File = require('../models/file.model');
const FeeCategory = require('../models/feeCategory.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const Fee = require('../models/fee.model');
const Transaction = require('../models/transaction.model');
const Notification = require('../models/notification.model');

function parseArgs() {
	const args = process.argv.slice(2);
	const map = {};
	const positionals = [];
	for (let i = 0; i < args.length; i += 1) {
		const a = args[i];
		if (a.startsWith('--')) {
			const key = a.replace(/^--/, '');
			const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
			map[key] = val;
			if (val !== 'true') i += 1;
		} else {
			positionals.push(a);
		}
	}
	// Support positional order when keys are stripped by npm scripts or shell
	// Order: students, teachers, classes, subjects, exams, assignments,
	//        questionsPerExam, submissionsPerExam, assignmentSubmissionsPerAssignment,
	//        attendanceDays, attendanceDailySample, feeCategories, feesPerStudent, invoicesPerStudent
	const ORDER = ['students','teachers','classes','subjects','exams','assignments','questionsPerExam','submissionsPerExam','assignmentSubmissionsPerAssignment','attendanceDays','attendanceDailySample','feeCategories','feesPerStudent','invoicesPerStudent'];
	if (positionals.length) {
		for (let i = 0; i < Math.min(positionals.length, ORDER.length); i += 1) {
			const key = ORDER[i];
			if (map[key] === undefined) map[key] = positionals[i];
		}
	}
	return map;
}

const argv = parseArgs();

const CONFIG = {
	clear: String(argv.clear ?? process.env.SEED_CLEAR ?? 'true').toLowerCase() !== 'false',
	classes: Number(argv.classes || process.env.SEED_CLASSES || 20),
	subjects: Number(argv.subjects || process.env.SEED_SUBJECTS || 150),
	teachers: Number(argv.teachers || process.env.SEED_TEACHERS || 100),
	students: Number(argv.students || process.env.SEED_STUDENTS || 2000),
	exams: Number(argv.exams || process.env.SEED_EXAMS || 80),
	assignments: Number(argv.assignments || process.env.SEED_ASSIGNMENTS || 500),
	questionsPerExam: Number(argv.questionsPerExam || process.env.SEED_QUESTIONS_PER_EXAM || 20),
	submissionsPerExam: Number(argv.submissionsPerExam || process.env.SEED_SUBMISSIONS_PER_EXAM || 100),
	assignmentSubmissionsPerAssignment: Number(argv.assignmentSubmissionsPerAssignment || process.env.SEED_ASSIGNMENT_SUBMISSIONS_PER_ASSIGNMENT || 50),
	attendanceDays: Number(argv.attendanceDays || process.env.SEED_ATTENDANCE_DAYS || 30),
	attendanceDailySample: Number(argv.attendanceDailySample || process.env.SEED_ATTENDANCE_DAILY_SAMPLE || 0.2), // 20% of students per class/day
	feeCategories: Number(argv.feeCategories || process.env.SEED_FEE_CATEGORIES || 5),
	feesPerStudent: Number(argv.feesPerStudent || process.env.SEED_FEES_PER_STUDENT || 3),
	invoicesPerStudent: Number(argv.invoicesPerStudent || process.env.SEED_INVOICES_PER_STUDENT || 2),
	filesPerTeacher: Number(argv.filesPerTeacher || process.env.SEED_FILES_PER_TEACHER || 2),
	filesPerStudent: Number(argv.filesPerStudent || process.env.SEED_FILES_PER_STUDENT || 1),
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

function choice(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

async function connectDB() {
	await mongoose.connect(MONGO_URI);
	console.log('✅ Connected to MongoDB');
}

async function clearCollections() {
	if (!CONFIG.clear) return;
	console.log('🧹 Clearing collections...');
	const names = [
		'users','teachers','students','classes','subjects','attendances','grades','teacherreviews','exams','questions','submissions','assignments','assignmentsubmissions','files','feecategories','invoices','payments','fees','transactions','notifications'
	];
	for (const name of names) {
		try {
			await mongoose.connection.db.collection(name).deleteMany({});
			console.log(`   Cleared ${name}`);
		} catch (e) {
			console.log(`   Skip ${name}: ${e.message}`);
		}
	}
}

async function createUsers() {
	console.log('👥 Creating users...');
	const users = [];
	users.push(new User({ name: 'Admin User', email: 'admin@school.com', password: 'admin123', role: 'admin', isVerified: true }));
	for (let i = 1; i <= CONFIG.teachers; i += 1) {
		users.push(new User({ name: `Teacher ${i}`, email: `teacher.${i}@school.test`, password: 'teacher123', role: 'teacher', isVerified: true }));
	}
	for (let i = 1; i <= CONFIG.students; i += 1) {
		users.push(new User({ name: `Student ${i}`, email: `student.${i}@school.test`, password: 'student123', role: 'student', isVerified: true }));
	}
	const saved = await User.insertMany(users, { ordered: false });
	return {
		admin: saved.find(u => u.role === 'admin'),
		teacherUsers: saved.filter(u => u.role === 'teacher'),
		studentUsers: saved.filter(u => u.role === 'student'),
	};
}

async function createClasses() {
	console.log('🏫 Creating classes...');
	const sections = ['A','B','C','D'];
	const docs = [];
	for (let i = 1; i <= CONFIG.classes; i += 1) {
		docs.push(new ClassModel({ name: `Class ${i}`, section: choice(sections), teacherIds: [], subjectIds: [], studentIds: [] }));
	}
	return ClassModel.insertMany(docs);
}

async function createSubjects(classes) {
	console.log('📚 Creating subjects...');
	const baseNames = ['Mathematics','English','Physics','Chemistry','Biology','History','Geography','Civics','Economics','Computer Science'];
	const docs = [];
	for (let i = 1; i <= CONFIG.subjects; i += 1) {
		const cls = choice(classes);
		const base = choice(baseNames);
		const code = `${base.slice(0,4).toUpperCase()}${1000 + i}`;
		docs.push(new Subject({ name: `${base} ${i}`, code, classId: cls._id, teacherIds: [] }));
	}
	return Subject.insertMany(docs, { ordered: false });
}

async function createTeachers(userBundle, classes, subjects) {
	console.log('👨\u200d🏫 Creating teachers...');
	const docs = [];
	for (let i = 0; i < CONFIG.teachers; i += 1) {
		const u = userBundle.teacherUsers[i];
		const subCount = 2 + Math.floor(Math.random() * 4);
		const clsCount = 1 + Math.floor(Math.random() * 3);
		const shuffledSubs = [...subjects].sort(() => Math.random() - 0.5);
		const shuffledCls = [...classes].sort(() => Math.random() - 0.5);
		docs.push(new Teacher({
			userId: u._id,
			subjects: shuffledSubs.slice(0, subCount).map(s => s._id),
			classes: shuffledCls.slice(0, clsCount).map(c => c._id),
			phone: `+23480${String(10000000 + Math.floor(Math.random() * 89999999))}`,
			qualification: choice(['B.Ed','M.Ed','B.Sc','M.Sc','Ph.D']),
			experience: Math.floor(Math.random() * 25),
		}));
	}
	const saved = await Teacher.insertMany(docs, { ordered: false });
	// backfill class/subject teachers
	for (const cls of classes) {
		cls.teacherIds = saved.filter(t => t.classes.some(id => id.equals(cls._id))).map(t => t._id);
		await cls.save();
	}
	for (const sub of subjects) {
		sub.teacherIds = saved.filter(t => t.subjects.some(id => id.equals(sub._id))).map(t => t._id);
		await sub.save();
	}
	return saved;
}

async function createStudents(userBundle, classes) {
	console.log('👨\u200d🎓 Creating students...');
	const docs = [];
	for (let i = 0; i < CONFIG.students; i += 1) {
		const u = userBundle.studentUsers[i];
		const cls = classes[i % classes.length];
		docs.push(new Student({
			userId: u._id,
			classId: cls._id,
			rollNumber: `${cls.name.replace(/\s+/g,'')}${String(i + 1).padStart(5,'0')}`,
			parentName: `Parent ${i + 1}`,
			parentContact: `+23481${String(10000000 + Math.floor(Math.random() * 89999999))}`,
		}));
	}
	const saved = await Student.insertMany(docs, { ordered: false });
	for (const cls of classes) {
		cls.studentIds = saved.filter(s => s.classId.equals(cls._id)).map(s => s._id);
		await cls.save();
	}
	return saved;
}

async function createExams(classes, subjects, teachers) {
	console.log('📝 Creating exams...');
	const docs = [];
	for (let i = 1; i <= CONFIG.exams; i += 1) {
		const cls = choice(classes);
		const subsInClass = subjects.filter(s => s.classId.equals(cls._id));
		const sub = subsInClass.length ? choice(subsInClass) : choice(subjects);
		const tchs = teachers.filter(t => t.subjects.some(id => id.equals(sub._id)));
		const tch = tchs.length ? choice(tchs) : choice(teachers);
		docs.push(new Exam({
			title: `Exam ${i} - ${sub.name}`,
			description: `Auto-generated exam ${i}`,
			classId: cls._id,
			subjectId: sub._id,
			teacherId: tch._id,
			startTime: new Date(Date.now() + Math.floor(Math.random()*14)*86400000),
			endTime: new Date(Date.now() + Math.floor(Math.random()*14)*86400000 + (60+Math.floor(Math.random()*120))*60000),
			duration: 60 + Math.floor(Math.random()*120),
			totalMarks: 100,
			status: choice(['draft','published']),
		}));
	}
	return Exam.insertMany(docs, { ordered: false });
}

async function createQuestions(exams) {
	console.log('❓ Creating questions...');
	const docs = [];
	for (const exam of exams) {
		for (let i = 0; i < CONFIG.questionsPerExam; i += 1) {
			docs.push(new Question({
				examId: exam._id,
				type: 'mcq',
				questionText: `Question ${i + 1} for ${exam.title}`,
				options: ['A','B','C','D'],
				correctAnswer: choice(['A','B','C','D']),
				marks: 5,
			}));
		}
	}
	return Question.insertMany(docs, { ordered: false });
}

async function createSubmissions(exams, students, questions) {
	console.log('📄 Creating exam submissions...');
	const docs = [];
	const questionsByExam = new Map();
	for (const q of questions) {
		const k = q.examId.toString();
		if (!questionsByExam.has(k)) questionsByExam.set(k, []);
		questionsByExam.get(k).push(q);
	}
	for (const exam of exams.filter(e => e.status === 'published')) {
		const qs = questionsByExam.get(exam._id.toString()) || [];
		const sample = CONFIG.submissionsPerExam;
		for (let i = 0; i < sample; i += 1) {
			const student = students[(Math.floor(Math.random() * students.length))];
			const answers = qs.slice(0, Math.min(5, qs.length)).map(q => ({ questionId: q._id, selectedOption: choice(['A','B','C','D']) }));
			docs.push(new Submission({ examId: exam._id, studentId: student._id, answers, score: Math.floor(Math.random()*100), status: 'submitted', submittedAt: new Date() }));
		}
	}
	return docs.length ? Submission.insertMany(docs, { ordered: false }) : [];
}

async function createAssignments(classes, subjects, teachers) {
	console.log('📚 Creating assignments...');
	const docs = [];
	if (!classes.length || !subjects.length || !teachers.length) {
		console.log('   Skipping assignments: missing classes/subjects/teachers');
		return [];
	}
	for (let i = 1; i <= CONFIG.assignments; i += 1) {
		const cls = choice(classes);
		if (!cls) break;
		const subsInClass = subjects.filter(s => s.classId.equals(cls._id));
		const sub = subsInClass.length ? choice(subsInClass) : choice(subjects);
		if (!sub) break;
		const tchs = teachers.filter(t => t.subjects.some(id => id.equals(sub._id)));
		const tch = tchs.length ? choice(tchs) : choice(teachers);
		if (!tch) break;
		docs.push(new Assignment({
			title: `Assignment ${i} - ${sub.name}`,
			description: `Auto-generated assignment ${i}`,
			classId: cls._id,
			subjectId: sub._id,
			teacherId: tch._id,
			dueDate: new Date(Date.now() + Math.floor(Math.random()*21)*86400000),
			maxMarks: 50 + Math.floor(Math.random()*50),
		}));
	}
	return Assignment.insertMany(docs, { ordered: false });
}

async function createAssignmentSubmissions(assignments, students) {
	console.log('📝 Creating assignment submissions...');
	const docs = [];
	for (const assignment of assignments) {
		for (let i = 0; i < CONFIG.assignmentSubmissionsPerAssignment; i += 1) {
			const student = students[(Math.floor(Math.random() * students.length))];
			docs.push(new AssignmentSubmission({ assignmentId: assignment._id, studentId: student._id, fileKey: `assignments/${student._id}/${assignment._id}/submission.pdf`, grade: Math.floor(Math.random()*assignment.maxMarks), submittedAt: new Date() }));
		}
	}
	return docs.length ? AssignmentSubmission.insertMany(docs, { ordered: false }) : [];
}

async function createAttendance(students, subjects, teachers) {
	console.log('📅 Creating attendance records...');
	const docs = [];
	if (!students.length || !subjects.length || !teachers.length) {
		console.log('   Skipping attendance: missing students/subjects/teachers');
		return [];
	}
	const today = new Date();
	for (let d = 0; d < CONFIG.attendanceDays; d += 1) {
		const date = new Date(today);
		date.setDate(today.getDate() - d);
		// sample a fraction of students per day to avoid explosion
		const sampleSize = Math.max(1, Math.floor(students.length * CONFIG.attendanceDailySample));
		for (let i = 0; i < sampleSize; i += 1) {
			const student = students[Math.floor(Math.random() * students.length)];
			const subsInClass = subjects.filter(s => s.classId.equals(student.classId));
			if (!subsInClass.length) continue;
			const sub = choice(subsInClass);
			const tchs = teachers.filter(t => t.subjects.some(id => id.equals(sub._id)));
			const tch = tchs.length ? choice(tchs) : choice(teachers);
			docs.push(new Attendance({ studentId: student._id, classId: student.classId, subjectId: sub._id, teacherId: tch._id, date, status: choice(['present','absent','late','excused']), remarks: '' }));
		}
	}
	return docs.length ? Attendance.insertMany(docs, { ordered: false }) : [];
}

async function createFeeCategories() {
	console.log('💰 Creating fee categories...');
	const docs = [];
	for (let i = 1; i <= CONFIG.feeCategories; i += 1) {
		docs.push(new FeeCategory({ name: `Fee Category ${i}`, description: `Auto fee cat ${i}`, amount: 5000 + Math.floor(Math.random()*50000), classId: null }));
	}
	return FeeCategory.insertMany(docs);
}

async function createFees(students, feeCategories) {
	console.log('💳 Creating fees...');
	const docs = [];
	if (!students.length || !feeCategories.length) {
		console.log('   Skipping fees: missing students/feeCategories');
		return [];
	}
	for (const student of students) {
		for (let i = 0; i < CONFIG.feesPerStudent; i += 1) {
			const cat = choice(feeCategories);
			const amount = cat.amount;
			const amountPaid = Math.random() > 0.6 ? amount : Math.random() > 0.5 ? Math.floor(amount * 0.5) : 0;
			docs.push(new Fee({ studentId: student._id, amount, dueDate: new Date(Date.now() + (i+1)*86400000), status: amountPaid >= amount ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid', amountPaid, balance: Math.max(0, amount - amountPaid), lateFee: 0, description: `${cat.name} - ${new Date().getFullYear()}` }));
		}
	}
	return docs.length ? Fee.insertMany(docs, { ordered: false }) : [];
}

async function createInvoices(students, feeCategories) {
	console.log('🧾 Creating invoices...');
	const docs = [];
	if (!students.length || !feeCategories.length) {
		console.log('   Skipping invoices: missing students/feeCategories');
		return [];
	}
	for (const student of students) {
		for (let i = 0; i < CONFIG.invoicesPerStudent; i += 1) {
			const cat = choice(feeCategories);
			docs.push(new Invoice({ studentId: student._id, classId: student.classId, feeCategoryId: cat._id, amount: cat.amount, status: Math.random() > 0.7 ? 'paid' : 'pending', dueDate: new Date(Date.now() + (i+1)*604800000), lateFee: 0, transactionReference: `INV${Date.now()}${Math.random().toString(36).slice(2,10)}${i}`, paymentDate: null }));
		}
	}
	return docs.length ? Invoice.insertMany(docs, { ordered: false }) : [];
}

async function createPayments(invoices) {
	console.log('💸 Creating payments...');
	const docs = [];
	for (const inv of invoices) {
		if (inv.status === 'paid') {
			docs.push(new Payment({ studentId: inv.studentId, invoiceId: inv._id, amount: inv.amount, status: 'success', transactionReference: `TXN${Date.now()}${Math.random().toString(36).slice(2,10)}`, paymentMethod: 'Paystack', gatewayResponse: { status: 'success', message: 'OK' } }));
		}
	}
	return docs.length ? Payment.insertMany(docs, { ordered: false }) : [];
}

async function createTransactions(fees) {
	console.log('🔄 Creating transactions...');
	const docs = [];
	for (const fee of fees) {
		if (fee.amountPaid > 0) {
			docs.push(new Transaction({ studentId: fee.studentId, feeId: fee._id, amount: fee.amountPaid, status: 'success', paystackReference: `PSK${Date.now()}${Math.random().toString(36).slice(2,10)}`, paymentDate: new Date(), paymentMethod: 'Paystack' }));
		}
	}
	return docs.length ? Transaction.insertMany(docs, { ordered: false }) : [];
}

async function createGrades(students, subjects, teachers) {
	console.log('📊 Creating grades...');
	const docs = [];
	const terms = ['term1','term2','final'];
	const examTypes = ['midterm','final','assignment'];
	for (const student of students) {
		const subs = subjects.filter(s => s.classId.equals(student.classId));
		for (const sub of subs) {
			for (const term of terms) {
				const marks = 40 + Math.floor(Math.random()*61);
				const teacher = teachers.find(t => t.subjects.some(id => id.equals(sub._id))) || choice(teachers);
				docs.push(new Grade({ studentId: student._id, classId: student.classId, subjectId: sub._id, teacherId: teacher._id, marks, maxMarks: 100, grade: marks >= 90 ? 'A' : marks >= 80 ? 'B' : marks >= 70 ? 'C' : marks >= 60 ? 'D' : 'F', percentage: (marks/100)*100, term, examType: choice(examTypes) }));
			}
		}
	}
	return docs.length ? Grade.insertMany(docs, { ordered: false }) : [];
}

async function createTeacherReviews(students, teachers) {
	console.log('⭐ Creating teacher reviews...');
	const docs = [];
	for (const teacher of teachers) {
		for (let i = 0; i < 20; i += 1) {
			const student = choice(students);
			docs.push(new TeacherReview({ teacherId: teacher._id, reviewedBy: student._id, rating: 1 + Math.floor(Math.random()*5), comment: 'Auto-generated review', date: new Date() }));
		}
	}
	return TeacherReview.insertMany(docs, { ordered: false });
}

async function createFiles(usersBundle, assignments) {
	console.log('📁 Creating files...');
	const docs = [];
	for (const tUser of usersBundle.teacherUsers) {
		for (let i = 0; i < CONFIG.filesPerTeacher; i += 1) {
			docs.push(new File({ fileName: `resource-${i}.pdf`, key: `resources/${tUser._id}/${i}.pdf`, url: 'https://example.com/file.pdf', uploaderId: tUser._id, role: 'teacher', category: 'resource', size: 100000 + Math.floor(Math.random()*1000000), mimeType: 'application/pdf', relatedId: null, isPublic: true }));
		}
	}
	for (const sUser of usersBundle.studentUsers) {
		for (let i = 0; i < CONFIG.filesPerStudent; i += 1) {
			docs.push(new File({ fileName: `upload-${i}.pdf`, key: `uploads/${sUser._id}/${i}.pdf`, url: 'https://example.com/upload.pdf', uploaderId: sUser._id, role: 'student', category: 'upload', size: 50000 + Math.floor(Math.random()*500000), mimeType: 'application/pdf', relatedId: assignments.length ? choice(assignments)._id : null, isPublic: false }));
		}
	}
	return docs.length ? File.insertMany(docs, { ordered: false }) : [];
}

async function createNotifications(usersBundle) {
	console.log('🔔 Creating notifications...');
	const docs = [];
	const allUsers = [usersBundle.admin, ...usersBundle.teacherUsers, ...usersBundle.studentUsers].filter(Boolean);
	for (const u of allUsers) {
		if (Math.random() > 0.6) {
			docs.push(new Notification({ userId: u._id, title: 'System Notice', message: 'Auto notification', type: choice(['in-app','email']), status: choice(['sent','pending']), metadata: { category: 'system' } }));
		}
	}
	return docs.length ? Notification.insertMany(docs, { ordered: false }) : [];
}

async function main() {
	try {
		console.log('🚀 Mass seeding starting with config:', CONFIG);
		await connectDB();
		await clearCollections();

		const users = await createUsers();
		const classes = await createClasses();
		const subjects = await createSubjects(classes);
		const teachers = await createTeachers(users, classes, subjects);
		const students = await createStudents(users, classes);

		const exams = await createExams(classes, subjects, teachers);
		const questions = await createQuestions(exams);
		await createSubmissions(exams, students, questions);
		const assignments = await createAssignments(classes, subjects, teachers);
		await createAssignmentSubmissions(assignments, students);
		await createAttendance(students, subjects, teachers);
		await createGrades(students, subjects, teachers);
		const feeCategories = await createFeeCategories();
		const fees = await createFees(students, feeCategories);
		const invoices = await createInvoices(students, feeCategories);
		await createPayments(invoices);
		await createTransactions(fees);
		await createFiles(users, assignments);
		await createNotifications(users);

		console.log('✅ Mass seeding completed.');
		process.exit(0);
	} catch (err) {
		console.error('❌ Mass seeding failed:', err);
		process.exit(1);
	}
}

main();


