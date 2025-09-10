const FeeCategory = require('../models/feeCategory.model');
const Invoice = require('../models/invoice.model');
const Student = require('../models/student.model');
const { parsePagination, parseSort } = require('../utils/query');

exports.createCategory = async (req, res) => {
  try {
    const doc = await FeeCategory.create(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const items = await FeeCategory.find();
    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createInvoices = async (req, res) => {
  try {
    const { studentId, classId, feeCategoryId, amount, dueDate, lateFee } = req.body;
    if (!feeCategoryId || (!studentId && !classId)) return res.status(400).json({ success: false, message: 'Provide studentId or classId and feeCategoryId' });

    const invoices = [];
    if (studentId) {
      invoices.push({ studentId, classId: req.body.classId, feeCategoryId, amount, status: 'pending', dueDate, lateFee });
    } else if (classId) {
      const students = await Student.find({ classId });
      for (const s of students) {
        invoices.push({ studentId: s._id, classId, feeCategoryId, amount, status: 'pending', dueDate, lateFee });
      }
    }
    const created = await Invoice.insertMany(invoices);
    return res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.listInvoices = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.studentId) filter.studentId = req.query.studentId;
    const [items, total] = await Promise.all([
      Invoice.find(filter).populate(['studentId', 'feeCategoryId']).sort(sortObj).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const doc = await Invoice.findById(req.params.id).populate(['studentId', 'feeCategoryId']);
    if (!doc) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


