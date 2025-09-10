const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeacherAttendanceSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    remarks: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // admin who marked
  },
  { timestamps: true }
);

TeacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);




