/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const models = {
	User: require('../models/user.model'),
	Teacher: require('../models/teacher.model'),
	Student: require('../models/student.model'),
	Class: require('../models/class.model'),
	Subject: require('../models/subject.model'),
	Attendance: require('../models/attendance.model'),
	Grade: require('../models/grade.model'),
	TeacherReview: require('../models/teacherReview.model'),
	Exam: require('../models/exam.model'),
	Question: require('../models/question.model'),
	Submission: require('../models/submission.model'),
	Assignment: require('../models/assignment.model'),
	AssignmentSubmission: require('../models/assignmentSubmission.model'),
	File: require('../models/file.model'),
	FeeCategory: require('../models/feeCategory.model'),
	Invoice: require('../models/invoice.model'),
	Payment: require('../models/payment.model'),
	Fee: require('../models/fee.model'),
	Transaction: require('../models/transaction.model'),
	Notification: require('../models/notification.model'),
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

async function main() {
	await mongoose.connect(MONGO_URI);
	console.log('✅ Connected to MongoDB');
	const entries = Object.entries(models);
	for (const [name, Model] of entries) {
		const count = await Model.countDocuments();
		console.log(`${name}: ${count}`);
	}
	await mongoose.disconnect();
	process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });








































