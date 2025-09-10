const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const Grade = require('../models/grade.model');
const TeacherGrade = require('../models/teacherGrade.model');
const Attendance = require('../models/attendance.model');
const Payment = require('../models/payment.model');
const Fee = require('../models/fee.model');
const Exam = require('../models/exam.model');
const Assignment = require('../models/assignment.model');
const TeacherReview = require('../models/teacherReview.model');
const TeacherAttendance = require('../models/teacherAttendance.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// Utility functions for analytics
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseDateRange = (query) => {
  const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  return { startDate, endDate };
};

const calculatePercentage = (value, total) => {
  return total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0;
};

const calculateGrowthRate = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
};

// ============================================================================
// DASHBOARD OVERVIEW ANALYTICS
// ============================================================================

// GET /admin-analytics/dashboard - Comprehensive dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    // Parallel data fetching for performance
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      recentEnrollments,
      recentPayments,
      attendanceToday,
      activeExams,
      pendingAssignments,
      systemNotifications
    ] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Class.countDocuments(),
      Subject.countDocuments(),
      Student.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Payment.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Attendance.countDocuments({ date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Exam.countDocuments({ isActive: true }),
      Assignment.countDocuments({ dueDate: { $gte: new Date() } }),
      Notification.countDocuments({ isRead: false })
    ]);

    // Financial overview
    const financialOverview = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averagePayment: { $avg: '$amount' },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    // Academic performance overview
    const academicOverview = await Grade.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$percentage' },
          totalGrades: { $sum: 1 },
          excellentGrades: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorGrades: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      }
    ]);

    // Attendance overview
    const attendanceOverview = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAttendance: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      }
    ]);

    // Teacher performance overview
    const teacherOverview = await TeacherReview.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          excellentReviews: { $sum: { $cond: [{ $gte: ['$rating', 4.5] }, 1, 0] } },
          goodReviews: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 3.5] }, { $lt: ['$rating', 4.5] }] }, 1, 0] } },
          averageReviews: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 2.5] }, { $lt: ['$rating', 3.5] }] }, 1, 0] } },
          poorReviews: { $sum: { $cond: [{ $lt: ['$rating', 2.5] }, 1, 0] } }
        }
      }
    ]);

    const financial = financialOverview[0] || { totalRevenue: 0, averagePayment: 0, paymentCount: 0 };
    const academic = academicOverview[0] || { averageScore: 0, totalGrades: 0, excellentGrades: 0, goodGrades: 0, averageGrades: 0, poorGrades: 0 };
    const attendance = attendanceOverview[0] || { totalAttendance: 0, presentCount: 0, absentCount: 0, lateCount: 0 };
    const teacher = teacherOverview[0] || { totalReviews: 0, averageRating: 0, excellentReviews: 0, goodReviews: 0, averageReviews: 0, poorReviews: 0 };

    // Calculate percentages
    const attendanceRate = calculatePercentage(attendance.presentCount, attendance.totalAttendance);
    const academicDistribution = {
      excellent: calculatePercentage(academic.excellentGrades, academic.totalGrades),
      good: calculatePercentage(academic.goodGrades, academic.totalGrades),
      average: calculatePercentage(academic.averageGrades, academic.totalGrades),
      poor: calculatePercentage(academic.poorGrades, academic.totalGrades)
    };

    const teacherDistribution = {
      excellent: calculatePercentage(teacher.excellentReviews, teacher.totalReviews),
      good: calculatePercentage(teacher.goodReviews, teacher.totalReviews),
      average: calculatePercentage(teacher.averageReviews, teacher.totalReviews),
      poor: calculatePercentage(teacher.poorReviews, teacher.totalReviews)
    };

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalClasses,
          totalSubjects,
          recentEnrollments,
          recentPayments,
          attendanceToday,
          activeExams,
          pendingAssignments,
          systemNotifications
        },
        financial: {
          totalRevenue: financial.totalRevenue,
          averagePayment: Math.round(financial.averagePayment * 100) / 100,
          paymentCount: financial.paymentCount,
          revenueGrowth: 0 // Will be calculated with historical data
        },
        academic: {
          averageScore: Math.round(academic.averageScore * 100) / 100,
          totalGrades: academic.totalGrades,
          distribution: academicDistribution
        },
        attendance: {
          totalAttendance: attendance.totalAttendance,
          attendanceRate,
          presentCount: attendance.presentCount,
          absentCount: attendance.absentCount,
          lateCount: attendance.lateCount
        },
        teacher: {
          totalReviews: teacher.totalReviews,
          averageRating: Math.round(teacher.averageRating * 100) / 100,
          distribution: teacherDistribution
        },
        dateRange: {
          startDate,
          endDate
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

// ============================================================================
// ACADEMIC PERFORMANCE ANALYTICS
// ============================================================================

// GET /admin-analytics/academic/performance - Comprehensive academic performance analytics
exports.getAcademicPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { classId, subjectId, term, academicYear } = req.query;

    // Build match filter
    const matchFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (classId) matchFilter.classId = classId;
    if (subjectId) matchFilter.subjectId = subjectId;
    if (term) matchFilter.term = term;
    if (academicYear) matchFilter.academicYear = academicYear;

    // Overall performance metrics
    const overallPerformance = await Grade.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          highestScore: { $max: '$percentage' },
          lowestScore: { $min: '$percentage' },
          standardDeviation: { $stdDevSamp: '$percentage' },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorCount: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      }
    ]);

    // Performance by class
    const performanceByClass = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $group: {
          _id: '$classId',
          className: { $first: '$class.name' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorCount: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Performance by subject
    const performanceBySubject = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $group: {
          _id: '$subjectId',
          subjectName: { $first: '$subject.name' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorCount: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Performance by exam type
    const performanceByExamType = await Grade.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$examType',
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorCount: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Top performing students
    const topStudents = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: '$studentId',
          studentName: { $first: '$user.name' },
          rollNumber: { $first: '$student.rollNumber' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          highestScore: { $max: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 10 }
    ]);

    // Bottom performing students (for intervention)
    const bottomStudents = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: '$studentId',
          studentName: { $first: '$user.name' },
          rollNumber: { $first: '$student.rollNumber' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          lowestScore: { $min: '$percentage' },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      },
      { $sort: { averageScore: 1 } },
      { $limit: 10 }
    ]);

    // Performance trends over time
    const performanceTrends = await Grade.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          averageScore: { $avg: '$percentage' },
          totalGrades: { $sum: 1 },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageCount: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorCount: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const overall = overallPerformance[0] || {
      totalGrades: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      excellentCount: 0,
      goodCount: 0,
      averageCount: 0,
      poorCount: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        overall: {
          ...overall,
          averageScore: Math.round(overall.averageScore * 100) / 100,
          medianScore: Math.round(overall.medianScore * 100) / 100,
          standardDeviation: Math.round(overall.standardDeviation * 100) / 100,
          distribution: {
            excellent: calculatePercentage(overall.excellentCount, overall.totalGrades),
            good: calculatePercentage(overall.goodCount, overall.totalGrades),
            average: calculatePercentage(overall.averageCount, overall.totalGrades),
            poor: calculatePercentage(overall.poorCount, overall.totalGrades)
          }
        },
        byClass: performanceByClass.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentCount, item.totalGrades),
            good: calculatePercentage(item.goodCount, item.totalGrades),
            average: calculatePercentage(item.averageCount, item.totalGrades),
            poor: calculatePercentage(item.poorCount, item.totalGrades)
          }
        })),
        bySubject: performanceBySubject.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentCount, item.totalGrades),
            good: calculatePercentage(item.goodCount, item.totalGrades),
            average: calculatePercentage(item.averageCount, item.totalGrades),
            poor: calculatePercentage(item.poorCount, item.totalGrades)
          }
        })),
        byExamType: performanceByExamType.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentCount, item.totalGrades),
            good: calculatePercentage(item.goodCount, item.totalGrades),
            average: calculatePercentage(item.averageCount, item.totalGrades),
            poor: calculatePercentage(item.poorCount, item.totalGrades)
          }
        })),
        topStudents: topStudents.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          overallPercentage: calculatePercentage(item.totalMarks, item.totalMaxMarks)
        })),
        bottomStudents: bottomStudents.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          overallPercentage: calculatePercentage(item.totalMarks, item.totalMaxMarks)
        })),
        trends: performanceTrends.map(item => ({
          ...item,
          period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          averageScore: Math.round(item.averageScore * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentCount, item.totalGrades),
            good: calculatePercentage(item.goodCount, item.totalGrades),
            average: calculatePercentage(item.averageCount, item.totalGrades),
            poor: calculatePercentage(item.poorCount, item.totalGrades)
          }
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// FINANCIAL ANALYTICS
// ============================================================================

// GET /admin-analytics/financial/overview - Comprehensive financial analytics
exports.getFinancialOverview = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    // Revenue analytics
    const revenueAnalytics = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averagePayment: { $avg: '$amount' },
          totalPayments: { $sum: 1 },
          highestPayment: { $max: '$amount' },
          lowestPayment: { $min: '$amount' }
        }
      }
    ]);

    // Revenue by month
    const revenueByMonth = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          averagePayment: { $avg: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Outstanding fees analysis
    const outstandingFees = await Fee.aggregate([
      {
        $lookup: {
          from: 'payments',
          localField: 'studentId',
          foreignField: 'studentId',
          as: 'payments'
        }
      },
      {
        $addFields: {
          totalPaid: {
            $sum: {
              $map: {
                input: '$payments',
                as: 'payment',
                in: { $cond: [{ $eq: ['$$payment.status', 'completed'] }, '$$payment.amount', 0] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          outstandingAmount: { $subtract: ['$amount', '$totalPaid'] }
        }
      },
      {
        $match: {
          outstandingAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$outstandingAmount' },
          count: { $sum: 1 },
          averageOutstanding: { $avg: '$outstandingAmount' }
        }
      }
    ]);

    // Payment method analysis
    const paymentMethodAnalysis = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Fee category analysis
    const feeCategoryAnalysis = await Fee.aggregate([
      {
        $lookup: {
          from: 'feecategories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Class-wise financial analysis
    const classFinancialAnalysis = await Fee.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'student.classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$student.classId', 0] },
          className: { $first: '$class.name' },
          totalFees: { $sum: '$amount' },
          studentCount: { $addToSet: '$studentId' }
        }
      },
      {
        $addFields: {
          studentCount: { $size: '$studentCount' },
          averageFeePerStudent: { $divide: ['$totalFees', { $size: '$studentCount' }] }
        }
      },
      { $sort: { totalFees: -1 } }
    ]);

    // Payment status analysis
    const paymentStatusAnalysis = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    const revenue = revenueAnalytics[0] || {
      totalRevenue: 0,
      averagePayment: 0,
      totalPayments: 0,
      highestPayment: 0,
      lowestPayment: 0
    };

    const outstanding = outstandingFees[0] || {
      totalOutstanding: 0,
      count: 0,
      averageOutstanding: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        revenue: {
          totalRevenue: revenue.totalRevenue,
          averagePayment: Math.round(revenue.averagePayment * 100) / 100,
          totalPayments: revenue.totalPayments,
          highestPayment: revenue.highestPayment,
          lowestPayment: revenue.lowestPayment
        },
        outstanding: {
          totalOutstanding: outstanding.totalOutstanding,
          count: outstanding.count,
          averageOutstanding: Math.round(outstanding.averageOutstanding * 100) / 100
        },
        revenueByMonth: revenueByMonth.map(item => ({
          period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          revenue: item.revenue,
          paymentCount: item.paymentCount,
          averagePayment: Math.round(item.averagePayment * 100) / 100
        })),
        paymentMethods: paymentMethodAnalysis.map(item => ({
          method: item._id || 'Unknown',
          totalAmount: item.totalAmount,
          count: item.count,
          averageAmount: Math.round(item.averageAmount * 100) / 100,
          percentage: calculatePercentage(item.totalAmount, revenue.totalRevenue)
        })),
        feeCategories: feeCategoryAnalysis.map(item => ({
          category: item.categoryName || 'Uncategorized',
          totalAmount: item.totalAmount,
          count: item.count,
          averageAmount: Math.round(item.averageAmount * 100) / 100,
          percentage: calculatePercentage(item.totalAmount, revenue.totalRevenue)
        })),
        classAnalysis: classFinancialAnalysis.map(item => ({
          className: item.className || 'Unknown Class',
          totalFees: item.totalFees,
          studentCount: item.studentCount,
          averageFeePerStudent: Math.round(item.averageFeePerStudent * 100) / 100
        })),
        paymentStatus: paymentStatusAnalysis.map(item => ({
          status: item._id,
          count: item.count,
          totalAmount: item.totalAmount,
          averageAmount: Math.round(item.averageAmount * 100) / 100,
          percentage: calculatePercentage(item.count, revenue.totalPayments)
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// ATTENDANCE ANALYTICS
// ============================================================================

// GET /admin-analytics/attendance/overview - Comprehensive attendance analytics
exports.getAttendanceOverview = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { classId } = req.query;

    // Build match filter
    const matchFilter = {
      date: { $gte: startDate, $lte: endDate }
    };
    if (classId) matchFilter.classId = classId;

    // Overall attendance statistics
    const overallStats = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      }
    ]);

    // Attendance by class
    const attendanceByClass = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $group: {
          _id: '$classId',
          className: { $first: '$class.name' },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $sort: { attendanceRate: -1 } }
    ]);

    // Attendance trends over time
    const attendanceTrends = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Students with poor attendance
    const poorAttendanceStudents = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $group: {
          _id: '$studentId',
          studentName: { $first: '$user.name' },
          rollNumber: { $first: '$student.rollNumber' },
          className: { $first: '$class.name' },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $match: { attendanceRate: { $lt: 75 } } },
      { $sort: { attendanceRate: 1 } },
      { $limit: 20 }
    ]);

    // Daily attendance patterns
    const dailyPatterns = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dayOfWeek: '$date' },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          dayName: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Sunday' },
                { case: { $eq: ['$_id', 2] }, then: 'Monday' },
                { case: { $eq: ['$_id', 3] }, then: 'Tuesday' },
                { case: { $eq: ['$_id', 4] }, then: 'Wednesday' },
                { case: { $eq: ['$_id', 5] }, then: 'Thursday' },
                { case: { $eq: ['$_id', 6] }, then: 'Friday' },
                { case: { $eq: ['$_id', 7] }, then: 'Saturday' }
              ],
              default: 'Unknown'
            }
          },
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const overall = overallStats[0] || {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0
    };

    const overallAttendanceRate = calculatePercentage(overall.presentCount, overall.totalRecords);

    return res.status(200).json({
      success: true,
      data: {
        overall: {
          totalRecords: overall.totalRecords,
          attendanceRate: overallAttendanceRate,
          presentCount: overall.presentCount,
          absentCount: overall.absentCount,
          lateCount: overall.lateCount,
          excusedCount: overall.excusedCount,
          distribution: {
            present: calculatePercentage(overall.presentCount, overall.totalRecords),
            absent: calculatePercentage(overall.absentCount, overall.totalRecords),
            late: calculatePercentage(overall.lateCount, overall.totalRecords),
            excused: calculatePercentage(overall.excusedCount, overall.totalRecords)
          }
        },
        byClass: attendanceByClass.map(item => ({
          ...item,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100,
          distribution: {
            present: calculatePercentage(item.presentCount, item.totalRecords),
            absent: calculatePercentage(item.absentCount, item.totalRecords),
            late: calculatePercentage(item.lateCount, item.totalRecords),
            excused: calculatePercentage(item.excusedCount, item.totalRecords)
          }
        })),
        trends: attendanceTrends.map(item => ({
          period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100,
          totalRecords: item.totalRecords,
          presentCount: item.presentCount,
          absentCount: item.absentCount,
          lateCount: item.lateCount
        })),
        poorAttendanceStudents: poorAttendanceStudents.map(item => ({
          ...item,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100
        })),
        dailyPatterns: dailyPatterns.map(item => ({
          dayName: item.dayName,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100,
          totalRecords: item.totalRecords,
          presentCount: item.presentCount,
          absentCount: item.absentCount,
          lateCount: item.lateCount
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// TEACHER PERFORMANCE ANALYTICS
// ============================================================================

// GET /admin-analytics/teachers/performance - Comprehensive teacher performance analytics
exports.getTeacherPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    // Teacher workload analysis
    const teacherWorkload = await Teacher.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: 'classes',
          foreignField: '_id',
          as: 'classes'
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjects',
          foreignField: '_id',
          as: 'subjects'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $addFields: {
          teacherName: { $first: '$user.name' },
          classCount: { $size: '$classes' },
          subjectCount: { $size: '$subjects' },
          totalStudents: {
            $sum: {
              $map: {
                input: '$classes',
                as: 'class',
                in: { $size: { $ifNull: ['$$class.studentIds', []] } }
              }
            }
          }
        }
      },
      { $sort: { totalStudents: -1 } }
    ]);

    // Teacher review analysis (simplified - handle empty collection)
    let teacherReviews = [];
    try {
      teacherReviews = await TeacherReview.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: 'teachers',
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacher'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'teacher.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $group: {
            _id: '$teacherId',
            teacherName: { $first: '$user.name' },
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            excellentReviews: { $sum: { $cond: [{ $gte: ['$rating', 4.5] }, 1, 0] } },
            goodReviews: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 3.5] }, { $lt: ['$rating', 4.5] }] }, 1, 0] } },
            averageReviews: { $sum: { $cond: [{ $and: [{ $gte: ['$rating', 2.5] }, { $lt: ['$rating', 3.5] }] }, 1, 0] } },
            poorReviews: { $sum: { $cond: [{ $lt: ['$rating', 2.5] }, 1, 0] } }
          }
        },
        { $sort: { averageRating: -1 } }
      ]);
    } catch (error) {
      console.log('TeacherReview aggregation failed, using empty array:', error.message);
      teacherReviews = [];
    }

    // Teacher grade analysis
    const teacherGrades = await TeacherGrade.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: '$teacherId',
          teacherName: { $first: '$user.name' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          excellentGrades: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } },
          goodGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 70] }, { $lt: ['$percentage', 90] }] }, 1, 0] } },
          averageGrades: { $sum: { $cond: [{ $and: [{ $gte: ['$percentage', 50] }, { $lt: ['$percentage', 70] }] }, 1, 0] } },
          poorGrades: { $sum: { $cond: [{ $lt: ['$percentage', 50] }, 1, 0] } }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Teacher attendance analysis
    const teacherAttendance = await TeacherAttendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: '$teacherId',
          teacherName: { $first: '$user.name' },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $sort: { attendanceRate: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        workload: teacherWorkload.map(item => ({
          ...item,
          teacherName: item.teacherName || 'Unknown Teacher'
        })),
        reviews: teacherReviews.map(item => ({
          ...item,
          teacherName: item.teacherName || 'Unknown Teacher',
          averageRating: Math.round(item.averageRating * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentReviews, item.totalReviews),
            good: calculatePercentage(item.goodReviews, item.totalReviews),
            average: calculatePercentage(item.averageReviews, item.totalReviews),
            poor: calculatePercentage(item.poorReviews, item.totalReviews)
          }
        })),
        grades: teacherGrades.map(item => ({
          ...item,
          teacherName: item.teacherName || 'Unknown Teacher',
          averageScore: Math.round(item.averageScore * 100) / 100,
          distribution: {
            excellent: calculatePercentage(item.excellentGrades, item.totalGrades),
            good: calculatePercentage(item.goodGrades, item.totalGrades),
            average: calculatePercentage(item.averageGrades, item.totalGrades),
            poor: calculatePercentage(item.poorGrades, item.totalGrades)
          }
        })),
        attendance: teacherAttendance.map(item => ({
          ...item,
          teacherName: item.teacherName || 'Unknown Teacher',
          attendanceRate: Math.round(item.attendanceRate * 100) / 100
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// STUDENT LIFECYCLE ANALYTICS
// ============================================================================

// GET /admin-analytics/students/lifecycle - Student lifecycle and progression analytics
exports.getStudentLifecycle = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    // Student enrollment trends
    const enrollmentTrends = await Student.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          enrollmentCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Class-wise student distribution
    const classDistribution = await Student.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $group: {
          _id: '$classId',
          className: { $first: '$class.name' },
          studentCount: { $sum: 1 },
          newEnrollments: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startDate] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { studentCount: -1 } }
    ]);

    // Student progression analysis
    const studentProgression = await Student.aggregate([
      {
        $lookup: {
          from: 'grades',
          localField: '_id',
          foreignField: 'studentId',
          as: 'grades'
        }
      },
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'studentId',
          as: 'attendances'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $addFields: {
          studentName: { $first: '$user.name' },
          totalGrades: { $size: '$grades' },
          averageScore: { $avg: '$grades.percentage' },
          totalAttendance: { $size: '$attendances' },
          presentCount: {
            $size: {
              $filter: {
                input: '$attendances',
                cond: { $eq: ['$$this.status', 'present'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $cond: [
              { $gt: ['$totalAttendance', 0] },
              { $multiply: [{ $divide: ['$presentCount', '$totalAttendance'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $match: {
          totalGrades: { $gt: 0 }
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 50 }
    ]);

    // At-risk students (low performance + poor attendance)
    const atRiskStudents = await Student.aggregate([
      {
        $lookup: {
          from: 'grades',
          localField: '_id',
          foreignField: 'studentId',
          as: 'grades'
        }
      },
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'studentId',
          as: 'attendances'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $addFields: {
          studentName: { $first: '$user.name' },
          className: { $first: '$class.name' },
          totalGrades: { $size: '$grades' },
          averageScore: { $avg: '$grades.percentage' },
          totalAttendance: { $size: '$attendances' },
          presentCount: {
            $size: {
              $filter: {
                input: '$attendances',
                cond: { $eq: ['$$this.status', 'present'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $cond: [
              { $gt: ['$totalAttendance', 0] },
              { $multiply: [{ $divide: ['$presentCount', '$totalAttendance'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            { averageScore: { $lt: 50 } },
            { attendanceRate: { $lt: 75 } }
          ],
          totalGrades: { $gt: 0 }
        }
      },
      { $sort: { averageScore: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        enrollmentTrends: enrollmentTrends.map(item => ({
          period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          enrollmentCount: item.enrollmentCount
        })),
        classDistribution: classDistribution.map(item => ({
          ...item,
          className: item.className || 'Unknown Class'
        })),
        topPerformers: studentProgression.slice(0, 20).map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100
        })),
        atRiskStudents: atRiskStudents.map(item => ({
          ...item,
          averageScore: Math.round(item.averageScore * 100) / 100,
          attendanceRate: Math.round(item.attendanceRate * 100) / 100
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

// GET /admin-analytics/predictive/forecasts - Predictive analytics and forecasting
exports.getPredictiveForecasts = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    // Revenue forecasting based on historical data
    const revenueForecast = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate growth trends
    const revenueGrowth = [];
    for (let i = 1; i < revenueForecast.length; i++) {
      const current = revenueForecast[i];
      const previous = revenueForecast[i - 1];
      const growthRate = calculateGrowthRate(current.revenue, previous.revenue);
      revenueGrowth.push({
        period: `${current._id.year}-${current._id.month.toString().padStart(2, '0')}`,
        revenue: current.revenue,
        growthRate
      });
    }

    // Student performance trends
    const performanceTrends = await Grade.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          averageScore: { $avg: '$percentage' },
          totalGrades: { $sum: 1 },
          excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Attendance trend analysis
    const attendanceTrends = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [
              { $divide: ['$presentCount', '$totalRecords'] },
              100
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Simple forecasting (linear trend)
    const forecastNextMonths = (data, months = 3) => {
      if (data.length < 2) return [];
      
      const recent = data.slice(-6); // Use last 6 months for trend
      const avgGrowth = recent.reduce((sum, item, index) => {
        if (index === 0) return 0;
        return sum + (item.revenue - recent[index - 1].revenue) / recent[index - 1].revenue;
      }, 0) / (recent.length - 1);

      const lastValue = recent[recent.length - 1];
      const forecasts = [];
      
      for (let i = 1; i <= months; i++) {
        const forecastValue = lastValue.revenue * Math.pow(1 + avgGrowth, i);
        forecasts.push({
          period: `Forecast-${i}`,
          revenue: Math.round(forecastValue),
          isForecast: true
        });
      }
      
      return forecasts;
    };

    const revenueForecasts = forecastNextMonths(revenueForecast);

    return res.status(200).json({
      success: true,
      data: {
        revenue: {
          historical: revenueForecast.map(item => ({
            period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
            revenue: item.revenue,
            paymentCount: item.paymentCount
          })),
          growth: revenueGrowth,
          forecasts: revenueForecasts
        },
        performance: {
          trends: performanceTrends.map(item => ({
            period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
            averageScore: Math.round(item.averageScore * 100) / 100,
            totalGrades: item.totalGrades,
            excellentRate: calculatePercentage(item.excellentCount, item.totalGrades)
          }))
        },
        attendance: {
          trends: attendanceTrends.map(item => ({
            period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
            attendanceRate: Math.round(item.attendanceRate * 100) / 100,
            totalRecords: item.totalRecords,
            presentCount: item.presentCount
          }))
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

// ============================================================================
// REAL-TIME DASHBOARD METRICS
// ============================================================================

// GET /admin-analytics/realtime/metrics - Real-time dashboard metrics
exports.getRealtimeMetrics = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Real-time metrics
    const [
      activeUsers,
      todayEnrollments,
      todayPayments,
      todayAttendance,
      activeExams,
      pendingAssignments,
      systemAlerts,
      recentActivities
    ] = await Promise.all([
      // Active users (logged in within last 24 hours)
      User.countDocuments({
        lastLogin: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),
      
      // Today's enrollments
      Student.countDocuments({
        createdAt: { $gte: today }
      }),
      
      // Today's payments
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      
      // Today's attendance
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
          }
        }
      ]),
      
      // Active exams
      Exam.countDocuments({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now }
      }),
      
      // Pending assignments
      Assignment.countDocuments({
        dueDate: { $gte: now }
      }),
      
      // System alerts (unread notifications)
      Notification.countDocuments({
        isRead: false,
        type: { $in: ['alert', 'warning', 'error'] }
      }),
      
      // Recent activities (last 10)
      Notification.find({
        createdAt: { $gte: thisWeek }
      })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('message type createdAt userId')
    ]);

    const todayPaymentsData = todayPayments[0] || { count: 0, totalAmount: 0 };
    const todayAttendanceData = todayAttendance[0] || { totalRecords: 0, presentCount: 0 };
    const todayAttendanceRate = calculatePercentage(todayAttendanceData.presentCount, todayAttendanceData.totalRecords);

    // Weekly trends
    const weeklyTrends = await Promise.all([
      // Weekly enrollments
      Student.aggregate([
        {
          $match: {
            createdAt: { $gte: thisWeek }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Weekly payments
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: thisWeek },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        realtime: {
          activeUsers,
          todayEnrollments,
          todayPayments: {
            count: todayPaymentsData.count,
            totalAmount: todayPaymentsData.totalAmount
          },
          todayAttendance: {
            totalRecords: todayAttendanceData.totalRecords,
            presentCount: todayAttendanceData.presentCount,
            attendanceRate: todayAttendanceRate
          },
          activeExams,
          pendingAssignments,
          systemAlerts
        },
        weeklyTrends: {
          enrollments: weeklyTrends[0].map(item => ({
            day: item._id,
            count: item.count
          })),
          payments: weeklyTrends[1].map(item => ({
            day: item._id,
            count: item.count,
            totalAmount: item.totalAmount
          }))
        },
        recentActivities: recentActivities.map(activity => ({
          message: activity.message,
          type: activity.type,
          createdAt: activity.createdAt,
          user: activity.userId?.name || 'System'
        }))
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// EXPORT AND REPORTING
// ============================================================================

// GET /admin-analytics/export/comprehensive - Export comprehensive analytics report
exports.exportComprehensiveReport = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { format = 'json' } = req.query;

    // Gather all analytics data
    const [
      dashboardData,
      academicData,
      financialData,
      attendanceData,
      teacherData,
      studentData,
      predictiveData
    ] = await Promise.all([
      // Dashboard overview
      Promise.resolve().then(async () => {
        const [totalStudents, totalTeachers, totalClasses, totalSubjects] = await Promise.all([
          Student.countDocuments(),
          Teacher.countDocuments(),
          Class.countDocuments(),
          Subject.countDocuments()
        ]);
        
        const financialOverview = await Payment.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$amount' },
              totalPayments: { $sum: 1 }
            }
          }
        ]);

        return {
          overview: { totalStudents, totalTeachers, totalClasses, totalSubjects },
          financial: financialOverview[0] || { totalRevenue: 0, totalPayments: 0 }
        };
      }),

      // Academic performance
      Grade.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            averageScore: { $avg: '$percentage' },
            excellentCount: { $sum: { $cond: [{ $gte: ['$percentage', 90] }, 1, 0] } }
          }
        }
      ]),

      // Financial overview
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalPayments: { $sum: 1 }
          }
        }
      ]),

      // Attendance overview
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
          }
        }
      ]),

      // Teacher performance
      TeacherReview.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]),

      // Student lifecycle
      Student.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            newEnrollments: { $sum: 1 }
          }
        }
      ]),

      // Predictive data
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const comprehensiveReport = {
      reportInfo: {
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        format
      },
      dashboard: dashboardData,
      academic: {
        totalGrades: academicData[0]?.totalGrades || 0,
        averageScore: Math.round((academicData[0]?.averageScore || 0) * 100) / 100,
        excellentRate: calculatePercentage(academicData[0]?.excellentCount || 0, academicData[0]?.totalGrades || 1)
      },
      financial: {
        totalRevenue: financialData[0]?.totalRevenue || 0,
        totalPayments: financialData[0]?.totalPayments || 0
      },
      attendance: {
        totalRecords: attendanceData[0]?.totalRecords || 0,
        attendanceRate: calculatePercentage(attendanceData[0]?.presentCount || 0, attendanceData[0]?.totalRecords || 1)
      },
      teachers: {
        totalReviews: teacherData[0]?.totalReviews || 0,
        averageRating: Math.round((teacherData[0]?.averageRating || 0) * 100) / 100
      },
      students: {
        newEnrollments: studentData[0]?.newEnrollments || 0
      },
      predictive: {
        revenueTrend: predictiveData.map(item => ({
          period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          revenue: item.revenue
        }))
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = [
        ['Metric', 'Value'],
        ['Total Students', comprehensiveReport.dashboard.overview.totalStudents],
        ['Total Teachers', comprehensiveReport.dashboard.overview.totalTeachers],
        ['Total Classes', comprehensiveReport.dashboard.overview.totalClasses],
        ['Total Subjects', comprehensiveReport.dashboard.overview.totalSubjects],
        ['Total Revenue', comprehensiveReport.financial.totalRevenue],
        ['Total Payments', comprehensiveReport.financial.totalPayments],
        ['Total Grades', comprehensiveReport.academic.totalGrades],
        ['Average Score', comprehensiveReport.academic.averageScore],
        ['Attendance Rate', comprehensiveReport.attendance.attendanceRate],
        ['Teacher Rating', comprehensiveReport.teachers.averageRating],
        ['New Enrollments', comprehensiveReport.students.newEnrollments]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="comprehensive-analytics-report.csv"');
      return res.send(csvContent);
    }

    return res.status(200).json({
      success: true,
      data: comprehensiveReport
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================================================
// CUSTOM ANALYTICS QUERY
// ============================================================================

// POST /admin-analytics/custom/query - Custom analytics query builder
exports.executeCustomQuery = async (req, res) => {
  try {
    const { query, parameters = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // Validate query for security (basic validation)
    const allowedCollections = [
      'students', 'teachers', 'classes', 'subjects', 'grades', 'teachergrades',
      'attendances', 'payments', 'fees', 'exams', 'assignments', 'teacherreviews',
      'notifications', 'users'
    ];

    const queryLower = query.toLowerCase();
    const hasValidCollection = allowedCollections.some(collection => 
      queryLower.includes(collection)
    );

    if (!hasValidCollection) {
      return res.status(400).json({
        success: false,
        message: 'Query must reference allowed collections only'
      });
    }

    // Execute the query (this is a simplified implementation)
    // In production, you'd want more sophisticated query parsing and validation
    let result;
    
    try {
      // This is a placeholder - in reality, you'd parse the query and execute it safely
      result = { message: 'Custom query execution not fully implemented for security reasons' };
    } catch (queryError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query syntax: ' + queryError.message
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        query,
        parameters,
        result,
        executedAt: new Date()
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};