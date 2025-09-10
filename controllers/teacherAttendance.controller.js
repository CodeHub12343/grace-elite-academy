const TeacherAttendance = require('../models/teacherAttendance.model');
const Teacher = require('../models/teacher.model');
const { parsePagination, parseSort } = require('../utils/query');

function normalizeToDayRange(dateString) {
  if (!dateString) return null;
  const start = new Date(dateString);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// POST /teacher-attendance/mark { teacherId, date, status, remarks }
exports.markTeacherAttendance = async (req, res) => {
  try {
    const { teacherId, date, status, remarks } = req.body || {};
    if (!teacherId || !status) {
      return res.status(400).json({ success: false, message: 'teacherId and status are required' });
    }

    const teacher = await Teacher.findById(teacherId).select('_id');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const markDate = date ? new Date(date) : new Date();

    const doc = await TeacherAttendance.findOneAndUpdate(
      { teacherId, date: markDate },
      {
        $set: {
          teacherId,
          date: markDate,
          status,
          remarks: remarks || '',
          markedBy: req.user.sub,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /teacher-attendance/bulk { date, records: [ { teacherId, status, remarks } ] }
exports.bulkMarkTeacherAttendance = async (req, res) => {
  try {
    const { date, records } = req.body || {};
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'records array is required' });
    }

    const markDate = date ? new Date(date) : new Date();

    const ops = records.map((r) => ({
      updateOne: {
        filter: { teacherId: r.teacherId, date: markDate },
        update: {
          $set: {
            teacherId: r.teacherId,
            date: markDate,
            status: r.status,
            remarks: r.remarks || '',
            markedBy: req.user.sub,
          },
        },
        upsert: true,
      },
    }));

    const result = await TeacherAttendance.bulkWrite(ops, { ordered: false });
    return res.status(201).json({ success: true, data: { upserted: result.upsertedCount, modified: result.modifiedCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /teacher-attendance?teacherId=&date=&startDate=&endDate=&status=
exports.listTeacherAttendance = async (req, res) => {
  try {
    const { teacherId, date, startDate, endDate, status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-date');

    const filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    if (date) {
      const range = normalizeToDayRange(date);
      filter.date = { $gte: range.start, $lte: range.end };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      TeacherAttendance.find(filter)
        .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } })
        .populate({ path: 'markedBy', select: 'name email' })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherAttendance.countDocuments(filter),
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /teacher-attendance/me - current teacher's attendance (dashboard)
exports.getMyTeacherAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can access their own attendance' });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub }).select('_id');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

    const { startDate, endDate, status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-date');

    const filter = { teacherId: teacher._id };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      TeacherAttendance.find(filter)
        .populate({ path: 'markedBy', select: 'name email' })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherAttendance.countDocuments(filter),
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    // Mini summary for dashboard
    const summaryAgg = await TeacherAttendance.aggregate([
      { $match: { teacherId: teacher._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryAgg.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});

    return res.status(200).json({ success: true, count: items.length, pagination, summary, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




