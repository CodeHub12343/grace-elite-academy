const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const Submission = require('../models/submission.model');
const Student = require('../models/student.model');
const Grade = require('../models/grade.model');

function shuffle(array) {
  return array.sort(() => 0.5 - Math.random());
}

exports.getExamQuestionsForStudent = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    const now = new Date();
    if (exam.status !== 'published' || now < exam.startTime || now > exam.endTime) {
      return res.status(403).json({ success: false, message: 'Exam not available' });
    }
    // Resolve student profile id from token if not supplied
    let studentId = req.body?.studentId;
    if (!studentId) {
      const me = await Student.findOne({ userId: req.user.sub });
      studentId = me?._id;
    }
    const existing = await Submission.findOne({ examId: exam._id, studentId });
    if (existing && existing.status === 'submitted') return res.status(400).json({ success: false, message: 'Already submitted' });
    const questions = await Question.find({ examId: exam._id }).select('-correctAnswer');
    const randomized = shuffle(questions);
    return res.status(200).json({ success: true, data: { examId: exam._id, questions: randomized, duration: exam.duration } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    const now = new Date();
    if (now > exam.endTime) return res.status(400).json({ success: false, message: 'Submission window closed' });

    const answers = req.body.answers || [];
    // Load full questions to grade
    const questions = await Question.find({ examId: exam._id });
    const answerMap = new Map(answers.map((a) => [String(a.questionId), a.selectedOption]));
    let score = 0;
    for (const q of questions) {
      if (q.type === 'mcq' || q.type === 'true_false') {
        const selected = answerMap.get(String(q._id));
        if (selected !== undefined && selected === q.correctAnswer) {
          score += q.marks;
        }
      }
    }

    // Resolve student profile id if not provided
    let studentId = req.body?.studentId;
    if (!studentId) {
      const me = await Student.findOne({ userId: req.user.sub });
      studentId = me?._id;
    }
    
    const upd = await Submission.findOneAndUpdate(
      { examId: exam._id, studentId },
      { $set: { answers, score, status: 'submitted', submittedAt: new Date() } },
      { new: true, upsert: true }
    );

    // Auto-create grade when exam is submitted
    try {
      // Check if grade already exists for this student-exam combination
      const existingGrade = await Grade.findOne({
        studentId: studentId,
        examId: exam._id,
        term: exam.term,
        examType: exam.examType
      });

      if (!existingGrade) {
        // Create new grade record
        await Grade.create({
          studentId: studentId,
          classId: exam.classId,
          subjectId: exam.subjectId,
          teacherId: exam.teacherId,
          examId: exam._id,
          marks: score,
          maxMarks: exam.totalMarks,
          term: exam.term,
          examType: exam.examType
        });
      } else {
        // Update existing grade
        await Grade.findByIdAndUpdate(existingGrade._id, {
          marks: score,
          maxMarks: exam.totalMarks
        });
      }
    } catch (gradeError) {
      console.error('Error creating grade:', gradeError);
      // Don't fail the submission if grade creation fails
    }

    return res.status(200).json({ success: true, data: { score, totalMarks: exam.totalMarks, percentage: exam.totalMarks ? (score / exam.totalMarks) * 100 : 0 } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentResult = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    // Resolve student's profile _id from user sub
    let studentId = req.user?.sub;
    const student = await Student.findOne({ userId: studentId }).select('_id userId');
    const studentProfileId = student?._id;

    const sub = await Submission.findOne({ examId: req.params.examId, studentId: studentProfileId });
    if (!sub) return res.status(404).json({ success: false, message: 'No submission found' });

    // Load questions to derive totals and per-question correctness
    const questions = await Question.find({ examId: req.params.examId });
    const answerMap = new Map((sub.answers || []).map(a => [String(a.questionId), a.selectedOption]));
    let correct = 0;
    let incorrect = 0;
    const questionViews = questions.map(q => {
      const selected = answerMap.get(String(q._id));
      const isCorrect = selected !== undefined && (q.type === 'mcq' || q.type === 'true_false') && selected === q.correctAnswer;
      if (selected !== undefined) {
        if (isCorrect) correct++; else incorrect++;
      }
      return {
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        yourAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        marks: q.marks,
      };
    });

    const percentage = exam.totalMarks ? (sub.score / exam.totalMarks) * 100 : 0;
    const data = {
      examId: String(exam._id),
      title: exam.title,
      totalMarks: exam.totalMarks,
      score: sub.score,
      percentage,
      submittedAt: sub.submittedAt,
      totalQuestions: questions.length,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      questions: questionViews,
      status: sub.status,
    };
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClassResults = async (req, res) => {
  try {
    const examId = req.params.examId;
    const subs = await Submission.find({ examId });
    const exam = await Exam.findById(examId);
    const total = exam?.totalMarks || 0;
    const scores = subs.map((s) => s.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const s of subs) {
      const pct = total ? (s.score / total) * 100 : 0;
      if (pct <= 20) dist['0-20']++;
      else if (pct <= 40) dist['21-40']++;
      else if (pct <= 60) dist['41-60']++;
      else if (pct <= 80) dist['61-80']++;
      else dist['81-100']++;
    }
    return res.status(200).json({ success: true, data: { averageScore: avg, distribution: dist, count: subs.length } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


