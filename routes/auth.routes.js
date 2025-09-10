const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  resetPasswordWithBodyToken,
  getStudentProfile,
  updateStudentProfile,
  changeStudentPassword,
  getTeacherProfile,
  updateTeacherProfile,
  changeTeacherPassword,
} = require('../controllers/auth.controller');

const router = Router();

router.post('/register', validate(schemas.register), registerUser);
router.post('/login', validate(schemas.login), loginUser);
router.post('/logout', logoutUser);
router.post('/refresh-token', validate(schemas.refresh), refreshToken);
router.post('/forgot-password', validate(schemas.forgotPassword), forgotPassword);
router.post('/reset-password/:token', validate(schemas.resetPassword), resetPassword);
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);
router.delete('/account', auth, deleteAccount);
router.post('/reset-password', validate(schemas.resetPassword), resetPasswordWithBodyToken);

// Student profile routes
router.get('/student/profile', auth, getStudentProfile);
router.put('/student/profile', auth, updateStudentProfile);
router.put('/student/change-password', auth, changeStudentPassword);

// Teacher profile routes
router.get('/teacher/profile', auth, getTeacherProfile);
router.put('/teacher/profile', auth, updateTeacherProfile);
router.put('/teacher/change-password', auth, changeTeacherPassword);

module.exports = router;


