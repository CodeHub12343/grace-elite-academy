const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getCurrentTeacher,
} = require('../controllers/teacher.controller');

const router = Router();

router.post('/teachers', auth, authorizeRoles(['admin']), validate(schemas.teacherCreate), createTeacher);
router.get('/teachers', auth, authorizeRoles(['admin', 'teacher']), getTeachers);
router.get('/teachers/me', auth, authorizeRoles(['teacher']), getCurrentTeacher);
router.get('/teachers/:id', auth, authorizeRoles(['admin', 'teacher']), getTeacherById);
router.patch('/teachers/:id', auth, authorizeRoles(['admin']), updateTeacher);
router.delete('/teachers/:id', auth, authorizeRoles(['admin']), deleteTeacher);

module.exports = router;


