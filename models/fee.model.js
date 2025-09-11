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

// Uniqueness: prevent creating the same described fee for a student for the same due date
// Applies only when description is provided (partial index)
FeeSchema.index(
  { studentId: 1, dueDate: 1, description: 1 },
  { unique: true, partialFilterExpression: { description: { $type: 'string' } } }
);

module.exports = mongoose.model('Fee', FeeSchema);




