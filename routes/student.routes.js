const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getMyStudent,
} = require('../controllers/student.controller');

const router = Router();

// Allow students to access GET /students only when scope=mine
function ensureStudentScopeMine(req, res, next) {
  try {
    if (req.user && req.user.role === 'student') {
      if (req.query && req.query.scope === 'mine') return next();
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

router.post('/students', auth, authorizeRoles(['admin']), validate(schemas.studentCreate), createStudent);
router.get('/students', auth, authorizeRoles(['admin', 'teacher', 'student']), ensureStudentScopeMine, getStudents);
router.get('/students/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), getStudentById);
router.get('/students/me', auth, authorizeRoles(['student']), getMyStudent);
router.patch('/students/:id', auth, authorizeRoles(['admin']), updateStudent);
router.delete('/students/:id', auth, authorizeRoles(['admin']), deleteStudent);

module.exports = router;


