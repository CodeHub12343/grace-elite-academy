const mongoose = require('mongoose');

const { Schema } = mongoose;

const AttendanceSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    remarks: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ studentId: 1, date: 1, subjectId: 1 }, { unique: true, partialFilterExpression: { studentId: { $exists: true }, date: { $exists: true } } });

module.exports = mongoose.model('Attendance', AttendanceSchema);


