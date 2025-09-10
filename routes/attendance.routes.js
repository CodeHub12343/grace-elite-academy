const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceReport,
  getAttendance,
  bulkMarkAttendance,
  exportAttendanceCsv,
  emailAttendanceReport,
} = require('../controllers/attendance.controller');

const router = Router();

router.post('/attendance/mark', auth, authorizeRoles(['admin', 'teacher']), validate(schemas.attendanceMark), markAttendance);
router.get('/attendance', auth, authorizeRoles(['admin', 'teacher', 'student']), getAttendance);
router.post('/attendance/bulk', auth, authorizeRoles(['admin', 'teacher']), bulkMarkAttendance);
router.get('/attendance/export', auth, authorizeRoles(['admin', 'teacher']), exportAttendanceCsv);
router.post('/attendance/email-report', auth, authorizeRoles(['admin', 'teacher']), emailAttendanceReport);
router.get('/attendance/class/:classId', auth, authorizeRoles(['admin', 'teacher']), getClassAttendance);
router.get('/attendance/student/:studentId', auth, authorizeRoles(['admin', 'teacher', 'student']), getStudentAttendance);
router.get('/attendance/report', auth, authorizeRoles(['admin', 'teacher']), getAttendanceReport);

module.exports = router;


