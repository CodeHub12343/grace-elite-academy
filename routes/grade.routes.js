const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createGrade,
  bulkCreateGrades,
  getStudentGrades,
  getClassGrades,
  updateGrade,
  deleteGrade,
  listGrades,
  getGradesAnalytics,
  getAcademicResult,
  getTeacherSubjectClassGrades,
  getTeacherSubjectClassTermGrades,
} = require('../controllers/grade.controller');

const router = Router();

router.post('/grades', auth, authorizeRoles(['admin', 'teacher']), createGrade);
router.post('/grades/bulk', auth, authorizeRoles(['admin', 'teacher']), bulkCreateGrades);
router.get('/grades', auth, authorizeRoles(['admin', 'teacher']), listGrades);
router.get('/grades/analytics', auth, authorizeRoles(['admin', 'teacher']), getGradesAnalytics);
router.get('/grades/academic-result/:studentId', auth, authorizeRoles(['admin', 'teacher']), getAcademicResult);
router.get('/grades/teacher/subject/:subjectId/class/:classId', auth, authorizeRoles(['admin', 'teacher']), getTeacherSubjectClassGrades);
router.get('/grades/teacher/subject/:subjectId/class/:classId/term/:term', auth, authorizeRoles(['admin', 'teacher']), getTeacherSubjectClassTermGrades);
router.get('/grades/student/:studentId', auth, authorizeRoles(['admin', 'teacher', 'student']), getStudentGrades);
router.get('/grades/class/:classId', auth, authorizeRoles(['admin', 'teacher']), getClassGrades);
router.put('/grades/:id', auth, authorizeRoles(['admin', 'teacher']), updateGrade);
router.delete('/grades/:id', auth, authorizeRoles(['admin']), deleteGrade);

module.exports = router;


