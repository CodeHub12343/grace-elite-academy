/* eslint-disable no-console */
// Seed programmatic test data directly into MongoDB for all core models

const mongoose = require('mongoose');
// Note: Do not pre-hash; model pre-save will hash
require('dotenv').config();

// Import all models
const User = require('../models/user.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const Class = require('../models/class.model');
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

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearCollections() {
  console.log('🧹 Clearing existing collections...');
  const collections = [
    'users', 'teachers', 'students', 'classes', 'subjects', 'attendances',
    'grades', 'teacherreviews', 'exams', 'questions', 'submissions',
    'assignments', 'assignmentsubmissions', 'files', 'feecategories',
    'invoices', 'payments', 'fees', 'transactions', 'notifications'
  ];
  
  for (const collection of collections) {
    try {
      await mongoose.connection.db.collection(collection).deleteMany({});
      console.log(`   Cleared ${collection}`);
    } catch (error) {
      console.log(`   Collection ${collection} not found or already empty`);
    }
  }
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const users = [];
  
  // Admin user
  const adminPassword = 'admin123';
  const admin = new User({
    name: 'Admin User',
    email: 'admin@school.com',
    password: adminPassword,
    role: 'admin',
    isVerified: true
  });
  users.push(admin);
  
  // Teachers
  const teacherPasswords = ['teacher123','teacher123','teacher123'];
  
  const teachers = [
    new User({
      name: 'John Smith',
      email: 'john.smith@school.com',
      password: teacherPasswords[0],
      role: 'teacher',
      isVerified: true
    }),
    new User({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@school.com',
      password: teacherPasswords[1],
      role: 'teacher',
      isVerified: true
    }),
    new User({
      name: 'Michael Brown',
      email: 'michael.brown@school.com',
      password: teacherPasswords[2],
      role: 'teacher',
      isVerified: true
    })
  ];
  users.push(...teachers);
  
  // Students
  const studentPasswords = ['student123','student123','student123','student123','student123','student123'];
  
  const students = [
    new User({
      name: 'Alice Wilson',
      email: 'alice.wilson@school.com',
      password: studentPasswords[0],
      role: 'student',
      isVerified: true
    }),
    new User({
      name: 'Bob Davis',
      email: 'bob.davis@school.com',
      password: studentPasswords[1],
      role: 'student',
      isVerified: true
    }),
    new User({
      name: 'Carol Miller',
      email: 'carol.miller@school.com',
      password: studentPasswords[2],
      role: 'student',
      isVerified: true
    }),
    new User({
      name: 'David Garcia',
      email: 'david.garcia@school.com',
      password: studentPasswords[3],
      role: 'student',
      isVerified: true
    }),
    new User({
      name: 'Emma Taylor',
      email: 'emma.taylor@school.com',
      password: studentPasswords[4],
      role: 'student',
      isVerified: true
    }),
    new User({
      name: 'Frank Anderson',
      email: 'frank.anderson@school.com',
      password: studentPasswords[5],
      role: 'student',
      isVerified: true
    })
  ];
  users.push(...students);
  
  // Parents
  const parentPasswords = ['parent123','parent123','parent123'];
  
  const parents = [
    new User({
      name: 'Robert Wilson',
      email: 'robert.wilson@email.com',
      password: parentPasswords[0],
      role: 'parent',
      isVerified: true
    }),
    new User({
      name: 'Linda Davis',
      email: 'linda.davis@email.com',
      password: parentPasswords[1],
      role: 'parent',
      isVerified: true
    }),
    new User({
      name: 'James Miller',
      email: 'james.miller@email.com',
      password: parentPasswords[2],
      role: 'parent',
      isVerified: true
    })
  ];
  users.push(...parents);
  
  const savedUsers = await User.insertMany(users);
  console.log(`   Created ${savedUsers.length} users`);
  
  return {
    admin: savedUsers.find(u => u.role === 'admin'),
    teachers: savedUsers.filter(u => u.role === 'teacher'),
    students: savedUsers.filter(u => u.role === 'student'),
    parents: savedUsers.filter(u => u.role === 'parent')
  };
}

async function createClasses() {
  console.log('🏫 Creating classes...');
  
  const classes = [
    new Class({
      name: 'Grade 10A',
      section: 'A',
      teacherIds: [],
      subjectIds: [],
      studentIds: []
    }),
    new Class({
      name: 'Grade 10B',
      section: 'B',
      teacherIds: [],
      subjectIds: [],
      studentIds: []
    }),
    new Class({
      name: 'Grade 11A',
      section: 'A',
      teacherIds: [],
      subjectIds: [],
      studentIds: []
    })
  ];
  
  const savedClasses = await Class.insertMany(classes);
  console.log(`   Created ${savedClasses.length} classes`);
  return savedClasses;
}

async function createSubjects(classes) {
  console.log('📚 Creating subjects...');
  
  const subjects = [
    new Subject({
      name: 'Mathematics',
      code: 'MATH101',
      classId: classes[0]._id,
      teacherIds: []
    }),
    new Subject({
      name: 'English Literature',
      code: 'ENG101',
      classId: classes[0]._id,
      teacherIds: []
    }),
    new Subject({
      name: 'Physics',
      code: 'PHY101',
      classId: classes[0]._id,
      teacherIds: []
    }),
    new Subject({
      name: 'Chemistry',
      code: 'CHEM101',
      classId: classes[1]._id,
      teacherIds: []
    }),
    new Subject({
      name: 'Biology',
      code: 'BIO101',
      classId: classes[1]._id,
      teacherIds: []
    }),
    new Subject({
      name: 'History',
      code: 'HIST101',
      classId: classes[2]._id,
      teacherIds: []
    })
  ];
  
  const savedSubjects = await Subject.insertMany(subjects);
  console.log(`   Created ${savedSubjects.length} subjects`);
  return savedSubjects;
}

async function createTeachers(users, classes, subjects) {
  console.log('👨‍🏫 Creating teachers...');
  
  const teachers = [
    new Teacher({
      userId: users.teachers[0]._id,
      subjects: [subjects[0]._id, subjects[2]._id], // Math & Physics
      classes: [classes[0]._id, classes[1]._id],
      phone: '+2348012345678',
      qualification: 'M.Sc. Mathematics',
      experience: 8
    }),
    new Teacher({
      userId: users.teachers[1]._id,
      subjects: [subjects[1]._id, subjects[3]._id], // English & Chemistry
      classes: [classes[0]._id, classes[1]._id],
      phone: '+2348023456789',
      qualification: 'M.A. English Literature',
      experience: 5
    }),
    new Teacher({
      userId: users.teachers[2]._id,
      subjects: [subjects[4]._id, subjects[5]._id], // Biology & History
      classes: [classes[1]._id, classes[2]._id],
      phone: '+2348034567890',
      qualification: 'Ph.D. Biology',
      experience: 12
    })
  ];
  
  const savedTeachers = await Teacher.insertMany(teachers);
  console.log(`   Created ${savedTeachers.length} teachers`);
  
  // Update subjects with teacher IDs
  for (let i = 0; i < subjects.length; i++) {
    const teacher = teachers.find(t => 
      t.subjects.includes(subjects[i]._id)
    );
    if (teacher) {
      subjects[i].teacherIds.push(teacher._id);
      await subjects[i].save();
    }
  }
  
  // Update classes with teacher IDs
  for (let i = 0; i < classes.length; i++) {
    const classTeachers = teachers.filter(t => 
      t.classes.includes(classes[i]._id)
    );
    classes[i].teacherIds = classTeachers.map(t => t._id);
    await classes[i].save();
  }
  
  return savedTeachers;
}

async function createStudents(users, classes) {
  console.log('👨‍🎓 Creating students...');
  
  const students = [
    new Student({
      userId: users.students[0]._id,
      classId: classes[0]._id,
      rollNumber: '10A001',
      parentName: 'Robert Wilson',
      parentContact: '+2348045678901'
    }),
    new Student({
      userId: users.students[1]._id,
      classId: classes[0]._id,
      rollNumber: '10A002',
      parentName: 'Linda Davis',
      parentContact: '+2348056789012'
    }),
    new Student({
      userId: users.students[2]._id,
      classId: classes[1]._id,
      rollNumber: '10B001',
      parentName: 'James Miller',
      parentContact: '+2348067890123'
    }),
    new Student({
      userId: users.students[3]._id,
      classId: classes[1]._id,
      rollNumber: '10B002',
      parentName: 'Maria Garcia',
      parentContact: '+2348078901234'
    }),
    new Student({
      userId: users.students[4]._id,
      classId: classes[2]._id,
      rollNumber: '11A001',
      parentName: 'Thomas Taylor',
      parentContact: '+2348089012345'
    }),
    new Student({
      userId: users.students[5]._id,
      classId: classes[2]._id,
      rollNumber: '11A002',
      parentName: 'Jennifer Anderson',
      parentContact: '+2348090123456'
    })
  ];
  
  const savedStudents = await Student.insertMany(students);
  console.log(`   Created ${savedStudents.length} students`);
  
  // Update classes with student IDs
  for (let i = 0; i < classes.length; i++) {
    const classStudents = students.filter(s => 
      s.classId.equals(classes[i]._id)
    );
    classes[i].studentIds = classStudents.map(s => s._id);
    await classes[i].save();
  }
  
  return savedStudents;
}

async function createFeeCategories() {
  console.log('💰 Creating fee categories...');
  
  const feeCategories = [
    new FeeCategory({
      name: 'Tuition Fee',
      description: 'Monthly tuition fee for academic year',
      amount: 50000,
      classId: null
    }),
    new FeeCategory({
      name: 'Examination Fee',
      description: 'Term examination fee',
      amount: 15000,
      classId: null
    }),
    new FeeCategory({
      name: 'Library Fee',
      description: 'Annual library membership fee',
      amount: 5000,
      classId: null
    }),
    new FeeCategory({
      name: 'Laboratory Fee',
      description: 'Science laboratory usage fee',
      amount: 10000,
      classId: null
    })
  ];
  
  const savedFeeCategories = await FeeCategory.insertMany(feeCategories);
  console.log(`   Created ${savedFeeCategories.length} fee categories`);
  return savedFeeCategories;
}

async function createFees(students, feeCategories) {
  console.log('💳 Creating fees...');
  
  const fees = [];
  const currentDate = new Date();
  
  for (const student of students) {
    for (const category of feeCategories) {
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      
      fees.push(new Fee({
        studentId: student._id,
        amount: category.amount,
        dueDate: dueDate,
        status: Math.random() > 0.7 ? 'paid' : Math.random() > 0.5 ? 'partial' : 'unpaid',
        amountPaid: Math.random() > 0.7 ? category.amount : Math.random() > 0.5 ? category.amount * 0.6 : 0,
        balance: 0,
        lateFee: 0,
        description: `${category.name} - ${new Date().getFullYear()}`
      }));
    }
  }
  
  const savedFees = await Fee.insertMany(fees);
  console.log(`   Created ${savedFees.length} fees`);
  return savedFees;
}

async function createInvoices(students, feeCategories) {
  console.log('🧾 Creating invoices...');
  
  const invoices = [];
  const currentDate = new Date();
  
  for (const student of students) {
    for (const category of feeCategories) {
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      
      invoices.push(new Invoice({
        studentId: student._id,
        classId: student.classId,
        feeCategoryId: category._id,
        amount: category.amount,
        status: Math.random() > 0.7 ? 'paid' : 'pending',
        dueDate: dueDate,
        lateFee: 0,
        transactionReference: `INV${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        paymentDate: null
      }));
    }
  }
  
  const savedInvoices = await Invoice.insertMany(invoices);
  console.log(`   Created ${savedInvoices.length} invoices`);
  return savedInvoices;
}

async function createPayments(students, invoices) {
  console.log('💸 Creating payments...');
  
  const payments = [];
  
  for (const invoice of invoices) {
    if (invoice.status === 'paid') {
      payments.push(new Payment({
        studentId: invoice.studentId,
        invoiceId: invoice._id,
        amount: invoice.amount,
        status: 'success',
        transactionReference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        paymentMethod: 'Paystack',
        gatewayResponse: {
          status: 'success',
          message: 'Payment successful'
        }
      }));
    }
  }
  
  const savedPayments = await Payment.insertMany(payments);
  console.log(`   Created ${savedPayments.length} payments`);
  return savedPayments;
}

async function createTransactions(students, fees) {
  console.log('🔄 Creating transactions...');
  
  const transactions = [];
  
  for (const fee of fees) {
    if (fee.status === 'paid' || fee.status === 'partial') {
      // Only create transaction if amountPaid > 0
      if (fee.amountPaid > 0) {
        transactions.push(new Transaction({
          studentId: fee.studentId,
          feeId: fee._id,
          amount: fee.amountPaid,
          status: 'success',
          paystackReference: `PSK${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          paymentDate: new Date(),
          paymentMethod: 'Paystack'
        }));
      }
    }
  }
  
  const savedTransactions = await Transaction.insertMany(transactions);
  console.log(`   Created ${savedTransactions.length} transactions`);
  return savedTransactions;
}

async function createExams(classes, subjects, teachers) {
  console.log('📝 Creating exams...');
  
  const exams = [
    new Exam({
      title: 'Midterm Mathematics Test',
      description: 'First term mathematics examination covering algebra and geometry',
      classId: classes[0]._id,
      subjectId: subjects[0]._id,
      teacherId: teachers[0]._id,
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
      duration: 120,
      totalMarks: 100,
      status: 'draft'
    }),
    new Exam({
      title: 'English Literature Final',
      description: 'Final examination for English Literature course',
      classId: classes[0]._id,
      subjectId: subjects[1]._id,
      teacherId: teachers[1]._id,
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
      duration: 180,
      totalMarks: 150,
      status: 'published'
    }),
    new Exam({
      title: 'Physics Lab Test',
      description: 'Laboratory practical test for physics students',
      classId: classes[1]._id,
      subjectId: subjects[2]._id,
      teacherId: teachers[0]._id,
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hours later
      duration: 90,
      totalMarks: 50,
      status: 'draft'
    })
  ];
  
  const savedExams = await Exam.insertMany(exams);
  console.log(`   Created ${savedExams.length} exams`);
  return savedExams;
}

async function createQuestions(exams) {
  console.log('❓ Creating questions...');
  
  const questions = [];
  
  for (const exam of exams) {
    if (exam.title.includes('Mathematics')) {
      // Math questions
      const mathQuestions = [
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'What is the value of x in the equation 2x + 5 = 13?',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          marks: 5
        },
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'What is the area of a circle with radius 7 units?',
          options: ['49π', '14π', '7π', '21π'],
          correctAnswer: '49π',
          marks: 5
        },
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'Solve: 3x² - 12 = 0',
          options: ['x = ±2', 'x = ±4', 'x = ±6', 'x = ±8'],
          correctAnswer: 'x = ±2',
          marks: 10
        }
      ];
      questions.push(...mathQuestions);
    } else if (exam.title.includes('English')) {
      // English questions
      const englishQuestions = [
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'Who wrote "Romeo and Juliet"?',
          options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
          correctAnswer: 'William Shakespeare',
          marks: 10
        },
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'What is a metaphor?',
          options: ['A comparison using like or as', 'A direct comparison', 'A sound device', 'A type of poem'],
          correctAnswer: 'A direct comparison',
          marks: 10
        }
      ];
      questions.push(...englishQuestions);
    } else {
      // Physics questions
      const physicsQuestions = [
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'What is the SI unit of force?',
          options: ['Joule', 'Newton', 'Watt', 'Pascal'],
          correctAnswer: 'Newton',
          marks: 5
        },
        {
          examId: exam._id,
          type: 'mcq',
          questionText: 'What is the formula for kinetic energy?',
          options: ['KE = mgh', 'KE = ½mv²', 'KE = Fd', 'KE = Pt'],
          correctAnswer: 'KE = ½mv²',
          marks: 10
        }
      ];
      questions.push(...physicsQuestions);
    }
  }
  
  const savedQuestions = await Question.insertMany(questions);
  console.log(`   Created ${savedQuestions.length} questions`);
  return savedQuestions;
}

