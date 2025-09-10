const Subject = require('../models/subject.model');
const ClassModel = require('../models/class.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const mongoose = require('mongoose');

exports.createSubject = async (req, res) => {
  try {
    const { name, code, classId, teacherIds = [] } = req.body;
    if (!name || !code || !classId) return res.status(400).json({ success: false, message: 'name, code, classId are required' });

    const cls = await ClassModel.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    if (teacherIds.length) {
      const count = await Teacher.countDocuments({ _id: { $in: teacherIds } });
      if (count !== teacherIds.length) return res.status(400).json({ success: false, message: 'One or more teachers not found' });
    }

    const subject = await Subject.create({ name, code, classId, teacherIds });
    const populated = await subject.populate(['classId', 'teacherIds']);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { parsePagination, parseSort } = require('../utils/query');

exports.getSubjects = async (req, res) => {
  try {
    const { search, classId, sort, scope } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort);

    const filter = {};
    if (classId) filter.classId = classId;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];

    // Scope filters
    const userIdRaw = req.user && (req.user.id || req.user._id || req.user.sub);
    const userId = mongoose.Types.ObjectId.isValid(userIdRaw)
      ? new mongoose.Types.ObjectId(userIdRaw)
      : userIdRaw;

    if (scope === 'enrolled' && req.user && req.user.role === 'student') {
      // Student's enrolled class subjects
      const me = await Student.findOne({ userId }).select('classId');
      if (me && me.classId) {
        filter.classId = me.classId;
      } else {
        filter._id = { $in: [] };
      }
    }

    if (scope === 'mine' && req.user && req.user.role === 'teacher') {
      // Teacher's own subjects
      const me = await require('../models/teacher.model').findOne({ userId }).select('subjects');
      if (me && Array.isArray(me.subjects) && me.subjects.length) {
        filter._id = { $in: me.subjects };
      } else {
        filter._id = { $in: [] };
      }
    }

    const [items, total] = await Promise.all([
      Subject.find(filter)
        .populate(['classId', 'teacherIds'])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Subject.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(['classId', 'teacherIds']);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    return res.status(200).json({ success: true, data: subject });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const update = req.body;
    const subject = await Subject.findByIdAndUpdate(req.params.id, update, { new: true }).populate(['classId', 'teacherIds']);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    return res.status(200).json({ success: true, data: subject });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


