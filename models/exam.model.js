const mongoose = require('mongoose');

const { Schema } = mongoose;

const ExamSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    totalMarks: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
    term: { type: String, enum: ['term1', 'term2', 'final'], required: true },
    examType: { type: String, enum: ['midterm', 'final', 'assignment'], required: true },
    academicYear: { type: String, required: true }, // e.g., "2023-2024"
  },
  { timestamps: true }
);

// Indexes for efficient querying
ExamSchema.index({ teacherId: 1, classId: 1, subjectId: 1 });
ExamSchema.index({ term: 1, academicYear: 1 });
ExamSchema.index({ classId: 1, subjectId: 1, term: 1, academicYear: 1 });

module.exports = mongoose.model('Exam', ExamSchema);


