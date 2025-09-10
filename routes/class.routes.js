const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  getClassStudents,
} = require('../controllers/class.controller');

const router = Router();

router.post('/classes', auth, authorizeRoles(['admin']), validate(schemas.classCreate), createClass);
router.get('/classes', auth, authorizeRoles(['admin', 'teacher', 'student']), getClasses);
router.get('/classes/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), getClassById);
router.get('/classes/:id/students', auth, authorizeRoles(['admin', 'teacher', 'student']), getClassStudents);
router.patch('/classes/:id', auth, authorizeRoles(['admin']), updateClass);
router.delete('/classes/:id', auth, authorizeRoles(['admin']), deleteClass);

module.exports = router;


