const mongoose = require('mongoose');

const { Schema } = mongoose;

const SubmissionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
        selectedOption: { type: String },
      },
    ],
    score: { type: Number, default: 0 },
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

SubmissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);


