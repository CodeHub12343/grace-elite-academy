const mongoose = require('mongoose');

const { Schema } = mongoose;

const FeeCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeeCategory', FeeCategorySchema);


