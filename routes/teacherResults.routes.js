const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  getTeacherClasses,
  getTeacherSubjects,
  getAvailableTerms,
  getAvailableExamTypes,
  getAvailableExamTitles,
  getClassStudents,
  getTeacherResults,
  exportTeacherResults,
  getTeacherResultsSummary
} = require('../controllers/teacherResults.controller');

const router = Router();

// Teacher results navigation endpoints
router.get('/teacher-results/classes', auth, authorizeRoles(['teacher']), getTeacherClasses);
router.get('/teacher-results/subjects', auth, authorizeRoles(['teacher']), getTeacherSubjects);
router.get('/teacher-results/terms', auth, authorizeRoles(['teacher']), getAvailableTerms);
router.get('/teacher-results/exam-types', auth, authorizeRoles(['teacher']), getAvailableExamTypes);
router.get('/teacher-results/exam-titles', auth, authorizeRoles(['teacher']), getAvailableExamTitles);
router.get('/teacher-results/students/:classId', auth, authorizeRoles(['teacher']), getClassStudents);

// Main results viewing endpoint
router.get('/teacher-results/results', auth, authorizeRoles(['teacher']), getTeacherResults);

// Export and summary endpoints
router.get('/teacher-results/export', auth, authorizeRoles(['teacher']), exportTeacherResults);
router.get('/teacher-results/summary', auth, authorizeRoles(['teacher']), getTeacherResultsSummary);

module.exports = router;


