const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  markTeacherAttendance,
  bulkMarkTeacherAttendance,
  listTeacherAttendance,
  getMyTeacherAttendance,
} = require('../controllers/teacherAttendance.controller');

const router = Router();

// Admin-only marking routes
router.post('/teacher-attendance/mark', auth, authorizeRoles(['admin']), markTeacherAttendance);
router.post('/teacher-attendance/bulk', auth, authorizeRoles(['admin']), bulkMarkTeacherAttendance);

// Listing routes
router.get('/teacher-attendance', auth, authorizeRoles(['admin']), listTeacherAttendance);
router.get('/teacher-attendance/me', auth, authorizeRoles(['teacher']), getMyTeacherAttendance);

module.exports = router;




