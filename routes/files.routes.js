const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const files = require('../controllers/files.controller');

const router = Router();

router.post('/files/upload-url', auth, authorizeRoles(['admin', 'teacher', 'student']), files.getUploadUrl);
router.patch('/files/confirm/:fileKey', auth, authorizeRoles(['admin', 'teacher', 'student']), files.confirmUpload);
router.get('/files', auth, authorizeRoles(['admin', 'teacher', 'student']), files.listFiles);
router.get('/files/:id/download', auth, authorizeRoles(['admin', 'teacher', 'student']), files.downloadFile);
router.delete('/files/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), files.deleteFile);

module.exports = router;




