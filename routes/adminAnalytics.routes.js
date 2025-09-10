const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  getDashboardOverview,
  getAcademicPerformance,
  getFinancialOverview,
  getAttendanceOverview,
  getTeacherPerformance,
  getStudentLifecycle,
  getPredictiveForecasts,
  getRealtimeMetrics,
  exportComprehensiveReport,
  executeCustomQuery
} = require('../controllers/adminAnalytics.controller');

const router = Router();

// ============================================================================
// DASHBOARD OVERVIEW ROUTES
// ============================================================================

// GET /admin-analytics/dashboard - Comprehensive dashboard overview
router.get('/admin-analytics/dashboard', auth, authorizeRoles(['admin']), getDashboardOverview);

// ============================================================================
// ACADEMIC PERFORMANCE ROUTES
// ============================================================================

// GET /admin-analytics/academic/performance - Comprehensive academic performance analytics
router.get('/admin-analytics/academic/performance', auth, authorizeRoles(['admin']), getAcademicPerformance);

// ============================================================================
// FINANCIAL ANALYTICS ROUTES
// ============================================================================

// GET /admin-analytics/financial/overview - Comprehensive financial analytics
router.get('/admin-analytics/financial/overview', auth, authorizeRoles(['admin']), getFinancialOverview);

// ============================================================================
// ATTENDANCE ANALYTICS ROUTES
// ============================================================================

// GET /admin-analytics/attendance/overview - Comprehensive attendance analytics
router.get('/admin-analytics/attendance/overview', auth, authorizeRoles(['admin']), getAttendanceOverview);

// ============================================================================
// TEACHER PERFORMANCE ROUTES
// ============================================================================

// GET /admin-analytics/teachers/performance - Comprehensive teacher performance analytics
router.get('/admin-analytics/teachers/performance', auth, authorizeRoles(['admin']), getTeacherPerformance);

// ============================================================================
// STUDENT LIFECYCLE ROUTES
// ============================================================================

// GET /admin-analytics/students/lifecycle - Student lifecycle and progression analytics
router.get('/admin-analytics/students/lifecycle', auth, authorizeRoles(['admin']), getStudentLifecycle);

// ============================================================================
// PREDICTIVE ANALYTICS ROUTES
// ============================================================================

// GET /admin-analytics/predictive/forecasts - Predictive analytics and forecasting
router.get('/admin-analytics/predictive/forecasts', auth, authorizeRoles(['admin']), getPredictiveForecasts);

// ============================================================================
// REAL-TIME DASHBOARD ROUTES
// ============================================================================

// GET /admin-analytics/realtime/metrics - Real-time dashboard metrics
router.get('/admin-analytics/realtime/metrics', auth, authorizeRoles(['admin']), getRealtimeMetrics);

// ============================================================================
// EXPORT AND REPORTING ROUTES
// ============================================================================

// GET /admin-analytics/export/comprehensive - Export comprehensive analytics report
router.get('/admin-analytics/export/comprehensive', auth, authorizeRoles(['admin']), exportComprehensiveReport);

// ============================================================================
// CUSTOM ANALYTICS ROUTES
// ============================================================================

// POST /admin-analytics/custom/query - Custom analytics query builder
router.post('/admin-analytics/custom/query', auth, authorizeRoles(['admin']), executeCustomQuery);

module.exports = router;








