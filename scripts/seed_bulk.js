/* eslint-disable no-console */
// Bulk configurable seeding script to generate hundreds/thousands of records
// Usage examples:
//   node scripts/seed_bulk.js --classes 10 --subjects 60 --teachers 20 --students 500
//   node scripts/seed_bulk.js            (uses defaults)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
require('dotenv').config();

// Models
const User = require('../models/user.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const ClassModel = require('../models/class.model');
const Subject = require('../models/subject.model');

// Args
function parseArgs() {
	const args = process.argv.slice(2);
	const map = {};
	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg.startsWith('--')) {
			const key = arg.replace(/^--/, '');
			const next = args[i + 1];
			if (next && !next.startsWith('--')) {
				map[key] = next;
				i += 1;
			} else {
				map[key] = true;
			}
		}
	}
	return map;
}

const argv = parseArgs();

const DEFAULTS = {
	classes: Number(argv.classes || process.env.SEED_CLASSES || 8),
	subjects: Number(argv.subjects || process.env.SEED_SUBJECTS || 40),
	teachers: Number(argv.teachers || process.env.SEED_TEACHERS || 20),
	students: Number(argv.students || process.env.SEED_STUDENTS || 300),
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

async function connectDB() {
	await mongoose.connect(MONGO_URI);
	console.log('✅ Connected to MongoDB');
}

async function clearCollections() {
	console.log('🧹 Clearing existing core collections...');
	const collections = ['users', 'teachers', 'students', 'classes', 'subjects'];
	for (const name of collections) {
		try {
			await mongoose.connection.db.collection(name).deleteMany({});
			console.log(`   Cleared ${name}`);
		} catch (e) {
			console.log(`   Skip clear ${name}:`, e.message);
		}
	}
}

function randomChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(prefix, idx) {
	return `${prefix} ${idx}`;
}

function generateEmail(prefix, idx) {
	return `${prefix}.${idx}@school.test`.toLowerCase();
}

async function seedUsers({ teachers, students }) {
	console.log('👥 Creating users...');
	const docs = [];

	// Admin
	docs.push(new User({
		name: 'Admin User',
		email: 'admin@school.com',
		password: 'admin123',
		role: 'admin',
		isVerified: true,
	}));

	// Teachers
	for (let i = 1; i <= teachers; i += 1) {
		docs.push(new User({
			name: generateName('Teacher', i),
			email: generateEmail('teacher', i),
			password: 'teacher123',
			role: 'teacher',
			isVerified: true,
		}));
	}

	// Students
	for (let i = 1; i <= students; i += 1) {
		docs.push(new User({
			name: generateName('Student', i),
			email: generateEmail('student', i),
			password: 'student123',
			role: 'student',
			isVerified: true,
		}));
	}

	const saved = await User.insertMany(docs, { ordered: false });
	const out = {
		admin: saved.find(u => u.role === 'admin'),
		teacherUsers: saved.filter(u => u.role === 'teacher'),
		studentUsers: saved.filter(u => u.role === 'student'),
	};
	console.log(`   Users created: ${saved.length} (teachers=${out.teacherUsers.length}, students=${out.studentUsers.length})`);
	return out;
}

async function seedClasses({ classes }) {
	console.log('🏫 Creating classes...');
	const docs = [];
	const sections = ['A', 'B', 'C', 'D'];
	for (let i = 1; i <= classes; i += 1) {
		docs.push(new ClassModel({
			name: `Class ${i}`,
			section: randomChoice(sections),
			teacherIds: [],
			subjectIds: [],
			studentIds: [],
		}));
	}
	const saved = await ClassModel.insertMany(docs);
	console.log(`   Classes created: ${saved.length}`);
	return saved;
}

async function seedSubjects(allClasses, { subjects }) {
	console.log('📚 Creating subjects...');
	const subjectNames = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Civics', 'Economics', 'Computer Science'];
	const docs = [];
	for (let i = 1; i <= subjects; i += 1) {
		const cls = randomChoice(allClasses);
		const base = randomChoice(subjectNames);
		const code = `${base.slice(0, 4).toUpperCase()}${100 + i}`;
		docs.push(new Subject({
			name: `${base} ${i}`,
			code,
			classId: cls._id,
			teacherIds: [],
		}));
	}
	const saved = await Subject.insertMany(docs, { ordered: false });
	console.log(`   Subjects created: ${saved.length}`);
	return saved;
}

async function seedTeachers(userBundle, allClasses, allSubjects, { teachers }) {
	console.log('👨\u200d🏫 Creating teachers...');
	const docs = [];
	for (let i = 0; i < teachers; i += 1) {
		const user = userBundle.teacherUsers[i];
		// Assign 2-4 subjects and 1-3 classes
		const shuffledSubjects = [...allSubjects].sort(() => Math.random() - 0.5);
		const shuffledClasses = [...allClasses].sort(() => Math.random() - 0.5);
		const subCount = 2 + Math.floor(Math.random() * 3);
		const clsCount = 1 + Math.floor(Math.random() * 3);
		docs.push(new Teacher({
			userId: user._id,
			subjects: shuffledSubjects.slice(0, subCount).map(s => s._id),
			classes: shuffledClasses.slice(0, clsCount).map(c => c._id),
			phone: `+23480${String(10000000 + Math.floor(Math.random() * 89999999))}`,
			qualification: randomChoice(['B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'Ph.D']),
			experience: Math.floor(Math.random() * 20),
		}));
	}
	const saved = await Teacher.insertMany(docs);
	console.log(`   Teachers created: ${saved.length}`);

	// Backfill references on Class and Subject (lightweight, partial)
	for (const cls of allClasses) {
		const ids = saved.filter(t => t.classes.some(id => id.equals(cls._id))).map(t => t._id);
		cls.teacherIds = ids;
		await cls.save();
	}
	for (const subj of allSubjects) {
		const ids = saved.filter(t => t.subjects.some(id => id.equals(subj._id))).map(t => t._id);
		subj.teacherIds = ids;
		await subj.save();
	}

	return saved;
}

async function seedStudents(userBundle, allClasses, { students }) {
	console.log('👨\u200d🎓 Creating students...');
	const docs = [];
	for (let i = 0; i < students; i += 1) {
		const user = userBundle.studentUsers[i];
		const cls = allClasses[i % allClasses.length];
		docs.push(new Student({
			userId: user._id,
			classId: cls._id,
			rollNumber: `${cls.name.replace(/\s+/g, '')}${String(i + 1).padStart(3, '0')}`,
			parentName: `Parent ${i + 1}`,
			parentContact: `+23481${String(10000000 + Math.floor(Math.random() * 89999999))}`,
		}));
	}
	const saved = await Student.insertMany(docs, { ordered: false });
	console.log(`   Students created: ${saved.length}`);

	// Backfill studentIds on classes
	for (const cls of allClasses) {
		const ids = saved.filter(s => s.classId.equals(cls._id)).map(s => s._id);
		cls.studentIds = ids;
		await cls.save();
	}

	return saved;
}

async function main() {
	try {
		console.log('🚀 Starting BULK seeding with config:', DEFAULTS);
		await connectDB();
		await clearCollections();

		const users = await seedUsers({ teachers: DEFAULTS.teachers, students: DEFAULTS.students });
		const classes = await seedClasses({ classes: DEFAULTS.classes });
		const subjects = await seedSubjects(classes, { subjects: DEFAULTS.subjects });
		const teacherDocs = await seedTeachers(users, classes, subjects, { teachers: DEFAULTS.teachers });
		const studentDocs = await seedStudents(users, classes, { students: DEFAULTS.students });

		console.log('\n✅ Bulk seed complete!');
		console.log('📊 Summary:');
		console.log(`   Users: ${1 + DEFAULTS.teachers + DEFAULTS.students}`);
		console.log(`   Classes: ${classes.length}`);
		console.log(`   Subjects: ${subjects.length}`);
		console.log(`   Teachers: ${teacherDocs.length}`);
		console.log(`   Students: ${studentDocs.length}`);
		process.exit(0);
	} catch (err) {
		console.error('❌ Bulk seed failed:', err);
		process.exit(1);
	}
}

main();




