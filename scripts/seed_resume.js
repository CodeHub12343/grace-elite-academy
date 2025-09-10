/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

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

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function parseArgs() {
  const a = process.argv.slice(2);
  const cfg = { assignments: 800, assignmentSubmissionsPerAssignment: 80, attendanceDays: 60, attendanceDailySample: 0.3, feeCategories: 8, feesPerStudent: 4, invoicesPerStudent: 3 };
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i];
    const v = a[i + 1];
    if (!k || !k.startsWith('--')) continue;
    const key = k.replace(/^--/, '');
    if (['assignments','assignmentSubmissionsPerAssignment','attendanceDays','feeCategories','feesPerStudent','invoicesPerStudent'].includes(key)) {
      cfg[key] = Number(v);
    } else if (key === 'attendanceDailySample') {
      cfg[key] = Number(v);
    }
  }
  return cfg;
}

async function main() {
  const CFG = parseArgs();
  console.log('▶ Resume seeding with config:', CFG);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const [usersAdmin, teacherUsers, studentUsers, classes, subjects, teachers, students] = await Promise.all([
    User.findOne({ role: 'admin' }),
    User.find({ role: 'teacher' }),
    User.find({ role: 'student' }),
    ClassModel.find({}),
    Subject.find({}),
    Teacher.find({}),
    Student.find({}),
  ]);
  const usersBundle = { admin: usersAdmin, teacherUsers, studentUsers };

  // Assignments
  const existingAssignments = await Assignment.countDocuments();
  let assignments = [];
  if (existingAssignments < CFG.assignments) {
    console.log('📚 Creating assignments...');
    const target = CFG.assignments - existingAssignments;
    const docs = [];
    for (let i = 1; i <= target; i += 1) {
      const cls = choice(classes);
      if (!cls) break;
      const subsInClass = subjects.filter(s => String(s.classId) === String(cls._id));
      const sub = subsInClass.length ? choice(subsInClass) : choice(subjects);
      if (!sub) break;
      const tchs = teachers.filter(t => t.subjects.some(id => String(id) === String(sub._id)));
      const tch = tchs.length ? choice(tchs) : choice(teachers);
      if (!tch) break;
      docs.push(new Assignment({
        title: `Assignment R-${existingAssignments + i} - ${sub.name}`,
        description: `Auto-generated assignment ${existingAssignments + i}`,
        classId: cls._id,
        subjectId: sub._id,
        teacherId: tch._id,
        dueDate: new Date(Date.now() + Math.floor(Math.random()*21)*86400000),
        maxMarks: 50 + Math.floor(Math.random()*50),
      }));
    }
    assignments = await Assignment.insertMany(docs, { ordered: false });
  } else {
    assignments = await Assignment.find({});
  }

  // Assignment submissions
  const existingASubs = await AssignmentSubmission.countDocuments();
  if (assignments.length && existingASubs === 0 && CFG.assignmentSubmissionsPerAssignment > 0) {
    console.log('📝 Creating assignment submissions...');
    const docs = [];
    for (const assignment of assignments) {
      for (let i = 0; i < CFG.assignmentSubmissionsPerAssignment; i += 1) {
        const student = choice(students);
        if (!student) break;
        docs.push(new AssignmentSubmission({ assignmentId: assignment._id, studentId: student._id, fileKey: `assignments/${student._id}/${assignment._id}/submission.pdf`, grade: Math.floor(Math.random()*assignment.maxMarks), submittedAt: new Date() }));
      }
    }
    if (docs.length) await AssignmentSubmission.insertMany(docs, { ordered: false });
  }

  // Attendance
  const existingAttendance = await Attendance.countDocuments();
  if (existingAttendance === 0) {
    console.log('📅 Creating attendance records...');
    const docs = [];
    const today = new Date();
    for (let d = 0; d < CFG.attendanceDays; d += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const sampleSize = Math.max(1, Math.floor(students.length * CFG.attendanceDailySample));
      for (let i = 0; i < sampleSize; i += 1) {
        const student = students[Math.floor(Math.random() * students.length)];
        const subsInClass = subjects.filter(s => String(s.classId) === String(student.classId));
        if (!subsInClass.length) continue;
        const sub = choice(subsInClass);
        const tchs = teachers.filter(t => t.subjects.some(id => String(id) === String(sub._id)));
        const tch = tchs.length ? choice(tchs) : choice(teachers);
        docs.push(new Attendance({ studentId: student._id, classId: student.classId, subjectId: sub._id, teacherId: tch._id, date, status: choice(['present','absent','late','excused']), remarks: '' }));
      }
    }
    if (docs.length) await Attendance.insertMany(docs, { ordered: false });
  }

  // Grades
  const existingGrades = await Grade.countDocuments();
  if (existingGrades === 0) {
    console.log('📊 Creating grades...');
    const docs = [];
    const terms = ['term1','term2','final'];
    const examTypes = ['midterm','final','assignment'];
    for (const student of students) {
      const subs = subjects.filter(s => String(s.classId) === String(student.classId));
      for (const sub of subs) {
        for (const term of terms) {
          const marks = 40 + Math.floor(Math.random()*61);
          const tch = teachers.find(t => t.subjects.some(id => String(id) === String(sub._id))) || choice(teachers);
          docs.push(new Grade({ studentId: student._id, classId: student.classId, subjectId: sub._id, teacherId: tch._id, marks, maxMarks: 100, grade: marks >= 90 ? 'A' : marks >= 80 ? 'B' : marks >= 70 ? 'C' : marks >= 60 ? 'D' : 'F', percentage: (marks/100)*100, term, examType: choice(examTypes) }));
        }
      }
    }
    if (docs.length) await Grade.insertMany(docs, { ordered: false });
  }

  // Teacher reviews
  const reviewCount = await TeacherReview.countDocuments();
  if (reviewCount === 0) {
    console.log('⭐ Creating teacher reviews...');
    const docs = [];
    for (const teacher of teachers) {
      for (let i = 0; i < 20; i += 1) {
        const student = choice(students);
        docs.push(new TeacherReview({ teacherId: teacher._id, reviewedBy: student._id, rating: 1 + Math.floor(Math.random()*5), comment: 'Auto-generated review', date: new Date() }));
      }
    }
    if (docs.length) await TeacherReview.insertMany(docs, { ordered: false });
  }

  // Fee categories
  const feeCatCount = await FeeCategory.countDocuments();
  let feeCategories = [];
  if (feeCatCount < CFG.feeCategories) {
    console.log('💰 Creating fee categories...');
    const docs = [];
    for (let i = feeCatCount + 1; i <= CFG.feeCategories; i += 1) {
      docs.push(new FeeCategory({ name: `Fee Category ${i}`, description: `Auto fee cat ${i}`, amount: 5000 + Math.floor(Math.random()*50000), classId: null }));
    }
    feeCategories = feeCatCount ? await FeeCategory.find({}) : await FeeCategory.insertMany(docs);
  } else {
    feeCategories = await FeeCategory.find({});
  }

  // Fees
  const feesCount = await Fee.countDocuments();
  if (feesCount === 0 && feeCategories.length) {
    console.log('💳 Creating fees...');
    const docs = [];
    for (const student of students) {
      for (let i = 0; i < CFG.feesPerStudent; i += 1) {
        const cat = choice(feeCategories);
        const amount = cat.amount;
        const amountPaid = Math.random() > 0.6 ? amount : Math.random() > 0.5 ? Math.floor(amount * 0.5) : 0;
        docs.push(new Fee({ studentId: student._id, amount, dueDate: new Date(Date.now() + (i+1)*86400000), status: amountPaid >= amount ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid', amountPaid, balance: Math.max(0, amount - amountPaid), lateFee: 0, description: `${cat.name} - ${new Date().getFullYear()}` }));
      }
    }
    if (docs.length) await Fee.insertMany(docs, { ordered: false });
  }

  // Invoices
  const invCount = await Invoice.countDocuments();
  if (invCount === 0 && feeCategories.length) {
    console.log('🧾 Creating invoices...');
    const docs = [];
    for (const student of students) {
      for (let i = 0; i < CFG.invoicesPerStudent; i += 1) {
        const cat = choice(feeCategories);
        docs.push(new Invoice({ studentId: student._id, classId: student.classId, feeCategoryId: cat._id, amount: cat.amount, status: Math.random() > 0.7 ? 'paid' : 'pending', dueDate: new Date(Date.now() + (i+1)*604800000), lateFee: 0, transactionReference: `INV${Date.now()}${Math.random().toString(36).slice(2,10)}${i}`, paymentDate: null }));
      }
    }
    if (docs.length) await Invoice.insertMany(docs, { ordered: false });
  }

  // Payments
  const payCount = await Payment.countDocuments();
  if (payCount === 0) {
    console.log('💸 Creating payments...');
    const invoices = await Invoice.find({ status: 'paid' });
    const docs = invoices.map(inv => new Payment({ studentId: inv.studentId, invoiceId: inv._id, amount: inv.amount, status: 'success', transactionReference: `TXN${Date.now()}${Math.random().toString(36).slice(2,10)}`, paymentMethod: 'Paystack', gatewayResponse: { status: 'success', message: 'OK' } }));
    if (docs.length) await Payment.insertMany(docs, { ordered: false });
  }

  // Transactions
  const txnCount = await Transaction.countDocuments();
  if (txnCount === 0) {
    console.log('🔄 Creating transactions...');
    const fees = await Fee.find({ amountPaid: { $gt: 0 } });
    const docs = fees.map(f => new Transaction({ studentId: f.studentId, feeId: f._id, amount: f.amountPaid, status: 'success', paystackReference: `PSK${Date.now()}${Math.random().toString(36).slice(2,10)}`, paymentDate: new Date(), paymentMethod: 'Paystack' }));
    if (docs.length) await Transaction.insertMany(docs, { ordered: false });
  }

  // Files (optional light)
  const fileCount = await File.countDocuments();
  if (fileCount === 0) {
    console.log('📁 Creating files...');
    const docs = [];
    for (const tUser of usersBundle.teacherUsers) {
      for (let i = 0; i < 1; i += 1) {
        docs.push(new File({ fileName: `resource-${i}.pdf`, key: `resources/${tUser._id}/${i}.pdf`, url: 'https://example.com/file.pdf', uploaderId: tUser._id, role: 'teacher', category: 'resource', size: 123456, mimeType: 'application/pdf', relatedId: null, isPublic: true }));
      }
    }
    if (docs.length) await File.insertMany(docs, { ordered: false });
  }

  // Notifications
  const notifCount = await Notification.countDocuments();
  if (notifCount === 0) {
    console.log('🔔 Creating notifications...');
    const docs = [];
    const allUsers = [usersBundle.admin, ...usersBundle.teacherUsers, ...usersBundle.studentUsers].filter(Boolean);
    for (const u of allUsers) {
      if (Math.random() > 0.6) {
        docs.push(new Notification({ userId: u._id, title: 'System Notice', message: 'Auto notification', type: choice(['in-app','email']), status: choice(['sent','pending']), metadata: { category: 'system' } }));
      }
    }
    if (docs.length) await Notification.insertMany(docs, { ordered: false });
  }

  console.log('✅ Resume seeding completed.');
  await mongoose.connection.close();
}

main().catch(err => { console.error('❌ Resume seeding failed:', err); process.exit(1); });


