const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getAcademicPerformance,
  getAttendanceTracking,
  getExamSchedule,
  getAssignments,
  getFeeStatus,
  getNotifications,
  getStudyProgress,
  getTeacherInformation,
  getAcademicCalendar,
  exportStudentData
} = require('../controllers/studentDashboard.controller');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

// Async error wrapper to ensure JSON error responses
function wrapAsync(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      // Log full error for server debugging
      // eslint-disable-next-line no-console
      console.error('StudentDashboard route error:', err);
      const status = err.status || err.code || 500;
      const message = err.message || 'Internal Server Error';
      // Prefer not to leak stack in production; send minimal JSON consistently
      res.status(Number(status) || 500).json({ success: false, message });
    }
  };
}

// All routes require student authentication
router.use(auth);
router.use(authorizeRoles(['student']));

// GET /student-dashboard/overview - Main dashboard overview
router.get('/overview', wrapAsync(getDashboardOverview));

// GET /student-dashboard/academic - Academic performance details
router.get('/academic', wrapAsync(getAcademicPerformance));

// GET /student-dashboard/attendance - Attendance tracking
router.get('/attendance', wrapAsync(getAttendanceTracking));

// GET /student-dashboard/exams - Exam schedule and results
router.get('/exams', wrapAsync(getExamSchedule));

// GET /student-dashboard/assignments - Assignment management
router.get('/assignments', wrapAsync(getAssignments));

// GET /student-dashboard/fees - Fee and payment status
router.get('/fees', wrapAsync(getFeeStatus));

// GET /student-dashboard/notifications - Notifications and announcements
router.get('/notifications', wrapAsync(getNotifications));

// GET /student-dashboard/progress - Study progress and analytics
router.get('/progress', wrapAsync(getStudyProgress));

// GET /student-dashboard/teachers - Teacher information and reviews
router.get('/teachers', wrapAsync(getTeacherInformation));

// GET /student-dashboard/calendar - Academic calendar and events
router.get('/calendar', wrapAsync(getAcademicCalendar));

// GET /student-dashboard/export - Export student data
router.get('/export', wrapAsync(exportStudentData));

module.exports = router;
