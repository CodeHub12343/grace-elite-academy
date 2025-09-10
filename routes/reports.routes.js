const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const reports = require('../controllers/reports.controller');

const router = Router();

router.get('/reports', auth, authorizeRoles(['admin', 'teacher']), reports.generalReports);
router.get('/reports/student/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), reports.studentReport);
router.get('/reports/student/:studentId/academic-result', auth, authorizeRoles(['admin']), reports.studentAcademicResult);
router.get('/reports/class/:id', auth, authorizeRoles(['admin', 'teacher']), reports.classReport);
router.get('/reports/finance', auth, authorizeRoles(['admin']), reports.financeReport);
router.get('/reports/exams/:examId', auth, authorizeRoles(['admin', 'teacher']), reports.examAnalytics);
router.get('/reports/attendance/class/:id', auth, authorizeRoles(['admin', 'teacher']), reports.attendanceSummary);
router.get('/reports/teacher-overview', auth, authorizeRoles(['teacher']), reports.teacherOverview);

module.exports = router;




