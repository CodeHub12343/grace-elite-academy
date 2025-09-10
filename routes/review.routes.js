const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createReview,
  getTeacherReviews,
  getMyReviews,
  getReviewsAnalytics,
  deleteReview,
  getTeacherAnalytics,
  listMyTeacherReviews,
  replyToReview,
  resolveReview,
} = require('../controllers/review.controller');

const router = Router();

router.post('/reviews', auth, authorizeRoles(['student']), createReview);
router.get('/reviews/teacher/:teacherId', auth, authorizeRoles(['admin', 'teacher', 'student']), getTeacherReviews);
router.get('/reviews/my', auth, authorizeRoles(['teacher']), getMyReviews);
router.get('/reviews/analytics', auth, authorizeRoles(['admin']), getReviewsAnalytics);
router.delete('/reviews/:id', auth, authorizeRoles(['admin']), deleteReview);

// Teacher-focused features
router.get('/reviews/teacher-analytics', auth, authorizeRoles(['teacher']), getTeacherAnalytics);
router.get('/reviews/teacher', auth, authorizeRoles(['teacher']), listMyTeacherReviews);
router.post('/reviews/:id/reply', auth, authorizeRoles(['teacher', 'admin']), replyToReview);
router.patch('/reviews/:id/resolve', auth, authorizeRoles(['teacher', 'admin']), resolveReview);

module.exports = router;


