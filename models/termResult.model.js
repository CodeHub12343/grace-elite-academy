const mongoose = require('mongoose');

const { Schema } = mongoose;

const SubjectResultSchema = new Schema({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectName: { type: String, required: true },
  subjectCode: { type: String, required: true },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
  remarks: { type: String },
  examType: { type: String, enum: ['midterm', 'final', 'assignment'] },
  examTitle: { type: String }
});

const TermResultSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  term: { type: String, enum: ['term1', 'term2', 'final'], required: true },
  academicYear: { type: String, required: true }, // e.g., "2023-2024"
  subjects: [SubjectResultSchema],
  totalMarks: { type: Number, required: true },
  totalMaxMarks: { type: Number, required: true },
  averagePercentage: { type: Number, required: true },
  overallGrade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
  overallRemarks: { type: String },
  position: { type: Number }, // Student's position in class for this term
  totalStudents: { type: Number }, // Total number of students in class
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Admin who uploaded
  uploadedAt: { type: Date, default: Date.now },
  isPublished: { type: Boolean, default: false }, // Whether result is visible to student
  publishedAt: { type: Date },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: { type: String }, // Additional comments from admin
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  }
}, {
  timestamps: true
});

// Compound index to ensure unique results per student per term per class per academic year
TermResultSchema.index({ 
  studentId: 1, 
  classId: 1, 
  term: 1, 
  academicYear: 1 
}, { unique: true });

// Index for efficient querying
TermResultSchema.index({ classId: 1, term: 1, academicYear: 1 });
TermResultSchema.index({ studentId: 1, isPublished: 1 });

module.exports = mongoose.model('TermResult', TermResultSchema);























