const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createAssignment,
  getAssignments,
  getPresignUrl,
  submitAssignment,
  gradeSubmission,
  getSubmissionsForAssignment,
} = require('../controllers/assignment.controller');
const { validate, schemas } = require('../utils/validate');

const router = Router();

// Assignments
router.post('/assignments', auth, authorizeRoles(['admin', 'teacher']), validate(schemas.assignmentCreate), createAssignment);
router.get('/assignments', auth, authorizeRoles(['admin', 'teacher', 'student']), getAssignments);

// S3 presign and submit
router.post('/assignments/presign', auth, authorizeRoles(['student']), validate(schemas.filesUploadUrl), getPresignUrl);
router.post('/assignments/submit', auth, authorizeRoles(['student']), submitAssignment);

// Teacher grading
router.get('/assignments/:assignmentId/submissions', auth, authorizeRoles(['admin', 'teacher']), getSubmissionsForAssignment);
router.patch('/assignments/submissions/:id/grade', auth, authorizeRoles(['admin', 'teacher']), gradeSubmission);

module.exports = router;


