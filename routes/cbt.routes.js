const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  getExamQuestionsForStudent,
  submitExam,
  getStudentResult,
  getClassResults,
} = require('../controllers/cbt.controller');

const router = Router();

router.get('/cbt/exams/:id/questions', auth, authorizeRoles(['student']), getExamQuestionsForStudent);
router.post('/cbt/exams/:id/submit', auth, authorizeRoles(['student']), submitExam);
router.get('/cbt/results/student/:examId', auth, authorizeRoles(['student']), getStudentResult);
router.get('/cbt/results/class/:examId', auth, authorizeRoles(['admin', 'teacher']), getClassResults);

module.exports = router;


