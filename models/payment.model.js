const mongoose = require('mongoose');

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending', index: true },
    transactionReference: { type: String, required: true, unique: true },
    paymentMethod: { type: String, default: 'Paystack' },
    gatewayResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);


