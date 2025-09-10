const Grade = require('../models/grade.model');
const Attendance = require('../models/attendance.model');
const Exam = require('../models/exam.model');
const Submission = require('../models/submission.model');
const Fee = require('../models/fee.model');
const Transaction = require('../models/transaction.model');
const ClassModel = require('../models/class.model');
const Subject = require('../models/subject.model');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const TeacherReview = require('../models/teacherReview.model');

exports.studentReport = async (req, res) => {
  try {
    const studentId = req.params.id;
    const grades = await Grade.find({ studentId }).populate('subjectId');
    const attendanceAgg = await Attendance.aggregate([
      { $match: { studentId: require('mongoose').Types.ObjectId.createFromHexString(studentId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const submissions = await Submission.find({ studentId });
    return res.status(200).json({ success: true, data: { grades, attendance: attendanceAgg, cbt: submissions } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.classReport = async (req, res) => {
  try {
    const classId = req.params.id;
    const subjectAvgs = await Grade.aggregate([
      { $match: { classId: require('mongoose').Types.ObjectId.createFromHexString(classId) } },
      { $group: { _id: '$subjectId', avgPercentage: { $avg: '$percentage' } } },
      { $sort: { avgPercentage: -1 } },
    ]);
    const topPerformers = await Grade.aggregate([
      { $match: { classId: require('mongoose').Types.ObjectId.createFromHexString(classId) } },
      { $group: { _id: '$studentId', avgPercentage: { $avg: '$percentage' } } },
      { $sort: { avgPercentage: -1 } },
      { $limit: 10 },
    ]);
    const attendanceAgg = await Attendance.aggregate([
      { $match: { classId: require('mongoose').Types.ObjectId.createFromHexString(classId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return res.status(200).json({ success: true, data: { subjectAvgs, topPerformers, attendance: attendanceAgg } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.financeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const collectedAgg = await Transaction.aggregate([
      { $match: { ...match, status: 'success' } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } },
    ]);
    const outstandingAgg = await Fee.aggregate([
      { $match: { status: { $in: ['unpaid', 'partial'] } } },
      { $group: { _id: null, outstanding: { $sum: '$balance' } } },
    ]);
    return res.status(200).json({ success: true, data: { totalCollected: collectedAgg[0]?.totalCollected || 0, outstanding: outstandingAgg[0]?.outstanding || 0 } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.examAnalytics = async (req, res) => {
  try {
    const examId = req.params.examId;
    const submissions = await Submission.find({ examId });
    const exam = await Exam.findById(examId);
    const total = exam?.totalMarks || 0;
    const scores = submissions.map((s) => s.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const pass = submissions.filter((s) => total && (s.score / total) * 100 >= 50).length;
    const fail = submissions.length - pass;
    return res.status(200).json({ success: true, data: { attempts: submissions.length, average: avg, pass, fail } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.attendanceSummary = async (req, res) => {
  try {
    const classId = req.params.id;
    const { startDate, endDate } = req.query;
    const match = { classId: require('mongoose').Types.ObjectId.createFromHexString(classId) };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    const agg = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return res.status(200).json({ success: true, data: agg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


function dayRange(dateLike) {
  const base = dateLike ? new Date(dateLike) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /reports/teacher-overview (teacher)
exports.teacherOverview = async (req, res) => {
  try {
    if (req.user?.role !== 'teacher') return res.status(403).json({ success: false, message: 'Forbidden' });
    const teacher = await Teacher.findOne({ userId: req.user.sub }).populate(['subjects', 'classes']);
    if (!teacher) return res.status(400).json({ success: false, message: 'Teacher profile not found' });

    const classIds = (teacher.classes || []).map((c) => c._id || c);
    const subjectIds = (teacher.subjects || []).map((s) => s._id || s);
    const { start, end } = dayRange();

    const [studentsCount, upcomingExamsCount, recentGrades, gradeAgg, attendanceToday, reviewsAgg] = await Promise.all([
      classIds.length ? Student.countDocuments({ classId: { $in: classIds } }) : Promise.resolve(0),
      Exam.countDocuments({ teacherId: teacher._id, startTime: { $gte: new Date() } }),
      Grade.find({ teacherId: teacher._id }).sort('-createdAt').limit(5).populate(['studentId', 'subjectId', 'classId']),
      Grade.aggregate([
        { $match: { teacherId: teacher._id } },
        { $group: { _id: null, avgPercentage: { $avg: '$percentage' }, count: { $sum: 1 } } },
      ]),
      classIds.length
        ? Attendance.aggregate([
            { $match: { classId: { $in: classIds }, date: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      TeacherReview.aggregate([
        { $match: { teacherId: teacher._id } },
        { $group: { _id: '$teacherId', avgRating: { $avg: '$rating' }, count: { $sum: 1 }, unresolved: { $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] } } } },
      ]),
    ]);

    const avgPercentage = gradeAgg[0]?.avgPercentage || 0;
    const reviews = {
      avgRating: reviewsAgg[0]?.avgRating || 0,
      count: reviewsAgg[0]?.count || 0,
      unresolved: reviewsAgg[0]?.unresolved || 0,
    };

    const cards = {
      classes: classIds.length,
      subjects: subjectIds.length,
      students: studentsCount,
      upcomingExams: upcomingExamsCount,
      averageGradePercentage: Math.round((avgPercentage || 0) * 100) / 100,
      reviews,
    };

    const charts = {
      attendanceToday,
      recentGrades,
    };

    return res.status(200).json({ success: true, data: { cards, charts } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /reports (teacher scope or admin general)
exports.generalReports = async (req, res) => {
  try {
    const { scope } = req.query;
    if (scope === 'teacher') {
      if (req.user?.role !== 'teacher') return res.status(403).json({ success: false, message: 'Forbidden' });
      return exports.teacherOverview(req, res);
    }

    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0,0,0,0);
    const endToday = new Date(now); endToday.setHours(23,59,59,999);
    const last30d = new Date(now); last30d.setDate(last30d.getDate() - 30);
    const last7d = new Date(now); last7d.setDate(last7d.getDate() - 7);

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendanceAgg,
      revenueAgg,
      pendingInvoicesCount,
      successfulPaymentsCount,
      recentPayments,
      topClassesAttendance,
      upcomingExamsCount,
      recentExamsCount,
      recentNotifications,
    ] = await Promise.all([
      Student.countDocuments({}),
      Teacher.countDocuments({}),
      ClassModel.countDocuments({}),
      Subject.countDocuments({}),
      Attendance.aggregate([
        { $match: { date: { $gte: startToday, $lte: endToday } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: last30d } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'success', createdAt: { $gte: last30d } }),
      Payment.find({}).sort('-createdAt').limit(5).populate({ path: 'studentId', populate: { path: 'userId' } }),
      Attendance.aggregate([
        { $match: { date: { $gte: last30d } } },
        { $group: { _id: { classId: '$classId' }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
        { $project: { classId: '$_id.classId', attendanceRate: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }] } } },
        { $sort: { attendanceRate: -1 } },
        { $limit: 5 },
      ]),
      Exam.countDocuments({ startTime: { $gte: now } }),
      Exam.countDocuments({ createdAt: { $gte: last7d } }),
      require('../models/notification.model').find({}).sort('-createdAt').limit(5),
    ]);

    const attendanceToday = attendanceAgg.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {});
    const finance = {
      totalRevenue: revenueAgg[0]?.total || 0,
      pendingInvoicesCount,
      successfulPaymentsCount,
    };
    const recentPaymentsDto = recentPayments.map(p => ({
      amount: p.amount,
      studentName: p.studentId?.userId?.name,
      status: p.status,
      date: p.createdAt,
    }));

    const data = {
      counts: { totalStudents, totalTeachers, totalClasses, totalSubjects },
      attendanceToday,
      finance,
      recentPayments: recentPaymentsDto,
      topClassesByAttendance: topClassesAttendance,
      examsSummary: { upcomingExamsCount, recentExamsCount },
      notificationsSummary: recentNotifications,
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/student/:studentId/academic-result (admin only)
exports.studentAcademicResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, examType, includeHistory = false } = req.query;
    
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden - Admin access required' });
    }

    const startTime = Date.now();

    // Validate student exists and get student details
    const student = await Student.findById(studentId).populate('userId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get class details
    const classDetails = await ClassModel.findById(student.classId);
    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Build match criteria
    const matchCriteria = { studentId: require('mongoose').Types.ObjectId.createFromHexString(studentId) };
    if (term) matchCriteria.term = term;
    if (examType) matchCriteria.examType = examType;

    // Complex aggregation pipeline for comprehensive academic result
    const [
      // Get all grades with subject details
      gradesWithSubjects,
      // Subject-wise performance summary
      subjectPerformance,
      // Individual grades per subject
      individualGradesPerSubject,
      // Term-wise performance
      termPerformance,
      // Overall academic summary
      overallSummary,
      // Grade distribution
      gradeDistribution,
      // Performance trends
      performanceTrends,
      // Class ranking
      classRanking,
      // Subject ranking within class
      subjectRanking
    ] = await Promise.all([
      // Get all grades with populated subject details
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'subjects',
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject'
          }
        },
        { $unwind: '$subject' },
        {
          $lookup: {
            from: 'exams',
            localField: 'examId',
            foreignField: '_id',
            as: 'exam'
          }
        },
        { $unwind: { path: '$exam', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            subjectName: '$subject.name',
            subjectCode: '$subject.code',
            examName: '$exam.title',
            examDate: '$exam.startTime'
          }
        },
        {
          $project: {
            _id: 1,
            subjectId: 1,
            subjectName: 1,
            subjectCode: 1,
            examId: 1,
            examName: 1,
            examDate: 1,
            marks: 1,
            maxMarks: 1,
            percentage: 1,
            grade: 1,
            term: 1,
            examType: 1,
            createdAt: 1
          }
        },
        { $sort: { subjectName: 1, createdAt: -1 } }
      ]),

      // Subject-wise performance summary
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'subjects',
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject'
          }
        },
        { $unwind: '$subject' },
        {
          $group: {
            _id: '$subjectId',
            subjectName: { $first: '$subject.name' },
            subjectCode: { $first: '$subject.code' },
            totalExams: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            highestPercentage: { $max: '$percentage' },
            lowestPercentage: { $min: '$percentage' },
            totalMarks: { $sum: '$marks' },
            totalMaxMarks: { $sum: '$maxMarks' },
            grades: { $push: '$grade' },
            recentGrades: { $push: { $cond: [{ $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }, '$grade', null] } }
          }
        },
        {
          $addFields: {
            overallPercentage: {
              $multiply: [
                { $divide: ['$totalMarks', '$totalMaxMarks'] },
                100
              ]
            },
            gradeCounts: {
              A: { $size: { $filter: { input: '$grades', cond: { $eq: ['$$this', 'A'] } } } },
              B: { $size: { $filter: { input: '$grades', cond: { $eq: ['$$this', 'B'] } } } },
              C: { $size: { $filter: { input: '$grades', cond: { $eq: ['$$this', 'C'] } } } },
              D: { $size: { $filter: { input: '$grades', cond: { $eq: ['$$this', 'D'] } } } },
              F: { $size: { $filter: { input: '$grades', cond: { $eq: ['$$this', 'F'] } } } }
            },
            recentGradeCounts: {
              A: { $size: { $filter: { input: '$recentGrades', cond: { $eq: ['$$this', 'A'] } } } },
              B: { $size: { $filter: { input: '$recentGrades', cond: { $eq: ['$$this', 'B'] } } } },
              C: { $size: { $filter: { input: '$recentGrades', cond: { $eq: ['$$this', 'C'] } } } },
              D: { $size: { $filter: { input: '$recentGrades', cond: { $eq: ['$$this', 'D'] } } } },
              F: { $size: { $filter: { input: '$recentGrades', cond: { $eq: ['$$this', 'F'] } } } }
            }
          }
        },
        {
          $addFields: {
            performanceCategory: {
              $switch: {
                branches: [
                  { case: { $gte: ['$averagePercentage', 85] }, then: 'Excellent' },
                  { case: { $gte: ['$averagePercentage', 70] }, then: 'Good' },
                  { case: { $gte: ['$averagePercentage', 55] }, then: 'Average' },
                  { case: { $gte: ['$averagePercentage', 40] }, then: 'Below Average' }
                ],
                default: 'Needs Improvement'
              }
            }
          }
        },
        { $sort: { averagePercentage: -1 } }
      ]),

      // Individual grades per subject
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'subjects',
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject'
          }
        },
        { $unwind: '$subject' },
        {
          $lookup: {
            from: 'exams',
            localField: 'examId',
            foreignField: '_id',
            as: 'exam'
          }
        },
        { $unwind: { path: '$exam', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$subjectId',
            subjectName: { $first: '$subject.name' },
            subjectCode: { $first: '$subject.code' },
            grades: {
              $push: {
                id: '$_id',
                examName: '$exam.title',
                examDate: '$exam.startTime',
                marks: '$marks',
                maxMarks: '$maxMarks',
                percentage: '$percentage',
                grade: '$grade',
                term: '$term',
                examType: '$examType',
                date: '$createdAt'
              }
            }
          }
        },
        { $sort: { subjectName: 1 } }
      ]),

      // Term-wise performance
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: '$term',
            totalExams: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            totalMarks: { $sum: '$marks' },
            totalMaxMarks: { $sum: '$maxMarks' },
            subjects: { $addToSet: '$subjectId' }
          }
        },
        {
          $addFields: {
            overallPercentage: {
              $multiply: [
                { $divide: ['$totalMarks', '$totalMaxMarks'] },
                100
              ]
            },
            subjectCount: { $size: '$subjects' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Overall academic summary
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: null,
            totalExams: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            highestPercentage: { $max: '$percentage' },
            lowestPercentage: { $min: '$percentage' },
            totalMarks: { $sum: '$marks' },
            totalMaxMarks: { $sum: '$maxMarks' },
            subjects: { $addToSet: '$subjectId' },
            terms: { $addToSet: '$term' },
            examTypes: { $addToSet: '$examType' }
          }
        },
        {
          $addFields: {
            overallPercentage: {
              $multiply: [
                { $divide: ['$totalMarks', '$totalMaxMarks'] },
                100
              ]
            },
            subjectCount: { $size: '$subjects' },
            termCount: { $size: '$terms' },
            examTypeCount: { $size: '$examTypes' }
          }
        }
      ]),

      // Grade distribution
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: '$grade',
            count: { $sum: 1 },
            percentages: { $push: '$percentage' }
          }
        },
        {
          $addFields: {
            averagePercentage: { $avg: '$percentages' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Performance trends over time
      Grade.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            averagePercentage: { $avg: '$percentage' },
            examCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Class ranking (student's position in class)
      Grade.aggregate([
        { $match: { classId: student.classId } },
        {
          $group: {
            _id: '$studentId',
            averagePercentage: { $avg: '$percentage' },
            totalExams: { $sum: 1 }
          }
        },
        { $sort: { averagePercentage: -1 } },
        {
          $group: {
            _id: null,
            rankings: {
              $push: {
                studentId: '$_id',
                averagePercentage: '$averagePercentage',
                totalExams: '$totalExams'
              }
            }
          }
        },
        {
          $addFields: {
            studentRank: {
              $add: [
                {
                  $indexOfArray: [
                    '$rankings.studentId',
                    studentId
                  ]
                },
                1
              ]
            },
            totalStudents: { $size: '$rankings' }
          }
        }
      ]),

      // Subject ranking within class
      Grade.aggregate([
        { $match: { classId: student.classId } },
        {
          $group: {
            _id: {
              studentId: '$studentId',
              subjectId: '$subjectId'
            },
            averagePercentage: { $avg: '$percentage' }
          }
        },
        {
          $group: {
            _id: '$_id.subjectId',
            studentRankings: {
              $push: {
                studentId: '$_id.studentId',
                averagePercentage: '$averagePercentage'
              }
            }
          }
        },
        {
          $addFields: {
            sortedRankings: {
              $sortArray: {
                input: '$studentRankings',
                sortBy: { averagePercentage: -1 }
              }
            }
          }
        },
        {
          $addFields: {
            subjectRankings: {
              $map: {
                input: '$sortedRankings',
                as: 'ranking',
                in: {
                  studentId: '$$ranking.studentId',
                  averagePercentage: '$$ranking.averagePercentage',
                  rank: {
                    $add: [
                      {
                        $indexOfArray: ['$sortedRankings.studentId', '$$ranking.studentId']
                      },
                      1
                    ]
                  }
                }
              }
            }
          }
        }
      ])
    ]);

    // Process and format the academic result
    const academicResult = {
      // Student Information
      student: {
        id: student._id,
        name: student.userId?.name || 'N/A',
        rollNumber: student.rollNumber || 'N/A',
        class: classDetails.name,
        section: classDetails.section,
        parentName: student.parentName,
        parentContact: student.parentContact
      },

      // Academic Summary
      summary: {
        totalExams: overallSummary[0]?.totalExams || 0,
        overallPercentage: Math.round((overallSummary[0]?.overallPercentage || 0) * 100) / 100,
        averagePercentage: Math.round((overallSummary[0]?.averagePercentage || 0) * 100) / 100,
        highestPercentage: Math.round((overallSummary[0]?.highestPercentage || 0) * 100) / 100,
        lowestPercentage: Math.round((overallSummary[0]?.lowestPercentage || 0) * 100) / 100,
        subjectsCount: overallSummary[0]?.subjectCount || 0,
        termsCount: overallSummary[0]?.termCount || 0,
        examTypesCount: overallSummary[0]?.examTypeCount || 0
      },

      // Class Ranking
      ranking: {
        classRank: classRanking[0]?.studentRank || 'N/A',
        totalStudents: classRanking[0]?.totalStudents || 0,
        percentile: classRanking[0]?.studentRank && classRanking[0]?.totalStudents 
          ? Math.round(((classRanking[0].totalStudents - classRanking[0].studentRank + 1) / classRanking[0].totalStudents) * 100)
          : 'N/A'
      },

      // Subject Performance
      subjects: subjectPerformance.map(subject => {
        const individualGrades = individualGradesPerSubject.find(ig => ig._id.toString() === subject._id.toString());
        return {
          subjectId: subject._id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          totalExams: subject.totalExams,
          averagePercentage: Math.round(subject.averagePercentage * 100) / 100,
          overallPercentage: Math.round(subject.overallPercentage * 100) / 100,
          highestPercentage: Math.round(subject.highestPercentage * 100) / 100,
          lowestPercentage: Math.round(subject.lowestPercentage * 100) / 100,
          performanceCategory: subject.performanceCategory,
          gradeDistribution: subject.gradeCounts,
          recentGradeDistribution: subject.recentGradeCounts,
          classRank: subjectRanking.find(sr => sr._id.toString() === subject._id.toString())?.subjectRankings?.find(s => s.studentId.toString() === studentId)?.rank || 'N/A',
          // Individual grades for this subject
          grades: individualGrades?.grades?.map(grade => ({
            id: grade.id,
            examName: grade.examName || 'N/A',
            examDate: grade.examDate || 'N/A',
            marks: grade.marks,
            maxMarks: grade.maxMarks,
            percentage: Math.round(grade.percentage * 100) / 100,
            grade: grade.grade,
            term: grade.term,
            examType: grade.examType,
            date: grade.date
          })) || []
        };
      }),

      // Term Performance
      terms: termPerformance.map(term => ({
        term: term._id,
        totalExams: term.totalExams,
        averagePercentage: Math.round(term.averagePercentage * 100) / 100,
        overallPercentage: Math.round(term.overallPercentage * 100) / 100,
        subjectCount: term.subjectCount
      })),

      // Grade Distribution
      gradeDistribution: gradeDistribution.map(grade => ({
        grade: grade._id,
        count: grade.count,
        averagePercentage: Math.round(grade.averagePercentage * 100) / 100,
        percentage: Math.round((grade.count / (overallSummary[0]?.totalExams || 1)) * 100)
      })),

      // Performance Trends
      trends: performanceTrends.map(trend => ({
        period: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
        averagePercentage: Math.round(trend.averagePercentage * 100) / 100,
        examCount: trend.examCount
      })),

      // Detailed Grades (if includeHistory is true)
      ...(includeHistory === 'true' && {
        detailedGrades: gradesWithSubjects.map(grade => ({
          id: grade._id,
          subjectName: grade.subjectName,
          subjectCode: grade.subjectCode,
          examName: grade.examName || 'N/A',
          examDate: grade.examDate || 'N/A',
          marks: grade.marks,
          maxMarks: grade.maxMarks,
          percentage: Math.round(grade.percentage * 100) / 100,
          grade: grade.grade,
          term: grade.term,
          examType: grade.examType,
          date: grade.createdAt
        }))
      }),

      // Academic Performance Analysis
      analysis: {
        overallGrade: (() => {
          const avg = overallSummary[0]?.averagePercentage || 0;
          if (avg >= 85) return 'A';
          if (avg >= 70) return 'B';
          if (avg >= 55) return 'C';
          if (avg >= 40) return 'D';
          return 'F';
        })(),
        performanceLevel: (() => {
          const avg = overallSummary[0]?.averagePercentage || 0;
          if (avg >= 85) return 'Excellent';
          if (avg >= 70) return 'Good';
          if (avg >= 55) return 'Average';
          if (avg >= 40) return 'Below Average';
          return 'Needs Improvement';
        })(),
        strengths: subjectPerformance
          .filter(subject => subject.averagePercentage >= 70)
          .map(subject => subject.subjectName),
        areasForImprovement: subjectPerformance
          .filter(subject => subject.averagePercentage < 55)
          .map(subject => subject.subjectName),
        consistency: (() => {
          const percentages = subjectPerformance.map(s => s.averagePercentage);
          const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
          const variance = percentages.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / percentages.length;
          const stdDev = Math.sqrt(variance);
          if (stdDev < 10) return 'Very Consistent';
          if (stdDev < 15) return 'Consistent';
          if (stdDev < 20) return 'Moderately Consistent';
          return 'Inconsistent';
        })()
      },

      // Metadata
      metadata: {
        generatedAt: new Date(),
        filters: {
          term: term || 'All Terms',
          examType: examType || 'All Types',
          includeHistory: includeHistory === 'true'
        },
        dataPoints: {
          totalGrades: overallSummary[0]?.totalExams || 0,
          subjects: subjectPerformance.length,
          terms: termPerformance.length
        }
      }
    };

    const executionTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      data: academicResult,
      performance: {
        executionTime,
        aggregations: 8,
        complexity: 'high'
      }
    });

  } catch (err) {
    console.error('Student academic result error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};