async function createSubmissions(exams, students, questions) {
  console.log('📄 Creating submissions...');
  
  const submissions = [];
  
  for (const exam of exams) {
    if (exam.status === 'published') {
      // Get questions for this exam
      const examQuestions = questions.filter(q => q.examId.equals(exam._id));
      
      for (const student of students) {
        if (Math.random() > 0.5 && examQuestions.length > 0) { // 50% chance of submission
          // Create answers using actual question IDs
          const answers = examQuestions.slice(0, 2).map(q => ({
            questionId: q._id,
            selectedOption: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
          }));
          
          submissions.push(new Submission({
            examId: exam._id,
            studentId: student._id,
            answers: answers,
            score: Math.floor(Math.random() * 100) + 50,
            status: 'submitted',
            submittedAt: new Date()
          }));
        }
      }
    }
  }
  
  const savedSubmissions = await Submission.insertMany(submissions);
  console.log(`   Created ${savedSubmissions.length} submissions`);
  return savedSubmissions;
}

async function createAssignments(classes, subjects, teachers) {
  console.log('📚 Creating assignments...');
  
  const assignments = [
    new Assignment({
      title: 'Algebra Problem Set',
      description: 'Complete problems 1-20 in Chapter 3 of your textbook',
      classId: classes[0]._id,
      subjectId: subjects[0]._id,
      teacherId: teachers[0]._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      maxMarks: 50
    }),
    new Assignment({
      title: 'Essay on Shakespeare',
      description: 'Write a 1000-word essay analyzing the themes in Romeo and Juliet',
      classId: classes[0]._id,
      subjectId: subjects[1]._id,
      teacherId: teachers[1]._id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      maxMarks: 100
    }),
    new Assignment({
      title: 'Physics Lab Report',
      description: 'Complete lab report for the pendulum experiment',
      classId: classes[1]._id,
      subjectId: subjects[2]._id,
      teacherId: teachers[0]._id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      maxMarks: 75
    })
  ];
  
  const savedAssignments = await Assignment.insertMany(assignments);
  console.log(`   Created ${savedAssignments.length} assignments`);
  return savedAssignments;
}

