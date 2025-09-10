const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  listQuestionBank,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/question.controller');

const router = Router();

// Listing question bank: admin/teacher
router.get('/questions/bank', auth, authorizeRoles(['admin', 'teacher']), listQuestionBank);
// CRUD: admin/teacher
router.post('/questions', auth, authorizeRoles(['admin', 'teacher']), createQuestion);
router.put('/questions/:id', auth, authorizeRoles(['admin', 'teacher']), updateQuestion);
router.delete('/questions/:id', auth, authorizeRoles(['admin']), deleteQuestion);

module.exports = router;

































