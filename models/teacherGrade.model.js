const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeacherGradeSchema = new Schema({
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  term: { type: String, enum: ['term1', 'term2', 'final'], required: true },
  academicYear: { type: String, required: true }, // e.g., "2023-2024"
  
  // Grade details
  marks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
  remarks: { type: String },
  
  // Exam details
  examType: { type: String, enum: ['midterm', 'final', 'assignment', 'quiz'], default: 'final' },
  examTitle: { type: String },
  examDate: { type: Date },
  
  // Metadata
  isPublished: { type: Boolean, default: false }, // Whether grade is visible to student
  publishedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  
  // Audit trail
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index to ensure unique grades per teacher-student-subject-term-year
TeacherGradeSchema.index({ 
  teacherId: 1, 
  studentId: 1, 
  subjectId: 1, 
  term: 1, 
  academicYear: 1 
}, { unique: true });

// Indexes for efficient querying
TeacherGradeSchema.index({ teacherId: 1, subjectId: 1, classId: 1 });
TeacherGradeSchema.index({ studentId: 1, term: 1, academicYear: 1 });
TeacherGradeSchema.index({ classId: 1, term: 1, academicYear: 1 });
TeacherGradeSchema.index({ isPublished: 1 });

// Pre-save middleware to calculate percentage and grade
TeacherGradeSchema.pre('save', function(next) {
  if (this.isModified('marks') || this.isModified('maxMarks')) {
    this.percentage = Math.round((this.marks / this.maxMarks) * 100 * 100) / 100;
    this.grade = this.computeGrade(this.percentage);
  }
  this.updatedAt = new Date();
  next();
});

// Method to compute grade based on percentage
TeacherGradeSchema.methods.computeGrade = function(percentage) {
  if (percentage >= 85) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

// Static method to get remarks based on performance
TeacherGradeSchema.statics.getRemarks = function(percentage) {
  if (percentage >= 85) return 'Excellent performance! Keep up the good work.';
  if (percentage >= 70) return 'Good performance. There is room for improvement.';
  if (percentage >= 55) return 'Average performance. More effort is needed.';
  if (percentage >= 40) return 'Below average. Please work harder.';
  return 'Poor performance. Immediate attention required.';
};

module.exports = mongoose.model('TeacherGrade', TeacherGradeSchema);




