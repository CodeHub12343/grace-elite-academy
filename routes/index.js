const { Router } = require('express');
const authRoutes = require('./auth.routes');
const teacherRoutes = require('./teacher.routes');
const studentRoutes = require('./student.routes');
const classRoutes = require('./class.routes');
const subjectRoutes = require('./subject.routes');
const attendanceRoutes = require('./attendance.routes');
const gradeRoutes = require('./grade.routes');
const reviewRoutes = require('./review.routes');
const examRoutes = require('./exam.routes');
const cbtRoutes = require('./cbt.routes');
const assignmentRoutes = require('./assignment.routes');
const paymentsRoutes = require('./payments.routes');
const feesV2Routes = require('./feesV2.routes');
const feesV2Controller = require('../controllers/feesV2.controller');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const filesRoutes = require('./files.routes');
const notificationsRoutes = require('./notifications.routes');
const reportsRoutes = require('./reports.routes');
const questionsRoutes = require('./questions.routes');
const termResultsRoutes = require('./termResults.routes');
const teacherAttendanceRoutes = require('./teacherAttendance.routes');
const teacherGradesRoutes = require('./teacherGrades.routes');
const teacherResultsRoutes = require('./teacherResults.routes');
const adminAnalyticsRoutes = require('./adminAnalytics.routes');
const studentDashboardRoutes = require('./studentDashboard.routes');

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use(teacherRoutes);
router.use(studentRoutes);
router.use(classRoutes);
router.use(subjectRoutes);
router.use(attendanceRoutes);
router.use(gradeRoutes);
router.use(reviewRoutes);
router.use(examRoutes);
router.use(cbtRoutes);
router.use(assignmentRoutes);
router.use(paymentsRoutes);
// Mount v2 routes under a versioned prefix to avoid path collisions
router.use('/v2', feesV2Routes);

// Backward-compatible: expose v2 student fees at legacy path
router.get('/fees/student/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), feesV2Controller.getStudentFees);
router.use(filesRoutes);
router.use(notificationsRoutes);
router.use(reportsRoutes);
router.use(questionsRoutes);
router.use(termResultsRoutes);
router.use(teacherAttendanceRoutes);
router.use(teacherGradesRoutes);
router.use(teacherResultsRoutes);
router.use(adminAnalyticsRoutes);
router.use('/student-dashboard', studentDashboardRoutes);

module.exports = router;


