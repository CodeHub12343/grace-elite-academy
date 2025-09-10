const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const Subject = require('../models/subject.model');
const ClassModel = require('../models/class.model');

exports.createTeacher = async (req, res) => {
  try {
    const { userId, subjects = [], classes = [], phone, qualification, experience } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Optional existence checks
    if (subjects.length) {
      const count = await Subject.countDocuments({ _id: { $in: subjects } });
      if (count !== subjects.length) return res.status(400).json({ success: false, message: 'One or more subjects not found' });
    }
    if (classes.length) {
      const count = await ClassModel.countDocuments({ _id: { $in: classes } });
      if (count !== classes.length) return res.status(400).json({ success: false, message: 'One or more classes not found' });
    }

    const teacher = await Teacher.create({ userId, subjects, classes, phone, qualification, experience });
    const populated = await teacher.populate(['userId', 'subjects', 'classes']);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { parsePagination, parseSort } = require('../utils/query');

exports.getTeachers = async (req, res) => {
  try {
    const { search, subjectId, classId, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort);

    const filter = {};
    if (subjectId) filter.subjects = subjectId;
    if (classId) filter.classes = classId;

    let userFilter = {};
    if (search) {
      userFilter = { $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ] };
    }

    let query = Teacher.find(filter)
      .populate({ path: 'userId', match: userFilter })
      .populate(['subjects', 'classes'])
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      query,
      Teacher.countDocuments(filter),
    ]);

    const data = items.filter(t => t.userId); // remove filtered-out by populate match
    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
    return res.status(200).json({ success: true, count: data.length, pagination, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate(['userId', 'subjects', 'classes']);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    return res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const update = req.body;
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, { new: true }).populate(['userId', 'subjects', 'classes']);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    return res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    return res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get current teacher's profile with assigned classes and subjects
exports.getCurrentTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.sub }).populate(['userId', 'subjects', 'classes']);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }
    return res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


