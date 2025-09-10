const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeacherReviewSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    date: { type: Date, default: Date.now },
    reply: { type: String },
    replyAt: { type: Date },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

TeacherReviewSchema.index({ teacherId: 1, reviewedBy: 1 }, { unique: true });

module.exports = mongoose.model('TeacherReview', TeacherReviewSchema);


