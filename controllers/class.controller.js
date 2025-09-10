const ClassModel = require('../models/class.model');
const Teacher = require('../models/teacher.model');
const Subject = require('../models/subject.model');
const Student = require('../models/student.model');
const mongoose = require('mongoose');

exports.createClass = async (req, res) => {
  try {
    const { name, section, teacherIds = [], subjectIds = [], studentIds = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    if (teacherIds.length) {
      const count = await Teacher.countDocuments({ _id: { $in: teacherIds } });
      if (count !== teacherIds.length) return res.status(400).json({ success: false, message: 'One or more teachers not found' });
    }
    if (subjectIds.length) {
      const count = await Subject.countDocuments({ _id: { $in: subjectIds } });
      if (count !== subjectIds.length) return res.status(400).json({ success: false, message: 'One or more subjects not found' });
    }
    if (studentIds.length) {
      const count = await Student.countDocuments({ _id: { $in: studentIds } });
      if (count !== studentIds.length) return res.status(400).json({ success: false, message: 'One or more students not found' });
    }

    const cls = await ClassModel.create({ name, section, teacherIds, subjectIds, studentIds });
    const populated = await cls.populate(['teacherIds', 'subjectIds', 'studentIds']);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { parsePagination, parseSort } = require('../utils/query');

exports.getClasses = async (req, res) => {
  try {
    const { section, sort, scope } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort);

    const filter = {};
    if (section) filter.section = section;

    // Handle enrolled scope for students/teachers
    if (scope === 'enrolled' || scope === 'mine') {
      const userIdRaw = req.user && (req.user.id || req.user._id || req.user.sub);
      const userId = mongoose.Types.ObjectId.isValid(userIdRaw)
        ? new mongoose.Types.ObjectId(userIdRaw)
        : userIdRaw;
      if (req.user && req.user.role === 'student') {
        const me = await Student.findOne({ userId }).select('classId');
        if (me && me.classId) {
          filter._id = me.classId;
        } else {
          filter._id = { $in: [] }; // no results if mapping missing
        }
      } else if (req.user && req.user.role === 'teacher') {
        // Derive classes via subjects the teacher teaches → Subject.classId (distinct)
        const me = await Teacher.findOne({ userId }).select('subjects');
        if (me && Array.isArray(me.subjects) && me.subjects.length) {
          const subjectDocs = await Subject.find({ _id: { $in: me.subjects } }).select('classId');
          const classIds = [...new Set(subjectDocs.map(s => String(s.classId)).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
          filter._id = classIds.length ? { $in: classIds } : { $in: [] };
        } else {
          filter._id = { $in: [] };
        }
      }
    }

    const [items, total] = await Promise.all([
      ClassModel.find(filter)
        .populate(['teacherIds', 'subjectIds', 'studentIds'])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      ClassModel.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const cls = await ClassModel.findById(req.params.id).populate(['teacherIds', 'subjectIds', 'studentIds']);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.status(200).json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const update = req.body;
    const cls = await ClassModel.findByIdAndUpdate(req.params.id, update, { new: true }).populate(['teacherIds', 'subjectIds', 'studentIds']);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.status(200).json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const cls = await ClassModel.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /classes/:id/students
// - Roles: admin, teacher for any class; student only for own class
// - Supports pagination (page, limit) and optional search (q or search)
exports.getClassStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class id' });
    }

    // Student role can only access their own class students
    if (req.user && req.user.role === 'student') {
      const userIdRaw = req.user && (req.user.id || req.user._id || req.user.sub);
      const userObjectId = mongoose.Types.ObjectId.isValid(userIdRaw)
        ? new mongoose.Types.ObjectId(userIdRaw)
        : userIdRaw;
      const me = await Student.findOne({ userId: userObjectId }).select('classId');
      if (!me || String(me.classId) !== String(classId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    // Optional search against User name/email via userId
    const { page, limit, skip } = parsePagination(req.query);
    const search = (req.query.q || req.query.search || '').trim();

    const filter = { classId: new mongoose.Types.ObjectId(classId) };

    let userIdsForSearch = null;
    if (search) {
      const User = require('../models/user.model');
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id');
      userIdsForSearch = users.map(u => u._id);
      // If no user matches the search, return empty pagination response quickly
      if (!userIdsForSearch.length) {
        return res.status(200).json({
          success: true,
          count: 0,
          pagination: { page, limit, total: 0, pages: 0 },
          data: [],
        });
      }
      filter.userId = { $in: userIdsForSearch };
    }

    const [items, total] = await Promise.all([
      Student.find(filter)
        .populate('userId', 'name email role')
        .skip(skip)
        .limit(limit),
      Student.countDocuments(filter),
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


