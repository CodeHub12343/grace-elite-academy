const Question = require('../models/question.model');
const Exam = require('../models/exam.model');
const { parsePagination, parseSort } = require('../utils/query');

// GET /questions/bank?subjectId=&text=
exports.listQuestionBank = async (req, res) => {
  try {
    const { subjectId, text } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');

    const filter = {};

    if (subjectId) {
      const exams = await Exam.find({ subjectId }).select('_id');
      const examIds = exams.map((e) => e._id);
      if (examIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, pagination: { page, limit, total: 0, pages: 0 }, data: [] });
      }
      filter.examId = { $in: examIds };
    }

    if (text && text.trim()) {
      filter.questionText = { $regex: new RegExp(text.trim(), 'i') };
    }

    const [items, total] = await Promise.all([
      Question.find(filter)
        .populate({ path: 'examId', populate: ['classId', 'subjectId', 'teacherId'] })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Question.countDocuments(filter),
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /questions
exports.createQuestion = async (req, res) => {
  try {
    const { examId, type, questionText, options, correctAnswer, marks } = req.body || {};
    if (!examId || !type || !questionText || !correctAnswer || marks == null) {
      return res.status(400).json({ success: false, message: 'examId, type, questionText, correctAnswer, marks are required' });
    }
    const doc = await Question.create({ examId, type, questionText, options: options || [], correctAnswer, marks });
    const populated = await doc.populate({ path: 'examId', populate: ['classId', 'subjectId', 'teacherId'] });
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const update = {};
    const allowed = ['examId', 'type', 'questionText', 'options', 'correctAnswer', 'marks'];
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const doc = await Question.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Question not found' });
    const populated = await doc.populate({ path: 'examId', populate: ['classId', 'subjectId', 'teacherId'] });
    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const doc = await Question.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Question not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
































