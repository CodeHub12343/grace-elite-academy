const Fee = require('../models/fee.model');
const Transaction = require('../models/transaction.model');
const Student = require('../models/student.model');

function calculateLateFee(dueDate, balance) {
  if (!dueDate || balance <= 0) return 0;
  const now = new Date();
  if (now <= dueDate) return 0;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksLate = Math.floor((now - dueDate) / msPerWeek) + 1; // at least 1 if past due
  const ratePerWeek = 0.05; // 5%
  return Math.round(balance * ratePerWeek * weeksLate * 100) / 100;
}

exports.createFee = async (req, res) => {
  try {
    const { studentId, classId, amount, dueDate, ...rest } = req.body;

    // If a specific student is provided, create a single fee
    if (studentId) {
      const fee = await Fee.create({ studentId, amount, dueDate, ...rest });
      return res.status(201).json({ success: true, data: fee });
    }

    // If a classId is provided, fan-out fees to all students in the class
    if (classId) {
      // Special-case: fan-out to ALL students when classId equals 'ALL'
      const query = classId === 'ALL' ? {} : { classId };
      const students = await Student.find(query).select('_id');
      if (!students.length) {
        return res.status(404).json({ success: false, message: 'No students found for the specified scope' });
      }

      const docs = students.map((s) => ({ studentId: s._id, amount, dueDate, ...rest }));
      const result = await Fee.insertMany(docs, { ordered: false });
      return res.status(201).json({ success: true, count: result.length, data: result });
    }

    return res.status(400).json({ success: false, message: 'Provide studentId or classId' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getStudentFees = async (req, res) => {
  try {
    const fees = await Fee.find({ studentId: req.params.id }).sort('-createdAt');
    const enriched = fees.map((f) => {
      const dynamicLate = calculateLateFee(f.dueDate, f.balance);
      const balanceWithLate = Math.max(0, f.amount + dynamicLate - f.amountPaid);
      return {
        ...f.toObject(),
        dynamicLateFee: dynamicLate,
        currentBalance: balanceWithLate,
      };
    });
    return res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




