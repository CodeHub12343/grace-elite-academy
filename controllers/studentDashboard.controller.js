
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const Grade = require('../models/grade.model');
const Attendance = require('../models/attendance.model');
const Exam = require('../models/exam.model');
const Assignment = require('../models/assignment.model');
const AssignmentSubmission = require('../models/assignmentSubmission.model');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const Fee = require('../models/fee.model');
const Notification = require('../models/notification.model');
const TeacherReview = require('../models/teacherReview.model');
const TermResult = require('../models/termResult.model');
const TeacherGrade = require('../models/teacherGrade.model');

// Utility functions
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseSort = (query, defaultSort = '-createdAt') => {
  const sortBy = query.sortBy || defaultSort;
  return sortBy;
};

const calculatePercentage = (value, total) => {
  return total > 0 ? Math.round((value / total) * 100) : 0;
};

const calculateGrowthRate = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const getDateRange = (query) => {
  const { startDate, endDate, period = '30d' } = query;
  
  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
  }
  
  const now = new Date();
  let start;
  
  switch (period) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate: start, endDate: now };
};

// GET /student-dashboard/overview - Main dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.sub;
    
    // Get student details
    const student = await Student.findOne({ userId })
      .populate('userId', 'name email')
      .populate('classId', 'name');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get current dates
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Get academic performance summary
    let academicSummary = [];
    try {
      // Some schemas do not include academicYear on Grade; fall back to all-time for the student
      academicSummary = await Grade.aggregate([
        { $match: { studentId: student._id } },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            highestPercentage: { $max: '$percentage' },
            lowestPercentage: { $min: '$percentage' },
            excellentGrades: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
            goodGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
            averageGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
            poorGrades: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
          }
        }
      ]);
    } catch (_) {
      academicSummary = [];
    }

    // Get attendance summary
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          studentId: student._id,
          date: { $gte: new Date(currentYear, 0, 1) }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      }
    ]);

    // Get upcoming exams (next 30 days) - support schemas using startTime/endTime/status
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingExamFilter = {
      classId: student.classId,
      $and: [
        { $or: [
          { startDate: { $gte: now, $lte: in30Days } },
          { startTime: { $gte: now, $lte: in30Days } }
        ] },
        { $or: [
          { isActive: true },
          { status: 'published' }
        ] }
      ]
    };

    const upcomingExams = await Exam.find(upcomingExamFilter)
    .populate('subjectId', 'name code')
    .populate('teacherId', 'userId')
    .populate('teacherId.userId', 'name')
    .sort({ startDate: 1, startTime: 1 })
    .limit(5);

    // Get pending assignments
    const pendingAssignments = await Assignment.find({
      classId: student.classId,
      dueDate: { $gte: new Date() }
    })
    .populate('subjectId', 'name code')
    .populate('teacherId', 'userId')
    .populate('teacherId.userId', 'name')
    .sort('dueDate')
    .limit(5);

    // Get recent notifications
    const recentNotifications = await Notification.find({
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { classId: student.classId }
      ],
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .sort('-createdAt')
    .limit(5);

    // Get fee status
    let feeStatus = [];
    try {
      feeStatus = await Fee.aggregate([
        { $match: { studentId: student._id } },
        {
          $group: {
            _id: null,
            totalFees: { $sum: '$amount' },
            paidFees: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            pendingFees: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
            overdueFees: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } }
          }
        }
      ]);
    } catch (_) {
      feeStatus = [];
    }

    // Calculate attendance percentage
    const attendance = attendanceSummary[0] || { totalDays: 0, presentDays: 0 };
    const attendancePercentage = calculatePercentage(attendance.presentDays, attendance.totalDays);

    // Calculate academic performance
    const academic = academicSummary[0] || { totalGrades: 0, averagePercentage: 0 };
    const academicPerformance = {
      averagePercentage: Math.round(academic.averagePercentage || 0),
      totalGrades: academic.totalGrades,
      gradeDistribution: {
        excellent: academic.excellentGrades || 0,
        good: academic.goodGrades || 0,
        average: academic.averageGrades || 0,
        poor: academic.poorGrades || 0
      }
    };

    // Calculate fee status
    const fees = feeStatus[0] || { totalFees: 0, paidFees: 0, pendingFees: 0, overdueFees: 0 };
    const feePercentage = calculatePercentage(fees.paidFees, fees.totalFees);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId.name,
          email: student.userId.email,
          class: student.classId?.name,
          subjects: student.subjects?.map(s => ({ id: s._id, name: s.name, code: s.code }))
        },
        overview: {
          academicPerformance,
          attendance: {
            percentage: attendancePercentage,
            presentDays: attendance.presentDays,
            totalDays: attendance.totalDays,
            absentDays: attendance.absentDays || 0,
            lateDays: attendance.lateDays || 0
          },
          fees: {
            totalFees: fees.totalFees,
            paidFees: fees.paidFees,
            pendingFees: fees.pendingFees,
            overdueFees: fees.overdueFees,
            paymentPercentage: feePercentage
          }
        },
        upcoming: {
          exams: upcomingExams.map(exam => ({
            id: exam._id,
            title: exam.title,
            subject: exam.subjectId?.name,
            startDate: exam.startDate,
            duration: exam.duration,
            teacher: exam.teacherId?.userId?.name
          })),
          assignments: pendingAssignments.map(assignment => ({
            id: assignment._id,
            title: assignment.title,
            subject: assignment.subjectId?.name,
            dueDate: assignment.dueDate,
            teacher: assignment.teacherId?.userId?.name
          }))
        },
        notifications: recentNotifications.map(notification => ({
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          createdAt: notification.createdAt
        })),
        lastUpdated: new Date()
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/academic - Academic performance details
exports.getAcademicPerformance = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { term, academicYear, subjectId, examType, page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter
    const filter = { studentId: student._id };
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (subjectId) filter.subjectId = subjectId;
    if (examType) filter.examType = examType;

    // Get grades with pagination
    const grades = await Grade.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('teacherId', 'userId')
      .populate('teacherId.userId', 'name')
      .populate('examId', 'title examType')
      .sort('-createdAt')
      .skip(skip)
      .limit(pageLimit);

    // Get total count
    const totalGrades = await Grade.countDocuments(filter);

    // Get academic summary
    const academicSummary = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      }
    ]);

    // Get performance by subject
    const performanceBySubject = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$subjectId',
          subjectName: { $first: '$subjectId' },
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $unwind: '$subject'
      },
      {
        $project: {
          subjectName: '$subject.name',
          subjectCode: '$subject.code',
          totalGrades: 1,
          averagePercentage: { $round: ['$averagePercentage', 2] },
          highestPercentage: 1,
          lowestPercentage: 1
        }
      },
      { $sort: { averagePercentage: -1 } }
    ]);

    // Get performance by term
    const performanceByTerm = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$term',
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get grade distribution
    const gradeDistribution = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = academicSummary[0] || {
      totalGrades: 0,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
      totalMarks: 0,
      totalMaxMarks: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        summary: {
          totalGrades: summary.totalGrades,
          averagePercentage: Math.round(summary.averagePercentage || 0),
          highestPercentage: summary.highestPercentage || 0,
          lowestPercentage: summary.lowestPercentage || 0,
          totalMarks: summary.totalMarks,
          totalMaxMarks: summary.totalMaxMarks,
          overallPercentage: calculatePercentage(summary.totalMarks, summary.totalMaxMarks)
        },
        performanceBySubject,
        performanceByTerm,
        gradeDistribution: gradeDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        grades: grades.map(grade => ({
          id: grade._id,
          subject: grade.subjectId?.name,
          subjectCode: grade.subjectId?.code,
          class: grade.classId?.name,
          teacher: grade.teacherId?.userId?.name,
          exam: grade.examId?.title,
          examType: grade.examType,
          term: grade.term,
          academicYear: grade.academicYear,
          marks: grade.marks,
          maxMarks: grade.maxMarks,
          percentage: grade.percentage,
          grade: grade.grade,
          remarks: grade.remarks,
          createdAt: grade.createdAt
        })),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalGrades,
          pages: Math.ceil(totalGrades / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/attendance - Attendance tracking
exports.getAttendanceTracking = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, period = '30d', page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });
    const { startDate: start, endDate: end } = getDateRange({ startDate, endDate, period });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get attendance records
    const attendance = await Attendance.find({
      studentId: student._id,
      date: { $gte: start, $lte: end }
    })
    .populate('classId', 'name')
    .sort('-date')
    .skip(skip)
    .limit(pageLimit);

    // Get total count
    const totalRecords = await Attendance.countDocuments({
      studentId: student._id,
      date: { $gte: start, $lte: end }
    });

    // Get attendance summary
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          studentId: student._id,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      }
    ]);

    // Get attendance by month
    const attendanceByMonth = await Attendance.aggregate([
      {
        $match: {
          studentId: student._id,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get attendance trends
    const attendanceTrends = await Attendance.aggregate([
      {
        $match: {
          studentId: student._id,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            week: { $week: '$date' }
          },
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    const summary = attendanceSummary[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0
    };

    const attendancePercentage = calculatePercentage(summary.presentDays, summary.totalDays);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        summary: {
          totalDays: summary.totalDays,
          presentDays: summary.presentDays,
          absentDays: summary.absentDays,
          lateDays: summary.lateDays,
          attendancePercentage
        },
        attendanceByMonth,
        attendanceTrends,
        records: attendance.map(record => ({
          id: record._id,
          date: record.date,
          status: record.status,
          remarks: record.remarks,
          class: record.classId?.name,
          createdAt: record.createdAt
        })),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalRecords,
          pages: Math.ceil(totalRecords / pageLimit)
        },
        dateRange: {
          startDate: start,
          endDate: end,
          period
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/exams - Exam schedule and results
exports.getExamSchedule = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { status = 'upcoming', page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter based on status
    let filter = { classId: student.classId };
    const now = new Date();

    switch (status) {
      case 'upcoming':
        filter.startDate = { $gte: now };
        break;
      case 'ongoing':
        filter.startDate = { $lte: now };
        filter.endDate = { $gte: now };
        break;
      case 'completed':
        filter.endDate = { $lt: now };
        break;
      case 'all':
        // No date filter
        break;
    }

    // Get exams
    const exams = await Exam.find(filter)
      .populate('subjectId', 'name code')
      .populate('teacherId', 'userId')
      .populate('teacherId.userId', 'name')
      .sort('startDate')
      .skip(skip)
      .limit(pageLimit);

    // Get total count
    const totalExams = await Exam.countDocuments(filter);

    // Get exam results for completed exams
    const examResults = await Grade.aggregate([
      {
        $match: {
          studentId: student._id,
          examId: { $in: exams.filter(e => e.endDate < now).map(e => e._id) }
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $unwind: '$exam'
      },
      {
        $project: {
          examId: 1,
          examTitle: '$exam.title',
          examType: '$exam.examType',
          subjectId: '$exam.subjectId',
          marks: 1,
          maxMarks: 1,
          percentage: 1,
          grade: 1,
          createdAt: 1
        }
      }
    ]);

    // Get upcoming exams (next 7 days)
    const upcomingExams = await Exam.find({
      classId: student.classId,
      startDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('subjectId', 'name code')
    .populate('teacherId', 'userId')
    .populate('teacherId.userId', 'name')
    .sort('startDate')
    .limit(5);

    // Get exam statistics
    const examStats = await Grade.aggregate([
      {
        $match: {
          studentId: student._id
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $unwind: '$exam'
      },
      {
        $group: {
          _id: null,
          totalExams: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' },
          passedExams: { $sum: { $cond: [{ $gte: ['$percentage', 50] }, 1, 0] } },
          failedExams: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      }
    ]);

    const stats = examStats[0] || {
      totalExams: 0,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
      passedExams: 0,
      failedExams: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        statistics: {
          totalExams: stats.totalExams,
          averagePercentage: Math.round(stats.averagePercentage || 0),
          highestPercentage: stats.highestPercentage || 0,
          lowestPercentage: stats.lowestPercentage || 0,
          passedExams: stats.passedExams,
          failedExams: stats.failedExams,
          passRate: calculatePercentage(stats.passedExams, stats.totalExams)
        },
        upcomingExams: upcomingExams.map(exam => ({
          id: exam._id,
          title: exam.title,
          subject: exam.subjectId?.name,
          subjectCode: exam.subjectId?.code,
          startDate: exam.startDate,
          endDate: exam.endDate,
          duration: exam.duration,
          teacher: exam.teacherId?.userId?.name,
          instructions: exam.instructions
        })),
        exams: exams.map(exam => {
          const result = examResults.find(r => String(r.examId) === String(exam._id));
          return {
            id: exam._id,
            title: exam.title,
            subject: exam.subjectId?.name,
            subjectCode: exam.subjectId?.code,
            examType: exam.examType,
            term: exam.term,
            academicYear: exam.academicYear,
            startDate: exam.startDate,
            endDate: exam.endDate,
            duration: exam.duration,
            teacher: exam.teacherId?.userId?.name,
            instructions: exam.instructions,
            isActive: exam.isActive,
            result: result ? {
              marks: result.marks,
              maxMarks: result.maxMarks,
              percentage: result.percentage,
              grade: result.grade
            } : null
          };
        }),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalExams,
          pages: Math.ceil(totalExams / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/assignments - Assignment management
exports.getAssignments = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { status = 'pending', page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter based on status
    let filter = { classId: student.classId };
    const now = new Date();

    switch (status) {
      case 'pending':
        filter.dueDate = { $gte: now };
        break;
      case 'overdue':
        filter.dueDate = { $lt: now };
        break;
      case 'all':
        // No date filter
        break;
    }

    // Get assignments
    const assignments = await Assignment.find(filter)
      .populate('subjectId', 'name code')
      .populate('teacherId', 'userId')
      .populate('teacherId.userId', 'name')
      .sort('dueDate')
      .skip(skip)
      .limit(pageLimit);

    // Get total count
    const totalAssignments = await Assignment.countDocuments(filter);

    // Get submission status for each assignment
    const assignmentSubmissions = await AssignmentSubmission.find({
      studentId: student._id,
      assignmentId: { $in: assignments.map(a => a._id) }
    });

    // Get assignment statistics
    const assignmentStats = await Assignment.aggregate([
      {
        $match: { classId: student.classId }
      },
      {
        $lookup: {
          from: 'assignmentsubmissions',
          localField: '_id',
          foreignField: 'assignmentId',
          as: 'submissions'
        }
      },
      {
        $addFields: {
          isSubmitted: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$submissions',
                    cond: { $eq: ['$$this.studentId', student._id] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAssignments: { $sum: 1 },
          submittedAssignments: { $sum: { $cond: ['$isSubmitted', 1, 0] } },
          pendingAssignments: { $sum: { $cond: [{ $and: ['$isSubmitted', { $gte: ['$dueDate', now] }] }, 0, 1] } },
          overdueAssignments: { $sum: { $cond: [{ $and: ['$isSubmitted', { $lt: ['$dueDate', now] }] }, 0, 1] } }
        }
      }
    ]);

    const stats = assignmentStats[0] || {
      totalAssignments: 0,
      submittedAssignments: 0,
      pendingAssignments: 0,
      overdueAssignments: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        statistics: {
          totalAssignments: stats.totalAssignments,
          submittedAssignments: stats.submittedAssignments,
          pendingAssignments: stats.pendingAssignments,
          overdueAssignments: stats.overdueAssignments,
          submissionRate: calculatePercentage(stats.submittedAssignments, stats.totalAssignments)
        },
        assignments: assignments.map(assignment => {
          const submission = assignmentSubmissions.find(s => String(s.assignmentId) === String(assignment._id));
          const isOverdue = assignment.dueDate < now;
          const isSubmitted = !!submission;
          
          return {
            id: assignment._id,
            title: assignment.title,
            description: assignment.description,
            subject: assignment.subjectId?.name,
            subjectCode: assignment.subjectId?.code,
            teacher: assignment.teacherId?.userId?.name,
            dueDate: assignment.dueDate,
            maxMarks: assignment.maxMarks,
            instructions: assignment.instructions,
            attachments: assignment.attachments,
            isSubmitted,
            isOverdue,
            submission: submission ? {
              id: submission._id,
              submittedAt: submission.submittedAt,
              marks: submission.marks,
              feedback: submission.feedback,
              attachments: submission.attachments
            } : null
          };
        }),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalAssignments,
          pages: Math.ceil(totalAssignments / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/fees - Fee and payment status
exports.getFeeStatus = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { academicYear, status, page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter
    const filter = { studentId: student._id };
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;

    // Get fees
    const fees = await Fee.find(filter)
      // Optional population: only if schema supports it
      .sort('-createdAt')
      .skip(skip)
      .limit(pageLimit);

    // Get total count
    const totalFees = await Fee.countDocuments(filter);

    // Get fee summary
    const feeSummary = await Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFees: { $sum: '$amount' },
          paidFees: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          pendingFees: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          overdueFees: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } }
        }
      }
    ]);

    // Get payment history
    const payments = await Payment.find({
      studentId: student._id,
      status: 'success'
    })
    .populate('invoiceId', 'feeId')
    .populate('invoiceId.feeId', 'feeCategoryId')
    .populate('invoiceId.feeId.feeCategoryId', 'name')
    .sort('-createdAt')
    .limit(10);

    // Get fee breakdown by category
    const feeBreakdown = await Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$feeCategoryId',
          categoryName: { $first: '$feeCategoryId' },
          totalAmount: { $sum: '$amount' },
          paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } }
        }
      },
      {
        $lookup: {
          from: 'feecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          categoryName: '$category.name',
          categoryDescription: '$category.description',
          totalAmount: 1,
          paidAmount: 1,
          pendingAmount: 1,
          overdueAmount: 1
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const summary = feeSummary[0] || {
      totalFees: 0,
      paidFees: 0,
      pendingFees: 0,
      overdueFees: 0
    };

    const paymentPercentage = calculatePercentage(summary.paidFees, summary.totalFees);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        summary: {
          totalFees: summary.totalFees,
          paidFees: summary.paidFees,
          pendingFees: summary.pendingFees,
          overdueFees: summary.overdueFees,
          paymentPercentage
        },
        feeBreakdown,
        fees: fees.map(fee => ({
          id: fee._id,
          category: fee.feeCategoryId?.name,
          description: fee.feeCategoryId?.description,
          amount: fee.amount,
          dueDate: fee.dueDate,
          status: fee.status,
          academicYear: fee.academicYear,
          createdAt: fee.createdAt
        })),
        recentPayments: payments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          method: payment.paymentMethod,
          status: payment.status,
          category: payment.invoiceId?.feeId?.feeCategoryId?.name,
          paidAt: payment.paidAt,
          reference: payment.reference
        })),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalFees,
          pages: Math.ceil(totalFees / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/notifications - Notifications and announcements
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, isRead, page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter
    const filter = {
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { classId: student.classId }
      ]
    };

    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    // Get notifications
    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(pageLimit);

    // Get total count
    const totalNotifications = await Notification.countDocuments(filter);

    // Get notification summary
    const notificationSummary = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          readNotifications: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } }
        }
      }
    ]);

    // Get notifications by type
    const notificationsByType = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const summary = notificationSummary[0] || {
      totalNotifications: 0,
      unreadNotifications: 0,
      readNotifications: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        summary: {
          totalNotifications: summary.totalNotifications,
          unreadNotifications: summary.unreadNotifications,
          readNotifications: summary.readNotifications
        },
        notificationsByType,
        notifications: notifications.map(notification => ({
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          isRead: notification.isRead,
          targetAudience: notification.targetAudience,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        })),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalNotifications,
          pages: Math.ceil(totalNotifications / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/progress - Study progress and analytics
exports.getStudyProgress = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { academicYear, term, page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build filter
    const filter = { studentId: student._id };
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;

    // Get academic progress
    const academicProgress = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            academicYear: '$academicYear',
            term: '$term'
          },
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' },
          excellentGrades: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorGrades: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { '_id.academicYear': 1, '_id.term': 1 } }
    ]);

    // Get subject-wise progress
    const subjectProgress = await Grade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$subjectId',
          subjectName: { $first: '$subjectId' },
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $unwind: '$subject'
      },
      {
        $project: {
          subjectName: '$subject.name',
          subjectCode: '$subject.code',
          totalGrades: 1,
          averagePercentage: { $round: ['$averagePercentage', 2] },
          highestPercentage: 1,
          lowestPercentage: 1,
          totalMarks: 1,
          totalMaxMarks: 1
        }
      },
      { $sort: { averagePercentage: -1 } }
    ]);

    // Get attendance progress
    const attendanceProgress = await Attendance.aggregate([
      {
        $match: {
          studentId: student._id,
          date: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get assignment progress
    const assignmentProgress = await Assignment.aggregate([
      {
        $match: { classId: student.classId }
      },
      {
        $lookup: {
          from: 'assignmentsubmissions',
          localField: '_id',
          foreignField: 'assignmentId',
          as: 'submissions'
        }
      },
      {
        $addFields: {
          isSubmitted: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$submissions',
                    cond: { $eq: ['$$this.studentId', student._id] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAssignments: { $sum: 1 },
          submittedAssignments: { $sum: { $cond: ['$isSubmitted', 1, 0] } }
        }
      },
      {
        $addFields: {
          submissionRate: {
            $round: [
              { $multiply: [{ $divide: ['$submittedAssignments', '$totalAssignments'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get overall progress summary
    const overallProgress = await Grade.aggregate([
      { $match: { studentId: student._id } },
      {
        $group: {
          _id: null,
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' },
          excellentGrades: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorGrades: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      }
    ]);

    const overall = overallProgress[0] || {
      totalGrades: 0,
      averagePercentage: 0,
      totalMarks: 0,
      totalMaxMarks: 0,
      excellentGrades: 0,
      goodGrades: 0,
      averageGrades: 0,
      poorGrades: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        overallProgress: {
          totalGrades: overall.totalGrades,
          averagePercentage: Math.round(overall.averagePercentage || 0),
          totalMarks: overall.totalMarks,
          totalMaxMarks: overall.totalMaxMarks,
          overallPercentage: calculatePercentage(overall.totalMarks, overall.totalMaxMarks),
          gradeDistribution: {
            excellent: overall.excellentGrades,
            good: overall.goodGrades,
            average: overall.averageGrades,
            poor: overall.poorGrades
          }
        },
        academicProgress,
        subjectProgress,
        attendanceProgress,
        assignmentProgress,
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: overall.totalGrades,
          pages: Math.ceil(overall.totalGrades / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/teachers - Teacher information and reviews
exports.getTeacherInformation = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get teachers for student's subjects and class
    const teachers = await Teacher.find({
      classes: { $in: [student.classId] }
    })
    .populate('userId', 'name email')
    .populate('subjects', 'name code')
    .populate('classes', 'name')
    .sort('userId.name')
    .skip(skip)
    .limit(pageLimit);

    // Get total count
    const totalTeachers = await Teacher.countDocuments({
      classes: { $in: [student.classId] }
    });

    // Get teacher reviews for each teacher
    const teacherReviews = await TeacherReview.find({
      teacherId: { $in: teachers.map(t => t._id) }
    })
    .sort('-createdAt');

    // Get teacher performance data
    const teacherPerformance = await Grade.aggregate([
      {
        $match: {
          studentId: student._id,
          teacherId: { $in: teachers.map(t => t._id) }
        }
      },
      {
        $group: {
          _id: '$teacherId',
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        teachers: teachers.map(teacher => {
          const performance = teacherPerformance.find(p => String(p._id) === String(teacher._id));
          const reviews = teacherReviews.filter(r => String(r.teacherId) === String(teacher._id));
          
          return {
            id: teacher._id,
            name: teacher.userId?.name,
            email: teacher.userId?.email,
            subjects: teacher.subjects?.map(s => ({ id: s._id, name: s.name, code: s.code })),
            classes: teacher.classes?.map(c => ({ id: c._id, name: c.name })),
            performance: performance ? {
              totalGrades: performance.totalGrades,
              averagePercentage: Math.round(performance.averagePercentage || 0),
              highestPercentage: performance.highestPercentage,
              lowestPercentage: performance.lowestPercentage
            } : null,
            reviews: {
              total: reviews.length,
              averageRating: reviews.length > 0 ? 
                Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0,
              recentReviews: reviews.slice(0, 3).map(review => ({
                id: review._id,
                rating: review.rating,
                comment: review.comment,
                student: review.studentId?.userId?.name,
                createdAt: review.createdAt
              }))
            }
          };
        }),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: totalTeachers,
          pages: Math.ceil(totalTeachers / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/calendar - Academic calendar and events
exports.getAcademicCalendar = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { month, year, page, limit } = req.query;
    const { skip, limit: pageLimit } = parsePagination({ page, limit });

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Get start and end of month
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // Get exams for the month
    const exams = await Exam.find({
      classId: student.classId,
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .populate('subjectId', 'name code')
    .populate('teacherId', 'userId')
    .populate('teacherId.userId', 'name')
    .sort('startDate');

    // Get assignments due in the month
    const assignments = await Assignment.find({
      classId: student.classId,
      dueDate: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .populate('subjectId', 'name code')
    .populate('teacherId', 'userId')
    .populate('teacherId.userId', 'name')
    .sort('dueDate');

    // Get attendance for the month
    const attendance = await Attendance.find({
      studentId: student._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .sort('date');

    // Get notifications for the month
    const notifications = await Notification.find({
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { classId: student.classId }
      ],
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .sort('-createdAt')
    .limit(10);

    // Create calendar events
    const events = [];

    // Add exams
    exams.forEach(exam => {
      events.push({
        id: exam._id,
        type: 'exam',
        title: exam.title,
        description: `${exam.subjectId?.name} Exam`,
        date: exam.startDate,
        endDate: exam.endDate,
        subject: exam.subjectId?.name,
        teacher: exam.teacherId?.userId?.name,
        priority: 'high'
      });
    });

    // Add assignments
    assignments.forEach(assignment => {
      events.push({
        id: assignment._id,
        type: 'assignment',
        title: assignment.title,
        description: `Assignment Due - ${assignment.subjectId?.name}`,
        date: assignment.dueDate,
        subject: assignment.subjectId?.name,
        teacher: assignment.teacherId?.userId?.name,
        priority: assignment.dueDate < new Date() ? 'high' : 'medium'
      });
    });

    // Add attendance
    attendance.forEach(record => {
      events.push({
        id: record._id,
        type: 'attendance',
        title: `Attendance - ${record.status}`,
        description: record.remarks || `Class attendance marked as ${record.status}`,
        date: record.date,
        status: record.status,
        priority: 'low'
      });
    });

    // Add notifications
    notifications.forEach(notification => {
      events.push({
        id: notification._id,
        type: 'notification',
        title: notification.title,
        description: notification.message,
        date: notification.createdAt,
        priority: notification.priority || 'medium'
      });
    });

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get monthly summary
    const monthlySummary = {
      totalExams: exams.length,
      totalAssignments: assignments.length,
      attendanceDays: attendance.length,
      presentDays: attendance.filter(a => a.status === 'present').length,
      absentDays: attendance.filter(a => a.status === 'absent').length,
      lateDays: attendance.filter(a => a.status === 'late').length,
      notifications: notifications.length
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name,
          class: student.classId?.name
        },
        calendar: {
          month: targetMonth + 1,
          year: targetYear,
          startDate: startOfMonth,
          endDate: endOfMonth
        },
        summary: monthlySummary,
        events: events.slice(skip, skip + pageLimit),
        pagination: {
          page: parseInt(page) || 1,
          limit: pageLimit,
          total: events.length,
          pages: Math.ceil(events.length / pageLimit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /student-dashboard/export - Export student data
exports.exportStudentData = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { format = 'json', dataType = 'all' } = req.query;

    // Get student details
    const student = await Student.findOne({ userId })
      .populate('userId', 'name email')
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    let exportData = {
      student: {
        id: student._id,
        name: student.userId?.name,
        email: student.userId?.email,
        class: student.classId?.name,
        subjects: student.subjects?.map(s => ({ name: s.name, code: s.code }))
      },
      exportedAt: new Date(),
      dataType
    };

    // Get academic data
    if (dataType === 'all' || dataType === 'academic') {
      const grades = await Grade.find({ studentId: student._id })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'userId')
        .populate('teacherId.userId', 'name')
        .populate('examId', 'title examType')
        .sort('-createdAt');

      exportData.academic = {
        grades: grades.map(grade => ({
          subject: grade.subjectId?.name,
          exam: grade.examId?.title,
          examType: grade.examType,
          term: grade.term,
          academicYear: grade.academicYear,
          marks: grade.marks,
          maxMarks: grade.maxMarks,
          percentage: grade.percentage,
          grade: grade.grade,
          teacher: grade.teacherId?.userId?.name,
          createdAt: grade.createdAt
        }))
      };
    }

    // Get attendance data
    if (dataType === 'all' || dataType === 'attendance') {
      const attendance = await Attendance.find({ studentId: student._id })
        .populate('classId', 'name')
        .sort('-date');

      exportData.attendance = {
        records: attendance.map(record => ({
          date: record.date,
          status: record.status,
          remarks: record.remarks,
          class: record.classId?.name,
          createdAt: record.createdAt
        }))
      };
    }

    // Get exam data
    if (dataType === 'all' || dataType === 'exams') {
      const exams = await Exam.find({ classId: student.classId })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'userId')
        .populate('teacherId.userId', 'name')
        .sort('startDate');

      exportData.exams = {
        exams: exams.map(exam => ({
          title: exam.title,
          subject: exam.subjectId?.name,
          examType: exam.examType,
          term: exam.term,
          academicYear: exam.academicYear,
          startDate: exam.startDate,
          endDate: exam.endDate,
          duration: exam.duration,
          teacher: exam.teacherId?.userId?.name,
          isActive: exam.isActive
        }))
      };
    }

    // Get assignment data
    if (dataType === 'all' || dataType === 'assignments') {
      const assignments = await Assignment.find({ classId: student.classId })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'userId')
        .populate('teacherId.userId', 'name')
        .sort('dueDate');

      const submissions = await AssignmentSubmission.find({ studentId: student._id });

      exportData.assignments = {
        assignments: assignments.map(assignment => {
          const submission = submissions.find(s => String(s.assignmentId) === String(assignment._id));
          return {
            title: assignment.title,
            subject: assignment.subjectId?.name,
            teacher: assignment.teacherId?.userId?.name,
            dueDate: assignment.dueDate,
            maxMarks: assignment.maxMarks,
            isSubmitted: !!submission,
            submission: submission ? {
              submittedAt: submission.submittedAt,
              marks: submission.marks,
              feedback: submission.feedback
            } : null
          };
        })
      };
    }

    // Get fee data
    if (dataType === 'all' || dataType === 'fees') {
      const fees = await Fee.find({ studentId: student._id })
        // Optional population: only if schema supports it
        .sort('-createdAt');

      const payments = await Payment.find({ studentId: student._id })
        .sort('-createdAt');

      exportData.fees = {
        fees: fees.map(fee => ({
          category: fee.feeCategoryId?.name,
          amount: fee.amount,
          dueDate: fee.dueDate,
          status: fee.status,
          academicYear: fee.academicYear
        })),
        payments: payments.map(payment => ({
          amount: payment.amount,
          method: payment.paymentMethod,
          status: payment.status,
          paidAt: payment.paidAt,
          reference: payment.reference
        }))
      };
    }

    // Set response headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="student_data_${student.userId?.name}_${new Date().toISOString().split('T')[0]}.csv"`);
      
      // Convert to CSV format (simplified)
      const csvData = JSON.stringify(exportData, null, 2);
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="student_data_${student.userId?.name}_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(exportData);
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};