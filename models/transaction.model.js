const mongoose = require('mongoose');

const { Schema } = mongoose;

const TransactionSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    feeId: { type: Schema.Types.ObjectId, ref: 'Fee', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
    paystackReference: { type: String, unique: true },
    paymentDate: { type: Date },
    paymentMethod: { type: String, default: 'Paystack' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);