async function createAssignmentSubmissions(assignments, students) {
  console.log('📝 Creating assignment submissions...');
  
  const submissions = [];
  
  for (const assignment of assignments) {
    for (const student of students) {
      if (Math.random() > 0.6) { // 40% chance of submission
        submissions.push(new AssignmentSubmission({
          assignmentId: assignment._id,
          studentId: student._id,
          fileKey: `assignments/${student._id}/${assignment._id}/submission.pdf`,
          grade: Math.floor(Math.random() * assignment.maxMarks) + 10,
          submittedAt: new Date()
        }));
      }
    }
  }
  
  const savedSubmissions = await AssignmentSubmission.insertMany(submissions);
  console.log(`   Created ${savedSubmissions.length} assignment submissions`);
  return savedSubmissions;
}

async function createFiles(users, assignments) {
  console.log('📁 Creating files...');
  
  const files = [
    new File({
      fileName: 'profile-picture.jpg',
      key: 'profiles/user1.jpg',
      url: 'https://example-bucket.s3.amazonaws.com/profiles/user1.jpg',
      uploaderId: users.students[0]._id,
      role: 'student',
      category: 'profile',
      size: 1024000,
      mimeType: 'image/jpeg',
      relatedId: null,
      isPublic: true
    }),
    new File({
      fileName: 'assignment-solution.pdf',
      key: 'assignments/assignment1/solution.pdf',
      url: 'https://example-bucket.s3.amazonaws.com/assignments/assignment1/solution.pdf',
      uploaderId: users.teachers[0]._id,
      role: 'teacher',
      category: 'assignment',
      size: 2048000,
      mimeType: 'application/pdf',
      relatedId: assignments[0]._id,
      isPublic: false
    }),
    new File({
      fileName: 'course-material.docx',
      key: 'resources/mathematics/course-material.docx',
      url: 'https://example-bucket.s3.amazonaws.com/resources/mathematics/course-material.docx',
      uploaderId: users.teachers[0]._id,
      role: 'teacher',
      category: 'resource',
      size: 1536000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      relatedId: null,
      isPublic: true
    })
  ];
  
  const savedFiles = await File.insertMany(files);
  console.log(`   Created ${savedFiles.length} files`);
  return savedFiles;
}

