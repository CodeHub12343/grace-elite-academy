const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const fees = require('../controllers/fees.controller');
const pay = require('../controllers/payments.controller');

const router = Router();

// Fee categories
router.post('/fees/categories', auth, authorizeRoles(['admin']), fees.createCategory);
router.get('/fees/categories', auth, authorizeRoles(['admin', 'teacher']), fees.getCategories);

// Invoices
router.post('/fees/invoices', auth, authorizeRoles(['admin']), fees.createInvoices);
router.get('/fees/invoices', auth, authorizeRoles(['admin', 'teacher', 'student']), fees.listInvoices);
router.get('/fees/invoices/:id', auth, authorizeRoles(['admin', 'teacher', 'student']), fees.getInvoiceById);

// Payments
router.post('/payments/initiate/:invoiceId', auth, authorizeRoles(['student']), pay.initiatePayment);
router.post('/payments/initiate', auth, authorizeRoles(['student', 'admin']), pay.initiatePaymentFromFee);
router.get('/payments/verify/:reference', auth, authorizeRoles(['admin', 'teacher', 'student']), pay.verifyPayment);
router.post('/payments/webhook', pay.webhook);
router.get('/payments/history', auth, authorizeRoles(['student']), pay.historyStudent);
router.get('/payments/admin', auth, authorizeRoles(['admin']), pay.historyAdmin);
router.get('/payments/config', auth, authorizeRoles(['admin', 'teacher', 'student']), pay.getPaystackConfig);
router.get('/payments/analytics', auth, authorizeRoles(['admin']), pay.paymentAnalytics);
router.get('/payments/export', auth, authorizeRoles(['admin']), pay.exportPayments);

module.exports = router;


