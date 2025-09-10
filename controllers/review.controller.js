const TeacherReview = require('../models/teacherReview.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const { parsePagination, parseSort } = require('../utils/query');
const mongoose = require('mongoose');

exports.createReview = async (req, res) => {
  try {
    const { teacherId, rating, comment } = req.body;
    if (!teacherId || !rating) return res.status(400).json({ success: false, message: 'teacherId and rating required' });

    // Students should review teachers from their classes. Simplified: ensure any class overlap exists.
    if (req.user?.role === 'student') {
      const student = await Student.findOne({ userId: req.user.sub });
      const teacher = await Teacher.findById(teacherId);
      if (!student || !teacher) return res.status(400).json({ success: false, message: 'Invalid teacher or student' });
      const studentClassId = String(student.classId);
      const teacherClassIds = (teacher.classes || []).map((c) => String(c));
      if (!teacherClassIds.includes(studentClassId)) {
        return res.status(403).json({ success: false, message: 'You cannot review this teacher' });
      }
    }

    const doc = await TeacherReview.create({ teacherId, reviewedBy: req.body.reviewedBy || req.user.sub, rating, comment });
    const populated = await doc.populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }]);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTeacherReviews = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = { teacherId: req.params.teacherId };
    const [items, total, avg] = await Promise.all([
      TeacherReview.find(filter)
        .populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherReview.countDocuments(filter),
      TeacherReview.aggregate([
        { $match: { teacherId: new (require('mongoose').Types.ObjectId)(req.params.teacherId) } },
        { $group: { _id: '$teacherId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);
    const avgRating = avg[0]?.avgRating || 0;
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, avgRating, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    // For teachers: reviews about them
    if (req.user?.role !== 'teacher') return res.status(403).json({ success: false, message: 'Forbidden' });
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) return res.status(400).json({ success: false, message: 'Teacher profile not found' });
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const [items, total] = await Promise.all([
      TeacherReview.find({ teacherId: teacher._id })
        .populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherReview.countDocuments({ teacherId: teacher._id }),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReviewsAnalytics = async (_req, res) => {
  try {
    const agg = await TeacherReview.aggregate([
      { $group: { _id: '$teacherId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      { $sort: { avgRating: -1, count: -1 } },
    ]);
    return res.status(200).json({ success: true, count: agg.length, data: agg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const doc = await TeacherReview.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Review not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


// GET /reviews/teacher-analytics (teacher scope)
exports.getTeacherAnalytics = async (req, res) => {
  try {
    if (req.user?.role !== 'teacher') return res.status(403).json({ success: false, message: 'Forbidden' });
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) return res.status(400).json({ success: false, message: 'Teacher profile not found' });

    const [agg, latest] = await Promise.all([
      TeacherReview.aggregate([
        { $match: { teacherId: teacher._id } },
        {
          $group: {
            _id: '$teacherId',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
            lastReviewAt: { $max: '$createdAt' },
            unresolved: { $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] } },
          },
        },
      ]),
      TeacherReview.find({ teacherId: teacher._id }).sort('-createdAt').limit(5)
        .populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }]),
    ]);
    const stats = agg[0] || { avgRating: 0, count: 0, lastReviewAt: null, unresolved: 0 };
    return res.status(200).json({ success: true, data: { ...stats, latest } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /reviews/teacher (list for authenticated teacher, with filters)
exports.listMyTeacherReviews = async (req, res) => {
  try {
    if (req.user?.role !== 'teacher') return res.status(403).json({ success: false, message: 'Forbidden' });
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) return res.status(400).json({ success: false, message: 'Teacher profile not found' });

    const { minRating, maxRating, resolved, q } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');

    const filter = { teacherId: teacher._id };
    if (minRating) filter.rating = { ...(filter.rating || {}), $gte: Number(minRating) };
    if (maxRating) filter.rating = { ...(filter.rating || {}), $lte: Number(maxRating) };
    if (resolved === 'true') filter.resolved = true;
    if (resolved === 'false') filter.resolved = false;
    if (q) filter.comment = { $regex: new RegExp(q, 'i') };

    const [items, total] = await Promise.all([
      TeacherReview.find(filter)
        .populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherReview.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /reviews/:id/reply (teacher adds reply)
exports.replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body || {};
    if (!reply) return res.status(400).json({ success: false, message: 'reply is required' });

    const doc = await TeacherReview.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Review not found' });

    // Only the teacher being reviewed (or admin) can reply
    if (req.user?.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.sub });
      if (!teacher || String(teacher._id) !== String(doc.teacherId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    doc.reply = reply;
    doc.replyAt = new Date();
    await doc.save();
    const populated = await doc.populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }]);
    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /reviews/:id/resolve (teacher/admin)
exports.resolveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await TeacherReview.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Review not found' });

    if (req.user?.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.sub });
      if (!teacher || String(teacher._id) !== String(doc.teacherId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    if (!doc.resolved) {
      doc.resolved = true;
      doc.resolvedAt = new Date();
      await doc.save();
    }
    const populated = await doc.populate([{ path: 'teacherId', populate: { path: 'userId' } }, { path: 'reviewedBy', populate: { path: 'userId' } }]);
    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


