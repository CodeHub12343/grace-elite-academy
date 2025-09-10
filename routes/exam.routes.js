const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createExam,
  updateExam,
  deleteExam,
  setExamStatus,
  addQuestions,
  getExams,
  getExamById,
  exportExamResults,
} = require('../controllers/exam.controller');
const { getStudentResult } = require('../controllers/cbt.controller');

const router = Router();

router.post('/exams', auth, authorizeRoles(['admin', 'teacher']), createExam);
router.put('/exams/:id', auth, authorizeRoles(['admin', 'teacher']), updateExam);
router.delete('/exams/:id', auth, authorizeRoles(['admin', 'teacher']), deleteExam);
router.patch('/exams/:id/status', auth, authorizeRoles(['admin', 'teacher']), setExamStatus);
router.post('/exams/:id/questions', auth, authorizeRoles(['admin', 'teacher']), addQuestions);
router.get('/exams', auth, authorizeRoles(['admin', 'teacher', 'student']), getExams);
router.get('/exams/:id', auth, authorizeRoles(['admin', 'teacher']), getExamById);
router.get('/exams/results', auth, authorizeRoles(['admin', 'teacher']), exportExamResults);

// Alias: GET /exams/:id/results
// - Students: returns only their result via CBT controller
// - Admin/Teacher: proxies to exportExamResults
router.get('/exams/:id/results', auth, authorizeRoles(['admin', 'teacher', 'student']), (req, res, next) => {
  try {
    if (req.user && req.user.role === 'student') {
      req.params.examId = req.params.id; // adapt for getStudentResult(examId param)
      return getStudentResult(req, res, next);
    }
    req.query = req.query || {};
    req.query.examId = req.params.id;
    return exportExamResults(req, res, next);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;


