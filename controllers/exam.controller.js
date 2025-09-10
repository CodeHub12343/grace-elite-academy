const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const { parsePagination, parseSort } = require('../utils/query');
const { notify } = require('../utils/notifier');
const { emitToUser } = require('../utils/socket');
const Submission = require('../models/submission.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');

exports.createExam = async (req, res) => {
  try {
    const { title, description, classId, subjectId, teacherId, startTime, endTime, duration, term, examType, academicYear } = req.body;
    
    // Validate required fields
    if (!title || !classId || !subjectId || !teacherId || !startTime || !endTime || !duration || !term || !examType || !academicYear) {
      return res.status(400).json({ 
        success: false, 
        message: 'title, classId, subjectId, teacherId, startTime, endTime, duration, term, examType, and academicYear are required' 
      });
    }

    // Validate term and examType values
    const validTerms = ['term1', 'term2', 'final'];
    const validExamTypes = ['midterm', 'final', 'assignment'];
    
    if (!validTerms.includes(term)) {
      return res.status(400).json({ 
        success: false, 
        message: `term must be one of: ${validTerms.join(', ')}` 
      });
    }
    
    if (!validExamTypes.includes(examType)) {
      return res.status(400).json({ 
        success: false, 
        message: `examType must be one of: ${validExamTypes.join(', ')}` 
      });
    }

    const doc = await Exam.create(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft exams can be edited' });
    Object.assign(exam, req.body);
    await exam.save();
    return res.status(200).json({ success: true, data: exam });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    await Question.deleteMany({ examId: req.params.id });
    const doc = await Exam.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Exam not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.setExamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const exam = await Exam.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (status === 'published') {
      // Place-holder: emit a broadcast to all clients; in production, emit to class members
      if (typeof io !== 'undefined' && io) {
        io.emit('exam:published', { examId: exam._id, title: exam.title });
      }
    }
    return res.status(200).json({ success: true, data: exam });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.addQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ success: false, message: 'questions required' });
    const examId = req.params.id;
    const docs = questions.map((q) => ({ ...q, examId }));
    const created = await Question.insertMany(docs, { ordered: false });
    const totalMarks = await Question.aggregate([
      { $match: { examId: new (require('mongoose').Types.ObjectId)(examId) } },
      { $group: { _id: null, sum: { $sum: '$marks' } } },
    ]);
    await Exam.findByIdAndUpdate(examId, { totalMarks: totalMarks[0]?.sum || 0 });
    return res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = {};
    
    // Apply query filters
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

    // Role-based filtering: Teachers can only see exams for their assigned subjects and classes
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.sub }).populate(['subjects', 'classes']);
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher profile not found' });
      }

      // Get teacher's assigned subject and class IDs
      const teacherSubjectIds = teacher.subjects.map(subject => subject._id);
      const teacherClassIds = teacher.classes.map(cls => cls._id);

      // Filter exams to only show those for teacher's subjects and classes
      if (teacherSubjectIds.length > 0) {
        filter.subjectId = { $in: teacherSubjectIds };
      }
      if (teacherClassIds.length > 0) {
        filter.classId = { $in: teacherClassIds };
      }

      // If no subjects or classes assigned, return empty result
      if (teacherSubjectIds.length === 0 && teacherClassIds.length === 0) {
        return res.status(200).json({ 
          success: true, 
          count: 0, 
          pagination: { page, limit, total: 0, pages: 0 }, 
          data: [],
          message: 'No subjects or classes assigned to teacher'
        });
      }
    }

    // Role-based filtering: Students can only see published exams for subjects they are taking
    if (req.user.role === 'student') {
      // Find the student record
      const student = await Student.findOne({ userId: req.user.sub }).populate('classId');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      // Get student's class and its subjects
      const studentClass = student.classId;
      if (!studentClass || !studentClass.subjectIds || studentClass.subjectIds.length === 0) {
        return res.status(200).json({ 
          success: true, 
          count: 0, 
          pagination: { page, limit, total: 0, pages: 0 }, 
          data: [],
          message: 'No subjects assigned to your class'
        });
      }

      // Filter exams to only show published exams for student's class subjects
      filter.status = 'published'; // Only show published exams
      filter.classId = studentClass._id; // Only exams for student's class
      filter.subjectId = { $in: studentClass.subjectIds }; // Only subjects the student is taking
    }

    const [items, total] = await Promise.all([
      Exam.find(filter)
        .populate({
          path: 'classId',
          select: 'name section teacherIds subjectIds studentIds',
          populate: [
            { path: 'teacherIds', select: 'userId subjects classes qualification experience' },
            { path: 'subjectIds', select: 'name code teacherIds' }
          ]
        })
        .populate({
          path: 'subjectId',
          select: 'name code classId teacherIds',
          populate: [
            { path: 'teacherIds', select: 'userId subjects classes qualification experience' }
          ]
        })
        .populate({
          path: 'teacherId',
          select: 'userId subjects classes qualification experience phone',
          populate: [
            { path: 'userId', select: 'name email' }
          ]
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Exam.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(['classId', 'subjectId', 'teacherId']);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    const questions = await Question.find({ examId: exam._id });
    return res.status(200).json({ success: true, data: { exam, questions } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


function toCsv(rows) {
  const header = ['Student Name', 'Student Email', 'Student ID', 'Class', 'Exam Title', 'Score', 'Total', 'Percentage', 'Submitted At'];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    if (s.search(/[",\n]/) >= 0) return `"${s}` + `"`;
    return s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const studentUser = r.studentId && r.studentId.userId;
    lines.push([
      escape(studentUser?.name),
      escape(studentUser?.email),
      escape(r.studentId?._id),
      escape(r.studentId?.classId?.name || ''),
      escape(r.examId?.title || ''),
      escape(r.score),
      escape(r.examId?.totalMarks ?? ''),
      escape(r.examId?.totalMarks ? Math.round((r.score / r.examId.totalMarks) * 10000) / 100 : 0),
      escape(r.submittedAt ? new Date(r.submittedAt).toISOString() : ''),
    ].join(','));
  }
  return lines.join('\n');
}

// GET /exams/results?examId=&classId=&format=csv|json
exports.exportExamResults = async (req, res) => {
  try {
    const { examId, classId, format } = req.query;
    if (!examId) return res.status(400).json({ success: false, message: 'examId is required' });

    const exam = await Exam.findById(examId).populate(['classId', 'subjectId', 'teacherId']);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    let studentFilter = {};
    if (classId) studentFilter.classId = classId;
    const studentIds = classId ? (await Student.find(studentFilter).select('_id')).map(s => s._id) : null;

    const subFilter = { examId };
    if (studentIds) subFilter.studentId = { $in: studentIds };

    const subs = await Submission.find(subFilter)
      .populate({ path: 'studentId', populate: { path: 'userId' } })
      .populate({ path: 'studentId', populate: { path: 'classId' } })
      .populate('examId');

    if ((format || '').toLowerCase() === 'csv') {
      const csv = toCsv(subs);
      const filename = `exam_results_${examId}${classId ? '_' + classId : ''}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }

    const data = subs.map((s) => ({
      student: {
        id: s.studentId?._id,
        name: s.studentId?.userId?.name,
        email: s.studentId?.userId?.email,
        class: s.studentId?.classId?.name,
      },
      exam: {
        id: s.examId?._id,
        title: s.examId?.title,
        totalMarks: s.examId?.totalMarks,
      },
      score: s.score,
      percentage: s.examId?.totalMarks ? (s.score / s.examId.totalMarks) * 100 : 0,
      submittedAt: s.submittedAt,
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


