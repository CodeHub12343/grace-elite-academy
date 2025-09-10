const Attendance = require('../models/attendance.model');
const ClassModel = require('../models/class.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const { parsePagination, parseSort } = require('../utils/query');
const mongoose = require('mongoose');

exports.markAttendance = async (req, res) => {
  try {
    const { classId, subjectId, date, records } = req.body;
    if (!classId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'classId and records are required' });
    }

    const cls = await ClassModel.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    // If teacher, ensure class is assigned
    if (req.user?.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.sub, classes: classId });
      if (!teacher) return res.status(403).json({ success: false, message: 'Not allowed to mark this class' });
    }

    const markDate = date ? new Date(date) : new Date();

    // Avoid duplicates: upsert each record by composite key (studentId+date+subjectId)
    const teacherDoc = await Teacher.findOne({ userId: req.user.sub });
    const teacherId = teacherDoc ? teacherDoc._id : null;
    if (!teacherId && req.user.role === 'teacher') {
      return res.status(400).json({ success: false, message: 'Teacher profile not found' });
    }

    const ops = records.map((r) => ({
      updateOne: {
        filter: { studentId: r.studentId, date: markDate, subjectId: subjectId || null },
        update: {
          $set: {
            studentId: r.studentId,
            classId,
            subjectId: subjectId || null,
            teacherId: teacherId || (req.user.role === 'admin' ? null : undefined),
            date: markDate,
            status: r.status,
            remarks: r.remarks || '',
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(ops, { ordered: false });
    return res.status(201).json({ success: true, data: { upserted: result.upsertedCount, modified: result.modifiedCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, subjectId, status, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort || '-date');

    const filter = { classId };
    if (subjectId) filter.subjectId = subjectId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      Attendance.find(filter)
        .populate({ path: 'studentId', populate: { path: 'userId' } })
        .populate('classId')
        .populate('subjectId')
        .populate({ path: 'teacherId', populate: { path: 'userId' } })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, status, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort || '-date');

    // Students can only access their own records unless admin
    if (req.user?.role === 'student') {
      const studentDoc = await Student.findOne({ _id: studentId, userId: req.user.sub });
      if (!studentDoc) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const filter = { studentId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      Attendance.find(filter)
        .populate({ path: 'studentId', populate: { path: 'userId' } })
        .populate('classId')
        .populate('subjectId')
        .populate({ path: 'teacherId', populate: { path: 'userId' } })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required' });

    const match = { classId };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const agg = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$studentId',
          totalSessions: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $eq: ['$totalSessions', 0] },
              0,
              { $multiply: [{ $divide: ['$present', '$totalSessions'] }, 100] },
            ],
          },
        },
      },
    ]);

    return res.status(200).json({ success: true, count: agg.length, data: agg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// Helpers
function normalizeToDayRange(dateString) {
  if (!dateString) return null;
  const start = new Date(dateString);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function ensureTeacherCanAccessClass(req, classId) {
  if (req.user?.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user.sub, classes: classId });
    if (!teacher) return false;
  }
  return true;
}

// GET /attendance?classId=&date=&studentId=
// Roles: admin, teacher for any; student only for own studentId (if omitted, inferred)
exports.getAttendance = async (req, res) => {
  try {
    const { classId, date, studentId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-date');

    if (!classId && !studentId && !date) {
      return res.status(400).json({ success: false, message: 'Provide at least one of classId, studentId, or date' });
    }

    const filter = {};
    if (classId) filter.classId = classId;
    let effectiveStudentId = studentId;

    if (req.user?.role === 'student') {
      const me = await Student.findOne({ userId: req.user.sub }).select('_id');
      if (!me) return res.status(403).json({ success: false, message: 'Forbidden' });
      effectiveStudentId = effectiveStudentId || String(me._id);
      filter.studentId = effectiveStudentId;
    } else if (effectiveStudentId) {
      filter.studentId = effectiveStudentId;
    }

    if (date) {
      const range = normalizeToDayRange(date);
      filter.date = { $gte: range.start, $lte: range.end };
    }

    // If teacher, ensure they can access the class records when classId provided
    if (req.user?.role === 'teacher' && filter.classId) {
      const ok = await ensureTeacherCanAccessClass(req, filter.classId);
      if (!ok) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [items, total] = await Promise.all([
      Attendance.find(filter)
        .populate({ path: 'studentId', populate: { path: 'userId' } })
        .populate('classId')
        .populate('subjectId')
        .populate({ path: 'teacherId', populate: { path: 'userId' } })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /attendance/bulk { items: [ { classId, subjectId, date, records: [ { studentId, status, remarks } ] } ] }
exports.bulkMarkAttendance = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required' });
    }
    await session.withTransaction(async () => {
      for (const item of items) {
        const { classId, subjectId, date, records } = item;
        if (!classId || !Array.isArray(records) || records.length === 0) {
          throw new Error('Each item requires classId and non-empty records');
        }

        const cls = await ClassModel.findById(classId).session(session);
        if (!cls) throw new Error('Class not found');

        if (req.user?.role === 'teacher') {
          const teacher = await Teacher.findOne({ userId: req.user.sub, classes: classId }).session(session);
          if (!teacher) throw new Error('Not allowed to mark this class');
        }

        const markDate = date ? new Date(date) : new Date();

        const teacherDoc = await Teacher.findOne({ userId: req.user.sub }).session(session);
        const teacherId = teacherDoc ? teacherDoc._id : null;
        if (!teacherId && req.user.role === 'teacher') {
          throw new Error('Teacher profile not found');
        }

        const ops = records.map((r) => ({
          updateOne: {
            filter: { studentId: r.studentId, date: markDate, subjectId: subjectId || null },
            update: {
              $set: {
                studentId: r.studentId,
                classId,
                subjectId: subjectId || null,
                teacherId: teacherId || (req.user.role === 'admin' ? null : undefined),
                date: markDate,
                status: r.status,
                remarks: r.remarks || '',
              },
            },
            upsert: true,
          },
        }));

        await Attendance.bulkWrite(ops, { ordered: false, session });
      }
    });
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

function toCsv(rows) {
  const header = ['Student Name', 'Student Email', 'Student ID', 'Class', 'Date', 'Subject', 'Status', 'Remarks', 'Marked By'];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    if (s.search(/[",\n]/) >= 0) return `"${s}` + `"`;
    return s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const studentUser = r.studentId && r.studentId.userId;
    const teacherUser = r.teacherId && r.teacherId.userId;
    lines.push([
      escape(studentUser?.name),
      escape(studentUser?.email),
      escape(r.studentId?._id),
      escape(r.classId?.name || r.classId),
      escape(new Date(r.date).toISOString()),
      escape(r.subjectId?.name || r.subjectId || ''),
      escape(r.status),
      escape(r.remarks || ''),
      escape(teacherUser?.name || ''),
    ].join(','));
  }
  return lines.join('\n');
}

// GET /attendance/export?classId=&date=
exports.exportAttendanceCsv = async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ success: false, message: 'classId and date are required' });
    }

    if (req.user?.role === 'teacher') {
      const ok = await ensureTeacherCanAccessClass(req, classId);
      if (!ok) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const range = normalizeToDayRange(date);
    const filter = { classId, date: { $gte: range.start, $lte: range.end } };
    const items = await Attendance.find(filter)
      .populate({ path: 'studentId', populate: { path: 'userId' } })
      .populate('classId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } });

    const csv = toCsv(items);
    const filename = `attendance_${classId}_${new Date(date).toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /attendance/email-report { recipients: [], subject, body, classId, date }
exports.emailAttendanceReport = async (req, res) => {
  try {
    const { recipients, subject, body, classId, date } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'recipients array is required' });
    }
    if (!classId || !date) {
      return res.status(400).json({ success: false, message: 'classId and date are required' });
    }

    if (req.user?.role === 'teacher') {
      const ok = await ensureTeacherCanAccessClass(req, classId);
      if (!ok) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const range = normalizeToDayRange(date);
    const filter = { classId, date: { $gte: range.start, $lte: range.end } };
    const items = await Attendance.find(filter)
      .populate({ path: 'studentId', populate: { path: 'userId' } })
      .populate('classId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } });
    const csv = toCsv(items);

    const { sendMailWithAttachments } = require('../utils/mailer');
    const filename = `attendance_${classId}_${new Date(date).toISOString().slice(0, 10)}.csv`;
    await sendMailWithAttachments({
      to: recipients.join(','),
      subject: subject || 'Attendance Report',
      html: body || '<p>Attached attendance report.</p>',
      attachments: [
        { filename, content: csv, contentType: 'text/csv' },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