async function createGrades(students, subjects, teachers, classes) {
  console.log('📊 Creating grades...');
  
  const grades = [];
  
  for (const student of students) {
    for (const subject of subjects) {
      if (subject.classId.equals(student.classId)) {
        const terms = ['term1', 'term2', 'final'];
        const examTypes = ['midterm', 'final', 'assignment'];
        
        for (const term of terms) {
          for (const examType of examTypes) {
            if (Math.random() > 0.3) { // 70% chance of grade
              const marks = Math.floor(Math.random() * 100) + 40;
              const maxMarks = 100;
              
              grades.push(new Grade({
                studentId: student._id,
                classId: student.classId,
                subjectId: subject._id,
                teacherId: teachers.find(t => t.subjects.includes(subject._id))?._id || teachers[0]._id,
                marks: marks,
                maxMarks: maxMarks,
                grade: marks >= 90 ? 'A' : marks >= 80 ? 'B' : marks >= 70 ? 'C' : marks >= 60 ? 'D' : 'F',
                percentage: (marks / maxMarks) * 100,
                term: term,
                examType: examType
              }));
            }
          }
        }
      }
    }
  }
  
  const savedGrades = await Grade.insertMany(grades);
  console.log(`   Created ${savedGrades.length} grades`);
  return savedGrades;
}

