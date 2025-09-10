const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { validate, schemas } = require('../utils/validate');
const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../controllers/subject.controller');

const router = Router();

router.post('/subjects', auth, authorizeRoles(['admin']), validate(schemas.subjectCreate), createSubject);
router.get('/subjects', auth, authorizeRoles(['admin', 'teacher', 'student']), getSubjects);
router.get('/subjects/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), getSubjectById);
router.patch('/subjects/:id', auth, authorizeRoles(['admin']), updateSubject);
router.delete('/subjects/:id', auth, authorizeRoles(['admin']), deleteSubject);

module.exports = router;


