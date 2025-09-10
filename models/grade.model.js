const mongoose = require('mongoose');

const { Schema } = mongoose;

const GradeSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam' },
    marks: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1 },
    grade: { type: String },
    percentage: { type: Number },
    term: { type: String, enum: ['term1', 'term2', 'final'], required: true },
    examType: { type: String, enum: ['midterm', 'final', 'assignment'], required: true },
  },
  { timestamps: true }
);

function computeGrade(pct) {
  if (pct >= 85) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

GradeSchema.pre('save', function preSave(next) {
  const pct = (this.marks / this.maxMarks) * 100;
  this.percentage = Math.round(pct * 100) / 100;
  this.grade = computeGrade(this.percentage);
  next();
});

GradeSchema.index({ studentId: 1, subjectId: 1, examType: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Grade', GradeSchema);


