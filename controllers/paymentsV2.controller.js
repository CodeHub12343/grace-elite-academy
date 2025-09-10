const crypto = require('crypto');
const Fee = require('../models/fee.model');
const Transaction = require('../models/transaction.model');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
const { notify } = require('../utils/notifier');
const { emitToUser } = require('../utils/socket');

function ref() { return `FEE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function calcLate(dueDate, balance) {
  if (!dueDate || balance <= 0) return 0;
  const now = new Date();
  if (now <= dueDate) return 0;
  const weeks = Math.floor((now - dueDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.round(balance * 0.05 * weeks * 100) / 100;
}

exports.initiate = async (req, res) => {
  try {
    const { studentId, feeId, amount } = req.body;
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
    if (String(fee.studentId) !== String(studentId)) return res.status(400).json({ success: false, message: 'Student mismatch' });

    const late = calcLate(fee.dueDate, Math.max(0, fee.amount - fee.amountPaid));
    const balanceWithLate = Math.max(0, fee.amount + late - fee.amountPaid);
    if (amount > balanceWithLate) return res.status(400).json({ success: false, message: 'Amount exceeds balance' });

    const reference = ref();
    const init = await initializeTransaction({ email: 'student@example.com', amount: Math.round(amount * 100), reference });
    const tx = await Transaction.create({ studentId, feeId, amount, status: 'pending', paystackReference: reference });
    await Fee.updateOne({ _id: feeId }, { $addToSet: { transactions: tx._id } });
    return res.status(200).json({ success: true, data: { authorization_url: init.data.authorization_url, reference } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== signature) return res.status(401).json({ success: false, message: 'Invalid signature' });

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const tx = await Transaction.findOneAndUpdate({ paystackReference: reference }, { $set: { status: 'success', paymentDate: new Date() } }, { new: true });
      if (tx) {
        const fee = await Fee.findById(tx.feeId);
        const late = calcLate(fee.dueDate, Math.max(0, fee.amount - fee.amountPaid));
        const newAmountPaid = fee.amountPaid + tx.amount;
        const newBalance = Math.max(0, fee.amount + late - newAmountPaid);
        const status = newBalance <= 0 ? 'paid' : 'partial';
        await Fee.updateOne({ _id: fee._id }, { $set: { amountPaid: newAmountPaid, balance: newBalance, status, lateFee: late } });
        await notify(tx.studentId, 'email', 'Payment receipt', `Your payment of ₦${tx.amount} was received. Balance: ₦${newBalance}.`, {});
        emitToUser(tx.studentId, 'payment:success', { reference, amount: tx.amount, balance: newBalance });
      }
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const txs = await Transaction.find({ studentId: req.params.id }).sort('-createdAt');
    return res.status(200).json({ success: true, count: txs.length, data: txs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// POST /payments/simulate-webhook (dev/admin only)
// Safely simulates a Paystack charge.success webhook locally without deployment
exports.simulateWebhook = async (req, res) => {
  try {
    const { reference, secret } = req.body || {};

    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' });
    }

    const expectedSecret = process.env.DEV_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(401).json({ success: false, message: 'Invalid simulation secret' });
    }

    const tx = await Transaction.findOne({ paystackReference: reference });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (tx.status === 'success') {
      return res.status(200).json({ success: true, message: 'Transaction already successful' });
    }

    // Mark transaction successful
    await Transaction.updateOne({ _id: tx._id }, { $set: { status: 'success', paymentDate: new Date() } });

    // Recalculate fee balances (mirror real webhook logic)
    const fee = await Fee.findById(tx.feeId);
    if (fee) {
      const late = calcLate(fee.dueDate, Math.max(0, fee.amount - fee.amountPaid));
      const newAmountPaid = (fee.amountPaid || 0) + (tx.amount || 0);
      const newBalance = Math.max(0, (fee.amount || 0) + late - newAmountPaid);
      const status = newBalance <= 0 ? 'paid' : 'partial';
      await Fee.updateOne({ _id: fee._id }, { $set: { amountPaid: newAmountPaid, balance: newBalance, status, lateFee: late } });
    }

    try { await notify(tx.studentId, 'email', 'Payment receipt (Simulated)', `Your payment of ₦${tx.amount} was recorded.`, {}); } catch (_) {}
    try { emitToUser(tx.studentId, 'payment:success', { reference, amount: tx.amount }); } catch (_) {}

    return res.status(200).json({ success: true, data: { reference, status: 'success' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

