const mongoose = require('mongoose');

const { Schema } = mongoose;

const FeeSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid', index: true },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: function defaultBalance() { return this.amount; } },
    lateFee: { type: Number, default: 0 },
    transactions: [{ type: Schema.Types.ObjectId, ref: 'Transaction' }],
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fee', FeeSchema);




