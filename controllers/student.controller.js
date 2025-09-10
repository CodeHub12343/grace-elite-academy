const Student = require('../models/student.model');
const User = require('../models/user.model');
const ClassModel = require('../models/class.model');
const Subject = require('../models/subject.model');
const Teacher = require('../models/teacher.model');
const mongoose = require('mongoose');

exports.createStudent = async (req, res) => {
  try {
    const { userId, classId, rollNumber, parentName, parentContact } = req.body;
    if (!userId || !classId) return res.status(400).json({ success: false, message: 'userId and classId are required' });
    const [user, classDoc] = await Promise.all([
      User.findById(userId),
      ClassModel.findById(classId),
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });

    const student = await Student.create({ userId, classId, rollNumber, parentName, parentContact });
    const populated = await student.populate(['userId', 'classId']);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { parsePagination, parseSort } = require('../utils/query');

exports.getStudents = async (req, res) => {
  try {
    const { search, classId, sort, scope } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort);

    const filter = {};
    if (classId) filter.classId = classId;

    // scope=mine → for students, return only their own Student record
    if (scope === 'mine' && req.user && req.user.role === 'student') {
      const userIdRaw = req.user.id || req.user._id || req.user.sub;
      const userId = mongoose.Types.ObjectId.isValid(userIdRaw) ? new mongoose.Types.ObjectId(userIdRaw) : userIdRaw;
      filter.userId = userId;
    }

    // scope=mine → for teachers, return students only from classes where they teach subjects
    if (scope === 'mine' && req.user && req.user.role === 'teacher') {
      const userIdRaw = req.user.id || req.user._id || req.user.sub;
      const userId = mongoose.Types.ObjectId.isValid(userIdRaw) ? new mongoose.Types.ObjectId(userIdRaw) : userIdRaw;
      const me = await Teacher.findOne({ userId }).select('subjects');
      if (me && Array.isArray(me.subjects) && me.subjects.length) {
        const subjectDocs = await Subject.find({ _id: { $in: me.subjects } }).select('classId');
        const classIds = [...new Set(subjectDocs.map(s => String(s.classId)).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
        if (classIds.length) {
          filter.classId = { $in: classIds };
        } else {
          filter.classId = { $in: [] };
        }
      } else {
        filter.classId = { $in: [] };
      }
    }

    let userFilter = {};
    if (search) {
      userFilter = { $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ] };
    }

    const query = Student.find(filter)
      .populate({ path: 'userId', match: userFilter })
      .populate('classId')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      query,
      Student.countDocuments(filter),
    ]);
    const data = items.filter(s => s.userId);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: data.length, pagination, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(['userId', 'classId']);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.status(200).json({ success: true, data: student });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyStudent = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const userIdRaw = req.user.id || req.user._id || req.user.sub;
    const userId = mongoose.Types.ObjectId.isValid(userIdRaw) ? new mongoose.Types.ObjectId(userIdRaw) : userIdRaw;
    const me = await Student.findOne({ userId }).populate(['userId', 'classId']);
    if (!me) return res.status(404).json({ success: false, message: 'Student record not found' });
    return res.status(200).json({ success: true, data: me });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const update = req.body;
    const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true }).populate(['userId', 'classId']);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.status(200).json({ success: true, data: student });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