async function createTeacherReviews(students, teachers) {
  console.log('⭐ Creating teacher reviews...');
  
  const reviews = [];
  
  for (const student of students) {
    for (const teacher of teachers) {
      if (Math.random() > 0.7) { // 30% chance of review
        reviews.push(new TeacherReview({
          teacherId: teacher._id,
          reviewedBy: student._id,
          rating: Math.floor(Math.random() * 5) + 1,
          comment: 'Great teacher, very helpful and knowledgeable.',
          date: new Date()
        }));
      }
    }
  }
  
  const savedReviews = await TeacherReview.insertMany(reviews);
  console.log(`   Created ${savedReviews.length} teacher reviews`);
  return savedReviews;
}

async function createAttendance(students, classes, subjects, teachers) {
  console.log('📅 Creating attendance records...');
  
  const attendance = [];
  const currentDate = new Date();
  
  // Create attendance for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i);
    
    for (const student of students) {
      for (const subject of subjects) {
        if (subject.classId.equals(student.classId)) {
          const statuses = ['present', 'absent', 'late', 'excused'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          attendance.push(new Attendance({
            studentId: student._id,
            classId: student.classId,
            subjectId: subject._id,
            teacherId: teachers.find(t => t.subjects.includes(subject._id))?._id || teachers[0]._id,
            date: date,
            status: status,
            remarks: status === 'absent' ? 'No reason provided' : ''
          }));
        }
      }
    }
  }
  
  const savedAttendance = await Attendance.insertMany(attendance);
  console.log(`   Created ${savedAttendance.length} attendance records`);
  return savedAttendance;
}

