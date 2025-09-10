const crypto = require('crypto');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const Transaction = require('../models/transaction.model');
const Student = require('../models/student.model');
const Fee = require('../models/fee.model');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
const User = require('../models/user.model');
const { parsePagination, parseSort } = require('../utils/query');

function generateReference(prefix = 'INV') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

exports.initiatePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId).populate('studentId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const reference = generateReference('PAY');
    const amountKobo = Math.round(invoice.amount * 100);
    // Try to use student's user email; fallback to requesting user's email
    let email = 'student@example.com';
    if (invoice.studentId?.userId?.email) email = invoice.studentId.userId.email;
    else if (req.user?.sub) {
      const u = await User.findById(req.user.sub).select('email');
      if (u?.email) email = u.email;
    }

    const init = await initializeTransaction({ email, amount: amountKobo, reference, callback_url: req.body?.callback_url });

    await Payment.create({ studentId: invoice.studentId, invoiceId: invoice._id, amount: invoice.amount, status: 'pending', transactionReference: reference, gatewayResponse: init.data });
    await Invoice.findByIdAndUpdate(invoice._id, { transactionReference: reference });

    return res.status(200).json({ success: true, data: { authorization_url: init.data.authorization_url, reference } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const verify = await verifyTransaction(reference);
    const payment = await Payment.findOne({ transactionReference: reference });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const status = verify.data.status === 'success' ? 'success' : 'failed';
    await Payment.updateOne({ _id: payment._id }, { $set: { status, gatewayResponse: verify.data } });
    if (status === 'success') {
      await Invoice.updateOne({ _id: payment.invoiceId }, { $set: { status: 'paid', paymentDate: new Date() } });
    }
    return res.status(200).json({ success: true, data: { status } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Expose minimal config for frontend use (e.g., to render Paystack inline widget)
exports.getPaystackConfig = async (_req, res) => {
  try {
    const publicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PK || '';
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || '';
    return res.status(200).json({ success: true, data: { publicKey, callbackUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== signature) return res.status(401).json({ success: false, message: 'Invalid signature' });

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const payment = await Payment.findOneAndUpdate({ transactionReference: reference }, { $set: { status: 'success', gatewayResponse: event.data } });
      if (payment) await Invoice.updateOne({ _id: payment.invoiceId }, { $set: { status: 'paid', paymentDate: new Date() } });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.historyStudent = async (req, res) => {
  try {
    const payments = await Payment.find({ studentId: req.user.sub }).populate('invoiceId');
    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.historyAdmin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const payments = await Payment.find(filter).populate(['invoiceId', 'studentId']);
    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /payments/analytics - Comprehensive payment analytics for admin
exports.paymentAnalytics = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      classId, 
      studentId, 
      groupBy = 'day',
      limit = 100 
    } = req.query;

    // Build base filter
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    // If classId is provided, get students in that class
    if (classId) {
      const students = await Student.find({ classId }).select('_id');
      const studentIds = students.map(s => s._id);
      filter.studentId = { $in: studentIds };
    }

    // Run parallel aggregations
    const [
      summaryStats,
      statusBreakdown,
      classBreakdown,
      paymentMethodBreakdown,
      dailyTrends,
      monthlyTrends,
      topStudents,
      recentPayments,
      failedPayments
    ] = await Promise.all([
      // Summary statistics
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            successfulAmount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]),

      // Status breakdown
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Class breakdown
      Transaction.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $lookup: {
            from: 'classes',
            localField: 'student.classId',
            foreignField: '_id',
            as: 'class'
          }
        },
        { $unwind: '$class' },
        {
          $group: {
            _id: '$class.name',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // Payment method breakdown
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Daily trends
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: parseInt(limit) }
      ]),

      // Monthly trends
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),

      // Top students
      Transaction.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $lookup: {
            from: 'users',
            localField: 'student.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $group: {
            _id: {
              studentId: '$studentId',
              studentName: '$user.name',
              rollNumber: '$student.rollNumber'
            },
            totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            paymentCount: { $sum: 1 },
            successfulCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }
          }
        },
        { $sort: { totalPaid: -1 } },
        { $limit: 10 }
      ]),

      // Recent payments
      Transaction.find(filter)
        .populate({
          path: 'studentId',
          populate: { path: 'userId', select: 'name email' }
        })
        .populate('feeId', 'description amount')
        .sort({ createdAt: -1 })
        .limit(10),

      // Failed payments analysis
      Transaction.aggregate([
        { $match: { ...filter, status: 'failed' } },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $lookup: {
            from: 'users',
            localField: 'student.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $group: {
            _id: '$studentId',
            studentName: { $first: '$user.name' },
            rollNumber: { $first: '$student.rollNumber' },
            failedCount: { $sum: 1 },
            totalFailedAmount: { $sum: '$amount' },
            lastFailedDate: { $max: '$createdAt' }
          }
        },
        { $sort: { failedCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Process summary statistics
    const summary = summaryStats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      successfulPayments: 0,
      successfulAmount: 0,
      failedPayments: 0,
      pendingPayments: 0,
      averageAmount: 0
    };

    const successRate = summary.totalPayments > 0 
      ? Math.round((summary.successfulPayments / summary.totalPayments) * 100 * 100) / 100 
      : 0;

    // Calculate percentages for status breakdown
    const statusBreakdownWithPercentages = statusBreakdown.map(status => ({
      ...status,
      percentage: summary.totalPayments > 0 
        ? Math.round((status.count / summary.totalPayments) * 100 * 100) / 100 
        : 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          ...summary,
          successRate,
          averageAmount: Math.round(summary.averageAmount * 100) / 100
        },
        breakdowns: {
          byStatus: statusBreakdownWithPercentages,
          byClass: classBreakdown,
          byPaymentMethod: paymentMethodBreakdown
        },
        trends: {
          daily: dailyTrends,
          monthly: monthlyTrends
        },
        topStudents,
        recentPayments,
        failedPayments,
        filters: {
          startDate,
          endDate,
          status,
          classId,
          studentId,
          groupBy
        }
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /payments/export - Export payments data
exports.exportPayments = async (req, res) => {
  try {
    const { format = 'json', status, startDate, endDate, classId, studentId } = req.query;

    // Build filter
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    // If classId is provided, get students in that class
    if (classId) {
      const students = await Student.find({ classId }).select('_id');
      const studentIds = students.map(s => s._id);
      filter.studentId = { $in: studentIds };
    }

    const transactions = await Transaction.find(filter)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('feeId', 'description amount')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Transaction ID',
        'Student Name',
        'Student Email',
        'Roll Number',
        'Amount',
        'Status',
        'Payment Method',
        'Paystack Reference',
        'Created At',
        'Payment Date'
      ];

      const csvRows = transactions.map(tx => [
        tx._id,
        tx.studentId?.userId?.name || 'N/A',
        tx.studentId?.userId?.email || 'N/A',
        tx.studentId?.rollNumber || 'N/A',
        tx.amount,
        tx.status,
        tx.paymentMethod,
        tx.paystackReference || 'N/A',
        tx.createdAt.toISOString(),
        tx.paymentDate ? tx.paymentDate.toISOString() : 'N/A'
      ]);

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
      return res.send(csvContent);
    } else {
      // Return JSON
      return res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions,
        filters: { status, startDate, endDate, classId, studentId }
      });
    }

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


