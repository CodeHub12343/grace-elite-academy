const mongoose = require('mongoose');

const { Schema } = mongoose;

const ClassSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', ClassSchema);


