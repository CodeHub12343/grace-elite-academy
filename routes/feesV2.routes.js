const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const fees = require('../controllers/feesV2.controller');
const pay = require('../controllers/paymentsV2.controller');

const router = Router();

router.post('/fees', auth, authorizeRoles(['admin']), fees.createFee);
router.get('/fees/student/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), fees.getStudentFees);

router.post('/payments/initiate', auth, authorizeRoles(['student']), pay.initiate);
router.post('/payments/webhook', pay.webhook);
router.get('/payments/student/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), pay.history);
router.post('/payments/simulate-webhook', auth, authorizeRoles(['admin']), pay.simulateWebhook);

module.exports = router;




