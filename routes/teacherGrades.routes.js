const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  uploadGrade,
  bulkUploadGrades,
  getMyAssignments,
  getMyGrades,
  getClassSubjectGrades,
  publishGrade,
  deleteGrade,
  getStudentComprehensiveGrades
} = require('../controllers/teacherGrade.controller');

const router = Router();

// Teacher dashboard endpoints
router.get('/teacher-grades/my-assignments', auth, authorizeRoles(['teacher']), getMyAssignments);
router.get('/teacher-grades/my-grades', auth, authorizeRoles(['teacher']), getMyGrades);

// Teacher grade management endpoints
router.post('/teacher-grades/upload', auth, authorizeRoles(['teacher']), uploadGrade);
router.post('/teacher-grades/bulk-upload', auth, authorizeRoles(['teacher']), bulkUploadGrades);
router.get('/teacher-grades/class/:classId/subject/:subjectId', auth, authorizeRoles(['teacher']), getClassSubjectGrades);
router.patch('/teacher-grades/:id/publish', auth, authorizeRoles(['teacher']), publishGrade);
router.delete('/teacher-grades/:id', auth, authorizeRoles(['teacher']), deleteGrade);

// Student comprehensive grades endpoint
router.get('/teacher-grades/student/:studentId', auth, authorizeRoles(['admin', 'teacher', 'student']), getStudentComprehensiveGrades);

module.exports = router;




