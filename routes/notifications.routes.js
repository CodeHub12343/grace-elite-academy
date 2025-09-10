const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const notifications = require('../controllers/notifications.controller');

const router = Router();

router.post('/notifications/send', auth, authorizeRoles(['admin', 'teacher']), notifications.sendOne);
router.post('/notifications/bulk', auth, authorizeRoles(['admin']), notifications.bulk);
router.get('/notifications/user/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), notifications.listUser);
router.patch('/notifications/:id/read', auth, authorizeRoles(['admin', 'teacher', 'student']), notifications.markRead);

module.exports = router;