async function createNotifications(users, students, teachers) {
  console.log('🔔 Creating notifications...');
  
  const notifications = [];
  
  // System notifications
  notifications.push(new Notification({
    userId: users.admin._id,
    title: 'System Update',
    message: 'School management system has been updated to version 2.0',
    type: 'in-app',
    status: 'sent',
    metadata: { category: 'system' }
  }));
  
  // Student notifications
  for (const student of students) {
    if (Math.random() > 0.5) {
      notifications.push(new Notification({
        userId: student.userId,
        title: 'New Assignment Posted',
        message: 'A new assignment has been posted for Mathematics',
        type: 'in-app',
        status: 'sent',
        metadata: { category: 'academic' }
      }));
    }
  }
  
  // Teacher notifications
  for (const teacher of teachers) {
    if (Math.random() > 0.5) {
      notifications.push(new Notification({
        userId: teacher.userId,
        title: 'Grade Submission Reminder',
        message: 'Please submit grades for Term 1 examinations',
        type: 'email',
        status: 'pending',
        metadata: { category: 'academic' }
      }));
    }
  }
  
  const savedNotifications = await Notification.insertMany(notifications);
  console.log(`   Created ${savedNotifications.length} notifications`);
  return savedNotifications;
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive data seeding...\n');
    
    await connectDB();
    await clearCollections();
    
    // Create entities in order of dependencies
    const users = await createUsers();
    const classes = await createClasses();
    const subjects = await createSubjects(classes);
    const teachers = await createTeachers(users, classes, subjects);
    const students = await createStudents(users, classes);
    
    // Create financial entities
    const feeCategories = await createFeeCategories();
    const fees = await createFees(students, feeCategories);
    const invoices = await createInvoices(students, feeCategories);
    const payments = await createPayments(students, invoices);
    const transactions = await createTransactions(students, fees);
    
    // Create academic entities
    const exams = await createExams(classes, subjects, teachers);
    const questions = await createQuestions(exams);
    const submissions = await createSubmissions(exams, students, questions);
    const assignments = await createAssignments(classes, subjects, teachers);
    const assignmentSubmissions = await createAssignmentSubmissions(assignments, students);
    
    // Create other entities
    const files = await createFiles(users, assignments);
    const grades = await createGrades(students, subjects, teachers, classes);
    const teacherReviews = await createTeacherReviews(students, teachers);
    const attendance = await createAttendance(students, classes, subjects, teachers);
    const notifications = await createNotifications(users, students, teachers);
    
    console.log('\n✅ All data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${Object.values(users).flat().length}`);
    console.log(`   Classes: ${classes.length}`);
    console.log(`   Subjects: ${subjects.length}`);
    console.log(`   Teachers: ${teachers.length}`);
    console.log(`   Students: ${students.length}`);
    console.log(`   Exams: ${exams.length}`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Assignments: ${assignments.length}`);
    console.log(`   Grades: ${grades.length}`);
    console.log(`   Attendance Records: ${attendance.length}`);
    console.log(`   Fees: ${fees.length}`);
    console.log(`   Notifications: ${notifications.length}`);
    
    console.log('\n🎯 Test accounts:');
    console.log('   Admin: admin@school.com / admin123');
    console.log('   Teacher: john.smith@school.com / teacher123');
    console.log('   Student: alice.wilson@school.com / student123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

main();


