const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  uploadTermResult,
  bulkUploadTermResults,
  getStudentTermResults,
  getClassTermResults,
  publishTermResult,
  deleteTermResult,
  publishFromTeacherGrades
} = require('../controllers/termResult.controller');

const router = Router();

// Admin routes for uploading and managing term results
router.post('/term-results/upload', auth, authorizeRoles(['admin']), uploadTermResult);
router.post('/term-results/bulk-upload', auth, authorizeRoles(['admin']), bulkUploadTermResults);
router.post('/term-results/publish', auth, authorizeRoles(['admin', 'teacher']), publishFromTeacherGrades);
router.patch('/term-results/:id/publish', auth, authorizeRoles(['admin']), publishTermResult);
router.delete('/term-results/:id', auth, authorizeRoles(['admin']), deleteTermResult);

// Routes for viewing term results
router.get('/term-results/student/:studentId', auth, authorizeRoles(['admin', 'teacher', 'student']), getStudentTermResults);
// Alias to allow students to access their own results without knowing their Student._id
router.get('/term-results/student/me', auth, authorizeRoles(['student']), (req, res, next) => {
  req.params.studentId = 'me';
  return getStudentTermResults(req, res, next);
});
router.get('/term-results/class/:classId', auth, authorizeRoles(['admin', 'teacher']), getClassTermResults);

module.exports = router;









