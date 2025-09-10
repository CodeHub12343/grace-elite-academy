const mongoose = require('mongoose');

const { Schema } = mongoose;

const InvoiceSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    feeCategoryId: { type: Schema.Types.ObjectId, ref: 'FeeCategory', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
    dueDate: { type: Date, required: true },
    lateFee: { type: Number, default: 0 },
    transactionReference: { type: String, unique: true, sparse: true },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', InvoiceSchema);


