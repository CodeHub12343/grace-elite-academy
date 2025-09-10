const mongoose = require('mongoose');

const { Schema } = mongoose;

const AssignmentSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    resources: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', AssignmentSchema);


