const mongoose = require('mongoose');

const { Schema } = mongoose;

const AssignmentSubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    fileKey: { type: String, required: true },
    fileUrl: { type: String },
    submittedAt: { type: Date, default: Date.now },
    marks: { type: Number },
    feedback: { type: String },
  },
  { timestamps: true }
);

AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);


