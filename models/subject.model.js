const mongoose = require('mongoose');

const { Schema } = mongoose;

const SubjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', SubjectSchema);


